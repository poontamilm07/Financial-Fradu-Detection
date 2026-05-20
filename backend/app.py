import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from config import Config
from extensions import db, jwt, mail, socketio
from routes.fraud import fraud_bp
load_dotenv()


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    
    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    CORS(
    app,
    resources={
        r"/api/*": {
            "origins": ["http://localhost:5173"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Authorization", "Content-Type"]
        }
    },
    supports_credentials=True   # ✅ MOVE HERE
)
    socketio.init_app(
        app,
        cors_allowed_origins="*",
        async_mode='eventlet',
        logger=False,
        engineio_logger=False
    )

    # Register blueprints
    from routes.auth import auth_bp
    from routes.transactions import transactions_bp
    from routes.dashboard import dashboard_bp
    from routes.chatbot import chatbot_bp
    from routes.reports import reports_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(transactions_bp, url_prefix='/api/transactions')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(chatbot_bp, url_prefix='/api/chatbot')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    app.register_blueprint(fraud_bp, url_prefix='/api/fraud')
    

    # JWT Error Handlers
    @jwt.unauthorized_loader
    def missing_token(reason):
        return jsonify({'success': False, 'error': 'Authorization token missing', 'reason': reason}), 401

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return jsonify({'success': False, 'error': 'Invalid token', 'reason': reason}), 422

    @jwt.expired_token_loader
    def expired_token(header, payload):
        return jsonify({'success': False, 'error': 'Token has expired'}), 401

    # Global error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'success': False, 'error': 'Resource not found'}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({'success': False, 'error': 'Method not allowed'}), 405

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

    # Health check
    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({
            'status': 'healthy',
            'service': 'AI Fraud Detection System',
            'version': '2.0.0'
        })

    # WebSocket events
    @socketio.on('connect')
    def handle_connect():
        print(f'Client connected')
        socketio.emit('connected', {'status': 'Connected to Fraud Detection System'})

    @socketio.on('disconnect')
    def handle_disconnect():
        print('Client disconnected')

    @socketio.on('subscribe_fraud_alerts')
    def handle_subscribe(data):
        socketio.emit('subscribed', {'status': 'Subscribed to fraud alerts'})

    # Create tables
    with app.app_context():
        db.create_all()
        print("✅ Database tables created/verified")

    return app


app = create_app()

if __name__ == '__main__':
    print("🚀 Starting AI Financial Fraud Detection System...")
    print("📡 Backend: http://localhost:5000")
    print("🔌 WebSocket: ws://localhost:5000")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)