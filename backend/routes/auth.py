from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    jwt_required, get_jwt_identity, get_jwt, create_access_token
)
from datetime import datetime
from extensions import db
from datetime import datetime, timedelta
from sqlalchemy import text
from models.db_models import User, Role, LoginHistory
from auth.auth_helpers import (
    hash_password, verify_password, generate_tokens,
    generate_otp, otp_expiry, is_otp_valid,
    generate_reset_token, validate_password_strength
)
from notifications.email_service import (
    send_otp_email, send_password_reset_email
)
import os

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    import random

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400

    email = data.get('email')
    username = data.get('username')
    password = data.get('password')
    full_name = data.get('full_name')

    
   
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400

    required = ['username', 'email', 'password', 'full_name']
    for field in required:
        if not data.get(field):
            return jsonify({'success': False, 'error': f'{field} is required'}), 422

    # Validate password
    is_valid, msg = validate_password_strength(data['password'])
    if not is_valid:
        return jsonify({'success': False, 'error': msg}), 422

    # Check existing
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'success': False, 'error': 'Email already registered'}), 409
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'success': False, 'error': 'Username already taken'}), 409

    # Get role (default: customer)
    user_role = Role.query.filter_by(name='user').first()
    role_id = user_role.id if user_role else 3

    # Generate OTP
    otp = generate_otp()

    user = User(
        username=data['username'],
        email=data['email'],
        password_hash=hash_password(data['password']),
        full_name=data['full_name'],
        phone=data.get('phone', ''),
        city=data.get('city', ''),
        role_id=role_id,
        otp_code=otp,
        otp_expires_at = datetime.utcnow() + timedelta(minutes=5)
    )
    db.session.add(user)
    db.session.commit()

    # Send OTP email
    send_otp_email(user.email, user.full_name, otp)

    return jsonify({
        'success': True,
        'message': 'Registration successful. Check your email for OTP verification.',
        'user_id': user.id
    }), 201


@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email')).first()

    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    if not is_otp_valid(data.get('otp'), user.otp_code, user.otp_expires_at):
        return jsonify({'success': False, 'error': 'Invalid or expired OTP'}), 400

    user.is_verified = True
    user.otp_code = None
    user.otp_expires_at = None
    db.session.commit()

    return jsonify({'success': True, 'message': 'Email verified successfully'})


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400

    email = data.get('email', '').strip()
    password = data.get('password', '')

    user = User.query.filter_by(email=email).first()
    if not user or not verify_password(password, user.password_hash):
        return jsonify({'success': False, 'error': 'Invalid email or password'}), 401

    if not user.is_active:
        return jsonify({'success': False, 'error': 'Account is deactivated'}), 403

    # Update last login
    user.last_login = datetime.utcnow()
    db.session.commit()

    # Log login history
    history = LoginHistory(
        user_id=user.id,
        ip_address=request.remote_addr,
        device_info=request.headers.get('User-Agent', '')[:500],
        status='success'
    )
    db.session.add(history)
    db.session.commit()

    role_name = user.role.name if user.role else 'user'
    tokens = generate_tokens(user.id, role_name, user.email)

    return jsonify({
        'success': True,
        'message': 'Login successful',
        'access_token': tokens['access_token'],
        'refresh_token': tokens['refresh_token'],
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': user.full_name,
            'role': role_name,
            'is_verified': user.is_verified
        }
    })


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    claims = get_jwt()
    new_token = create_access_token(
        identity=identity,
        additional_claims={'role': claims.get('role'), 'email': claims.get('email')}
    )
    return jsonify({'success': True, 'access_token': new_token})


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    return jsonify({'success': True, 'user': user.to_dict()})


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email', '')).first()

    if not user:
        return jsonify({'success': True, 'message': 'If email exists, reset link sent'})

    token = generate_reset_token()
    from datetime import timedelta
    user.reset_token = token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    db.session.commit()

    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    send_password_reset_email(user.email, user.full_name, token, frontend_url)

    return jsonify({'success': True, 'message': 'Password reset link sent to your email'})


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token', '')
    new_password = data.get('password', '')

    user = User.query.filter_by(reset_token=token).first()
    if not user or not user.reset_token_expires:
        return jsonify({'success': False, 'error': 'Invalid or expired token'}), 400

    if datetime.utcnow() > user.reset_token_expires:
        return jsonify({'success': False, 'error': 'Reset token has expired'}), 400

    is_valid, msg = validate_password_strength(new_password)
    if not is_valid:
        return jsonify({'success': False, 'error': msg}), 422

    user.password_hash = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.session.commit()

    return jsonify({'success': True, 'message': 'Password reset successful'})


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    return jsonify({'success': True, 'message': 'Logged out successfully'})