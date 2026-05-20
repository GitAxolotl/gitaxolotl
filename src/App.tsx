import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

/* ============================================================
   GITAXOLOTL — single-file app
   Brief: network error detection & regeneration dashboard
   for the GitLawB decentralized agent network.
   ============================================================ */

type Severity = "critical" | "diagnosed" | "regenerating" | "healed";

type ErrorRow = {
  id: number;
  title: string;
  severity: Severity;
  file: string;
  agent: string;
  time: string;
  progress: number;
  action: string;
  description: string;
};

type Agent = {
  id: string;
  name: string;
  role: string;
  health: number;
  activeRepairs: number;
  successRate: number;
  specialties: string[];
  recentFixes: string[];
};

type LogColor = "green" | "amber" | "red" | "cyan";

type LogSeed = {
  agent: string;
  action: string;
  target: string;
  color: LogColor;
};

type LogEntry = LogSeed & { id: number; time: string };

type ActiveFilter =
  | { type: "stage"; value: Severity }
  | { type: "agent"; value: string }
  | null;

const SEVERITY_ORDER: Severity[] = [
  "critical",
  "diagnosed",
  "regenerating",
  "healed",
];

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "CRITICAL",
  diagnosed: "DIAGNOSED",
  regenerating: "REGENERATING",
  healed: "HEALED",
};

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "var(--status-critical)",
  diagnosed: "var(--status-diagnosed)",
  regenerating: "var(--status-regenerating)",
  healed: "var(--status-healed)",
};

/* -------------------- MOCK DATA -------------------- */

const MOCK_ERRORS: ErrorRow[] = [
  { id: 1,  title: "Unvalidated DID input → injection risk",    severity: "critical",     file: "gitlawb/node/src/auth.rs:147",         agent: "CIPHER", time: "12min ago", progress: 40,  action: "patching",  description: "Raw DID string passed to query without sanitization" },
  { id: 2,  title: "Missing rate limit on auth endpoint",       severity: "critical",     file: "openclaude/core/api/handler.rs:89",    agent: "HELIX",  time: "25min ago", progress: 55,  action: "patching",  description: "Auth endpoint allows unlimited attempts, brute-force risk" },
  { id: 3,  title: "SQL injection via unsanitized ref name",    severity: "critical",     file: "gitlawb/node/src/api.rs:312",          agent: "CIPHER", time: "18min ago", progress: 30,  action: "scanning",  description: "Git ref name concatenated into SQL without parameterization" },
  { id: 4,  title: "Hardcoded API key in config",               severity: "critical",     file: "nexus/api/src/config.ts:15",           agent: "FORGE",  time: "35min ago", progress: 70,  action: "testing",   description: "Production API key committed in source code" },
  { id: 5,  title: "Unhandled panic in error path",             severity: "diagnosed",    file: "gitlawb/node/src/api.rs:201",          agent: "HELIX",  time: "1h ago",    progress: 50,  action: "analyzing", description: "unwrap() called on Result that can fail, causes crash" },
  { id: 6,  title: "Memory leak in scanner module",             severity: "regenerating", file: "gitlawb/contracts/src/lib.rs:203",     agent: "FORGE",  time: "2h ago",    progress: 80,  action: "verifying", description: "Scanner holds references to completed scans, never freed" },
  { id: 7,  title: "Race condition in node sync",               severity: "diagnosed",    file: "gitlawb/node/src/sync.rs:78",          agent: "ATLAS",  time: "3h ago",    progress: 45,  action: "analyzing", description: "Concurrent writes to shared state without lock" },
  { id: 8,  title: "Deprecated SHA-1 in crypto module",         severity: "healed",       file: "gitlawb/node/src/crypto.rs:34",        agent: "CIPHER", time: "4h ago",    progress: 100, action: "verified",  description: "Replaced SHA-1 with SHA-256 for signature verification" },
  { id: 9,  title: "Missing CORS header on public API",         severity: "diagnosed",    file: "openclaude/core/api/routes.ts:45",     agent: "NEXUS",  time: "2h ago",    progress: 60,  action: "patching",  description: "Cross-origin requests blocked for third-party integrations" },
  { id: 10, title: "Buffer overflow in parser",                 severity: "critical",     file: "gitlawb/node/src/parser.rs:256",       agent: "HELIX",  time: "45min ago", progress: 25,  action: "scanning",  description: "Unchecked buffer length when parsing large git objects" },
  { id: 11, title: "Stale cache serving old trust scores",      severity: "regenerating", file: "gitlawb/contracts/src/cache.rs:89",    agent: "QUILL",  time: "5h ago",    progress: 90,  action: "deploying", description: "Cache TTL too long, users see outdated trust data" },
  { id: 12, title: "SSL certificate expiring in 7 days",        severity: "diagnosed",    file: "nexus/api/cert.pem",                   agent: "FORGE",  time: "1h ago",    progress: 75,  action: "renewing",  description: "TLS cert for api.gitlawb.com expires soon" },
  { id: 13, title: "Infinite loop in dependency resolver",      severity: "healed",       file: "gitlawb/node/src/resolve.rs:112",      agent: "ATLAS",  time: "6h ago",    progress: 100, action: "verified",  description: "Circular dependency caused stack overflow, added cycle detection" },
  { id: 14, title: "XSS vulnerability in user profile",         severity: "regenerating", file: "openclaude/core/web/profile.tsx:67",   agent: "CIPHER", time: "3h ago",    progress: 65,  action: "testing",   description: "User bio rendered as raw HTML without sanitization" },
  { id: 15, title: "Dead lock in concurrent PR merge",          severity: "critical",     file: "gitlawb/node/src/merge.rs:234",        agent: "NEXUS",  time: "50min ago", progress: 35,  action: "analyzing", description: "Two PRs targeting same branch deadlock on file lock" },
  { id: 16, title: "Incorrect timezone in commit timestamps",   severity: "healed",       file: "gitlawb/node/src/time.rs:18",          agent: "QUILL",  time: "8h ago",    progress: 100, action: "verified",  description: "Commits showed UTC instead of author timezone" },
  { id: 17, title: "Missing retry on network timeout",          severity: "diagnosed",    file: "nexus/api/src/client.ts:123",          agent: "FORGE",  time: "2h ago",    progress: 55,  action: "patching",  description: "API calls fail permanently on transient network errors" },
  { id: 18, title: "Permission bypass on private repos",        severity: "critical",     file: "gitlawb/node/src/auth.rs:289",         agent: "HELIX",  time: "30min ago", progress: 20,  action: "scanning",  description: "Authenticated user can access any private repo by guessing ID" },
];

