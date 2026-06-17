"""Public student-facing attendance endpoints + record management.

This module implements the location verification and anti-cheating rules:

* Submissions outside the allowed radius are rejected (Haversine check).
* A matric number may only sign once per session.
* A device (device_id) may only sign once per session. If the same device
  is used for more than one student in a session, every record from that
  device is invalidated and flagged for review.
"""
from flask import Blueprint, jsonify, request

from app.extensions import db, limiter
from app.models import (
    AttendanceRecord,
    AttendanceSession,
    AttendanceStatus,
    CourseEnrollment,
    Role,
    Student,
)
from app.utils.decorators import (
    can_view_owner,
    current_user,
    roles_required,
    visible_owner_ids,
)
from app.utils.geo import within_radius

attendance_bp = Blueprint("attendance", __name__, url_prefix="/api/attendance")


def _client_ip() -> str:
    fwd = request.headers.get("X-Forwarded-For")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.remote_addr or "unknown"


# --------------------------------------------------------------------------
# Public endpoints (no auth) — used by students via the shared link / QR.
# --------------------------------------------------------------------------
@attendance_bp.get("/session/<token>")
def public_session_info(token):
    """Minimal session info for the student attendance page."""
    session = AttendanceSession.query.filter_by(public_token=token).first()
    if session is None:
        return jsonify({"error": "Attendance session not found."}), 404
    return jsonify(
        {
            "session": {
                "title": session.title,
                "course_code": session.course.course_code,
                "course_name": session.course.course_name,
                "is_active": session.is_active,
                "is_open": session.is_open,
                "allowed_radius": session.allowed_radius,
            }
        }
    )


@attendance_bp.post("/session/<token>/submit")
@limiter.limit("30 per hour")
def submit_attendance(token):
    session = AttendanceSession.query.filter_by(public_token=token).first()
    if session is None:
        return jsonify({"error": "Attendance session not found."}), 404
    if not session.is_active:
        return jsonify({"error": "This attendance session is closed."}), 403

    data = request.get_json(silent=True) or {}
    matric = (data.get("matric_number") or "").strip().upper()
    full_name = (data.get("full_name") or "").strip()
    device_id = (data.get("device_id") or "").strip()

    if not matric or not full_name or not device_id:
        return jsonify(
            {"error": "full_name, matric_number and device_id are required."}
        ), 400

    try:
        lat = float(data["latitude"])
        lng = float(data["longitude"])
    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "GPS coordinates are required. Enable location."}), 400

    # 1. Location verification (Haversine).
    ok, distance = within_radius(
        session.location_lat, session.location_lng, lat, lng, session.allowed_radius
    )
    if not ok:
        return jsonify(
            {
                "error": (
                    f"You are {distance:.0f}m away. You must be within "
                    f"{session.allowed_radius:.0f}m of the class location to sign."
                ),
                "distance_m": round(distance, 1),
            }
        ), 403

    # Resolve / create student.
    student = Student.query.filter_by(matric_number=matric).first()
    if student is None:
        student = Student(matric_number=matric, full_name=full_name)
        db.session.add(student)
        db.session.flush()

    # 2. Duplicate matric prevention.
    if AttendanceRecord.query.filter_by(
        session_id=session.id, student_id=student.id
    ).filter(
        AttendanceRecord.attendance_status.in_(
            [AttendanceStatus.VALID, AttendanceStatus.FLAGGED]
        )
    ).first():
        return jsonify({"error": "This matric number has already signed."}), 409

    # 3. Device restriction — detect a device already used in this session.
    device_used = AttendanceRecord.query.filter_by(
        session_id=session.id, device_id=device_id
    ).all()

    status = AttendanceStatus.VALID
    flag_reason = None
    if device_used:
        # Same device, different student -> fraud. Invalidate everything.
        status = AttendanceStatus.INVALIDATED
        flag_reason = "Multiple students submitted from the same device."
        for rec in device_used:
            rec.attendance_status = AttendanceStatus.INVALIDATED
            rec.flag_reason = flag_reason

    # Optional fraud signal: enrollment check (flag if not enrolled).
    enrolled = CourseEnrollment.query.filter_by(
        student_id=student.id, course_id=session.course_id
    ).first()
    if status == AttendanceStatus.VALID and not enrolled:
        status = AttendanceStatus.FLAGGED
        flag_reason = "Student is not enrolled in this course."

    record = AttendanceRecord(
        session_id=session.id,
        student_id=student.id,
        device_id=device_id,
        ip_address=_client_ip(),
        user_agent=request.headers.get("User-Agent", "")[:400],
        latitude=lat,
        longitude=lng,
        distance_m=distance,
        attendance_status=status,
        flag_reason=flag_reason,
    )
    db.session.add(record)
    db.session.commit()

    if status == AttendanceStatus.INVALIDATED:
        return jsonify(
            {
                "error": (
                    "This device has already been used for another student. "
                    "All submissions from it have been invalidated and flagged."
                )
            }
        ), 409

    return jsonify(
        {
            "message": "Attendance recorded successfully.",
            "status": status,
            "distance_m": round(distance, 1),
            "flagged": status == AttendanceStatus.FLAGGED,
        }
    ), 201


