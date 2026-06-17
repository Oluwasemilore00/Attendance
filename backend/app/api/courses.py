"""Course and enrollment management endpoints."""
from flask import Blueprint, jsonify, request

from app.extensions import db
from app.models import Course, CourseEnrollment, Role, Student
from app.utils.decorators import current_user, roles_required

courses_bp = Blueprint("courses", __name__, url_prefix="/api/courses")


def _owned_course_or_none(course_id: int, user):
    course = db.session.get(Course, course_id)
    if course is None:
        return None
    # Admins can manage any course; course reps only their own.
    if user.role in Role.ADMINS or course.owner_id == user.id:
        return course
    return None


@courses_bp.get("")
@roles_required(*Role.ALL)
def list_courses():
    user = current_user()
    query = Course.query
    if user.role not in Role.ADMINS:
        query = query.filter_by(owner_id=user.id)
    semester = request.args.get("semester")
    if semester:
        query = query.filter_by(semester=semester)
    courses = query.order_by(Course.created_at.desc()).all()
    return jsonify({"courses": [c.to_dict() for c in courses]})


@courses_bp.post("")
@roles_required(*Role.ALL)
def create_course():
    user = current_user()
    data = request.get_json(silent=True) or {}
    code = (data.get("course_code") or "").strip().upper()
    name = (data.get("course_name") or "").strip()
    semester = (data.get("semester") or "2024/2025-1").strip()

    if not code or not name:
        return jsonify({"error": "course_code and course_name are required."}), 400

    existing = Course.query.filter_by(
        course_code=code, semester=semester, owner_id=user.id
    ).first()
    if existing:
        return jsonify({"error": "Course already exists for this semester."}), 409

    course = Course(
        course_code=code, course_name=name, semester=semester, owner_id=user.id
    )
    db.session.add(course)
    db.session.commit()
    return jsonify({"course": course.to_dict()}), 201


@courses_bp.get("/<int:course_id>")
@roles_required(*Role.ALL)
def get_course(course_id):
    course = _owned_course_or_none(course_id, current_user())
    if course is None:
        return jsonify({"error": "Course not found."}), 404
    data = course.to_dict()
    data["students"] = [e.student.to_dict() for e in course.enrollments]
    return jsonify({"course": data})


@courses_bp.delete("/<int:course_id>")
@roles_required(*Role.ALL)
def delete_course(course_id):
    course = _owned_course_or_none(course_id, current_user())
    if course is None:
        return jsonify({"error": "Course not found."}), 404
    db.session.delete(course)
    db.session.commit()
    return jsonify({"message": "Course deleted."})


@courses_bp.post("/<int:course_id>/students")
@roles_required(*Role.ALL)
def enroll_student(course_id):
    """Enroll a student, creating the Student record if needed."""
    course = _owned_course_or_none(course_id, current_user())
    if course is None:
        return jsonify({"error": "Course not found."}), 404

    data = request.get_json(silent=True) or {}
    matric = (data.get("matric_number") or "").strip().upper()
    name = (data.get("full_name") or "").strip()
    if not matric or not name:
        return jsonify({"error": "matric_number and full_name are required."}), 400

    student = Student.query.filter_by(matric_number=matric).first()
    if student is None:
        student = Student(
            matric_number=matric,
            full_name=name,
            email=(data.get("email") or None),
            department=(data.get("department") or None),
            level=(data.get("level") or None),
        )
        db.session.add(student)
        db.session.flush()

    if CourseEnrollment.query.filter_by(
        student_id=student.id, course_id=course.id
    ).first():
        return jsonify({"error": "Student already enrolled."}), 409

    db.session.add(CourseEnrollment(student_id=student.id, course_id=course.id))
    db.session.commit()
    return jsonify({"student": student.to_dict()}), 201


@courses_bp.delete("/<int:course_id>/students/<int:student_id>")
@roles_required(*Role.ALL)
def unenroll_student(course_id, student_id):
    course = _owned_course_or_none(course_id, current_user())
    if course is None:
        return jsonify({"error": "Course not found."}), 404
    enrollment = CourseEnrollment.query.filter_by(
        course_id=course.id, student_id=student_id
    ).first()
    if enrollment is None:
        return jsonify({"error": "Enrollment not found."}), 404
    db.session.delete(enrollment)
    db.session.commit()
    return jsonify({"message": "Student removed from course."})
