import os
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def _parse_dotnet_connection_string(value: str) -> dict[str, str]:
    pairs = {}
    for part in value.split(";"):
        if not part.strip() or "=" not in part:
            continue
        key, raw_value = part.split("=", 1)
        pairs[key.strip().lower()] = raw_value.strip()
    return pairs


def _odbc_bool(value: str) -> str:
    normalized = value.strip().lower()
    if normalized in {"true", "yes", "1"}:
        return "yes"
    if normalized in {"false", "no", "0"}:
        return "no"
    return value


def _sql_server_url_from_dotnet(value: str) -> str:
    pairs = _parse_dotnet_connection_string(value)
    server = pairs.get("server", "").replace("tcp:", "")
    database = pairs.get("initial catalog") or pairs.get("database")
    username = pairs.get("user id") or pairs.get("uid")
    password = pairs.get("password") or pairs.get("pwd")
    encrypt = _odbc_bool(pairs.get("encrypt", "yes"))
    trust_server_certificate = _odbc_bool(pairs.get("trustservercertificate", "no"))
    timeout = pairs.get("connection timeout", "30")
    driver = os.getenv("SQLSERVER_ODBC_DRIVER", "ODBC Driver 18 for SQL Server")

    if not server or not database or not username or password is None:
        raise ValueError("SQLSERVER_CONNECTION_STRING no tiene Server, Initial Catalog, User ID o Password.")

    odbc = (
        f"DRIVER={{{driver}}};"
        f"SERVER={server};"
        f"DATABASE={database};"
        f"UID={username};"
        f"PWD={password};"
        f"Encrypt={encrypt};"
        f"TrustServerCertificate={trust_server_certificate};"
        f"Connection Timeout={timeout};"
    )
    return f"mssql+pyodbc:///?odbc_connect={quote_plus(odbc)}"


def _database_uri() -> str:
    sqlserver_connection_string = os.getenv("SQLSERVER_CONNECTION_STRING")
    if sqlserver_connection_string:
        return _sql_server_url_from_dotnet(sqlserver_connection_string)
    return os.getenv("DATABASE_URL", "sqlite:///pichangeo.db")


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY") or os.getenv(
        "JWT_SECRET_KEY",
        "Pichangeo_Super_Secret_Key_Para_Tokens_2026_!@#$",
    )

    SQLALCHEMY_DATABASE_URI = _database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    JWT_SECRET_KEY = os.getenv(
        "JWT_SECRET_KEY",
        "Pichangeo_Super_Secret_Key_Para_Tokens_2026_!@#$",
    )
    JWT_ISSUER = os.getenv("JWT_ISSUER", "BackPichangeoAPI")
    JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "BackPichangeoClients")
    JWT_ACCESS_TOKEN_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_MINUTES", "15"))
    JWT_REFRESH_TOKEN_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_DAYS", "7"))

    AUTO_CREATE_DB = _bool_env("AUTO_CREATE_DB", True)
    AUTO_SEED_ADMIN = _bool_env("AUTO_SEED_ADMIN", True)
    DEFAULT_ADMIN_USERNAME = os.getenv("DEFAULT_ADMIN_USERNAME", "admin")
    DEFAULT_ADMIN_NAME = os.getenv("DEFAULT_ADMIN_NAME", "Administrador")
    DEFAULT_ADMIN_EMAIL = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@pichangeo.local")
    DEFAULT_ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD", "Admin123!")

    AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN", "").strip()
    AUTH0_CLIENT_ID = os.getenv("AUTH0_CLIENT_ID", "").strip()
    AUTH0_CLIENT_SECRET = os.getenv("AUTH0_CLIENT_SECRET", "").strip()
    AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE", "").strip()
    AUTH0_SCOPE = os.getenv("AUTH0_SCOPE", "openid profile email")
    AUTH0_CALLBACK_URL = os.getenv(
        "AUTH0_CALLBACK_URL",
        "http://127.0.0.1:5000/api/oauth/auth0/callback",
    )

    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:4200").split(",")
        if origin.strip()
    ]
