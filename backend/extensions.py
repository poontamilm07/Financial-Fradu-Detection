# ============================================================
# FILE: backend/extensions.py
# DESCRIPTION: Shared Flask extension instances (no circular imports)
# ============================================================

from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_cors import CORS
from flask_socketio import SocketIO

# Instantiate extensions — do NOT call init_app here.
# init_app() is called in create_app() inside app.py.

db       = SQLAlchemy()
jwt      = JWTManager()
mail     = Mail()
cors     = CORS()
socketio = SocketIO()