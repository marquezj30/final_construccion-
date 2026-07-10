from __future__ import annotations

from datetime import timedelta
from functools import wraps
from secrets import token_urlsafe

import bcrypt
import jwt
from flask import current_app, g, request

from .extensions import db
from .models import User, utcnow
from .utils import error


DOTNET_NAME_IDENTIFIER = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
DOTNET_EMAIL = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
DOTNET_NAME = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
DOTNET_ROLE = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def generate_access_token(user: User) -> str:
    now = utcnow()
    expires = now + timedelta(minutes=current_app.config["JWT_ACCESS_TOKEN_MINUTES"])
    payload = {
        "iss": current_app.config["JWT_ISSUER"],
        "aud": current_app.config["JWT_AUDIENCE"],
        "iat": now,
        "exp": expires,
        "sub": str(user.id),
        "email": user.email,
        "name": user.username,
        "role": user.role,
        DOTNET_NAME_IDENTIFIER: str(user.id),
        DOTNET_EMAIL: user.email,
        DOTNET_NAME: user.username,
        DOTNET_ROLE: user.role,
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET_KEY"], algorithm="HS256")


def generate_refresh_token() -> str:
    return token_urlsafe(64)


def decode_access_token(token: str, allow_expired: bool = False) -> dict:
    return jwt.decode(
        token,
        current_app.config["JWT_SECRET_KEY"],
        algorithms=["HS256"],
        issuer=current_app.config["JWT_ISSUER"],
        audience=current_app.config["JWT_AUDIENCE"],
        options={"verify_exp": not allow_expired},
    )


def store_refresh_token(user: User) -> str:
    refresh_token = generate_refresh_token()
    days = current_app.config["JWT_REFRESH_TOKEN_DAYS"]
    user.refresh_token = refresh_token
    user.refresh_token_expiry_time = utcnow() + timedelta(days=days)
    db.session.commit()
    return refresh_token


def current_user_id() -> int | None:
    user = getattr(g, "current_user", None)
    return user.id if user else None


def current_role() -> str | None:
    user = getattr(g, "current_user", None)
    return user.role if user else None


def jwt_required(roles: list[str] | tuple[str, ...] | None = None):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            header = request.headers.get("Authorization", "")
            if not header.lower().startswith("bearer "):
                return error("Token requerido.", 401)

            token = header.split(" ", 1)[1].strip()
            try:
                payload = decode_access_token(token)
            except jwt.ExpiredSignatureError:
                return error("Token expirado.", 401)
            except jwt.InvalidTokenError:
                return error("Token inválido.", 401)

            user_id = payload.get("sub") or payload.get(DOTNET_NAME_IDENTIFIER)
            user = db.session.get(User, int(user_id)) if user_id else None
            if user is None:
                return error("Token inválido.", 401)
            if roles and user.role not in roles:
                return error("No autorizado.", 403)

            g.current_user = user
            g.current_token = payload
            return fn(*args, **kwargs)

        return wrapper

    return decorator
