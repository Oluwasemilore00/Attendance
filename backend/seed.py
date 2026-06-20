"""Seed the database with demo data.

Usage:  python seed.py
Creates a super admin, a course rep, a course with students, an open
attendance session, and a couple of attendance records.
"""
from datetime import datetime, timedelta

from app import create_app
from app.extensions import db
from app.models import (
    AttendanceRecord,
    AttendanceSession,
    AttendanceStatus,
    Course,
    CourseEnrollment,
    Role,
    Student,
    User,
)


def run():
    app = create_app()
    with app.app_context():
        if User.query.filter_by(username="admin").first():
            print("Seed data already present. Skipping.")
            return

        admin = User(
            full_name="Dept Admin",
            username="admin",
            email="deptadmin@quickattendance.test",
            role=Role.ADMIN,
        )
        admin.set_password("Admin@1234")
        db.session.add(admin)
        db.session.flush()

        # Course rep registered under the department admin.
        rep = User(
            full_name="Jane Course Rep",
            username="courserep",
            email="rep@quickattendance.test",
            role=Role.COURSE_REP,
            admin_id=admin.id,
        )
        rep.set_password("Rep@12345")
        db.session.add(rep)
        db.session.flush()

        course = Course(
            course_code="CSC401",
            course_name="Software Engineering",
            semester="2024/2025-1",
            owner_id=rep.id,
        )
        db.session.add(course)
        db.session.flush()

        students = [
            Student(matric_number=f"CSC/2021/{i:03d}", full_name=name,
                    department="Computer Science", level="400")
            for i, name in enumerate(
                ["Ada Lovelace", "Alan Turing", "Grace Hopper", "Linus Torvalds"], 1
            )
        ]
        db.session.add_all(students)
        db.session.flush()
        for s in students:
            db.session.add(CourseEnrollment(student_id=s.id, course_id=course.id))

        now = datetime.utcnow()
        session = AttendanceSession(
            public_token=AttendanceSession.generate_token(),
            course_id=course.id,
            title="Week 1 Lecture",
            session_date=now.date(),
            start_time=now - timedelta(hours=1),
            end_time=now + timedelta(hours=2),
            location_lat=6.5244,
            location_lng=3.3792,
            allowed_radius=3.0,
            is_open=True,
        )
        db.session.add(session)
        db.session.flush()

        # Two valid attendance records (different devices, on location).
        for idx, student in enumerate(students[:2]):
            db.session.add(
                AttendanceRecord(
                    session_id=session.id,
                    student_id=student.id,
                    device_id=f"device-{idx}",
                    ip_address="127.0.0.1",
                    latitude=6.5244,
                    longitude=3.3792,
                    distance_m=0.5,
                    attendance_status=AttendanceStatus.VALID,
                )
            )

        db.session.commit()
        print("Seed complete.")
        print("  Admin      -> admin     / Admin@1234")
        print("  Course rep -> courserep / Rep@12345  (under 'admin')")
        print(f"  Demo attendance link token: {session.public_token}")
        print("\nRun 'python create_superadmin.py' to create your super admin account.")


if __name__ == "__main__":
    run()
