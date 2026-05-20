# ============================================================
# FILE: backend/routes/fraud.py
# DESCRIPTION: Fraud detection routes - analysis, logs, alerts
# ============================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime, timedelta
from sqlalchemy import func, desc
from extensions import db
from models.db_models import (
    Transaction, FraudLog, Alert, User, RiskScore
)
from middleware.decorators import analyst_or_admin_required, role_required
from ml.prediction.predictor import predict_fraud
from ml.explainability.explainer import (
    get_shap_explanation,
    get_lime_explanation,
    get_feature_importance
)
from services.fraud_service import (
    analyze_transaction_fraud,
    update_user_risk_profile,
    get_fraud_statistics,
    bulk_analyze_transactions
)
from notifications.email_service import send_fraud_alert_email

fraud_bp = Blueprint('fraud', __name__)


# ─────────────────────────────────────────────
# GET /api/fraud/logs  →  All fraud logs
# ─────────────────────────────────────────────
@fraud_bp.route('/logs', methods=['GET'])
@jwt_required()
def get_fraud_logs():
    page       = request.args.get('page', 1, type=int)
    per_page   = request.args.get('per_page', 20, type=int)
    fraud_level = request.args.get('fraud_level')
    date_from  = request.args.get('date_from')
    date_to    = request.args.get('date_to')
    review_status = request.args.get('review_status')

    query = FraudLog.query

    if fraud_level:
        query = query.filter_by(fraud_level=fraud_level)
    if review_status:
        query = query.filter_by(review_status=review_status)
    if date_from:
        query = query.filter(FraudLog.created_at >= date_from)
    if date_to:
        query = query.filter(FraudLog.created_at <= date_to)

    total  = query.count()
    result = query.order_by(desc(FraudLog.created_at)) \
                  .paginate(page=page, per_page=per_page, error_out=False)

    logs = []
    for log in result.items:
        log_dict = log.to_dict()
        log_dict['fraud_level'] = log.fraud_level or 'low'
        # Attach transaction info
        txn = Transaction.query.get(log.transaction_id)
        if txn:
            log_dict['transaction'] = {
                'transaction_id': txn.transaction_id,
                'amount':         float(txn.amount),
                'merchant_name':  txn.merchant_name,
                'city':           txn.city,
                'status':         txn.status,
            }
        logs.append(log_dict)

    return jsonify({
        'success': True,
        'logs':    logs,
        'total':   total,
        'pages':   result.pages,
        'current_page': page,
    })


# ─────────────────────────────────────────────
# GET /api/fraud/logs/<id>  →  Single log + explanation
# ─────────────────────────────────────────────
@fraud_bp.route('/logs/<int:log_id>', methods=['GET'])
@jwt_required()
def get_fraud_log(log_id):
    log = FraudLog.query.get_or_404(log_id)
    log_dict = log.to_dict()

    txn = Transaction.query.get(log.transaction_id)
    if txn:
        log_dict['transaction'] = txn.to_dict()
        user = User.query.get(txn.user_id)
        if user:
            log_dict['user'] = {
                'id':        user.id,
                'username':  user.username,
                'email':     user.email,
                'full_name': user.full_name,
                'city':      user.city,
            }

    return jsonify({'success': True, 'fraud_log': log_dict})


# ─────────────────────────────────────────────
# POST /api/fraud/analyze  →  Analyze a transaction
# ─────────────────────────────────────────────
@fraud_bp.route('/analyze', methods=['POST'])
@jwt_required()
def analyze_fraud():
    """
    Full fraud analysis: ML prediction + SHAP + LIME + risk profile update.
    Body: { transaction_id: int }
    """
    data = request.get_json()
    transaction_id = data.get('transaction_id')

    if not transaction_id:
        return jsonify({'success': False, 'error': 'transaction_id is required'}), 422

    txn = Transaction.query.get(transaction_id)
    if not txn:
        return jsonify({'success': False, 'error': 'Transaction not found'}), 404

    try:
        result = analyze_transaction_fraud(txn)
        return jsonify({'success': True, **result})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ─────────────────────────────────────────────
