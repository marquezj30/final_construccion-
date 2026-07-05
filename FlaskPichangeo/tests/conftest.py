import sys
from pathlib import Path

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from pichangeo import create_app
from pichangeo.auth import hash_password
from pichangeo.extensions import db
from pichangeo.models import User


class TestConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = "test-secret"
    JWT_ISSUER = "BackPichangeoAPI"
    JWT_AUDIENCE = "BackPichangeoClients"
    JWT_ACCESS_TOKEN_MINUTES = 15
    JWT_REFRESH_TOKEN_DAYS = 7
    AUTO_CREATE_DB = False
    AUTO_SEED_ADMIN = False


@pytest.fixture
def app():
    flask_app = create_app(TestConfig)
    with flask_app.app_context():
        db.create_all()
        db.session.add(
            User(
                username="admin",
                name="Administrador",
                email="admin@pichangeo.local",
                password_hash=hash_password("Admin123!"),
                role="admin",
                status="active",
            )
        )
        db.session.commit()

    yield flask_app

    with flask_app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def auth_headers(client):
    def login(email: str, password: str) -> dict[str, str]:
        response = client.post(
            "/api/auth/login",
            json={"Email": email, "Password": password},
        )
        assert response.status_code == 200
        access_token = response.get_json()["accessToken"]
        return {"Authorization": f"Bearer {access_token}"}

    return login


@pytest.fixture
def register_client_user(client, auth_headers):
    def register(
        username: str,
        email: str,
        password: str = "Secret123!",
        name: str = "Cliente Demo",
    ) -> dict[str, str]:
        response = client.post(
            "/api/auth/register",
            json={
                "Username": username,
                "Name": name,
                "Email": email,
                "Password": password,
                "Phone": "999999999",
            },
        )
        assert response.status_code == 200
        return {
            "email": email,
            "password": password,
            "headers": auth_headers(email, password),
        }

    return register
