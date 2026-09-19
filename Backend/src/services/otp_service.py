import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.auth_otp import AuthOTP
from models.user import User
from services.email_service import email_http_error, send_email

EMAIL_VERIFICATION = "email_verification"
LOGIN = "login"


def _otp_secret() -> str:
    return os.getenv("OTP_SECRET") or os.getenv("SECRET_KEY") or "dev-otp-secret"


def _hash_otp(otp: str) -> str:
    return hmac.new(_otp_secret().encode(), otp.encode(), hashlib.sha256).hexdigest()


def _new_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def create_and_send_otp(db: Session, user: User, purpose: str) -> dict:
    otp = _new_otp()
    expires_at = _utcnow() + timedelta(minutes=int(os.getenv("OTP_EXPIRE_MINUTES", "10")))

    db.query(AuthOTP).filter(
        AuthOTP.user_id == user.id,
        AuthOTP.purpose == purpose,
        AuthOTP.consumed_at.is_(None),
    ).update({"consumed_at": _utcnow()})

    challenge = AuthOTP(
        user_id=user.id,
        purpose=purpose,
        otp_hash=_hash_otp(otp),
        expires_at=expires_at,
    )
    db.add(challenge)
    db.commit()

    subject = "Verify your email" if purpose == EMAIL_VERIFICATION else "Your login OTP"
    body = (
        f"Your ResearchNet OTP is {otp}.\n\n"
        f"It expires in {os.getenv('OTP_EXPIRE_MINUTES', '10')} minutes."
    )
    try:
        send_email(user.email, subject, body)
    except Exception as exc:
        challenge.consumed_at = _utcnow()
        db.commit()
        raise email_http_error(exc) from exc

    response = {
        "message": "OTP sent to your email.",
        "otp_required": True,
    }
    return response


def verify_otp(db: Session, user: User, purpose: str, otp: str) -> None:
    challenge = db.query(AuthOTP).filter(
        AuthOTP.user_id == user.id,
        AuthOTP.purpose == purpose,
        AuthOTP.consumed_at.is_(None),
    ).order_by(AuthOTP.created_at.desc()).first()

    if not challenge:
        raise HTTPException(status_code=400, detail="No active OTP found. Request a new OTP.")

    expires_at = challenge.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < _utcnow():
        challenge.consumed_at = _utcnow()
        db.commit()
        raise HTTPException(status_code=400, detail="OTP expired. Request a new OTP.")

    if challenge.attempts >= int(os.getenv("OTP_MAX_ATTEMPTS", "5")):
        challenge.consumed_at = _utcnow()
        db.commit()
        raise HTTPException(status_code=400, detail="Too many OTP attempts. Request a new OTP.")

    if not hmac.compare_digest(challenge.otp_hash, _hash_otp(otp.strip())):
        challenge.attempts += 1
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid OTP.")

    challenge.consumed_at = _utcnow()
    db.commit()
