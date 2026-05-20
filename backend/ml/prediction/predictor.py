import os
import numpy as np
import pandas as pd
import joblib
from datetime import datetime

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')


def load_models():
    """Load all trained ML models"""
    models = {}
    model_files = {
        'random_forest': 'random_forest.pkl',
        'xgboost': 'xgboost.pkl',
        'isolation_forest': 'isolation_forest.pkl',
        'scaler': 'scaler.pkl',
        'label_encoders': 'label_encoders.pkl'
    }
    for key, filename in model_files.items():
        path = os.path.join(MODEL_DIR, filename)
        if os.path.exists(path):
            models[key] = joblib.load(path)
    return models


_models = None


def get_models():
    global _models
    if _models is None:
        _models = load_models()
    return _models


def extract_features(transaction_data: dict) -> pd.DataFrame:
    """Extract and engineer features from transaction data"""

    hour = transaction_data.get('transaction_hour')
    if hour is None:
        hour = datetime.now().hour

    amount = float(transaction_data.get('amount', 0))

    features = {
        'amount': amount,
        'amount_log': np.log1p(amount),
        'transaction_hour': hour,
        'is_night': 1 if hour < 6 or hour > 22 else 0,
        'is_weekend': 1 if datetime.now().weekday() >= 5 else 0,
        'amount_zscore': 0,
        'merchant_category_encoded': _encode_category(
            transaction_data.get('merchant_category', 'other')
        ),
        'payment_method_encoded': _encode_payment_method(
            transaction_data.get('payment_method', 'card')
        ),
        'device_type_encoded': _encode_device(
            transaction_data.get('device_type', 'mobile')
        ),
        'transaction_type_encoded': _encode_transaction_type(
            transaction_data.get('transaction_type', 'debit')
        ),
        'city_risk_score': _get_city_risk(
            transaction_data.get('city', 'unknown')
        ),
    }

    df = pd.DataFrame([features])
    return df


def _encode_category(category: str) -> int:
    categories = {
        'food': 0, 'shopping': 1, 'travel': 2, 'entertainment': 3,
        'utilities': 4, 'healthcare': 5, 'education': 6, 'other': 7,
        'electronics': 8, 'gambling': 9, 'crypto': 10
    }
    return categories.get(str(category).lower(), 7)


def _encode_payment_method(method: str) -> int:
    methods = {'card': 0, 'upi': 1, 'netbanking': 2, 'wallet': 3, 'cash': 4}
    return methods.get(str(method).lower(), 0)


def _encode_device(device: str) -> int:
    devices = {'mobile': 0, 'desktop': 1, 'tablet': 2, 'other': 3}
    return devices.get(str(device).lower(), 0)


def _encode_transaction_type(t_type: str) -> int:
    types = {'debit': 0, 'credit': 1, 'transfer': 2, 'withdrawal': 3}
    return types.get(str(t_type).lower(), 0)


def _get_city_risk(city: str) -> float:
    """Assign city-based risk score from historical data"""
    high_risk_cities = ['mumbai', 'delhi', 'bangalore', 'hyderabad', 'kolkata']
    medium_risk_cities = ['pune', 'chennai', 'ahmedabad', 'surat', 'jaipur']
    city_lower = str(city).lower()
    if city_lower in high_risk_cities:
        return 0.8
    elif city_lower in medium_risk_cities:
        return 0.5
    return 0.3


def predict_fraud(transaction_data: dict) -> dict:
    """
    Main prediction function using ensemble of ML models.
    Returns fraud prediction with confidence scores.
    """
    try:
        models = get_models()
        features_df = extract_features(transaction_data)
        
        predictions = {}
        probabilities = {}
        
        # RandomForest prediction
        if 'random_forest' in models:
            rf = models['random_forest']
            scaler = models.get('scaler')
            if scaler:
                features_scaled = scaler.transform(features_df)
                features_for_rf = features_scaled
            else:
                features_for_rf = features_df.values
            rf_prob = rf.predict_proba(features_for_rf)[0][1]
            predictions['random_forest'] = rf.predict(features_for_rf)[0]
            probabilities['random_forest'] = float(rf_prob)
        
        # XGBoost prediction
        if 'xgboost' in models:
            xgb = models['xgboost']
            xgb_prob = xgb.predict_proba(features_df.values)[0][1]
            predictions['xgboost'] = xgb.predict(features_df.values)[0]
            probabilities['xgboost'] = float(xgb_prob)
        
        # Isolation Forest
        if 'isolation_forest' in models:
            iso = models['isolation_forest']
            iso_pred = iso.predict(features_df.values)
            predictions['isolation_forest'] = 1 if iso_pred[0] == -1 else 0
            iso_score = iso.decision_function(features_df.values)[0]
            probabilities['isolation_forest'] = float(
                1 / (1 + np.exp(iso_score))  # Sigmoid transform of anomaly score
            )
        
        # Ensemble: Weighted Average
        weights = {
            'random_forest': 0.35,
            'xgboost': 0.45,
            'isolation_forest': 0.20
        }
        
        ensemble_score = 0.0
        total_weight = 0.0
        for model_name, prob in probabilities.items():
            w = weights.get(model_name, 0.33)
            ensemble_score += prob * w
            total_weight += w
        
        if total_weight > 0:
            ensemble_score /= total_weight
        
        # If no models loaded, use rule-based fallback
        if not probabilities:
            ensemble_score = _rule_based_fallback(transaction_data)
        
        # Determine risk level
        risk_level = _get_risk_level(ensemble_score)
        is_fraud = ensemble_score >= 0.5
        
        return {
            'is_fraud': bool(is_fraud),
            'fraud_score': round(ensemble_score, 4),
            'risk_level': risk_level,
            'confidence': round(abs(ensemble_score - 0.5) * 2, 4),
            'model_predictions': probabilities,
            'features_used': features_df.to_dict('records')[0],
            'ensemble_method': 'weighted_average'
        }
        
    except Exception as e:
        # Fallback to rule-based if ML fails
        score = _rule_based_fallback(transaction_data)
        return {
            'is_fraud': score >= 0.5,
            'fraud_score': round(score, 4),
            'risk_level': _get_risk_level(score),
            'confidence': 0.6,
            'model_predictions': {'rule_based': score},
            'features_used': {},
            'error': str(e),
            'ensemble_method': 'rule_based_fallback'
        }


def _rule_based_fallback(data: dict) -> float:
    """Rule-based fraud score when ML models aren't available"""
    score = 0.1  # Base score
    amount = float(data.get('amount', 0))
    hour = data.get('transaction_hour', 12)
    
    if amount > 50000:
        score += 0.35
    elif amount > 10000:
        score += 0.15
    
    if hour < 4 or hour > 23:
        score += 0.25
    
    high_risk_categories = ['gambling', 'crypto', 'electronics']
    if str(data.get('merchant_category', '')).lower() in high_risk_categories:
        score += 0.2
    
    return min(score, 0.99)


def _get_risk_level(score: float) -> str:
    if score < 0.25:
        return 'low'
    elif score < 0.50:
        return 'medium'
    elif score < 0.75:
        return 'high'
    return 'critical'