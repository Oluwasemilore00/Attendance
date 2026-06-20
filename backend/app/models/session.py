"""Attendance session model."""
import secrets
from datetime import datetime, timezone

from app.extensions import db
from app.models.user import utcnow


class AttendanceSession(db.Model):
    __tablename__ = "attendance_sessions"

    id = db.Column(db.Integer, primary_key=True)
    # Public, unguessable token used in shared links / QR codes.
    public_token = db.Column(
        db.String(40), unique=True, nullable=False, index=True
    )
    course_id = db.Column(
        db.Integer, db.ForeignKey("courses.id"), nullable=False, index=True
    )
    title = db.Column(db.String(150), nullable=True)
    session_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)

    location_lat = db.Column(db.Float, nullable=False)
    location_lng = db.Column(db.Float, nullable=False)
    # Allowed radius in metres (default ~3m = 10ft).
    allowed_radius = db.Column(db.Float, nullable=False, default=3.0)

    is_open = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    course = db.relationship("Course", back_populates="sessions")
    records = db.relationship(
        "AttendanceRecord", back_populates="session",
        cascade="all, delete-orphan",
    )

    @staticmethod
    def generate_token() -> str:
        return secrets.token_urlsafe(24)

    @property
    def is_active(self) -> bool:
        """A session accepts submissions when open and within its time window."""
        if not self.is_open:
            return False
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        return self.start_time <= now <= self.end_time

    def to_dict(self, base_url: str = "") -> dict:
        owner = self.course.owner if self.course else None
        admin = owner.admin if owner else None
        return {
            "id": self.id,
            "public_token": self.public_token,
            "course_id": self.course_id,
            "course_code": self.course.course_code if self.course else None,
            "course_name": self.course.course_name if self.course else None,
            "owner_id": owner.id if owner else None,
            "owner_full_name": owner.full_name if owner else None,
            "owner_username": owner.username if owner else None,
            "owner_role": owner.role if owner else None,
            "owner_admin_id": owner.admin_id if owner else None,
            "owner_admin_name": admin.full_name if admin else None,
            "owner_admin_username": admin.username if admin else None,
            "title": self.title,
            "session_date": self.session_date.isoformat()
            if self.session_date else None,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "location_lat": self.location_lat,
            "location_lng": self.location_lng,
            "allowed_radius": self.allowed_radius,
            "is_open": self.is_open,
            "is_active": self.is_active,
            "attendance_link": f"{base_url}/attend/{self.public_token}"
            if base_url else f"/attend/{self.public_token}",
            "record_count": len(self.records),
        }
