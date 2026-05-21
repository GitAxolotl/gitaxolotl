import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type RefObject,
} from "react";

/* ============================================================
   GitAxolotl — builder control room
   A calm, restrained surface for turning a GitHub repository or a
   live website into a playground-ready app. No marketing slop, no
   filler animation, no generic "AI dashboard" energy.
   ============================================================ */

type SourceKind = "repo" | "site";

type SourceProfile = {
  title: string;
  subtitle: string;
  language: string;
  stars: string;
  files: number;
  routes: number;
  pages: string[];
  signals: string[];
};

type StepStatus = "done" | "active" | "queued";

type PipelineStep = {
  id: string;
  title: string;
  status: StepStatus;
  detail: string;
  duration: string;
};

type Gate = {
  id: string;
  title: string;
  owner: string;
  score: number;
  state: "passed" | "review" | "queued";
  detail: string;
  evidence: string[];
};

type Agent = {
  name: string;
  role: string;
  focus: string;
  load: number;
};

type AuditRow = {
  time: string;
  source: string;
  message: string;
};

const SOURCE_EXAMPLES: Record<SourceKind, string[]> = {
  repo: [
    "GitAxolotl/gitaxolotl",
    "GitLawB/playground",
    "https://github.com/GitAxolotl/openclaude",
  ],
  site: [
    "https://playground.gitlawb.com",
    "https://docs.gitlawb.com",
    "https://gitlawb.com",
  ],
};

const REPO_PROFILE: SourceProfile = {
  title: "GitAxolotl / gitaxolotl",
  subtitle: "Builder control room • main",
  language: "TypeScript",
  stars: "1.2k",
  files: 38,
  routes: 6,
  pages: ["index.html", "src/App.tsx", "src/index.css", "public/favicon.svg"],
  signals: [
    "Vite + React 19 + TypeScript",
    "Single-file app — easy to port to playground",
    "ESLint clean, no unused dependencies",
  ],
};

const SITE_PROFILE: SourceProfile = {
  title: "playground.gitlawb.com",
  subtitle: "Live site • production",
  language: "Static + React",
  stars: "—",
  files: 12,
  routes: 4,
  pages: ["/", "/projects", "/apps", "/publish"],
  signals: [
    "Hero, examples list, preview panel",
    "Sign-in flow (X / Twitter)",
    "Publish + projects pages share the same shell",
  ],
};

const PIPELINE: PipelineStep[] = [
  {
    id: "intake",
    title: "Intake",
    status: "done",
    detail:
      "Read the repository tree or crawl the live site. Capture pages, copy, and intent — not screenshots.",
    duration: "00:12",
  },
  {
    id: "brief",
    title: "Brief",
    status: "done",
    detail:
      "Summarise the product into one tight app brief. Decide what stays, what gets cut, what gets renamed.",
    duration: "00:28",
  },
  {
    id: "build",
    title: "Build",
    status: "active",
    detail:
      "Generate React components, restrained CSS, and real interaction states. No template hero sections.",
    duration: "01:14",
  },
  {
    id: "verify",
    title: "Verify",
    status: "queued",
    detail:
      "Lint, type-check, accessibility pass, responsive sweep, and a publish checklist before handoff.",
    duration: "00:31",
  },
];

const GATES: Gate[] = [
  {
    id: "structure",
    title: "Source structure mapped",
    owner: "Indexer",
    score: 98,
    state: "passed",
    detail:
      "Routes, assets, and copy blocks are extracted before generation, so the build agent never works blind.",
    evidence: [
      "38 source files indexed",
      "6 routes resolved",
      "0 orphan assets",
    ],
  },
  {
    id: "design",
    title: "Design system locked",
    owner: "Interface",
    score: 95,
    state: "passed",
    detail:
      "Spacing, type scale, and surfaces are pinned to a small set of tokens — restraint over decoration.",
    evidence: [
      "1 type scale, 1 surface scale",
      "Contrast ≥ 4.5:1 on body text",
      "Focus rings on every interactive element",
    ],
  },
  {
    id: "react",
    title: "React conversion verified",
    owner: "Compiler",
    score: 92,
    state: "review",
    detail:
      "Components are split by intent. Local state is local. Generated UI is reviewed for one-off template sludge.",
    evidence: [
      "12 components, no leaked any",
      "Strict mode safe",
      "Zero runtime deps beyond React",
    ],
  },
  {
    id: "publish",
    title: "Publish handoff",
    owner: "Release",
    score: 88,
    state: "queued",
    detail:
      "Preview metadata, cache headers, and deploy notes are prepared so the playground or Vercel build is boring.",
    evidence: [
      "vercel.json present",
      "Long-cache headers on /assets",
      "SPA fallback configured",
    ],
  },
];

