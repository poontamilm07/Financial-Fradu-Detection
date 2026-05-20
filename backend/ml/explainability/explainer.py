import numpy as np
import pandas as pd
from ml.prediction.predictor import get_models, extract_features


FEATURE_DESCRIPTIONS = {
    'amount': 'Transaction Amount (₹)',
    'amount_log': 'Log-scaled Amount',
    'transaction_hour': 'Hour of Transaction',
    'is_night': 'Night-time Transaction (11PM-6AM)',
    'is_weekend': 'Weekend Transaction',
    'amount_zscore': 'Amount Deviation from User Avg',
    'merchant_category_encoded': 'Merchant Category Risk',
    'payment_method_encoded': 'Payment Method',
    'device_type_encoded': 'Device Type',
    'transaction_type_encoded': 'Transaction Type',
    'city_risk_score': 'City-based Risk Score',
}


def get_shap_explanation(transaction_data: dict) -> dict:
    """Generate SHAP explanation for a transaction"""
    try:
        import shap
        models = get_models()
        features_df = extract_features(transaction_data)
        
        result = {
            'shap_values': {},
            'base_value': 0.0,
            'feature_contributions': [],
            'top_features': [],
            'explanation_text': ''
        }
        
        # Use XGBoost for SHAP (TreeExplainer)
        if 'xgboost' in models:
            model = models['xgboost']
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(features_df)
            
            if isinstance(shap_values, list):
                sv = shap_values[1][0]  # class 1 (fraud)
            else:
                sv = shap_values[0]
            
            feature_names = list(features_df.columns)
            feature_values = features_df.values[0]
            
            contributions = []
            for i, feat in enumerate(feature_names):
                contributions.append({
                    'feature': feat,
                    'display_name': FEATURE_DESCRIPTIONS.get(feat, feat),
                    'shap_value': float(sv[i]),
                    'feature_value': float(feature_values[i]),
                    'impact': 'increases fraud risk' if sv[i] > 0 else 'decreases fraud risk',
                    'magnitude': abs(float(sv[i]))
                })
            
            contributions.sort(key=lambda x: x['magnitude'], reverse=True)
            
            result['shap_values'] = dict(zip(feature_names, sv.tolist()))
            result['base_value'] = float(explainer.expected_value
                if not isinstance(explainer.expected_value, list)
                else explainer.expected_value[1])
            result['feature_contributions'] = contributions
            result['top_features'] = contributions[:5]
            result['explanation_text'] = _build_explanation_text(contributions[:3])
        
        return result
        
    except Exception as e:
        return _get_fallback_explanation(transaction_data, str(e))


def get_lime_explanation(transaction_data: dict) -> dict:
    """Generate LIME explanation for a transaction"""
    try:
        from lime import lime_tabular
        models = get_models()
        features_df = extract_features(transaction_data)
        
        if 'xgboost' not in models:
            return {'error': 'Model not available', 'lime_values': {}}
        
        model = models['xgboost']
        
        # Create dummy training data for LIME (you'd use real training data in production)
        np.random.seed(42)
        n_samples = 100
        training_data = np.random.randn(n_samples, len(features_df.columns))
        
        feature_names = list(features_df.columns)
        explainer = lime_tabular.LimeTabularExplainer(
            training_data=training_data,
            feature_names=feature_names,
            class_names=['Legitimate', 'Fraud'],
            mode='classification'
        )
        
        explanation = explainer.explain_instance(
            features_df.values[0],
            model.predict_proba,
            num_features=min(8, len(feature_names))
        )
        
        lime_values = {}
        lime_contributions = []
        
        for feat, val in explanation.as_list():
            feat_clean = feat.split(' ')[0].strip('<>=')
            lime_values[feat] = val
            lime_contributions.append({
                'feature_rule': feat,
                'feature_name': feat_clean,
                'display_name': FEATURE_DESCRIPTIONS.get(feat_clean, feat_clean),
                'lime_weight': float(val),
                'impact': 'fraud indicator' if val > 0 else 'legitimacy indicator'
            })
        
        lime_contributions.sort(key=lambda x: abs(x['lime_weight']), reverse=True)
        
        return {
            'lime_values': lime_values,
            'lime_contributions': lime_contributions,
            'intercept': float(explanation.intercept[1]),
            'prediction_probability': float(explanation.predict_proba[1]),
            'top_lime_features': lime_contributions[:5]
        }
        
    except Exception as e:
        return {
            'error': str(e),
            'lime_values': _get_fallback_lime_explanation(transaction_data)
        }


