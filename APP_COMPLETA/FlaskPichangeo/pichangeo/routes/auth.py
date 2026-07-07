from datetime import datetime

import jwt
from flask import Blueprint, jsonify, request

from ..auth import (
    decode_access_token,
    generate_access_token,
    hash_password,
    store_refresh_token,
    verify_password,
)
from ..extensions import db
from ..models import User, utcnow
from ..mongo import log_login_session
from ..utils import error, field, required_field


bp = Blueprint("auth", __name__)


@bp.post("/api/auth/register")
@bp.post("/api/Auth/register")
def register():
    data = request.get_json(silent=True) or {}
    try:
        username = required_field(data, "Username", "username")
        name = required_field(data, "Name", "name")
        email = required_field(data, "Email", "email")
        password = required_field(data, "Password", "password")
    except ValueError as exc:
        return error(str(exc), 400)

    phone = field(data, "Phone", "phone")
    exists = User.query.filter((User.email == email) | (User.username == username)).first()
    if exists:
        return error("El usuario o email ya existe.", 400)

    user = User(
        username=username,
        name=name,
        email=email,
        phone=phone,
        password_hash=hash_password(password),
        role="client",
        status="active",
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "Usuario registrado exitosamente"})


@bp.post("/api/auth/login")
@bp.post("/api/Auth/login")
def login():
    data = request.get_json(silent=True) or {}
    try:
        email = required_field(data, "Email", "email")
        password = required_field(data, "Password", "password")
    except ValueError as exc:
        return error(str(exc), 400)

    user = User.query.filter_by(email=email).first()
    if user is None or not verify_password(password, user.password_hash):
        return error("Credenciales inválidas", 401)

    access_token = generate_access_token(user)
    refresh_token = store_refresh_token(user)
    log_login_session(
        user_id=user.id,
        email=user.email,
        role=user.role,
        provider="local",
        ip_address=request.remote_addr or "",
        user_agent=request.headers.get("User-Agent", ""),
    )
    return jsonify({"accessToken": access_token, "refreshToken": refresh_token})


@bp.post("/api/auth/refresh")
@bp.post("/api/Auth/refresh")
def refresh():
    data = request.get_json(silent=True) or {}
    access_token = field(data, "AccessToken", "accessToken", "access_token")
    refresh_token = field(data, "RefreshToken", "refreshToken", "refresh_token")
    if not access_token or not refresh_token:
        return error("Token inválido", 400)

    try:
        payload = decode_access_token(access_token, allow_expired=True)
    except jwt.InvalidTokenError:
        return error("Token inválido", 400)

    user_id = payload.get("sub")
    user = db.session.get(User, int(user_id)) if user_id else None
    if (
        user is None
        or user.refresh_token != refresh_token
        or user.refresh_token_expiry_time is None
        or user.refresh_token_expiry_time <= utcnow()
    ):
        return error("Petición inválida o Refresh Token expirado. Vuelve a iniciar sesión.", 400)

    new_access_token = generate_access_token(user)
    new_refresh_token = store_refresh_token(user)
    return jsonify({"accessToken": new_access_token, "refreshToken": new_refresh_token})
