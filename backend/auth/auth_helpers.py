
import random
import string
from datetime import datetime, timedelta
from flask_jwt_extended import create_access_token, create_refresh_token
from werkzeug.security import generate_password_hash, check_password_hash

def hash_password(password: str) -> str:
    return generate_password_hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return check_password_hash(hashed, password)


def generate_tokens(user_id: int, role: str, email: str) -> dict:
    """Generate JWT access and refresh tokens with role claim"""
    additional_claims = {
        'role': role,
        'email': email
    }
    access_token = create_access_token(
        identity=str(user_id),
        additional_claims=additional_claims
    )
    refresh_token = create_refresh_token(
        identity=str(user_id),
        additional_claims=additional_claims
    )
    return {
        'access_token': access_token,
        'refresh_token': refresh_token
    }


def generate_otp(length: int = 6) -> str:
    """Generate numeric OTP"""
    return ''.join(random.choices(string.digits, k=length))


def generate_reset_token(length: int = 32) -> str:
    """Generate secure reset token"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))


def otp_expiry(minutes: int = 10) -> datetime:
    """Return OTP expiry datetime"""
    return datetime.utcnow() + timedelta(minutes=minutes)


def is_otp_valid(otp_code: str, stored_otp: str, expires_at: datetime) -> bool:
    """Check if OTP is valid and not expired"""
    if not otp_code or not stored_otp or not expires_at:
        return False
    if otp_code != stored_otp:
        return False
    if datetime.utcnow() > expires_at:
        return False
    return True


def validate_password_strength(password: str) -> tuple:
    """Validate password strength. Returns (is_valid, message)"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number"
    return True, "Password is strong"