"""Auth helpers and role-based access control decorators."""
from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import User


def current_user() -> User | None:
    identity = get_jwt_identity()
    if identity is None:
        return None
    return db.session.get(User, int(identity))


def roles_required(*allowed_roles):
    """Require a valid JWT whose user has one of the allowed roles."""

    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user = current_user()
            if user is None or not user.is_active:
                return jsonify({"error": "Account not found or inactive."}), 401
            if allowed_roles and user.role not in allowed_roles:
                return jsonify({"error": "Insufficient permissions."}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator
