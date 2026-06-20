"""
One-off script to create the super administrator account.
Run once:  python create_superadmin.py
"""
import getpass
import sys

from app import create_app
from app.extensions import db
from app.models import Role, User


def main():
    app = create_app()
    with app.app_context():
        existing = User.query.filter_by(role=Role.SUPER_ADMIN).first()
        if existing:
            print(f"A super admin already exists: '{existing.username}' ({existing.email})")
            print("Remove that account first if you need to create a new one.")
            sys.exit(1)

        print("=== Create Super Admin ===\n")
        full_name = input("Full name:  ").strip()
        username  = input("Username:   ").strip()
        email     = input("Email:      ").strip()

        while True:
            password = getpass.getpass("Password:   ")
            confirm  = getpass.getpass("Confirm:    ")
            if password == confirm:
                break
            print("Passwords do not match — try again.\n")

        errors = []
        if not full_name: errors.append("Full name is required.")
        if not username:  errors.append("Username is required.")
        if not email:     errors.append("Email is required.")
        if len(password) < 8: errors.append("Password must be at least 8 characters.")
        if User.query.filter_by(username=username).first():
            errors.append(f"Username '{username}' is already taken.")
        if User.query.filter_by(email=email).first():
            errors.append(f"Email '{email}' is already registered.")

        if errors:
            for e in errors:
                print(f"  ✗ {e}")
            sys.exit(1)

        user = User(
            full_name=full_name,
            username=username,
            email=email,
            role=Role.SUPER_ADMIN,
            is_active=True,
            plan="pro",
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        print(f"\nSuper admin '{username}' created successfully (id={user.id}).")


if __name__ == "__main__":
    main()
