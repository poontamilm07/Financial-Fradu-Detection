// ============================================================
// FILE: frontend/src/pages/UserProfile.jsx
// DESCRIPTION: User profile page with risk analytics
// ============================================================

import React, { useState, useEffect } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { authAPI } from "../services/api";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const UserProfile = () => {
  const { user: authUser, logout } = useAuth();
  const [profile,    setProfile]    = useState(null);
  const [riskData,   setRiskData]   = useState(null);
  const [editMode,   setEditMode]   = useState(false);
  const [form,       setForm]       = useState({});
  const [passForm,   setPassForm]   = useState({ current: "", newPass: "", confirm: "" });
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [tab,        setTab]        = useState("overview");

  // ── Load ─────────────────────────────────────────────────
  useEffect(() => {
  const load = async () => {
    if (!authUser?.id) return;

    setLoading(true);

    try {
      const pRes = await authAPI.getMe();

setProfile(pRes.data.user);
setForm(pRes.data.user);
    } catch {
      toast.error("Failed to load profile");
    }

    try {
      const rRes = await api.get(`/reports/risk-profiles/${authUser.id}`);
      setRiskData(rRes.data.data);
    } catch {
      console.log("Risk API failed (ignore)");
    }

    setLoading(false);
  };

  load();
}, [authUser?.id]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.put(`/auth/me`, { full_name: form.full_name, phone: form.phone, city: form.city });
      setProfile((p) => ({ ...p, ...form }));
      setEditMode(false);
      toast.success("Profile updated!");
    } catch { toast.error("Update failed"); }
    finally  { setSaving(false); }
  };

  const rp = riskData?.risk_profile;
  const radarData = rp ? [
    { subject: "Fraud Risk",  A: Math.round((rp.overall_risk_score || 0) * 100) },
    { subject: "Behavioral",  A: Math.round((rp.behavioral_score   || 0) * 100) },
    { subject: "Frequency",   A: Math.min(Math.round((rp.transaction_count || 0) / 10), 100) },
    { subject: "Fraud Count", A: Math.min((rp.fraud_count || 0) * 10, 100) },
    { subject: "Avg Amount",  A: Math.min(Math.round((rp.avg_amount || 0) / 5000), 100) },
  ] : [];

  const roleColors = { 
  super_admin: "#ff4444", 
  fraud_analyst: "#ff8c00", 
  user: "#00e676" 
};
  const roleColor  = roleColors[profile?.role] || "#888";

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
      <div className="loader" style={{ width: 36, height: 36 }} />
      <p style={{ color: "#00f0ff" }}>Loading profile…</p>
    </div>
  );

  return (
    <div className="animate-fade-in">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="page-header">
        <h1 className="page-title">👤 User Profile</h1>
        <p className="page-subtitle">Account information and security settings</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24 }}>

        {/* ── Left: Avatar card ───────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <div className="card" style={{ textAlign: "center" }}>
            {/* Avatar */}
            <div style={{
              width: 96, height: 96, borderRadius: "50%", margin: "0 auto 16px",
              background: "linear-gradient(135deg, #00f0ff, #7b2ff7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 40, fontWeight: 800, color: "#000",
              boxShadow: "0 0 30px rgba(0,240,255,0.3)",
            }}>
              {(profile?.full_name || profile?.username || "?").charAt(0).toUpperCase()}
            </div>

            <h3 style={{ color: "#e0e0ff", fontSize: 18, fontWeight: 700 }}>
              {profile?.full_name || profile?.username}
            </h3>
            <p style={{ color: "#666", fontSize: 13, marginTop: 4 }}>@{profile?.username}</p>

            <div style={{ margin: "12px 0" }}>
              <span style={{
                background: `${roleColor}22`, color: roleColor,
                fontSize: 11, padding: "4px 14px", borderRadius: 20,
                fontWeight: 700, textTransform: "uppercase",
              }}>
                {(profile?.role || "customer").replace("_", " ")}
              </span>
            </div>

            {profile?.is_verified && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8 }}>
                <span style={{ color: "#00e676", fontSize: 12 }}>✅ Email Verified</span>
              </div>
            )}

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                <span style={{ color: "#666" }}>Member since</span>
                <span style={{ color: "#ccc" }}>{profile?.created_at 
  ? new Date(profile.created_at).toLocaleDateString() 
  : "N/A"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                <span style={{ color: "#666" }}>Last login</span>
                <span style={{ color: "#ccc" }}>
                  {profile?.last_login 
  ? new Date(profile.last_login).toLocaleDateString() 
  : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Risk score card */}
          {rp && (
            <div className="card" style={{ textAlign: "center" }}>
              <p style={{ color: "#666", fontSize: 11, textTransform: "uppercase", marginBottom: 8 }}>Risk Score</p>
              <p style={{ fontSize: 36, fontWeight: 800, color: rp.risk_level === "low" ? "#00e676" : rp.risk_level === "medium" ? "#ffc107" : "#ff4444" }}>
                {((rp.overall_risk_score || 0) * 100).toFixed(1)}%
              </p>
              <span className={`badge badge-${rp.risk_level}`} style={{ marginTop: 8, display: "inline-block" }}>
                {rp.risk_level} risk
              </span>
              <div style={{ display: "flex", justifyContent: "space-around", marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <p style={{ color: "#ff4444", fontSize: 18, fontWeight: 700 }}>{rp.fraud_count}</p>
                  <p style={{ color: "#666", fontSize: 11 }}>Fraud</p>
                </div>
                <div>
                  <p style={{ color: "#00f0ff", fontSize: 18, fontWeight: 700 }}>{rp.transaction_count}</p>
                  <p style={{ color: "#666", fontSize: 11 }}>Total</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Tabs ─────────────────────────────────── */}
        <div>
          {/* Tab buttons */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
            {[
              { key: "overview",  label: "📋 Overview" },
              { key: "edit",      label: "✏️ Edit Profile" },
              { key: "security",  label: "🔐 Security" },
              { key: "risk",      label: "📊 Risk Profile" },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`btn btn-sm ${tab === key ? "btn-primary" : "btn-outline"}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Overview */}
          {tab === "overview" && (
            <div className="card">
              <h3 style={{ color: "#00f0ff", marginBottom: 20, fontSize: 15 }}>📋 Account Overview</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[
                  ["Full Name",  profile?.full_name  || "—"],
                  ["Username",   profile?.username   || "—"],
                  ["Email",      profile?.email      || "—"],
                  ["Phone",      profile?.phone      || "—"],
                  ["City",       profile?.city       || "—"],
                  ["Country",    profile?.country    || "India"],
                  ["Role",       (profile?.role || "customer").replace("_", " ")],
                  ["Status",     profile?.is_active ? "Active" : "Inactive"],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: "#1a1a2e", padding: "12px 16px", borderRadius: 10 }}>
                    <p style={{ color: "#666", fontSize: 11, marginBottom: 4 }}>{k}</p>
                    <p style={{ color: "#e0e0ff", fontWeight: 600, fontSize: 13 }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edit Profile */}
          {tab === "edit" && (
            <div className="card">
              <h3 style={{ color: "#00f0ff", marginBottom: 20, fontSize: 15 }}>✏️ Edit Profile</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[
                  { label: "Full Name", k: "full_name" },
                  { label: "Phone",     k: "phone" },
                  { label: "City",      k: "city" },
                ].map(({ label, k }) => (
                  <div key={k} className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{label}</label>
                    <input className="form-input" value={form[k] || ""}
                      onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
                <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
                  {saving ? "Saving…" : "✅ Save Changes"}
                </button>
                <button className="btn btn-outline" onClick={() => setForm(profile)}>Reset</button>
              </div>
            </div>
          )}

          {/* Security */}
          {tab === "security" && (
            <div className="card">
              <h3 style={{ color: "#00f0ff", marginBottom: 20, fontSize: 15 }}>🔐 Security Settings</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 400 }}>
                {[
                  { label: "Current Password", k: "current", type: "password" },
                  { label: "New Password",      k: "newPass", type: "password" },
                  { label: "Confirm Password",  k: "confirm", type: "password" },
                ].map(({ label, k, type }) => (
                  <div key={k} className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">{label}</label>
                    <input type={type} className="form-input"
                      value={passForm[k]}
                      onChange={(e) => setPassForm((f) => ({ ...f, [k]: e.target.value }))} />
                  </div>
                ))}
                <button className="btn btn-primary" style={{ justifyContent: "center" }}
                  onClick={() => toast.success("Password change — connect to /auth/change-password endpoint")}>
                  🔑 Change Password
                </button>
              </div>

              <div style={{ marginTop: 24, padding: 16, background: "rgba(255,68,68,0.05)", border: "1px solid rgba(255,68,68,0.2)", borderRadius: 10 }}>
                <p style={{ color: "#ff4444", fontWeight: 700, marginBottom: 8 }}>⚠️ Danger Zone</p>
                <p style={{ color: "#888", fontSize: 12, marginBottom: 12 }}>Once you log out, you'll need your credentials to sign back in.</p>
                <button className="btn btn-danger btn-sm" onClick={logout}>🚪 Logout All Sessions</button>
              </div>
            </div>
          )}

          {/* Risk Profile */}
          {tab === "risk" && (
            <div className="card">
              <h3 style={{ color: "#00f0ff", marginBottom: 20, fontSize: 15 }}>📊 Risk Profile Analysis</h3>
              {rp ? (
                <>
                  {radarData.length > 0 && (
                    <ResponsiveContainer width="100%" height={240}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.08)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: "#888", fontSize: 11 }} />
                        <Radar name="Risk" dataKey="A" stroke="#ff4444" fill="#ff4444" fillOpacity={0.15} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 16 }}>
                    {[
                      ["Overall Risk",   `${((rp.overall_risk_score || 0) * 100).toFixed(1)}%`, "#ff4444"],
                      ["Behavioral",     `${((rp.behavioral_score   || 0) * 100).toFixed(1)}%`, "#ff8c00"],
                      ["Fraud Count",    rp.fraud_count, "#ff4444"],
                      ["Total Txns",     rp.transaction_count, "#00f0ff"],
                      ["Avg Amount",     `₹${Number(rp.avg_amount || 0).toLocaleString()}`, "#00e676"],
                      ["Risk Level",     (rp.risk_level || "low").toUpperCase(), "#7b2ff7"],
                    ].map(([k, v, c]) => (
                      <div key={k} style={{ background: "#1a1a2e", padding: "12px 14px", borderRadius: 10 }}>
                        <p style={{ color: "#666", fontSize: 10, marginBottom: 4 }}>{k}</p>
                        <p style={{ color: c, fontWeight: 700, fontSize: 16 }}>{v}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p style={{ color: "#555", textAlign: "center", padding: 40 }}>No risk data available yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;