const AGENTS: Agent[] = [
  { name: "AXO", role: "Editor", focus: "Keeps scope sharp", load: 42 },
  { name: "FORGE", role: "Build engineer", focus: "Hardens output", load: 63 },
  { name: "CIPHER", role: "Trust reviewer", focus: "Checks risk", load: 34 },
  { name: "NEXUS", role: "Publisher", focus: "Ships clean", load: 51 },
];

const AUDIT: AuditRow[] = [
  { time: "12:04:11", source: "Indexer", message: "Source structure mapped — 38 files, 6 routes." },
  { time: "12:04:32", source: "Editor", message: "App brief locked at 184 words." },
  { time: "12:05:09", source: "Compiler", message: "12 components emitted, strict mode safe." },
  { time: "12:05:41", source: "Reviewer", message: "Contrast and focus pass on all surfaces." },
  { time: "12:06:02", source: "Release", message: "Publish handoff queued. Awaiting human review." },
];

/* -------------------- helpers -------------------- */

function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function normalizeSource(kind: SourceKind, raw: string): string {
  const value = raw.trim();
  if (!value) return kind === "repo" ? "GitAxolotl/gitaxolotl" : "https://playground.gitlawb.com";
  if (kind === "site" && !/^https?:\/\//i.test(value)) return `https://${value}`;
  if (kind === "repo" && value.startsWith("git@github.com:")) {
    return value.replace("git@github.com:", "").replace(/\.git$/, "");
  }
  if (kind === "repo" && /^https?:\/\/github\.com\//i.test(value)) {
    return value.replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/, "");
  }
  return value;
}

function statusLabel(state: Gate["state"]): string {
  if (state === "passed") return "Passed";
  if (state === "review") return "In review";
  return "Queued";
}

function stepStatusLabel(status: StepStatus): string {
  if (status === "done") return "Done";
  if (status === "active") return "Running";
  return "Queued";
}

/* -------------------- mascot -------------------- */

/**
 * Axolotl mascot — single-color, geometric line + soft fill silhouette.
 * Designed to read as confident and clean at any size: 24px favicon up to
 * 220px hero figure. No cartoon eyes, no gradients per limb, no "AI 3D blob".
 */
