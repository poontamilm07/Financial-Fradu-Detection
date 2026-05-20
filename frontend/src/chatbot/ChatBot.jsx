// ============================================================
// FILE: frontend/src/chatbot/ChatBot.jsx
// DESCRIPTION: AI fraud analytics chatbot with Gemini / local AI
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from "react";
import { chatbotAPI } from "../services/api";

const QUICK_QUESTIONS = [
  { label: "📊 Fraud Stats",      msg: "Show me fraud statistics" },
  { label: "🗺️ City Analysis",   msg: "City-wise fraud analysis" },
  { label: "🎯 Risk Scores",      msg: "Explain risk score levels" },
  { label: "📈 Fraud Trends",     msg: "Show fraud trends" },
  { label: "🚫 Blocked Txns",     msg: "Show blocked transactions summary" },
  { label: "🤖 How AI Works",    msg: "How does the fraud detection AI work?" },
];

const formatMsg = (text) =>
  text
    .replace(/\*\*(.*?)\*\*/g, "<strong style='color:#00f0ff'>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em style='color:#ccc'>$1</em>")
    .replace(/`(.*?)`/g, "<code style='background:#1a1a2e;padding:1px 5px;border-radius:3px;color:#00e676;font-size:12px'>$1</code>")
    .replace(/\n/g, "<br/>");

const TypingDots = () => (
  <div style={{ display: "flex", gap: 4, padding: "6px 2px" }}>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{
        width: 7, height: 7, borderRadius: "50%", background: "#00f0ff",
        animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
      }} />
    ))}
  </div>
);

const ChatBot = () => {
  const [isOpen,   setIsOpen]   = useState(false);
  const [minimised,setMinimised]= useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `👋 Hello! I'm **FraudGuard AI** — your intelligent fraud analytics assistant.\n\nI have real-time access to your fraud detection data and can help with:\n• 📊 Fraud statistics & analytics\n• 🗺️ City-wise risk analysis\n• 🎯 Risk score explanations\n• 📈 Trend analysis\n• 🤖 AI model explanations\n\nWhat would you like to know?`,
      timestamp: new Date(),
    },
  ]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && !minimised) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, minimised]);

  useEffect(() => {
    if (isOpen && !minimised) inputRef.current?.focus();
  }, [isOpen, minimised]);

  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg = { role: "user", content: msg, timestamp: new Date() };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);

    try {
      const res = await chatbotAPI.sendMessage(msg);
      setMessages((m) => [...m, {
        role: "assistant",
        content: res.data.response,
        timestamp: new Date(),
        context: res.data.context,
      }]);
    } catch {
      setMessages((m) => [...m, {
        role: "assistant",
        content: "⚠️ I encountered an error fetching data. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const clearChat = () => setMessages([{
    role: "assistant",
    content: "🔄 Chat cleared. How can I help you with fraud analytics?",
    timestamp: new Date(),
  }]);

  return (
    <>
      {/* ── FAB ───────────────────────────────────────────── */}
      <button onClick={() => { setIsOpen((o) => !o); setMinimised(false); }}
        style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 999,
          width: 60, height: 60, borderRadius: "50%",
          background: isOpen ? "#1a1a2e" : "linear-gradient(135deg, #00f0ff, #7b2ff7)",
          border: isOpen ? "2px solid #00f0ff" : "none",
          cursor: "pointer", fontSize: 26,
          boxShadow: "0 4px 24px rgba(0,240,255,0.35)",
          transition: "all 0.3s ease",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
      >
        {isOpen ? "✕" : "🤖"}
      </button>

      {/* Unread badge */}
      {!isOpen && (
        <div style={{
          position: "fixed", bottom: 78, right: 26, zIndex: 1000,
          background: "#ff4444", color: "#fff", fontSize: 9, fontWeight: 700,
          padding: "2px 6px", borderRadius: 10, pointerEvents: "none",
        }}>LIVE</div>
      )}

      {/* ── Chat window ──────────────────────────────────── */}
      {isOpen && (
        <div style={{
          position: "fixed", bottom: 100, right: 28, zIndex: 1000,
          width: 400, height: minimised ? 60 : 620,
          background: "#12121f",
          border: "1px solid rgba(0,240,255,0.2)",
          borderRadius: 20, overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(0,240,255,0.08)",
          display: "flex", flexDirection: "column",
          animation: "fadeIn 0.3s ease",
          transition: "height 0.3s ease",
        }}>

          {/* Header */}
          <div style={{
            padding: "14px 18px",
            background: "linear-gradient(135deg, rgba(0,240,255,0.06), rgba(123,47,247,0.06))",
            borderBottom: "1px solid rgba(0,240,255,0.1)",
            display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
          }}>
            <span style={{ fontSize: 26 }}>🤖</span>
            <div style={{ flex: 1 }}>
              <p style={{ color: "#00f0ff", fontWeight: 700, fontSize: 14, lineHeight: 1 }}>FraudGuard AI</p>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                <div className="live-dot" style={{ width: 6, height: 6 }} />
                <span style={{ color: "#00e676", fontSize: 10 }}>Online · Real-time data</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={clearChat} title="Clear chat"
                style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 14, padding: "4px 6px" }}>🗑️</button>
              <button onClick={() => setMinimised((m) => !m)}
                style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 14, padding: "4px 6px" }}>
                {minimised ? "⬆️" : "⬇️"}
              </button>
              <button onClick={() => setIsOpen(false)}
                style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 16, padding: "4px 6px" }}>✕</button>
            </div>
          </div>

          {!minimised && (
            <>
              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px" }}>
                {messages.map((msg, idx) => (
                  <div key={idx} style={{
                    display: "flex",
                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                    marginBottom: 14,
                  }}>
                    {msg.role === "assistant" && (
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #00f0ff, #7b2ff7)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, marginRight: 8, flexShrink: 0, alignSelf: "flex-end",
                      }}>🤖</div>
                    )}
                    <div style={{
                      maxWidth: "82%",
                      background: msg.role === "user"
                        ? "linear-gradient(135deg, rgba(0,240,255,0.12), rgba(123,47,247,0.12))"
                        : "#1a1a2e",
                      border: `1px solid ${msg.role === "user" ? "rgba(0,240,255,0.25)" : "rgba(255,255,255,0.04)"}`,
                      borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      padding: "11px 14px",
                    }}>
                      <div style={{ color: "#e0e0ff", fontSize: 13, lineHeight: 1.65 }}
                        dangerouslySetInnerHTML={{ __html: formatMsg(msg.content) }} />
                      <p style={{ color: "#333", fontSize: 10, marginTop: 6, textAlign: "right" }}>
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#00f0ff,#7b2ff7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
                    <div style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "16px 16px 16px 4px", padding: "12px 16px" }}>
                      <TypingDots />
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* Quick questions */}
              <div style={{ padding: "6px 12px", borderTop: "1px solid rgba(255,255,255,0.04)", overflowX: "auto", whiteSpace: "nowrap" }}>
                {QUICK_QUESTIONS.map(({ label, msg }, i) => (
                  <button key={i} onClick={() => sendMessage(msg)}
                    style={{
                      display: "inline-block", marginRight: 6,
                      background: "rgba(0,240,255,0.04)",
                      border: "1px solid rgba(0,240,255,0.15)",
                      color: "#888", padding: "4px 10px", borderRadius: 20,
                      fontSize: 11, cursor: "pointer", transition: "all 0.2s", flexShrink: 0,
                    }}
                    onMouseEnter={(e) => { e.target.style.borderColor = "#00f0ff"; e.target.style.color = "#00f0ff"; }}
                    onMouseLeave={(e) => { e.target.style.borderColor = "rgba(0,240,255,0.15)"; e.target.style.color = "#888"; }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 8 }}>
                <input ref={inputRef}
                  className="form-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Ask about fraud data…"
                  disabled={loading}
                  style={{ flex: 1, fontSize: 13, padding: "10px 14px" }}
                />
                <button className="btn btn-primary btn-sm"
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  style={{ padding: "10px 14px", flexShrink: 0 }}>
                  {loading ? <span className="loader" style={{ width: 14, height: 14 }} /> : "➤"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default ChatBot;