# Documentacion Completa Del Backend Flask

Este documento explica la carpeta `FlaskPichangeo`, archivo por archivo, y como se conectan las piezas del backend.

## Resumen Del Proyecto

`FlaskPichangeo` es la migracion del backend ASP.NET a Python con Flask. Mantiene la logica principal del proyecto original:

- Usuarios con roles `admin` y `client`.
- Registro y login local con BCrypt.
- JWT de acceso y refresh token persistido en base de datos.
- OAuth 2.0 Authorization Code con Auth0.
- Canchas, horarios, reservas, pagos simulados, equipos, retos y calificaciones.
- Conexion a Azure SQL Server usando el esquema creado por Entity Framework.

## Estructura General

```text
FlaskPichangeo/
  app.py
  requirements.txt
  README.md
  DOCUMENTACION.md
  .env
  .env.example
  .gitignore
  pichangeo/
    __init__.py
    auth.py
    config.py
    extensions.py
    models.py
    utils.py
    routes/
      auth.py
      oauth.py
      users.py
      courts.py
      bookings.py
      payments.py
      teams.py
      challenges.py
      ratings.py
      __init__.py
  tests/
    conftest.py
    test_auth.py
```

## Archivos De La Raiz

### `app.py`

Punto de entrada de la aplicacion.

```python
from pichangeo import create_app
app = create_app()
```

Cuando ejecutas `python app.py`, Flask crea la app, registra extensiones, carga rutas y arranca el servidor.

### `requirements.txt`

Lista las dependencias Python:

- `Flask`: framework web.
- `Flask-SQLAlchemy`: ORM para conectar modelos con SQL Server.
- `PyJWT`: generacion y validacion de JWT internos.
- `bcrypt`: hash seguro de contrasenas.
- `python-dotenv`: carga variables desde `.env`.
- `pyodbc`: driver Python para SQL Server/Azure SQL.
- `Authlib`: cliente OAuth/OIDC para Auth0.
- `pytest`: pruebas automatizadas.

### `.env`

Archivo local con configuracion real. No debe subirse a repositorios.

Incluye:

- Conexion Azure SQL Server.
- Claves JWT.
- Configuracion Auth0.
- Flags como `AUTO_CREATE_DB`.

### `.env.example`

Plantilla segura para saber que variables necesita el proyecto. Debe tener placeholders, no secretos reales.

### `.gitignore`

Evita subir archivos locales como `.env`, `.venv`, caches, base SQLite local e `instance/`.

### `README.md`

Guia corta para instalar, correr, configurar Azure SQL, usar Auth0 y probar endpoints principales.

### `DOCUMENTACION.md`

Este documento. Sirve como mapa completo del backend.

## Carpeta `pichangeo`

Contiene el codigo principal de la aplicacion.

### `pichangeo/__init__.py`

Construye la app Flask con `create_app`.

Responsabilidades:

- Crear instancia Flask.
- Cargar `Config`.
- Inicializar `db`.
- Inicializar `oauth`.
- Registrar cliente Auth0 si hay variables configuradas.
- Registrar blueprints/rutas.
- Registrar comandos CLI.
- Exponer `/health`.
- Crear tablas solo si `AUTO_CREATE_DB=true`.

Funciones importantes:

- `create_app`: fabrica la app.
- `register_blueprints`: conecta todas las rutas.
- `register_oauth_clients`: registra Auth0 con Authlib.
- `seed_default_admin`: crea admin inicial si se usa base local.
- `register_cli`: comandos `flask init-db` y `flask seed-admin`.

### `pichangeo/config.py`

Lee variables de entorno y configura Flask.

Puntos clave:

- Convierte un connection string de .NET/SQL Server a formato SQLAlchemy.
- Usa `SQLSERVER_CONNECTION_STRING` si existe.
- Si no existe, puede usar `DATABASE_URL`.
- Define configuracion JWT.
- Define configuracion Auth0.

Variables importantes:

```env
SQLSERVER_CONNECTION_STRING=...
SQLSERVER_ODBC_DRIVER=ODBC Driver 18 for SQL Server
JWT_SECRET_KEY=...
AUTH0_DOMAIN=...
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
```

### `pichangeo/extensions.py`

Declara extensiones compartidas:

```python
db = SQLAlchemy()
oauth = OAuth()
```

Se declaran aqui para evitar importaciones circulares.

### `pichangeo/models.py`

Define los modelos SQLAlchemy que apuntan a las tablas reales de Azure SQL Server creadas por Entity Framework.

Modelos principales:

