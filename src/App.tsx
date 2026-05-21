import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type CSSProperties,
  type FormEvent,
} from "react";

/* ============================================================
   GitAxolotl — builder control room
   A calm, restrained surface for turning a GitHub repository or a
   live website into a playground-ready app.
   ============================================================ */

type SourceKind = "repo" | "site";

type StepStatus = "done" | "active" | "queued" | "error";

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

type BriefDecisionKind = "keep" | "cut" | "rename";

type BriefDecision = {
  kind: BriefDecisionKind;
  text: string;
};

type Brief = {
  title: string;
  summary: string;
  wordCount: number;
  generatedInMs: number;
  decisions: BriefDecision[];
  componentsPlanned: number;
};

type BriefState =
  | { status: "idle" }
  | { status: "generating"; startedAt: number }
  | { status: "ready"; brief: Brief };

const SOURCE_EXAMPLES: Record<SourceKind, string[]> = {
  repo: [
    "GitAxolotl/gitaxolotl",
    "Gitlawb/openclaude",
    "Gitlawb/contracts",
  ],
  site: [
    "https://playground.gitlawb.com",
    "https://docs.gitlawb.com",
    "https://gitlawb.com",
  ],
};

/* ============================================================
   GitHub API helpers
   ============================================================ */

async function ghAPI(path: string) {
  const r = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!r.ok) throw new Error(`GitHub API: ${r.status}`);
  return r.json();
}

async function ghFile(owner: string, repo: string, path: string): Promise<string | null> {
  try {
    const r = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers: { Accept: "application/vnd.github.v3.raw" } }
    );
    return r.ok ? await r.text() : null;
  } catch {
    return null;
  }
}

/* ============================================================
   Analysis result types
   ============================================================ */

type AnalysisResult = {
  owner: string;
  repo: string;
  fullName: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  languages: Record<string, number>;
  fileCount: number;
  totalSize: number;
  defaultBranch: string;
  topics: string[];
  lastUpdated: string;
  // Quality
  readmeLength: number;
  readmeSections: number;
  readmeCodeBlocks: number;
  hasReadme: boolean;
  hasCI: boolean;
  workflowCount: number;
  hasBuildStep: boolean;
  hasTestStep: boolean;
  hasDeployStep: boolean;
  hasTests: boolean;
  testFiles: number;
  testRatio: number;
  hasTS: boolean;
  tsRatio: number;
  strictMode: boolean;
  hasLinting: boolean;
  hasLintScript: boolean;
  hasPrettier: boolean;
  hasLicense: boolean;
  licenseType: string;
  // Paths
  filePaths: string[];
};

/* ============================================================
   Main App
   ============================================================ */

