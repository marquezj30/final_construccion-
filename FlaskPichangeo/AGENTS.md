# FlaskPichangeo

Backend Flask que migra el proyecto ASP.NET original, conectado a Azure SQL Server.

## Commands

```powershell
# project root
cd C:\Users\LENOVO\Construccion_Software_BASE\FlaskPichangeo

# setup
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env

# run
python app.py          # http://localhost:5000

# test (in-memory SQLite, no DB needed)
python -m pytest       # or: pytest tests/test_auth.py -v
```

## Architecture

- **Entrypoint**: `app.py` -> `pichangeo/__init__.py:create_app()`
- **Blueprints** (9): auth, oauth, users, courts, bookings, payments, teams, challenges, ratings — all registered in `create_app()`
- **JWT auth**: custom `@jwt_required(roles=["admin"])` decorator in `pichangeo/auth.py` (HS256, not flask-jwt-extended)
- **Models** mirror Entity Framework schema: PascalCase table/column names (`Users.Id`, `passwordHash`, `createdAt`, `RefreshToken`, `bookingCode`)
- **DB config** in `.env`: `SQLSERVER_CONNECTION_STRING` (dotnet format, parsed by `config.py`) or `DATABASE_URL` for SQLite fallback
- **Payments**: simulated — no real gateway (`PaymentMethod` type `simulated_gateway`, UUID-based fake auth codes)
- **OAuth**: Auth0 Authorization Code flow via `Authlib`

## Testing quirks

- `conftest.py` uses `TestConfig` with `sqlite:///:memory:`, overrides `AUTO_CREATE_DB=False`, seeds one admin user
- Fixtures: `app`, `client`, `auth_headers(email, password)`, `register_client_user(username, email, ...)`
- Booking test uses fixed date `2026-07-06` (a Monday == DayOfWeek 1)
- API uses PascalCase JSON keys (`AccessToken`, `CourtScheduleId`, `BookingDate`, `TotalCost`)
- Endpoints also accept `/api/Auth/login` (ASP.NET-style duplicate routes in auth blueprint)

## Production notes

- `AUTO_CREATE_DB=false` in prod — schema comes from .NET Entity Framework migrations
- `AUTO_SEED_ADMIN=false` in prod
- Windows-only: requires Microsoft ODBC Driver 18 for SQL Server

## Session log (2026-07-02)

- Fixed `extensions.py`: removed dead code (lines 3-7) that referenced undefined `app`/`os` and had circular import
- Fixed `app.py`: removed dead Flask-Migrate imports referencing `app` before definition
- Fixed `oauth.py`: wrapped `authorize_access_token()` and `userinfo()` in try/except to return descriptive errors instead of 500
- Fixed `.env`: switched from broken Azure SQL connection to SQLite (`DATABASE_URL=sqlite:///pichangeo.db`) with `AUTO_CREATE_DB=true` for local testing
- Later reconfigured `.env` to Azure SQL: `pichangeo-server-centralus/pichangueo-bd` via `SQLSERVER_CONNECTION_STRING`
- Deleted stale `instance/pichangeo.db` that had mismatched schema
- Tested: app starts successfully, OAuth login flow with Auth0 is ready
