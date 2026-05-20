import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
// ─── Utility: random number in range ───────────────────────────────────────
const rand = (min, max) => Math.random() * (max - min) + min;

// ─── Particle Canvas Background ────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const PARTICLE_COUNT = 90;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: rand(0, window.innerWidth),
      y: rand(0, window.innerHeight),
      vx: rand(-0.3, 0.3),
      vy: rand(-0.3, 0.3),
      r: rand(1, 2.5),
      alpha: rand(0.2, 0.7),
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,224,255,${p.alpha})`;
        ctx.fill();
      });

      // Draw connecting lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0,224,255,${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 0,
        pointerEvents: "none",
        opacity: 0.45,
      }}
    />
  );
}

// ─── Scanline Overlay ───────────────────────────────────────────────────────
function Scanlines() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
        background:
          "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px)",
      }}
    />
  );
}

// ─── Glitch Text ────────────────────────────────────────────────────────────
function GlitchText({ children, className = "", style = {} }) {
  return (
    <span className={`glitch-text ${className}`} style={style}>
      {children}
    </span>
  );
}

// ─── Animated Counter ────────────────────────────────────────────────────────
function AnimCounter({ target, suffix = "", duration = 2000 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        obs.disconnect();
        let start = null;
        const step = (ts) => {
          if (!start) start = ts;
          const p = Math.min((ts - start) / duration, 1);
          setVal(Math.floor(p * target));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.5 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

// ─── Live Fraud Ticker ───────────────────────────────────────────────────────
const TICKER_EVENTS = [
  "🚨 ALERT: Suspicious transaction blocked — Mumbai, ₹4,82,000",
  "⚠️  HIGH RISK: Card cloning detected — New Delhi",
  "✅ CLEARED: Transaction verified — Bangalore, ₹1,20,500",
  "🔴 CRITICAL: Account takeover attempt — Chennai",
  "⚠️  FLAGGED: Unusual velocity — Hyderabad, ₹67,300",
  "🚨 ALERT: International fraud pattern — Kolkata",
  "✅ APPROVED: Behavioral match confirmed — Pune, ₹3,45,000",
  "🔴 BLOCKED: Geo-anomaly detected — Ahmedabad, ₹8,90,100",
];

function LiveTicker() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % TICKER_EVENTS.length);
        setVisible(true);
      }, 400);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        background: "rgba(0,224,255,0.06)",
        border: "1px solid rgba(0,224,255,0.2)",
        borderRadius: 4,
        padding: "10px 20px",
        fontFamily: "'Courier New', monospace",
        fontSize: 13,
        color: "#00e0ff",
        display: "flex",
        alignItems: "center",
        gap: 12,
        overflow: "hidden",
        maxWidth: 700,
        margin: "0 auto",
      }}
    >
      <span
        style={{
          background: "#ff2d55",
          color: "#fff",
          fontSize: 10,
          padding: "2px 8px",
          borderRadius: 2,
          fontWeight: 700,
          letterSpacing: 1,
          flexShrink: 0,
          animation: "blink 1s steps(1) infinite",
        }}
      >
        LIVE
      </span>
      <span
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 0.3s",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {TICKER_EVENTS[idx]}
      </span>
    </div>
  );
}

// ─── Threat Meter ────────────────────────────────────────────────────────────
function ThreatMeter() {
  const [level, setLevel] = useState(72);
  useEffect(() => {
    const t = setInterval(() => {
      setLevel((l) => Math.max(40, Math.min(95, l + rand(-5, 5))));
    }, 2000);
    return () => clearInterval(t);
  }, []);

  const color =
    level < 50 ? "#00ff88" : level < 70 ? "#ffd700" : level < 85 ? "#ff8c00" : "#ff2d55";
  const label =
    level < 50 ? "LOW" : level < 70 ? "MODERATE" : level < 85 ? "HIGH" : "CRITICAL";

  return (
    <div
      style={{
        background: "rgba(10,14,26,0.9)",
        border: `1px solid ${color}44`,
        borderRadius: 8,
        padding: "20px 28px",
        minWidth: 220,
      }}
    >
      <div style={{ fontSize: 11, color: "#8899aa", letterSpacing: 2, marginBottom: 10 }}>
        THREAT LEVEL
      </div>
      <div style={{ fontSize: 36, fontWeight: 800, color, fontFamily: "'Courier New', monospace" }}>
        {label}
      </div>
      <div
        style={{
          height: 6,
          background: "#1a2030",
          borderRadius: 3,
          marginTop: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${level}%`,
            background: `linear-gradient(90deg, #00ff88, ${color})`,
            borderRadius: 3,
            transition: "width 1.5s ease, background 1.5s ease",
            boxShadow: `0 0 8px ${color}88`,
          }}
        />
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color,
          fontFamily: "'Courier New', monospace",
          marginTop: 8,
        }}
      >
        {Math.round(level)}%
      </div>
    </div>
  );
}

