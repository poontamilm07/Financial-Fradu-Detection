from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func, text
from datetime import datetime, timedelta
from extensions import db
from models.db_models import Transaction, User, Alert, FraudLog
from flask_jwt_extended import get_jwt_identity
from flask_jwt_extended import get_jwt



dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    claims = get_jwt()
    role = claims.get("role", "user")
    """Real-time dashboard statistics"""
    now = datetime.utcnow()
    today = now.date()
    current_user = get_jwt_identity()
    user_id = current_user   # ✅ FIX
    
    is_admin = role in ["admin", "analyst"]
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    query = Transaction.query
    if not is_admin:
        query = query.filter(Transaction.user_id == user_id)
    total_transactions = query.count()
    fraud_query = Transaction.query.filter(
        Transaction.is_fraud == True,
        Transaction.status.in_(["blocked", "flagged"])
    )
    if not is_admin:
        fraud_query = fraud_query.filter(Transaction.user_id == user_id)
    total_fraud = fraud_query.count()
    total_blocked = Transaction.query.filter_by(status='blocked').count()
    total_flagged = Transaction.query.filter_by(status='flagged').count()
    amount_query = db.session.query(func.sum(Transaction.amount))
    if not is_admin:
        amount_query = amount_query.filter(Transaction.user_id == user_id)
    total_amount = amount_query.scalar() or 0

    today_query = Transaction.query.filter(
        Transaction.transaction_date == today
    )
    if not is_admin:
        today_query = today_query.filter(Transaction.user_id == user_id)
    today_transactions = today_query.count()

    today_fraud_query = Transaction.query.filter(
        Transaction.transaction_date == today,
        Transaction.is_fraud == True, 
        Transaction.status.in_(["blocked", "flagged"])
    )
    if not is_admin:
        today_fraud_query = today_fraud_query.filter(Transaction.user_id == user_id)

    today_fraud = today_fraud_query.count()

    fraud_amount_query = db.session.query(
        func.sum(Transaction.amount)
    ).filter(
        Transaction.is_fraud == True,
        Transaction.status.in_(["blocked", "flagged"])
    )
    if not is_admin:
        fraud_amount_query = fraud_amount_query.filter(Transaction.user_id == user_id)

    fraud_amount = fraud_amount_query.scalar() or 0

   

    # Average risk score
    avg_risk = db.session.query(
        func.avg(Transaction.risk_score)
    ).scalar() or 0

    # Fraud rate
    fraud_rate = (total_fraud / total_transactions * 100) if total_transactions > 0 else 0

    return jsonify({
        'success': True,
        'data': {
            'total_transactions': total_transactions,
            'total_fraud': total_fraud,
            'total_blocked': total_blocked,
            'total_flagged': total_flagged,
            'today_transactions': today_transactions,
            'today_fraud': today_fraud,
            'total_amount': float(total_amount),
            'fraud_amount': float(fraud_amount),
            'avg_risk_score': round(float(avg_risk), 4),
            'fraud_rate': round(fraud_rate, 2),
            'total_users': User.query.filter_by(is_active=True).count(),
            'unread_alerts': Alert.query.filter_by(is_read=False).count()
        }
    })


@dashboard_bp.route('/charts/fraud-trend', methods=['GET'])
@jwt_required()
def fraud_trend():
    days = request.args.get('days', 30, type=int)

    result = db.session.query(
        func.date(Transaction.created_at).label('date'),   # ✅ FIX HERE
        func.count(Transaction.id).label('total'),
        func.sum(
            db.case((Transaction.is_fraud == True, 1), else_=0)
        ).label('fraud_count')
    ).group_by(
        func.date(Transaction.created_at)   # ✅ FIX HERE
    ).order_by(
        func.date(Transaction.created_at)
    ).all()

    return jsonify({
        'success': True,
        'trend': [
            {
                'date': str(r.date),
                'total': r.total,
                'fraud_count': int(r.fraud_count or 0)
            }
            for r in result
        ]
    })