- `User` -> tabla `Users`
- `Court` -> tabla `Courts`
- `CourtSchedule` -> tabla `CourtSchedules`
- `Booking` -> tabla `Bookings`
- `PaymentMethod` -> tabla `PaymentMethods`
- `Payment` -> tabla `Payments`
- `BookingHistory` -> tabla `BookingHistories`
- `SoccerTeam` -> tabla `SoccerTeams`
- `TeamMember` -> tabla `TeamMembers`
- `TeamChallenge` -> tabla `TeamChallenges`
- `TeamRating` -> tabla `TeamRatings`

Importante: los nombres de columnas estan mapeados para coincidir con .NET. Por ejemplo:

```python
password_hash = db.Column("passwordHash", db.Text, nullable=False)
refresh_token = db.Column("RefreshToken", db.String(200))
```

### `pichangeo/auth.py`

Contiene la autenticacion interna.

Responsabilidades:

- Hashear contrasenas con BCrypt.
- Verificar contrasenas.
- Generar access tokens JWT.
- Generar refresh tokens.
- Leer y validar JWT.
- Decorador `jwt_required` para proteger endpoints.
- Validar roles como `admin` y `client`.

Flujo local:

1. Usuario hace login.
2. Se valida password.
3. Se genera `AccessToken`.
4. Se genera `RefreshToken`.
5. El refresh token se guarda en `Users.RefreshToken`.

### `pichangeo/utils.py`

Funciones auxiliares:

- `error`: respuesta JSON de error.
- `field`: lee campos JSON aceptando variantes de nombre.
- `required_field`: valida campos obligatorios.
- `parse_datetime`, `parse_time`: parsean fechas/horas.
- `dotnet_day_of_week`: convierte dia a formato .NET.
- `time_hours`: calcula duracion entre horas.
- `as_iso`, `as_time`, `as_number`: serializacion JSON.

## Carpeta `pichangeo/routes`

En Flask, los "controladores" se implementan como blueprints. Cada archivo de esta carpeta equivale a un controlador del proyecto .NET.

### `routes/auth.py`

Controlador de autenticacion local.

Endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`

Tambien mantiene compatibilidad con rutas PascalCase:

- `POST /api/Auth/register`
- `POST /api/Auth/login`
- `POST /api/Auth/refresh`

### `routes/oauth.py`

Controlador OAuth con Auth0 usando Authorization Code.

Endpoints:

- `GET /api/oauth/auth0/status`
- `GET /api/oauth/auth0/login`
- `GET /api/oauth/auth0/callback`
- `GET /api/oauth/auth0/logout`

Flujo:

1. Cliente abre `/api/oauth/auth0/login`.
2. Flask redirige a Auth0.
3. Auth0 autentica al usuario.
4. Auth0 redirige a `/api/oauth/auth0/callback` con un code.
5. Flask intercambia el code por tokens en Auth0.
6. Flask lee el perfil del usuario.
7. Flask busca o crea `Users` por email.
8. Flask devuelve nuestros `AccessToken` y `RefreshToken` internos.

### `routes/users.py`

Controlador de usuarios.

Endpoints:

- `GET /api/users`: lista usuarios, requiere rol `admin`.
- `GET /api/ControladorPrueba`: endpoint heredado de prueba.

### `routes/courts.py`

Controlador de canchas y horarios.

Endpoints principales:

- `POST /api/courts`: crear cancha, requiere `admin`.
- `GET /api/courts`: listar canchas, requiere `admin`.
- `GET /api/courts/{id}`: ver cancha, requiere `admin`.
- `PUT /api/courts/{id}`: actualizar cancha, requiere `admin`.
- `DELETE /api/courts/{id}`: desactivar cancha, requiere `admin`.
- `GET /api/courts/available`: horarios disponibles, requiere token.
- `GET /api/courts/{courtId}/available`: horarios disponibles por cancha.
- `POST /api/courts/{courtId}/schedules`: crear horario.
- `GET /api/courts/{courtId}/schedules`: listar horarios.
- `PUT /api/courts/{courtId}/schedules/{scheduleId}`: actualizar horario.
- `DELETE /api/courts/{courtId}/schedules/{scheduleId}`: eliminar horario.

### `routes/bookings.py`

Controlador de reservas.

Endpoints:

- `POST /api/bookings`: crear reserva, requiere `client`.
- `GET /api/bookings/my`: reservas del cliente autenticado.
- `GET /api/bookings/{id}`: detalle de reserva.
- `GET /api/bookings`: listar todas, requiere `admin`.
- `PUT /api/bookings/{id}/cancel`: cancelar reserva.

Reglas importantes:

- La fecha debe coincidir con el dia del horario.
- No permite reservar un horario ocupado.
- Calcula `totalAmount` y `advance`.
- Registra historial en `BookingHistories`.

### `routes/payments.py`

Controlador de pagos simulados.

Endpoints:

- `POST /api/payments`: simular pago, requiere `client`.
- `GET /api/payments/{bookingId}`: pagos de una reserva.
- `GET /api/payments`: todos los pagos, requiere `admin`.

Tipos de pago:

- `advance`
- `full`
- `balance`

### `routes/teams.py`

Controlador de equipos y miembros.

Endpoints:

- `POST /api/teams`: crear equipo, requiere `client`.
- `GET /api/teams`: listar equipos activos.
- `GET /api/teams/all`: listar todos, requiere `admin`.
- `GET /api/teams/{id}`: detalle de equipo.
- `PUT /api/teams/{id}`: editar equipo, solo lider.
- `DELETE /api/teams/{id}`: desactivar equipo, solo lider.
- `GET /api/teams/{id}/members`: listar miembros.
- `POST /api/teams/{id}/members/real`: agregar usuario real.
- `POST /api/teams/{id}/members/ghost`: agregar invitado sin cuenta.
- `DELETE /api/teams/{id}/members/{memberId}`: expulsar miembro.
- `DELETE /api/teams/{id}/members/me`: salir del equipo.
- `PUT /api/teams/{id}/members/{memberId}/promote`: transferir liderazgo.

Reglas importantes:

- Un cliente solo puede liderar un equipo activo.
- El creador se vuelve lider automaticamente.
- Solo el lider puede editar, agregar o expulsar miembros.

### `routes/challenges.py`

Controlador de retos entre equipos.

Endpoints:

- `POST /api/challenges`: enviar reto.
- `GET /api/challenges/{id}`: ver reto.
- `GET /api/challenges/received`: retos recibidos.
- `GET /api/challenges/sent`: retos enviados.
- `PUT /api/challenges/{id}/accept`: aceptar reto.
- `PUT /api/challenges/{id}/reject`: rechazar reto.
- `POST /api/challenges/{id}/booking`: crear reserva para reto aceptado.

Reglas importantes:

- Solo lideres pueden enviar/aceptar/rechazar retos.
- No se puede retar al propio equipo.
- Un reto aceptado puede vincular una reserva.

### `routes/ratings.py`

Controlador de calificaciones.

Endpoints:

- `POST /api/rating`
- `POST /api/ratings`
- `GET /api/teams/{id}/ratings`
- `DELETE /api/rating/{id}`
- `DELETE /api/ratings/{id}`

Reglas importantes:

- Solo lideres pueden calificar.
- Solo se puede calificar a equipos con reto aceptado.
- No se puede calificar al propio equipo.
- Filtra palabras inapropiadas en comentarios.

## Carpeta `tests`

### `tests/conftest.py`

Asegura que pytest pueda importar el paquete local `pichangeo`.

### `tests/test_auth.py`

Pruebas actuales:

- Registro, login y refresh token.
- Validacion de roles para `/api/users`.

Usa SQLite en memoria para no tocar Azure durante pruebas automatizadas.

Ejecuta las pruebas con:

```powershell
python -m pytest
```

Usar `python -m pytest` evita conflictos si Windows tiene varios Python instalados.

## Flujo De Seguridad

Hay dos maneras de autenticar:

### Login local

```text
POST /api/auth/login
```

Devuelve:

```json
{
  "AccessToken": "...",
  "RefreshToken": "..."
}
```

### Login OAuth Auth0

```text
GET /api/oauth/auth0/login
```

Redirige a Auth0 y al volver por callback tambien devuelve:

```json
{
  "AccessToken": "...",
  "RefreshToken": "..."
}
```

El resto de endpoints usa:

```text
Authorization: Bearer <AccessToken>
```

## Proveedor OAuth Elegido

Elegi Auth0 para este proyecto porque:

- Implementa OAuth 2.0 y OpenID Connect de forma directa.
- Tiene soporte claro para Authorization Code en aplicaciones backend.
- No requiere administrar infraestructura propia.
- Es mas simple que Keycloak para un proyecto final.
- Encaja con Flask mediante Authlib.
- Nos permite conservar los JWT internos del backend.

Alternativas:

- Keycloak: potente, pero requiere desplegar y administrar servidor.
- Okta / Microsoft Entra ID: buenos para empresas, mas configuracion inicial.
- AWS Cognito: util si todo vive en AWS.
- Firebase Auth / Supabase / Clerk: muy buenos con frontend, pero para este backend Flask + Azure SQL Auth0 es mas directo.

## Como Probar Equipos

1. Haz login y copia `AccessToken`.
2. Llama:

```http
GET /api/teams
Authorization: Bearer <AccessToken>
```

3. Crear equipo:

```http
POST /api/teams
Authorization: Bearer <AccessToken>
Content-Type: application/json

{
  "teamName": "Mi Equipo"
}
```

El usuario autenticado debe tener rol `client`.