// ─── Mini Chart (sparkline) ──────────────────────────────────────────────────
function Sparkline({ data, color = "#00e0ff", height = 60 }) {
  const w = 200;
  const h = height;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min + 1)) * h;
    return `${x},${y}`;
  });
  const d = `M ${pts.join(" L ")}`;
  const fill = `M 0,${h} L ${pts.join(" L ")} L ${w},${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#sg-${color.replace("#","")})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

// ─── Stats Card ──────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, suffix, sub, color, spark }) {
  return (
    <div
      style={{
        background: "rgba(10,14,26,0.85)",
        border: `1px solid ${color}33`,
        borderRadius: 10,
        padding: "24px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        position: "relative",
        overflow: "hidden",
        transition: "border-color 0.3s, transform 0.3s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${color}88`;
        e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${color}33`;
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 80,
          height: 80,
          background: `radial-gradient(circle at 100% 0%, ${color}18, transparent 70%)`,
        }}
      />
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 11, color: "#8899aa", letterSpacing: 2 }}>{label}</div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          color,
          fontFamily: "'Courier New', monospace",
        }}
      >
        <AnimCounter target={value} suffix={suffix} />
      </div>
      <div style={{ fontSize: 12, color: "#556677" }}>{sub}</div>
      {spark && (
        <div style={{ marginTop: 8 }}>
          <Sparkline data={spark} color={color} />
        </div>
      )}
    </div>
  );
}

// ─── Feature Card ────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, accent, delay = 0 }) {
  const [vis, setVis] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        background: "rgba(10,14,26,0.9)",
        border: `1px solid ${accent}22`,
        borderRadius: 12,
        padding: "32px 28px",
        opacity: vis ? 1 : 0,
        transform: vis ? "translateY(0)" : "translateY(30px)",
        transition: `opacity 0.6s ${delay}ms, transform 0.6s ${delay}ms, border-color 0.3s`,
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${accent}66`;
        e.currentTarget.style.boxShadow = `0 0 30px ${accent}18`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${accent}22`;
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          background: `${accent}18`,
          border: `1px solid ${accent}44`,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          marginBottom: 20,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: "#e0eaf8",
          marginBottom: 10,
          letterSpacing: 0.3,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 14, color: "#5a7080", lineHeight: 1.7 }}>{desc}</div>
    </div>
  );
}

// ─── Tech Badge ───────────────────────────────────────────────────────────────
function TechBadge({ label, color = "#00e0ff", icon }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "rgba(10,14,26,0.9)",
        border: `1px solid ${color}33`,
        borderRadius: 8,
        padding: "12px 20px",
        transition: "all 0.25s",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${color}88`;
        e.currentTarget.style.transform = "scale(1.04)";
        e.currentTarget.style.boxShadow = `0 0 18px ${color}22`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${color}33`;
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#c0d4e8" }}>{label}</span>
    </div>
  );
}

// ─── Dashboard Preview ────────────────────────────────────────────────────────
function DashboardPreview() {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setPulse((p) => !p), 1500);
    return () => clearInterval(t);
  }, []);

  const bars = [55, 40, 72, 30, 65, 88, 45, 60, 77, 50, 83, 38];
  const fraudBars = [12, 8, 25, 5, 15, 40, 10, 18, 30, 9, 35, 7];

  return (
    <div
      style={{
        background: "rgba(6,10,20,0.95)",
        border: "1px solid rgba(0,224,255,0.18)",
        borderRadius: 14,
        padding: 24,
        fontFamily: "'Courier New', monospace",
        boxShadow: "0 0 60px rgba(0,224,255,0.08)",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: "1px solid rgba(0,224,255,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#ff2d55",
              boxShadow: pulse ? "0 0 10px #ff2d55" : "none",
              transition: "box-shadow 0.5s",
            }}
          />
          <span style={{ fontSize: 12, color: "#00e0ff", letterSpacing: 2 }}>
            FINSHIELD AI — LIVE MONITORING
          </span>
        </div>
        <span style={{ fontSize: 11, color: "#445566" }}>
          {new Date().toLocaleTimeString()}
        </span>
      </div>

      {/* Mini KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { l: "TRANSACTIONS", v: "48,291", c: "#00e0ff" },
          { l: "FRAUD BLOCKED", v: "1,847", c: "#ff2d55" },
          { l: "RISK SCORE", v: "72.4%", c: "#ffd700" },
          { l: "ACCURACY", v: "99.3%", c: "#00ff88" },
        ].map((k) => (
          <div
            key={k.l}
            style={{
              background: "rgba(0,224,255,0.04)",
              border: `1px solid ${k.c}22`,
              borderRadius: 8,
              padding: "12px 14px",
            }}
          >
            <div style={{ fontSize: 9, color: "#556677", letterSpacing: 1.5, marginBottom: 4 }}>
              {k.l}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "#445566", letterSpacing: 1.5, marginBottom: 10 }}>
          TRANSACTION VOLUME vs FRAUD RATE
        </div>
        <svg width="100%" height={100} viewBox="0 0 600 100">
          {bars.map((h, i) => (
            <g key={i}>
              <rect
                x={i * 50 + 2}
                y={100 - h}
                width={22}
                height={h}
                fill="rgba(0,224,255,0.15)"
                rx={2}
              />
              <rect
                x={i * 50 + 26}
                y={100 - fraudBars[i]}
                width={18}
                height={fraudBars[i]}
                fill="rgba(255,45,85,0.4)"
                rx={2}
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Recent alerts */}
      <div>
        <div style={{ fontSize: 10, color: "#445566", letterSpacing: 1.5, marginBottom: 10 }}>
          RECENT ALERTS
        </div>
        {[
          { id: "TXN-9823", risk: "CRITICAL", city: "Mumbai", amt: "₹4,82,000", color: "#ff2d55" },
          { id: "TXN-9817", risk: "HIGH", city: "Delhi", amt: "₹1,20,300", color: "#ff8c00" },
          { id: "TXN-9811", risk: "MEDIUM", city: "Bangalore", amt: "₹45,600", color: "#ffd700" },
        ].map((a) => (
          <div
            key={a.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 12px",
              borderRadius: 6,
              marginBottom: 6,
              background: `${a.color}08`,
              border: `1px solid ${a.color}22`,
            }}
          >
            <span style={{ fontSize: 11, color: "#7899aa" }}>{a.id}</span>
            <span
              style={{
                fontSize: 10,
                color: a.color,
                background: `${a.color}18`,
                padding: "2px 8px",
                borderRadius: 3,
              }}
            >
              {a.risk}
            </span>
            <span style={{ fontSize: 11, color: "#556677" }}>{a.city}</span>
            <span style={{ fontSize: 11, color: "#c0d0e0" }}>{a.amt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ label, title, sub, accent = "#00e0ff" }) {
  const [vis, setVis] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        textAlign: "center",
        marginBottom: 64,
        opacity: vis ? 1 : 0,
        transform: vis ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.7s, transform 0.7s",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: `${accent}12`,
          border: `1px solid ${accent}33`,
          borderRadius: 20,
          padding: "6px 18px",
          fontSize: 11,
          color: accent,
          letterSpacing: 2,
          marginBottom: 20,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: accent,
            display: "inline-block",
            animation: "blink 1.2s steps(1) infinite",
          }}
        />
        {label}
      </div>
      <h2
        style={{
          fontSize: "clamp(28px, 4vw, 44px)",
          fontWeight: 800,
          color: "#e0eaf8",
          margin: "0 0 16px",
          fontFamily: "'Orbitron', sans-serif",
          letterSpacing: 1,
        }}
      >
        {title}
      </h2>
      {sub && (
        <p
          style={{
            fontSize: 16,
            color: "#5a7080",
            maxWidth: 560,
            margin: "0 auto",
            lineHeight: 1.7,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Navbar({ onLogin, onRegister }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: "0 48px",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: scrolled ? "rgba(6,10,20,0.97)" : "transparent",
        borderBottom: scrolled ? "1px solid rgba(0,224,255,0.1)" : "1px solid transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        transition: "all 0.4s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            background: "linear-gradient(135deg, #00e0ff, #0050ff)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            boxShadow: "0 0 18px rgba(0,224,255,0.4)",
          }}
        >
          🛡️
        </div>
        <span
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: "#e0eaf8",
            fontFamily: "'Orbitron', sans-serif",
            letterSpacing: 1,
          }}
        >
          Fin<span style={{ color: "#00e0ff" }}>Shield</span> AI
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        {["Features", "Technology", "Analytics", "Security"].map((item) => (
          <a
            key={item}
            href={`#${item.toLowerCase()}`}
            style={{
              fontSize: 13,
              color: "#7899aa",
              textDecoration: "none",
              letterSpacing: 0.5,
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.color = "#00e0ff")}
            onMouseLeave={(e) => (e.target.style.color = "#7899aa")}
          >
            {item}
          </a>
        ))}
       <button
  onClick={onLogin}
  style={{
    background: "transparent",
    border: "1px solid rgba(0,224,255,0.4)",
    color: "#00e0ff",
    padding: "8px 18px",
    borderRadius: 6,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "'Orbitron', sans-serif",
    transition: "all 0.2s"
  }}
  onMouseEnter={(e) => {
    e.target.style.background = "rgba(0,224,255,0.1)";
  }}
  onMouseLeave={(e) => {
    e.target.style.background = "transparent";
  }}
