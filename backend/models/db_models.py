from datetime import datetime
from extensions import db


class Role(db.Model):
    __tablename__ = 'roles'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    users = db.relationship('User', backref='role', lazy=True)

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'description': self.description}


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'), default=3)
    full_name = db.Column(db.String(200))
    phone = db.Column(db.String(20))
    city = db.Column(db.String(100))
    country = db.Column(db.String(100), default='India')
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    otp_code = db.Column(db.String(10))
    otp_expires_at = db.Column(db.DateTime)
    reset_token = db.Column(db.String(255))
    reset_token_expires = db.Column(db.DateTime)
    last_login = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    transactions = db.relationship('Transaction', backref='user', lazy=True)
    alerts = db.relationship('Alert', backref='user', lazy=True)

    def to_dict(self, include_sensitive=False):
        data = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'phone': self.phone,
            'city': self.city,
            'country': self.country,
            'role': self.role.name if self.role else 'customer',
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        return data


class Transaction(db.Model):
    __tablename__ = 'transactions'
    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.String(100), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    merchant_name = db.Column(db.String(200))
    merchant_category = db.Column(db.String(100))
    transaction_type = db.Column(db.String(50))
    payment_method = db.Column(db.String(50))
    city = db.Column(db.String(100))
    country = db.Column(db.String(100), default='India')
    device_type = db.Column(db.String(50))
    ip_address = db.Column(db.String(50))
    status = db.Column(db.String(50), default='pending')
    risk_score = db.Column(db.Numeric(5, 4), default=0.0)
    risk_level = db.Column(db.String(20), default='low')
    is_fraud = db.Column(db.Boolean, default=False)
    fraud_reason = db.Column(db.Text)
    latitude = db.Column(db.Numeric(10, 8))
    longitude = db.Column(db.Numeric(11, 8))
    transaction_hour = db.Column(db.Integer)
    transaction_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    fraud_logs = db.relationship('FraudLog', backref='transaction', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'transaction_id': self.transaction_id,
            'user_id': self.user_id,
            'user': self.user.full_name if self.user else 'Unknown',
            'amount': float(self.amount),
            'merchant_name': self.merchant_name,
            'merchant_category': self.merchant_category,
            'transaction_type': self.transaction_type,
            'payment_method': self.payment_method,
            'city': self.city,
            'country': self.country,
            'device_type': self.device_type,
            'status': self.status,
            'risk_score': float(self.risk_score) if self.risk_score else 0.0,
            'risk_level': self.risk_level,
            'is_fraud': self.is_fraud,
            'fraud_reason': self.fraud_reason,
            'transaction_hour': self.transaction_hour,
            'transaction_date': self.transaction_date.isoformat() if self.transaction_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class FraudLog(db.Model):
    __tablename__ = 'fraud_logs'
    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.Integer, db.ForeignKey('transactions.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    fraud_score = db.Column(db.Numeric(5, 4))
    fraud_level = db.Column(db.String(20))
    ml_model_used = db.Column(db.String(100))
    shap_values = db.Column(db.JSON)
    lime_explanation = db.Column(db.JSON)
    feature_importance = db.Column(db.JSON)
    confidence_score = db.Column(db.Numeric(5, 4))
    flagged_by = db.Column(db.String(100), default='system')
    review_status = db.Column(db.String(50), default='pending')
    review_notes = db.Column(db.Text)
    action_taken = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'transaction_id': self.transaction_id,
            'user_id': self.user_id,
            'fraud_score': float(self.fraud_score) if self.fraud_score else 0.0,
            'fraud_level': self.fraud_level,
            'ml_model_used': self.ml_model_used,
            'shap_values': self.shap_values,
            'lime_explanation': self.lime_explanation,
            'feature_importance': self.feature_importance,
            'confidence_score': float(self.confidence_score) if self.confidence_score else 0.0,
            'review_status': self.review_status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Alert(db.Model):
    __tablename__ = 'alerts'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    transaction_id = db.Column(db.Integer, db.ForeignKey('transactions.id'))
    alert_type = db.Column(db.String(100))
    alert_message = db.Column(db.Text)
    severity = db.Column(db.String(20), default='medium')
    is_read = db.Column(db.Boolean, default=False)
    email_sent = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'transaction_id': self.transaction_id,
            'alert_type': self.alert_type,
            'alert_message': self.alert_message,
            'severity': self.severity,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class LoginHistory(db.Model):
    __tablename__ = 'login_history'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    ip_address = db.Column(db.String(50))
    device_info = db.Column(db.String(500))
    login_time = db.Column(db.DateTime, default=datetime.utcnow)
    logout_time = db.Column(db.DateTime)
    status = db.Column(db.String(20), default='success')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'ip_address': self.ip_address,
            'login_time': self.login_time.isoformat(),
            'status': self.status
        }


class RiskScore(db.Model):
    __tablename__ = 'risk_scores'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    overall_risk_score = db.Column(db.Numeric(5, 4), default=0.0)
    transaction_count = db.Column(db.Integer, default=0)
    fraud_count = db.Column(db.Integer, default=0)
    avg_amount = db.Column(db.Numeric(15, 2), default=0.0)
    risk_level = db.Column(db.String(20), default='low')
    behavioral_score = db.Column(db.Numeric(5, 4), default=0.0)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow) 
   


class Report(db.Model):
    __tablename__ = 'reports'

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id'),
        nullable=False
    )

    report_type = db.Column(db.String(100))

    generated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    content = db.Column(db.Text)

    status = db.Column(
        db.String(50),
        default='generated'
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'report_type': self.report_type,
            'generated_at': self.generated_at.isoformat(),
            'content': self.content,
            'status': self.status
        }