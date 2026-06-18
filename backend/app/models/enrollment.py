"""Course enrollment join model."""
from app.extensions import db


class CourseEnrollment(db.Model):
    __tablename__ = "course_enrollments"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey("students.id"), nullable=False, index=True
    )
    course_id = db.Column(
        db.Integer, db.ForeignKey("courses.id"), nullable=False, index=True
    )

    __table_args__ = (
        db.UniqueConstraint(
            "student_id", "course_id", name="uq_enrollment_student_course"
        ),
    )

    student = db.relationship("Student", back_populates="enrollments")
    course = db.relationship("Course", back_populates="enrollments")
