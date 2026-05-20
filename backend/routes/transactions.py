from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime, date
from extensions import db
from models.db_models import FraudLog
from models.db_models import Transaction, User, Alert
from middleware.decorators import role_required, analyst_or_admin_required
from ml.prediction.predictor import predict_fraud
from ml.explainability.explainer import get_shap_explanation, get_lime_explanation
from notifications.email_service import send_fraud_alert_email
import uuid

transactions_bp = Blueprint('transactions', __name__)


@transactions_bp.route('/', methods=['GET'])
@jwt_required()
def get_transactions():
    claims = get_jwt()
    user_id = int(get_jwt_identity())
    role = claims.get('role', 'customer')

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    # Filters
    status = request.args.get('status')
    risk_level = request.args.get('risk_level')
    city = request.args.get('city')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    search = request.args.get('search')
    is_fraud = request.args.get('is_fraud')

    query = Transaction.query

    # Role-based filtering
    if role == 'customer':
        query = query.filter_by(user_id=user_id)

    if status:
        query = query.filter_by(status=status)
    if risk_level:
        query = query.filter_by(risk_level=risk_level)
    if city:
        query = query.filter(Transaction.city.ilike(f'%{city}%'))
    if date_from:
        query = query.filter(Transaction.transaction_date >= date_from)
    if date_to:
        query = query.filter(Transaction.transaction_date <= date_to)
    if search:
        query = query.filter(
            Transaction.transaction_id.ilike(f'%{search}%') |
            Transaction.merchant_name.ilike(f'%{search}%')
        )
    if is_fraud is not None:
        query = query.filter(Transaction.is_fraud == (is_fraud == 'true'))

    total = query.count()
    transactions = query.order_by(
        Transaction.created_at.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'success': True,
        'transactions': [t.to_dict() for t in transactions.items],
        'total': total,
        'pages': transactions.pages,
        'current_page': page,
        'per_page': per_page
    })


@transactions_bp.route('/<int:txn_id>', methods=['GET'])
@jwt_required()
def get_transaction(txn_id):
    txn = Transaction.query.get_or_404(txn_id)
    return jsonify({'success': True, 'transaction': txn.to_dict()})


@transactions_bp.route('/', methods=['POST'])
@jwt_required()
def create_transaction():
    data = request.get_json()
    user_id = int(get_jwt_identity())

    required = ['amount', 'merchant_name']
    for field in required:
        if not data.get(field):
            return jsonify({'success': False, 'error': f'{field} is required'}), 422

    try:
        amount = float(data['amount'])
    except (ValueError, TypeError):
        return jsonify({'success': False, 'error': 'Invalid amount'}), 422

    now = datetime.utcnow()
    txn = Transaction(
        transaction_id=data.get('transaction_id', f'TXN{str(uuid.uuid4()).replace("-", "")[:16].upper()}'),
        user_id=user_id,
        amount=amount,
        merchant_name=data.get('merchant_name'),
        merchant_category=data.get('merchant_category', 'other'),
        transaction_type=data.get('transaction_type', 'debit'),
        payment_method=data.get('payment_method', 'card'),
        city=data.get('city', 'Unknown'),
        device_type=data.get('device_type', 'mobile'),
        ip_address=request.remote_addr,
        transaction_hour=now.hour,
        transaction_date=now.date(),
        status='pending'
    )

    db.session.add(txn)
    db.session.flush()  # Get txn.id before ML

    # Run ML prediction
    prediction = predict_fraud({
        'amount': amount,
        'merchant_category': txn.merchant_category,
        'transaction_hour': now.hour,
        'payment_method': txn.payment_method,
        'device_type': txn.device_type,
        'city': txn.city,
        'transaction_type': txn.transaction_type
    })

    # 🔥 INDUSTRY-LEVEL FRAUD LOGIC

    risk_score = prediction['fraud_score']  # base ML score (0–1)

    # --- Rule 1: High Amount ---
    if amount >= 50000:
        risk_score += 0.3

    # --- Rule 2: Risky Merchant Category ---
    if txn.merchant_category in ["gambling", "crypto", "betting"]:
        risk_score += 0.25

    # --- Rule 3: New / Suspicious Device ---
    if txn.device_type == "new":
        risk_score += 0.2

    # --- Rule 4: Unusual City ---
    if txn.city not in ["chennai", "bangalore", "mumbai"]:
        risk_score += 0.15

    # --- Rule 5: Odd Transaction Time ---
    if txn.transaction_hour < 6 or txn.transaction_hour > 23:
        risk_score += 0.1

    # --- Normalize ---
    risk_score = min(risk_score, 1.0)

    # --- Final Decision ---
    if risk_score >= 0.75:
        txn.risk_level = "high"
        txn.is_fraud = True
    elif risk_score >= 0.5:
        txn.risk_level = "medium"
        txn.is_fraud = True
    else:
        txn.risk_level = "low"
        txn.is_fraud = False

    

    

    # 🚫 AUTO BLOCK HIGH RISK
    if txn.risk_level == "high":
        txn.status = "blocked"
    else:
        txn.status = "flagged" if txn.is_fraud else "approved"

    # 🚨 ALERT ONLY (NO STATUS CHANGE)
    # 🚨 ALERT ONLY (ONLY FOR FRAUD)
    if txn.is_fraud:
        txn.fraud_reason = f"AI detected fraud with {prediction['fraud_score']*100:.1f}% probability"

        user = User.query.get(user_id)
        if user:
            send_fraud_alert_email(
                user.email, user.full_name,
                {
                    'transaction_id': txn.transaction_id,
                    'amount': amount,
                    'merchant_name': txn.merchant_name,
                    'city': txn.city
                },
                prediction['fraud_score']
            )
        alert = Alert(
            user_id=user_id,
            transaction_id=txn.id,
            alert_type='fraud_detected',
            alert_message=f"Fraudulent transaction detected: ₹{amount:,.2f} at {txn.merchant_name}",
            severity='critical' if txn.risk_level == 'high' else 'high'
        )
        db.session.add(alert)
        # ✅ ADD THIS (VERY IMPORTANT)
        fraud_log = FraudLog(
             transaction_id=txn.id,
             user_id=user_id,  # ✅ FIX (VERY IMPORTANT)
             fraud_score=prediction['fraud_score'],  # optional but good
             fraud_level=txn.risk_level,
             flagged_by="system",
             review_status="pending",
             created_at=datetime.utcnow()
        )

        db.session.add(fraud_log)

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Transaction created and analyzed',
        'transaction': txn.to_dict(),
        'fraud_analysis': prediction
    }), 201


