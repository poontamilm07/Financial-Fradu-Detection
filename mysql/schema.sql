-- =============================================
-- AI Financial Fraud Detection - MySQL Schema
-- =============================================

CREATE DATABASE IF NOT EXISTS fraud_detection;
USE fraud_detection;

-- ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL COMMENT 'super_admin, fraud_analyst, customer',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO roles (name, description) VALUES 
('super_admin', 'Full system access'),
('fraud_analyst', 'Fraud investigation access'),
('customer', 'Limited read-only access');

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT DEFAULT 3,
    full_name VARCHAR(200),
    phone VARCHAR(20),
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    otp_code VARCHAR(10),
    otp_expires_at DATETIME,
    reset_token VARCHAR(255),
    reset_token_expires DATETIME,
    last_login DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    merchant_name VARCHAR(200),
    merchant_category VARCHAR(100),
    transaction_type VARCHAR(50) COMMENT 'debit, credit, transfer',
    payment_method VARCHAR(50) COMMENT 'card, upi, netbanking, wallet',
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    device_type VARCHAR(50),
    ip_address VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending' COMMENT 'approved, flagged, blocked, under_investigation',
    risk_score DECIMAL(5, 4) DEFAULT 0.0000,
    risk_level VARCHAR(20) DEFAULT 'low' COMMENT 'low, medium, high, critical',
    is_fraud BOOLEAN DEFAULT FALSE,
    fraud_reason TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    transaction_hour INT,
    transaction_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- FRAUD LOGS TABLE
CREATE TABLE IF NOT EXISTS fraud_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    user_id INT NOT NULL,
    fraud_score DECIMAL(5, 4),
    fraud_level VARCHAR(20),
    ml_model_used VARCHAR(100),
    shap_values JSON,
    lime_explanation JSON,
    feature_importance JSON,
    confidence_score DECIMAL(5, 4),
    flagged_by VARCHAR(100) DEFAULT 'system',
    reviewed_by INT,
    review_status VARCHAR(50) DEFAULT 'pending',
    review_notes TEXT,
    action_taken VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ALERTS TABLE
CREATE TABLE IF NOT EXISTS alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    transaction_id INT,
    alert_type VARCHAR(100),
    alert_message TEXT,
    severity VARCHAR(20) DEFAULT 'medium',
    is_read BOOLEAN DEFAULT FALSE,
    email_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

-- REPORTS TABLE
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_name VARCHAR(200),
    report_type VARCHAR(50) COMMENT 'pdf, excel, csv',
    generated_by INT,
    date_from DATE,
    date_to DATE,
    total_transactions INT,
    total_fraud INT,
    total_amount DECIMAL(15, 2),
    file_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (generated_by) REFERENCES users(id)
);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(200),
    message TEXT,
    notification_type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- LOGIN HISTORY TABLE
CREATE TABLE IF NOT EXISTS login_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    ip_address VARCHAR(50),
    device_info VARCHAR(500),
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logout_time DATETIME,
    status VARCHAR(20) DEFAULT 'success',
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- RISK SCORES TABLE
CREATE TABLE IF NOT EXISTS risk_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    overall_risk_score DECIMAL(5, 4),
    transaction_count INT DEFAULT 0,
    fraud_count INT DEFAULT 0,
    avg_amount DECIMAL(15, 2),
    risk_level VARCHAR(20),
    behavioral_score DECIMAL(5, 4),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- SAMPLE ADMIN USER (password: Admin@123)
INSERT IGNORE INTO users (username, email, password_hash, role_id, full_name, is_verified) VALUES (
    'admin',
    'admin@frauddetect.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaJqQnG1h8PD7sMxlEKVvOoS.',
    1,
    'System Administrator',
    TRUE
);