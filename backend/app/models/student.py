"""Student model."""
from app.extensions import db
from app.models.user import utcnow


class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    matric_number = db.Column(
        db.String(50), unique=True, nullable=False, index=True
    )
    full_name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), nullable=True, index=True)
    department = db.Column(db.String(120), nullable=True)
    level = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    enrollments = db.relationship(
        "CourseEnrollment", back_populates="student",
        cascade="all, delete-orphan",
    )
    records = db.relationship(
        "AttendanceRecord", back_populates="student",
        cascade="all, delete-orphan",
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "matric_number": self.matric_number,
            "full_name": self.full_name,
            "email": self.email,
            "department": self.department,
            "level": self.level,
        }
