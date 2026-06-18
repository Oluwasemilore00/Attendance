"""Quick Attendance application factory."""
from flask import Flask, jsonify

from app.config import get_config
from app.extensions import db, migrate, jwt, cors, limiter


def create_app(config_object=None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_object or get_config())

    _init_extensions(app)
    _register_blueprints(app)
    _register_error_handlers(app)
    _register_security_headers(app)

    # Ensure tables exist for SQLite/zero-config runs.
    with app.app_context():
        from app import models  # noqa: F401  (register models)
        db.create_all()
        _bootstrap_settings()

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "quick-attendance"})

    return app


def _init_extensions(app: Flask) -> None:
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    origins = app.config.get("CORS_ORIGINS", "*")
    origins = "*" if origins == "*" else [o.strip() for o in origins.split(",")]
    cors.init_app(
        app, resources={r"/api/*": {"origins": origins}}, supports_credentials=True
    )
    limiter.init_app(app)


def _register_blueprints(app: Flask) -> None:
    from app.api.auth import auth_bp
    from app.api.courses import courses_bp
    from app.api.sessions import sessions_bp
    from app.api.attendance import attendance_bp
    from app.api.analytics import analytics_bp
    from app.api.users import users_bp
    from app.api.reports import reports_bp
    from app.api.payments import payments_bp

    for bp in (
        auth_bp, courses_bp, sessions_bp, attendance_bp,
        analytics_bp, users_bp, reports_bp, payments_bp,
    ):
        app.register_blueprint(bp)


def _register_error_handlers(app: Flask) -> None:
    @app.errorhandler(404)
    def not_found(_):
        return jsonify({"error": "Resource not found."}), 404

    @app.errorhandler(429)
    def ratelimit(_):
        return jsonify({"error": "Too many requests, slow down."}), 429

    @app.errorhandler(500)
    def server_error(_):
        return jsonify({"error": "Internal server error."}), 500


def _register_security_headers(app: Flask) -> None:
    @app.after_request
    def set_secure_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers.setdefault(
            "Permissions-Policy", "geolocation=(self)"
        )
        return response


def _bootstrap_settings() -> None:
    from app.models import SystemSetting
    if SystemSetting.get("attendance_threshold") is None:
        SystemSetting.set(
            "attendance_threshold",
            get_config().DEFAULT_ATTENDANCE_THRESHOLD,
        )
        db.session.commit()
