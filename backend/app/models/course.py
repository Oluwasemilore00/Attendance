"""Course model."""
from app.extensions import db
from app.models.user import utcnow


class Course(db.Model):
    __tablename__ = "courses"

    id = db.Column(db.Integer, primary_key=True)
    course_code = db.Column(db.String(30), nullable=False, index=True)
    course_name = db.Column(db.String(150), nullable=False)
    semester = db.Column(db.String(50), nullable=False, default="2024/2025-1")
    owner_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    __table_args__ = (
        db.UniqueConstraint(
            "course_code", "semester", "owner_id", name="uq_course_code_sem_owner"
        ),
    )

    owner = db.relationship("User", back_populates="courses")
    enrollments = db.relationship(
        "CourseEnrollment", back_populates="course",
        cascade="all, delete-orphan",
    )
    sessions = db.relationship(
        "AttendanceSession", back_populates="course",
        cascade="all, delete-orphan",
    )

    def to_dict(self) -> dict:
        owner = self.owner
        admin = owner.admin if owner else None
        return {
            "id": self.id,
            "course_code": self.course_code,
            "course_name": self.course_name,
            "semester": self.semester,
            "owner_id": self.owner_id,
            "owner_full_name": owner.full_name if owner else None,
            "owner_username": owner.username if owner else None,
            "owner_role": owner.role if owner else None,
            "owner_admin_id": owner.admin_id if owner else None,
            "owner_admin_name": admin.full_name if admin else None,
            "owner_admin_username": admin.username if admin else None,
            "enrolled_count": len(self.enrollments),
            "session_count": len(self.sessions),
        }
