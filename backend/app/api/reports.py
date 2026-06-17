"""Excel report exports using pandas + openpyxl."""
import io

import pandas as pd
from flask import Blueprint, jsonify, request, send_file

from app.models import Role
from app.services import analytics_service
from app.utils.decorators import current_user, roles_required

reports_bp = Blueprint("reports", __name__, url_prefix="/api/reports")


def _scope_owner():
    user = current_user()
    return None if user.role in Role.ADMINS else user.id


def _send_excel(sheets: dict[str, pd.DataFrame], filename: str):
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        for sheet_name, df in sheets.items():
            df.to_excel(writer, sheet_name=sheet_name[:31], index=False)
    buffer.seek(0)
    return send_file(
        buffer,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=filename,
    )


@reports_bp.get("/course/<int:course_id>/excel")
@roles_required(*Role.ALL)
def course_excel(course_id):
    report = analytics_service.course_report(course_id)
    if not report:
        return jsonify({"error": "Course not found."}), 404
    df = pd.DataFrame(report["students"])
    code = report["course"]["course_code"]
    return _send_excel({"Attendance": df}, f"{code}_attendance.xlsx")


@reports_bp.get("/semester/excel")
@roles_required(*Role.ALL)
def semester_excel():
    sem = request.args.get("semester", "2024/2025-1")
    report = analytics_service.semester_report(sem, owner_id=_scope_owner())
    sheets = {
        "Overall": pd.DataFrame(report["students"]),
        "Eligible": pd.DataFrame(report["eligible"]),
        "Ineligible": pd.DataFrame(report["ineligible"]),
    }
    safe_sem = sem.replace("/", "-")
    return _send_excel(sheets, f"semester_{safe_sem}.xlsx")
