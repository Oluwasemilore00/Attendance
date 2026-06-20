"""Attendance record model."""
from app.extensions import db
from app.models.user import utcnow


class AttendanceStatus:
    VALID = "valid"
    FLAGGED = "flagged"      # suspicious, needs review
    INVALIDATED = "invalidated"  # rejected (e.g. multi-student device)
    REJECTED = "rejected"    # never accepted (out of radius)

    ALL = (VALID, FLAGGED, INVALIDATED, REJECTED)


class AttendanceRecord(db.Model):
    __tablename__ = "attendance_records"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(
        db.Integer, db.ForeignKey("attendance_sessions.id"),
        nullable=False, index=True,
    )
    student_id = db.Column(
        db.Integer, db.ForeignKey("students.id"), nullable=False, index=True
    )

    # Captured submission metadata used for anti-cheating.
    device_id = db.Column(db.String(64), nullable=False, index=True)
    ip_address = db.Column(db.String(64), nullable=True)
    user_agent = db.Column(db.String(400), nullable=True)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    distance_m = db.Column(db.Float, nullable=True)

    attendance_status = db.Column(
        db.String(20), nullable=False, default=AttendanceStatus.VALID, index=True
    )
    flag_reason = db.Column(db.String(255), nullable=True)
    timestamp = db.Column(db.DateTime, default=utcnow, nullable=False)

    session = db.relationship("AttendanceSession", back_populates="records")
    student = db.relationship("Student", back_populates="records")

    def to_dict(self) -> dict:
        course = self.session.course if self.session else None
        return {
            "id": self.id,
            "session_id": self.session_id,
            "course_id": course.id if course else None,
            "course_code": course.course_code if course else None,
            "course_name": course.course_name if course else None,
            "student_id": self.student_id,
            "matric_number": self.student.matric_number if self.student else None,
            "student_name": self.student.full_name if self.student else None,
            "device_id": self.device_id,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "distance_m": round(self.distance_m, 2)
            if self.distance_m is not None else None,
            "attendance_status": self.attendance_status,
            "flag_reason": self.flag_reason,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
