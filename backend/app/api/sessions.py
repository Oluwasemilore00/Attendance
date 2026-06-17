"""Attendance session management (create, list, close, QR code)."""
from datetime import date, datetime

from flask import Blueprint, jsonify, request

from app.extensions import db
from app.models import AttendanceSession, Course, Role
from app.utils.decorators import (
    can_view_owner,
    current_user,
    roles_required,
    visible_owner_ids,
)
from app.utils.qr import generate_qr_data_uri

sessions_bp = Blueprint("sessions", __name__, url_prefix="/api/sessions")


def _frontend_base() -> str:
    """Base URL students use to reach the attendance form."""
    return request.headers.get("X-Frontend-URL", request.host_url.rstrip("/"))


def _parse_dt(value: str):
    """Parse ISO datetime, tolerating a trailing Z."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


@sessions_bp.get("")
@roles_required(*Role.ALL)
def list_sessions():
    user = current_user()
    query = AttendanceSession.query.join(Course)
    owner_ids = visible_owner_ids(user)
    if owner_ids is not None:
        query = query.filter(Course.owner_id.in_(owner_ids))
    if request.args.get("active") == "true":
        query = query.filter(AttendanceSession.is_open.is_(True))
    sessions = query.order_by(AttendanceSession.created_at.desc()).all()
    base = _frontend_base()
    return jsonify({"sessions": [s.to_dict(base) for s in sessions]})


@sessions_bp.post("")
@roles_required(*Role.ALL)
def create_session():
    user = current_user()
    data = request.get_json(silent=True) or {}

    course = db.session.get(Course, data.get("course_id") or 0)
    if course is None or not can_view_owner(user, course.owner_id):
        return jsonify({"error": "Course not found."}), 404

    start_time = _parse_dt(data.get("start_time"))
    end_time = _parse_dt(data.get("end_time"))
    if not start_time or not end_time:
        return jsonify({"error": "Valid start_time and end_time are required."}), 400
    if end_time <= start_time:
        return jsonify({"error": "end_time must be after start_time."}), 400

    try:
        lat = float(data["location_lat"])
        lng = float(data["location_lng"])
    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "Valid location_lat and location_lng are required."}), 400

    radius = float(data.get("allowed_radius") or 3.0)
    session_date = (
        _parse_dt(data["session_date"]).date()
        if data.get("session_date") and _parse_dt(data.get("session_date"))
        else start_time.date()
    )

    session = AttendanceSession(
        public_token=AttendanceSession.generate_token(),
        course_id=course.id,
        title=(data.get("title") or None),
        session_date=session_date,
        start_time=start_time,
        end_time=end_time,
        location_lat=lat,
        location_lng=lng,
        allowed_radius=radius,
        is_open=True,
    )
    db.session.add(session)
    db.session.commit()

    base = _frontend_base()
    payload = session.to_dict(base)
    payload["qr_code"] = generate_qr_data_uri(payload["attendance_link"])
    return jsonify({"session": payload}), 201


@sessions_bp.get("/<int:session_id>")
@roles_required(*Role.ALL)
def get_session(session_id):
    user = current_user()
    session = db.session.get(AttendanceSession, session_id)
    if session is None or not can_view_owner(user, session.course.owner_id):
        return jsonify({"error": "Session not found."}), 404
    base = _frontend_base()
    payload = session.to_dict(base)
    payload["qr_code"] = generate_qr_data_uri(payload["attendance_link"])
    return jsonify({"session": payload})


@sessions_bp.post("/<int:session_id>/close")
@roles_required(*Role.ALL)
def close_session(session_id):
    user = current_user()
    session = db.session.get(AttendanceSession, session_id)
    if session is None or not can_view_owner(user, session.course.owner_id):
        return jsonify({"error": "Session not found."}), 404
    session.is_open = False
    db.session.commit()
    return jsonify({"session": session.to_dict(_frontend_base())})
