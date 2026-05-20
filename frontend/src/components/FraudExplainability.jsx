// ============================================================
// FILE: frontend/src/components/FraudExplainability.jsx
// DESCRIPTION: SHAP + LIME visualisation component
// ============================================================

import React, { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis,
} from "recharts";

const SHAP_POS   = "#ff4444";
const SHAP_NEG   = "#00e676";
const LIME_POS   = "#ff8c00";
const LIME_NEG   = "#7b2ff7";

const RiskGauge = ({ score, level }) => {
  const deg   = score * 180;
  const color = { low: "#00e676", medium: "#ffc107", high: "#ff8c00", critical: "#ff4444" }[level] || "#888";
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", width: 160, height: 80, margin: "0 auto" }}>
        <svg width={160} height={80} viewBox="0 0 160 80">
          {/* Background arc */}
          <path d="M 10 80 A 70 70 0 0 1 150 80" stroke="#1a1a2e" strokeWidth={14} fill="none" />
          {/* Scored arc */}
          <path d="M 10 80 A 70 70 0 0 1 150 80"
            stroke={color} strokeWidth={14} fill="none"
            strokeDasharray={`${score * 220} 220`}
            style={{ transition: "stroke-dasharray 1s ease" }} />
          {/* Needle */}
          <line
            x1={80} y1={80}
            x2={80 + 60 * Math.cos((Math.PI - (deg * Math.PI) / 180))}
            y2={80 - 60 * Math.sin((Math.PI - (deg * Math.PI) / 180))}
            stroke={color} strokeWidth={3} strokeLinecap="round"
            style={{ transition: "all 1s ease" }}
          />
          <circle cx={80} cy={80} r={5} fill={color} />
        </svg>
        <div style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
          <p style={{ color, fontWeight: 800, fontSize: 22 }}>{(score * 100).toFixed(1)}%</p>
          <span className={`badge badge-${level}`} style={{ fontSize: 10 }}>{level}</span>
        </div>
      </div>
    </div>
  );
};

