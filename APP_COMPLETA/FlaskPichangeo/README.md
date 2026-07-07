# BackPichangeo en Flask

Backend Python/Flask equivalente al proyecto ASP.NET original, conectado a la misma base Azure SQL Server que usaba Entity Framework.

## Que incluye

- Login y registro con BCrypt.
- Login OAuth 2.0 / OpenID Connect con Auth0 usando Authorization Code.
- Access tokens JWT y refresh tokens guardados por usuario.
- Roles `admin` y `client`.
- Rutas para usuarios, canchas, horarios, reservas, pagos simulados, equipos, retos y calificaciones.
- Modelos SQLAlchemy alineados con las tablas de Entity Framework: `Users`, `Courts`, `CourtSchedules`, `Bookings`, etc.
- Registro de sesiones de login en MongoDB (coleccion `login_sessions`).

## Base de datos

### SQLite (desarrollo local)

```env
DATABASE_URL=sqlite:///pichangeo.db
AUTO_CREATE_DB=true
AUTO_SEED_ADMIN=true
```

Crea automaticamente las tablas y un usuario admin por defecto al iniciar.

### Azure SQL Server (produccion)

```env
SQLSERVER_CONNECTION_STRING=Server=tcp:...;Initial Catalog=...;User ID=...;Password=...;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
SQLSERVER_ODBC_DRIVER=ODBC Driver 18 for SQL Server
AUTO_CREATE_DB=false
AUTO_SEED_ADMIN=false
```

`AUTO_CREATE_DB=false` evita que Flask intente crear tablas nuevas en Azure. La estructura de la base debe venir del proyecto .NET/migraciones de Entity Framework.

### Requisito de Windows (solo para Azure SQL)

Instala Microsoft ODBC Driver 18 for SQL Server si no lo tienes:

```text
https://learn.microsoft.com/sql/connect/odbc/download-odbc-driver-for-sql-server
```

Si usas el driver antiguo que aparece como `SQL Server`, cambia esta linea en `.env`:

```env
SQLSERVER_ODBC_DRIVER=SQL Server
```

Para Azure SQL normalmente se recomienda `ODBC Driver 18 for SQL Server`.

## Frontend Angular

```powershell
cd C:\Users\LENOVO\final_construccion-\FrontPichangueo\FrontPichangueo
npm install
ng serve          # http://localhost:4200
```

El frontend se conecta al backend en `http://localhost:5000` (configurable en `src/app/core/api.config.ts`).

## Instalacion

```powershell
cd C:\Users\LENOVO\final_construccion-\FlaskPichangeo
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Editar `.env` segun corresponda (ver secciones abajo). Para correr:

```powershell
cd C:\Users\LENOVO\final_construccion-\FlaskPichangeo
.\.venv\Scripts\python.exe app.py
```

O activando el entorno virtual primero:

```powershell
cd C:\Users\LENOVO\final_construccion-\FlaskPichangeo
.\.venv\Scripts\Activate.ps1
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

Usa el `accessToken` como bearer:

```text
Authorization: Bearer <accessToken>
```

Refresh:

```http
POST /api/auth/refresh
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

## OAuth Authorization Code con Auth0

Proveedor elegido: **Auth0**. Se usa el flujo Authorization Code con `state` firmado via `itsdangerous` (sin depender de la sesion de Flask) para evitar errores CSRF por cookies cross-site.

### Configuracion en Auth0 Dashboard

Crea una aplicacion de tipo `Regular Web Application` y configura:

```text
Allowed Callback URLs:
http://localhost:5000/api/oauth/auth0/callback
```

### Variables de entorno

Completa en `.env`:

```env
AUTH0_DOMAIN=tu-tenant.us.auth0.com
AUTH0_CLIENT_ID=tu-client-id
AUTH0_CLIENT_SECRET=tu-client-secret
AUTH0_CALLBACK_URL=http://localhost:5000/api/oauth/auth0/callback
AUTH0_SCOPE=openid profile email
FRONTEND_URL=http://localhost:4200
```

### Rutas OAuth

- `GET /api/oauth/auth0/status` — verifica si Auth0 esta configurado
- `GET /api/oauth/auth0/login` — redirige a Auth0 para autenticacion
- `GET /api/oauth/auth0/callback` — intercambia `code` por tokens, redirige al frontend
- `GET /api/oauth/auth0/logout` — cierra sesion local y en Auth0

### Flujo frontend

El frontend (Angular en `http://localhost:4200`) tiene un boton "Iniciar sesion con Auth0" que redirige a `/api/oauth/auth0/login`. El callback del backend redirige a `http://localhost:4200/auth0-callback?accessToken=...` donde el componente `Auth0Callback` guarda el token en localStorage y redirige al dashboard segun el rol.

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

## MongoDB — Registro de sesiones de login

Cada inicio de sesion exitoso (email/password o Auth0) se registra en MongoDB.

### Requisito

MongoDB corriendo en `localhost:27017` (o configurar `MONGO_URI` en `.env`).

### Variables en `.env`

```env
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=pichangeo_sessions
```

### Coleccion `login_sessions`

Cada documento contiene:

```json
{
  "userId": 1,
  "email": "usuario@example.com",
  "role": "client",
  "provider": "local" | "auth0",
  "ipAddress": "127.0.0.1",
  "userAgent": "Mozilla/5.0 ...",
  "timestamp": "2026-07-06T...",
  "success": true
}
```

Puedes verlos en MongoDB Compass en la base `pichangeo_sessions` → coleccion `login_sessions`.

## Pruebas

```powershell
python -m pytest
```

## Documentacion

La explicacion completa de la carpeta esta en:

[DOCUMENTACION.md](DOCUMENTACION.md)