function AxolotlMascot({
  size = 220,
  decorative = true,
}: {
  size?: number;
  decorative?: boolean;
}) {
  const accent = "#c8f284";
  return (
    <svg
      className="mascot-svg"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "GitAxolotl mascot"}
      aria-hidden={decorative ? "true" : undefined}
    >
      <defs>
        <linearGradient id="mascot-body" x1="30%" y1="10%" x2="70%" y2="100%">
          <stop offset="0%" stopColor="#1f2a37" />
          <stop offset="100%" stopColor="#0d1218" />
        </linearGradient>
        <radialGradient id="mascot-cheek" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.55" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft halo */}
      <circle cx="100" cy="100" r="82" fill="url(#mascot-cheek)" opacity="0.45" />

      {/* Tail */}
      <path
        d="M100 160 C 96 178, 84 188, 70 188 C 86 178, 92 168, 96 158 Z"
        fill="url(#mascot-body)"
        stroke={accent}
        strokeOpacity="0.4"
        strokeWidth="1"
      />

      {/* Body */}
      <path
        d="M60 110 C 60 78, 78 60, 100 60 C 122 60, 140 78, 140 110 C 140 140, 124 162, 100 162 C 76 162, 60 140, 60 110 Z"
        fill="url(#mascot-body)"
        stroke={accent}
        strokeOpacity="0.6"
        strokeWidth="1.4"
      />

      {/* Belly highlight */}
      <path
        d="M82 118 C 84 138, 92 152, 100 152 C 108 152, 116 138, 118 118 C 116 130, 108 140, 100 140 C 92 140, 84 130, 82 118 Z"
        fill={accent}
        opacity="0.07"
      />

      {/* Outer gill plumes (3 each side) */}
      <g fill="none" stroke={accent} strokeWidth="1.4" strokeLinecap="round" opacity="0.85">
        <path d="M64 84 C 50 80, 40 70, 38 56" />
        <path d="M62 92 C 44 92, 30 86, 24 74" />
        <path d="M62 100 C 44 104, 30 104, 22 96" />
        <path d="M136 84 C 150 80, 160 70, 162 56" />
        <path d="M138 92 C 156 92, 170 86, 176 74" />
        <path d="M138 100 C 156 104, 170 104, 178 96" />
      </g>

      {/* Gill tips */}
      <g fill={accent} opacity="0.9">
        <circle cx="38" cy="56" r="2.4" />
        <circle cx="24" cy="74" r="2.4" />
        <circle cx="22" cy="96" r="2.4" />
        <circle cx="162" cy="56" r="2.4" />
        <circle cx="176" cy="74" r="2.4" />
        <circle cx="178" cy="96" r="2.4" />
      </g>

      {/* Head crown */}
      <path
        d="M70 78 C 80 64, 120 64, 130 78"
        fill="none"
        stroke={accent}
        strokeOpacity="0.45"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Eyes */}
      <g fill="#e7ecf3">
        <circle cx="86" cy="104" r="3.2" />
        <circle cx="114" cy="104" r="3.2" />
      </g>
      <g fill={accent}>
        <circle cx="87.2" cy="103" r="1.1" />
        <circle cx="115.2" cy="103" r="1.1" />
      </g>

      {/* Cheek dots */}
      <g fill={accent} opacity="0.5">
        <circle cx="76" cy="118" r="2.4" />
        <circle cx="124" cy="118" r="2.4" />
      </g>

      {/* Smile */}
      <path
        d="M92 124 C 96 130, 104 130, 108 124"
        fill="none"
        stroke="#e7ecf3"
        strokeOpacity="0.7"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Foreground sparks */}
      <g fill={accent} opacity="0.7">
        <circle cx="154" cy="40" r="1.6" />
        <circle cx="46" cy="38" r="1.2" />
      </g>
    </svg>
  );
}

/* -------------------- header -------------------- */

function Topbar({
  kind,
  source,
}: {
  kind: SourceKind;
  source: string;
}) {
  return (
    <header className="topbar" role="banner">
      <a className="brand" href="#top" aria-label="GitAxolotl home">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path
              d="M16 6 C 10 6, 6 11, 6 17 C 6 23, 10 26, 16 26 C 22 26, 26 23, 26 17 C 26 11, 22 6, 16 6 Z"
              fill="currentColor"
              opacity="0.16"
            />
            <path
              d="M16 6 C 10 6, 6 11, 6 17 C 6 23, 10 26, 16 26 C 22 26, 26 23, 26 17 C 26 11, 22 6, 16 6 Z"
              stroke="currentColor"
              strokeWidth="1.4"
              fill="none"
            />
            <path d="M7 11 C 4 10, 2.5 7.5, 2.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            <path d="M6.5 16 C 3 16, 1 14, 0.5 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            <path d="M25 11 C 28 10, 29.5 7.5, 29.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            <path d="M25.5 16 C 29 16, 31 14, 31.5 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            <circle cx="13" cy="17.5" r="1.3" fill="currentColor" />
            <circle cx="19" cy="17.5" r="1.3" fill="currentColor" />
            <path d="M14 21 C 15 22.4, 17 22.4, 18 21" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" fill="none" />
          </svg>
        </span>
        <span className="brand-text">
          <strong>GitAxolotl</strong>
          <small>Builder Control Room</small>
        </span>
      </a>

      <nav className="topbar-nav" aria-label="Primary navigation">
        <a href="#builder">Builder</a>
        <a href="#pipeline">Pipeline</a>
        <a href="#quality">Quality</a>
        <a href="#handoff">Handoff</a>
      </nav>

      <div className="topbar-source" aria-live="polite">
        <span className={classNames("dot", kind)} aria-hidden="true" />
        <span className="topbar-source-kind">{kind === "repo" ? "Repo" : "Site"}</span>
        <span className="topbar-source-value" title={source}>{source}</span>
      </div>

      <a
        className="topbar-cta"
        href="https://playground.gitlawb.com/"
        target="_blank"
        rel="noreferrer"
      >
        Open playground
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M5 3h8v8" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13 3 5 11" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </header>
  );
}

