// ============================================================
// FILE: frontend/src/context/AuthContext.js
// DESCRIPTION: Global auth state + JWT management
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,            setUser]            = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ── Restore session on mount ──────────────────────────────
  useEffect(() => {
  const restore = async () => {
    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        setLoading(false);
        return;
      }

      // 🔥 Call backend to verify token
      const res = await authAPI.getMe();

      setUser(res.data.user);
      setIsAuthenticated(true);

    } catch (err) {
      console.log("Session expired");

      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");

      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  restore();
}, []);
  // ── Login ─────────────────────────────────────────────────
  const login = useCallback(async (credentials) => {
    const res = await authAPI.login(credentials);
     console.log("LOGIN RESPONSE:", res.data);
    const { access_token, refresh_token, user: userData } = res.data;
    console.log("USER ROLE:", userData.role);
    localStorage.setItem("access_token",  access_token);
    localStorage.setItem("refresh_token", refresh_token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
    return userData;
  }, []);

  // ── Logout ────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // ── Role helpers ──────────────────────────────────────────
  const hasRole = useCallback((roles) => {
    if (!user) return false;
    const arr = Array.isArray(roles) ? roles : [roles];
    return arr.includes(user.role);
  }, [user]);

  const isAdmin   = useCallback(() => hasRole("admin"), [hasRole]);
  const isAnalyst = useCallback(() => hasRole(["admin", "analyst"]), [hasRole]);

  // ── Update user in state ──────────────────────────────────
  const updateUser = useCallback((updates) => {
    setUser((u) => ({ ...u, ...updates }));
    const saved = JSON.parse(localStorage.getItem("user") || "{}");
    localStorage.setItem("user", JSON.stringify({ ...saved, ...updates }));
  }, []);

  const value = {
    user, loading, isAuthenticated,
    login, logout, hasRole, isAdmin, isAnalyst, updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};

export default AuthContext;