# GET /api/fraud/explain/<txn_id>  →  SHAP + LIME
# ─────────────────────────────────────────────
@fraud_bp.route('/explain/<int:transaction_id>', methods=['GET'])
@jwt_required()
def explain_fraud(transaction_id):
    txn = Transaction.query.get_or_404(transaction_id)

    txn_data = {
        'amount':               float(txn.amount),
        'merchant_category':    txn.merchant_category or 'other',
        'transaction_hour':     txn.transaction_hour or datetime.now().hour,
        'payment_method':       txn.payment_method or 'card',
        'device_type':          txn.device_type or 'mobile',
        'city':                 txn.city or 'unknown',
        'transaction_type':     txn.transaction_type or 'debit',
    }

    shap_result  = get_shap_explanation(txn_data)
    lime_result  = get_lime_explanation(txn_data)
    # ✅ USE STORED FRAUD LOG (SINGLE SOURCE OF TRUTH)
    log = FraudLog.query.filter_by(transaction_id=txn.id).first()
    prediction = {
        "fraud_score": log.fraud_score if log else 0,
        "risk_level": log.fraud_level if log else "low",
        "is_fraud": True if log and log.fraud_level in ["high", "critical"] else False,
        "confidence": log.confidence_score if log else 0
    }
    importance   = get_feature_importance()

    return jsonify({
        'success':          True,
        'transaction':      txn.to_dict(),
        'prediction':       prediction,
        'shap_explanation': shap_result,
        'lime_explanation': lime_result,
        'feature_importance': importance,
        'risk_summary': {
            'fraud_score':  prediction.get('fraud_score', 0),
            'risk_level':   prediction.get('risk_level', 'low'),
            'is_fraud':     prediction.get('is_fraud', False),
            'confidence':   prediction.get('confidence', 0),
        }
    })


# ─────────────────────────────────────────────
# GET /api/fraud/feature-importance
# ─────────────────────────────────────────────
@fraud_bp.route('/feature-importance', methods=['GET'])
@jwt_required()
def feature_importance():
    importance = get_feature_importance()
    return jsonify({'success': True, 'feature_importance': importance})


# ─────────────────────────────────────────────
# GET /api/fraud/statistics
# ─────────────────────────────────────────────
@fraud_bp.route('/statistics', methods=['GET'])
@jwt_required()
def fraud_statistics():
    days = request.args.get('days', 30, type=int)
    stats = get_fraud_statistics(days)
    return jsonify({'success': True, 'statistics': stats})


# ─────────────────────────────────────────────
# PUT /api/fraud/logs/<id>/review  →  Review a fraud log
# ─────────────────────────────────────────────
@fraud_bp.route('/logs/<int:log_id>/review', methods=['PUT'])
@jwt_required()
def review_fraud_log(log_id):
    log  = FraudLog.query.get_or_404(log_id)
    data = request.get_json()
    print("REVIEW DATA:", data)   # ✅ FIX 2
    print("USER:", get_jwt_identity())  # ✅ FIX 2

    review_status = data.get('status') or data.get('review_status')
    if not review_status:
        return jsonify({'success': False, 'error': 'Review status required'}), 400
    review_notes  = data.get('notes') or data.get('review_notes', '')
    action_taken  = data.get('action') or data.get('action_taken', '')

    allowed_statuses = ['pending', 'confirmed_fraud', 'false_positive', 'under_review']
    if review_status and review_status not in allowed_statuses:
        return jsonify({'success': False, 'error': f'Invalid status. Allowed: {allowed_statuses}'}), 422

    log.review_status  = review_status or log.review_status
    if review_status == 'confirmed_fraud':
        log.status = 'confirmed_fraud'

    elif review_status == 'false_positive':
        log.status = 'false_positive'
    log.review_notes   = review_notes
    log.action_taken   = action_taken
    log.reviewed_by    = int(get_jwt_identity())

    # Update transaction status accordingly
    txn = Transaction.query.get(log.transaction_id)
    if txn:
        if review_status == 'confirmed_fraud':
            txn.status   = 'blocked'
            txn.is_fraud = True
            fraud_count = Transaction.query.filter_by(
                user_id=txn.user_id,
                is_fraud=True
            ).count()
            if fraud_count >= 3:
                user = User.query.get(txn.user_id)
                user.is_active = False
        elif review_status == 'false_positive':
            txn.status   = 'approved'
            txn.is_fraud = False

    db.session.commit()

    return jsonify({
    'success': True,
    'message': 'Review updated successfully'
    }), 200


