from flask import current_app
from flask_mail import Message
from extensions import mail


def send_fraud_alert_email(user_email: str, user_name: str, transaction_data: dict, fraud_score: float):
    """Send fraud alert email to user"""
    try:
        msg = Message(
            subject="🚨 Fraud Alert: Suspicious Transaction Detected",
            recipients=[user_email]
        )
        msg.html = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0a0a0f;color:#e0e0ff;padding:30px;border-radius:12px;border:1px solid #00f0ff30;">
            <div style="text-align:center;margin-bottom:24px;">
                <h1 style="color:#ff4444;font-size:28px;margin:0;">🚨 FRAUD ALERT</h1>
                <p style="color:#00f0ff;margin-top:8px;">AI-Powered Financial Fraud Detection System</p>
            </div>
            <div style="background:#1a1a2e;padding:20px;border-radius:8px;border-left:4px solid #ff4444;margin-bottom:20px;">
                <h2 style="color:#ff4444;margin:0 0 12px 0;">Suspicious Transaction Detected</h2>
                <p style="color:#aaa;margin:0;">Hello <strong style="color:#00f0ff;">{user_name}</strong>,</p>
                <p style="color:#aaa;">Our AI system has flagged a transaction on your account with a high fraud probability.</p>
            </div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
                <tr style="border-bottom:1px solid #333;">
                    <td style="padding:10px;color:#888;">Transaction ID</td>
                    <td style="padding:10px;color:#fff;font-weight:bold;">{transaction_data.get('transaction_id', 'N/A')}</td>
                </tr>
                <tr style="border-bottom:1px solid #333;">
                    <td style="padding:10px;color:#888;">Amount</td>
                    <td style="padding:10px;color:#ff4444;font-weight:bold;font-size:18px;">₹{transaction_data.get('amount', 0):,.2f}</td>
                </tr>
                <tr style="border-bottom:1px solid #333;">
                    <td style="padding:10px;color:#888;">Merchant</td>
                    <td style="padding:10px;color:#fff;">{transaction_data.get('merchant_name', 'Unknown')}</td>
                </tr>
                <tr style="border-bottom:1px solid #333;">
                    <td style="padding:10px;color:#888;">City</td>
                    <td style="padding:10px;color:#fff;">{transaction_data.get('city', 'Unknown')}</td>
                </tr>
                <tr>
                    <td style="padding:10px;color:#888;">Fraud Risk Score</td>
                    <td style="padding:10px;">
                        <span style="background:#ff4444;color:#fff;padding:4px 12px;border-radius:20px;font-weight:bold;">
                            {fraud_score * 100:.1f}% RISK
                        </span>
                    </td>
                </tr>
            </table>
            <div style="background:#1a0000;padding:16px;border-radius:8px;border:1px solid #ff4444;margin-bottom:20px;">
                <p style="color:#ff6666;margin:0;font-size:14px;">
                    ⚠️ If you DID NOT authorize this transaction, please contact your bank immediately and report it as fraud.
                </p>
            </div>
            <p style="color:#555;font-size:12px;text-align:center;">
                This is an automated alert from the AI Fraud Detection System.<br>
                Do not reply to this email.
            </p>
        </div>
        """
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Email send failed: {e}")
        return False


def send_otp_email(user_email: str, user_name: str, otp_code: str):
    """Send OTP verification email"""
    try:
        msg = Message(
            subject="🔐 Your Verification OTP - Fraud Detection System",
            recipients=[user_email]
        )
        msg.html = f"""
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;background:#0a0a0f;color:#e0e0ff;padding:30px;border-radius:12px;border:1px solid #00f0ff30;">
            <div style="text-align:center;margin-bottom:24px;">
                <h1 style="color:#00f0ff;font-size:24px;">🔐 Email Verification</h1>
                <p style="color:#888;">AI Fraud Detection System</p>
            </div>
            <p style="color:#ccc;">Hello <strong style="color:#00f0ff;">{user_name}</strong>,</p>
            <p style="color:#ccc;">Your One-Time Password (OTP) for verification is:</p>
            <div style="text-align:center;margin:30px 0;">
                <div style="background:#1a1a2e;display:inline-block;padding:20px 40px;border-radius:8px;border:2px solid #00f0ff;">
                    <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#00f0ff;">{otp_code}</span>
                </div>
            </div>
            <p style="color:#888;text-align:center;font-size:13px;">This OTP expires in 10 minutes. Do not share it with anyone.</p>
        </div>
        """
        mail.send(msg)
        return True
    except Exception as e:
        print(f"OTP email failed: {e}")
        return False


def send_password_reset_email(user_email: str, user_name: str, reset_token: str, frontend_url: str):
    """Send password reset email"""
    reset_url = f"{frontend_url}/reset-password?token={reset_token}"
    try:
        msg = Message(
            subject="🔑 Password Reset Request - Fraud Detection System",
            recipients=[user_email]
        )
        msg.html = f"""
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;background:#0a0a0f;color:#e0e0ff;padding:30px;border-radius:12px;border:1px solid #00f0ff30;">
            <h1 style="color:#00f0ff;text-align:center;">🔑 Password Reset</h1>
            <p style="color:#ccc;">Hello <strong style="color:#00f0ff;">{user_name}</strong>,</p>
            <p style="color:#ccc;">Click the button below to reset your password:</p>
            <div style="text-align:center;margin:30px 0;">
                <a href="{reset_url}" style="background:#00f0ff;color:#000;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">Reset Password</a>
            </div>
            <p style="color:#888;font-size:12px;text-align:center;">This link expires in 1 hour. If you did not request this, ignore this email.</p>
        </div>
        """
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Reset email failed: {e}")
        return False


def send_suspicious_activity_alert(admin_email: str, activity_data: dict):
    """Send suspicious activity alert to admin"""
    try:
        msg = Message(
            subject="⚠️ Suspicious Activity Alert - Admin Notification",
            recipients=[admin_email]
        )
        msg.html = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0a0a0f;color:#e0e0ff;padding:30px;border-radius:12px;">
            <h1 style="color:#ff8c00;">⚠️ Suspicious Activity Detected</h1>
            <p style="color:#ccc;">The following suspicious activity was detected by the system:</p>
            <pre style="background:#1a1a2e;padding:16px;border-radius:8px;color:#00f0ff;font-size:13px;">
{str(activity_data)}
            </pre>
        </div>
        """
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Admin alert email failed: {e}")
        return False