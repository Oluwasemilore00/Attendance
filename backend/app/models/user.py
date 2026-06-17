"""User account model with role based access control."""
from datetime import datetime, timezone

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError

from app.extensions import db

_hasher = PasswordHasher()


class Role:
    """Enumeration of supported roles."""

    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    COURSE_REP = "course_rep"

    ALL = (SUPER_ADMIN, ADMIN, COURSE_REP)
    # Roles that can administer users / system settings.
    ADMINS = (SUPER_ADMIN, ADMIN)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(150), nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(150), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(30), nullable=False, default=Role.COURSE_REP)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    courses = db.relationship(
        "Course", back_populates="owner", cascade="all, delete-orphan"
    )

    # ---- password helpers (Argon2) ----
    def set_password(self, raw_password: str) -> None:
        self.password_hash = _hasher.hash(raw_password)

    def check_password(self, raw_password: str) -> bool:
        try:
            return _hasher.verify(self.password_hash, raw_password)
        except (VerifyMismatchError, InvalidHashError):
            return False

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "full_name": self.full_name,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
