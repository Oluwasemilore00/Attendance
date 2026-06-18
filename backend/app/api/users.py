"""User account settings + administration endpoints."""
from flask import Blueprint, jsonify, request

from app.extensions import db
from app.models import Role, SystemSetting, User
from app.utils.decorators import current_user, roles_required
from app.utils.security import (
    is_valid_username,
    normalise_email,
    validate_password_strength,
)

users_bp = Blueprint("users", __name__, url_prefix="/api/users")


# ---- self-service account settings ----
@users_bp.patch("/me/profile")
@roles_required(*Role.ALL)
def update_profile():
    user = current_user()
    data = request.get_json(silent=True) or {}

    if "full_name" in data and data["full_name"].strip():
        user.full_name = data["full_name"].strip()

    if "email" in data:
        norm = normalise_email(data["email"])
        if not norm:
            return jsonify({"error": "Invalid email."}), 400
        if norm != user.email and User.query.filter_by(email=norm).first():
            return jsonify({"error": "Email already in use."}), 409
        user.email = norm

    db.session.commit()
    return jsonify({"user": user.to_dict()})


@users_bp.patch("/me/avatar")
@roles_required(*Role.ALL)
def update_avatar():
    user = current_user()
    data = request.get_json(silent=True) or {}
    picture = data.get("profile_picture") or None

    if picture is not None:
        # Accept only base64 data URLs (jpeg/png) up to ~300 KB encoded.
        if picture and not picture.startswith("data:image/"):
            return jsonify({"error": "Invalid image format."}), 400
        if len(picture) > 400_000:
            return jsonify({"error": "Image too large (max ~300 KB)."}), 400

    user.profile_picture = picture
    db.session.commit()
    return jsonify({"user": user.to_dict()})


@users_bp.patch("/me/username")
@roles_required(*Role.ALL)
def change_username():
    user = current_user()
    data = request.get_json(silent=True) or {}
    new_username = (data.get("username") or "").strip()
    if not is_valid_username(new_username):
        return jsonify({"error": "Invalid username format."}), 400
    if new_username != user.username and User.query.filter_by(
        username=new_username
    ).first():
        return jsonify({"error": "Username already taken."}), 409
    user.username = new_username
    db.session.commit()
    return jsonify({"user": user.to_dict()})


@users_bp.patch("/me/password")
@roles_required(*Role.ALL)
def change_password():
    user = current_user()
    data = request.get_json(silent=True) or {}
    current = data.get("current_password") or ""
    new = data.get("new_password") or ""
    confirm = data.get("confirm_password") or ""

    if not user.check_password(current):
        return jsonify({"error": "Current password is incorrect."}), 403
    if new != confirm:
        return jsonify({"error": "Passwords do not match."}), 400
    errors = validate_password_strength(new)
    if errors:
        return jsonify({"error": "Weak password.", "details": errors}), 400

    user.set_password(new)
    db.session.commit()
    return jsonify({"message": "Password updated."})


# ---- administration ----
@users_bp.get("")
@roles_required(*Role.ADMINS)
def list_users():
    actor = current_user()
    if actor.role == Role.SUPER_ADMIN:
        # Super admin sees everyone.
        users = User.query.order_by(User.created_at.desc()).all()
    else:
        # An admin sees only the course reps registered under them
        # (never the super admin or other admins).
        users = (
            User.query.filter_by(admin_id=actor.id)
            .order_by(User.created_at.desc())
            .all()
        )
    return jsonify({"users": [u.to_dict() for u in users]})


def _can_manage(actor: User, target: User) -> bool:
    """Super admin manages anyone; an admin only their own course reps."""
    if actor.role == Role.SUPER_ADMIN:
        return True
    return target.role == Role.COURSE_REP and target.admin_id == actor.id


@users_bp.patch("/<int:user_id>")
@roles_required(*Role.ADMINS)
def admin_update_user(user_id):
    actor = current_user()
    user = db.session.get(User, user_id)
    if user is None or not _can_manage(actor, user):
        return jsonify({"error": "User not found."}), 404
    data = request.get_json(silent=True) or {}

    if "role" in data:
        new_role = data["role"]
        if new_role not in Role.ALL:
            return jsonify({"error": "Invalid role."}), 400
        # Only super admins may change roles (grant admin / super admin).
        if actor.role != Role.SUPER_ADMIN:
            return jsonify({"error": "Only a super admin can change roles."}), 403
        user.role = new_role
    if "is_active" in data:
        user.is_active = bool(data["is_active"])

    db.session.commit()
    return jsonify({"user": user.to_dict()})


# ---- system settings ----
@users_bp.get("/settings")
@roles_required(*Role.ALL)
def get_settings():
    return jsonify(
        {"attendance_threshold": float(SystemSetting.get("attendance_threshold", 75))}
    )


@users_bp.patch("/settings")
@roles_required(*Role.ADMINS)
def update_settings():
    data = request.get_json(silent=True) or {}
    if "attendance_threshold" in data:
        try:
            value = float(data["attendance_threshold"])
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid threshold."}), 400
        if not 0 <= value <= 100:
            return jsonify({"error": "Threshold must be between 0 and 100."}), 400
        SystemSetting.set("attendance_threshold", value)
        db.session.commit()
    return jsonify(
        {"attendance_threshold": float(SystemSetting.get("attendance_threshold", 75))}
    )