@dashboard_bp.route('/charts/risk-distribution', methods=['GET'])
@jwt_required()
def risk_distribution():

    result = db.session.query(
        Transaction.risk_level,
        func.count(Transaction.id).label('count')
    ).filter(
        Transaction.risk_level != None   # ✅ IMPORTANT FIX
    ).group_by(
        Transaction.risk_level
    ).all()

    return jsonify({
        'success': True,
        'distribution': [
            {'risk_level': r.risk_level, 'count': r.count}
            for r in result
        ]
    })


@dashboard_bp.route('/charts/city-heatmap', methods=['GET'])
@jwt_required()
def city_heatmap():
    """City-wise fraud statistics"""
    result = db.session.query(
        Transaction.city,
        func.count(Transaction.id).label('total'),
        func.sum(
            db.case((Transaction.is_fraud == True, 1), else_=0)
        ).label('fraud_count'),
        func.avg(Transaction.risk_score).label('avg_risk')
    ).group_by(Transaction.city).order_by(
        func.count(Transaction.id).desc()
    ).limit(20).all()

    return jsonify({
        'success': True,
        'data': [
            {
                'city': r.city,
                'total': r.total,
                'fraud_count': int(r.fraud_count or 0),
                'avg_risk': round(float(r.avg_risk or 0), 4),
                'fraud_rate': round(
                    float(r.fraud_count or 0) / r.total * 100, 2
                ) if r.total > 0 else 0
            }
            for r in result
        ]
    })
@dashboard_bp.route('/user-risk', methods=['GET'])
@jwt_required()
def get_user_risk():
    user_id = get_jwt_identity()

    from models.db_models import RiskScore
    rs = RiskScore.query.filter_by(user_id=user_id).first()

    if not rs:
        return jsonify({"success": True, "data": None})

    return jsonify({
        "success": True,
        "data": {
            "risk_score": rs.overall_risk_score,
            "risk_level": rs.risk_level,
            "transactions": rs.transaction_count,
            "fraud_count": rs.fraud_count
        }
    })

@dashboard_bp.route('/charts/merchant-risk', methods=['GET'])
@jwt_required()
def merchant_risk():
    """Merchant category risk analysis"""
    result = db.session.query(
        Transaction.merchant_category,
        func.count(Transaction.id).label('total'),
        func.sum(
            db.case((Transaction.is_fraud == True, 1), else_=0)
        ).label('fraud_count'),
        func.avg(Transaction.risk_score).label('avg_risk')
    ).group_by(Transaction.merchant_category).all()

    return jsonify({
        'success': True,
        'data': [
            {
                'category': r.merchant_category,
                'total': r.total,
                'fraud_count': int(r.fraud_count or 0),
                'avg_risk': round(float(r.avg_risk or 0), 4)
            }
            for r in result
        ]
    })


@dashboard_bp.route('/recent-fraud', methods=['GET'])
@jwt_required()
def recent_fraud():
    """Recent fraud transactions for live feed"""
    limit = request.args.get('limit', 10, type=int)
    fraud_txns = Transaction.query.filter_by(
        is_fraud=True
    ).order_by(
        Transaction.created_at.desc()
    ).limit(limit).all()

    return jsonify({
        'success': True,
        'data': [t.to_dict() for t in fraud_txns]
    })


@dashboard_bp.route('/alerts', methods=['GET'])
@jwt_required()
def get_alerts():
    """Get system alerts"""
    limit = request.args.get('limit', 20, type=int)
    alerts = Alert.query.order_by(
        Alert.created_at.desc()
    ).limit(limit).all()

    return jsonify({
    'success': True,
    'alerts': [
        {
            "id": a.id,
            "message": a.alert_message,   # ✅ FIX HERE
            "severity": a.severity,
            "is_read": a.is_read,
            "created_at": str(a.created_at)
        }
        for a in alerts
    ]
})


@dashboard_bp.route('/alerts/<int:alert_id>/read', methods=['PUT'])
@jwt_required()
def mark_alert_read(alert_id):
    from models.db_models import Alert
    alert = Alert.query.get_or_404(alert_id)
    alert.is_read = True
    db.session.commit()
    return jsonify({'success': True, 'message': 'Alert marked as read'})