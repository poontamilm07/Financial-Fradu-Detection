// ============================================================
// FILE: frontend/src/pages/Dashboard.jsx
// DESCRIPTION: Real-time analytics dashboard
// ============================================================

import React, { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
} from "recharts";
import { dashboardAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

// ── Constants ──────────────────────────────────────────────
const RISK_COLORS = {
  low:      "#00e676",
  medium:   "#ffc107",
  high:     "#ff8c00",
  critical: "#ff4444",
};
const PIE_COLORS = ["#00e676", "#ffc107", "#ff8c00", "#ff4444"];

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#1a1a2e",
    border: "1px solid rgba(0,240,255,0.2)",
    borderRadius: 10,
    color: "#e0e0ff",
    fontSize: 12,
  },
};

// ── Stat Card ──────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color = "#00f0ff", loading }) => (
  <div className="stat-card animate-fade-in">
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <p style={{ color: "#666", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
          {label}
        </p>
        {loading ? (
          <div style={{ marginTop: 8 }}>
            <div style={{ height: 28, width: 100, background: "#1a1a2e", borderRadius: 6, animation: "pulse 1.5s infinite" }} />
          </div>
        ) : (
          <p style={{ fontSize: 26, fontWeight: 800, color, marginTop: 8, lineHeight: 1 }}>
            {value}
          </p>
        )}
        {sub && <p style={{ color: "#555", fontSize: 12, marginTop: 6 }}>{sub}</p>}
      </div>
      <span style={{ fontSize: 32 }}>{icon}</span>
    </div>
  </div>
);

// ── Custom Tooltip ─────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1a1a2e", border: "1px solid rgba(0,240,255,0.2)",
      borderRadius: 10, padding: "10px 14px", fontSize: 12,
    }}>
      <p style={{ color: "#00f0ff", marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────
const Dashboard = () => {
  const { user } = useAuth();

  const [stats,       setStats]       = useState(null);
  const [trend,       setTrend]       = useState([]);
  const [riskDist,    setRiskDist]    = useState([]);
  const [cityData,    setCityData]    = useState([]);
  const [merchantRisk,setMerchantRisk]= useState([]);
  const [recentFraud, setRecentFraud] = useState([]);
  const [alerts,      setAlerts]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [userRisk, setUserRisk] = useState(null);

  // ── Fetch all dashboard data ────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [sRes, tRes, rRes, cRes, mRes, fRes, aRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getFraudTrend(30),
        dashboardAPI.getRiskDistribution(),
        dashboardAPI.getCityHeatmap(),
        dashboardAPI.getMerchantRisk(),
        dashboardAPI.getRecentFraud(6),
        dashboardAPI.getAlerts(5),
      ]);
      setStats(sRes.data.data || {});

setTrend(Array.isArray(tRes.data.trend) ? tRes.data.trend : []);

setRiskDist(
  Array.isArray(rRes.data.distribution)
    ? rRes.data.distribution.map(d => ({
        name: d.risk_level.charAt(0).toUpperCase() + d.risk_level.slice(1),
        value: d.count,
        color: RISK_COLORS[d.risk_level] || "#888"
      }))
    : []
);

setCityData(
  Array.isArray(cRes.data.data)
    ? cRes.data.data.slice(0, 8)
    : []
);

setMerchantRisk(
  Array.isArray(mRes.data.data)
    ? mRes.data.data.slice(0, 6)
    : []
);

setRecentFraud(Array.isArray(fRes.data.data) ? fRes.data.data : []);

setAlerts(Array.isArray(aRes.data.alerts) ? aRes.data.alerts : []);
      setLastRefresh(new Date());
    } catch (err) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
     fetchUserRisk();  
    const interval = setInterval(fetchAll, 30_000); // auto-refresh
    return () => clearInterval(interval);
  }, [fetchAll]);
  const fetchUserRisk = async () => {
  const res = await dashboardAPI.get("/dashboard/user-risk");
  setUserRisk(res.data.data);
};

  // ── Helpers ─────────────────────────────────────────────
  const fmt = (n) => (n ? Number(n).toLocaleString() : "0");
  const fmtAmt = (n) => `₹${(Number(n || 0) / 1_00_000).toFixed(1)}L`;
  const fmtPct = (n) => `${Number(n || 0).toFixed(1)}%`;

  const severityColor = (s) =>
    ({ critical: "#ff4444", high: "#ff8c00", medium: "#ffc107", low: "#00e676" }[s] || "#888");

  return (
  <div style={{ display: "flex" }}>

    {/* Sidebar */}
    <Sidebar />

    {/* Main Content */}
      <div style={{ flex: 1 }}>

      {/* Navbar */}
      <Navbar />

      {/* Page Content */}
      <div className="animate-fade-in" style={{ marginTop: 64 }}>

      {/* ── Page header ─────────────────────────────────── */}
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="page-title">📊 Dashboard</h1>
            <p className="page-subtitle">
              Welcome, <strong style={{ color: "#00f0ff" }}>{user?.full_name || user?.username}</strong>
              &nbsp;·&nbsp;Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div className="live-dot" />
              <span style={{ color: "#00e676", fontSize: 12, fontWeight: 700 }}>LIVE</span>
            </div>
            <button className="btn btn-outline btn-sm" onClick={fetchAll}>
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI cards ───────────────────────────────────── */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <StatCard icon="💳" label="Total Transactions"   color="#00f0ff"
          value={fmt(stats?.total_transactions)} sub={`${fmt(stats?.today_transactions)} today`} loading={loading} />
        
  <StatCard
  icon="🚨"
  label="Fraud Detected"
  color="#ff4444"
  value={fmt(stats?.total_fraud)}
  sub={`${fmtPct(stats?.fraud_rate)} fraud rate`}
  loading={loading}
  style={{
    visibility: user?.role === "user" ? "hidden" : "visible"
  }}
/>

        <StatCard icon="💰" label="Total Amount"         color="#00e676"
          value={fmtAmt(stats?.total_amount)} sub={`${fmtAmt(stats?.fraud_amount)} at risk`} loading={loading} />
        <StatCard icon="⚠️" label="Unread Alerts"       color="#ff8c00"
          value={fmt(stats?.unread_alerts)} sub={`${fmt(stats?.total_blocked)} blocked`} loading={loading} />
      </div>

      {/* ── Secondary KPI ───────────────────────────────── */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        <StatCard icon="🚫" label="Blocked"              color="#ff4444"
          value={fmt(stats?.total_blocked)}  sub="auto-blocked" loading={loading} />
        <StatCard icon="🔍" label="Flagged"              color="#ff8c00"
          value={fmt(stats?.total_flagged)}  sub="under review" loading={loading} />
        <StatCard icon="👥" label="Active Users"         color="#7b2ff7"
          value={fmt(stats?.total_users)}    sub="registered" loading={loading} />
        <StatCard icon="📈" label="Avg Risk Score"       color="#00f0ff"
          value={fmtPct((stats?.avg_risk_score || 0) * 100)} sub="system-wide" loading={loading} />
      </div>

      {/* ── Row 1: Area chart + Pie chart ───────────────── */}
      {user?.role !== "user" && (
  <div className="grid-2" style={{ marginBottom: 28 }}>

        {/* Fraud Trend */}
        <div className="card">
          <h3 style={{ color: "#00f0ff", marginBottom: 20, fontSize: 15, fontWeight: 700 }}>
            📈 Fraud Trend — Last 30 Days
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trend || []}>
              <defs>
                <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00f0ff" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#00f0ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradFraud" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ff4444" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ff4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: "#555", fontSize: 10 }}
                tickFormatter={(v) => v?.slice(5)} />
              <YAxis tick={{ fill: "#555", fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: "#888", fontSize: 12 }} />
              <Area type="monotone" dataKey="total"       name="Total"
                stroke="#00f0ff" fill="url(#gradTotal)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="fraud_count" name="Fraud"
                stroke="#ff4444" fill="url(#gradFraud)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Distribution Pie */}
        <div className="card">
          <h3 style={{ color: "#00f0ff", marginBottom: 20, fontSize: 15, fontWeight: 700 }}>
            🎯 Risk Distribution
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={riskDist} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={85} innerRadius={40}
                paddingAngle={3}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={{ stroke: "#444" }}
              >
                {riskDist.map((entry, i) => (
                  <Cell key={i} fill={entry.color || PIE_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
      </div>
      )}

      {/* ── Row 2: City bar + Merchant bar ──────────────── */}
      {user?.role !== "user" && (
  <div className="grid-2" style={{ marginBottom: 28 }}>

        {/* City Heatmap */}
        <div className="card">
          <h3 style={{ color: "#00f0ff", marginBottom: 20, fontSize: 15, fontWeight: 700 }}>
            🗺️ City Fraud Hotspots
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={cityData} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#555", fontSize: 10 }} />
              <YAxis dataKey="city" type="category" tick={{ fill: "#888", fontSize: 11 }} width={85} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: "#888", fontSize: 12 }} />
              <Bar dataKey="fraud_count" name="Fraud Cases" fill="#ff4444" radius={[0, 4, 4, 0]} />
              <Bar dataKey="total"       name="Total"       fill="rgba(0,240,255,0.2)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Merchant Risk */}
        <div className="card">
          <h3 style={{ color: "#00f0ff", marginBottom: 20, fontSize: 15, fontWeight: 700 }}>
            🏪 Merchant Category Risk
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={merchantRisk} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="category" tick={{ fill: "#555", fontSize: 10 }} />
              <YAxis tick={{ fill: "#555", fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="fraud_count" name="Fraud" fill="#ff8c00" radius={[4, 4, 0, 0]} />
              <Bar dataKey="total"       name="Total" fill="rgba(123,47,247,0.4)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      )}

      {/* ── Row 3: Live fraud feed + Alerts ─────────────── */}
      {user?.role !== "user" && (
  <div className="grid-2" style={{ marginBottom: 28 }}>
        {/* Live Fraud Feed */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ color: "#00f0ff", fontSize: 15, fontWeight: 700 }}>🚨 Live Fraud Feed</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div className="live-dot" />
              <span style={{ color: "#00e676", fontSize: 11, fontWeight: 600 }}>REAL-TIME</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 320, overflowY: "auto" }}>
            {recentFraud.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <p style={{ fontSize: 32 }}>🎉</p>
                <p style={{ color: "#00e676", fontSize: 13, marginTop: 8 }}>No recent fraud detected!</p>
              </div>
            ) : recentFraud.map((txn) => (
              <div key={txn.id} style={{
                background: "rgba(255,68,68,0.04)",
                border: "1px solid rgba(255,68,68,0.15)",
                borderRadius: 10, padding: "12px 14px",
                transition: "border-color 0.2s", cursor: "pointer",
              }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "#ff4444"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,68,68,0.15)"}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ color: "#e0e0ff", fontSize: 13, fontWeight: 600 }}>
                      {txn.merchant_name || "Unknown Merchant"}
                    </p>
                    <p style={{ color: "#555", fontSize: 11, marginTop: 3 }}>
                      📍 {txn.city || "N/A"} &nbsp;·&nbsp; {(txn.transaction_id || "").slice(0, 14)}…
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ color: "#ff4444", fontWeight: 700, fontSize: 14 }}>
                      ₹{parseFloat(txn.amount || 0).toLocaleString()}
                    </p>
                    <span className={`badge badge-${txn.risk_level}`} style={{ marginTop: 4, display: "inline-block" }}>
                      {txn.risk_level}
                    </span>
                  </div>
                </div>
                {/* Risk bar */}
                <div style={{ marginTop: 10 }}>
                  <div className="risk-bar">
                    <div
                      className={`risk-fill ${txn.risk_level}`}
                      style={{ width: `${(txn.risk_score || 0) * 100}%` }}
                    />
                  </div>
                  <p style={{ color: "#666", fontSize: 10, marginTop: 3 }}>
                    Risk Score: {((txn.risk_score || 0) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        

        {/* Recent Alerts */}
        <div className="card">
          <h3 style={{ color: "#00f0ff", marginBottom: 20, fontSize: 15, fontWeight: 700 }}>
            🔔 Recent Alerts
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 320, overflowY: "auto" }}>
            {alerts.length === 0 ? (
              <p style={{ color: "#555", textAlign: "center", padding: 24 }}>No alerts</p>
            ) : alerts.map((a) => (
              <div key={a.id} style={{
                padding: "12px 14px",
                background: a.is_read ? "#16213e" : "rgba(255,140,0,0.06)",
                border: `1px solid ${a.is_read ? "rgba(255,255,255,0.05)" : "rgba(255,140,0,0.25)"}`,
                borderRadius: 10,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: severityColor(a.severity), fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                      {a.alert_type?.replace(/_/g, " ").toUpperCase()}
                    </p>
                    <p style={{ color: "#ccc", fontSize: 12, lineHeight: 1.5 }}>{a.alert_message}</p>
                    <p style={{ color: "#444", fontSize: 10, marginTop: 4 }}>
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!a.is_read && (
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff8c00", flexShrink: 0, marginTop: 4 }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

         </div> {/* Page Content */}

    </div> {/* Main Content */}

    </div> 

  );
};

export default Dashboard;