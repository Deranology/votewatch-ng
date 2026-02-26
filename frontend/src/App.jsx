import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────
// VoteWatch NG — Complete Frontend Application
// Screens: Landing → Auth → Verify → Vote → Results Dashboard
// ─────────────────────────────────────────────────────────────

// ── MOCK DATA (replaces AWS calls for demo/preview) ──────────
const MOCK_ELECTION = {
  electionId: "ELECTION#2027#PRESIDENTIAL",
  electionName: "2027 Nigerian Presidential Election",
  status: "OPEN",
  description: "Vote for the next President and Commander-in-Chief of the Federal Republic of Nigeria.",
};

const MOCK_CANDIDATES = [
  { candidateId: "C1", fullName: "Adebayo Olusegun", party: "APC", position: "President", color: "#00AA44", votes: 1842 },
  { candidateId: "C2", fullName: "Emeka Chukwudi",  party: "PDP", position: "President", color: "#CC0000", votes: 1621 },
  { candidateId: "C3", fullName: "Fatima Aliyu",    party: "LP",  position: "President", color: "#E87C1E", votes: 987  },
  { candidateId: "C4", fullName: "Chidi Okoro",     party: "NNPP",position: "President", color: "#6B21A8", votes: 412  },
];

const MOCK_STATES = [
  { stateId: "STATE#LAGOS",  stateName: "Lagos",     results: [820,710,310,180] },
  { stateId: "STATE#ABUJA",  stateName: "FCT Abuja", results: [340,290,180,90]  },
  { stateId: "STATE#KANO",   stateName: "Kano",      results: [290,310,210,62]  },
  { stateId: "STATE#RIVERS", stateName: "Rivers",    results: [220,180,150,45]  },
  { stateId: "STATE#ENUGU",  stateName: "Enugu",     results: [172,131,137,35]  },
];

const MOCK_CREDENTIALS = [
  { vin: "AB00000000001", card: "VC0000000001" },
  { vin: "AC00000000002", card: "VC0000000002" },
];

