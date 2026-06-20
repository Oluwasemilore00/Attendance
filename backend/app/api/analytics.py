"""Analytics & eligibility endpoints."""
from flask import Blueprint, jsonify, request

from app.extensions import db
from app.models import Course, Role
from app.services import analytics_service
from app.utils.decorators import (
    can_view_owner,
    current_user,
    roles_required,
    visible_owner_ids,
)

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


def _scope():
    """Owner ids the current user may see (None = unrestricted)."""
    return visible_owner_ids(current_user())


def _scoped_ids(owner_ids):
    """Narrow scope to a single owner_id from the request query param."""
    owner_id = request.args.get("owner_id", type=int)
    if not owner_id:
        return owner_ids
    if owner_ids is not None and owner_id not in owner_ids:
        from flask import abort
        abort(403)
    return [owner_id]


@analytics_bp.get("/course/<int:course_id>")
@roles_required(*Role.ALL)
def course(course_id):
    course_obj = db.session.get(Course, course_id)
    if course_obj is None or not can_view_owner(current_user(), course_obj.owner_id):
        return jsonify({"error": "Course not found."}), 404
    report = analytics_service.course_report(course_id)
    if not report:
        return jsonify({"error": "Course not found."}), 404
    return jsonify(report)


@analytics_bp.get("/semester")
@roles_required(*Role.ALL)
def semester():
    sem = request.args.get("semester", "2024/2025-1")
    return jsonify(analytics_service.semester_report(sem, owner_ids=_scoped_ids(_scope())))


@analytics_bp.get("/courses")
@roles_required(*Role.ALL)
def courses_overview():
    return jsonify(analytics_service.course_analytics(owner_ids=_scoped_ids(_scope())))


@analytics_bp.get("/eligibility")
@roles_required(*Role.ALL)
def eligibility():
    sem = request.args.get("semester", "2024/2025-1")
    report = analytics_service.semester_report(sem, owner_ids=_scope())
    return jsonify(
        {
            "semester": sem,
            "threshold": report["threshold"],
            "eligible": report["eligible"],
            "ineligible": report["ineligible"],
        }
    )
