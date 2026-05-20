# ============================================================
# FILE: backend/services/fraud_service.py
# DESCRIPTION: Business logic for fraud detection & analysis
# ============================================================

from datetime import datetime, timedelta
from sqlalchemy import func, desc
from extensions import db
from models.db_models import (
    Transaction, FraudLog, Alert, User, RiskScore
)
from ml.prediction.predictor import predict_fraud
from ml.explainability.explainer import (
    get_shap_explanation, get_lime_explanation
)
from notifications.email_service import send_fraud_alert_email


# ─────────────────────────────────────────────
# Core: Analyze a transaction for fraud
# ─────────────────────────────────────────────
def analyze_transaction_fraud(txn: Transaction) -> dict:
    """
    Run full fraud analysis on a Transaction model instance.
    Saves FraudLog, creates Alert, sends email if needed.
    Returns a dict with prediction + explanations.
    """
    txn_data = {
        'amount':            float(txn.amount),
        'merchant_category': txn.merchant_category or 'other',
        'transaction_hour':  txn.transaction_hour or datetime.now().hour,
        'payment_method':    txn.payment_method or 'card',
        'device_type':       txn.device_type or 'mobile',
        'city':              txn.city or 'unknown',
        'transaction_type':  txn.transaction_type or 'debit',
    }

    # ── ML Prediction ──────────────────────────
    prediction  = predict_fraud(txn_data)
    shap_result = get_shap_explanation(txn_data)
    lime_result = get_lime_explanation(txn_data)

    fraud_score  = prediction.get('fraud_score', 0.0)
    risk_level   = prediction.get('risk_level', 'low')
    is_fraud     = prediction.get('is_fraud', False)
    confidence   = prediction.get('confidence', 0.0)

    # ── Update transaction ──────────────────────
    txn.risk_score = fraud_score
    txn.risk_level = risk_level
    txn.is_fraud   = is_fraud

    if is_fraud:
        txn.status       = 'flagged'
        txn.fraud_reason = _build_fraud_reason(prediction, shap_result)
    elif txn.status == 'pending':
        txn.status = 'approved'

    # ✅ CHECK IF LOG EXISTS
    fraud_log = FraudLog.query.filter_by(transaction_id=txn.id).first()
    if not fraud_log:
        fraud_log = FraudLog(
            transaction_id    = txn.id,
            user_id           = txn.user_id,
            fraud_score       = fraud_score,
            fraud_level       = risk_level,
            ml_model_used     = 'ensemble (RF + XGB + IsoForest)',
            shap_values       = shap_result.get('shap_values', {}),
            lime_explanation  = lime_result.get('lime_values', {}),
            feature_importance= shap_result.get('top_features', []),
            confidence_score  = confidence,
            flagged_by        = 'system_ai',
            review_status     = 'pending' if is_fraud else 'not_required',
        )
        db.session.add(fraud_log)
    else:
        # ✅ UPDATE EXISTING LOG
        fraud_log.fraud_score       = fraud_score
        fraud_log.fraud_level       = risk_level
        fraud_log.shap_values       = shap_result.get('shap_values', {})
        fraud_log.lime_explanation  = lime_result.get('lime_values', {})
        fraud_log.feature_importance= shap_result.get('top_features', [])
        fraud_log.confidence_score  = confidence
        db.session.add(fraud_log)

    # ── Create Alert ────────────────────────────
    if is_fraud or risk_level in ('high', 'critical'):
        severity = 'critical' if risk_level == 'critical' else \
                   'high'     if risk_level == 'high'     else 'medium'
        alert = Alert(
            user_id         = txn.user_id,
            transaction_id  = txn.id,
            alert_type      = 'fraud_detected' if is_fraud else 'high_risk',
            alert_message   = (
                f"{'🚨 Fraud' if is_fraud else '⚠️ High Risk'} transaction detected: "
                f"₹{float(txn.amount):,.2f} at {txn.merchant_name or 'Unknown'} "
                f"({risk_level.upper()} risk – {fraud_score * 100:.1f}%)"
            ),
            severity        = severity,
        )
        db.session.add(alert)

        # Send email alert
        user = User.query.get(txn.user_id)
        if user and user.email:
            try:
                send_fraud_alert_email(
                    user_email    = user.email,
                    user_name     = user.full_name or user.username,
                    transaction_data = {
                        'transaction_id': txn.transaction_id,
                        'amount':         float(txn.amount),
                        'merchant_name':  txn.merchant_name,
                        'city':           txn.city,
                    },
                    fraud_score = fraud_score,
                )
            except Exception:
                pass  # Do not block main flow for email failures

    db.session.commit()

    # ── Update user risk profile ─────────────────
    update_user_risk_profile(txn.user_id)

    return {
        'transaction':      txn.to_dict(),
        'prediction':       prediction,
        'shap_explanation': shap_result,
        'lime_explanation': lime_result,
        'fraud_log_id':     fraud_log.id,
    }


