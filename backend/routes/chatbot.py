from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from datetime import datetime, timedelta
from extensions import db
from models.db_models import Transaction, User, Alert
import os

chatbot_bp = Blueprint('chatbot', __name__)


def get_fraud_context() -> dict:
    """Gather real-time fraud data for AI context"""
    total = Transaction.query.count()
    fraud = Transaction.query.filter_by(is_fraud=True).count()
    today = datetime.utcnow().date()
    today_fraud = Transaction.query.filter(
        Transaction.transaction_date == today, Transaction.is_fraud == True
    ).count()

    # City fraud stats
    city_data = db.session.query(
        Transaction.city,
        func.count(Transaction.id).label('fraud_count')
    ).filter(Transaction.is_fraud == True).group_by(
        Transaction.city
    ).order_by(func.count(Transaction.id).desc()).limit(5).all()

    # High risk transactions
    high_risk = Transaction.query.filter(
        Transaction.risk_level.in_(['high', 'critical'])
    ).count()

    avg_risk = db.session.query(func.avg(Transaction.risk_score)).scalar() or 0

    return {
        'total_transactions': total,
        'total_fraud': fraud,
        'fraud_rate': f"{(fraud/total*100):.1f}%" if total > 0 else "0%",
        'today_fraud': today_fraud,
        'high_risk_count': high_risk,
        'avg_risk_score': round(float(avg_risk), 4),
        'top_fraud_cities': [{'city': c.city, 'count': c.fraud_count} for c in city_data],
        'blocked_transactions': Transaction.query.filter_by(status='blocked').count(),
        'flagged_transactions': Transaction.query.filter_by(status='flagged').count(),
        'date': str(datetime.utcnow().date())
    }


def call_gemini_api(prompt: str, context: dict) -> str:
    """Call Google Gemini API for smart responses"""
    try:
        import google.generativeai as genai
        api_key = os.environ.get('GEMINI_API_KEY', '')
        if not api_key:
            return call_local_intelligence(prompt, context)

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')

        system_context = f"""You are FraudGuard AI, an expert fraud analytics assistant 
for a financial fraud detection platform. You have access to real-time data:

Current System Status:
- Total Transactions: {context['total_transactions']}
- Total Fraud Detected: {context['total_fraud']}  
- Fraud Rate: {context['fraud_rate']}
- Today's Fraud Cases: {context['today_fraud']}
- High Risk Transactions: {context['high_risk_count']}
- Average Risk Score: {context['avg_risk_score']}
- Top Fraud Cities: {context['top_fraud_cities']}
- Blocked Transactions: {context['blocked_transactions']}
- Date: {context['date']}

Respond in a professional but clear manner. Use emojis sparingly for better readability.
Keep responses concise and data-driven. Always cite actual numbers from the data above."""

        response = model.generate_content(
            f"{system_context}\n\nUser Question: {prompt}"
        )
        return response.text

    except Exception as e:
        return call_local_intelligence(prompt, context)


