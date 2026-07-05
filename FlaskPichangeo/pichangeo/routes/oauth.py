from __future__ import annotations

from secrets import token_urlsafe
from urllib.parse import urlencode

from flask import Blueprint, current_app, jsonify, redirect, session, url_for

from ..auth import generate_access_token, hash_password, store_refresh_token
from ..extensions import db, oauth
from ..models import User, utcnow
from ..utils import error


bp = Blueprint("oauth", __name__)


def _auth0_configured() -> bool:
    return bool(
        current_app.config.get("AUTH0_DOMAIN", "")
        and current_app.config.get("AUTH0_CLIENT_ID", "")
        and current_app.config.get("AUTH0_CLIENT_SECRET", "")
        and getattr(oauth, "auth0", None)
    )


def _unique_username(email: str, fallback_name: str | None = None) -> str:
    base = (email.split("@", 1)[0] if email else fallback_name or "oauth").strip().lower()
    base = "".join(ch for ch in base if ch.isalnum() or ch in ("_", ".", "-"))[:40] or "oauth"
    candidate = base
    counter = 1
    while User.query.filter_by(username=candidate).first():
        suffix = str(counter)
        candidate = f"{base[: 50 - len(suffix) - 1]}_{suffix}"
        counter += 1
    return candidate


def _get_or_create_user(userinfo: dict) -> User:
    email = (userinfo.get("email") or "").strip().lower()
    if not email:
        raise ValueError("Auth0 no devolvio email. Habilita el scope email o verifica el proveedor.")

    user = User.query.filter_by(email=email).first()
    if user:
        return user

    display_name = (
        userinfo.get("name")
        or userinfo.get("nickname")
        or userinfo.get("given_name")
        or email.split("@", 1)[0]
    )
    user = User(
        username=_unique_username(email, display_name),
        name=display_name[:150],
        email=email,
        phone=None,
        password_hash=hash_password(token_urlsafe(32)),
        role="client",
        status="active",
        created_at=utcnow(),
    )
    db.session.add(user)
    db.session.flush()
    return user


@bp.get("/api/oauth/auth0/status")
def auth0_status():
    return jsonify(
        {
            "provider": "auth0",
            "configured": _auth0_configured(),
            "loginUrl": url_for("oauth.auth0_login", _external=True),
            "callbackUrl": current_app.config.get("AUTH0_CALLBACK_URL", ""),
            "scope": current_app.config.get("AUTH0_SCOPE", "openid profile email"),
        }
    )


@bp.get("/api/oauth/auth0/login")
def auth0_login():
    if not _auth0_configured():
        return error("Auth0 no esta configurado. Revisa AUTH0_DOMAIN, AUTH0_CLIENT_ID y AUTH0_CLIENT_SECRET.", 503)

    session["oauth_provider"] = "auth0"
    return oauth.auth0.authorize_redirect(redirect_uri=current_app.config["AUTH0_CALLBACK_URL"])


@bp.get("/api/oauth/auth0/callback")
def auth0_callback():
    if not _auth0_configured():
        return error("Auth0 no esta configurado.", 503)

    try:
        token = oauth.auth0.authorize_access_token()
    except Exception as exc:
        return error(f"Error al intercambiar el token con Auth0: {exc}", 502)

    userinfo = token.get("userinfo")
    if not userinfo:
        try:
            userinfo = oauth.auth0.userinfo(token=token)
        except Exception as exc:
            return error(f"Error al obtener userinfo de Auth0: {exc}", 502)

    try:
        user = _get_or_create_user(dict(userinfo))
    except ValueError as exc:
        db.session.rollback()
        return error(str(exc), 400)

    access_token = generate_access_token(user)
    refresh_token = store_refresh_token(user)
    return jsonify(
        {
            "message": "Login OAuth exitoso",
            "provider": "auth0",
            "AccessToken": access_token,
            "RefreshToken": refresh_token,
            "user": {
                "id": user.id,
                "username": user.username,
                "name": user.name,
                "email": user.email,
                "role": user.role,
            },
        }
    )


@bp.get("/api/oauth/auth0/logout")
def auth0_logout():
    domain = current_app.config.get("AUTH0_DOMAIN", "").removeprefix("https://").removesuffix("/")
    session.clear()
    if not domain or not current_app.config.get("AUTH0_CLIENT_ID", ""):
        return jsonify({"message": "Sesion local cerrada"})

    return_to = url_for("health", _external=True)
    query = urlencode({"client_id": current_app.config["AUTH0_CLIENT_ID"], "returnTo": return_to})
    return redirect(f"https://{domain}/v2/logout?{query}")
