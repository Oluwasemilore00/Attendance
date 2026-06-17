"""Authentication endpoints: register, login, refresh, me."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt_identity,
    jwt_required,
)

from app.extensions import db, limiter
from app.models import User, Role
from app.utils.decorators import current_user
from app.utils.security import (
    is_valid_username,
    normalise_email,
    validate_password_strength,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _tokens_for(user: User) -> dict:
    identity = str(user.id)
    claims = {"role": user.role, "username": user.username}
    return {
        "access_token": create_access_token(identity=identity, additional_claims=claims),
        "refresh_token": create_refresh_token(identity=identity),
        "user": user.to_dict(),
    }


@auth_bp.post("/register")
@limiter.limit("10 per hour")
def register():
    data = request.get_json(silent=True) or {}
    full_name = (data.get("full_name") or "").strip()
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""
    confirm = data.get("confirm_password") or ""
    role = (data.get("role") or Role.COURSE_REP).strip()
    admin_identifier = (data.get("admin_identifier") or "").strip()

    errors = []
    if not full_name:
        errors.append("Full name is required.")
    if not is_valid_username(username):
        errors.append("Username must be 3-80 chars (letters, numbers, _ or .).")
    norm_email = normalise_email(email)
    if not norm_email:
        errors.append("A valid email address is required.")
    if password != confirm:
        errors.append("Passwords do not match.")
    errors.extend(validate_password_strength(password))
    if role not in Role.ALL:
        errors.append("Invalid role.")
    # Only allow self-registration as course rep / admin; super admin via seed.
    if role == Role.SUPER_ADMIN:
        errors.append("Super administrator accounts cannot be self-registered.")

    # A course rep must register under an existing administrator.
    parent_admin = None
    if role == Role.COURSE_REP:
        if not admin_identifier:
            errors.append(
                "Course representatives must register under an admin "
                "(provide the admin's username or email)."
            )
        else:
            parent_admin = User.query.filter(
                (User.username == admin_identifier)
                | (User.email == admin_identifier.lower())
            ).first()
            if parent_admin is None or parent_admin.role not in Role.ADMINS:
                errors.append("No administrator found with that username/email.")
            elif not parent_admin.is_active:
                errors.append("That administrator account is disabled.")

    if errors:
        return jsonify({"error": "Validation failed.", "details": errors}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already taken."}), 409
    if User.query.filter_by(email=norm_email).first():
        return jsonify({"error": "Email already registered."}), 409

    user = User(full_name=full_name, username=username, email=norm_email, role=role)
    if parent_admin is not None:
        user.admin_id = parent_admin.id
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify(_tokens_for(user)), 201


@auth_bp.post("/login")
@limiter.limit("20 per hour")
def login():
    data = request.get_json(silent=True) or {}
    identifier = (data.get("identifier") or "").strip()
    password = data.get("password") or ""

    if not identifier or not password:
        return jsonify({"error": "Username/email and password are required."}), 400

    user = (
        User.query.filter(
            (User.username == identifier)
            | (User.email == identifier.lower())
        ).first()
    )
    if user is None or not user.check_password(password):
        return jsonify({"error": "Invalid credentials."}), 401
    if not user.is_active:
        return jsonify({"error": "Account is disabled."}), 403

    return jsonify(_tokens_for(user)), 200


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    user = db.session.get(User, int(identity))
    if user is None or not user.is_active:
        return jsonify({"error": "Account not found or inactive."}), 401
    claims = {"role": user.role, "username": user.username}
    return jsonify(
        {"access_token": create_access_token(identity=identity, additional_claims=claims)}
    )


@auth_bp.get("/me")
@jwt_required()
def me():
    user = current_user()
    if user is None:
        return jsonify({"error": "Account not found."}), 404
    return jsonify({"user": user.to_dict()})