# ─────────────────────────────────────────────
# Update user risk profile after analysis
# ─────────────────────────────────────────────
def update_user_risk_profile(user_id: int) -> None:
    """Recalculate and persist the risk score for a user."""
    rows = db.session.query(
        func.count(Transaction.id).label('tx_count'),
        func.sum(db.case((Transaction.is_fraud == True, 1), else_=0)).label('fraud_count'),
        func.avg(Transaction.amount).label('avg_amount'),
        func.avg(Transaction.risk_score).label('avg_risk'),
    ).filter_by(user_id=user_id).one()

    tx_count    = rows.tx_count or 0
    fraud_count = int(rows.fraud_count or 0)
    avg_amount  = float(rows.avg_amount or 0)
    avg_risk    = float(rows.avg_risk or 0)

    fraud_ratio        = fraud_count / tx_count if tx_count else 0
    behavioral_score   = min((fraud_ratio * 0.6) + (avg_risk * 0.4), 1.0)
    overall_risk_score = round((avg_risk * 0.5) + (behavioral_score * 0.5), 4)
    risk_level         = _risk_level_from_score(overall_risk_score)

    rs = RiskScore.query.filter_by(user_id=user_id).first()
    if rs:
        rs.overall_risk_score = overall_risk_score
        rs.transaction_count  = tx_count
        rs.fraud_count        = fraud_count
        rs.avg_amount         = avg_amount
        rs.risk_level         = risk_level
        rs.behavioral_score   = behavioral_score
        rs.last_updated       = datetime.utcnow()
    else:
        rs = RiskScore(
            user_id            = user_id,
            overall_risk_score = overall_risk_score,
            transaction_count  = tx_count,
            fraud_count        = fraud_count,
            avg_amount         = avg_amount,
            risk_level         = risk_level,
            behavioral_score   = behavioral_score,
        )
        db.session.add(rs)

    db.session.commit()


# ─────────────────────────────────────────────
# Fraud statistics (for dashboard / chatbot)
# ─────────────────────────────────────────────
def get_fraud_statistics(days: int = 30) -> dict:
    """Return comprehensive fraud statistics for the last N days."""
    since = (datetime.utcnow() - timedelta(days=days)).date()

    base = Transaction.query.filter(Transaction.transaction_date >= since)

    total       = base.count()
    fraud_total = base.filter_by(is_fraud=True).count()
    blocked     = base.filter_by(status='blocked').count()
    flagged     = base.filter_by(status='flagged').count()

    total_amount = db.session.query(
        func.sum(Transaction.amount)
    ).filter(Transaction.transaction_date >= since).scalar() or 0

    fraud_amount = db.session.query(
        func.sum(Transaction.amount)
    ).filter(
        Transaction.transaction_date >= since,
        Transaction.is_fraud == True,
    ).scalar() or 0

    avg_risk = db.session.query(
        func.avg(Transaction.risk_score)
    ).filter(Transaction.transaction_date >= since).scalar() or 0

    # City breakdown
    city_rows = db.session.query(
        Transaction.city,
        func.count(Transaction.id).label('count'),
    ).filter(
        Transaction.transaction_date >= since,
        Transaction.is_fraud == True,
        Transaction.city.isnot(None),
    ).group_by(Transaction.city) \
     .order_by(func.count(Transaction.id).desc()) \
     .limit(5).all()

    # Category breakdown
    cat_rows = db.session.query(
        Transaction.merchant_category,
        func.count(Transaction.id).label('count'),
    ).filter(
        Transaction.transaction_date >= since,
        Transaction.is_fraud == True,
    ).group_by(Transaction.merchant_category) \
     .order_by(func.count(Transaction.id).desc()) \
     .limit(5).all()

    # Risk distribution
    risk_rows = db.session.query(
        Transaction.risk_level,
        func.count(Transaction.id).label('count'),
    ).filter(Transaction.transaction_date >= since) \
     .group_by(Transaction.risk_level).all()

    return {
        'period_days':     days,
        'total':           total,
        'fraud_count':     fraud_total,
        'blocked':         blocked,
        'flagged':         flagged,
        'fraud_rate':      round(fraud_total / total * 100, 2) if total else 0,
        'total_amount':    float(total_amount),
        'fraud_amount':    float(fraud_amount),
        'avg_risk_score':  round(float(avg_risk), 4),
        'top_fraud_cities': [
            {'city': r.city, 'count': r.count} for r in city_rows
        ],
        'top_fraud_categories': [
            {'category': r.merchant_category, 'count': r.count} for r in cat_rows
        ],
        'risk_distribution': [
            {'risk_level': r.risk_level, 'count': r.count} for r in risk_rows
        ],
    }


# ─────────────────────────────────────────────
# Bulk analyze transactions
# ─────────────────────────────────────────────
def bulk_analyze_transactions(transaction_ids: list) -> list:
    """Analyze a batch of transactions. Returns list of results."""
    results = []
    for tid in transaction_ids:
        txn = Transaction.query.get(tid)
        if not txn:
            results.append({'transaction_id': tid, 'error': 'Not found'})
            continue
        try:
            result = analyze_transaction_fraud(txn)
            results.append({
                'transaction_id': tid,
                'is_fraud':       result['prediction'].get('is_fraud', False),
                'fraud_score':    result['prediction'].get('fraud_score', 0),
                'risk_level':     result['prediction'].get('risk_level', 'low'),
            })
        except Exception as e:
            results.append({'transaction_id': tid, 'error': str(e)})

    return results


# ─────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────
def _build_fraud_reason(prediction: dict, shap_result: dict) -> str:
    reasons = []
    score = prediction.get('fraud_score', 0)
    reasons.append(f"AI fraud probability: {score * 100:.1f}%")

    top = shap_result.get('top_features', [])[:3]
    for f in top:
        if f.get('shap_value', 0) > 0:
            reasons.append(f"{f.get('display_name', f.get('feature', ''))}: high impact")

    return ' | '.join(reasons)


def _risk_level_from_score(score: float) -> str:
    if score < 0.25:
        return 'low'
    elif score < 0.50:
        return 'medium'
    elif score < 0.75:
        return 'high'
    return 'critical'