def call_local_intelligence(prompt: str, context: dict) -> str:
    """Rule-based intelligent responses using real data"""
    prompt_lower = prompt.lower()

    # Fraud statistics
    if any(kw in prompt_lower for kw in ['fraud', 'stat', 'overview', 'summary']):
        return f"""📊 **Fraud Detection Overview**

🔢 **Total Transactions:** {context['total_transactions']:,}
🚨 **Total Fraud Detected:** {context['total_fraud']:,}
📉 **Fraud Rate:** {context['fraud_rate']}
📅 **Today's Fraud Cases:** {context['today_fraud']}
🔴 **High Risk Transactions:** {context['high_risk_count']:,}
🚫 **Blocked Transactions:** {context['blocked_transactions']:,}
⚠️ **Flagged Transactions:** {context['flagged_transactions']:,}
📈 **Average Risk Score:** {context['avg_risk_score']:.2%}

Our AI ensemble (RandomForest + XGBoost + Isolation Forest) detected these anomalies in real-time."""

    # City analysis
    elif any(kw in prompt_lower for kw in ['city', 'location', 'region', 'where']):
        cities = context.get('top_fraud_cities', [])
        if cities:
            city_lines = "\n".join([
                f"  {i+1}. {c['city']}: {c['count']} fraud cases"
                for i, c in enumerate(cities)
            ])
            return f"""🗺️ **City-wise Fraud Analysis**

**Top Fraud Hotspots:**
{city_lines}

These cities show the highest concentration of suspicious transactions. Our heatmap visualizes the geographic distribution of fraud across all monitored regions."""
        return "No city-specific fraud data available yet."

    # Risk analysis
    elif any(kw in prompt_lower for kw in ['risk', 'score', 'level', 'danger']):
        return f"""🎯 **Risk Analysis Report**

**Current Risk Distribution:**
- Average Risk Score: {context['avg_risk_score']:.2%}
- High Risk Cases: {context['high_risk_count']:,}

**Risk Levels:**
🟢 **Low (0-25%):** Normal transactions
🟡 **Medium (25-50%):** Monitor closely  
🔴 **High (50-75%):** Flag for review
⛔ **Critical (75-100%):** Auto-block

Our ensemble ML model combines RandomForest, XGBoost, and Isolation Forest predictions with weighted averaging for maximum accuracy."""

    # Blocked/Flagged
    elif any(kw in prompt_lower for kw in ['block', 'flag', 'stop', 'prevent']):
        return f"""🚫 **Blocked & Flagged Transactions**

🔴 **Blocked:** {context['blocked_transactions']:,} transactions stopped automatically
⚠️ **Flagged:** {context['flagged_transactions']:,} transactions under review

Transactions are automatically blocked when:
• Fraud probability exceeds 75%
• Risk score classified as **Critical**
• Pattern matches known fraud signatures

Flagged transactions are reviewed by fraud analysts before final action."""

    # Trend analysis
    elif any(kw in prompt_lower for kw in ['trend', 'pattern', 'increase', 'decrease', 'history']):
        return f"""📈 **Fraud Trend Analysis**

As of {context['date']}:
- Today's Fraud Cases: **{context['today_fraud']}**
- Total Detected: **{context['total_fraud']:,}**
- Overall Fraud Rate: **{context['fraud_rate']}**

Our AI continuously learns from new patterns. The SHAP explainability module shows which features contribute most to each fraud detection — typically transaction amount, time of day, city risk score, and merchant category are the strongest indicators."""

    # Help / Default
    else:
        return f"""🤖 **FraudGuard AI Assistant**

Hello! I'm your AI fraud analytics assistant. I can help you with:

📊 **"Show me fraud statistics"** — Overall fraud overview
🗺️ **"City-wise fraud analysis"** — Geographic fraud distribution  
🎯 **"Risk score analysis"** — Risk levels and scoring explanation
🚫 **"Show blocked transactions"** — Blocked & flagged summary
📈 **"Fraud trends"** — Pattern and trend analysis
💡 **"How does fraud detection work?"** — AI model explanation

**Current Quick Stats:**
- 🔢 Total Transactions: {context['total_transactions']:,}
- 🚨 Fraud Detected: {context['total_fraud']:,}
- 📊 Fraud Rate: {context['fraud_rate']}

What would you like to know?"""


@chatbot_bp.route('/message', methods=['POST'])
@jwt_required()
def chat_message():
    data = request.get_json()
    message = data.get('message', '').strip()

    if not message:
        return jsonify({'success': False, 'error': 'Message is required'}), 400

    if len(message) > 500:
        return jsonify({'success': False, 'error': 'Message too long (max 500 chars)'}), 400

    try:
        context = get_fraud_context()
        response = call_gemini_api(message, context)

        return jsonify({
            'success': True,
            'response': response,
            'context': {
                'total_transactions': context['total_transactions'],
                'fraud_rate': context['fraud_rate']
            },
            'timestamp': datetime.utcnow().isoformat()
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Chatbot error',
            'response': f"I apologize, I encountered an issue: {str(e)}"
        }), 500