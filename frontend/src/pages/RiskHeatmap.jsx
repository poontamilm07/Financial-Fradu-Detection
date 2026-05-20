// ============================================================
// FILE: frontend/src/pages/RiskHeatmap.jsx
// DESCRIPTION: City-level risk heatmap with fraud analytics
// ============================================================

import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ScatterChart, Scatter, ZAxis, Cell,
  ResponsiveContainer, Legend,
} from "recharts";
import api from "../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";


const RISK_COLORS = { low: "#00e676", medium: "#ffc107", high: "#ff8c00", critical: "#ff4444" };

const getRiskColor = (rate) => {
  if (rate >= 30) return "#ff4444";
  if (rate >= 15) return "#ff8c00";
  if (rate >= 5)  return "#ffc107";
  return "#00e676";
};

const getRiskLabel = (rate) => {
  if (rate >= 30) return "critical";
  if (rate >= 15) return "high";
  if (rate >= 5)  return "medium";
  return "low";
};

const RiskHeatmap = () => {
  const { isAuthenticated } = useAuth();
  const [heatmap,  setHeatmap]  = useState([]);
  const [topCity,  setTopCity]  = useState([]);
  const [stats,    setStats]    = useState(null);
  const [days,     setDays]     = useState(30);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [sortBy,   setSortBy]   = useState("fraud_count");

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [hRes, sRes] = await Promise.all([
        api.get(`/fraud/heatmap?days=${days}`),
        api.get("/fraud/statistics?days=" + days),
      ]);
      const data = hRes.data.heatmap || [];
      setHeatmap(data);
      setTopCity([...data].sort((a, b) => b.fraud_count - a.fraud_count).slice(0, 10));
      setStats(sRes.data.statistics);
    } catch { toast.error("Failed to load heatmap data"); }
    finally  { setLoading(false); }
  }, [days]);

  useEffect(() => {
  if (isAuthenticated) {
    fetch();
  }
}, [isAuthenticated, fetch]);

  const sorted = [...heatmap].sort((a, b) => b[sortBy] - a[sortBy]);

  return (
    <div className="animate-fade-in">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="page-title">🗺️ Risk Heatmap</h1>
            <p className="page-subtitle">City-level fraud distribution and geographic risk analysis</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {[7, 14, 30, 90].map((d) => (
              <button key={d} onClick={() => setDays(d)}
                className={`btn btn-sm ${days === d ? "btn-primary" : "btn-outline"}`}>
                {d}d
              </button>
            ))}
            <button className="btn btn-outline btn-sm" onClick={fetch}>🔄</button>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────── */}
      {stats && (
        <div className="grid-4" style={{ marginBottom: 28 }}>
          {[
            { icon: "🏙️",  label: "Cities Monitored", value: heatmap.length, color: "#00f0ff" },
            { icon: "🚨",  label: "Fraud Cases",        value: stats.fraud_count?.toLocaleString(), color: "#ff4444" },
            { icon: "📊",  label: "Fraud Rate",          value: `${stats.fraud_rate}%`, color: "#ff8c00" },
            { icon: "💰",  label: "Fraud Amount",        value: `₹${(stats.fraud_amount / 100000).toFixed(1)}L`, color: "#7b2ff7" },
          ].map((c) => (
            <div key={c.label} className="stat-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ color: "#666", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{c.label}</p>
                  <p style={{ color: c.color, fontSize: 26, fontWeight: 800, marginTop: 8 }}>{c.value}</p>
                </div>
                <span style={{ fontSize: 30 }}>{c.icon}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Charts row ──────────────────────────────────── */}
      <div className="grid-2" style={{ marginBottom: 28 }}>

        {/* Top cities bar */}
        <div className="card">
          <h3 style={{ color: "#00f0ff", marginBottom: 20, fontSize: 15, fontWeight: 700 }}>
            🏆 Top 10 Fraud Cities
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topCity} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#555", fontSize: 10 }} />
              <YAxis dataKey="city" type="category" tick={{ fill: "#888", fontSize: 11 }} width={90} />
              <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #00f0ff30", color: "#fff", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="fraud_count" name="Fraud Cases" radius={[0, 4, 4, 0]}>
                {topCity.map((c, i) => (
                  <Cell key={i} fill={getRiskColor(c.fraud_rate)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fraud rate scatter */}
        <div className="card">
          <h3 style={{ color: "#00f0ff", marginBottom: 20, fontSize: 15, fontWeight: 700 }}>
            📡 Volume vs Fraud Rate
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="total"       name="Total Txns" tick={{ fill: "#555", fontSize: 10 }} label={{ value: "Total", position: "bottom", fill: "#555", fontSize: 10 }} />
              <YAxis dataKey="fraud_rate"  name="Fraud Rate %" tick={{ fill: "#555", fontSize: 10 }} />
              <ZAxis dataKey="fraud_count" range={[40, 400]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div style={{ background: "#1a1a2e", border: "1px solid #00f0ff30", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
                      <p style={{ color: "#00f0ff", fontWeight: 700 }}>{d?.city}</p>
                      <p style={{ color: "#ccc" }}>Total: {d?.total}</p>
                      <p style={{ color: "#ff4444" }}>Fraud: {d?.fraud_count}</p>
                      <p style={{ color: "#ff8c00" }}>Rate: {d?.fraud_rate}%</p>
                    </div>
                  );
                }}
              />
              <Scatter data={heatmap} fill="#00f0ff">
                {heatmap.map((c, i) => (
                  <Cell key={i} fill={getRiskColor(c.fraud_rate)} opacity={0.85} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── City Grid Cards ──────────────────────────────── */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ color: "#00f0ff", fontSize: 15, fontWeight: 700 }}>🗂️ City Risk Grid</h3>
          <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            style={{ width: 180, fontSize: 12 }}>
            <option value="fraud_count">Sort by Fraud Count</option>
            <option value="fraud_rate">Sort by Fraud Rate</option>
            <option value="total">Sort by Total</option>
            <option value="avg_risk">Sort by Avg Risk</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div className="loader" style={{ width: 32, height: 32, margin: "0 auto 12px" }} />
            <p style={{ color: "#00f0ff" }}>Loading heatmap…</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 14 }}>
            {sorted.map((city) => {
              const riskLvl = getRiskLabel(city.fraud_rate);
              const color   = getRiskColor(city.fraud_rate);
              return (
                <div key={city.city}
                  onClick={() => setSelected(selected?.city === city.city ? null : city)}
                  style={{
                    background: selected?.city === city.city ? "rgba(0,240,255,0.06)" : "#1a1a2e",
                    border: `1px solid ${selected?.city === city.city ? "rgba(0,240,255,0.4)" : `${color}30`}`,
                    borderTop: `3px solid ${color}`,
                    borderRadius: 12, padding: 16, cursor: "pointer", transition: "all 0.2s",
                  }}
                >
                  <p style={{ color: "#e0e0ff", fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
                    📍 {city.city}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#666" }}>Total</span>
                      <span style={{ color: "#ccc", fontWeight: 600 }}>{city.total?.toLocaleString()}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#666" }}>Fraud</span>
                      <span style={{ color, fontWeight: 700 }}>{city.fraud_count}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#666" }}>Rate</span>
                      <span style={{ color, fontWeight: 700 }}>{city.fraud_rate}%</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <div className="risk-bar">
                      <div style={{ height: "100%", width: `${Math.min(city.fraud_rate * 2, 100)}%`,
                        borderRadius: 4, background: color }} />
                    </div>
                  </div>
                  <div style={{ marginTop: 8, textAlign: "right" }}>
                    <span className={`badge badge-${riskLvl}`}>{riskLvl}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Selected City Details ────────────────────────── */}
      {selected && (
        <div className="card" style={{ border: "1px solid rgba(0,240,255,0.3)" }}>
          <h3 style={{ color: "#00f0ff", marginBottom: 16, fontSize: 15 }}>
            📍 {selected.city} — Detailed Analytics
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
            {[
              ["Total Transactions", selected.total?.toLocaleString(), "#00f0ff"],
              ["Fraud Cases",        selected.fraud_count, "#ff4444"],
              ["Fraud Rate",         `${selected.fraud_rate}%`, "#ff8c00"],
              ["Avg Risk Score",     `${((selected.avg_risk || 0) * 100).toFixed(1)}%`, "#7b2ff7"],
              ["Total Amount",       `₹${(selected.total_amount / 100000).toFixed(1)}L`, "#00e676"],
              ["Risk Level",         getRiskLabel(selected.fraud_rate).toUpperCase(), getRiskColor(selected.fraud_rate)],
            ].map(([k, v, c]) => (
              <div key={k} style={{ background: "#1a1a2e", padding: "14px 16px", borderRadius: 10 }}>
                <p style={{ color: "#666", fontSize: 11, marginBottom: 6 }}>{k}</p>
                <p style={{ color: c, fontWeight: 700, fontSize: 18 }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskHeatmap;