"""QR code generation utilities."""
import base64
import io

import qrcode


def generate_qr_data_uri(data: str) -> str:
    """Return a base64 PNG data URI for the given string."""
    img = qrcode.make(data)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def generate_qr_png_bytes(data: str) -> bytes:
    img = qrcode.make(data)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()
