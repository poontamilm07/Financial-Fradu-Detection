"""
Run this script to train and save ML models:
  cd backend
  python ml/training/train_model.py
"""
import os
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
from imblearn.over_sampling import SMOTE
from xgboost import XGBClassifier

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')
os.makedirs(MODEL_DIR, exist_ok=True)


def generate_synthetic_data(n_samples: int = 10000) -> pd.DataFrame:
    """Generate synthetic fraud detection dataset for training"""
    np.random.seed(42)
    
    # Legitimate transactions (95%)
    n_legit = int(n_samples * 0.95)
    legit = pd.DataFrame({
        'amount': np.random.lognormal(8, 1.5, n_legit),
        'amount_log': np.random.normal(8, 1.5, n_legit),
        'transaction_hour': np.random.randint(8, 22, n_legit),
        'is_night': np.zeros(n_legit),
        'is_weekend': np.random.randint(0, 2, n_legit),
        'amount_zscore': np.random.normal(0, 1, n_legit),
        'merchant_category_encoded': np.random.randint(0, 8, n_legit),
        'payment_method_encoded': np.random.randint(0, 5, n_legit),
        'device_type_encoded': np.random.randint(0, 3, n_legit),
        'transaction_type_encoded': np.random.randint(0, 4, n_legit),
        'city_risk_score': np.random.uniform(0.2, 0.6, n_legit),
        'is_fraud': np.zeros(n_legit)
    })
    
    # Fraudulent transactions (5%)
    n_fraud = n_samples - n_legit
    fraud = pd.DataFrame({
        'amount': np.random.lognormal(11, 2, n_fraud),  # Higher amounts
        'amount_log': np.random.normal(11, 2, n_fraud),
        'transaction_hour': np.random.choice(list(range(0, 5)) + list(range(23, 24)), n_fraud),
        'is_night': np.ones(n_fraud),
        'is_weekend': np.random.randint(0, 2, n_fraud),
        'amount_zscore': np.random.normal(3, 1.5, n_fraud),  # High deviation
        'merchant_category_encoded': np.random.choice([9, 10], n_fraud),  # gambling, crypto
        'payment_method_encoded': np.random.randint(0, 5, n_fraud),
        'device_type_encoded': np.random.randint(0, 4, n_fraud),
        'transaction_type_encoded': np.random.choice([2, 3], n_fraud),  # transfer, withdrawal
        'city_risk_score': np.random.uniform(0.6, 1.0, n_fraud),  # High risk city
        'is_fraud': np.ones(n_fraud)
    })
    
    df = pd.concat([legit, fraud], ignore_index=True).sample(frac=1, random_state=42)
    return df


def train():
    print("🤖 Training AI Fraud Detection Models...")
    
    # Generate / load dataset
    df = generate_synthetic_data(10000)
    
    feature_cols = [
        'amount', 'amount_log', 'transaction_hour', 'is_night', 'is_weekend',
        'amount_zscore', 'merchant_category_encoded', 'payment_method_encoded',
        'device_type_encoded', 'transaction_type_encoded', 'city_risk_score'
    ]
    
    X = df[feature_cols]
    y = df['is_fraud']
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Handle class imbalance with SMOTE
    print("⚖️  Applying SMOTE for class imbalance...")
    smote = SMOTE(random_state=42, k_neighbors=3)
    X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
    
    # Scale features
    print("📊 Scaling features...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train_res)
    X_test_scaled = scaler.transform(X_test)
    joblib.dump(scaler, os.path.join(MODEL_DIR, 'scaler.pkl'))
    print("✅ Scaler saved")
    
    # Train RandomForest
    print("🌲 Training RandomForest Classifier...")
    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=None,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train_scaled, y_train_res)
    rf_pred = rf.predict(X_test_scaled)
    rf_auc = roc_auc_score(y_test, rf.predict_proba(X_test_scaled)[:, 1])
    print(f"   RandomForest ROC-AUC: {rf_auc:.4f}")
    print(f"   {classification_report(y_test, rf_pred, target_names=['Legit', 'Fraud'])}")
    joblib.dump(rf, os.path.join(MODEL_DIR, 'random_forest.pkl'))
    print("✅ RandomForest saved")
    
    # Train XGBoost
    print("⚡ Training XGBoost Classifier...")
    neg, pos = (y_train_res == 0).sum(), (y_train_res == 1).sum()
    scale = neg / pos
    
    xgb = XGBClassifier(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=6,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale,
        reg_lambda=1.0,
        reg_alpha=0.1,
        gamma=0.2,
        tree_method='hist',
        eval_metric='aucpr',
        random_state=42,
        use_label_encoder=False
    )
    xgb.fit(X_train_res, y_train_res, eval_set=[(X_test, y_test)], verbose=False)
    xgb_pred = xgb.predict(X_test)
    xgb_auc = roc_auc_score(y_test, xgb.predict_proba(X_test)[:, 1])
    print(f"   XGBoost ROC-AUC: {xgb_auc:.4f}")
    print(f"   {classification_report(y_test, xgb_pred, target_names=['Legit', 'Fraud'])}")
    joblib.dump(xgb, os.path.join(MODEL_DIR, 'xgboost.pkl'))
    print("✅ XGBoost saved")
    
    # Train Isolation Forest (anomaly detection)
    print("🔍 Training Isolation Forest...")
    iso = IsolationForest(
        n_estimators=200,
        contamination=0.05,
        random_state=42,
        n_jobs=-1
    )
    iso.fit(X_train_res)
    joblib.dump(iso, os.path.join(MODEL_DIR, 'isolation_forest.pkl'))
    print("✅ Isolation Forest saved")
    
    print("\n🎉 All models trained and saved successfully!")
    print(f"📁 Models saved in: {MODEL_DIR}")
    
    return {
        'random_forest_auc': rf_auc,
        'xgboost_auc': xgb_auc,
        'features': feature_cols
    }


if __name__ == '__main__':
    train()