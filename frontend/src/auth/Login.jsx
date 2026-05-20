// ============================================================
// FILE: frontend/src/auth/Login.jsx
// DESCRIPTION: Login page with JWT auth + animated UI
// ============================================================

import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const Login = () => {
  const [form,    setForm]    = useState({ email: "", password: "" });
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || "/dashboard";

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
const handleSubmit = async (e) => {
  e.preventDefault();

  console.log("🔥 LOGIN BUTTON CLICKED");  // ✅ ADD THIS

  if (!form.email || !form.password) {
    toast.error("Please fill all fields");
    return;
  }

  console.log("📤 Sending:", form);  // ✅ ADD

  setLoading(true);

  try {
    const user = await login(form);

    console.log("✅ LOGIN SUCCESS:", user);  // ✅ ADD

    navigate("/dashboard");

  } catch (err) {
    console.log("❌ LOGIN ERROR:", err.response?.data || err.message);  // ✅ ADD
  } finally {
    setLoading(false);
  }
};

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0f",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, position: "relative", overflow: "hidden",
    }}>

      {/* Animated bg blobs */}
      {[
        { top: "10%",  left: "5%",  color: "rgba(0,240,255,0.06)" },
        { top: "60%",  right: "5%", color: "rgba(123,47,247,0.06)" },
        { bottom: "10%", left: "40%", color: "rgba(255,68,68,0.04)" },
      ].map((b, i) => (
        <div key={i} style={{
          position: "absolute", width: 400, height: 400, borderRadius: "50%",
          background: `radial-gradient(circle, ${b.color} 0%, transparent 70%)`,
          ...b, pointerEvents: "none",
        }} />
      ))}

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🛡️</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#00f0ff" }}>FraudGuard AI</h1>
          <p style={{ color: "#444", fontSize: 13, marginTop: 6 }}>
            AI-Powered Financial Fraud Detection Platform
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "#12121f",
          border: "1px solid rgba(0,240,255,0.15)",
          borderRadius: 20, padding: "36px 32px",
          boxShadow: "0 0 60px rgba(0,240,255,0.07)",
        }}>
          <h2 style={{ color: "#e0e0ff", fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Sign In</h2>
          <p style={{ color: "#555", fontSize: 13, marginBottom: 28 }}>
            Enter your credentials to access the dashboard
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" placeholder="admin@frauddetect.com"
                value={form.email} onChange={(e) => set("email", e.target.value)}
                autoComplete="email" disabled={loading} />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: "relative" }}>
                <input type={show ? "text" : "password"} className="form-input"
                  placeholder="Enter your password"
                  value={form.password} onChange={(e) => set("password", e.target.value)}
                  style={{ paddingRight: 48 }} autoComplete="current-password" disabled={loading} />
                <button type="button" onClick={() => setShow((s) => !s)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>
                  {show ? "🙈" : "👁️"}
                </button>
              </div>
              <div style={{ textAlign: "right", marginTop: 8 }}>
                <Link to="/forgot-password" style={{ color: "#00f0ff", fontSize: 12, textDecoration: "none" }}>
                  Forgot Password?
                </Link>
              </div>
            </div>

            <button type="submit" className="btn btn-primary"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: 15, marginTop: 4 }}>
              {loading
                ? <><span className="loader" style={{ width: 16, height: 16 }} />&nbsp;Signing in…</>
                : "🔐 Sign In"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 20, color: "#555", fontSize: 13 }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "#00f0ff", textDecoration: "none", fontWeight: 600 }}>
              Register here
            </Link>
          </div>

          {/* Demo credentials */}
          <div style={{ marginTop: 24, padding: "14px 16px", background: "rgba(0,240,255,0.04)", border: "1px solid rgba(0,240,255,0.1)", borderRadius: 10 }}>
            <p style={{ color: "#00f0ff", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>🧪 Demo Credentials</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <p style={{ color: "#555", fontSize: 11 }}>Email</p>
                <p style={{ color: "#ccc", fontSize: 12 }}>admin@frauddetect.com</p>
              </div>
              <div>
                <p style={{ color: "#555", fontSize: 11 }}>Password</p>
                <p style={{ color: "#ccc", fontSize: 12 }}>Admin@123</p>
              </div>
            </div>
            <button className="btn btn-outline btn-sm" style={{ marginTop: 10, width: "100%", justifyContent: "center", fontSize: 11 }}
              onClick={() => setForm({ email: "admin@frauddetect.com", password: "Admin@123" })}>
              📋 Auto-fill Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;