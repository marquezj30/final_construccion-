from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from flask import current_app, has_app_context
from pymongo import MongoClient


_clients: dict[str, MongoClient] = {}


def _get_client() -> MongoClient | None:
    if not has_app_context():
        return None
    uri = current_app.config.get("MONGO_URI", "")
    if not uri:
        return None
    if uri not in _clients:
        _clients[uri] = MongoClient(uri, serverSelectionTimeoutMS=3000)
    return _clients[uri]


def get_collection(name: str) -> Any | None:
    client = _get_client()
    if client is None:
        return None
    db_name = current_app.config.get("MONGO_DB_NAME", "pichangeo_sessions")
    return client[db_name][name]


def log_login_session(
    user_id: int,
    email: str,
    role: str,
    provider: str,
    ip_address: str,
    user_agent: str,
) -> None:
    col = get_collection("login_sessions")
    if col is None:
        return
    try:
        col.insert_one(
            {
                "userId": user_id,
                "email": email,
                "role": role,
                "provider": provider,
                "ipAddress": ip_address,
                "userAgent": user_agent,
                "timestamp": datetime.now(timezone.utc),
                "success": True,
            }
        )
    except Exception:
        pass
