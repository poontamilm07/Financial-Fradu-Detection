// ============================================================
// FILE: frontend/src/pages/Reports.jsx
// DESCRIPTION: Report generation - PDF / Excel / CSV export
// ============================================================

import React, { useState, useEffect } from "react";
import { reportsAPI } from "../services/api";
import toast from "react-hot-toast";

const Reports = () => {
  const [stats,      setStats]      = useState(null);
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");
  const [loading,    setLoading]    = useState(false);
  const [statsLoad,  setStatsLoad]  = useState(false);
  const [activeType, setActiveType] = useState(null);

  // ── Load stats ────────────────────────────────────────────
  const loadStats = async () => {
    setStatsLoad(true);
    try {
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo)   params.date_to   = dateTo;
      const res = await reportsAPI.getStats(params);
      setStats(res.data.stats);
    } catch { toast.error("Failed to load report stats"); }
    finally  { setStatsLoad(false); }
  };

  useEffect(() => { loadStats(); }, []);

  // ── Download ──────────────────────────────────────────────
  const download = async (type) => {
    setLoading(true);
    setActiveType(type);
    try {
      const payload = { type };
      if (dateFrom) payload.date_from = dateFrom;
      if (dateTo)   payload.date_to   = dateTo;

      const res = await reportsAPI.generate(payload);

      const mimeMap = {
        pdf:   "application/pdf",
        excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        csv:   "text/csv",
      };
      const extMap = { pdf: ".pdf", excel: ".xlsx", csv: ".csv" };
      const blob = new Blob([res.data], { type: mimeMap[type] });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `fraud_report_${new Date().toISOString().slice(0, 10)}${extMap[type]}`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`${type.toUpperCase()} report downloaded! 📄`);
    } catch { toast.error(`Failed to generate ${type.toUpperCase()} report`); }
    finally  { setLoading(false); setActiveType(null); }
  };

  const fmtAmt = (n) => `₹${(Number(n || 0) / 100000).toFixed(2)}L`;

  return (
    <div className="animate-fade-in">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="page-header">
        <h1 className="page-title">📄 Reports & Export</h1>
        <p className="page-subtitle">Generate and download detailed fraud analytics reports</p>
      </div>

      {/* ── Date filters ────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 28 }}>
        <h3 style={{ color: "#00f0ff", marginBottom: 16, fontSize: 15, fontWeight: 700 }}>
          📅 Report Period
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 12, alignItems: "end" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">From Date</label>
            <input type="date" className="form-input" value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">To Date</label>
            <input type="date" className="form-input" value={dateTo}
              onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={loadStats} disabled={statsLoad}
            style={{ alignSelf: "end" }}>
            {statsLoad ? <><span className="loader" style={{ width: 14, height: 14 }} /> Loading…</> : "📊 Preview Stats"}
          </button>
          <button className="btn btn-outline" style={{ alignSelf: "end" }}
            onClick={() => { setDateFrom(""); setDateTo(""); }}>
            🔄 All Time
          </button>
        </div>

        {/* Quick presets */}
        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { label: "Today",     days: 0 },
            { label: "Last 7d",   days: 7 },
            { label: "Last 30d",  days: 30 },
            { label: "Last 90d",  days: 90 },
          ].map(({ label, days }) => (
            <button key={label} className="btn btn-outline btn-sm"
              onClick={() => {
                const to   = new Date();
                const from = new Date();
                from.setDate(from.getDate() - days);
                setDateTo(to.toISOString().slice(0, 10));
                setDateFrom(from.toISOString().slice(0, 10));
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats Preview ───────────────────────────────── */}
      {stats && (
        <div className="grid-4" style={{ marginBottom: 28 }}>
          {[
            { icon: "💳", label: "Total Transactions", value: stats.total?.toLocaleString(),         color: "#00f0ff" },
            { icon: "🚨", label: "Fraud Cases",         value: stats.fraud_count?.toLocaleString(),  color: "#ff4444" },
            { icon: "📊", label: "Fraud Rate",           value: `${stats.fraud_rate?.toFixed(2)}%`,  color: "#ff8c00" },
            { icon: "💰", label: "Fraud Amount",         value: fmtAmt(stats.fraud_amount),          color: "#7b2ff7" },
          ].map((c) => (
            <div key={c.label} className="stat-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ color: "#666", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{c.label}</p>
                  <p style={{ color: c.color, fontSize: 24, fontWeight: 800, marginTop: 8 }}>{c.value}</p>
                </div>
                <span style={{ fontSize: 28 }}>{c.icon}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Export Buttons ──────────────────────────────── */}
      <div className="grid-3" style={{ marginBottom: 28 }}>

        {/* PDF */}
        <div className="card" style={{ textAlign: "center", padding: 32 }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = "#00f0ff"}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(0,240,255,0.15)"}
        >
          <div style={{ fontSize: 52, marginBottom: 16 }}>📄</div>
          <h3 style={{ color: "#00f0ff", marginBottom: 8, fontSize: 17 }}>PDF Report</h3>
          <p style={{ color: "#666", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
            Professional dark-themed PDF with summary statistics, executive overview, and transaction details table.
          </p>
          <div style={{ marginBottom: 16 }}>
            {["Executive Summary", "Transaction Table", "Fraud Highlights", "Dark Professional Theme"].map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, textAlign: "left" }}>
                <span style={{ color: "#00e676" }}>✓</span>
                <span style={{ color: "#888", fontSize: 12 }}>{f}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}
            onClick={() => download("pdf")} disabled={loading && activeType === "pdf"}>
            {loading && activeType === "pdf"
              ? <><span className="loader" style={{ width: 14, height: 14 }} /> Generating…</>
              : "⬇️ Download PDF"}
          </button>
        </div>

        {/* Excel */}
        <div className="card" style={{ textAlign: "center", padding: 32 }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = "#00e676"}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(0,240,255,0.15)"}
        >
          <div style={{ fontSize: 52, marginBottom: 16 }}>📊</div>
          <h3 style={{ color: "#00e676", marginBottom: 8, fontSize: 17 }}>Excel Report</h3>
          <p style={{ color: "#666", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
            Multi-sheet Excel workbook with Summary, All Transactions, and Fraud-only sheets, colour coded.
          </p>
          <div style={{ marginBottom: 16 }}>
            {["Summary Sheet", "All Transactions Sheet", "Fraud-Only Sheet", "Colour-coded Rows"].map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, textAlign: "left" }}>
                <span style={{ color: "#00e676" }}>✓</span>
                <span style={{ color: "#888", fontSize: 12 }}>{f}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-success" style={{ width: "100%", justifyContent: "center" }}
            onClick={() => download("excel")} disabled={loading && activeType === "excel"}>
            {loading && activeType === "excel"
              ? <><span className="loader" style={{ width: 14, height: 14 }} /> Generating…</>
              : "⬇️ Download Excel"}
          </button>
        </div>

        {/* CSV */}
        <div className="card" style={{ textAlign: "center", padding: 32 }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = "#7b2ff7"}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(0,240,255,0.15)"}
        >
          <div style={{ fontSize: 52, marginBottom: 16 }}>📋</div>
          <h3 style={{ color: "#7b2ff7", marginBottom: 8, fontSize: 17 }}>CSV Export</h3>
          <p style={{ color: "#666", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
            Raw CSV file compatible with Excel, Google Sheets, Python Pandas, and all analytics tools.
          </p>
          <div style={{ marginBottom: 16 }}>
            {["UTF-8 Encoded", "All Columns Included", "Metadata Header", "Universal Compatibility"].map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, textAlign: "left" }}>
                <span style={{ color: "#00e676" }}>✓</span>
                <span style={{ color: "#888", fontSize: 12 }}>{f}</span>
              </div>
            ))}
          </div>
          <button className="btn" style={{ width: "100%", justifyContent: "center", background: "#7b2ff7", color: "#fff" }}
            onClick={() => download("csv")} disabled={loading && activeType === "csv"}>
            {loading && activeType === "csv"
              ? <><span className="loader" style={{ width: 14, height: 14 }} /> Generating…</>
              : "⬇️ Download CSV"}
          </button>
        </div>
      </div>

      {/* ── Info Banner ─────────────────────────────────── */}
      <div className="alert-banner" style={{ background: "rgba(0,240,255,0.05)", border: "1px solid rgba(0,240,255,0.15)", color: "#00f0ff" }}>
        <span style={{ fontSize: 20 }}>ℹ️</span>
        <p style={{ fontSize: 13 }}>
          Reports are generated in real-time from your database. Select a date range to filter data, then choose your preferred format.
          PDF reports include up to 200 rows; Excel and CSV include all records.
        </p>
      </div>
    </div>
  );
};

export default Reports;