@transactions_bp.route('/<int:txn_id>', methods=['PUT'])
@analyst_or_admin_required
def update_transaction(txn_id):
    txn = Transaction.query.get_or_404(txn_id)
    data = request.get_json()

    updatable = ['status', 'merchant_name', 'merchant_category', 'city',
                 'amount', 'payment_method', 'transaction_type']
    for field in updatable:
        if field in data:
            setattr(txn, field, data[field])

    txn.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({'success': True, 'message': 'Transaction updated', 'transaction': txn.to_dict()})


@transactions_bp.route('/<int:txn_id>', methods=['DELETE'])
@role_required('super_admin')
def delete_transaction(txn_id):
    txn = Transaction.query.get_or_404(txn_id)
    db.session.delete(txn)
    db.session.commit()
    return jsonify({'success': True, 'message': f'Transaction {txn_id} deleted'})


@transactions_bp.route('/<int:txn_id>/analyze', methods=['GET'])
@jwt_required()
def analyze_transaction(txn_id):
    """Get full AI analysis: prediction + SHAP + LIME"""
    txn = Transaction.query.get_or_404(txn_id)

    txn_data = {
        'amount': float(txn.amount),
        'merchant_category': txn.merchant_category,
        'transaction_hour': txn.transaction_hour,
        'payment_method': txn.payment_method,
        'device_type': txn.device_type,
        'city': txn.city,
        'transaction_type': txn.transaction_type
    }

    prediction = predict_fraud(txn_data)

    shap_result = get_shap_explanation(txn_data)
    lime_result = get_lime_explanation(txn_data)
    # 🔥 APPLY SAME INDUSTRY RULES (VERY IMPORTANT)

    risk_score = prediction['fraud_score']

    # Rule 1
    if txn.amount >= 50000:
        risk_score += 0.3

    # Rule 2
    if txn.merchant_category in ["gambling", "crypto", "betting"]:
        risk_score += 0.25

    # Rule 3
    if txn.device_type == "new":
        risk_score += 0.2

    # Rule 4
    if txn.city not in ["chennai", "bangalore", "mumbai"]:
        risk_score += 0.15

    # Rule 5
    if txn.transaction_hour < 6 or txn.transaction_hour > 23:
        risk_score += 0.1

    risk_score = min(risk_score, 1.0)

    # Final decision
    if risk_score >= 0.75:
        prediction['is_fraud'] = True
        prediction['risk_level'] = "high"
    elif risk_score >= 0.5:
        prediction['is_fraud'] = True
        prediction['risk_level'] = "medium"
    else:
        prediction['is_fraud'] = False
        prediction['risk_level'] = "low"

    prediction['fraud_score'] = risk_score

    return jsonify({
        'success': True,
        'transaction': txn.to_dict(),
        'prediction': prediction,
        'shap_explanation': shap_result,
        'lime_explanation': lime_result
    })
@transactions_bp.route('/pre-check', methods=['POST'])
@jwt_required()
def pre_check_transaction():
    data = request.get_json()

    prediction = predict_fraud({
        'amount': float(data.get('amount', 0)),
        'merchant_category': data.get('merchant_category', 'other'),
        'transaction_hour': datetime.utcnow().hour,
        'payment_method': data.get('payment_method', 'card'),
        'device_type': data.get('device_type', 'mobile'),
        'city': data.get('city', 'unknown'),
        'transaction_type': data.get('transaction_type', 'debit')
    })

    return jsonify({
        "success": True,
        "prediction": prediction
    })
@transactions_bp.route('/admin/transactions/<string:txn_id>/override', methods=['PUT'])
@jwt_required()
def override_transaction(txn_id):

    txn = Transaction.query.filter_by(transaction_id=txn_id).first_or_404()
    data = request.get_json()
    new_status = data.get("status")

    if new_status not in ["approved", "blocked", "under_investigation"]:
        return jsonify({"error": "Invalid status"}), 400

    # ✅ UPDATE TRANSACTION
    txn.status = new_status

    if new_status == "blocked":
        txn.is_fraud = True
    elif new_status == "approved":
        txn.is_fraud = False

    # ✅ 🔥 SYNC FRAUD LOG
    fraud_log = FraudLog.query.filter_by(transaction_id=txn.id).first()
    if fraud_log:
        fraud_log.review_status = (
            "confirmed_fraud" if new_status == "blocked"
            else "false_positive" if new_status == "approved"
            else "under_review"
        )

        fraud_log.action_taken = new_status
        fraud_log.final_status = new_status   # 🔥 VERY IMPORTANT

    db.session.commit()

    return jsonify({"success": True, "message": "Transaction overridden"})