# ─────────────────────────────────────────────
# GET /api/fraud/alerts  →  All fraud alerts
# ─────────────────────────────────────────────
@fraud_bp.route('/alerts', methods=['GET'])
@jwt_required()
def get_fraud_alerts():
    claims   = get_jwt()
    user_id  = int(get_jwt_identity())
    role     = claims.get('role', 'customer')
    page     = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    severity = request.args.get('severity')
    is_read  = request.args.get('is_read')

    query = Alert.query
    if role == 'customer':
        query = query.filter_by(user_id=user_id)
    if severity:
        query = query.filter_by(severity=severity)
    if is_read is not None:
        query = query.filter_by(is_read=(is_read == 'true'))

    total  = query.count()
    result = query.order_by(desc(Alert.created_at)) \
                  .paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'success': True,
        'alerts':  [a.to_dict() for a in result.items],
        'total':   total,
        'pages':   result.pages,
    })


# ─────────────────────────────────────────────
# PUT /api/fraud/alerts/<id>/read
# ─────────────────────────────────────────────
@fraud_bp.route('/alerts/<int:alert_id>/read', methods=['PUT'])
@jwt_required()
def mark_alert_read(alert_id):
    alert = Alert.query.get_or_404(alert_id)
    alert.is_read = True
    db.session.commit()
    return jsonify({'success': True, 'message': 'Alert marked as read'})


# ─────────────────────────────────────────────
# PUT /api/fraud/alerts/read-all
# ─────────────────────────────────────────────
@fraud_bp.route('/alerts/read-all', methods=['PUT'])
@jwt_required()
def mark_all_alerts_read():
    user_id = int(get_jwt_identity())
    Alert.query.filter_by(user_id=user_id, is_read=False).update({'is_read': True})
    db.session.commit()
    return jsonify({'success': True, 'message': 'All alerts marked as read'})


# ─────────────────────────────────────────────
# GET /api/fraud/risk-profiles  →  User risk scores
# ─────────────────────────────────────────────
@fraud_bp.route('/risk-profiles', methods=['GET'])
@analyst_or_admin_required
def get_risk_profiles():
    page     = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    result = RiskScore.query \
        .order_by(desc(RiskScore.overall_risk_score)) \
        .paginate(page=page, per_page=per_page, error_out=False)

    profiles = []
    for rs in result.items:
        user = User.query.get(rs.user_id)
        profiles.append({
            'user_id':            rs.user_id,
            'username':           user.username if user else 'Unknown',
            'full_name':          user.full_name if user else '',
            'email':              user.email if user else '',
            'overall_risk_score': float(rs.overall_risk_score or 0),
            'transaction_count':  rs.transaction_count,
            'fraud_count':        rs.fraud_count,
            'avg_amount':         float(rs.avg_amount or 0),
            'risk_level':         rs.risk_level,
            'behavioral_score':   float(rs.behavioral_score or 0),
            'last_updated':       rs.last_updated.isoformat() if rs.last_updated else None,
        })

    return jsonify({
        'success':  True,
        'profiles': profiles,
        'total':    result.total,
        'pages':    result.pages,
    })