>
  Login
</button>

<button
  onClick={onRegister}
  style={{
    background: "linear-gradient(135deg, #00e0ff, #0050ff)",
    border: "none",
    color: "#000",
    padding: "8px 18px",
    borderRadius: 6,
    fontSize: 13,
    cursor: "pointer",
    fontWeight: "600",
    fontFamily: "'Orbitron', sans-serif",
    boxShadow: "0 0 12px rgba(0,224,255,0.4)",
    transition: "all 0.2s"
  }}
  onMouseEnter={(e) => {
    e.target.style.transform = "translateY(-1px)";
  }}
  onMouseLeave={(e) => {
    e.target.style.transform = "translateY(0)";
  }}
>
  Register
</button>
      </div>
    </nav>
  );
}

// ─── Process Steps ────────────────────────────────────────────────────────────
function ProcessStep({ num, title, desc, accent, delay }) {
  const [vis, setVis] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        gap: 24,
        opacity: vis ? 1 : 0,
        transform: vis ? "translateX(0)" : "translateX(-30px)",
        transition: `opacity 0.6s ${delay}ms, transform 0.6s ${delay}ms`,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: `${accent}18`,
            border: `2px solid ${accent}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 700,
            color: accent,
            fontSize: 16,
            flexShrink: 0,
            boxShadow: `0 0 20px ${accent}33`,
          }}
        >
          {num}
        </div>
        <div
          style={{
            width: 1,
            flex: 1,
            background: `linear-gradient(${accent}55, transparent)`,
            marginTop: 8,
          }}
        />
      </div>
      <div style={{ paddingBottom: 40 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#e0eaf8",
            marginBottom: 8,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 14, color: "#5a7080", lineHeight: 1.7 }}>{desc}</div>
      </div>
    </div>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function FinShieldLanding() {
    const navigate = useNavigate();
  

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #050810; }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes glitch {
          0%,100% { clip-path: inset(0 0 95% 0); transform: translate(-2px,0); }
          20% { clip-path: inset(30% 0 40% 0); transform: translate(2px,0); }
          40% { clip-path: inset(60% 0 20% 0); transform: translate(-1px,0); }
          60% { clip-path: inset(10% 0 80% 0); transform: translate(3px,0); }
          80% { clip-path: inset(80% 0 5% 0); transform: translate(-3px,0); }
        }
        @keyframes scanDown {
          from { top: -10%; }
          to { top: 110%; }
        }
        @keyframes pulseRing {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0,224,255,0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 20px rgba(0,224,255,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0,224,255,0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes scan {
          from { transform: translateY(-100%); }
          to { transform: translateY(400%); }
        }
        .glitch-text {
          position: relative;
          display: inline-block;
        }
        .glitch-text::before, .glitch-text::after {
          content: attr(data-text);
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          color: inherit;
        }
        .glitch-text::before {
          left: 2px;
          text-shadow: -2px 0 #ff2d55;
          animation: glitch 3s infinite linear;
          opacity: 0.6;
        }
        .glitch-text::after {
          left: -2px;
          text-shadow: 2px 0 #00e0ff;
          animation: glitch 2.5s 0.5s infinite linear;
          opacity: 0.6;
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg, #050810 0%, #080d1a 40%, #060912 100%)",
          color: "#e0eaf8",
          fontFamily: "'Space Mono', monospace",
          position: "relative",
          overflowX: "hidden",
        }}
      >
        <ParticleCanvas />
        <Scanlines />

        {/* Radial glow center */}
        <div
          style={{
            position: "fixed",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 600,
            height: 600,
            background:
              "radial-gradient(circle, rgba(0,80,255,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <Navbar 
  onLogin={() => navigate("/login")}
  onRegister={() => navigate("/register")}
/>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section
          style={{
            position: "relative",
            zIndex: 2,
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "120px 24px 80px",
          }}
        >
          {/* Classification badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(255,45,85,0.1)",
              border: "1px solid rgba(255,45,85,0.4)",
              borderRadius: 4,
              padding: "6px 18px",
              fontSize: 11,
              color: "#ff2d55",
              letterSpacing: 3,
              marginBottom: 32,
              animation: "fadeInUp 0.8s ease both",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#ff2d55",
                animation: "blink 1s steps(1) infinite",
                display: "inline-block",
              }}
            />
            CLASSIFIED — GOVERNMENT GRADE — LEVEL 5 CLEARANCE
          </div>

          {/* Main heading */}
          <div
            style={{
              animation: "fadeInUp 0.8s 0.15s ease both",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontSize: "clamp(13px, 2vw, 16px)",
                color: "#00e0ff",
                letterSpacing: 4,
                fontFamily: "'Orbitron', sans-serif",
                marginBottom: 16,
              }}
            >
              Financial Fraud Detection System
            </div>
            <h1
              style={{
                fontSize: "clamp(36px, 6.5vw, 88px)",
                fontWeight: 900,
                fontFamily: "'Orbitron', sans-serif",
                lineHeight: 1.05,
                letterSpacing: 2,
                color: "#ffffff",
                textShadow: "0 0 60px rgba(0,224,255,0.3)",
              }}
            >
              FRAUD {" "}
              <span
                style={{
                  color: "#00e0ff",
                  textShadow:
                    "0 0 30px #00e0ff, 0 0 60px rgba(0,224,255,0.5)",
                }}
              >
                 GUARD
              </span>
              <br />
              <span style={{ fontSize: "0.6em", color: "#8899aa", letterSpacing: 4 }}>
                AI INTELLIGENCE SYSTEM
              </span>
            </h1>
          </div>

          <p
            style={{
              fontSize: "clamp(15px, 2vw, 18px)",
              color: "#5a7080",
              maxWidth: 640,
              lineHeight: 1.8,
              marginBottom: 48,
              animation: "fadeInUp 0.8s 0.3s ease both",
            }}
          >
            Real-time AI-powered fraud detection, behavioral analysis, and
            autonomous threat neutralization across India's financial grid.
            Protecting{" "}
            <span style={{ color: "#00e0ff" }}>₹12.4 trillion</span> in daily
            transactions.
          </p>

          {/* CTA buttons */}
          <div
            style={{
              display: "flex",
              gap: 16,
              marginBottom: 56,
              animation: "fadeInUp 0.8s 0.45s ease both",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => navigate("/login")}
              style={{
                background: "linear-gradient(135deg, #00e0ff 0%, #0050ff 100%)",
                border: "none",
                color: "#000",
                padding: "16px 40px",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: 1,
                fontFamily: "'Orbitron', sans-serif",
                boxShadow: "0 0 30px rgba(0,224,255,0.4)",
                animation: "pulseRing 2.5s infinite",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
            >
              ACCESS SYSTEM
            </button>
            <button
              onClick={() => navigate("/login")} 
              style={{
                background: "transparent",
                border: "1px solid rgba(0,224,255,0.35)",
                color: "#00e0ff",
                padding: "16px 40px",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: 1,
                fontFamily: "'Orbitron', sans-serif",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "rgba(0,224,255,0.1)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "transparent";
              }}
            >
              VIEW DEMO
            </button>
          </div>

          {/* Live ticker */}
          <div style={{ animation: "fadeInUp 0.8s 0.6s ease both", width: "100%", maxWidth: 700 }}>
            <LiveTicker />
          </div>

          {/* Scroll indicator */}
          <div
            style={{
              position: "absolute",
              bottom: 40,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              opacity: 0.4,
              animation: "float 2s ease-in-out infinite",
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: 2, color: "#445566" }}>SCROLL</div>
            <div
              style={{
                width: 1,
                height: 40,
                background: "linear-gradient(#00e0ff, transparent)",
              }}
            />
          </div>
        </section>

        {/* ── STATS ──────────────────────────────────────────────────────────── */}
        <section
          style={{
            position: "relative",
            zIndex: 2,
            padding: "80px 48px",
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 20,
            }}
          >
            <StatCard
              icon="🔍"
              label="TRANSACTIONS ANALYZED"
              value={48291847}
              suffix=""
              sub="Since deployment"
              color="#00e0ff"
              spark={[40, 55, 48, 72, 65, 80, 70, 88, 75, 92]}
            />
            <StatCard
              icon="🚨"
              label="FRAUD CASES BLOCKED"
              value={1847293}
              suffix=""
              sub="Lifetime total"
              color="#ff2d55"
              spark={[20, 35, 28, 45, 40, 58, 50, 68, 55, 72]}
            />
            <StatCard
              icon="🎯"
              label="DETECTION ACCURACY"
              value={99}
              suffix=".3%"
              sub="False positive rate: 0.002%"
              color="#00ff88"
              spark={[95, 96, 97, 96, 98, 97, 99, 98, 99, 99]}
            />
            <StatCard
              icon="⚡"
              label="AVG RESPONSE TIME"
              value={47}
              suffix="ms"
              sub="Real-time threat neutralization"
              color="#ffd700"
              spark={[80, 70, 65, 55, 60, 52, 48, 50, 47, 47]}
            />
          </div>
        </section>

        {/* ── LIVE PREVIEW ──────────────────────────────────────────────────── */}
        <section
          id="analytics"
          style={{
            position: "relative",
            zIndex: 2,
            padding: "80px 48px",
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          <SectionHeader
            label="LIVE DASHBOARD"
            title="Real-Time Intelligence Hub"
            sub="Monitor, analyze, and neutralize financial fraud in milliseconds. Full situational awareness across all transaction channels."
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 32,
              alignItems: "start",
            }}
          >
            <div style={{ animation: "float 4s ease-in-out infinite" }}>
              <DashboardPreview />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <ThreatMeter />
              {[
                {
                  title: "Behavioral AI Engine",
                  desc: "Continuously learns from 200+ behavioral signals to detect anomalies in real time.",
                  color: "#00e0ff",
                  icon: "🧠",
                },
                {
                  title: "Geo-Risk Intelligence",
                  desc: "Location-based fraud scoring using 48-city heatmap and historical pattern data.",
                  color: "#00ff88",
                  icon: "🌍",
                },
                {
                  title: "Autonomous Decision Engine",
                  desc: "AI decides: Allow, OTP-verify, Block, or Freeze — without human latency.",
                  color: "#ffd700",
                  icon: "⚡",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    background: "rgba(10,14,26,0.85)",
                    border: `1px solid ${item.color}22`,
                    borderRadius: 10,
                    padding: "18px 22px",
                    display: "flex",
                    gap: 16,
                    alignItems: "flex-start",
                    transition: "all 0.25s",
                    cursor: "default",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${item.color}55`;
                    e.currentTarget.style.transform = "translateX(4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${item.color}22`;
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  <div style={{ fontSize: 24 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#e0eaf8", marginBottom: 4 }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 13, color: "#5a7080", lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ──────────────────────────────────────────────────────── */}
        <section
          id="features"
          style={{
            position: "relative",
            zIndex: 2,
            padding: "80px 48px",
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          <SectionHeader
            label="CAPABILITIES"
            title="Enterprise-Grade Intelligence"
            sub="A complete arsenal of AI-driven tools built for government-scale financial security operations."
            accent="#00ff88"
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 24,
            }}
          >
            {[
              {
                icon: "🤖",
                title: "Hybrid ML Detection Engine",
                desc: "Random Forest + Isolation Forest + XGBoost ensemble running in parallel. 99.3% accuracy with continuous self-improvement via admin feedback loops.",
                accent: "#00e0ff",
                delay: 0,
              },
              {
                icon: "🔬",
                title: "Explainable AI (XAI) Panel",
                desc: "SHAP waterfall plots and LIME explanations for every decision. Analysts see exactly why a transaction was flagged — no black boxes.",
                accent: "#00ff88",
                delay: 80,
              },
              {
                icon: "⚡",
                title: "Real-Time WebSocket Alerts",
                desc: "Sub-50ms fraud alerts streamed live to all connected dashboards via Socket.IO. Zero polling, zero delay, zero missed threats.",
                accent: "#ffd700",
                delay: 160,
              },
              {
                icon: "👁️",
                title: "Behavioral Identity System",
                desc: "Tracks 200+ behavioral signals: transaction timing, device fingerprinting, spending velocity, and geographic patterns.",
                accent: "#ff8c00",
                delay: 240,
              },
              {
                icon: "🔐",
                title: "Role-Based Access Control",
                desc: "Super Admin → Fraud Analyst → User hierarchy with JWT authentication, bcrypt password hashing, and OTP email verification.",
                accent: "#a855f7",
                delay: 320,
              },
              {
                icon: "🗺️",
                title: "City-Wide Fraud Heatmap",
                desc: "Visual geo-intelligence across 48 major Indian cities. Identify fraud clusters, track emerging patterns, predict regional risk.",
                accent: "#ff2d55",
                delay: 400,
              },
              {
                icon: "🤝",
                title: "Smart AI Chatbot",
                desc: "Natural language queries against live fraud database. Ask: 'Top 10 high-risk users this week' or 'Mumbai fraud trend vs last month.'",
                accent: "#00e0ff",
                delay: 480,
              },
              {
                icon: "📊",
                title: "Automated Reports Engine",
                desc: "One-click PDF, Excel, CSV report generation. Compliance-ready audit trails with date-range filtering and admin notifications.",
                accent: "#00ff88",
                delay: 560,
              },
              {
                icon: "🛡️",
                title: "Pre-Transaction Prevention",
                desc: "Predict fraud before the transaction completes. Display risk warning, request OTP, or autonomously block — in real time.",
                accent: "#ffd700",
                delay: 640,
              },
            ].map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
        <section
          style={{
            position: "relative",
            zIndex: 2,
            padding: "80px 48px",
            maxWidth: 900,
            margin: "0 auto",
          }}
        >
          <SectionHeader
            label="PROCESS"
            title="How FinShield AI Works"
            sub="A multi-layered defense system that analyzes, scores, and responds in milliseconds."
            accent="#ff8c00"
          />
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            {[
              {
                num: "01",
                title: "Transaction Ingestion",
                desc: "Every transaction enters the pipeline via REST API or WebSocket stream. Data is normalized and enriched with geo, device, and user metadata in real time.",
                accent: "#00e0ff",
                delay: 0,
              },
              {
                num: "02",
                title: "Rule-Based Pre-Filter",
                desc: "150+ deterministic rules apply instantly: velocity limits, blacklist checks, geographic restrictions, and known fraud signatures.",
                accent: "#00ff88",
                delay: 100,
              },
              {
                num: "03",
                title: "AI Ensemble Scoring",
                desc: "Random Forest, Isolation Forest, and XGBoost run in parallel. Results are fused into a composite fraud probability score with confidence intervals.",
                accent: "#ffd700",
                delay: 200,
              },
              {
                num: "04",
                title: "Behavioral Deviation Analysis",
                desc: "The transaction is compared against the user's behavioral baseline: timing patterns, spending habits, device history, and location trajectory.",
                accent: "#ff8c00",
                delay: 300,
              },
              {
                num: "05",
                title: "Autonomous Decision & Response",
                desc: "Based on risk score: Allow (Low), OTP Verify (Medium), Block (High), or Freeze Account (Critical). Alerts are dispatched instantly via WebSocket and email.",
                accent: "#ff2d55",
                delay: 400,
              },
              {
                num: "06",
                title: "Explainable AI Report",
                desc: "SHAP and LIME generate human-readable explanations. Analysts see feature importance, decision reasoning, and natural language fraud summaries.",
                accent: "#a855f7",
                delay: 500,
              },
            ].map((s) => (
              <ProcessStep key={s.num} {...s} />
            ))}
          </div>
        </section>

        {/* ── TECHNOLOGY ────────────────────────────────────────────────────── */}
        <section
          id="technology"
          style={{
            position: "relative",
            zIndex: 2,
            padding: "80px 48px",
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          <SectionHeader
            label="TECH STACK"
            title="Built on Battle-Tested Infrastructure"
            sub="Production-grade open-source tools assembled into a government-ready security platform."
            accent="#a855f7"
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 32,
            }}
          >
            {[
              {
                cat: "FRONTEND",
                color: "#00e0ff",
                items: [
                  { icon: "⚛️", label: "React.js" },
                  { icon: "🎨", label: "Tailwind CSS" },
                  { icon: "📊", label: "Recharts / Chart.js" },
                  { icon: "🔌", label: "Socket.IO Client" },
                  { icon: "🎬", label: "Framer Motion" },
                ],
              },
              {
                cat: "BACKEND & DATABASE",
                color: "#00ff88",
                items: [
                  { icon: "🐍", label: "Python Flask" },
                  { icon: "⚡", label: "Flask-SocketIO" },
                  { icon: "🔑", label: "JWT Auth" },
                  { icon: "🔒", label: "Bcrypt" },
                  { icon: "🗄️", label: "MySQL" },
                ],
              },
              {
                cat: "AI / ML ENGINE",
                color: "#ffd700",
                items: [
                  { icon: "🌲", label: "Random Forest" },
                  { icon: "🔍", label: "Isolation Forest" },
                  { icon: "🚀", label: "XGBoost" },
                  { icon: "🔬", label: "SHAP / LIME" },
                  { icon: "🧠", label: "Scikit-learn" },
                ],
              },
            ].map((group) => (
              <div
                key={group.cat}
                style={{
                  background: "rgba(10,14,26,0.85)",
                  border: `1px solid ${group.color}22`,
                  borderRadius: 12,
                  padding: "28px 24px",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: group.color,
                    letterSpacing: 2,
                    marginBottom: 20,
                  }}
                >
                  {group.cat}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {group.items.map((t) => (
                    <TechBadge key={t.label} {...t} color={group.color} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECURITY ──────────────────────────────────────────────────────── */}
        <section
          id="security"
          style={{
            position: "relative",
            zIndex: 2,
            padding: "80px 48px",
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          <SectionHeader
            label="SECURITY POSTURE"
            title="Zero-Trust Architecture"
            sub="Built from the ground up with security-first principles. Every layer is hardened, audited, and compliant."
            accent="#ff2d55"
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 20,
            }}
          >
            {[
              { icon: "🔐", title: "JWT Token Security", desc: "Short-lived tokens, refresh rotation, secure storage, and automatic revocation on suspicious activity.", color: "#ff2d55" },
              { icon: "🛡️", title: "SQL Injection Shield", desc: "Parameterized queries, ORM-level validation, and real-time injection pattern detection on all endpoints.", color: "#ff8c00" },
              { icon: "📋", title: "Full Audit Trail", desc: "Immutable compliance logs for every action: logins, queries, decisions, overrides. GDPR and RBI compliant.", color: "#ffd700" },
              { icon: "🔒", title: "End-to-End Encryption", desc: "AES-256 data at rest, TLS 1.3 in transit. API keys rotated automatically. Zero plaintext credentials.", color: "#00ff88" },
              { icon: "👮", title: "RBAC Enforcement", desc: "Fine-grained permissions at route and data level. Super Admin, Fraud Analyst, and User roles fully isolated.", color: "#00e0ff" },
              { icon: "🧾", title: "OTP Email Verification", desc: "SMTP-based OTP for high-risk transactions and login events. Time-limited, single-use, hash-verified tokens.", color: "#a855f7" },
            ].map((item, i) => (
              <div
                key={item.title}
                style={{
                  background: "rgba(10,14,26,0.85)",
                  border: `1px solid ${item.color}22`,
                  borderRadius: 10,
                  padding: "24px 22px",
                  opacity: 0,
                  animation: `fadeInUp 0.5s ${i * 80}ms ease both`,
                  transition: "all 0.25s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${item.color}55`;
                  e.currentTarget.style.background = `rgba(10,14,26,0.95)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = `${item.color}22`;
                  e.currentTarget.style.background = "rgba(10,14,26,0.85)";
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 14 }}>{item.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#e0eaf8", marginBottom: 8 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 13, color: "#5a7080", lineHeight: 1.7 }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section
          style={{
            position: "relative",
            zIndex: 2,
            padding: "100px 48px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              maxWidth: 800,
              margin: "0 auto",
              background: "rgba(10,14,26,0.9)",
              border: "1px solid rgba(0,224,255,0.15)",
              borderRadius: 20,
              padding: "72px 48px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Glow accent */}
            <div
              style={{
                position: "absolute",
                top: -80,
                left: "50%",
                transform: "translateX(-50%)",
                width: 400,
                height: 400,
                background: "radial-gradient(circle, rgba(0,224,255,0.08), transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                display: "inline-block",
                fontSize: 48,
                marginBottom: 24,
                animation: "float 3s ease-in-out infinite",
              }}
            >
              🛡️
            </div>
            <h2
              style={{
                fontSize: "clamp(28px, 5vw, 52px)",
                fontWeight: 900,
                fontFamily: "'Orbitron', sans-serif",
                color: "#ffffff",
                marginBottom: 20,
                letterSpacing: 1,
              }}
            >
              Secure Your Financial
              <br />
              <span style={{ color: "#00e0ff" }}>System Today</span>
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "#5a7080",
                maxWidth: 520,
                margin: "0 auto 40px",
                lineHeight: 1.8,
              }}
            >
              Join government agencies and financial institutions already protected
              by FinShield AI. Deployment takes under 48 hours.
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/register")}   
                style={{
                  background: "linear-gradient(135deg, #00e0ff, #0050ff)",
                  border: "none",
                  color: "#000",
                  padding: "18px 48px",
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: "pointer",
                  letterSpacing: 1,
                  fontFamily: "'Orbitron', sans-serif",
                  boxShadow: "0 0 40px rgba(0,224,255,0.35)",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-3px)";
                  e.target.style.boxShadow = "0 0 60px rgba(0,224,255,0.5)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 0 40px rgba(0,224,255,0.35)";
                }}
              >
                REQUEST ACCESS
              </button>
              <button
                onClick={() => navigate("/login")}    
                style={{
                  background: "transparent",
                  border: "1px solid rgba(0,224,255,0.3)",
                  color: "#00e0ff",
                  padding: "18px 48px",
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: 1,
                  fontFamily: "'Orbitron', sans-serif",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(0,224,255,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "transparent";
                }}
              >
                LIVE DEMO
              </button>
            </div>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <footer
          style={{
            position: "relative",
            zIndex: 2,
            borderTop: "1px solid rgba(0,224,255,0.08)",
            padding: "48px 48px 32px",
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              gap: 40,
              marginBottom: 48,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    background: "linear-gradient(135deg, #00e0ff, #0050ff)",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  🛡️
                </div>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    fontFamily: "'Orbitron', sans-serif",
                    color: "#e0eaf8",
                  }}
                >
                  Fin<span style={{ color: "#00e0ff" }}>Shield</span> AI
                </span>
              </div>
              <p style={{ fontSize: 13, color: "#445566", lineHeight: 1.8, maxWidth: 280 }}>
                National Financial Fraud Intelligence & Prevention System. Protecting India's
                financial infrastructure with AI-first security.
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                {["🔴", "🟡", "🟢"].map((d, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 8,
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: ["#ff2d55", "#ffd700", "#00ff88"][i],
                      boxShadow: `0 0 6px ${["#ff2d55", "#ffd700", "#00ff88"][i]}`,
                    }}
                  />
                ))}
                <span style={{ fontSize: 11, color: "#00ff88", marginLeft: 4 }}>
                  ALL SYSTEMS OPERATIONAL
                </span>
              </div>
            </div>
            {[
              {
                title: "PLATFORM",
                links: ["Dashboard", "Transactions", "Fraud Logs", "Reports", "Analytics"],
              },
              {
                title: "TECHNOLOGY",
                links: ["AI Engine", "XAI Panel", "Behavioral AI", "Geo-Risk", "API Docs"],
              },
              {
                title: "COMPLIANCE",
                links: ["RBI Guidelines", "GDPR Policy", "Audit Logs", "Data Security", "Support"],
              },
            ].map((col) => (
              <div key={col.title}>
                <div
                  style={{
                    fontSize: 10,
                    color: "#00e0ff",
                    letterSpacing: 2,
                    marginBottom: 16,
                  }}
                >
                  {col.title}
                </div>
                {col.links.map((l) => (
                  <div
                    key={l}
                    style={{
                      fontSize: 13,
                      color: "#445566",
                      marginBottom: 10,
                      cursor: "pointer",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => (e.target.style.color = "#00e0ff")}
                    onMouseLeave={(e) => (e.target.style.color = "#445566")}
                  >
                    {l}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div
            style={{
              borderTop: "1px solid rgba(0,224,255,0.06)",
              paddingTop: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, color: "#334455" }}>
              © 2024 FinShield AI — National Financial Intelligence Bureau. All rights reserved.
            </span>
            <span
              style={{
                fontSize: 11,
                color: "#334455",
                fontFamily: "'Courier New', monospace",
              }}
            >
              CLASSIFICATION: RESTRICTED // BUILD v4.2.1
            </span>
          </div>
        </footer>

        {/* ── LOGIN MODAL ───────────────────────────────────────────────────── */}
        
      </div>
    </>
  );
}