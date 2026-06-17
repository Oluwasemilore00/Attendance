"""Smoke + behaviour tests for the Quick Attendance API."""
import os
from datetime import datetime, timedelta

import pytest

os.environ["FLASK_ENV"] = "testing"

from app import create_app  # noqa: E402
from app.config import TestingConfig  # noqa: E402
from app.extensions import db  # noqa: E402
from app.utils.geo import haversine_distance  # noqa: E402


@pytest.fixture()
def app():
    app = create_app(TestingConfig)
    yield app
    with app.app_context():
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def _register(client, role="admin", username="rep1", admin_identifier=None):
    payload = {
        "full_name": "Test User",
        "username": username,
        "email": f"{username}@test.com",
        "password": "Str0ng@Pass",
        "confirm_password": "Str0ng@Pass",
        "role": role,
    }
    if admin_identifier:
        payload["admin_identifier"] = admin_identifier
    return client.post("/api/auth/register", json=payload)


def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.get_json()["status"] == "ok"


def test_haversine_known_distance():
    # ~111.2m between 0.001 deg of latitude.
    d = haversine_distance(0.0, 0.0, 0.001, 0.0)
    assert 110 < d < 112


def test_register_and_login(client):
    res = _register(client)
    assert res.status_code == 201
    token = res.get_json()["access_token"]
    assert token

    res = client.post(
        "/api/auth/login",
        json={"identifier": "rep1", "password": "Str0ng@Pass"},
    )
    assert res.status_code == 200


def test_weak_password_rejected(client):
    res = client.post(
        "/api/auth/register",
        json={
            "full_name": "X", "username": "weakuser", "email": "w@test.com",
            "password": "weak", "confirm_password": "weak", "role": "course_rep",
        },
    )
    assert res.status_code == 400


def _auth_header(client):
    token = _register(client).get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_attendance_flow_and_geofence(client):
    headers = _auth_header(client)

    # create course
    res = client.post(
        "/api/courses",
        json={"course_code": "CSC101", "course_name": "Intro"},
        headers=headers,
    )
    course_id = res.get_json()["course"]["id"]

    # enroll student
    client.post(
        f"/api/courses/{course_id}/students",
        json={"matric_number": "M001", "full_name": "Student One"},
        headers=headers,
    )

    now = datetime.utcnow()
    res = client.post(
        "/api/sessions",
        json={
            "course_id": course_id,
            "start_time": (now - timedelta(hours=1)).isoformat(),
            "end_time": (now + timedelta(hours=1)).isoformat(),
            "location_lat": 6.5244,
            "location_lng": 3.3792,
            "allowed_radius": 3.0,
        },
        headers=headers,
    )
    assert res.status_code == 201
    token = res.get_json()["session"]["public_token"]
    assert res.get_json()["session"]["qr_code"].startswith("data:image/png")

    # submit far away -> rejected
    res = client.post(
        f"/api/attendance/session/{token}/submit",
        json={
            "full_name": "Student One", "matric_number": "M001",
            "device_id": "dev-1", "latitude": 7.0, "longitude": 4.0,
        },
    )
    assert res.status_code == 403

    # submit on location -> ok
    res = client.post(
        f"/api/attendance/session/{token}/submit",
        json={
            "full_name": "Student One", "matric_number": "M001",
            "device_id": "dev-1", "latitude": 6.5244, "longitude": 3.3792,
        },
    )
    assert res.status_code == 201

    # duplicate matric -> rejected
    res = client.post(
        f"/api/attendance/session/{token}/submit",
        json={
            "full_name": "Student One", "matric_number": "M001",
            "device_id": "dev-9", "latitude": 6.5244, "longitude": 3.3792,
        },
    )
    assert res.status_code == 409

    # same device, different student -> invalidated
    res = client.post(
        f"/api/attendance/session/{token}/submit",
        json={
            "full_name": "Student Two", "matric_number": "M002",
            "device_id": "dev-1", "latitude": 6.5244, "longitude": 3.3792,
        },
    )
    assert res.status_code == 409


def test_analytics_course_report(client):
    headers = _auth_header(client)
    res = client.post(
        "/api/courses",
        json={"course_code": "CSC202", "course_name": "Data"},
        headers=headers,
    )
    course_id = res.get_json()["course"]["id"]
    res = client.get(f"/api/analytics/course/{course_id}", headers=headers)
    assert res.status_code == 200
    assert "students" in res.get_json()


def test_course_rep_requires_admin(client):
    # Registering a course rep without an admin must fail.
    res = client.post(
        "/api/auth/register",
        json={
            "full_name": "Lonely Rep", "username": "lonelyrep",
            "email": "lonely@test.com", "password": "Str0ng@Pass",
            "confirm_password": "Str0ng@Pass", "role": "course_rep",
        },
    )
    assert res.status_code == 400

    # With a valid admin identifier it succeeds and is linked.
    _register(client, role="admin", username="bossadmin")
    res = client.post(
        "/api/auth/register",
        json={
            "full_name": "Good Rep", "username": "goodrep",
            "email": "good@test.com", "password": "Str0ng@Pass",
            "confirm_password": "Str0ng@Pass", "role": "course_rep",
            "admin_identifier": "bossadmin",
        },
    )
    assert res.status_code == 201
    assert res.get_json()["user"]["admin_username"] == "bossadmin"


def test_admin_only_sees_own_reps_and_courses(client):
    a_token = _register(client, role="admin", username="adminA").get_json()["access_token"]
    b_token = _register(client, role="admin", username="adminB").get_json()["access_token"]
    rep = _register(
        client, role="course_rep", username="repA", admin_identifier="adminA"
    ).get_json()
    rep_token = rep["access_token"]
    rep_headers = {"Authorization": f"Bearer {rep_token}"}
    a_headers = {"Authorization": f"Bearer {a_token}"}
    b_headers = {"Authorization": f"Bearer {b_token}"}

    # Rep creates a course.
    client.post(
        "/api/courses",
        json={"course_code": "REP101", "course_name": "Rep Course"},
        headers=rep_headers,
    )

    # Admin A sees only their rep (not admins, not the other admin).
    res = client.get("/api/users", headers=a_headers)
    usernames = [u["username"] for u in res.get_json()["users"]]
    assert usernames == ["repA"]

    # Admin B sees no reps.
    assert client.get("/api/users", headers=b_headers).get_json()["users"] == []

    # Admin A sees the rep's course; admin B does not.
    a_codes = [c["course_code"] for c in client.get("/api/courses", headers=a_headers).get_json()["courses"]]
    b_codes = [c["course_code"] for c in client.get("/api/courses", headers=b_headers).get_json()["courses"]]
    assert "REP101" in a_codes
    assert "REP101" not in b_codes

    # Admin B cannot change roles (only super admin can).
    rep_id = rep["user"]["id"]
    res = client.patch(
        f"/api/users/{rep_id}", json={"role": "admin"}, headers=b_headers
    )
    assert res.status_code == 404  # not visible to admin B
