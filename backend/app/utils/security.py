"""Validation helpers for passwords, emails and usernames."""
import re

from email_validator import validate_email, EmailNotValidError

USERNAME_RE = re.compile(r"^[A-Za-z0-9_.]{3,80}$")


def validate_password_strength(password: str) -> list[str]:
    """Return a list of human readable problems (empty means valid)."""
    errors = []
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long.")
    if not re.search(r"[A-Z]", password):
        errors.append("Password must contain an uppercase letter.")
    if not re.search(r"[a-z]", password):
        errors.append("Password must contain a lowercase letter.")
    if not re.search(r"\d", password):
        errors.append("Password must contain a digit.")
    if not re.search(r"[^A-Za-z0-9]", password):
        errors.append("Password must contain a special character.")
    return errors


def is_valid_username(username: str) -> bool:
    return bool(username and USERNAME_RE.match(username))


def normalise_email(email: str) -> str | None:
    """Return a normalised email or None if invalid."""
    try:
        result = validate_email(email, check_deliverability=False)
        return result.normalized.lower()
    except EmailNotValidError:
        return None
