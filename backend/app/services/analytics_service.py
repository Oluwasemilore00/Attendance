"""Attendance analytics and reporting calculations.

All percentages are computed on demand from the source-of-truth tables
(sessions + valid records) so they never drift out of sync.
"""
from app.extensions import db
from app.models import (
    AttendanceRecord,
    AttendanceSession,
    AttendanceStatus,
    Course,
    CourseEnrollment,
    Student,
    SystemSetting,
)


def attendance_status_label(pct: float) -> str:
    if pct >= 90:
        return "Excellent"
    if pct >= 75:
        return "Good Standing"
    if pct >= 50:
        return "Warning"
    return "Below Requirement"


def _valid_record_session_ids(student_id: int, session_ids: set[int]) -> set[int]:
    """Session ids the student has a *valid* record for (within given set)."""
    if not session_ids:
        return set()
    rows = (
        db.session.query(AttendanceRecord.session_id)
        .filter(
            AttendanceRecord.student_id == student_id,
            AttendanceRecord.session_id.in_(session_ids),
            AttendanceRecord.attendance_status == AttendanceStatus.VALID,
        )
        .distinct()
        .all()
    )
    return {r[0] for r in rows}


def course_report(course_id: int) -> dict:
    """Per-student attendance breakdown for a single course."""
    course = db.session.get(Course, course_id)
    if course is None:
        return {}

    session_ids = {s.id for s in course.sessions}
    total_classes = len(session_ids)

    students = [e.student for e in course.enrollments]
    rows = []
    for student in students:
        attended = len(_valid_record_session_ids(student.id, session_ids))
        pct = (attended / total_classes * 100) if total_classes else 0.0
        rows.append(
            {
                "student_id": student.id,
                "student_name": student.full_name,
                "matric_number": student.matric_number,
                "course_code": course.course_code,
                "classes_attended": attended,
                "classes_missed": total_classes - attended,
                "total_classes": total_classes,
                "attendance_percentage": round(pct, 2),
                "status": attendance_status_label(pct),
            }
        )

    rows.sort(key=lambda r: r["attendance_percentage"], reverse=True)
    return {
        "course": course.to_dict(),
        "total_classes": total_classes,
        "students": rows,
    }


def semester_report(semester: str, owner_id: int | None = None) -> dict:
    """Overall per-student attendance across all courses in a semester."""
    query = Course.query.filter_by(semester=semester)
    if owner_id is not None:
        query = query.filter_by(owner_id=owner_id)
    courses = query.all()

    # Map student -> (attended, held) accumulators.
    per_student: dict[int, dict] = {}

    for course in courses:
        session_ids = {s.id for s in course.sessions}
        held = len(session_ids)
        for enrollment in course.enrollments:
            student = enrollment.student
            acc = per_student.setdefault(
                student.id,
                {
                    "student_id": student.id,
                    "student_name": student.full_name,
                    "matric_number": student.matric_number,
                    "total_sessions_attended": 0,
                    "total_sessions_held": 0,
                },
            )
            acc["total_sessions_held"] += held
            acc["total_sessions_attended"] += len(
                _valid_record_session_ids(student.id, session_ids)
            )

    threshold = float(
        SystemSetting.get("attendance_threshold", default=75)
    )

    rows = []
    for acc in per_student.values():
        held = acc["total_sessions_held"]
        pct = (acc["total_sessions_attended"] / held * 100) if held else 0.0
        acc["overall_percentage"] = round(pct, 2)
        acc["status"] = attendance_status_label(pct)
        acc["eligible"] = pct >= threshold
        rows.append(acc)

    rows.sort(key=lambda r: r["overall_percentage"], reverse=True)
    return {
        "semester": semester,
        "threshold": threshold,
        "students": rows,
        "eligible": [r for r in rows if r["eligible"]],
        "ineligible": [r for r in rows if not r["eligible"]],
    }


def course_analytics(owner_id: int | None = None) -> dict:
    """Aggregate analytics across courses (averages, highest, lowest)."""
    query = Course.query
    if owner_id is not None:
        query = query.filter_by(owner_id=owner_id)
    courses = query.all()

    course_stats = []
    for course in courses:
        report = course_report(course.id)
        students = report.get("students", [])
        if students:
            avg = sum(s["attendance_percentage"] for s in students) / len(students)
            highest = max(s["attendance_percentage"] for s in students)
            lowest = min(s["attendance_percentage"] for s in students)
        else:
            avg = highest = lowest = 0.0
        course_stats.append(
            {
                "course_id": course.id,
                "course_code": course.course_code,
                "course_name": course.course_name,
                "total_classes": report.get("total_classes", 0),
                "average_attendance": round(avg, 2),
                "highest_attendance": round(highest, 2),
                "lowest_attendance": round(lowest, 2),
            }
        )

    overall_avg = (
        round(sum(c["average_attendance"] for c in course_stats) / len(course_stats), 2)
        if course_stats else 0.0
    )
    return {"overall_average": overall_avg, "courses": course_stats}
