// ============================================================
// FILE: frontend/src/components/Sidebar.jsx
// DESCRIPTION: Navigation sidebar with role-based menu items
// ============================================================

import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const NAV_ITEMS = [
  { path: "/dashboard",    icon: "📊", label: "Dashboard",       roles: ["admin","analyst","user"] },
  { path: "/transactions", icon: "💳", label: "Transactions",    roles: ["admin","analyst","user"] },
  { path: "/fraud-panel",  icon: "🚨", label: "Fraud Panel",     roles: ["admin","analyst"] },
  { path: "/risk-heatmap", icon: "🗺️", label: "Risk Heatmap",   roles: ["admin","analyst"] },
  { path: "/reports",      icon: "📄", label: "Reports",         roles: ["admin"] },
  { path: "/profile",      icon: "👤", label: "My Profile",      roles: ["admin","analyst","user"] },
];

const ROLE_COLORS = {
  admin:   "#ff4444",
  analyst: "#ff8c00",
  customer:      "#00e676",
  user: "#00e676",
};

const Sidebar = ({ collapsed = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const role = (user?.role || "").toLowerCase();
  const roleColor = ROLE_COLORS[(user?.role || "").toLowerCase()] || "#888";

 // normalize admin → super_admin
  

  const visibleNav = NAV_ITEMS.filter((n) =>
  n.roles.includes(role)
);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <div style={{
      width: collapsed ? 70 : 260, minHeight: "100vh",
      background: "#0e0e1a",
      borderRight: "1px solid rgba(0,240,255,0.08)",
      display: "flex", flexDirection: "column",
      position: "fixed", top: 0, left: 0, zIndex: 100,
      transition: "width 0.3s ease",
    }}>

      {/* ── Logo ─────────────────────────────────────────── */}
      <div style={{ padding: collapsed ? "20px 0" : "20px 24px 24px", borderBottom: "1px solid rgba(0,240,255,0.08)", textAlign: collapsed ? "center" : "left" }}>
        <div style={{ fontSize: 28, marginBottom: collapsed ? 0 : 8 }}>🛡️</div>
        {!collapsed && (
          <>
            <h2 style={{ color: "#00f0ff", fontSize: 18, fontWeight: 800, lineHeight: 1 }}>FraudGuard</h2>
            <p style={{ color: "#444", fontSize: 10, marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>
              AI Security Platform
            </p>
          </>
        )}
        {/* Live indicator */}
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
            <div className="live-dot" />
            <span style={{ color: "#00e676", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
              System Live
            </span>
          </div>
        )}
      </div>

      {/* ── User info ────────────────────────────────────── */}
      {!collapsed && user && (
        <div style={{ padding: "14px 20px 14px", borderBottom: "1px solid rgba(0,240,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #00f0ff, #7b2ff7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 800, color: "#000",
            }}>
              {(user.full_name || user.username || "?").charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: "#e0e0ff", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.full_name || user.username}
              </p>
              <span style={{
                background: `${roleColor}20`, color: roleColor,
                fontSize: 9, padding: "2px 8px", borderRadius: 10,
                fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
              }}>
                {(user.role || "user").replace("_", " ")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation ───────────────────────────────────── */}
      <nav style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
        {!collapsed && (
          <p style={{ color: "#333", fontSize: 9, fontWeight: 700, padding: "6px 24px", textTransform: "uppercase", letterSpacing: 1.5 }}>
            Navigation
          </p>
        )}
        {visibleNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            style={{ justifyContent: collapsed ? "center" : "flex-start", paddingLeft: collapsed ? 0 : 24 }}
            title={collapsed ? item.label : ""}
          >
            <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
            {!collapsed && <span style={{ fontSize: 14 }}>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ── Logout ───────────────────────────────────────── */}
      <div style={{ padding: collapsed ? "12px 0" : "12px 16px 24px", borderTop: "1px solid rgba(0,240,255,0.06)", textAlign: collapsed ? "center" : "left" }}>
        <button onClick={handleLogout}
          className="btn btn-outline"
          style={{ width: collapsed ? "auto" : "100%", justifyContent: "center", fontSize: 13, padding: collapsed ? "10px" : undefined }}
          title="Logout">
          {collapsed ? "🚪" : "🚪 Logout"}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;