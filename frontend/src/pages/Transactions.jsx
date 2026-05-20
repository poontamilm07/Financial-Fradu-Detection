// ============================================================
// FILE: frontend/src/pages/Transactions.jsx
// DESCRIPTION: Full CRUD transactions page with filters + AI
// ============================================================

import React, { useState, useEffect, useCallback } from "react";
import { transactionsAPI } from "../services/api";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import FraudExplainability from "../components/FraudExplainability";
import toast from "react-hot-toast";

const STATUSES    = ["approved", "flagged", "blocked", "under_investigation", "pending"];
const RISK_LEVELS = ["low", "medium", "high", "critical"];
const CATEGORIES  = ["food","shopping","travel","entertainment","utilities","healthcare","education","electronics","gambling","crypto","other"];
const PAY_METHODS = ["card","upi","netbanking","wallet","cash"];
const TXN_TYPES   = ["debit","credit","transfer","withdrawal"];


const statusColor = (s) =>
  ({ approved: "#00e676", flagged: "#ff8c00", blocked: "#ff4444",
     under_investigation: "#7b2ff7", pending: "#888" }[s] || "#888");


     const Field = ({ label, value, onChange, type = "text", placeholder = "" }) => (
  <div className="form-group">
    <label>{label}</label>
    <input
  type={type}
  inputMode={type === "text" ? "numeric" : undefined}
  className="form-input"
  placeholder={placeholder}
  value={value || ""}
  onChange={(e) => onChange(e.target.value)}
/>
  </div>
);

