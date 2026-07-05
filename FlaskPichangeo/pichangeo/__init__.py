from flask import Flask, current_app, jsonify

from .auth import hash_password
from .config import Config
from .extensions import db, oauth
from .models import User


def create_app(config_object=Config):
    app = Flask(__name__)
    app.config.from_object(config_object)

    db.init_app(app)
    oauth.init_app(app)
    register_oauth_clients(app)
    register_blueprints(app)
    register_cli(app)

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})

    if app.config["AUTO_CREATE_DB"]:
        with app.app_context():
            db.create_all()
            if app.config["AUTO_SEED_ADMIN"]:
                seed_default_admin()

    return app


def register_blueprints(app: Flask) -> None:
    from .routes.auth import bp as auth_bp
    from .routes.bookings import bp as bookings_bp
    from .routes.challenges import bp as challenges_bp
    from .routes.courts import bp as courts_bp
    from .routes.payments import bp as payments_bp
    from .routes.oauth import bp as oauth_bp
    from .routes.ratings import bp as ratings_bp
    from .routes.teams import bp as teams_bp
    from .routes.users import bp as users_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(oauth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(courts_bp)
    app.register_blueprint(bookings_bp)
    app.register_blueprint(payments_bp)
    app.register_blueprint(teams_bp)
    app.register_blueprint(challenges_bp)
    app.register_blueprint(ratings_bp)


def register_oauth_clients(app: Flask) -> None:
    domain = app.config.get("AUTH0_DOMAIN", "")
    client_id = app.config.get("AUTH0_CLIENT_ID", "")
    client_secret = app.config.get("AUTH0_CLIENT_SECRET", "")
    if not domain or not client_id or not client_secret:
        return

    domain = domain.removeprefix("https://").removesuffix("/")
    authorize_params = {}
    if app.config.get("AUTH0_AUDIENCE", ""):
        authorize_params["audience"] = app.config["AUTH0_AUDIENCE"]

    oauth.register(
        name="auth0",
        client_id=client_id,
        client_secret=client_secret,
        server_metadata_url=f"https://{domain}/.well-known/openid-configuration",
        client_kwargs={"scope": app.config.get("AUTH0_SCOPE", "openid profile email")},
        authorize_params=authorize_params,
    )


def seed_default_admin() -> None:
    email = current_app.config["DEFAULT_ADMIN_EMAIL"]
    if User.query.filter_by(email=email).first():
        return

    admin = User(
        username=current_app.config["DEFAULT_ADMIN_USERNAME"],
        name=current_app.config["DEFAULT_ADMIN_NAME"],
        email=email,
        password_hash=hash_password(current_app.config["DEFAULT_ADMIN_PASSWORD"]),
        role="admin",
        status="active",
    )
    db.session.add(admin)
    db.session.commit()


def register_cli(app: Flask) -> None:
    @app.cli.command("init-db")
    def init_db_command():
        db.create_all()
        print("Base de datos inicializada.")

    @app.cli.command("seed-admin")
    def seed_admin_command():
        seed_default_admin()
        print("Administrador inicial creado o ya existente.")
