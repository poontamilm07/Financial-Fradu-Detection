// ============================================================
// FILE: frontend/src/components/Navbar.jsx
// DESCRIPTION: Top navigation bar with alerts + user menu
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const Navbar = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [alerts,       setAlerts]       = useState([]);
  const [unread,       setUnread]       = useState(0);
  const [showAlerts,   setShowAlerts]   = useState(false);
  const [showUser,     setShowUser]     = useState(false);
  const [currentTime,  setCurrentTime]  = useState(new Date());
  const alertRef = useRef(null);
  const userRef  = useRef(null);

  // ── Clock ─────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Alerts polling ────────────────────────────────────────
  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const res = await dashboardAPI.getAlerts(8);
        setAlerts(res.data.alerts || []);
        setUnread(res.data.alerts.filter((a) => !a.is_read).length);
      } catch {}
    };
    loadAlerts();
    const t = setInterval(loadAlerts, 30_000);
    return () => clearInterval(t);
  }, []);

  // ── Close dropdowns on outside click ─────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (alertRef.current && !alertRef.current.contains(e.target)) setShowAlerts(false);
      if (userRef.current  && !userRef.current.contains(e.target))  setShowUser(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await dashboardAPI.markAlertRead(id);
      setAlerts((a) => a.map((x) => (x.id === id ? { ...x, is_read: true } : x)));
      setUnread((n) => Math.max(0, n - 1));
    } catch {}
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const severityColor = (s) =>
    ({ critical: "#ff4444", high: "#ff8c00", medium: "#ffc107", low: "#00e676" }[s] || "#888");

  return (
    <div style={{
      position: "fixed", top: 0, left: 260, right: 0, height: 64,
      background: "rgba(10,10,15,0.95)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(0,240,255,0.1)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", zIndex: 90,
    }}>

      {/* Left */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={onMenuToggle} style={{ background: "none", border: "none", color: "#888", fontSize: 20, cursor: "pointer" }}>
          ☰
        </button>
        <div>
          <p style={{ color: "#e0e0ff", fontSize: 14, fontWeight: 600 }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Center: Live clock */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div className="live-dot" />
        <span style={{ color: "#00f0ff", fontSize: 13, fontWeight: 700, fontFamily: "monospace" }}>
          {currentTime.toLocaleTimeString()}
        </span>
        <span style={{ color: "#555", fontSize: 12 }}>· System Live</span>
      </div>

      {/* Right: Alerts + User */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>

        {/* Alert bell */}
        <div style={{ position: "relative" }} ref={alertRef}>
          <button onClick={() => setShowAlerts((s) => !s)}
            style={{ background: "none", border: "none", cursor: "pointer", position: "relative", padding: 4 }}>
            <span style={{ fontSize: 22 }}>🔔</span>
            {unread > 0 && (
              <span style={{
                position: "absolute", top: -2, right: -2, background: "#ff4444",
                color: "#fff", borderRadius: "50%", width: 18, height: 18,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700,
              }}>{unread}</span>
            )}
          </button>

          {showAlerts && (
            <div style={{
              position: "absolute", top: 44, right: 0, width: 340,
              background: "#12121f", border: "1px solid rgba(0,240,255,0.2)",
              borderRadius: 14, boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              overflow: "hidden", zIndex: 1000,
            }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between" }}>
                <p style={{ color: "#00f0ff", fontWeight: 700, fontSize: 14 }}>🔔 Alerts ({unread} unread)</p>
              </div>
              <div style={{ maxHeight: 360, overflowY: "auto" }}>
                {alerts.length === 0 ? (
                  <p style={{ color: "#555", textAlign: "center", padding: 24, fontSize: 13 }}>No alerts</p>
                ) : alerts.map((a) => (
                  <div key={a.id} onClick={() => handleMarkRead(a.id)}
                    style={{
                      padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)",
                      background: a.is_read ? "transparent" : "rgba(255,140,0,0.04)",
                      cursor: "pointer", transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,240,255,0.04)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = a.is_read ? "transparent" : "rgba(255,140,0,0.04)"}
                  >
                    <div style={{ display: "flex", gap: 10 }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>
                        {a.severity === "critical" ? "🚨" : a.severity === "high" ? "⚠️" : "ℹ️"}
                      </span>
                      <div>
                        <p style={{ color: severityColor(a.severity), fontSize: 11, fontWeight: 700 }}>
                          {(a.alert_type || "").replace(/_/g, " ").toUpperCase()}
                        </p>
                        <p style={{ color: "#ccc", fontSize: 12, marginTop: 2, lineHeight: 1.4 }}>{a.alert_message}</p>
                        <p style={{ color: "#444", fontSize: 10, marginTop: 4 }}>{new Date(a.created_at).toLocaleString()}</p>
                      </div>
                      {!a.is_read && (
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ff8c00", flexShrink: 0, marginTop: 4 }} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div style={{ position: "relative" }} ref={userRef}>
          <button onClick={() => setShowUser((s) => !s)}
            style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer" }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "linear-gradient(135deg, #00f0ff, #7b2ff7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: "#000",
            }}>
              {(user?.full_name || user?.username || "?").charAt(0).toUpperCase()}
            </div>
            <div style={{ textAlign: "left" }}>
              <p style={{ color: "#e0e0ff", fontSize: 13, fontWeight: 600, lineHeight: 1 }}>
                {user?.full_name || user?.username}
              </p>
              <p style={{ color: "#555", fontSize: 10, textTransform: "uppercase" }}>{user?.role?.replace("_", " ")}</p>
            </div>
            <span style={{ color: "#555", fontSize: 12 }}>▾</span>
          </button>

          {showUser && (
            <div style={{
              position: "absolute", top: 48, right: 0, width: 200,
              background: "#12121f", border: "1px solid rgba(0,240,255,0.15)",
              borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", overflow: "hidden", zIndex: 1000,
            }}>
              {[
                { icon: "👤", label: "Profile",   action: () => { navigate("/profile");  setShowUser(false); } },
                { icon: "⚙️", label: "Settings",  action: () => { navigate("/profile");  setShowUser(false); } },
                { icon: "🚪", label: "Logout",    action: handleLogout, danger: true },
              ].map(({ icon, label, action, danger }) => (
                <button key={label} onClick={action}
                  style={{
                    width: "100%", background: "none", border: "none",
                    padding: "12px 16px", display: "flex", alignItems: "center", gap: 10,
                    color: danger ? "#ff4444" : "#ccc", fontSize: 13, cursor: "pointer",
                    textAlign: "left", transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,240,255,0.05)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <span>{icon}</span> {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;