def get_feature_importance() -> dict:
    """Get global feature importance from trained models"""
    try:
        models = get_models()
        importance_data = {}
        
        if 'xgboost' in models:
            model = models['xgboost']
            fi = model.feature_importances_
            feature_names = [
                'amount', 'amount_log', 'transaction_hour', 'is_night',
                'is_weekend', 'amount_zscore', 'merchant_category_encoded',
                'payment_method_encoded', 'device_type_encoded',
                'transaction_type_encoded', 'city_risk_score'
            ][:len(fi)]
            
            importance_data['xgboost'] = [
                {
                    'feature': feat,
                    'display_name': FEATURE_DESCRIPTIONS.get(feat, feat),
                    'importance': float(imp),
                    'percentage': float(imp / fi.sum() * 100)
                }
                for feat, imp in zip(feature_names, fi)
            ]
            importance_data['xgboost'].sort(key=lambda x: x['importance'], reverse=True)
        
        if 'random_forest' in models:
            rf = models['random_forest']
            fi_rf = rf.feature_importances_
            feature_names_rf = [
                'amount', 'amount_log', 'transaction_hour', 'is_night',
                'is_weekend', 'amount_zscore', 'merchant_category_encoded',
                'payment_method_encoded', 'device_type_encoded',
                'transaction_type_encoded', 'city_risk_score'
            ][:len(fi_rf)]
            
            importance_data['random_forest'] = [
                {
                    'feature': feat,
                    'display_name': FEATURE_DESCRIPTIONS.get(feat, feat),
                    'importance': float(imp),
                    'percentage': float(imp / fi_rf.sum() * 100)
                }
                for feat, imp in zip(feature_names_rf, fi_rf)
            ]
            importance_data['random_forest'].sort(
                key=lambda x: x['importance'], reverse=True
            )
        
        return importance_data
        
    except Exception as e:
        return {'error': str(e), 'fallback': _get_static_importance()}


def _build_explanation_text(top_features: list) -> str:
    """Build human-readable explanation"""
    if not top_features:
        return "Insufficient data for explanation."
    
    lines = ["🔍 Fraud Analysis Summary:", ""]
    for i, feat in enumerate(top_features, 1):
        direction = "⬆️ Increases" if feat['shap_value'] > 0 else "⬇️ Decreases"
        lines.append(
            f"{i}. {feat['display_name']}: {direction} fraud probability "
            f"by {abs(feat['shap_value']):.3f}"
        )
    return "\n".join(lines)


def _get_fallback_explanation(data: dict, error: str = '') -> dict:
    """Rule-based fallback explanation"""
    amount = float(data.get('amount', 0))
    hour = data.get('transaction_hour')

    if hour is None:
        hour = 12
    contributions = []
    if amount > 50000:
        contributions.append({
            'feature': 'amount',
            'display_name': 'Transaction Amount',
            'shap_value': 0.35,
            'feature_value': amount,
            'impact': 'increases fraud risk',
            'magnitude': 0.35
        })
    if hour < 5:
        contributions.append({
            'feature': 'transaction_hour',
            'display_name': 'Hour of Transaction',
            'shap_value': 0.20,
            'feature_value': hour,
            'impact': 'increases fraud risk (unusual hour)',
            'magnitude': 0.20
        })
    
    return {
        'shap_values': {},
        'base_value': 0.1,
        'feature_contributions': contributions,
        'top_features': contributions[:3],
        'explanation_text': _build_explanation_text(contributions[:3]),
        'error': error,
        'method': 'rule_based_fallback'
    }


def _get_fallback_lime_explanation(data: dict) -> dict:
    """Rule-based fallback for LIME"""
    return {
        'amount': float(data.get('amount', 0)) / 100000,
        'transaction_hour': float(data.get('transaction_hour', 12)) / 24
    }


def _get_static_importance() -> list:
    """Static feature importance for fallback"""
    return [
        {'feature': 'amount', 'display_name': 'Transaction Amount', 'importance': 0.35, 'percentage': 35},
        {'feature': 'transaction_hour', 'display_name': 'Transaction Hour', 'importance': 0.20, 'percentage': 20},
        {'feature': 'city_risk_score', 'display_name': 'City Risk Score', 'importance': 0.18, 'percentage': 18},
        {'feature': 'merchant_category_encoded', 'display_name': 'Merchant Category', 'importance': 0.15, 'percentage': 15},
        {'feature': 'is_night', 'display_name': 'Night Transaction', 'importance': 0.12, 'percentage': 12},
    ]