// ── Add / Edit Modal ───────────────────────────────────────
const TxnModal = ({ isOpen, onClose, onSubmit, txn, mode, handlePreCheck, preRisk }) => {
  const init = {
    amount: "", merchant_name: "", merchant_category: "shopping",
    transaction_type: "debit", payment_method: "card",
    city: "", device_type: "mobile", status: "pending",
  };
  const [form, setForm] = useState(init);
  
  const [busy, setBusy] = useState(false);

  useEffect(() => {
  if (isOpen) {
    setForm(txn ? { ...txn } : init);
  }
}, [isOpen]);   // ✅ ONLY depend on isOpen

  if (!isOpen) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

 const handleSubmit = async () => {
  // ✅ ADD VALIDATION HERE (TOP)

  if (Number(form.amount) <= 0) {
    toast.error("Amount must be greater than 0");
    return;
  }

  if (Number(form.amount) > 1000000) {
    toast.error("Amount too large ⚠️");
    return;
  }

  // ✅ EXISTING CODE
  setBusy(true);
  await onSubmit(form);
  setBusy(false);
};
  

  const Select = ({ label, k, opts }) => (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label className="form-label">{label}</label>
      <select className="form-select" value={form[k] || ""} onChange={(e) => set(k, e.target.value)}>
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#12121f", border: "1px solid rgba(0,240,255,0.2)",
        borderRadius: 20, padding: 32, width: 580, maxHeight: "92vh", overflowY: "auto",
        boxShadow: "0 0 60px rgba(0,240,255,0.1)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <h3 style={{ color: "#00f0ff", fontSize: 18, fontWeight: 700 }}>
            {mode === "create" ? "➕ New Transaction" : "✏️ Edit Transaction"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
         <Field
          label="Amount (₹)"
          type="text"
          value={form.amount}
          onChange={(v) => set("amount", v)}
         />
          <Field
            label="Merchant Name"
            value={form.merchant_name}
            onChange={(v) => set("merchant_name", v)}
          />
          <Field
           label="City"
           value={form.city}
           onChange={(v) => set("city", v)}
           />
          <Field
              label="Device Type"
              value={form.device_type}
               onChange={(v) => set("device_type", v)}
          />
          <Select label="Category"      k="merchant_category"  opts={CATEGORIES} />
          <Select label="Payment"       k="payment_method"     opts={PAY_METHODS} />
          <Select label="Type"          k="transaction_type"   opts={TXN_TYPES} />
          {mode === "edit" && <Select label="Status" k="status" opts={STATUSES} />}
        </div>
        {/* ✅ ADD THIS HERE EXACTLY */}
{preRisk && (
  <div style={{
    marginTop: 15,
    padding: 12,
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10
  }}>

    {preRisk?.risk_level === "high" && (
  <div style={{
    marginTop: 10,
    padding: 10,
    background: "#330000",
    color: "#ff4444",
    borderRadius: 8
  }}>
    🚫 High risk detected. Transaction will be BLOCKED.
  </div>
)}
    <p>
  <b>Risk Level:</b>{" "}
  <span style={{
    color:
      preRisk.risk_level === "high" ? "#ff4444" :
      preRisk.risk_level === "medium" ? "#ffaa00" :
      "#00e676"
  }}>
    {preRisk.risk_level.toUpperCase()}
  </span>
</p>
    <p><b>Fraud Score:</b> {(preRisk.fraud_score * 100).toFixed(1)}%</p>
  </div>
)}

        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>

  {/* ✅ ADD THIS BUTTON */}
  <button
    className="btn btn-outline"
    onClick={() => handlePreCheck(form)}
  >
    ⚠️ Check Risk Before Submit
  </button>

  {/* EXISTING BUTTON */}
  <button
  className="btn btn-primary"
  style={{ flex: 1, justifyContent: "center" }}
  onClick={handleSubmit}
  disabled={busy || preRisk?.risk_level === "high"}
>
    {busy ? "Processing..." :
      mode === "create" ? "🤖 Analyze & Create" : "✅ Save Changes"}
  </button>

  <button className="btn btn-outline" onClick={onClose}>Cancel</button>
</div>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────
const Transactions = () => {
  const { isAnalyst, user } = useAuth();
  const isUser = user?.role === "user";
  const [preRisk, setPreRisk] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [total,    setTotal]    = useState(0);
  const [pages,    setPages]    = useState(1);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);

  const [filters, setFilters] = useState({
    search: "", status: "", risk_level: "", city: "", date_from: "", date_to: "",
  });
 const handlePreCheck = async (data) => {
  try {
    const res = await api.post("/fraud/predict", {
      amount: Number(data.amount),
      merchant_name: data.merchant_name,
      category: data.merchant_category,
      payment_method: data.payment_method,
      transaction_type: data.transaction_type,
      city: data.city,
      device_type: data.device_type
    });

    setPreRisk({
      risk_level: res.data.risk_level,
      fraud_score: res.data.fraud_score
    });

  } catch (err) {
  console.error("FULL ERROR:", err.response || err);
  toast.error(err.response?.data?.error || "Risk check failed ❌");
}
};
  const [modal, setModal] = useState({ open: false, mode: "create", txn: null });
  const [analyzeTarget, setAnalyzeTarget] = useState(null);
  const [analysis,      setAnalysis]      = useState(null);
  const [analyzing,     setAnalyzing]     = useState(false);

  // ── Fetch ────────────────────────────────────────────────
  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page, per_page: 15,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      };
      const res = await transactionsAPI.getAll(params);
      setTransactions(res.data.transactions);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch { toast.error("Failed to load transactions"); }
    finally  { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetch(); }, [fetch]);

  // ── CRUD handlers ────────────────────────────────────────
  const handleCreate = async (data) => {
    try {
      const res = await transactionsAPI.create(data);
      if (res.data.transaction.risk_level === "high") {
  toast.error("🚫 Transaction BLOCKED due to high risk!");
  setModal({ open: false, mode: "create", txn: null }); // ✅ close modal
  return;
}

    toast.success("✅ Transaction created");
      toast[res.data.transaction.is_fraud ? "error" : "success"](
        res.data.transaction.is_fraud
          ? "🚨 Transaction flagged as FRAUD!"
          : "✅ Transaction created successfully"
      );
      setModal({ open: false, mode: "create", txn: null });
      fetch();
    } catch (e) { toast.error(e.response?.data?.error || "Create failed"); }
  };

  const handleUpdate = async (data) => {
    try {
      await transactionsAPI.update(modal.txn.id, data);
      toast.success("Transaction updated");
      setModal({ open: false, mode: "create", txn: null });
      fetch();
    } catch { toast.error("Update failed"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transaction? This cannot be undone.")) return;
    try {
      await transactionsAPI.delete(id);
      toast.success("Transaction deleted");
      fetch();
    } catch { toast.error("Delete failed"); }
  };

  const handleAnalyze = async (txn) => {
    setAnalyzeTarget(txn);
    setAnalysis(null);
    setAnalyzing(true);
    try {
      const res = await transactionsAPI.analyze(txn.id);
      setAnalysis(res.data);
    } catch { toast.error("Analysis failed"); } 
    finally  { setAnalyzing(false); }
  };

  const filterSet = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };
  const clearFilters = () => { setFilters({ search:"",status:"",risk_level:"",city:"",date_from:"",date_to:"" }); setPage(1); };

  return (
    <div className="animate-fade-in">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="page-title">💳 Transactions</h1>
            <p className="page-subtitle">{total.toLocaleString()} total records</p>
          </div>
          <button
  className="btn btn-primary"
  onClick={() => {
    setPreRisk(null);
    setModal({ open: true, mode: "create", txn: null });
  }}
>
  ➕ Add Transaction
</button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
          <input className="form-input" placeholder="🔍 Search ID / Merchant…"
            value={filters.search} onChange={(e) => filterSet("search", e.target.value)}
            style={{ fontSize: 12 }} />
          <select className="form-select" value={filters.status}
            onChange={(e) => filterSet("status", e.target.value)} style={{ fontSize: 12 }}>
            <option value="">All Status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-select" value={filters.risk_level}
            onChange={(e) => filterSet("risk_level", e.target.value)} style={{ fontSize: 12 }}>
            <option value="">All Risk</option>
            {RISK_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input className="form-input" type="date" value={filters.date_from}
            onChange={(e) => filterSet("date_from", e.target.value)} style={{ fontSize: 12 }} />
          <input className="form-input" type="date" value={filters.date_to}
            onChange={(e) => filterSet("date_to", e.target.value)} style={{ fontSize: 12 }} />
          <button className="btn btn-outline btn-sm" onClick={clearFilters}>🔄 Clear</button>
        </div>
      </div>

      {/* ── AI Analysis Panel ───────────────────────────── */}
      {analyzeTarget && (
        <div className="card" style={{ marginBottom: 20, border: "1px solid rgba(0,240,255,0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ color: "#00f0ff", fontSize: 15, fontWeight: 700 }}>
              🔬 AI Analysis: {analyzeTarget.transaction_id}
            </h3>
            <button onClick={() => { setAnalyzeTarget(null); setAnalysis(null); }}
              style={{ background: "none", border: "none", color: "#888", fontSize: 20, cursor: "pointer" }}>✕</button>
          </div>
          {analyzing ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div className="loader" style={{ width: 36, height: 36, margin: "0 auto 12px" }} />
              <p style={{ color: "#00f0ff" }}>Running AI Analysis (SHAP + LIME)…</p>
            </div>
          ) : analysis && (
            <FraudExplainability data={analysis} />
          )}
        </div>
      )}

      {/* ── Table ───────────────────────────────────────── */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div className="loader" style={{ width: 36, height: 36, margin: "0 auto 12px" }} />
            <p style={{ color: "#00f0ff" }}>Loading transactions…</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  {["Transaction ID","User","Amount","Merchant","City","Status","Risk","Score","Date","Actions"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: "center", padding: 48, color: "#555" }}>
                      No transactions found. Try adjusting your filters.
                    </td>
                  </tr>
                ) : transactions.map((txn) => (
                  <tr key={txn.id}>
                    <td style={{ fontFamily: "monospace", color: "#00f0ff", fontSize: 11 }}>
                      {(txn.transaction_id || "").slice(0, 14)}…
                    </td>
                    <td style={{ color: "#ccc", fontSize: 12 }}>{txn.user || "—"}</td>
                    <td style={{ color: txn.is_fraud ? "#ff4444" : "#00e676", fontWeight: 700 }}>
                      ₹{parseFloat(txn.amount || 0).toLocaleString()}
                    </td>
                    <td style={{ color: "#bbb", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {txn.merchant_name || "—"}
                    </td>
                    <td style={{ color: "#888", fontSize: 12 }}>{txn.city || "—"}</td>
                    <td>
                      <span style={{ color: statusColor(txn.status), fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                        ● {txn.status}
                      </span>
                    </td>
                    <td><span style={{
  padding: "4px 8px",
  borderRadius: 6,
  background:
    txn.risk_level === "high" ? "#ff4444" :
    txn.risk_level === "medium" ? "#ffaa00" :
    "#00e676",
  color: "#000",
  fontSize: 11
}}>
  {txn.risk_level.toUpperCase()}
</span></td>
                    <td>
                      <span style={{ color: (txn.risk_score || 0) > 0.5 ? "#ff4444" : "#888", fontSize: 12 }}>
                        {((txn.risk_score || 0) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ color: "#555", fontSize: 11 }}>{txn.transaction_date || "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 5 }}>

                          {/* Only Analyst/Admin can analyze */}
                          {!isUser && (
                          <button
                             className="btn btn-outline btn-sm"
                             style={{ padding: "4px 9px", fontSize: 12 }}
                              onClick={() => handleAnalyze(txn)}
                                title="AI Analyze"
                           >
                               🔬
                          </button>
                                   )}

  {(isAnalyst() || user?.role === "admin") && <>
                          <button className="btn btn-outline btn-sm"
                            style={{ padding: "4px 9px", fontSize: 12 }}
                            onClick={() => setModal({ open: true, mode: "edit", txn })} title="Edit">✏️</button>
                          <button className="btn btn-danger btn-sm"
                            style={{ padding: "4px 9px", fontSize: 12 }}
                            onClick={() => handleDelete(txn.id)} title="Delete">🗑️</button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
            {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={`btn btn-sm ${p === page ? "btn-primary" : "btn-outline"}`}
                style={{ minWidth: 36 }}>{p}</button>
            ))}
            <button className="btn btn-outline btn-sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>Next →</button>
          </div>
        )}
      </div>

      <TxnModal
  isOpen={modal.open}
  onClose={() => {
  setPreRisk(null);
  setModal({ open: false, mode: "create", txn: null });
}}
  onSubmit={modal.mode === "create" ? handleCreate : handleUpdate}
  txn={modal.txn}
  mode={modal.mode}
  handlePreCheck={handlePreCheck}
  preRisk={preRisk}              // ✅ ADD THIS
/>
    </div>
  );
};

export default Transactions;