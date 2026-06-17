"""Analytics & eligibility endpoints."""
from flask import Blueprint, jsonify, request

from app.models import Role
from app.services import analytics_service
from app.utils.decorators import current_user, roles_required

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


def _scope_owner():
    """Course reps are scoped to their own data; admins see everything."""
    user = current_user()
    return None if user.role in Role.ADMINS else user.id


@analytics_bp.get("/course/<int:course_id>")
@roles_required(*Role.ALL)
def course(course_id):
    report = analytics_service.course_report(course_id)
    if not report:
        return jsonify({"error": "Course not found."}), 404
    return jsonify(report)


@analytics_bp.get("/semester")
@roles_required(*Role.ALL)
def semester():
    sem = request.args.get("semester", "2024/2025-1")
    return jsonify(analytics_service.semester_report(sem, owner_id=_scope_owner()))


@analytics_bp.get("/courses")
@roles_required(*Role.ALL)
def courses_overview():
    return jsonify(analytics_service.course_analytics(owner_id=_scope_owner()))


@analytics_bp.get("/eligibility")
@roles_required(*Role.ALL)
def eligibility():
    sem = request.args.get("semester", "2024/2025-1")
    report = analytics_service.semester_report(sem, owner_id=_scope_owner())
    return jsonify(
        {
            "semester": sem,
            "threshold": report["threshold"],
            "eligible": report["eligible"],
            "ineligible": report["ineligible"],
        }
    )