/* -------------------- hero -------------------- */

function Hero({
  profile,
  onJumpToBuilder,
}: {
  profile: SourceProfile;
  onJumpToBuilder: () => void;
}) {
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow">GitLawB hosted app builder</p>
        <h1 id="hero-title">
          Import a repository or a live website. Ship a calm, premium app — not another template.
        </h1>
        <p className="hero-lede">
          GitAxolotl is a small command room for the GitLawB playground. Point it at a GitHub repo
          or a real URL, watch the brief, build, and quality gates resolve, then publish when it
          looks like something a human would defend.
        </p>
        <div className="hero-actions">
          <button type="button" className="primary-action" onClick={onJumpToBuilder}>
            Configure source
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M3 8h10" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M9 4l4 4-4 4" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <a className="secondary-action" href="#quality">
            See quality gates
          </a>
        </div>
        <dl className="hero-meta">
          <div>
            <dt>Routes detected</dt>
            <dd>{profile.routes}</dd>
          </div>
          <div>
            <dt>Files indexed</dt>
            <dd>{profile.files}</dd>
          </div>
          <div>
            <dt>Primary stack</dt>
            <dd>{profile.language}</dd>
          </div>
        </dl>
      </div>

      <aside className="hero-panel" aria-label="Build readiness snapshot">
        <figure className="mascot-figure" aria-hidden="true">
          <AxolotlMascot size={148} />
          <figcaption>
            <span className="eyebrow muted">Mascot</span>
            <strong>Axo</strong>
            <small>Quiet editor. Reads the brief before anyone types.</small>
          </figcaption>
        </figure>
        <div className="hero-panel-head">
          <div>
            <p className="eyebrow muted">Build readiness</p>
            <h2>Calm by construction</h2>
          </div>
          <span className="badge">no blocking issues</span>
        </div>
        <div className="hero-stats">
          <article>
            <span>Readiness</span>
            <strong>97%</strong>
            <small>Sign-in &amp; publish wired</small>
          </article>
          <article>
            <span>Bundle</span>
            <strong>68 KB</strong>
            <small>Gzipped shell</small>
          </article>
          <article>
            <span>Gates</span>
            <strong>4 / 4</strong>
            <small>Owners assigned</small>
          </article>
          <article>
            <span>First paint</span>
            <strong>0.8s</strong>
            <small>Target on 4G mobile</small>
          </article>
        </div>
      </aside>
    </section>
  );
}

/* -------------------- builder -------------------- */

function Builder({
  kind,
  setKind,
  value,
  setValue,
  resolved,
  profile,
  onSubmit,
  inputRef,
}: {
  kind: SourceKind;
  setKind: (k: SourceKind) => void;
  value: string;
  setValue: (v: string) => void;
  resolved: string;
  profile: SourceProfile;
  onSubmit: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <section className="builder" id="builder" aria-labelledby="builder-title">
      <div className="section-heading">
        <p className="eyebrow">Source intake</p>
        <h2 id="builder-title">
          One input. Two intents. Repository, or a live website you want recreated as an app.
        </h2>
      </div>

      <div className="builder-layout">
        <form className="builder-form" onSubmit={handleSubmit}>
          <div className="mode-switch" role="group" aria-label="Choose source type">
            {(["repo", "site"] as SourceKind[]).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={kind === option}
                className={classNames("mode-button", kind === option && "active")}
                onClick={() => {
                  setKind(option);
                  setValue(SOURCE_EXAMPLES[option][0]);
                  inputRef.current?.focus();
                }}
              >
                {option === "repo" ? "GitHub repository" : "Live website"}
              </button>
            ))}
          </div>

          <label className="source-field">
            <span>{kind === "repo" ? "Repository" : "Website URL"}</span>
            <input
              ref={inputRef}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={kind === "repo" ? "owner/repo or GitHub URL" : "https://your-site.com"}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="url"
            />
          </label>

          <ul className="example-row" aria-label="Example sources">
            {SOURCE_EXAMPLES[kind].map((example) => (
              <li key={example}>
                <button type="button" onClick={() => setValue(example)}>
                  {example}
                </button>
              </li>
            ))}
          </ul>

          <div className="builder-actions">
            <button type="submit" className="primary-action">
              Generate brief
            </button>
            <span className="resolved" aria-live="polite">
              Resolved as <strong>{resolved}</strong>
            </span>
          </div>
        </form>

        <article className="source-card" aria-label="Source preview">
          <header>
            <div>
              <p className="eyebrow muted">{profile.subtitle}</p>
              <h3>{profile.title}</h3>
            </div>
            <span className="badge subtle">{profile.language}</span>
          </header>

          <ul className="source-pages">
            {profile.pages.map((page) => (
              <li key={page}>
                <span className="page-bullet" aria-hidden="true" />
                <code>{page}</code>
              </li>
            ))}
          </ul>

          <footer>
            <ul className="source-signals">
              {profile.signals.map((signal) => (
                <li key={signal}>{signal}</li>
              ))}
            </ul>
          </footer>
        </article>
      </div>
    </section>
  );
}