// ── STYLES ───────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --green:   #00C853;
    --green-d: #00963E;
    --white:   #F5F0E8;
    --black:   #0A0A0A;
    --gray:    #1A1A1A;
    --gray2:   #2A2A2A;
    --gray3:   #3D3D3D;
    --muted:   #888;
    --apc:     #00AA44;
    --pdp:     #CC0000;
    --lp:      #E87C1E;
    --nnpp:    #6B21A8;
  }

  html, body, #root {
    height: 100%;
    font-family: 'DM Sans', sans-serif;
    background: var(--black);
    color: var(--white);
    -webkit-font-smoothing: antialiased;
  }

  .app { min-height: 100vh; display: flex; flex-direction: column; }

  /* ── NAV ── */
  nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 40px;
    border-bottom: 1px solid #1f1f1f;
    position: sticky; top: 0; z-index: 100;
    background: rgba(10,10,10,0.92);
    backdrop-filter: blur(12px);
  }
  .logo {
    font-family: 'Syne', sans-serif;
    font-size: 1.35rem; font-weight: 800;
    letter-spacing: -0.5px;
  }
  .logo span { color: var(--green); }
  .nav-pill {
    display: flex; align-items: center; gap: 6px;
    background: #111; border: 1px solid #2a2a2a;
    padding: 6px 14px; border-radius: 100px;
    font-size: 0.78rem; color: var(--muted);
  }
  .live-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--green);
    animation: pulse 1.8s ease-in-out infinite;
  }
  @keyframes pulse {
    0%,100% { opacity: 1; transform: scale(1); }
    50%      { opacity: 0.4; transform: scale(0.7); }
  }

  /* ── LANDING ── */
  .landing {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 60px 24px; text-align: center;
    position: relative; overflow: hidden;
  }
  .landing-bg {
    position: absolute; inset: 0; pointer-events: none;
    background:
      radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,200,83,0.09) 0%, transparent 70%),
      radial-gradient(ellipse 40% 30% at 80% 80%, rgba(0,200,83,0.05) 0%, transparent 60%);
  }
  .badge {
    display: inline-flex; align-items: center; gap: 8px;
    border: 1px solid rgba(0,200,83,0.3);
    background: rgba(0,200,83,0.06);
    padding: 6px 16px; border-radius: 100px;
    font-size: 0.75rem; color: var(--green);
    letter-spacing: 0.04em; text-transform: uppercase;
    margin-bottom: 28px;
  }
  h1 {
    font-family: 'Syne', sans-serif;
    font-size: clamp(2.8rem, 7vw, 5.5rem);
    font-weight: 800; line-height: 1.04;
    letter-spacing: -2px;
    max-width: 820px;
  }
  h1 em { color: var(--green); font-style: normal; }
  .subtitle {
    margin-top: 22px; max-width: 520px;
    font-size: 1.05rem; color: var(--muted);
    line-height: 1.7; font-weight: 300;
  }
  .cta-row {
    display: flex; gap: 14px; margin-top: 40px;
    flex-wrap: wrap; justify-content: center;
  }
  .btn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 8px; padding: 14px 28px; border-radius: 10px;
    font-size: 0.92rem; font-weight: 500; cursor: pointer;
    border: none; transition: all 0.18s ease; font-family: inherit;
  }
  .btn-primary {
    background: var(--green); color: var(--black);
    box-shadow: 0 0 30px rgba(0,200,83,0.25);
  }
  .btn-primary:hover { background: #00e65e; transform: translateY(-1px); box-shadow: 0 0 40px rgba(0,200,83,0.4); }
  .btn-ghost {
    background: transparent; color: var(--white);
    border: 1px solid #2a2a2a;
  }
  .btn-ghost:hover { background: #1a1a1a; border-color: #444; }
  .btn-sm { padding: 10px 20px; font-size: 0.84rem; }
  .btn-danger { background: #CC0000; color: white; }
  .btn-danger:hover { background: #e00; }
  .btn-full { width: 100%; }
  .btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none !important; }

  .stats-row {
    display: flex; gap: 40px; margin-top: 56px;
    flex-wrap: wrap; justify-content: center;
  }
  .stat { text-align: center; }
  .stat-n {
    font-family: 'Syne', sans-serif;
    font-size: 2rem; font-weight: 800; color: var(--green);
  }
  .stat-l { font-size: 0.78rem; color: var(--muted); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.06em; }

  /* ── MAIN LAYOUT ── */
  .main { flex: 1; max-width: 900px; width: 100%; margin: 0 auto; padding: 40px 24px 80px; }

  /* ── SECTION HEADER ── */
  .section-header { margin-bottom: 32px; }
  .section-tag {
    font-size: 0.72rem; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--green);
    margin-bottom: 8px;
  }
  .section-title {
    font-family: 'Syne', sans-serif;
    font-size: 1.9rem; font-weight: 800;
    letter-spacing: -0.5px;
  }
  .section-sub { color: var(--muted); font-size: 0.9rem; margin-top: 6px; line-height: 1.6; }

  /* ── CARDS ── */
  .card {
    background: var(--gray); border: 1px solid #2a2a2a;
    border-radius: 16px; padding: 28px;
  }
  .card + .card { margin-top: 16px; }

  /* ── AUTH ── */
  .auth-wrap { max-width: 440px; margin: 0 auto; }
  .tabs {
    display: flex; background: var(--gray2);
    border-radius: 10px; padding: 4px; margin-bottom: 28px;
  }
  .tab {
    flex: 1; padding: 10px; border-radius: 8px;
    font-size: 0.88rem; font-weight: 500; cursor: pointer;
    border: none; background: transparent; color: var(--muted);
    transition: all 0.15s; font-family: inherit;
  }
  .tab.active { background: var(--gray3); color: var(--white); }

  label { display: block; font-size: 0.8rem; color: var(--muted); margin-bottom: 6px; letter-spacing: 0.02em; }
  input {
    width: 100%; background: var(--gray2); border: 1px solid #333;
    color: var(--white); padding: 13px 16px; border-radius: 10px;
    font-size: 0.95rem; outline: none; transition: border-color 0.15s;
    font-family: inherit; margin-bottom: 16px;
  }
  input:focus { border-color: var(--green); }
  input::placeholder { color: #555; }

  .form-note { font-size: 0.78rem; color: var(--muted); margin-top: 12px; text-align: center; line-height: 1.5; }

  /* ── VERIFY ── */
  .verify-card { max-width: 480px; margin: 0 auto; }
  .inec-note {
    display: flex; gap: 12px; align-items: flex-start;
    background: rgba(0,200,83,0.06); border: 1px solid rgba(0,200,83,0.2);
    border-radius: 10px; padding: 14px 16px; margin-bottom: 24px;
    font-size: 0.82rem; color: rgba(245,240,232,0.7); line-height: 1.55;
  }
  .inec-icon { font-size: 1.1rem; margin-top: 1px; flex-shrink: 0; }

  /* ── VOTE ── */
  .election-banner {
    background: linear-gradient(135deg, #0d1f14 0%, #0a1a0f 100%);
    border: 1px solid rgba(0,200,83,0.2);
    border-radius: 16px; padding: 24px 28px; margin-bottom: 28px;
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 12px;
  }
  .election-name { font-family: 'Syne', sans-serif; font-size: 1.1rem; font-weight: 700; }
  .election-desc { color: var(--muted); font-size: 0.82rem; margin-top: 4px; }
  .open-badge {
    display: flex; align-items: center; gap: 6px;
    background: rgba(0,200,83,0.12); border: 1px solid rgba(0,200,83,0.3);
    padding: 6px 14px; border-radius: 100px;
    font-size: 0.75rem; color: var(--green); font-weight: 500;
  }

  .candidate-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  @media (max-width: 560px) { .candidate-grid { grid-template-columns: 1fr; } }

  .candidate-card {
    background: var(--gray); border: 2px solid #2a2a2a;
    border-radius: 14px; padding: 20px;
    cursor: pointer; transition: all 0.18s; position: relative;
    overflow: hidden;
  }
  .candidate-card:hover { border-color: #444; transform: translateY(-2px); }
  .candidate-card.selected { border-color: var(--green); background: rgba(0,200,83,0.06); }
  .candidate-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    border-radius: 14px 14px 0 0;
  }
  .candidate-card.apc::before  { background: var(--apc); }
  .candidate-card.pdp::before  { background: var(--pdp); }
  .candidate-card.lp::before   { background: var(--lp); }
  .candidate-card.nnpp::before { background: var(--nnpp); }

  .party-tag {
    display: inline-block; font-size: 0.7rem; font-weight: 600;
    padding: 3px 10px; border-radius: 100px; margin-bottom: 10px;
    letter-spacing: 0.04em;
  }
  .apc-tag  { background: rgba(0,170,68,0.15);  color: var(--apc); }
  .pdp-tag  { background: rgba(204,0,0,0.15);    color: var(--pdp); }
  .lp-tag   { background: rgba(232,124,30,0.15); color: var(--lp); }
  .nnpp-tag { background: rgba(107,33,168,0.15); color: var(--nnpp); }

  .candidate-name { font-family: 'Syne', sans-serif; font-size: 1rem; font-weight: 700; line-height: 1.2; }
  .candidate-pos  { font-size: 0.75rem; color: var(--muted); margin-top: 4px; }
  .check-icon {
    position: absolute; top: 14px; right: 14px;
    width: 22px; height: 22px; border-radius: 50%;
    background: var(--green); display: flex; align-items: center; justify-content: center;
    font-size: 0.7rem; opacity: 0; transition: opacity 0.15s;
  }
  .candidate-card.selected .check-icon { opacity: 1; }

  .vote-confirm {
    margin-top: 24px; background: rgba(0,200,83,0.04);
    border: 1px solid rgba(0,200,83,0.2); border-radius: 12px; padding: 18px 20px;
    font-size: 0.85rem; color: var(--muted); line-height: 1.6;
  }
  .vote-confirm strong { color: var(--white); }

  /* ── RESULTS ── */
  .results-header {
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 12px; margin-bottom: 28px;
  }
  .total-votes {
    font-family: 'Syne', sans-serif;
    font-size: 2.8rem; font-weight: 800; line-height: 1;
    color: var(--green);
  }
  .total-label { font-size: 0.78rem; color: var(--muted); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.06em; }

  .candidate-result { display: flex; flex-direction: column; gap: 4px; margin-bottom: 20px; }
  .result-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .result-name { font-family: 'Syne', sans-serif; font-size: 0.95rem; font-weight: 700; }
  .result-count { font-size: 0.85rem; color: var(--muted); }
  .result-pct { font-family: 'Syne', sans-serif; font-size: 1rem; font-weight: 800; }

  .bar-bg { background: #1f1f1f; border-radius: 100px; height: 8px; overflow: hidden; }
  .bar-fill {
    height: 100%; border-radius: 100px;
    transition: width 1.2s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .drill-section { margin-top: 40px; }
  .drill-title {
    font-family: 'Syne', sans-serif; font-size: 1.1rem; font-weight: 700;
    margin-bottom: 16px; display: flex; align-items: center; gap: 10px;
  }
  .drill-title span { color: var(--muted); font-size: 0.85rem; font-weight: 400; }

  .state-card {
    background: var(--gray); border: 1px solid #2a2a2a;
    border-radius: 12px; padding: 18px 20px; margin-bottom: 10px;
    cursor: pointer; transition: all 0.15s;
  }
  .state-card:hover { border-color: #444; background: var(--gray2); }
  .state-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .state-name { font-family: 'Syne', sans-serif; font-size: 0.95rem; font-weight: 700; }
  .state-total { font-size: 0.78rem; color: var(--muted); }
  .mini-bars { display: flex; gap: 3px; height: 6px; border-radius: 100px; overflow: hidden; }
  .mini-bar { height: 100%; transition: width 1s ease; }

  .breadcrumb { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
  .crumb { font-size: 0.82rem; color: var(--muted); cursor: pointer; }
  .crumb:hover { color: var(--white); }
  .crumb.active { color: var(--white); font-weight: 500; }
  .crumb-sep { color: #333; font-size: 0.7rem; }

  /* ── SUCCESS ── */
  .success-wrap { text-align: center; padding: 60px 20px; }
  .success-icon {
    width: 80px; height: 80px; border-radius: 50%;
    background: rgba(0,200,83,0.12); border: 2px solid rgba(0,200,83,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 2rem; margin: 0 auto 24px;
    animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes popIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .success-title { font-family: 'Syne', sans-serif; font-size: 1.8rem; font-weight: 800; margin-bottom: 12px; }
  .success-sub { color: var(--muted); font-size: 0.92rem; max-width: 360px; margin: 0 auto 28px; line-height: 1.6; }
  .vote-receipt {
    background: var(--gray); border: 1px solid #2a2a2a;
    border-radius: 12px; padding: 20px; max-width: 360px; margin: 0 auto 28px;
    text-align: left;
  }
  .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #222; font-size: 0.83rem; }
  .receipt-row:last-child { border-bottom: none; }
  .receipt-key { color: var(--muted); }
  .receipt-val { font-weight: 500; font-family: monospace; font-size: 0.78rem; }

  /* ── TOAST ── */
  .toast {
    position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
    background: var(--gray2); border: 1px solid #333;
    padding: 12px 22px; border-radius: 100px;
    font-size: 0.85rem; z-index: 999;
    animation: slideUp 0.25s ease;
    white-space: nowrap;
  }
  .toast.error { border-color: #CC0000; color: #ff6b6b; }
  .toast.success { border-color: rgba(0,200,83,0.4); color: var(--green); }
  @keyframes slideUp { from { transform: translateX(-50%) translateY(20px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }

  /* ── MISC ── */
  .divider { height: 1px; background: #1f1f1f; margin: 24px 0; }
  .spinner {
    width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.15);
    border-top-color: var(--green); border-radius: 50%;
    animation: spin 0.7s linear infinite; display: inline-block;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .user-bar {
    display: flex; align-items: center; gap: 10px;
    font-size: 0.82rem; color: var(--muted);
  }
  .user-dot { width: 28px; height: 28px; border-radius: 50%; background: var(--gray2); border: 1px solid #333; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; color: var(--green); }
`;

// ── UTILS ──────────────────────────────────────────────────
const partyClass = (p) => p.toLowerCase();
const partyTagClass = (p) => `${p.toLowerCase()}-tag`;
const fmtNum = (n) => n.toLocaleString();
const pct = (v, t) => t > 0 ? ((v / t) * 100).toFixed(1) : "0.0";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── TOAST ──────────────────────────────────────────────────
function Toast({ message, type }) {
  if (!message) return null;
  return <div className={`toast ${type}`}>{message}</div>;
}

// ── NAV ────────────────────────────────────────────────────
function Nav({ user, onSignOut, screen }) {
  return (
    <nav>
      <div className="logo">Vote<span>Watch</span> NG</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {screen === "results" && (
          <div className="nav-pill">
            <div className="live-dot" />
            Live Results
          </div>
        )}
        {user && (
          <div className="user-bar">
            <div className="user-dot">✓</div>
            <span>{user.email?.split("@")[0]}</span>
            <button className="btn btn-ghost btn-sm" onClick={onSignOut}>Sign out</button>
          </div>
        )}
      </div>
    </nav>
  );
}

// ── LANDING ────────────────────────────────────────────────
function Landing({ onVote, onWatch }) {
  return (
    <div className="landing">
      <div className="landing-bg" />
      <div className="badge"><div className="live-dot" /> 2027 Election — Voting Open</div>
      <h1>Your Vote.<br /><em>Visible.</em> Verified.<br />Immutable.</h1>
      <p className="subtitle">
        Cast your vote from home with your VIN and voter card. Every vote is broadcast live
        to the nation — transparent, tamper-proof, and cryptographically sealed.
      </p>
      <div className="cta-row">
        <button className="btn btn-primary" onClick={onVote}>Cast Your Vote →</button>
        <button className="btn btn-ghost" onClick={onWatch}>Watch Live Results</button>
      </div>
      <div className="stats-row">
        <div className="stat"><div className="stat-n">500+</div><div className="stat-l">Mock Voters</div></div>
        <div className="stat"><div className="stat-n">5</div><div className="stat-l">States</div></div>
        <div className="stat"><div className="stat-n">1,200+</div><div className="stat-l">Polling Units</div></div>
        <div className="stat"><div className="stat-n">4</div><div className="stat-l">Candidates</div></div>
      </div>
    </div>
  );
}

// ── AUTH ───────────────────────────────────────────────────
function Auth({ onAuth, onBack }) {
  const [tab, setTab] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async () => {
    if (!email || !password) return showToast("Please fill in all fields.");
    if (password.length < 8) return showToast("Password must be at least 8 characters.");
    setLoading(true);
    await sleep(1200); // Simulate Cognito call
    setLoading(false);
    onAuth({ email, sub: `usr_${Math.random().toString(36).slice(2, 10)}` });
  };

  return (
    <div className="main">
      <div className="auth-wrap">
        <div className="section-header">
          <div className="section-tag">Voter Portal</div>
          <div className="section-title">{tab === "signin" ? "Welcome back" : "Create account"}</div>
          <div className="section-sub">
            {tab === "signin"
              ? "Sign in to access the voting portal."
              : "Register with your email to get started. You'll verify your VIN next."}
          </div>
        </div>

        <div className="card">
          <div className="tabs">
            <button className={`tab ${tab === "signin" ? "active" : ""}`} onClick={() => setTab("signin")}>Sign In</button>
            <button className={`tab ${tab === "signup" ? "active" : ""}`} onClick={() => setTab("signup")}>Register</button>
          </div>

          <label>Email address</label>
          <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label>Password</label>
          <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />

          <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="spinner" /> : tab === "signin" ? "Sign In" : "Create Account"}
          </button>

          <p className="form-note" style={{ marginTop: 16 }}>
            Protected by Amazon Cognito · Your credentials are encrypted end-to-end
          </p>
        </div>

        <button className="btn btn-ghost btn-full" style={{ marginTop: 12 }} onClick={onBack}>← Back to home</button>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
}

// ── VERIFY VIN ────────────────────────────────────────────
function VerifyVIN({ onVerified, onBack }) {
  const [vin, setVin] = useState("");
  const [card, setCard] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleVerify = async () => {
    if (!vin || !card) return showToast("Please enter both your VIN and voter card number.");
    setLoading(true);
    await sleep(1500);

    const valid = MOCK_CREDENTIALS.some(
      (c) => c.vin.toUpperCase() === vin.toUpperCase() && c.card.toUpperCase() === card.toUpperCase()
    );

    setLoading(false);
    if (valid) {
      showToast("VIN verified successfully!", "success");
      await sleep(800);
      onVerified({ vin, pollingUnit: "Ikeja Ward 1 — Primary School", lga: "Ikeja", state: "Lagos" });
    } else {
      showToast("VIN not found or voter card mismatch. Try: AB00000000001 / VC0000000001");
    }
  };

  return (
    <div className="main">
      <div className="verify-card">
        <div className="section-header">
          <div className="section-tag">Step 2 of 3</div>
          <div className="section-title">Verify your voter ID</div>
          <div className="section-sub">Enter your VIN and voter card number exactly as they appear on your PVC.</div>
        </div>

        <div className="inec-note">
          <span className="inec-icon">🔒</span>
          <span>Your VIN is hashed with SHA-256 before verification. It is never stored in plain text. This simulates a real INEC API call.</span>
        </div>

        <div className="card">
          <label>Voter Identification Number (VIN)</label>
          <input placeholder="e.g. AB00000000001" value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())}
            style={{ fontFamily: "monospace", letterSpacing: "0.05em" }} />

          <label>Voter Card Number</label>
          <input placeholder="e.g. VC0000000001" value={card} onChange={(e) => setCard(e.target.value.toUpperCase())}
            style={{ fontFamily: "monospace", letterSpacing: "0.05em" }} />

          <button className="btn btn-primary btn-full" onClick={handleVerify} disabled={loading}>
            {loading ? <><span className="spinner" /> Verifying with INEC…</> : "Verify My Voter ID"}
          </button>

          <p className="form-note" style={{ marginTop: 16 }}>
            <strong style={{ color: "var(--green)" }}>Test credentials:</strong><br />
            VIN: AB00000000001 · Card: VC0000000001
          </p>
        </div>

        <button className="btn btn-ghost btn-full" style={{ marginTop: 12 }} onClick={onBack}>← Back</button>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
}

// ── VOTE ──────────────────────────────────────────────────
function Vote({ voterInfo, onVoted, onBack }) {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCast = async () => {
    if (!selected) return showToast("Please select a candidate before submitting.");
    setLoading(true);
    await sleep(2000);
    setLoading(false);
    const candidate = MOCK_CANDIDATES.find((c) => c.candidateId === selected);
    onVoted({ candidate, voteId: `VT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`, timestamp: new Date().toISOString() });
  };

  const selectedCandidate = MOCK_CANDIDATES.find((c) => c.candidateId === selected);

  return (
    <div className="main">
      <div className="section-header">
        <div className="section-tag">Step 3 of 3 · {voterInfo?.state} State · {voterInfo?.lga} LGA</div>
        <div className="section-title">Cast your vote</div>
        <div className="section-sub">Select your candidate. This action is final and cannot be reversed.</div>
      </div>

      <div className="election-banner">
        <div>
          <div className="election-name">{MOCK_ELECTION.electionName}</div>
          <div className="election-desc">{MOCK_ELECTION.description}</div>
        </div>
        <div className="open-badge"><div className="live-dot" /> Voting Open</div>
      </div>

      <div className="candidate-grid">
        {MOCK_CANDIDATES.map((c) => (
          <div
            key={c.candidateId}
            className={`candidate-card ${partyClass(c.party)} ${selected === c.candidateId ? "selected" : ""}`}
            onClick={() => setSelected(c.candidateId)}
          >
            <div className="check-icon">✓</div>
            <span className={`party-tag ${partyTagClass(c.party)}`}>{c.party}</span>
            <div className="candidate-name">{c.fullName}</div>
            <div className="candidate-pos">{c.position}</div>
          </div>
        ))}
      </div>

      {selectedCandidate && (
        <div className="vote-confirm">
          You are about to vote for <strong>{selectedCandidate.fullName}</strong> of the <strong>{selectedCandidate.party}</strong>.
          Your vote will be recorded immutably and broadcast live to all watchers.
          <strong> This cannot be undone.</strong>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <button className="btn btn-primary btn-full" onClick={handleCast} disabled={loading || !selected}>
          {loading ? <><span className="spinner" /> Recording your vote…</> : "Submit My Vote →"}
        </button>
        <button className="btn btn-ghost btn-full" style={{ marginTop: 10 }} onClick={onBack}>← Back</button>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
}

// ── VOTE SUCCESS ───────────────────────────────────────────
function VoteSuccess({ voteResult, onWatchResults }) {
  return (
    <div className="main">
      <div className="success-wrap">
        <div className="success-icon">✓</div>
        <div className="success-title">Vote cast successfully!</div>
        <p className="success-sub">
          Your vote has been recorded on the immutable ledger and broadcast live to all watchers across Nigeria.
        </p>
        <div className="vote-receipt">
          <div className="receipt-row">
            <span className="receipt-key">Candidate</span>
            <span className="receipt-val">{voteResult.candidate.fullName}</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-key">Party</span>
            <span className="receipt-val">{voteResult.candidate.party}</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-key">Vote ID</span>
            <span className="receipt-val">{voteResult.voteId}</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-key">Timestamp</span>
            <span className="receipt-val">{new Date(voteResult.timestamp).toLocaleTimeString()}</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-key">Ledger</span>
            <span className="receipt-val" style={{ color: "var(--green)" }}>✓ QLDB Confirmed</span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={onWatchResults}>Watch Live Results →</button>
      </div>
    </div>
  );
}

// ── RESULTS ───────────────────────────────────────────────
function Results({ onBack }) {
  const [candidates, setCandidates] = useState(MOCK_CANDIDATES);
  const [drillState, setDrillState] = useState(null);
  const [animating, setAnimating] = useState(false);
  const intervalRef = useRef(null);

  const totalVotes = candidates.reduce((s, c) => s + c.votes, 0);
  const leading = [...candidates].sort((a, b) => b.votes - a.votes)[0];

  // Simulate live vote updates
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCandidates((prev) =>
        prev.map((c) => ({
          ...c,
          votes: c.votes + Math.floor(Math.random() * 8),
        }))
      );
    }, 2800);
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleStateDrill = (state) => {
    setAnimating(true);
    setTimeout(() => { setDrillState(state); setAnimating(false); }, 200);
  };

  const sortedCandidates = [...candidates].sort((a, b) => b.votes - a.votes);

  return (
    <div className="main">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span className="crumb" onClick={() => setDrillState(null)}>🇳🇬 National</span>
        {drillState && <><span className="crumb-sep">›</span><span className="crumb active">{drillState.stateName}</span></>}
      </div>

      {!drillState ? (
        <>
          {/* National Header */}
          <div className="results-header">
            <div>
              <div className="total-votes">{fmtNum(totalVotes)}</div>
              <div className="total-label">Total votes counted nationwide</div>
            </div>
            <div className="nav-pill"><div className="live-dot" /> Updating live</div>
          </div>

          {/* Leading banner */}
          <div style={{ background: "rgba(0,200,83,0.05)", border: "1px solid rgba(0,200,83,0.15)", borderRadius: 12, padding: "14px 18px", marginBottom: 28, fontSize: "0.85rem", color: "var(--muted)" }}>
            🏆 <strong style={{ color: "var(--white)" }}>{leading.fullName} ({leading.party})</strong> is currently leading with {fmtNum(leading.votes)} votes ({pct(leading.votes, totalVotes)}%)
          </div>

          {/* Candidate bars */}
          <div className="card">
            {sortedCandidates.map((c, i) => (
              <div key={c.candidateId} className="candidate-result">
                <div className="result-row">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {i === 0 && <span style={{ fontSize: "0.8rem" }}>🏆</span>}
                    <span className="result-name">{c.fullName}</span>
                    <span className={`party-tag ${partyTagClass(c.party)}`}>{c.party}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span className="result-count">{fmtNum(c.votes)}</span>
                    <span className="result-pct" style={{ color: c.color }}>{pct(c.votes, totalVotes)}%</span>
                  </div>
                </div>
                <div className="bar-bg">
                  <div className="bar-fill" style={{ width: `${pct(c.votes, totalVotes)}%`, background: c.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* State drill-down */}
          <div className="drill-section">
            <div className="drill-title">Results by State <span>click a state to drill down</span></div>
            {MOCK_STATES.map((s) => {
              const stateTotal = s.results.reduce((a, b) => a + b, 0);
              return (
                <div key={s.stateId} className="state-card" onClick={() => handleStateDrill(s)}>
                  <div className="state-row">
                    <span className="state-name">{s.stateName}</span>
                    <span className="state-total">{fmtNum(stateTotal)} votes</span>
                  </div>
                  <div className="mini-bars">
                    {s.results.map((v, i) => (
                      <div key={i} className="mini-bar" style={{ width: `${pct(v, stateTotal)}%`, background: MOCK_CANDIDATES[i].color }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        // State drill-down view
        <div style={{ opacity: animating ? 0 : 1, transition: "opacity 0.2s" }}>
          <div className="section-header">
            <div className="section-tag">{drillState.stateName} State Results</div>
            <div className="section-title">{drillState.stateName}</div>
          </div>
          <div className="card">
            {MOCK_CANDIDATES.map((c, i) => {
              const stateTotal = drillState.results.reduce((a, b) => a + b, 0);
              return (
                <div key={c.candidateId} className="candidate-result">
                  <div className="result-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="result-name">{c.fullName}</span>
                      <span className={`party-tag ${partyTagClass(c.party)}`}>{c.party}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span className="result-count">{fmtNum(drillState.results[i])}</span>
                      <span className="result-pct" style={{ color: c.color }}>{pct(drillState.results[i], stateTotal)}%</span>
                    </div>
                  </div>
                  <div className="bar-bg">
                    <div className="bar-fill" style={{ width: `${pct(drillState.results[i], stateTotal)}%`, background: c.color }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 16, fontSize: "0.82rem", color: "var(--muted)", background: "var(--gray)", borderRadius: 10, padding: "12px 16px" }}>
            In production, this view drills further into LGAs → Wards → Polling Units, all powered by real-time AppSync subscriptions and pre-computed DynamoDB aggregates.
          </div>

          <button className="btn btn-ghost" style={{ marginTop: 20 }} onClick={() => setDrillState(null)}>← Back to National</button>
        </div>
      )}

      {onBack && (
        <div style={{ marginTop: 40 }}>
          <button className="btn btn-ghost" onClick={onBack}>← Back to home</button>
        </div>
      )}
    </div>
  );
}

// ── ROOT APP ───────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("landing");
  const [user, setUser] = useState(null);
  const [voterInfo, setVoterInfo] = useState(null);
  const [voteResult, setVoteResult] = useState(null);

  const handleAuth = (u) => { setUser(u); setScreen("verify"); };
  const handleVerified = (info) => { setVoterInfo(info); setScreen("vote"); };
  const handleVoted = (result) => { setVoteResult(result); setScreen("success"); };
  const handleSignOut = () => { setUser(null); setVoterInfo(null); setVoteResult(null); setScreen("landing"); };

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <Nav user={user} onSignOut={handleSignOut} screen={screen} />

        {screen === "landing"  && <Landing onVote={() => setScreen("auth")} onWatch={() => setScreen("results")} />}
        {screen === "auth"     && <Auth onAuth={handleAuth} onBack={() => setScreen("landing")} />}
        {screen === "verify"   && <VerifyVIN onVerified={handleVerified} onBack={() => setScreen("auth")} />}
        {screen === "vote"     && <Vote voterInfo={voterInfo} onVoted={handleVoted} onBack={() => setScreen("verify")} />}
        {screen === "success"  && <VoteSuccess voteResult={voteResult} onWatchResults={() => setScreen("results")} />}
        {screen === "results"  && <Results onBack={screen !== "landing" ? () => setScreen("landing") : null} />}
      </div>
    </>
  );
}