const MOCK_AGENTS: Agent[] = [
  { id: "cipher", name: "CIPHER", role: "Security Engineer", health: 94, activeRepairs: 3, successRate: 98.3, specialties: ["Rust", "Solidity", "Auth"],              recentFixes: ["SHA-1 replacement", "DID validation"] },
  { id: "forge",  name: "FORGE",  role: "DevOps Agent",      health: 87, activeRepairs: 3, successRate: 96.1, specialties: ["CI/CD", "Docker", "TLS"],                 recentFixes: ["SSL renewal", "Hardcoded key removal"] },
  { id: "helix",  name: "HELIX",  role: "Code Analyst",      health: 72, activeRepairs: 4, successRate: 91.7, specialties: ["Rust", "Security", "Static Analysis"],    recentFixes: ["Buffer overflow patch", "Rate limit added"] },
  { id: "atlas",  name: "ATLAS",  role: "Research Agent",    health: 61, activeRepairs: 1, successRate: 88.2, specialties: ["ML", "NLP", "Graph Analysis"],            recentFixes: ["Infinite loop fix", "Cycle detection"] },
  { id: "quill",  name: "QUILL",  role: "Documentation",     health: 98, activeRepairs: 1, successRate: 99.1, specialties: ["Docs", "API Spec", "Changelog"],          recentFixes: ["Timezone fix", "Cache TTL update"] },
  { id: "nexus",  name: "NEXUS",  role: "Network Monitor",   health: 45, activeRepairs: 2, successRate: 82.4, specialties: ["Networking", "Consensus", "P2P"],         recentFixes: ["CORS header added", "Deadlock analysis"] },
];

const LOG_SEEDS: LogSeed[] = [
  { agent: "CIPHER", action: "patch applied",   target: "gitlawb/node#auth",  color: "green" },
  { agent: "FORGE",  action: "test passed",     target: "openclaude#handler", color: "green" },
  { agent: "HELIX",  action: "vuln confirmed",  target: "contracts#lib.rs",   color: "amber" },
  { agent: "NEXUS",  action: "health restored", target: "node-3",             color: "green" },
  { agent: "CIPHER", action: "scan initiated",  target: "gitlawb/node full",  color: "cyan"  },
  { agent: "ATLAS",  action: "analysis done",   target: "sync.rs race cond.", color: "amber" },
  { agent: "QUILL",  action: "docs updated",    target: "crypto module API",  color: "green" },
  { agent: "FORGE",  action: "cert renewed",    target: "api.gitlawb.com",    color: "green" },
  { agent: "HELIX",  action: "exploit blocked", target: "parser.rs overflow", color: "red"   },
  { agent: "CIPHER", action: "merge verified",  target: "PR#1247 auth fix",   color: "green" },
];

const DELTAS: Record<Severity, number> = {
  critical: 2,
  diagnosed: 1,
  regenerating: 1,
  healed: 1,
};

/* -------------------- helpers -------------------- */

function formatHHMMSS(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function padEnd(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function useCountUp(target: number, durationMs = 1500, start = true): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / durationMs);
      const eased = 1 - Math.pow(1 - k, 3);
      setValue(Math.round(target * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, start]);
  return value;
}

