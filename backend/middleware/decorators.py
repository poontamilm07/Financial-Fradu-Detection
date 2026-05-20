from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt


def role_required(*allowed_roles):
    """
    Decorator factory for Role-Based Access Control.
    Usage:
        @role_required('admin')
        @role_required('admin', 'analyst')
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get('role', 'customer')
            
            if user_role not in allowed_roles:
                return jsonify({
                    'success': False,
                    'error': 'Access denied',
                    'message': f'Required roles: {list(allowed_roles)}. Your role: {user_role}',
                    'required_roles': list(allowed_roles),
                    'your_role': user_role
                }), 403
            
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def admin_required(fn):
    """Shortcut decorator for admin only"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get('role') != 'admin':
            return jsonify({'success': False, 'error': 'Admin access required'}), 403
        return fn(*args, **kwargs)
    return wrapper


def analyst_or_admin_required(fn):
    """Shortcut for admin or analyst"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get('role') not in ['admin', 'analyst']:
            return jsonify({'success': False, 'error': 'Analyst or Admin access required'}), 403
        return fn(*args, **kwargs)
    return wrapper