# ─────────────────────────────────────────────
# GET /api/fraud/risk-profiles/<user_id>
# ─────────────────────────────────────────────
@fraud_bp.route('/risk-profiles/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_risk_profile(user_id):
    claims       = get_jwt()
    current_role = claims.get('role', 'customer')
    current_uid  = int(get_jwt_identity())

    # Customers can only view their own profile
    if current_role == 'customer' and current_uid != user_id:
        return jsonify({'success': False, 'error': 'Access denied'}), 403

    rs   = RiskScore.query.filter_by(user_id=user_id).first()
    user = User.query.get_or_404(user_id)

    # Recent fraud transactions
    recent_fraud = Transaction.query \
        .filter_by(user_id=user_id, is_fraud=True) \
        .order_by(desc(Transaction.created_at)) \
        .limit(5).all()

    return jsonify({
        'success': True,
        'user':    user.to_dict(),
        'risk_profile': {
            'overall_risk_score': float(rs.overall_risk_score) if rs else 0.0,
            'transaction_count':  rs.transaction_count if rs else 0,
            'fraud_count':        rs.fraud_count if rs else 0,
            'avg_amount':         float(rs.avg_amount) if rs else 0.0,
            'risk_level':         rs.risk_level if rs else 'low',
            'behavioral_score':   float(rs.behavioral_score) if rs else 0.0,
            'last_updated':       rs.last_updated.isoformat() if rs and rs.last_updated else None,
        } if rs else None,
        'recent_fraud_transactions': [t.to_dict() for t in recent_fraud],
    })


# ─────────────────────────────────────────────
# POST /api/fraud/bulk-analyze  →  Analyze multiple transactions
# ─────────────────────────────────────────────
@fraud_bp.route('/bulk-analyze', methods=['POST'])
@analyst_or_admin_required
def bulk_analyze():
    data            = request.get_json()
    transaction_ids = data.get('transaction_ids', [])

    if not transaction_ids:
        return jsonify({'success': False, 'error': 'transaction_ids list is required'}), 422
    if len(transaction_ids) > 100:
        return jsonify({'success': False, 'error': 'Maximum 100 transactions per bulk request'}), 422

    try:
        results = bulk_analyze_transactions(transaction_ids)
        return jsonify({
            'success':         True,
            'analyzed_count':  len(results),
            'results':         results,
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ─────────────────────────────────────────────
# GET /api/fraud/heatmap  →  City-level fraud data
# ─────────────────────────────────────────────
@fraud_bp.route('/heatmap', methods=['GET'])
@jwt_required()
def get_fraud_heatmap():
    days = request.args.get('days', 30, type=int)
    since = datetime.utcnow() - timedelta(days=days)

    rows = db.session.query(
        Transaction.city,
        Transaction.latitude,
        Transaction.longitude,
        func.count(Transaction.id).label('total'),
        func.sum(db.case((Transaction.is_fraud == True, 1), else_=0)).label('fraud_count'),
        func.avg(Transaction.risk_score).label('avg_risk'),
        func.sum(Transaction.amount).label('total_amount'),
    ).filter(
        Transaction.created_at >= since,
        Transaction.city.isnot(None),
    ).group_by(
        Transaction.city,
        Transaction.latitude,
        Transaction.longitude,
    ).order_by(
        func.sum(db.case((Transaction.is_fraud == True, 1), else_=0)).desc()
    ).limit(50).all()

    heatmap = []
    for r in rows:
        total = r.total or 1
        heatmap.append({
            'city':         r.city,
            'latitude':     float(r.latitude) if r.latitude else None,
            'longitude':    float(r.longitude) if r.longitude else None,
            'total':        r.total,
            'fraud_count':  int(r.fraud_count or 0),
            'fraud_rate':   round(float(r.fraud_count or 0) / total * 100, 2),
            'avg_risk':     round(float(r.avg_risk or 0), 4),
            'total_amount': float(r.total_amount or 0),
        })

    return jsonify({'success': True, 'heatmap': heatmap})


# ─────────────────────────────────────────────
# GET /api/fraud/trends  →  Daily fraud trend
# ─────────────────────────────────────────────
@fraud_bp.route('/trends', methods=['GET'])
@jwt_required()
def fraud_trends():
    days  = request.args.get('days', 30, type=int)
    since = (datetime.utcnow() - timedelta(days=days)).date()

    rows = db.session.query(
        Transaction.transaction_date,
        func.count(Transaction.id).label('total'),
        func.sum(db.case((Transaction.is_fraud == True, 1), else_=0)).label('fraud_count'),
        func.avg(Transaction.risk_score).label('avg_risk'),
        func.sum(Transaction.amount).label('total_amount'),
    ).filter(
        Transaction.transaction_date >= since,
    ).group_by(Transaction.transaction_date) \
     .order_by(Transaction.transaction_date).all()

    return jsonify({
        'success': True,
        'trends': [
            {
                'date':         str(r.transaction_date),
                'total':        r.total,
                'fraud_count':  int(r.fraud_count or 0),
                'avg_risk':     round(float(r.avg_risk or 0), 4),
                'total_amount': float(r.total_amount or 0),
                'fraud_rate':   round(float(r.fraud_count or 0) / (r.total or 1) * 100, 2),
            }
            for r in rows
        ],
    })


# ─────────────────────────────────────────────
# DELETE /api/fraud/alerts/<id>
# ─────────────────────────────────────────────
# ─────────────────────────────────────────────
# GET /api/fraud/seed  →  Insert sample data
# ─────────────────────────────────────────────
@fraud_bp.route('/seed', methods=['GET'])
def seed_data():
    from models.db_models import Transaction, FraudLog
    import random
    from datetime import datetime
    from extensions import db

    cities = ["Chennai", "Salem", "Coimbatore", "Bangalore", "Hyderabad"]

    for i in range(10):
        txn = Transaction(
    transaction_id=f"TXN{random.randint(10000,99999)}",   # ✅ REQUIRED
    user_id=1,                                            # ✅ REQUIRED (use existing user)
    amount=random.randint(500, 10000),
    merchant_name="Amazon",
    merchant_category="shopping",
    transaction_type="debit",
    payment_method="card",
    city=random.choice(cities),
    country="India",
    device_type="mobile",
    ip_address="127.0.0.1",
    status="completed",
    risk_score=random.uniform(0.2, 0.95),
    risk_level="low",
    is_fraud=random.choice([True, False]),
    fraud_reason="test",
    latitude=13.0827,
    longitude=80.2707,
    transaction_hour=10,
    transaction_date=datetime.utcnow().date(),
    created_at=datetime.utcnow(),
    updated_at=datetime.utcnow()
)

        db.session.add(txn)
        db.session.flush()  # get txn.id

        log = FraudLog(
            transaction_id=txn.id,
            fraud_level="high",
            review_status="pending",
            created_at=datetime.utcnow()
        )

        db.session.add(log)

    db.session.commit()

    return {"message": "Sample fraud data inserted"}
@fraud_bp.route('/alerts/<int:alert_id>', methods=['DELETE'])
@analyst_or_admin_required
def delete_alert(alert_id):
    alert = Alert.query.get_or_404(alert_id)
    db.session.delete(alert)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Alert deleted'})

@fraud_bp.route('/predict', methods=['POST'])
@jwt_required()
def predict():
    data = request.get_json()

    # Dummy AI logic (replace later with ML model)
    amount = float(data.get("amount", 0))

    if amount > 50000:
        risk_level = "high"
        fraud_score = 0.9
    elif amount > 10000:
        risk_level = "medium"
        fraud_score = 0.6
    else:
        risk_level = "low"
        fraud_score = 0.2

    return jsonify({
        "risk_level": risk_level,
        "fraud_score": fraud_score
    })