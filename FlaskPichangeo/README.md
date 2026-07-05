# BackPichangeo en Flask

Backend Python/Flask equivalente al proyecto ASP.NET original, conectado a la misma base Azure SQL Server que usaba Entity Framework.

## Que incluye

- Login y registro con BCrypt.
- Login OAuth 2.0 / OpenID Connect con Auth0 usando Authorization Code.
- Access tokens JWT y refresh tokens guardados por usuario.
- Roles `admin` y `client`.
- Rutas para usuarios, canchas, horarios, reservas, pagos simulados, equipos, retos y calificaciones.
- Modelos SQLAlchemy alineados con las tablas de Entity Framework: `Users`, `Courts`, `CourtSchedules`, `Bookings`, etc.

## Base de datos

La conexion se configura en `.env` con el connection string de SQL Server:

```env
SQLSERVER_CONNECTION_STRING=Server=tcp:...;Initial Catalog=...;User ID=...;Password=...;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
SQLSERVER_ODBC_DRIVER=ODBC Driver 18 for SQL Server
AUTO_CREATE_DB=false
AUTO_SEED_ADMIN=false
```

`AUTO_CREATE_DB=false` evita que Flask intente crear tablas nuevas en Azure. La estructura de la base debe venir del proyecto .NET/migraciones de Entity Framework.

## Requisito de Windows

Instala Microsoft ODBC Driver 18 for SQL Server si no lo tienes:

```text
https://learn.microsoft.com/sql/connect/odbc/download-odbc-driver-for-sql-server
```

Si usas el driver antiguo que aparece como `SQL Server`, cambia esta linea en `.env`:

```env
SQLSERVER_ODBC_DRIVER=SQL Server
```

Para Azure SQL normalmente se recomienda `ODBC Driver 18 for SQL Server`.

## Instalacion

```powershell
cd C:\Users\LENOVO\Construccion_Software_BASE\FlaskPichangeo
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python app.py
```

La API queda en:

```text
http://localhost:5000
```

## Ejemplo rapido

Login:

```powershell
Invoke-RestMethod -Method Post http://localhost:5000/api/auth/login `
  -ContentType "application/json" `
  -Body '{"Email":"admin@pichangeo.local","Password":"Admin123!"}'
```

Usa el `AccessToken` como bearer:

```text
Authorization: Bearer <AccessToken>
```

Refresh:

```http
POST /api/auth/refresh
{
  "AccessToken": "...",
  "RefreshToken": "..."
}
```

## OAuth Authorization Code con Auth0

Proveedor elegido: **Auth0**. Para este proyecto es el mas conveniente porque se integra facil con Flask, no requiere montar servidores propios, soporta Authorization Code para apps backend y permite mantener nuestros JWT internos.

En Auth0 crea una aplicacion de tipo `Regular Web Application` y configura:

```text
Allowed Callback URLs:
http://127.0.0.1:5000/api/oauth/auth0/callback
```

Luego completa estas variables en `.env`:

```env
AUTH0_DOMAIN=tu-tenant.us.auth0.com
AUTH0_CLIENT_ID=tu-client-id
AUTH0_CLIENT_SECRET=tu-client-secret
AUTH0_CALLBACK_URL=http://127.0.0.1:5000/api/oauth/auth0/callback
AUTH0_SCOPE=openid profile email
```

Rutas OAuth:

- `GET /api/oauth/auth0/status`
- `GET /api/oauth/auth0/login`
- `GET /api/oauth/auth0/callback`
- `GET /api/oauth/auth0/logout`

El callback crea o enlaza el usuario por email y devuelve los mismos `AccessToken` y `RefreshToken` internos que usa el resto de la API.

## Endpoints principales

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/users`
- `POST /api/courts`
- `GET /api/courts`
- `POST /api/courts/{courtId}/schedules`
- `GET /api/courts/available`
- `POST /api/bookings`
- `GET /api/bookings/my`
- `POST /api/payments`
- `POST /api/teams`
- `POST /api/challenges`
- `POST /api/rating`
- `GET /api/teams/{id}/ratings`

## Pruebas

```powershell
python -m pytest
```

## Documentacion

La explicacion completa de la carpeta esta en:

[DOCUMENTACION.md](DOCUMENTACION.md)
