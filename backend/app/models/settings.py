"""Key/value system settings (e.g. exam eligibility threshold)."""
from app.extensions import db


class SystemSetting(db.Model):
    __tablename__ = "system_settings"

    key = db.Column(db.String(80), primary_key=True)
    value = db.Column(db.String(255), nullable=False)

    @staticmethod
    def get(key: str, default=None):
        row = db.session.get(SystemSetting, key)
        return row.value if row else default

    @staticmethod
    def set(key: str, value) -> None:
        row = db.session.get(SystemSetting, key)
        if row:
            row.value = str(value)
        else:
            db.session.add(SystemSetting(key=key, value=str(value)))