const FraudExplainability = ({ data }) => {
  const [activeTab, setActiveTab] = useState("overview");

  if (!data) return (
    <div style={{ textAlign: "center", padding: 40, color: "#555" }}>
      No analysis data available
    </div>
  );

  const { prediction, shap_explanation, lime_explanation, feature_importance, risk_summary } = data;
  const txn  = data.transaction;
  const pred = risk_summary || prediction || {};

  // ── Build chart data ────────────────────────────────────
  const shapChartData = (shap_explanation?.feature_contributions || [])
    .slice(0, 8)
    .map((f) => ({
      name:   f.display_name || f.feature,
      value:  parseFloat(f.shap_value?.toFixed(4) || 0),
      color:  (f.shap_value || 0) > 0 ? SHAP_POS : SHAP_NEG,
    }));

  const limeChartData = (lime_explanation?.lime_contributions || [])
    .slice(0, 8)
    .map((f) => ({
      name:   f.display_name || f.feature_name || f.feature_rule,
      value:  parseFloat((f.lime_weight || 0).toFixed(4)),
      color:  (f.lime_weight || 0) > 0 ? LIME_POS : LIME_NEG,
    }));

  const importanceData = (
    (feature_importance?.xgboost || feature_importance?.random_forest || [])
  ).slice(0, 6).map((f) => ({
    subject: f.display_name || f.feature,
    A:       parseFloat((f.importance * 100).toFixed(1)),
  }));

  const modelPreds = pred.model_predictions || {};

  const tabs = [
    { key: "overview",    label: "🎯 Overview" },
    { key: "shap",        label: "📊 SHAP" },
    { key: "lime",        label: "🔬 LIME" },
    { key: "importance",  label: "⭐ Importance" },
  ];

  return (
    <div>

      {/* ── Tab bar ─────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`btn btn-sm ${activeTab === key ? "btn-primary" : "btn-outline"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ────────────────────────────────── */}
      {activeTab === "overview" && (
        <div>
          {/* Risk gauge + summary */}
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 20, marginBottom: 20 }}>
            <div style={{ background: "#1a1a2e", borderRadius: 14, padding: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <RiskGauge score={pred.fraud_score || 0} level={pred.risk_level || "low"} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                ["Is Fraud",    pred.is_fraud ? "⚠️ YES" : "✅ NO",  pred.is_fraud ? "#ff4444" : "#00e676"],
                ["Confidence",  `${((pred.confidence || 0) * 100).toFixed(1)}%`, "#00f0ff"],
                ["Model Used",  pred.ensemble_method || "ensemble", "#7b2ff7"],
                ["Risk Level",  (pred.risk_level || "low").toUpperCase(), { low:"#00e676",medium:"#ffc107",high:"#ff8c00",critical:"#ff4444" }[pred.risk_level] || "#888"],
              ].map(([k, v, c]) => (
                <div key={k} style={{ background: "#1a1a2e", padding: "12px 14px", borderRadius: 10 }}>
                  <p style={{ color: "#666", fontSize: 10, marginBottom: 4 }}>{k}</p>
                  <p style={{ color: c, fontWeight: 700, fontSize: 14 }}>{v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Model breakdown */}
          {Object.keys(modelPreds).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ color: "#888", fontSize: 12, marginBottom: 10 }}>Model Predictions:</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {Object.entries(modelPreds).map(([model, score]) => (
                  <div key={model} style={{
                    background: "#1a1a2e", padding: "8px 14px", borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}>
                    <p style={{ color: "#555", fontSize: 10 }}>{model.replace(/_/g, " ")}</p>
                    <p style={{ color: score > 0.5 ? "#ff4444" : "#00e676", fontWeight: 700, fontSize: 14 }}>
                      {(score * 100).toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SHAP text explanation */}
          {shap_explanation?.explanation_text && (
            <div style={{ background: "#1a1a2e", padding: 16, borderRadius: 10, border: "1px solid rgba(0,240,255,0.1)" }}>
              <p style={{ color: "#00f0ff", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>🔍 AI Explanation</p>
              <p style={{ color: "#ccc", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-line" }}>
                {shap_explanation.explanation_text}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── SHAP tab ────────────────────────────────────── */}
      {activeTab === "shap" && (
        <div>
          <p style={{ color: "#888", fontSize: 12, marginBottom: 16 }}>
            SHAP values show each feature's contribution to the fraud prediction.
            <span style={{ color: "#ff4444" }}> Red = increases fraud risk. </span>
            <span style={{ color: "#00e676" }}> Green = decreases fraud risk.</span>
          </p>

          {shapChartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={shapChartData} layout="vertical" barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#555", fontSize: 10 }}
                    tickFormatter={(v) => v > 0 ? `+${v.toFixed(3)}` : v.toFixed(3)} />
                  <YAxis dataKey="name" type="category" tick={{ fill: "#888", fontSize: 11 }} width={150} />
                  <Tooltip
                    contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8, color: "#fff", fontSize: 12 }}
                    formatter={(v) => [`${v > 0 ? "+" : ""}${v.toFixed(4)}`, "SHAP Value"]}
                  />
                  <Bar dataKey="value" name="SHAP Value" radius={[0, 4, 4, 0]}>
                    {shapChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Feature rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                {(shap_explanation?.top_features || []).slice(0, 5).map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "#1a1a2e", padding: "10px 14px", borderRadius: 10 }}>
                    <span style={{ fontSize: 16 }}>{f.shap_value > 0 ? "⬆️" : "⬇️"}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ color: "#e0e0ff", fontSize: 12 }}>{f.display_name || f.feature}</span>
                        <span style={{ color: f.shap_value > 0 ? SHAP_POS : SHAP_NEG, fontWeight: 700, fontSize: 12 }}>
                          {f.shap_value > 0 ? "+" : ""}{f.shap_value.toFixed(4)}
                        </span>
                      </div>
                      <div className="risk-bar">
                        <div style={{
                          height: "100%", borderRadius: 4,
                          width: `${Math.min(Math.abs(f.shap_value || 0) * 300, 100)}%`,
                          background: f.shap_value > 0 ? SHAP_POS : SHAP_NEG,
                        }} />
                      </div>
                      <p style={{ color: "#555", fontSize: 10, marginTop: 2 }}>
                        Value: {f.feature_value?.toFixed(2)} · {f.impact}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ color: "#555", textAlign: "center", padding: 40 }}>
              SHAP explanation not available. Train ML models to enable.
            </p>
          )}
        </div>
      )}

      {/* ── LIME tab ────────────────────────────────────── */}
      {activeTab === "lime" && (
        <div>
          <p style={{ color: "#888", fontSize: 12, marginBottom: 16 }}>
            LIME provides local interpretable explanations for individual predictions.
            Each rule shows how the feature value influenced this specific decision.
          </p>

          {limeChartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={limeChartData} layout="vertical" barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#555", fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: "#888", fontSize: 10 }} width={140} />
                  <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8, color: "#fff", fontSize: 12 }}
                    formatter={(v) => [`${v.toFixed(4)}`, "LIME Weight"]} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {limeChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {(lime_explanation?.top_lime_features || []).map((f, i) => (
                <div key={i} style={{ background: "#1a1a2e", padding: "10px 14px", borderRadius: 10, marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#ccc", fontSize: 12 }}>{f.feature_rule}</span>
                    <span style={{ color: (f.lime_weight || 0) > 0 ? LIME_POS : LIME_NEG, fontWeight: 700, fontSize: 12 }}>
                      {(f.lime_weight || 0).toFixed(4)}
                    </span>
                  </div>
                  <p style={{ color: "#555", fontSize: 10, marginTop: 4 }}>{f.impact}</p>
                </div>
              ))}
            </>
          ) : (
            <p style={{ color: "#555", textAlign: "center", padding: 40 }}>
              LIME explanation not available. Train ML models to enable.
            </p>
          )}
        </div>
      )}

      {/* ── Feature Importance tab ──────────────────────── */}
      {activeTab === "importance" && (
        <div>
          <p style={{ color: "#888", fontSize: 12, marginBottom: 16 }}>
            Global feature importance shows which features the model relies on most across all predictions.
          </p>

          {importanceData.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={importanceData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#888", fontSize: 10 }} />
                  <Radar name="Importance" dataKey="A" stroke="#00f0ff" fill="#00f0ff" fillOpacity={0.12} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
                {(feature_importance?.xgboost || feature_importance?.random_forest || []).slice(0, 8).map((f, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "#ccc", fontSize: 12 }}>{f.display_name || f.feature}</span>
                      <span style={{ color: "#00f0ff", fontWeight: 700, fontSize: 12 }}>
                        {f.percentage?.toFixed(1)}%
                      </span>
                    </div>
                    <div className="risk-bar">
                      <div style={{
                        height: "100%", borderRadius: 4,
                        width: `${f.percentage || 0}%`,
                        background: `hsl(${180 - i * 20}, 80%, 50%)`,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ color: "#555", textAlign: "center", padding: 40 }}>
              Feature importance not available. Train ML models to enable.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default FraudExplainability;