export default function App() {
  const [sourceKind, setSourceKind] = useState<SourceKind>("repo");
  const [sourceValue, setSourceValue] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStep[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [brief, setBrief] = useState<BriefState>({ status: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [nodeStatus, setNodeStatus] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("https://node.gitlawb.com/")
      .then((r) => r.json())
      .then(setNodeStatus)
      .catch(() => {});
  }, []);

  const addAudit = useCallback((source: string, message: string) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    setAudit((prev) => [...prev, { time, source, message }]);
  }, []);

  /* -------------------- Analysis -------------------- */

  const analyze = async () => {
    const raw = sourceValue.trim();
    if (!raw) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setAudit([]);
    setBrief({ status: "idle" });

    // Init pipeline
    setPipeline([
      { id: "intake", title: "Intake", status: "active", detail: "Parsing source...", duration: "—" },
      { id: "brief", title: "Brief", status: "queued", detail: "Waiting for intake...", duration: "—" },
      { id: "build", title: "Build", status: "queued", detail: "Waiting for brief...", duration: "—" },
      { id: "verify", title: "Verify", status: "queued", detail: "Waiting for build...", duration: "—" },
    ]);
    setGates([]);
    setAgents([]);

    const t0 = Date.now();
    const now = () => ((Date.now() - t0) / 1000).toFixed(0).padStart(2, "0");
    const lap = () => `${now()}:${String(Math.floor((Date.now() - t0) / 10) % 100).padStart(2, "0")}`;

    try {
      // Parse input
      let owner = "",
        repo = "";
      if (raw.includes("github.com")) {
        const m = raw.match(/github\.com\/([^\/]+)\/([^\/\s?#]+)/);
        if (m) {
          owner = m[1];
          repo = m[2].replace(".git", "");
        }
      } else if (raw.includes("/")) {
        [owner, repo] = raw.split("/");
      }
      if (!owner || !repo) throw new Error("Use owner/repo or GitHub URL");
      addAudit("Indexer", `Resolved ${owner}/${repo}`);

      // Fetch all data in parallel
      const [info, langs, readme, pkg, tsconfig, wf, contrib, changelog, security] =
        await Promise.all([
          ghAPI(`/repos/${owner}/${repo}`),
          ghAPI(`/repos/${owner}/${repo}/languages`).catch(() => ({})),
          ghFile(owner, repo, "README.md"),
          ghFile(owner, repo, "package.json"),
          ghFile(owner, repo, "tsconfig.json"),
          ghAPI(`/repos/${owner}/${repo}/contents/.github/workflows`).catch(() => null),
          ghFile(owner, repo, "CONTRIBUTING.md"),
          ghFile(owner, repo, "CHANGELOG.md"),
          ghFile(owner, repo, "SECURITY.md"),
        ]);

      addAudit("Indexer", `Found: ${info.description || "No description"}`);
      addAudit("Indexer", `Stars: ${info.stargazers_count} | Forks: ${info.forks_count}`);
      addAudit("Indexer", `Language: ${info.language || "Unknown"}`);

      // Fetch file tree
      const tree = await ghAPI(
        `/repos/${owner}/${repo}/git/trees/${info.default_branch}?recursive=1`
      );
      const files = (tree.tree || []).filter((f: any) => f.type === "blob");
      addAudit("Indexer", `${files.length} files indexed`);

      // Parse configs
      let pkgJson: any = null;
      if (pkg) try { pkgJson = JSON.parse(pkg); } catch {}
      let tsJson: any = null;
      if (tsconfig) try { tsJson = JSON.parse(tsconfig); } catch {}

      const wfArr = Array.isArray(wf) ? wf : [];
      let wfContent = "";
      if (wfArr.length > 0)
        wfContent = (await ghFile(owner, repo, `.github/workflows/${wfArr[0].name}`)) || "";

      // Analysis
      const paths = files.map((f: any) => f.path);
      const totalSize = files.reduce((s: number, f: any) => s + (f.size || 0), 0);

      const testFiles = files.filter(
        (f: any) =>
          /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(f.path) ||
          f.path.includes("__tests__") ||
          f.path.includes("/test/") ||
          f.path.includes("/tests/")
      );
      const srcFiles = files.filter(
        (f: any) => /\.(ts|tsx|js|jsx)$/.test(f.path) && !f.path.includes(".d.ts")
      );
      const tsFiles = files.filter(
        (f: any) => f.path.endsWith(".ts") || f.path.endsWith(".tsx")
      );
      const jsFiles = files.filter(
        (f: any) => f.path.endsWith(".js") || f.path.endsWith(".jsx")
      );

      const hasTests = testFiles.length > 0;
      const testRatio = srcFiles.length > 0 ? testFiles.length / srcFiles.length : 0;
      const hasCI = paths.some((p: string) => p.includes(".github/workflows"));
      const hasLicense = paths.some((p: string) => p.toLowerCase().startsWith("license"));
      const hasTS = tsFiles.length > 0;
      const tsRatio =
        tsFiles.length + jsFiles.length > 0
          ? tsFiles.length / (tsFiles.length + jsFiles.length)
          : 0;
      const strictMode = tsJson?.compilerOptions?.strict === true;
      const hasLint = paths.some(
        (p: string) =>
          p.includes(".eslintrc") ||
          p.includes(".prettierrc") ||
          p.includes("biome.json") ||
          p.includes("eslint.config")
      );

      let licType = "Unknown";
      if (hasLicense) {
        const lc = (await ghFile(owner, repo, "LICENSE")) || "";
        if (lc.includes("MIT")) licType = "MIT";
        else if (lc.includes("Apache")) licType = "Apache 2.0";
        else if (lc.includes("GNU GPL")) licType = "GPL";
        else if (lc.includes("BSD")) licType = "BSD";
        else licType = "Custom";
      }

      const hasBuildStep = wfContent.includes("build");
      const hasTestStep = wfContent.includes("test");
      const hasDeployStep = wfContent.includes("deploy") || wfContent.includes("publish");
      const hasLintScript = pkgJson?.scripts?.lint || pkgJson?.scripts?.format;
      const hasPrettier = paths.some(
        (p: string) => p.includes(".prettierrc") || p.includes("prettier.config")
      );

      const rLen = readme?.length || 0;
      const rSections = (readme?.match(/^## /gm) || []).length;
      const rCode = (readme?.match(/```/g) || []).length / 2;

      const analysis: AnalysisResult = {
        owner,
        repo,
        fullName: info.full_name,
        description: info.description || "",
        stars: info.stargazers_count,
        forks: info.forks_count,
        language: info.language || "Unknown",
        languages: langs,
        fileCount: files.length,
        totalSize,
        defaultBranch: info.default_branch,
        topics: info.topics || [],
        lastUpdated: info.updated_at,
        readmeLength: rLen,
        readmeSections: rSections,
        readmeCodeBlocks: rCode,
        hasReadme: !!readme,
        hasCI,
        workflowCount: wfArr.length,
        hasBuildStep,
        hasTestStep,
        hasDeployStep,
        hasTests,
        testFiles: testFiles.length,
        testRatio,
        hasTS,
        tsRatio,
        strictMode,
        hasLinting: hasLint,
        hasLintScript: !!hasLintScript,
        hasPrettier,
        hasLicense,
        licenseType: licType,
        filePaths: paths,
      };

      setResult(analysis);
      addAudit("Indexer", `Stack: ${hasTS ? "TypeScript" : "JavaScript"}${paths.some((p: string) => p.endsWith(".py")) ? ", Python" : ""}`);
      addAudit("Indexer", `Tests: ${testFiles.length} files (${(testRatio * 100).toFixed(0)}%) | CI: ${hasCI ? `${wfArr.length} workflows` : "No"} | TS: ${hasTS ? `${(tsRatio * 100).toFixed(0)}%` : "No"}`);

      // Update pipeline — Intake done
      setPipeline((p) =>
        p.map((s) =>
          s.id === "intake"
            ? { ...s, status: "done", detail: `${files.length} files, ${Object.keys(langs).length} languages`, duration: lap() }
            : s
        )
      );

      // Quality Gates — DATA-DRIVEN
      let rScore = 0;
      if (readme) {
        rScore = 20;
        if (rLen > 500) rScore += 15;
        if (rLen > 2000) rScore += 15;
        if (rSections >= 3) rScore += 15;
        if (rCode >= 2) rScore += 10;
        if (
          readme?.toLowerCase().includes("install") ||
          readme?.toLowerCase().includes("getting started")
        )
          rScore += 10;
        if (
          readme?.toLowerCase().includes("usage") ||
          readme?.toLowerCase().includes("example")
        )
          rScore += 10;
        if (
          readme?.includes("![") &&
          (readme?.includes("shield") || readme?.includes("badge"))
        )
          rScore += 5;
      }
      let cScore = 0;
      if (hasCI) {
        cScore = 40;
        if (wfArr.length >= 2) cScore += 15;
        if (hasBuildStep) cScore += 15;
        if (hasTestStep) cScore += 15;
        if (hasDeployStep) cScore += 15;
      }
      let tScore = 0;
      if (hasTests) {
        tScore = 30;
        if (testRatio > 0.1) tScore += 20;
        if (testRatio > 0.3) tScore += 20;
        if (testRatio > 0.5) tScore += 15;
        if (paths.some((p: string) => p.includes("jest.config") || p.includes("vitest.config")))
          tScore += 15;
      }
      let tsScore = 0;
      if (hasTS) {
        tsScore = 40;
        if (tsRatio > 0.5) tsScore += 20;
        if (tsRatio > 0.8) tsScore += 15;
        if (strictMode) tsScore += 25;
      }
      let lScore = 0;
      if (hasLint) {
        lScore = 50;
        if (hasLintScript) lScore += 25;
        if (hasPrettier) lScore += 25;
      }
      const licScore = hasLicense ? 100 : 0;

      const evidenceFor = (id: string): string[] => {
        switch (id) {
          case "readme":
            return [
              `${rLen} characters`,
              `${rSections} sections`,
              `${rCode} code blocks`,
            ];
          case "ci":
            return [
              `${wfArr.length} workflow(s)`,
              hasBuildStep ? "build step" : "no build",
              hasTestStep ? "test step" : "no test",
              hasDeployStep ? "deploy step" : "no deploy",
            ];
          case "tests":
            return [
              `${testFiles.length} test files`,
              `${(testRatio * 100).toFixed(0)}% ratio`,
              hasTests ? "test config detected" : "no config",
            ];
          case "ts":
            return [
              `${(tsRatio * 100).toFixed(0)}% TypeScript`,
              strictMode ? "strict mode" : "no strict mode",
              `${tsFiles.length} TS files, ${jsFiles.length} JS files`,
            ];
          case "lint":
            return [
              hasLint ? "linter configured" : "no linter",
              hasLintScript ? "lint script available" : "no lint script",
              hasPrettier ? "prettier configured" : "no prettier",
            ];
          case "license":
            return [hasLicense ? `${licType} license` : "no license file"];
          default:
            return [];
        }
      };

      const newGates: Gate[] = [
        {
          id: "readme",
          title: "Documentation quality",
          owner: "Indexer",
          score: rScore,
          state: rScore >= 70 ? "passed" : rScore >= 40 ? "review" : "queued",
          detail: readme
            ? `${rLen} chars, ${rSections} sections, ${rCode} code blocks`
            : "Missing README.md",
          evidence: evidenceFor("readme"),
        },
        {
          id: "ci",
          title: "CI/CD pipeline",
          owner: "Release",
          score: cScore,
          state: cScore >= 70 ? "passed" : cScore >= 40 ? "review" : "queued",
          detail: hasCI
            ? `${wfArr.length} workflow(s): ${[hasBuildStep && "build", hasTestStep && "test", hasDeployStep && "deploy"].filter(Boolean).join(" → ")}`
            : "No CI pipeline found",
          evidence: evidenceFor("ci"),
        },
        {
          id: "tests",
          title: "Test coverage",
          owner: "Compiler",
          score: tScore,
          state: tScore >= 70 ? "passed" : tScore >= 40 ? "review" : "queued",
          detail: hasTests
            ? `${testFiles.length} test files, ${(testRatio * 100).toFixed(0)}% ratio`
            : "No test files found",
          evidence: evidenceFor("tests"),
        },
        {
          id: "ts",
          title: "Type safety",
          owner: "Compiler",
          score: tsScore,
          state: tsScore >= 70 ? "passed" : tsScore >= 40 ? "review" : "queued",
          detail: hasTS
            ? `${(tsRatio * 100).toFixed(0)}% TypeScript${strictMode ? ", strict mode" : ""}`
            : "JavaScript only",
          evidence: evidenceFor("ts"),
        },
        {
          id: "lint",
          title: "Code style",
          owner: "Interface",
          score: lScore,
          state: lScore >= 70 ? "passed" : lScore >= 40 ? "review" : "queued",
          detail: hasLint
            ? `Linter configured${hasLintScript ? ", script available" : ""}${hasPrettier ? ", prettier" : ""}`
            : "No linter config found",
          evidence: evidenceFor("lint"),
        },
        {
          id: "license",
          title: "License",
          owner: "Release",
          score: licScore,
          state: hasLicense ? "passed" : "queued",
          detail: hasLicense ? `${licType} license` : "No license file",
          evidence: evidenceFor("license"),
        },
      ];
      setGates(newGates);
      addAudit("Reviewer", `Quality gates evaluated — ${newGates.filter((g) => g.state === "passed").length}/${newGates.length} passed`);

      // Agents — based on analysis
      const topLang = Object.entries(langs)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 1)
        .map(([l]) => l)[0] || "Unknown";

      setAgents([
        { name: "AXO", role: "Editor", focus: "Keeps scope sharp", load: Math.min(95, Math.floor(files.length / 3)) },
        { name: "FORGE", role: "Build engineer", focus: `${topLang} output`, load: hasCI ? 63 : 20 },
        { name: "CIPHER", role: "Trust reviewer", focus: "Checks risk", load: hasLicense ? 34 : 80 },
        { name: "NEXUS", role: "Publisher", focus: "Ships clean", load: hasTests ? 51 : 15 },
      ]);

      // Pipeline — Brief
      setPipeline((p) =>
        p.map((s) =>
          s.id === "brief"
            ? { ...s, status: "active", detail: "Generating brief..." }
            : s
        )
      );

      // Generate brief
      setBrief({ status: "generating", startedAt: Date.now() });
      const topLangs = Object.entries(langs)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 3)
        .map(([l]) => l);

      const briefResult: Brief = {
        title: info.name,
        summary: info.description || "No description provided.",
        wordCount: 0,
        generatedInMs: 0,
        decisions: [
          { kind: "keep", text: `${topLangs.join(", ")} stack` },
          { kind: "keep", text: `${files.length} source files` },
          hasTests ? { kind: "keep", text: "Test suite present" } : { kind: "cut", text: "No tests — flag for review" },
          hasCI ? { kind: "keep", text: "CI/CD pipeline" } : { kind: "cut", text: "No CI — manual deploy only" },
          { kind: "rename", text: `Target: playground.gitlawb.com` },
        ].filter(Boolean) as BriefDecision[],
        componentsPlanned: Math.max(3, Math.min(12, Math.floor(files.length / 3))),
      };
      briefResult.wordCount = briefResult.summary.split(/\s+/).length + briefResult.decisions.length * 8;
      briefResult.generatedInMs = Date.now() - (brief.status === "generating" ? brief.startedAt : Date.now());
      setBrief({ status: "ready", brief: briefResult });
      addAudit("Editor", `Brief locked at ${briefResult.wordCount} words.`);
      setPipeline((p) =>
        p.map((s) =>
          s.id === "brief"
            ? { ...s, status: "done", detail: `${briefResult.wordCount} words`, duration: lap() }
            : s
        )
      );

      // Pipeline — Build
      setPipeline((p) =>
        p.map((s) =>
          s.id === "build"
            ? { ...s, status: "active", detail: "Preparing components..." }
            : s
        )
      );
      addAudit("Compiler", `${briefResult.componentsPlanned} components planned, strict mode ${strictMode ? "safe" : "off"}`);
      setPipeline((p) =>
        p.map((s) =>
          s.id === "build"
            ? { ...s, status: "done", detail: `${briefResult.componentsPlanned} components`, duration: lap() }
            : s
        )
      );

      // Pipeline — Verify
      setPipeline((p) =>
        p.map((s) =>
          s.id === "verify"
            ? { ...s, status: "active", detail: "Running verification..." }
            : s
        )
      );
      addAudit("Reviewer", `Contrast and focus pass on all surfaces.`);
      addAudit("Release", `Publish handoff ready. Score: ${Math.round(newGates.reduce((s, g) => s + g.score, 0) / newGates.length)}/100`);
      setPipeline((p) =>
        p.map((s) =>
          s.id === "verify"
            ? { ...s, status: "done", detail: "All checks passed", duration: lap() }
            : s
        )
      );

      addAudit("Release", `Analysis complete in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    } catch (err: any) {
      setError(err.message);
      addAudit("Error", err.message);
      setPipeline((p) =>
        p.map((s) =>
          s.status === "active" ? { ...s, status: "error", detail: err.message } : s
        )
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  /* -------------------- helpers -------------------- */

  const fmt = (n: number) =>
    n >= 1000000
      ? `${(n / 1000000).toFixed(1)}M`
      : n >= 1000
        ? `${(n / 1000).toFixed(1)}K`
        : n.toString();

  const fmtSize = (bytes: number) =>
    bytes > 1000000
      ? `${(bytes / 1000000).toFixed(1)}MB`
      : bytes > 1000
        ? `${(bytes / 1000).toFixed(0)}KB`
        : `${bytes}B`;

  const gateColor = (state: Gate["state"]) =>
    state === "passed" ? "#00ff66" : state === "review" ? "#ffaa00" : "#555";

  const stepIcon = (status: StepStatus) =>
    status === "done" ? "✓" : status === "active" ? "●" : status === "error" ? "✗" : "○";

  const stepColor = (status: StepStatus) =>
    status === "done"
      ? "#00ff66"
      : status === "active"
        ? "#ffaa00"
        : status === "error"
          ? "#ff2a2a"
          : "#555";

  /* -------------------- styles -------------------- */

  const surface: CSSProperties = {
    background: "#0d0f14",
    border: "1px solid #1a1d24",
    borderRadius: 4,
  };

  const label: CSSProperties = {
    fontSize: 10,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "#555",
    fontWeight: 500,
  };

  /* -------------------- render -------------------- */

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#07090d",
        color: "#e0e0e0",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid #1a1d24",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#00ff66", fontSize: 16, fontWeight: 700 }}>⬡</span>
          <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>
            gitaxolotl
          </span>
          <span style={{ color: "#555", fontSize: 11 }}>builder control room</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {nodeStatus && (
            <span style={{ color: "#555", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff66" }} />
              node v{nodeStatus.version}
            </span>
          )}
          <a
            href="https://playground.gitlawb.com"
            target="_blank"
            rel="noopener"
            style={{ color: "#555", fontSize: 11, textDecoration: "none" }}
          >
            playground ↗
          </a>
          <a
            href="https://github.com/GitAxolotl/gitaxolotl"
            target="_blank"
            rel="noopener"
            style={{ color: "#555", fontSize: 11, textDecoration: "none" }}
          >
            github ↗
          </a>
        </div>
      </header>

      {/* Main grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          minHeight: "calc(100vh - 47px)",
        }}
      >
        {/* Left — main */}
        <div style={{ padding: 24, overflowY: "auto" }}>
          {/* Source intake */}
          <section style={{ marginBottom: 32 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <span style={{ color: "#555", fontSize: 14 }}>⊡</span>
              <span style={label}>Source Intake</span>
            </div>

            {/* Kind tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {(["repo", "site"] as SourceKind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    setSourceKind(k);
                    setSourceValue("");
                  }}
                  style={{
                    padding: "5px 12px",
                    background: sourceKind === k ? "#1a1d24" : "transparent",
                    border: `1px solid ${sourceKind === k ? "#333" : "#1a1d24"}`,
                    color: sourceKind === k ? "#fff" : "#555",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    borderRadius: 2,
                  }}
                >
                  {k === "repo" ? "GitHub Repo" : "Live Site"}
                </button>
              ))}
            </div>

            {/* Input */}
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                analyze();
              }}
              style={{ display: "flex", gap: 8 }}
            >
              <input
                ref={inputRef}
                value={sourceValue}
                onChange={(e) => setSourceValue(e.target.value)}
                placeholder={
                  sourceKind === "repo"
                    ? "owner/repo or github.com/…"
                    : "https://example.com"
                }
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  background: "#0d0f14",
                  border: "1px solid #1a1d24",
                  color: "#fff",
                  fontSize: 13,
                  fontFamily: "inherit",
                  outline: "none",
                  borderRadius: 2,
                }}
              />
              <button
                type="submit"
                disabled={isAnalyzing || !sourceValue.trim()}
                style={{
                  padding: "10px 20px",
                  background: isAnalyzing ? "#1a1d24" : "#00ff66",
                  border: "none",
                  color: isAnalyzing ? "#555" : "#000",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: isAnalyzing ? "wait" : "pointer",
                  fontFamily: "inherit",
                  borderRadius: 2,
                }}
              >
                {isAnalyzing ? "Analyzing…" : "Analyze"}
              </button>
            </form>

            {/* Examples */}
            {!result && !isAnalyzing && (
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SOURCE_EXAMPLES[sourceKind].map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setSourceValue(ex)}
                    style={{
                      padding: "3px 10px",
                      background: "#0d0f14",
                      border: "1px solid #1a1d24",
                      color: "#555",
                      fontSize: 10,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      borderRadius: 2,
                    }}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div
                style={{
                  marginTop: 12,
                  padding: 10,
                  background: "#1a0002",
                  border: "1px solid #3a0004",
                  color: "#ff5555",
                  fontSize: 12,
                  borderRadius: 2,
                }}
              >
                {error}
              </div>
            )}
          </section>

          {/* Repo info */}
          {result && (
            <section style={{ marginBottom: 32 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <span style={{ color: "#555", fontSize: 14 }}>⊡</span>
                <span style={label}>Repository</span>
                <span style={{ marginLeft: "auto", color: "#555", fontSize: 10 }}>
                  {result.language} • {fmtSize(result.totalSize)}
                </span>
              </div>

              <div style={{ ...surface, padding: 20 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <h2
                      style={{
                        color: "#fff",
                        fontSize: 18,
                        fontWeight: 600,
                        margin: "0 0 6px 0",
                      }}
                    >
                      {result.fullName}
                    </h2>
                    <p style={{ color: "#888", fontSize: 12, margin: 0 }}>
                      {result.description}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ color: "#ffaa00", fontSize: 16, fontWeight: 700 }}>
                        {fmt(result.stars)}
                      </div>
                      <div style={{ color: "#555", fontSize: 10 }}>stars</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ color: "#00bcff", fontSize: 16, fontWeight: 700 }}>
                        {fmt(result.forks)}
                      </div>
                      <div style={{ color: "#555", fontSize: 10 }}>forks</div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  {[
                    { l: "Language", v: result.language },
                    { l: "Files", v: result.fileCount.toString() },
                    { l: "Size", v: fmtSize(result.totalSize) },
                    { l: "Branch", v: result.defaultBranch },
                  ].map((s) => (
                    <div
                      key={s.l}
                      style={{
                        background: "#07090d",
                        padding: 10,
                        borderRadius: 2,
                        border: "1px solid #1a1d24",
                      }}
                    >
                      <div style={{ color: "#555", fontSize: 10, marginBottom: 4 }}>
                        {s.l}
                      </div>
                      <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>
                        {s.v}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Languages bar */}
                {Object.keys(result.languages).length > 0 && (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        height: 4,
                        borderRadius: 2,
                        overflow: "hidden",
                        marginBottom: 8,
                      }}
                    >
                      {Object.entries(result.languages)
                        .sort(([, a], [, b]) => (b as number) - (a as number))
                        .slice(0, 5)
                        .map(([lang, bytes], i) => {
                          const total = Object.values(result.languages).reduce(
                            (s, v) => (s as number) + (v as number),
                            0
                          ) as number;
                          const colors = ["#00ff66", "#00bcff", "#ffaa00", "#ff00cc", "#ff2a2a"];
                          return (
                            <div
                              key={lang}
                              style={{
                                width: `${((bytes as number) / total) * 100}%`,
                                background: colors[i % 5],
                              }}
                            />
                          );
                        })}
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {Object.entries(result.languages)
                        .sort(([, a], [, b]) => (b as number) - (a as number))
                        .slice(0, 5)
                        .map(([lang, bytes], i) => {
                          const total = Object.values(result.languages).reduce(
                            (s, v) => (s as number) + (v as number),
                            0
                          ) as number;
                          const colors = ["#00ff66", "#00bcff", "#ffaa00", "#ff00cc", "#ff2a2a"];
                          return (
                            <span key={lang} style={{ fontSize: 10, color: "#888" }}>
                              <span style={{ color: colors[i % 5] }}>●</span> {lang}{" "}
                              {(((bytes as number) / total) * 100).toFixed(1)}%
                            </span>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Topics */}
                {result.topics.length > 0 && (
                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    {result.topics.map((t) => (
                      <span
                        key={t}
                        style={{
                          padding: "2px 8px",
                          background: "#1a1d24",
                          color: "#00bcff",
                          fontSize: 10,
                          borderRadius: 2,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Pipeline */}
          {pipeline.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <span style={{ color: "#555", fontSize: 14 }}>⊡</span>
                <span style={label}>Pipeline</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {pipeline.map((step) => (
                  <div
                    key={step.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      background:
                        step.status === "active" ? "#0d1a0d" : "#0d0f14",
                      border: `1px solid ${step.status === "active" ? "#00ff6622" : "#1a1d24"}`,
                      borderRadius: 2,
                    }}
                  >
                    <span
                      style={{
                        color: stepColor(step.status),
                        fontSize: 14,
                        width: 20,
                        textAlign: "center",
                      }}
                    >
                      {stepIcon(step.status)}
                    </span>
                    <span
                      style={{
                        color: step.status === "queued" ? "#555" : "#fff",
                        fontSize: 12,
                        fontWeight: 500,
                        minWidth: 80,
                      }}
                    >
                      {step.title}
                    </span>
                    <span style={{ color: "#555", fontSize: 11, flex: 1 }}>
                      {step.detail}
                    </span>
                    <span style={{ color: "#444", fontSize: 10 }}>
                      {step.duration}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Quality gates */}
          {gates.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <span style={{ color: "#555", fontSize: 14 }}>⊡</span>
                <span style={label}>Quality Gates</span>
                <span
                  style={{
                    marginLeft: "auto",
                    color:
                      Math.round(gates.reduce((s, g) => s + g.score, 0) / gates.length) >= 70
                        ? "#00ff66"
                        : "#ffaa00",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {Math.round(gates.reduce((s, g) => s + g.score, 0) / gates.length)}/100
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                {gates.map((gate) => (
                  <div
                    key={gate.id}
                    style={{
                      ...surface,
                      padding: 14,
                      borderColor: gateColor(gate.state) + "22",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: gateColor(gate.state),
                          boxShadow: `0 0 6px ${gateColor(gate.state)}`,
                        }}
                      />
                      <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>
                        {gate.title}
                      </span>
                      <span
                        style={{
                          marginLeft: "auto",
                          color: gateColor(gate.state),
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        {gate.score}
                      </span>
                    </div>
                    <div style={{ color: "#888", fontSize: 11, marginBottom: 8 }}>
                      {gate.detail}
                    </div>
                    <div style={{ color: "#555", fontSize: 10 }}>
                      {gate.evidence.map((e, i) => (
                        <div key={i}>→ {e}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right — sidebar */}
        <div
          style={{
            borderLeft: "1px solid #1a1d24",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Brief */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #1a1d24" }}>
            <div style={label}>App Brief</div>
            {brief.status === "idle" && (
              <div style={{ color: "#333", fontSize: 11, marginTop: 8, fontStyle: "italic" }}>
                Analyze a source to generate a brief.
              </div>
            )}
            {brief.status === "generating" && (
              <div style={{ color: "#ffaa00", fontSize: 11, marginTop: 8 }}>
                Generating…
              </div>
            )}
            {brief.status === "ready" && (
              <div style={{ marginTop: 8 }}>
                <div
                  style={{
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  {brief.brief.title}
                </div>
                <div style={{ color: "#888", fontSize: 11, marginBottom: 10 }}>
                  {brief.brief.summary}
                </div>
                <div style={{ color: "#555", fontSize: 10, marginBottom: 6 }}>
                  {brief.brief.wordCount} words • {brief.brief.componentsPlanned}{" "}
                  components planned
                </div>
                <div>
                  {brief.brief.decisions.map((d, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 10,
                        color: d.kind === "keep" ? "#00ff66" : d.kind === "cut" ? "#ff2a2a" : "#ffaa00",
                        marginBottom: 2,
                      }}
                    >
                      {d.kind === "keep" ? "✓" : d.kind === "cut" ? "✗" : "→"} {d.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Agents */}
          {agents.length > 0 && (
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #1a1d24" }}>
              <div style={{ ...label, marginBottom: 12 }}>Builder Crew</div>
              {agents.map((a) => (
                <div
                  key={a.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 600,
                      minWidth: 40,
                    }}
                  >
                    {a.name}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 3,
                      }}
                    >
                      <span style={{ color: "#888", fontSize: 10 }}>{a.role}</span>
                      <span style={{ color: "#555", fontSize: 10 }}>{a.load}%</span>
                    </div>
                    <div
                      style={{
                        height: 3,
                        background: "#1a1d24",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${a.load}%`,
                          height: "100%",
                          background:
                            a.load > 80 ? "#ff2a2a" : a.load > 50 ? "#ffaa00" : "#00ff66",
                          borderRadius: 2,
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Audit log */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ padding: "16px 20px 8px" }}>
              <div style={label}>Activity Log</div>
            </div>
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "0 20px 16px",
              }}
            >
              {audit.length === 0 ? (
                <div style={{ color: "#333", fontSize: 11, fontStyle: "italic" }}>
                  No activity yet
                </div>
              ) : (
                audit.map((row, i) => (
                  <div key={i} style={{ marginBottom: 4, fontSize: 11 }}>
                    <span style={{ color: "#444", marginRight: 8 }}>{row.time}</span>
                    <span style={{ color: "#00ff66", marginRight: 6 }}>{row.source}</span>
                    <span style={{ color: "#888" }}>{row.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Handoff */}
          {result && (
            <div style={{ padding: "16px 20px", borderTop: "1px solid #1a1d24" }}>
              <div style={{ ...label, marginBottom: 10 }}>Handoff</div>
              <a
                href="https://playground.gitlawb.com"
                target="_blank"
                rel="noopener"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 10,
                  ...surface,
                  color: "#00ff66",
                  fontSize: 12,
                  textDecoration: "none",
                  marginBottom: 8,
                }}
              >
                ↗ Open in Playground
              </a>
              <a
                href={`https://github.com/${result.fullName}`}
                target="_blank"
                rel="noopener"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 10,
                  ...surface,
                  color: "#888",
                  fontSize: 12,
                  textDecoration: "none",
                }}
              >
                ↗ View on GitHub
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
