// ============================================================
// FILE: frontend/src/pages/FraudPanel.jsx
// DESCRIPTION: Fraud detection panel with logs, review, explainability
// ============================================================

import React, { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import api from "../services/api";
import FraudExplainability from "../components/FraudExplainability";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";


const LEVEL_COLORS = { low: "#00e676", medium: "#ffc107", high: "#ff8c00", critical: "#ff4444" };

const FraudPanel = () => {
  const { isAuthenticated, user } = useAuth();
  if (user?.role === "user") {
  return (
    <h2 style={{ color: "red", textAlign: "center", marginTop: 50 }}>
      ❌ Access Denied
    </h2>
  );
}
  const [logs,       setLogs]       = useState([]);
  const [total,      setTotal]      = useState(0);
  const [pages,      setPages]      = useState(1);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [stats,      setStats]      = useState(null);
  const [trends,     setTrends]     = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [explain,    setExplain]    = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [reviewing,  setReviewing]  = useState(false);
  const [filters,    setFilters]    = useState({ fraud_level: "", review_status: "" });
  const [reviewForm, setReviewForm] = useState({ review_status: "", review_notes: "", action_taken: "" });
  const finalStatus =
  selected?.final_status ??
  selected?.transaction?.status ??
  "unknown";
  const overrideTransaction = async (txnId, status) => {
  try {
    await api.put(`/transactions/admin/transactions/${txnId}/override`, {
      status: status
    });

    toast.success(`Transaction ${status}`);
    fetchLogs(); // refresh data

  } catch (err) {
    toast.error("Action failed ❌");
  }
};
  // ── Fetch ────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 12, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) };
      const res = await api.get("/fraud/logs", {
  params: {
    page,
    per_page: 12,
    fraud_level: "high"   // ✅ ADD THIS
  }
});
      setLogs(res.data.logs);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch { toast.error("Failed to load fraud logs"); }
    finally  { setLoading(false); }
  }, [page, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const [sRes, tRes] = await Promise.all([
        api.get("/fraud/statistics?days=30"),
        api.get("/fraud/trends?days=14"),
      ]);
      setStats(sRes.data.statistics);
      setTrends(tRes.data.trends);
    } catch {}
  }, []);

  useEffect(() => {
  if (isAuthenticated) {
    fetchLogs();
    fetchStats();
  }
}, [isAuthenticated, fetchLogs, fetchStats]);
  // ── Explain ──────────────────────────────────────────────
  const handleExplain = async (log) => {
    setSelected(log);
    setExplain(null);
    setExplaining(true);
    try {
      const res = await api.get(`/fraud/explain/${log.transaction_id}`);
      setExplain(res.data);
    } catch { toast.error("Explanation failed"); }
    finally  { setExplaining(false); }
  };

  // ── Review ───────────────────────────────────────────────
  const handleReview = async (logId) => {
    if (!reviewForm.review_status) { toast.error("Select a review status"); return; }
    setReviewing(true);
    try {
      await api.put(`/fraud/logs/${logId}/review`, {
        status: reviewForm.review_status,
        notes: reviewForm.review_notes,
        action: reviewForm.action_taken
      });
      toast.success("Fraud log reviewed");
      setSelected(null);
      fetchLogs();
    } catch { toast.error("Review failed"); }
    finally  { setReviewing(false); }
  };

  // ── Helpers ──────────────────────────────────────────────
  const filterSet = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };

  return (
    <div className="animate-fade-in">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="page-header">
        <h1 className="page-title">🚨 Fraud Detection Panel</h1>
        <p className="page-subtitle">AI-powered fraud investigation & explainability workspace</p>
      </div>

      {/* ── Stats row ───────────────────────────────────── */}
      {stats && (
        <div className="grid-4" style={{ marginBottom: 28 }}>
          {[
            { icon: "🚨", label: "Fraud (30d)",  value: stats.fraud_count,    color: "#ff4444" },
            { icon: "📊", label: "Fraud Rate",   value: `${stats.fraud_rate}%`, color: "#ff8c00" },
            { icon: "🚫", label: "Blocked",      value: stats.blocked,        color: "#ff4444" },
            { icon: "⚠️", label: "Flagged",      value: stats.flagged,        color: "#ffc107" },
          ].map((c) => (
            <div key={c.label} className="stat-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ color: "#666", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{c.label}</p>
                  <p style={{ color: c.color, fontSize: 26, fontWeight: 800, marginTop: 8 }}>
                    {typeof c.value === "number" ? c.value.toLocaleString() : c.value}
                  </p>
                </div>
                <span style={{ fontSize: 28 }}>{c.icon}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Trend chart ─────────────────────────────────── */}
      {trends.length > 0 && (
        <div className="card" style={{ marginBottom: 28 }}>
          <h3 style={{ color: "#00f0ff", marginBottom: 20, fontSize: 15 }}>📈 14-Day Fraud Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: "#555", fontSize: 10 }} tickFormatter={(v) => v?.slice(5)} />
              <YAxis tick={{ fill: "#555", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #00f0ff30", color: "#fff", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="fraud_count" name="Fraud" fill="#ff4444" radius={[3, 3, 0, 0]} />
              <Bar dataKey="total"       name="Total" fill="rgba(0,240,255,0.2)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <select className="form-select" value={filters.fraud_level}
            onChange={(e) => filterSet("fraud_level", e.target.value)} style={{ fontSize: 12 }}>
            <option value="">All Risk Levels</option>
            {["low","medium","high","critical"].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select className="form-select" value={filters.review_status}
            onChange={(e) => filterSet("review_status", e.target.value)} style={{ fontSize: 12 }}>
            <option value="">All Review Status</option>
            {["pending","confirmed_fraud","false_positive","under_review","not_required"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button className="btn btn-outline btn-sm" onClick={() => { setFilters({ fraud_level: "", review_status: "" }); setPage(1); }}>
            🔄 Clear Filters
          </button>
        </div>
      </div>

      {/* ── Main grid: Logs + Detail Panel ──────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 20 }}>

        {/* Logs list */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ color: "#00f0ff", fontSize: 15 }}>🗂️ Fraud Logs ({total})</h3>
            <button className="btn btn-outline btn-sm" onClick={fetchLogs}>🔄</button>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 60 }}>
              <div className="loader" style={{ width: 32, height: 32, margin: "0 auto 12px" }} />
              <p style={{ color: "#00f0ff" }}>Loading…</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {logs.length === 0 ? (
                <p style={{ color: "#555", textAlign: "center", padding: 40 }}>No fraud logs found</p>
              ) : logs.map((log) => (
                <div key={log.id}
                  onClick={() => { setSelected(log); setExplain(null); }}
                  style={{
                    background: selected?.id === log.id ? "rgba(0,240,255,0.06)" : "#1a1a2e",
                    border: `1px solid ${selected?.id === log.id ? "rgba(0,240,255,0.4)" : "rgba(255,255,255,0.05)"}`,
                    borderRadius: 10, padding: "14px 16px", cursor: "pointer", transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { if (selected?.id !== log.id) e.currentTarget.style.borderColor = "rgba(0,240,255,0.2)"; }}
                  onMouseLeave={(e) => { if (selected?.id !== log.id) e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <p style={{ color: "#e0e0ff", fontSize: 13, fontWeight: 600 }}>
                        {log.transaction?.merchant_name || "Unknown Merchant"}
                      </p>
                      <p style={{ color: "#555", fontSize: 11, marginTop: 3 }}>
                        Log #{log.id} · {log.ml_model_used}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className={`badge badge-${log.fraud_level}`}>
                        {log.fraud_level}
                      </span>
                      <p style={{ color: "#ff4444", fontWeight: 700, fontSize: 13, marginTop: 4 }}>
                        ₹{log.transaction?.amount?.toLocaleString() || "—"}
                      </p>
                    </div>
                  </div>
                  {/* Score bar */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "#888", fontSize: 10 }}>Fraud Score</span>
                      <span style={{ color: LEVEL_COLORS[log.fraud_level] || "#888", fontSize: 10, fontWeight: 700 }}>
                        {((log.fraud_score || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="risk-bar">
                      <div className={`risk-fill ${log.fraud_level}`}
                        style={{ width: `${(log.fraud_score || 0) * 100}%` }} />
                    </div>
                  </div>
                  <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{
                      background: log.review_status === "pending" ? "rgba(255,193,7,0.15)" : "rgba(0,230,118,0.1)",
                      color: log.review_status === "pending" ? "#ffc107" : "#00e676",
                      fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700,
                    }}>
                      {(log.review_status || "pending").replace(/_/g, " ").toUpperCase()}
                    </span>
                    <p style={{ color: "#444", fontSize: 10 }}>
                      {new Date(log.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
              <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>←</button>
              <span style={{ color: "#888", fontSize: 13, alignSelf: "center" }}>{page}/{pages}</span>
              <button className="btn btn-outline btn-sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>→</button>
            </div>
          )}
        </div>

        {/* Detail / Explain Panel */}
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Log details */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ color: "#00f0ff", fontSize: 15 }}>📋 Log Details #{selected.id}</h3>
                <button onClick={() => { setSelected(null); setExplain(null); }}
                  style={{ background: "none", border: "none", color: "#888", fontSize: 20, cursor: "pointer" }}>✕</button>
              </div>

               
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                
                {[
                  ["Fraud Score",  `${((selected.fraud_score || 0) * 100).toFixed(1)}%`],
                  ["Risk Level",   selected.fraud_level],
                  ["Confidence",   `${((selected.confidence_score || 0) * 100).toFixed(1)}%`],
                  ["Model",        selected.ml_model_used],
                  ["Review",       selected.review_status],
                  ["Final Status", finalStatus], 
                  ["City",         selected.transaction?.city || "—"],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: "#1a1a2e", padding: "10px 12px", borderRadius: 8 }}>
                    <p style={{ color: "#666", fontSize: 10, marginBottom: 4 }}>{k}</p>
                    <p style={{ color: "#e0e0ff", fontWeight: 600 }}>{v}</p>
                  </div>
                ))}
              </div>

              {/* Explain button */}
              <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
                onClick={() => handleExplain(selected)} disabled={explaining}>
                {explaining
                  ? <><span className="loader" style={{ width: 14, height: 14 }} /> Running AI Explanation…</>
                  : "🔬 Generate SHAP + LIME Explanation"}
              </button>
            </div>

            {/* SHAP / LIME explanation */}
            {explain && (
              <div className="card">
                <FraudExplainability data={explain} />
              </div>
            )}

            {/* Review form */}
            <div className="card">
              <h3 style={{ color: "#00f0ff", marginBottom: 16, fontSize: 14 }}>✅ Review Decision</h3>
              <div style={{ display: "flex", gap: 10, marginTop: 15 }}>

  <button
    className="btn btn-success"
    onClick={() => overrideTransaction(selected.transaction.transaction_id, "approved")}
  >
    ✅ Approve
  </button>

  <button
    className="btn btn-danger"
    onClick={() => overrideTransaction(selected.transaction.transaction_id, "blocked")}
  >
    🚫 Block
  </button>

  <button
    className="btn btn-warning"
    onClick={() => overrideTransaction(selected.transaction.transaction_id, "under_investigation")}
  >
    🔍 Investigate
  </button>

</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <select className="form-select" value={reviewForm.review_status}
                  onChange={(e) => setReviewForm((f) => ({ ...f, review_status: e.target.value }))}>
                  <option value="">-- Select Decision --</option>
                  <option value="confirmed_fraud">🚨 Confirmed Fraud → Block</option>
                  <option value="false_positive">✅ False Positive → Approve</option>
                  <option value="under_review">🔍 Keep Under Review</option>
                </select>
                <input className="form-input" placeholder="Action taken (optional)"
                  value={reviewForm.action_taken}
                  onChange={(e) => setReviewForm((f) => ({ ...f, action_taken: e.target.value }))} />
                <textarea className="form-input" placeholder="Review notes…"
                  value={reviewForm.review_notes} rows={3}
                  onChange={(e) => setReviewForm((f) => ({ ...f, review_notes: e.target.value }))}
                  style={{ resize: "vertical" }} />
                <button className="btn btn-primary" style={{ justifyContent: "center" }}
                  onClick={() => handleReview(selected.id)} disabled={reviewing}>
                  {reviewing ? "Submitting…" : "📝 Submit Review"}
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default FraudPanel;