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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13c0-4 3.6-7 7-7s7 3 7 7" />
            <path d="M9 13a3 3 0 1 0 6 0" />
            <path d="M4 13c-1 .8-1 2.2 0 3" />
            <path d="M20 13c1 .8 1 2.2 0 3" />
            <path d="M12 16v3" />
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

