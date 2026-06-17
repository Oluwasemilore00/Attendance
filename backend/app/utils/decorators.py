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


def visible_owner_ids(user: User):
    """Course-owner ids whose data `user` may see.

    * Super admin -> None (no restriction, sees everything).
    * Admin       -> their own id plus the ids of course reps under them.
    * Course rep  -> only their own id.
    """
    from app.models import Role

    if user.role == Role.SUPER_ADMIN:
        return None
    if user.role == Role.ADMIN:
        rep_ids = [u.id for u in user.course_reps]
        return [user.id, *rep_ids]
    return [user.id]


def can_view_owner(user: User, owner_id: int) -> bool:
    ids = visible_owner_ids(user)
    return ids is None or owner_id in ids


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
