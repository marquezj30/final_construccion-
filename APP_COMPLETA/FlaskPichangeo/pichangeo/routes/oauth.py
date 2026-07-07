from __future__ import annotations

from secrets import token_urlsafe
from urllib.parse import urlencode

import requests
from flask import Blueprint, current_app, jsonify, redirect, request, session, url_for
from itsdangerous import URLSafeSerializer

from ..auth import generate_access_token, hash_password, store_refresh_token
from ..extensions import db
from ..models import User, utcnow
from ..mongo import log_login_session
from ..utils import error


bp = Blueprint("oauth", __name__)


def _auth0_configured() -> bool:
    return bool(
        current_app.config.get("AUTH0_DOMAIN", "")
        and current_app.config.get("AUTH0_CLIENT_ID", "")
        and current_app.config.get("AUTH0_CLIENT_SECRET", "")
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


def _auth0_domain() -> str:
    return current_app.config.get("AUTH0_DOMAIN", "").removeprefix("https://").removesuffix("/")


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

    s = URLSafeSerializer(current_app.config["SECRET_KEY"])
    signed_state = s.dumps({"state": token_urlsafe(32)})
    domain = _auth0_domain()
    params = {
        "response_type": "code",
        "client_id": current_app.config["AUTH0_CLIENT_ID"],
        "redirect_uri": current_app.config["AUTH0_CALLBACK_URL"],
        "scope": current_app.config.get("AUTH0_SCOPE", "openid profile email"),
        "state": signed_state,
    }
    if current_app.config.get("AUTH0_AUDIENCE"):
        params["audience"] = current_app.config["AUTH0_AUDIENCE"]

    return redirect(f"https://{domain}/authorize?{urlencode(params)}")


@bp.get("/api/oauth/auth0/callback")
def auth0_callback():
    if not _auth0_configured():
        return error("Auth0 no esta configurado.", 503)

    frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:4200")

    if request.args.get("error"):
        return redirect(frontend_url)

    s = URLSafeSerializer(current_app.config["SECRET_KEY"])
    signed_state = request.args.get("state", "")
    code = request.args.get("code", "")

    if not signed_state or not code:
        return redirect(f"{frontend_url}/auth0-callback?{urlencode({'error': 'Faltan parametros code o state'})}")

    try:
        s.loads(signed_state)
    except Exception as exc:
        return redirect(f"{frontend_url}/auth0-callback?{urlencode({'error': f'State invalido: {exc}'})}")

    domain = _auth0_domain()
    try:
        resp = requests.post(
            f"https://{domain}/oauth/token",
            json={
                "grant_type": "authorization_code",
                "client_id": current_app.config["AUTH0_CLIENT_ID"],
                "client_secret": current_app.config["AUTH0_CLIENT_SECRET"],
                "code": code,
                "redirect_uri": current_app.config["AUTH0_CALLBACK_URL"],
            },
            timeout=10,
        )
        resp.raise_for_status()
        token_data = resp.json()
    except Exception as exc:
        return redirect(f"{frontend_url}/auth0-callback?{urlencode({'error': f'Error al obtener token: {exc}'})}")

    userinfo = token_data.get("userinfo")
    if not userinfo:
        try:
            uresp = requests.get(
                f"https://{domain}/userinfo",
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
                timeout=10,
            )
            uresp.raise_for_status()
            userinfo = uresp.json()
        except Exception as exc:
            return redirect(f"{frontend_url}/auth0-callback?{urlencode({'error': f'Error al obtener userinfo: {exc}'})}")

    try:
        user = _get_or_create_user(dict(userinfo))
    except ValueError as exc:
        db.session.rollback()
        return redirect(f"{frontend_url}/auth0-callback?{urlencode({'error': str(exc)})}")

    access_token = generate_access_token(user)
    refresh_token = store_refresh_token(user)
    log_login_session(
        user_id=user.id,
        email=user.email,
        role=user.role,
        provider="auth0",
        ip_address=request.remote_addr or "",
        user_agent=request.headers.get("User-Agent", ""),
    )
    params = urlencode({
        "accessToken": access_token,
        "refreshToken": refresh_token,
        "role": user.role,
        "name": user.name,
        "email": user.email,
    })
    return redirect(f"{frontend_url}/auth0-callback?{params}")


@bp.get("/api/oauth/auth0/logout")
def auth0_logout():
    domain = current_app.config.get("AUTH0_DOMAIN", "").removeprefix("https://").removesuffix("/")
    session.clear()
    if not domain or not current_app.config.get("AUTH0_CLIENT_ID", ""):
        return jsonify({"message": "Sesion local cerrada"})

    return_to = url_for("health", _external=True)
    query = urlencode({"client_id": current_app.config["AUTH0_CLIENT_ID"], "returnTo": return_to})
    return redirect(f"https://{domain}/v2/logout?{query}")