/* -------------------- pipeline -------------------- */

function Pipeline() {
  return (
    <section className="section pipeline" id="pipeline" aria-labelledby="pipeline-title">
      <div className="section-heading">
        <p className="eyebrow">Pipeline</p>
        <h2 id="pipeline-title">
          Few steps. Clear owner per step. Nothing happens off-screen.
        </h2>
      </div>
      <ol className="pipeline-grid" role="list">
        {PIPELINE.map((step, index) => (
          <li
            key={step.id}
            className={classNames("pipeline-card", step.status)}
            aria-current={step.status === "active" ? "step" : undefined}
          >
            <div className="pipeline-card-head">
              <span className="step-index">0{index + 1}</span>
              <span className={classNames("pill", step.status)}>{stepStatusLabel(step.status)}</span>
            </div>
            <h3>{step.title}</h3>
            <p>{step.detail}</p>
            <footer>
              <span>{step.duration}</span>
              {step.status !== "queued" && (
                <span className="meter" aria-hidden="true">
                  <i style={{ width: step.status === "done" ? "100%" : "62%" }} />
                </span>
              )}
            </footer>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* -------------------- quality gates -------------------- */

function Quality() {
  const [activeId, setActiveId] = useState<string>(GATES[0].id);
  const active = useMemo(() => GATES.find((gate) => gate.id === activeId) ?? GATES[0], [activeId]);

  return (
    <section className="section quality" id="quality" aria-labelledby="quality-title">
      <div className="section-heading">
        <p className="eyebrow">Quality control</p>
        <h2 id="quality-title">
          Every surface has a named owner and a visible reason to pass.
        </h2>
      </div>

      <div className="quality-layout">
        <ul className="gate-list" aria-label="Quality gates">
          {GATES.map((gate) => {
            const selected = gate.id === active.id;
            return (
              <li key={gate.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-controls="gate-detail"
                  className={classNames("gate-row", selected && "active", gate.state)}
                  onClick={() => setActiveId(gate.id)}
                >
                  <span className={classNames("status-dot", gate.state)} aria-hidden="true" />
                  <span className="gate-row-body">
                    <strong>{gate.title}</strong>
                    <small>
                      {gate.owner} · {statusLabel(gate.state)}
                    </small>
                  </span>
                  <span className="gate-score">{gate.score}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <article className="gate-detail" id="gate-detail" aria-live="polite">
          <div
            className={classNames("score-ring", active.state)}
            style={{ "--score": `${active.score}%` } as CSSProperties}
            aria-hidden="true"
          >
            <span>{active.score}</span>
          </div>
          <div className="gate-detail-body">
            <p className="eyebrow muted">{active.owner}</p>
            <h3>{active.title}</h3>
            <p>{active.detail}</p>
            <ul className="evidence" aria-label="Evidence">
              {active.evidence.map((item) => (
                <li key={item}>
                  <span aria-hidden="true">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </article>
      </div>
    </section>
  );
}

/* -------------------- agents -------------------- */

function Crew() {
  return (
    <section className="section crew" aria-labelledby="crew-title">
      <div className="section-heading compact">
        <p className="eyebrow">Builder crew</p>
        <h2 id="crew-title">Agents with specific jobs. No vague magic.</h2>
      </div>
      <div className="agent-grid">
        {AGENTS.map((agent) => (
          <article key={agent.name} className="agent-card">
            <div
              className="agent-load"
              style={{ "--load": `${agent.load}%` } as CSSProperties}
              aria-hidden="true"
            >
              <span>{agent.load}</span>
            </div>
            <header>
              <h3>{agent.name}</h3>
              <p>{agent.role}</p>
            </header>
            <footer>{agent.focus}</footer>
          </article>
        ))}
      </div>
    </section>
  );
}

/* -------------------- audit log -------------------- */

function Audit() {
  return (
    <section className="section audit" aria-labelledby="audit-title">
      <div className="section-heading compact">
        <p className="eyebrow">Activity</p>
        <h2 id="audit-title">A short, honest log. No emoji rain, no fake streaming.</h2>
      </div>
      <ul className="audit-list">
        {AUDIT.map((row) => (
          <li key={row.time}>
            <span className="audit-time">{row.time}</span>
            <span className="audit-source">{row.source}</span>
            <span className="audit-message">{row.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* -------------------- handoff -------------------- */

function Handoff() {
  return (
    <section className="section handoff" id="handoff" aria-labelledby="handoff-title">
      <div>
        <p className="eyebrow">Handoff</p>
        <h2 id="handoff-title">
          Same shell, two destinations: GitHub for review, playground for publish.
        </h2>
        <p>
          The repository stays clean — Vite, React, TypeScript, no extra runtime deps. Once you sign
          into the playground with X, the same app can be lifted there without rewriting.
        </p>
        <div className="handoff-actions">
          <a className="primary-action" href="https://playground.gitlawb.com/" target="_blank" rel="noreferrer">
            Open hosted playground
          </a>
          <a
            className="secondary-action"
            href="https://github.com/GitAxolotl/gitaxolotl"
            target="_blank"
            rel="noreferrer"
          >
            View on GitHub
          </a>
        </div>
      </div>
      <ul className="checklist" aria-label="Handoff checklist">
        <li>
          <strong>Repository</strong>
          <span>Vite + React + TypeScript, no runtime deps beyond React.</span>
        </li>
        <li>
          <strong>Design</strong>
          <span>Restrained palette, one type scale, accessible focus rings.</span>
        </li>
        <li>
          <strong>Quality</strong>
          <span>Lint, build, contrast, and responsive checks before publish.</span>
        </li>
        <li>
          <strong>Playground</strong>
          <span>Single-file shell so it ports cleanly to the hosted runtime.</span>
        </li>
      </ul>
    </section>
  );
}

/* -------------------- root -------------------- */

export default function App() {
  const [kind, setKind] = useState<SourceKind>("repo");
  const [value, setValue] = useState<string>(SOURCE_EXAMPLES.repo[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  const resolved = useMemo(() => normalizeSource(kind, value), [kind, value]);
  const profile = kind === "repo" ? REPO_PROFILE : SITE_PROFILE;

  const jumpToBuilder = () => {
    const node = document.getElementById("builder");
    if (node) {
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      node.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    }
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (event.key === "/") {
        event.preventDefault();
        jumpToBuilder();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app-shell">
      <Topbar kind={kind} source={resolved} />
      <main>
        <Hero profile={profile} onJumpToBuilder={jumpToBuilder} />
        <Builder
          kind={kind}
          setKind={setKind}
          value={value}
          setValue={setValue}
          resolved={resolved}
          profile={profile}
          onSubmit={jumpToBuilder}
          inputRef={inputRef}
        />
        <Pipeline />
        <Quality />
        <Crew />
        <Audit />
        <Handoff />
        <footer className="page-footer">
          <span>GitAxolotl · part of the GitLawB network.</span>
          <span className="kbd-hint">
            Press <kbd>/</kbd> to focus the source field
          </span>
        </footer>
      </main>
    </div>
  );
}