function ringColor(health: number): string {
  if (health > 80) return "var(--status-healed)";
  if (health >= 50) return "var(--status-diagnosed)";
  return "var(--status-critical)";
}

/* -------------------- icons -------------------- */

function AxolotlSVG() {
  // Side-view axolotl, facing right (+x). Wandering component flips horizontally
  // when swimming left. Tail + gills + dorsal fin have CSS-driven keyframe motion.
  return (
    <svg viewBox="-14 -2 124 70" aria-hidden="true">
      <defs>
        <radialGradient id="axo-body" cx="45%" cy="40%" r="62%">
          <stop offset="0%"  stopColor="#ffe9f1" />
          <stop offset="55%" stopColor="var(--axolotl-pink)" />
          <stop offset="100%" stopColor="#a8336a" />
        </radialGradient>
        <linearGradient id="axo-fin" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%"  stopColor="#ffe1ec" stopOpacity="0.85" />
          <stop offset="100%" stopColor="var(--axolotl-pink)" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id="axo-gill" cx="50%" cy="50%" r="60%">
          <stop offset="0%"  stopColor="#ffd2e1" />
          <stop offset="100%" stopColor="var(--axolotl-pink)" />
        </radialGradient>
      </defs>

      {/* dorsal fin (top, undulating) */}
      <path className="axo-fin-top" d="M22 18 Q40 4 62 18 L62 22 Q40 12 22 22 Z" fill="url(#axo-fin)" stroke="#ffb7d1" strokeWidth="0.4" strokeOpacity="0.6" />

      {/* tail (swishes) */}
      <g className="axo-tail">
        <path d="M80 32 Q100 18 108 32 Q100 46 80 32 Z" fill="url(#axo-body)" />
        <path d="M82 32 Q96 28 104 32" stroke="#a8336a" strokeWidth="0.5" fill="none" opacity="0.5" />
        <path d="M82 32 Q96 36 104 32" stroke="#a8336a" strokeWidth="0.5" fill="none" opacity="0.3" />
      </g>

      {/* gill stalks on the head side — feathery branches with bobbles */}
      <g className="axo-gills" opacity="0.95">
        <g fill="url(#axo-gill)">
          <path d="M16 22 Q2 12 -6 4  Q6 10 18 18 Z" />
          <path d="M14 28 Q-4 24 -12 20 Q4 24 18 26 Z" />
          <path d="M16 34 Q2 38 -8 46  Q10 40 20 36 Z" />
        </g>
        {/* gill bobbles */}
        <circle cx="-6" cy="4"  r="2" fill="#ffd2e1" />
        <circle cx="-12" cy="20" r="2" fill="#ffd2e1" />
        <circle cx="-8" cy="46" r="2" fill="#ffd2e1" />
      </g>

      {/* belly highlight */}
      <ellipse cx="42" cy="44" rx="24" ry="7" fill="#ffe9f1" opacity="0.35" />

      {/* body */}
      <ellipse cx="44" cy="32" rx="32" ry="16" fill="url(#axo-body)" />

      {/* legs (tiny stumps) */}
      <ellipse cx="28" cy="48" rx="4" ry="3" fill="#a8336a" opacity="0.75" />
      <ellipse cx="58" cy="48" rx="4" ry="3" fill="#a8336a" opacity="0.75" />
      {/* tiny toes */}
      <circle cx="25" cy="50" r="0.9" fill="#a8336a" opacity="0.6" />
      <circle cx="28" cy="51" r="0.9" fill="#a8336a" opacity="0.6" />
      <circle cx="31" cy="50" r="0.9" fill="#a8336a" opacity="0.6" />
      <circle cx="55" cy="50" r="0.9" fill="#a8336a" opacity="0.6" />
      <circle cx="58" cy="51" r="0.9" fill="#a8336a" opacity="0.6" />
      <circle cx="61" cy="50" r="0.9" fill="#a8336a" opacity="0.6" />

      {/* cheek blush */}
      <ellipse cx="60" cy="36" rx="4.5" ry="2.2" fill="#ff9bc1" opacity="0.7" />

      {/* eye — single big right-facing eye with eyelashes */}
      <circle cx="66" cy="28" r="3.6" fill="#0a0e1a" />
      <circle cx="67.4" cy="26.6" r="1.3" fill="#fff" />
      <circle cx="65.2" cy="29.6" r="0.55" fill="#fff" />
      {/* eyelashes */}
      <path d="M63 25 L62 23.5" stroke="#0a0e1a" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M65 24.4 L64.6 22.6" stroke="#0a0e1a" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M67 24.3 L67.2 22.5" stroke="#0a0e1a" strokeWidth="0.8" strokeLinecap="round" />

      {/* smile */}
      <path d="M70 34 q3 2.8 5 0.4" stroke="#0a0e1a" strokeWidth="1.3" fill="none" strokeLinecap="round" />

      {/* highlight on top of head */}
      <ellipse cx="48" cy="22" rx="11" ry="3" fill="#ffe9f1" opacity="0.55" />
    </svg>
  );
}

