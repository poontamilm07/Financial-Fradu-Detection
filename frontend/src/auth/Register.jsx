// ============================================================
// FILE: frontend/src/auth/Register.jsx
// DESCRIPTION: Registration with OTP email verification
// ============================================================

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import toast from "react-hot-toast";

const STEPS = ["Account", "Verify OTP", "Done"];

const Register = () => {
  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [userId,  setUserId]  = useState(null);
  const [otp,     setOtp]     = useState("");
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "", email: "", password: "", confirm: "",
    full_name: "", phone: "", city: "",
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // ── Step 1: Register ─────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.username || !form.email || !form.password || !form.full_name) {
      toast.error("Please fill all required fields"); return;
    }
    if (form.password !== form.confirm) { toast.error("Passwords do not match"); return; }
    if (form.password.length < 8)       { toast.error("Password must be at least 8 characters"); return; }

    setLoading(true);
    try {
      const res = await authAPI.register({
        username: form.username, email: form.email, password: form.password,
        full_name: form.full_name, phone: form.phone, city: form.city,
      });
      setUserId(res.data.user_id);
      setStep(1);
      toast.success("Registration successful! Check your email for OTP 📧");
    } catch (err) {
      toast.error(err.response?.data?.error || "Registration failed");
    } finally { setLoading(false); }
  };

  // ── Step 2: Verify OTP ───────────────────────────────────
  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) { toast.error("Enter the 6-digit OTP"); return; }
    setLoading(true);
    try {
      await authAPI.verifyOtp({ email: form.email, otp });
      setStep(2);
      toast.success("Email verified! 🎉");
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid OTP");
    } finally { setLoading(false); }
  };

  

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0f",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, position: "relative", overflow: "hidden",
    }}>
      <div style={{ width: "100%", maxWidth: 500, position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🛡️</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#00f0ff" }}>FraudGuard AI</h1>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", justifyContent: "center", gap: 0, marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: i <= step ? "#00f0ff" : "#1a1a2e",
                border: `2px solid ${i <= step ? "#00f0ff" : "#333"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: i <= step ? "#000" : "#555", fontSize: 13, fontWeight: 700,
              }}>
                {i < step ? "✓" : i + 1}
              </div>
              <span style={{ color: i === step ? "#00f0ff" : "#555", fontSize: 12, marginLeft: 6, marginRight: 16 }}>{s}</span>
              {i < STEPS.length - 1 && (
                <div style={{ width: 24, height: 2, background: i < step ? "#00f0ff" : "#222", marginRight: 6 }} />
              )}
            </div>
          ))}
        </div>

        <div style={{
          background: "#12121f", border: "1px solid rgba(0,240,255,0.15)",
          borderRadius: 20, padding: "32px 28px",
          boxShadow: "0 0 50px rgba(0,240,255,0.06)",
        }}>

          {/* ── Step 0: Form ───────────────────────────────── */}
          {step === 0 && (
            <>
              <h2 style={{ color: "#e0e0ff", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Create Account</h2>
              <form onSubmit={handleRegister}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Field label="Full Name" k="full_name" placeholder="John Doe" required form={form} set={set} />
                  <Field label="Username" k="username" placeholder="johndoe" required form={form} set={set} />
                  <Field label="Email" k="email" type="email" placeholder="john@example.com" required form={form} set={set} />
                  <Field label="Phone" k="phone" type="tel" placeholder="+91 9000000000" form={form} set={set} />
                  <Field label="City" k="city" placeholder="Mumbai" form={form} set={set} />
                  <div />
                  <Field label="Password" k="password" type="password" placeholder="Min 8 chars" required form={form} set={set} />
                  <Field label="Confirm" k="confirm" type="password" placeholder="Repeat password" required form={form} set={set} />
                </div>
                <button type="submit" className="btn btn-primary"
                  style={{ width: "100%", justifyContent: "center", marginTop: 20 }} disabled={loading}>
                  {loading ? <><span className="loader" style={{ width: 14, height: 14 }} /> Creating…</> : "🚀 Create Account"}
                </button>
              </form>
            </>
          )}

          {/* ── Step 1: OTP ────────────────────────────────── */}
          {step === 1 && (
            <>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 48 }}>📧</div>
                <h2 style={{ color: "#e0e0ff", fontSize: 18, fontWeight: 700, marginTop: 12 }}>Verify Email</h2>
                <p style={{ color: "#555", fontSize: 13, marginTop: 6 }}>
                  We sent a 6-digit OTP to <strong style={{ color: "#00f0ff" }}>{form.email}</strong>
                </p>
              </div>
              <form onSubmit={handleVerify}>
                <div className="form-group">
                  <label className="form-label">Enter OTP</label>
                  <input className="form-input" maxLength={6} placeholder="000000"
                    value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    style={{ textAlign: "center", fontSize: 28, fontWeight: 700, letterSpacing: 12 }} />
                </div>
                <button type="submit" className="btn btn-primary"
                  style={{ width: "100%", justifyContent: "center" }} disabled={loading}>
                  {loading ? <><span className="loader" style={{ width: 14, height: 14 }} /> Verifying…</> : "✅ Verify OTP"}
                </button>
                <button type="button" className="btn btn-outline"
                  style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
                  onClick={() => authAPI.register(form).then(() => toast.success("OTP resent!")).catch(() => {})}>
                  🔄 Resend OTP
                </button>
              </form>
            </>
          )}

          {/* ── Step 2: Done ────────────────────────────────── */}
          {step === 2 && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
              <h2 style={{ color: "#00e676", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>You're all set!</h2>
              <p style={{ color: "#888", fontSize: 13, marginBottom: 24 }}>
                Your account has been verified. You can now sign in.
              </p>
              <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}
                onClick={() => navigate("/login")}>
                🔐 Go to Login
              </button>
            </div>
          )}

          {step === 0 && (
            <div style={{ textAlign: "center", marginTop: 20, color: "#555", fontSize: 13 }}>
              Already have an account?{" "}
              <Link to="/login" style={{ color: "#00f0ff", textDecoration: "none", fontWeight: 600 }}>Sign in</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;

 const Field = ({ label, k, type = "text", placeholder = "", required = false, form, set }) => (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label className="form-label">{label}{required && <span style={{ color: "#ff4444" }}> *</span>}</label>
      <input type={type} className="form-input" placeholder={placeholder}
        value={form[k] || ""} onChange={(e) => set(k, e.target.value)} required={required} />
    </div>
  );