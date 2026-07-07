def test_register_login_and_refresh_tokens(client):
    register = client.post(
        "/api/auth/register",
        json={
            "Username": "cliente",
            "Name": "Cliente Demo",
            "Email": "cliente@test.local",
            "Password": "Secret123!",
            "Phone": "999999999",
        },
    )
    assert register.status_code == 200

    login = client.post(
        "/api/auth/login",
        json={"Email": "cliente@test.local", "Password": "Secret123!"},
    )
    assert login.status_code == 200
    tokens = login.get_json()
    assert tokens["accessToken"]
    assert tokens["refreshToken"]

    refresh = client.post("/api/auth/refresh", json=tokens)
    assert refresh.status_code == 200
    refreshed = refresh.get_json()
    assert refreshed["accessToken"]
    assert refreshed["refreshToken"]
    assert refreshed["refreshToken"] != tokens["refreshToken"]


def test_users_requires_admin_role(client, auth_headers):
    client.post(
        "/api/auth/register",
        json={
            "Username": "cliente",
            "Name": "Cliente Demo",
            "Email": "cliente@test.local",
            "Password": "Secret123!",
        },
    )
    client_login = client.post(
        "/api/auth/login",
        json={"Email": "cliente@test.local", "Password": "Secret123!"},
    ).get_json()

    denied = client.get(
        "/api/users",
        headers={"Authorization": f"Bearer {client_login['accessToken']}"},
    )
    assert denied.status_code == 403

    allowed = client.get(
        "/api/users",
        headers=auth_headers("admin@pichangeo.local", "Admin123!"),
    )
    assert allowed.status_code == 200
    assert len(allowed.get_json()) == 2


def test_auth0_status_reports_not_configured_without_credentials(client):
    response = client.get("/api/oauth/auth0/status")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["provider"] == "auth0"
    assert payload["configured"] is False
