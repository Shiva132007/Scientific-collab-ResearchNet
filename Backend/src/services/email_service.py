import os
import smtplib
from email.message import EmailMessage

from fastapi import HTTPException


class EmailConfigurationError(RuntimeError):
    pass


def send_email(to_email: str, subject: str, body: str) -> bool:
    host = os.getenv("SMTP_HOST")
    username = os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("SMTP_FROM") or username

    if not host or not username or not password or not from_email:
        raise EmailConfigurationError(
            "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USERNAME, "
            "SMTP_PASSWORD, and SMTP_FROM in Backend/.env."
        )

    port = int(os.getenv("SMTP_PORT", "587"))
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

    message = EmailMessage()
    message["From"] = from_email
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(host, port, timeout=15) as server:
        if use_tls:
            server.starttls()
        server.login(username, password)
        server.send_message(message)

    return True


def email_http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, EmailConfigurationError):
        return HTTPException(status_code=500, detail=str(exc))

    if isinstance(exc, smtplib.SMTPAuthenticationError):
        return HTTPException(
            status_code=500,
            detail="SMTP authentication failed. Check SMTP_USERNAME and SMTP_PASSWORD in Backend/.env.",
        )

    return HTTPException(
        status_code=500,
        detail="Could not send OTP email. Check SMTP settings and network access.",
    )