# --------------------------------------------------------------------------
# Authenticated record management (course reps / admins).
# --------------------------------------------------------------------------
@attendance_bp.get("/records")
@roles_required(*Role.ALL)
def list_records():
    user = current_user()
    query = AttendanceRecord.query.join(AttendanceSession)
    owner_ids = visible_owner_ids(user)
    if owner_ids is not None:
        from app.models import Course
        query = query.join(Course).filter(Course.owner_id.in_(owner_ids))

    session_id = request.args.get("session_id", type=int)
    if session_id:
        query = query.filter(AttendanceRecord.session_id == session_id)
    status = request.args.get("status")
    if status:
        query = query.filter(AttendanceRecord.attendance_status == status)
    search = request.args.get("search")
    if search:
        like = f"%{search.upper()}%"
        query = query.join(Student).filter(
            db.or_(
                Student.matric_number.ilike(like),
                Student.full_name.ilike(f"%{search}%"),
            )
        )

    records = query.order_by(AttendanceRecord.timestamp.desc()).limit(1000).all()

    # Bulk-resolve enrollment so the UI can offer an "Enroll" action for
    # students who signed but are not enrolled in the course (no N+1).
    pairs = {
        (r.student_id, r.session.course_id) for r in records if r.session
    }
    enrolled_pairs = set()
    if pairs:
        student_ids = {p[0] for p in pairs}
        course_ids = {p[1] for p in pairs}
        rows = CourseEnrollment.query.filter(
            CourseEnrollment.student_id.in_(student_ids),
            CourseEnrollment.course_id.in_(course_ids),
        ).all()
        enrolled_pairs = {(e.student_id, e.course_id) for e in rows}

    payload = []
    for r in records:
        d = r.to_dict()
        d["is_enrolled"] = (
            (r.student_id, r.session.course_id) in enrolled_pairs
            if r.session else True
        )
        payload.append(d)
    return jsonify({"records": payload})


@attendance_bp.patch("/records/<int:record_id>")
@roles_required(*Role.ALL)
def update_record_status(record_id):
    """Allow a rep/admin to re-validate or invalidate a flagged record."""
    record = db.session.get(AttendanceRecord, record_id)
    if record is None:
        return jsonify({"error": "Record not found."}), 404
    user = current_user()
    if not can_view_owner(user, record.session.course.owner_id):
        return jsonify({"error": "Record not found."}), 404

    data = request.get_json(silent=True) or {}
    new_status = data.get("attendance_status")
    if new_status not in AttendanceStatus.ALL:
        return jsonify({"error": "Invalid status."}), 400
    record.attendance_status = new_status
    record.flag_reason = data.get("flag_reason", record.flag_reason)
    db.session.commit()
    return jsonify({"record": record.to_dict()})


@attendance_bp.post("/records/<int:record_id>/enroll")
@roles_required(*Role.ALL)
def enroll_from_record(record_id):
    """Enroll the record's student into the course they signed for.

    Used when a student signs attendance for a course they were not enrolled
    in (the record is flagged). Enrolling clears that flag and validates the
    record so it counts towards attendance.
    """
    record = db.session.get(AttendanceRecord, record_id)
    if record is None:
        return jsonify({"error": "Record not found."}), 404
    user = current_user()
    if not can_view_owner(user, record.session.course.owner_id):
        return jsonify({"error": "Record not found."}), 404

    course_id = record.session.course_id
    student = record.student

    enrollment = CourseEnrollment.query.filter_by(
        student_id=student.id, course_id=course_id
    ).first()
    created = False
    if enrollment is None:
        db.session.add(
            CourseEnrollment(student_id=student.id, course_id=course_id)
        )
        created = True

    # If the record was flagged only because the student wasn't enrolled,
    # it is now legitimate — validate it and clear the flag.
    if (
        record.attendance_status == AttendanceStatus.FLAGGED
        and record.flag_reason
        and "not enrolled" in record.flag_reason.lower()
    ):
        record.attendance_status = AttendanceStatus.VALID
        record.flag_reason = None

    db.session.commit()
    return jsonify(
        {
            "message": (
                "Student enrolled and attendance validated."
                if created else "Student was already enrolled."
            ),
            "created": created,
            "record": record.to_dict(),
        }
    )