/* -------------------- background particles + cursor glow -------------------- */

function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (!ref.current) return;
      ref.current.style.setProperty("--mx", `${e.clientX}px`);
      ref.current.style.setProperty("--my", `${e.clientY}px`);
    };
    window.addEventListener("pointermove", handler, { passive: true });
    return () => window.removeEventListener("pointermove", handler);
  }, []);
  return <div ref={ref} className="cursor-glow" aria-hidden="true" />;
}

/* Lehmer LCG — deterministic, no React-render reassignment lint hit. */
function makePrng(seed: number) {
  const state = { v: seed };
  return () => {
    state.v = (state.v * 9301 + 49297) % 233280;
    return state.v / 233280;
  };
}

function ParticleField() {
  // 36 deterministic floating dots, drifting on independent CSS keyframes.
  const dots = useMemo(() => {
    const out: { left: number; top: number; size: number; delay: number; dur: number; hue: "pink" | "cyan" }[] = [];
    const rand = makePrng(13);
    for (let i = 0; i < 36; i++) {
      out.push({
        left: rand() * 100,
        top: rand() * 100,
        size: 1 + rand() * 2.5,
        delay: -rand() * 18,
        dur: 14 + rand() * 18,
        hue: rand() > 0.55 ? "cyan" : "pink",
      });
    }
    return out;
  }, []);
  return (
    <div className="particle-field" aria-hidden="true">
      {dots.map((d, i) => (
        <span
          key={i}
          className={`particle ${d.hue}`}
          style={
            {
              left: `${d.left}%`,
              top: `${d.top}%`,
              width: `${d.size}px`,
              height: `${d.size}px`,
              animationDelay: `${d.delay}s`,
              animationDuration: `${d.dur}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/* ============================================================
   STATUS BAR
   ============================================================ */

function StatusBar({
  counts,
  ready,
}: {
  counts: Record<Severity, number>;
  ready: boolean;
}) {
  return (
    <header className="status-bar" role="banner">
      <div className="status-bar-inner">
        <div className="status-bar-top">
          <div className="brand">
            <span className="brand-icon" aria-hidden="true">🦎</span>
            <span>GITAXOLOTL</span>
          </div>
          <div className="status-bar-meta">
            <span className="live-dot">LIVE</span>
            <span className="version-tag">v1.0-alpha</span>
          </div>
        </div>
        <div className="status-grid">
          {SEVERITY_ORDER.map((sev) => (
            <StatusCell
              key={sev}
              sev={sev}
              total={counts[sev]}
              delta={DELTAS[sev]}
              start={ready}
            />
          ))}
        </div>
      </div>
    </header>
  );
}

function StatusCell({
  sev,
  total,
  delta,
  start,
}: {
  sev: Severity;
  total: number;
  delta: number;
  start: boolean;
}) {
  const animated = useCountUp(total, 1500, start);
  const sparkPoints = useMemo(() => sparklineFor(sev, total), [sev, total]);
  return (
    <div
      className="status-cell"
      role="status"
      aria-label={`${SEVERITY_LABEL[sev]} ${total}`}
      style={{ ["--cell-color" as string]: SEVERITY_COLOR[sev] } as CSSProperties}
    >
      <div className="status-cell-row">
        <div className="status-cell-value">{animated}</div>
        <Sparkline points={sparkPoints} color={SEVERITY_COLOR[sev]} />
      </div>
      <div className={`status-cell-label ${sev}`}>{SEVERITY_LABEL[sev]}</div>
      <div className={`status-cell-delta ${delta >= 0 ? "" : "negative"}`}>
        <span className="delta-arrow">{delta >= 0 ? "▲" : "▼"}</span>
        <span>{(delta >= 0 ? "+" : "") + delta} today</span>
      </div>
    </div>
  );
}

/* Deterministic sparkline values per severity, ending at `endValue` */
function sparklineFor(sev: Severity, endValue: number): number[] {
  // 12-point pseudo-random walk seeded by severity index
  const seedBase = SEVERITY_ORDER.indexOf(sev) * 137 + 41;
  let s = seedBase;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const out: number[] = [];
  const len = 12;
  let v = Math.max(0, endValue - 3 + Math.floor(rand() * 4));
  for (let i = 0; i < len - 1; i++) {
    out.push(v);
    const step = (rand() - 0.4) * 1.6;
    v = Math.max(0, v + step);
  }
  out.push(endValue);
  return out;
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
  const max = Math.max(1, ...points);
  const W = 64;
  const H = 22;
  const step = W / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = H - (p / max) * (H - 2) - 1;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const last = points[points.length - 1];
  const lx = W;
  const ly = H - (last / max) * (H - 2) - 1;
  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${W + 4} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={path} stroke={color} strokeWidth="1.4" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="1.6" fill={color}>
        <animate attributeName="r" values="1.6;2.6;1.6" dur="1.8s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/* ============================================================
   PIPELINE (2A) + HEALING CARDS (2B)
   ============================================================ */

function HealingPipeline({
  errors,
  filter,
  onStageClick,
  onClearFilter,
  filteredErrors,
  onAgentClick,
  ready,
}: {
  errors: ErrorRow[];
  filter: ActiveFilter;
  onStageClick: (sev: Severity) => void;
  onClearFilter: () => void;
  filteredErrors: ErrorRow[];
  onAgentClick: (agentName: string) => void;
  ready: boolean;
}) {
  const stageCounts = useMemo(() => {
    const c: Record<Severity, number> = { critical: 0, diagnosed: 0, regenerating: 0, healed: 0 };
    for (const e of errors) c[e.severity] += 1;
    return c;
  }, [errors]);

  const isStageSelected = (sev: Severity) =>
    filter?.type === "stage" && filter.value === sev;

  return (
    <section className="section" aria-labelledby="pipeline-title">
      <div className="section-head">
        <h2 className="section-title" id="pipeline-title">Healing Pipeline</h2>
        {filter && (
          <span className="filter-chip" role="status">
            Viewing:{" "}
            {filter.type === "stage"
              ? SEVERITY_LABEL[filter.value]
              : `${filter.value}'s repairs`}
            <button onClick={onClearFilter} aria-label="Clear filter">✕</button>
          </span>
        )}
      </div>

      <div className="pipeline">
        <div className="pipeline-stages" role="tablist" aria-label="Filter by pipeline stage">
          {SEVERITY_ORDER.map((sev) => {
            const count = stageCounts[sev];
            const selected = isStageSelected(sev);
            const isActive = sev !== "healed" && count > 0;
            const isComplete = sev === "healed";
            const style = { ["--stage-color"]: SEVERITY_COLOR[sev] } as CSSProperties;
            return (
              <button
                key={sev}
                role="tab"
                aria-selected={selected}
                aria-label={`Filter by ${SEVERITY_LABEL[sev]}`}
                className={`pipeline-stage ${isActive ? "active" : ""} ${selected ? "selected" : ""}`}
                style={style}
                onClick={() => onStageClick(sev)}
              >
                <div className="pipeline-stage-label">{SEVERITY_LABEL[sev]}</div>
                <div className="pipeline-stage-count">{count}</div>
                <div
                  className={`pipeline-stage-caption ${
                    isComplete ? "is-complete" : isActive ? "is-active" : ""
                  }`}
                >
                  {isComplete ? "complete" : isActive ? "pulsing" : "idle"}
                </div>
              </button>
            );
          })}
        </div>

        <div className="pipeline-connectors" aria-hidden="true">
          <svg viewBox="0 0 400 24" preserveAspectRatio="none">
            <defs>
              <marker id="arrow-head" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0 0 L8 4 L0 8 Z" fill="var(--gitlawb-cyan)" opacity="0.85" />
              </marker>
            </defs>
            <line className="connector-line" x1="0"   y1="12" x2="100" y2="12" markerEnd="url(#arrow-head)" />
            <line className="connector-line" x1="133" y1="12" x2="233" y2="12" markerEnd="url(#arrow-head)" />
            <line className="connector-line" x1="266" y1="12" x2="396" y2="12" markerEnd="url(#arrow-head)" />
            <circle className="connector-dot" cy="12" r="2.2" style={{ animationDelay: "0s" } as CSSProperties} />
            <circle className="connector-dot" cy="12" r="2.2" style={{ animationDelay: "1s" } as CSSProperties} />
            <circle className="connector-dot" cy="12" r="2.2" style={{ animationDelay: "2s" } as CSSProperties} />
          </svg>
        </div>

        <div className="healing-cards" role="list" aria-label="Healing cards">
          {!ready
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton card" aria-hidden="true" />
              ))
            : filteredErrors.length === 0
            ? (
              <div className="empty-state">
                No errors match this filter — try clearing the filter to see all 18 items.
              </div>
            )
            : filteredErrors.map((e) => (
                <HealingCard key={e.id} error={e} onAgentClick={onAgentClick} />
              ))}
        </div>
      </div>
    </section>
  );
}

function HealingCard({
  error,
  onAgentClick,
}: {
  error: ErrorRow;
  onAgentClick: (agent: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const style = { ["--card-color"]: SEVERITY_COLOR[error.severity], ["--progress"]: `${error.progress}%` } as CSSProperties;

  const timeline = useMemo(() => buildTimeline(error), [error]);

  return (
    <div
      className="healing-card"
      style={style}
      role="listitem"
      tabIndex={0}
      onClick={() => setExpanded((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setExpanded((v) => !v);
        }
      }}
      aria-expanded={expanded}
    >
      <div className="healing-card-top">
        <span className="severity-pill">{SEVERITY_LABEL[error.severity]}</span>
        <span className="healing-card-title">{error.title}</span>
      </div>
      <div className="healing-card-meta">
        <span className="meta-file">
          <span className="icon" aria-hidden="true">📁</span>
          {error.file}
        </span>
        <span>
          <span aria-hidden="true">👤 Assigned: </span>
          <button
            className="meta-agent"
            onClick={(ev) => {
              ev.stopPropagation();
              onAgentClick(error.agent);
            }}
            aria-label={`Jump to agent ${error.agent}`}
          >
            {error.agent}
          </button>
        </span>
        <span aria-label={`Updated ${error.time}`}>
          <span aria-hidden="true">⏱ </span>
          {error.time}
        </span>
      </div>
      <div className="progress-row">
        <div className="progress-bar" aria-hidden="true">
          <div
            className={`progress-fill ${error.progress >= 100 ? "complete" : ""}`}
          />
        </div>
        <div className="progress-label">
          {error.progress}% ({error.action})
        </div>
      </div>

      {expanded && (
        <div className="healing-card-expand">
          <div className="expand-description">{error.description}</div>
          <ul className="expand-timeline">
            {timeline.map((step, i) => (
              <li key={i}>
                <span className="ts">{step.time}</span>
                <span>{step.action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function buildTimeline(error: ErrorRow): { time: string; action: string }[] {
  // Deterministic 3-5 step timeline derived from id+severity+progress
  const base = new Date();
  base.setSeconds(0, 0);
  const offset = ((error.id * 7) % 60) + 5; // minutes ago
  const t = (mins: number) => {
    const d = new Date(base.getTime() - (offset - mins) * 60_000);
    return formatHHMMSS(d).slice(0, 5);
  };
  const steps: { time: string; action: string }[] = [
    { time: t(0),  action: "scan initiated" },
    { time: t(4),  action: "vulnerability confirmed" },
    { time: t(8),  action: "patch drafted" },
  ];
  if (error.progress >= 50) steps.push({ time: t(12), action: "tests running" });
  if (error.progress >= 80) steps.push({ time: t(16), action: "deploy verified" });
  if (error.progress >= 100) steps.push({ time: t(20), action: "marked healed" });
  return steps;
}

/* ============================================================
   AGENT HEALTH GRID
   ============================================================ */

function AgentHealthGrid({
  agents,
  filter,
  highlightedAgent,
  onAgentClick,
  registerRef,
  ready,
}: {
  agents: Agent[];
  filter: ActiveFilter;
  highlightedAgent: string | null;
  onAgentClick: (id: string) => void;
  registerRef: (id: string, el: HTMLDivElement | null) => void;
  ready: boolean;
}) {
  return (
    <section className="section" aria-labelledby="agents-title">
      <div className="section-head">
        <h2 className="section-title" id="agents-title">Agent Health</h2>
        <span className="section-meta">{agents.length} Active</span>
      </div>
      <div className="agent-grid">
        {!ready
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton ring" aria-hidden="true" />
            ))
          : agents.map((a) => (
              <AgentCard
                key={a.id}
                agent={a}
                selected={filter?.type === "agent" && filter.value === a.id}
                highlighted={highlightedAgent === a.id}
                onClick={() => onAgentClick(a.id)}
                registerRef={registerRef}
              />
            ))}
      </div>
    </section>
  );
}

function AgentCard({
  agent,
  selected,
  highlighted,
  onClick,
  registerRef,
}: {
  agent: Agent;
  selected: boolean;
  highlighted: boolean;
  onClick: () => void;
  registerRef: (id: string, el: HTMLDivElement | null) => void;
}) {
  const color = ringColor(agent.health);
  const value = useCountUp(agent.health, 1500);

  const r = 36;
  const circumference = 2 * Math.PI * r;
  const filled = (agent.health / 100) * circumference;
  const offset = circumference - filled;

  return (
    <div
      ref={(el) => registerRef(agent.id, el)}
      className={`agent-card ${selected ? "selected" : ""} ${highlighted ? "highlight" : ""} ${agent.health < 60 ? "low" : ""}`}
      style={{ ["--ring-color"]: color } as CSSProperties}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      aria-pressed={selected}
      aria-label={`${agent.name} — ${agent.role}, health ${agent.health}%, ${agent.activeRepairs} active repairs, success rate ${agent.successRate}%`}
    >
      <div className={`agent-ring ${agent.health < 60 ? "low-health" : ""}`}>
        <svg viewBox="0 0 96 96">
          <circle className="ring-bg" cx="48" cy="48" r={r} strokeWidth="6" />
          <circle
            className="ring-fg"
            cx="48"
            cy="48"
            r={r}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="agent-ring-value">{value}%</div>
      </div>
      <div className="agent-name">{agent.name}</div>
      <div className="agent-role">{agent.role}</div>
      <div className="agent-meta">
        <div>{agent.activeRepairs} fixing</div>
        <div className="ok">{agent.successRate.toFixed(1)}% OK</div>
      </div>
    </div>
  );
}

/* ============================================================
   REGENERATION LOG
   ============================================================ */

const MAX_LOG = 12;

function RegenerationLog() {
  const [entries, setEntries] = useState<LogEntry[]>(() =>
    LOG_SEEDS.map((s, i) => ({
      ...s,
      id: i,
      time: formatHHMMSS(new Date(Date.now() - (LOG_SEEDS.length - i) * 4000)),
    }))
  );
  const nextId = useRef(LOG_SEEDS.length);
  const cursorRef = useRef(0);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const tick = () => {
      const seed = LOG_SEEDS[cursorRef.current % LOG_SEEDS.length];
      cursorRef.current += 1;
      const entry: LogEntry = {
        ...seed,
        id: nextId.current++,
        time: formatHHMMSS(new Date()),
      };
      setEntries((prev) => {
        const next = [...prev, entry];
        if (next.length > MAX_LOG) next.splice(0, next.length - MAX_LOG);
        return next;
      });
      // auto-scroll to bottom
      requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      });
    };
    const id = setInterval(tick, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="section" aria-labelledby="log-title">
      <div className="log">
        <div className="log-head">
          <h2 className="section-title" id="log-title">Regeneration Log</h2>
          <span className="live-dot section-meta" style={{ color: "var(--status-healed)" }}>streaming</span>
        </div>
        <ul className="log-list" ref={listRef} aria-live="polite">
          {entries.map((e, i) => (
            <li key={e.id} className="log-row">
              <span className="log-ts">[{e.time}]</span>
              <span className="log-agent">{padEnd(e.agent, 7)}</span>
              <span>
                <span className="log-arrow">→ </span>
                <span className={`log-action ${e.color}`}>{padEnd(e.action, 18)}</span>
                <span className="log-arrow">→ </span>
                <span className="log-target">{e.target}</span>
                {i === entries.length - 1 && <span className="log-cursor" aria-hidden="true" />}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ============================================================
   AXOLOTL AVATAR
   ============================================================ */

/* Wandering axolotl: random-walk around the viewport, tilt with velocity,
   click → quick dart toward the cursor + wiggle. */
function WanderingAxolotl() {
  const containerRef = useRef<HTMLButtonElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    x: 200, y: 220,
    vx: 0.4, vy: 0.1,
    tx: 400, ty: 320,
    speedBoost: 0,
    facing: 1 as 1 | -1,
    angle: 0,
  });
  const lastBubbleRef = useRef(0);
  const bubbleIdRef = useRef(0);
  const [bubbles, setBubbles] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    let raf = 0;

    const pickTarget = () => {
      const s = stateRef.current;
      const W = Math.max(360, window.innerWidth);
      const H = Math.max(480, window.innerHeight);
      // avoid status-bar (top ~120) and very edges
      s.tx = 60 + Math.random() * (W - 180);
      s.ty = 140 + Math.random() * (H - 220);
    };
    pickTarget();

    const onResize = () => pickTarget();
    window.addEventListener("resize", onResize);

    const tick = (t: number) => {
      const s = stateRef.current;
      const dx = s.tx - s.x;
      const dy = s.ty - s.y;
      const dist = Math.hypot(dx, dy);

      // when close to target, pick a new one
      if (dist < 40) pickTarget();

      // steer with gentle acceleration
      const steer = 0.05 + s.speedBoost * 0.15;
      s.vx += (dx / Math.max(dist, 0.001)) * steer;
      s.vy += (dy / Math.max(dist, 0.001)) * steer;

      // organic wiggle
      s.vx += (Math.random() - 0.5) * 0.05;
      s.vy += (Math.random() - 0.5) * 0.04;

      // damping
      s.vx *= 0.92;
      s.vy *= 0.92;

      // speed cap
      const sp = Math.hypot(s.vx, s.vy);
      const cap = 3.4 + s.speedBoost * 5;
      if (sp > cap) {
        s.vx = (s.vx / sp) * cap;
        s.vy = (s.vy / sp) * cap;
      }

      s.x += s.vx;
      s.y += s.vy;
      s.speedBoost = Math.max(0, s.speedBoost - 0.02);

      // facing flip based on horizontal velocity
      if (Math.abs(s.vx) > 0.2) s.facing = s.vx >= 0 ? 1 : -1;
      s.angle = Math.atan2(s.vy, Math.abs(s.vx) + 0.001) * (180 / Math.PI) * 0.45;

      const el = containerRef.current;
      if (el) {
        el.style.transform =
          `translate3d(${s.x}px, ${s.y}px, 0) ` +
          `scaleX(${s.facing}) ` +
          `rotate(${s.angle * s.facing}deg)`;
      }

      // emit bubble every ~140ms while moving
      if (sp > 0.6 && t - lastBubbleRef.current > 140) {
        lastBubbleRef.current = t;
        const id = bubbleIdRef.current++;
        // bubble origin: tail-side of the axolotl (depends on facing)
        const tailOffsetX = s.facing === 1 ? -28 : 28;
        const bx = s.x + tailOffsetX + (Math.random() - 0.5) * 8;
        const by = s.y + 6 + (Math.random() - 0.5) * 8;
        setBubbles((prev) => {
          const next = [...prev, { id, x: bx, y: by }];
          // cap
          if (next.length > 24) next.splice(0, next.length - 24);
          return next;
        });
        window.setTimeout(() => {
          setBubbles((prev) => prev.filter((b) => b.id !== id));
        }, 1600);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const dartTo = (clientX: number, clientY: number) => {
    const s = stateRef.current;
    s.tx = clientX;
    s.ty = clientY;
    s.speedBoost = 1;
  };

  return (
    <>
      <div ref={trailRef} className="axo-trail" aria-hidden="true">
        {bubbles.map((b) => (
          <span
            key={b.id}
            className="axo-bubble"
            style={{ left: b.x, top: b.y } as CSSProperties}
          />
        ))}
      </div>
      <button
        ref={containerRef}
        className="wandering-axolotl"
        aria-label="GitAxolotl mascot — wandering the network"
        onClick={(e) => dartTo(e.clientX, e.clientY)}
      >
        <AxolotlSVG />
      </button>
    </>
  );
}

/* ============================================================
   APP
   ============================================================ */

export default function App() {
  const [filter, setFilter] = useState<ActiveFilter>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const agentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const registerRef = useCallback((id: string, el: HTMLDivElement | null) => {
    agentRefs.current[id] = el;
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setReady(true), 900);
    return () => clearTimeout(id);
  }, []);

  // counts respect active filter (so StatusBar reflects filtered state per brief)
  const visibleErrors = useMemo(() => {
    if (!filter) return MOCK_ERRORS;
    if (filter.type === "stage") return MOCK_ERRORS.filter((e) => e.severity === filter.value);
    const agentName = MOCK_AGENTS.find((a) => a.id === filter.value)?.name;
    return MOCK_ERRORS.filter((e) => e.agent === agentName);
  }, [filter]);

  const counts = useMemo<Record<Severity, number>>(() => {
    const c: Record<Severity, number> = { critical: 0, diagnosed: 0, regenerating: 0, healed: 0 };
    for (const e of visibleErrors) c[e.severity] += 1;
    return c;
  }, [visibleErrors]);

  const onStageClick = useCallback((sev: Severity) => {
    setFilter((prev) =>
      prev?.type === "stage" && prev.value === sev ? null : { type: "stage", value: sev }
    );
  }, []);

  const onAgentCardClick = useCallback((id: string) => {
    setFilter((prev) =>
      prev?.type === "agent" && prev.value === id ? null : { type: "agent", value: id }
    );
  }, []);

  // Jump from a healing card's agent label to the agent grid card
  const onAgentNameClick = useCallback((agentName: string) => {
    const agent = MOCK_AGENTS.find((a) => a.name === agentName);
    if (!agent) return;
    const el = agentRefs.current[agent.id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlight(agent.id);
      window.setTimeout(() => setHighlight(null), 3000);
    }
  }, []);

  const onClearFilter = useCallback(() => setFilter(null), []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const tag = (ev.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      switch (ev.key) {
        case "1": setFilter({ type: "stage", value: "critical" }); break;
        case "2": setFilter({ type: "stage", value: "diagnosed" }); break;
        case "3": setFilter({ type: "stage", value: "regenerating" }); break;
        case "4": setFilter({ type: "stage", value: "healed" }); break;
        case "0": setFilter(null); break;
        default: return;
      }
      ev.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app">
      <div className="scanline" aria-hidden="true" />
      <StatusBar counts={counts} ready={ready} />
      <main>
        <HealingPipeline
          errors={MOCK_ERRORS}
          filter={filter}
          onStageClick={onStageClick}
          onClearFilter={onClearFilter}
          filteredErrors={visibleErrors}
          onAgentClick={onAgentNameClick}
          ready={ready}
        />
        <AgentHealthGrid
          agents={MOCK_AGENTS}
          filter={filter}
          highlightedAgent={highlight}
          onAgentClick={onAgentCardClick}
          registerRef={registerRef}
          ready={ready}
        />
        <RegenerationLog />
        <p className="sr-only">
          Keyboard shortcuts: 1 Critical, 2 Diagnosed, 3 Regenerating, 4 Healed, 0 clears filters.
        </p>
      </main>
      <CursorGlow />
      <ParticleField />
      <WanderingAxolotl />
    </div>
  );
}
