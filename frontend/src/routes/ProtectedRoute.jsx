// ============================================================
// FILE: frontend/src/routes/ProtectedRoute.js
// DESCRIPTION: JWT-protected route with role-based access
// ============================================================

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, requiredRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // ── Loading splash ────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#0a0a0f", flexDirection: "column", gap: 16,
      }}>
        <div style={{ fontSize: 48 }}>🛡️</div>
        <div className="loader" style={{ width: 36, height: 36, borderWidth: 3 }} />
        <p style={{ color: "#00f0ff", fontSize: 14 }}>Loading FraudGuard AI…</p>
      </div>
    );
  }

  // ── Not authenticated ─────────────────────────────────────
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ── Role check ────────────────────────────────────────────
 // ── Role check ────────────────────────────────────────────
if (requiredRoles && user) {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

  const userRole = (user.role || "").toLowerCase();

  const hasAccess = roles
    .map(r => r.toLowerCase())
    .includes(userRole);

  if (!hasAccess) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0a0a0f",
        flexDirection: "column",
        gap: 16,
      }}>
        <div style={{ fontSize: 64 }}>🔒</div>
        <h2 style={{ color: "#ff4444" }}>Access Denied</h2>
        <p>You don't have permission to view this page.</p>
      </div>
    );
  }
}

  return children;
};

export default ProtectedRoute;