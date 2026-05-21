import { useEffect, useState, useCallback } from "react";

/* ============================================================
   GitAxolotl — Builder Control Room
   Fetches real data from GitHub API. Pure CSS, no Tailwind.
   ============================================================ */

// ── Types ──────────────────────────────────────────────────

interface RepoData {
  name: string;
  full_name: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  license: { spdx_id: string } | null;
  topics: string[];
  size: number;
  private: boolean;
}

interface TreeNode {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
}

interface TreeData {
  tree: TreeNode[];
  truncated: boolean;
}

interface AppState {
  repo: RepoData | null;
  tree: TreeData | null;
  loading: boolean;
  error: string | null;
}

// ── Constants ──────────────────────────────────────────────

const REPO_API = "https://api.github.com/repos/GitAxolotl/gitaxolotl";
const TREE_API =
  "https://api.github.com/repos/GitAxolotl/gitaxolotl/git/trees/main?recursive=1";

const ASCII_AXOLOTL = `
          ╭──────────────────────────╮
         ╱    ╭──╮      ╭──╮         ╲
        │   ╭─╯● ╰─╮╭──╯● ╰─╮        │
        │   │  ╰──╯ ││  ╰──╯ │        │
        │   ╰───────╯╰───────╯        │
        │        ╭────────╮            │
        │        │ ◠    ◠ │            │
        │        ╰────────╯            │
        ╰──╮  ╭────────────╮  ╭──────╯
            ╰──╯            ╰──╯
   ╭──────────────────────────────────────╮
   │     G I T A X O L O T L             │
   │     Builder Control Room             │
   ╰──────────────────────────────────────╯`.trim();

// ── Helpers ────────────────────────────────────────────────

function countFilesByExtension(tree: TreeNode[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const node of tree) {
    if (node.type !== "blob") continue;
    const ext = node.path.includes(".")
      ? "." + node.path.split(".").pop()!.toLowerCase()
      : "(no ext)";
    counts[ext] = (counts[ext] || 0) + 1;
  }
  return counts;
}

function getLanguageFromExt(ext: string): string {
  const map: Record<string, string> = {
    ".ts": "TypeScript",
    ".tsx": "TypeScript (React)",
    ".js": "JavaScript",
    ".jsx": "JavaScript (React)",
    ".css": "CSS",
    ".scss": "SCSS",
    ".html": "HTML",
    ".json": "JSON",
    ".md": "Markdown",
    ".yml": "YAML",
    ".yaml": "YAML",
    ".svg": "SVG",
    ".png": "PNG",
    ".jpg": "JPEG",
    ".ico": "ICO",
    ".gitignore": "Git Config",
    ".env": "Environment",
    ".txt": "Text",
  };
  return map[ext] || ext.replace(".", "").toUpperCase();
}

function buildFileTree(
  nodes: TreeNode[]
): Array<{ name: string; depth: number; isDir: boolean; ext: string }> {
  // Show top-level + first level of depth
  const result: Array<{
    name: string;
    depth: number;
    isDir: boolean;
    ext: string;
  }> = [];
  const topLevel = new Map<
    string,
    { isDir: boolean; children: number }
  >();

  for (const node of nodes) {
    const parts = node.path.split("/");
    const top = parts[0];
    if (!topLevel.has(top)) {
      topLevel.set(top, {
        isDir: parts.length > 1 || node.type === "tree",
        children: 0,
      });
    }
    if (parts.length > 1) {
      topLevel.get(top)!.children++;
    }
  }

  // Sort: directories first, then files
  const sorted = [...topLevel.entries()].sort((a, b) => {
    if (a[1].isDir && !b[1].isDir) return -1;
    if (!a[1].isDir && b[1].isDir) return 1;
    return a[0].localeCompare(b[0]);
  });

  for (const [name, info] of sorted) {
    result.push({
      name: info.isDir ? name + "/" : name,
      depth: 0,
      isDir: info.isDir,
      ext: info.isDir ? "" : name.includes(".") ? "." + name.split(".").pop() : "",
    });
    // Show up to 3 children per dir
    if (info.isDir && info.children > 0) {
      const children = nodes
        .filter((n) => {
          const parts = n.path.split("/");
          return parts[0] === name && parts.length === 2;
        })
        .slice(0, 4);
      for (const child of children) {
        const childName = child.path.split("/").pop()!;
        const childIsDir = child.type === "tree";
        result.push({
          name: childIsDir ? childName + "/" : childName,
          depth: 1,
          isDir: childIsDir,
          ext: childIsDir
            ? ""
            : childName.includes(".")
              ? "." + childName.split(".").pop()
              : "",
        });
      }
      if (info.children > 4) {
        result.push({
          name: `… +${info.children - 4} more`,
          depth: 1,
          isDir: false,
          ext: "",
        });
      }
    }
  }

  return result;
}

function analyzeQualityGates(
  repo: RepoData,
  tree: TreeNode[]
): Array<{
  name: string;
  score: number;
  status: "passed" | "partial" | "missing" | "unknown";
  detail: string;
}> {
  const paths = tree.map((n) => n.path.toLowerCase());
  const hasFile = (patterns: string[]) =>
    patterns.some((p) => paths.some((fp) => fp.includes(p)));

  // README
  const hasReadme = hasFile(["readme.md"]);
  // CI/CD
  const hasCI = hasFile([
    ".github/workflows",
    ".gitlab-ci.yml",
    "jenkinsfile",
    ".circleci",
  ]);
  // Tests
  const hasTests = hasFile([
    ".test.",
    ".spec.",
    "__tests__",
    "tests/",
    "test/",
  ]);
  // TypeScript
  const hasTS = hasFile(["tsconfig", ".ts", ".tsx"]);
  // Linting
  const hasLint = hasFile([
    ".eslintrc",
    "eslint.config",
    ".prettierrc",
    "prettier.config",
    ".stylelintrc",
    "biome.json",
  ]);
  // License
  const hasLicense = hasFile(["license", "licence"]) || repo.license !== null;

  return [
    {
      name: "README",
      score: hasReadme ? 100 : 0,
      status: hasReadme ? "passed" : "missing",
      detail: hasReadme
        ? "README.md present in repository root"
        : "No README.md found",
    },
    {
      name: "CI / CD",
      score: hasCI ? 100 : 0,
      status: hasCI ? "passed" : "missing",
      detail: hasCI
        ? "GitHub Actions workflows detected"
        : "No CI/CD configuration found",
    },
    {
      name: "Tests",
      score: hasTests ? 90 : 0,
      status: hasTests ? "passed" : "missing",
      detail: hasTests
        ? "Test files detected in repository"
        : "No test files found",
    },
    {
      name: "TypeScript",
      score: hasTS ? 100 : 0,
      status: hasTS ? "passed" : "missing",
      detail: hasTS
        ? `${repo.language || "TypeScript"} — type-safe codebase`
        : "No TypeScript configuration found",
    },
    {
      name: "Linting",
      score: hasLint ? 85 : 0,
      status: hasLint ? "passed" : "missing",
      detail: hasLint
        ? "ESLint / Prettier configuration detected"
        : "No linter configuration found",
    },
    {
      name: "License",
      score: hasLicense ? 100 : 0,
      status: hasLicense ? "passed" : "missing",
      detail: hasLicense
        ? `Licensed under ${repo.license?.spdx_id || "custom license"}`
        : "No license file found",
    },
  ];
}

function getFileIcon(isDir: boolean, ext: string): string {
  if (isDir) return "📁";
  const iconMap: Record<string, string> = {
    ".ts": "🔷",
    ".tsx": "⚛️",
    ".js": "🟡",
    ".jsx": "⚛️",
    ".css": "🎨",
    ".scss": "🎨",
    ".html": "🌐",
    ".json": "📋",
    ".md": "📝",
    ".yml": "⚙️",
    ".yaml": "⚙️",
    ".svg": "🖼️",
    ".png": "🖼️",
    ".jpg": "🖼️",
  };
  return iconMap[ext] || "📄";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function scoreClass(score: number): string {
  if (score >= 80) return "high";
  if (score >= 40) return "medium";
  if (score > 0) return "low";
  return "na";
}

// ── Components ─────────────────────────────────────────────

function Topbar() {
  return (
    <div className="topbar">
      <div className="topbar-brand">
        <div className="topbar-brand-icon">G</div>
        <span>GitAxolotl</span>
      </div>
      <div className="topbar-links">
        <a href="#overview">Overview</a>
        <a href="#gates">Gates</a>
        <a href="#analysis">Analysis</a>
        <a href="#status">Status</a>
      </div>
      <div className="topbar-status">
        <span className="pulse-dot" />
        <span>System operational</span>
      </div>
    </div>
  );
}

function Hero({ repo }: { repo: RepoData }) {
  return (
    <div className="hero">
      <div className="mascot-container">
        <pre className="ascii-mascot">{ASCII_AXOLOTL}</pre>
      </div>
      <h1 className="hero-title">
        Builder <span className="accent">Control Room</span>
      </h1>
      <p className="hero-subtitle">
        {repo.full_name} — {repo.description || "No description"}
      </p>
    </div>
  );
}

function OverviewSection({ repo }: { repo: RepoData }) {
  const stats = [
    {
      label: "Stars",
      value: repo.stargazers_count.toLocaleString(),
      sub: "GitHub stars",
    },
    {
      label: "Forks",
      value: repo.forks_count.toLocaleString(),
      sub: "Repository forks",
    },
    {
      label: "Issues",
      value: repo.open_issues_count.toLocaleString(),
      sub: "Open issues",
    },
    {
      label: "Size",
      value:
        repo.size > 1024
          ? (repo.size / 1024).toFixed(1) + " MB"
          : repo.size + " KB",
      sub: "Repository size",
    },
  ];

  return (
    <div className="section" id="overview">
      <div className="section-header">
        <div className="section-title">
          <span className="section-title-icon">◆</span> Overview
        </div>
        <span className="section-badge">
          Updated {timeAgo(repo.pushed_at)}
        </span>
      </div>
      <div className="stats-grid">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <span className="stat-label">{s.label}</span>
            <span className="stat-number">{s.value}</span>
            <span className="stat-sub">{s.sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QualityGatesSection({
  repo,
  tree,
}: {
  repo: RepoData;
  tree: TreeNode[];
}) {
  const gates = analyzeQualityGates(repo, tree);
  const passedCount = gates.filter((g) => g.status === "passed").length;
  const avgScore = Math.round(
    gates.reduce((sum, g) => sum + g.score, 0) / gates.length
  );

  return (
    <div className="section" id="gates">
      <div className="section-header">
        <div className="section-title">
          <span className="section-title-icon">◆</span> Quality Gates
        </div>
        <span className="section-badge">
          {passedCount}/{gates.length} passed · avg {avgScore}%
        </span>
      </div>
      <div className="gates-grid">
        {gates.map((gate) => (
          <div className={`gate-card ${gate.status}`} key={gate.name}>
            <div className="gate-top">
              <span className="gate-name">{gate.name}</span>
              <span className={`gate-score ${scoreClass(gate.score)}`}>
                {gate.score > 0 ? `${gate.score}%` : "—"}
              </span>
            </div>
            <div className="gate-detail">{gate.detail}</div>
            <div className="gate-bar">
              <div
                className={`gate-bar-fill ${scoreClass(gate.score)}`}
                style={{ width: `${gate.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CodeAnalysisSection({
  tree,
}: {
  tree: TreeNode[];
}) {
  const blobCount = tree.filter((n) => n.type === "blob").length;
  const dirCount = tree.filter((n) => n.type === "tree").length;
  const totalSize = tree.reduce((sum, n) => sum + (n.size || 0), 0);
  const extCounts = countFilesByExtension(tree);

  // Top languages by file count
  const langEntries = Object.entries(extCounts)
    .map(([ext, count]) => ({
      ext,
      lang: getLanguageFromExt(ext),
      count,
      pct: Math.round((count / blobCount) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  // File tree
  const treeView = buildFileTree(tree);

  return (
    <div className="section" id="analysis">
      <div className="section-header">
        <div className="section-title">
          <span className="section-title-icon">◆</span> Code Analysis
        </div>
        <span className="section-badge">
          {blobCount} files · {dirCount} directories ·{" "}
          {(totalSize / 1024).toFixed(0)} KB
        </span>
      </div>
      <div className="analysis-grid">
        {/* Languages */}
        <div className="analysis-card">
          <div className="analysis-card-title">
            <span className="text-green">◈</span> Languages
          </div>
          <div className="lang-list">
            {langEntries.map((entry, i) => (
              <div className="lang-item" key={entry.ext}>
                <span className="lang-name">{entry.lang}</span>
                <div className="lang-bar-track">
                  <div
                    className={`lang-bar-fill ${i > 0 ? "l" + (i + 1) : ""}`}
                    style={{ width: `${entry.pct}%` }}
                  />
                </div>
                <span className="lang-pct">
                  {entry.count} files · {entry.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* File Structure */}
        <div className="analysis-card">
          <div className="analysis-card-title">
            <span className="text-green">◈</span> File Structure
          </div>
          <div className="file-tree">
            {treeView.map((item, i) => (
              <div className="tree-line" key={i}>
                <span className="tree-icon">
                  {getFileIcon(item.isDir, item.ext)}
                </span>
                <span
                  className="tree-indent"
                  style={{ width: item.depth * 20 + "px" }}
                />
                <span className={`tree-name ${item.isDir ? "is-dir" : ""}`}>
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveStatusSection({ repo }: { repo: RepoData }) {
  const statuses = [
    {
      label: "API Connection",
      value: "GitHub REST v3",
      dot: "green" as const,
    },
    {
      label: "Repository",
      value: repo.private ? "Private" : "Public",
      dot: repo.private ? "yellow" : "green" as const,
    },
    {
      label: "Default Branch",
      value: repo.default_branch,
      dot: "blue" as const,
    },
    {
      label: "Primary Language",
      value: repo.language || "Not specified",
      dot: "green" as const,
    },
    {
      label: "Last Push",
      value: timeAgo(repo.pushed_at),
      dot: "green" as const,
    },
    {
      label: "License",
      value: repo.license?.spdx_id || "Unlicensed",
      dot: repo.license ? "green" : "yellow" as const,
    },
  ];

  return (
    <div className="section" id="status">
      <div className="section-header">
        <div className="section-title">
          <span className="section-title-icon">◆</span> Live Status
        </div>
        <span className="section-badge">Real-time</span>
      </div>
      <div className="status-grid">
        {statuses.map((s) => (
          <div className="status-card" key={s.label}>
            <div className="status-indicator">
              <span className={`status-dot ${s.dot}`} />
              <span className="status-label">{s.label}</span>
            </div>
            <span className="status-value">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopicsSection({ repo }: { repo: RepoData }) {
  if (!repo.topics || repo.topics.length === 0) return null;
  return (
    <div className="section">
      <div className="section-header">
        <div className="section-title">
          <span className="section-title-icon">◆</span> Topics
        </div>
        <span className="section-badge">{repo.topics.length}</span>
      </div>
      <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
        {repo.topics.map((t) => (
          <span
            key={t}
            style={{
              display: "inline-block",
              padding: "4px 12px",
              fontSize: "0.72rem",
              background: "rgba(34, 197, 94, 0.1)",
              border: "1px solid rgba(34, 197, 94, 0.2)",
              borderRadius: "6px",
              color: "#22c55e",
              fontWeight: 500,
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="footer">
      <span>GitAxolotl · Builder Control Room</span>
      <span>
        <a
          href="https://github.com/GitAxolotl/gitaxolotl"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>{" "}
        · <span className="text-muted">v0.1.0</span>
      </span>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────

export default function App() {
  const [state, setState] = useState<AppState>({
    repo: null,
    tree: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [repoRes, treeRes] = await Promise.all([
        fetch(REPO_API),
        fetch(TREE_API),
      ]);

      if (!repoRes.ok) {
        throw new Error(
          `GitHub API error (repo): ${repoRes.status} ${repoRes.statusText}`
        );
      }
      if (!treeRes.ok) {
        throw new Error(
          `GitHub API error (tree): ${treeRes.status} ${treeRes.statusText}`
        );
      }

      const repo: RepoData = await repoRes.json();
      const tree: TreeData = await treeRes.json();

      setState({ repo, tree, loading: false, error: null });
    } catch (err) {
      setState({
        repo: null,
        tree: null,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Loading state
  if (state.loading) {
    return (
      <div className="app">
        <Topbar />
        <div className="loading-container">
          <div className="spinner" />
          <span className="loading-text">
            Connecting to GitHub API…
          </span>
        </div>
      </div>
    );
  }

  // Error state
  if (state.error || !state.repo || !state.tree) {
    return (
      <div className="app">
        <Topbar />
        <div className="error-card">
          <h2>Connection Failed</h2>
          <p>{state.error || "Unable to fetch repository data"}</p>
          <button className="retry-btn" onClick={fetchData}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { repo, tree } = state;
  const blobNodes = tree.tree.filter((n) => n.type === "blob");

  return (
    <div className="app">
      <Topbar />
      <Hero repo={repo} />
      <OverviewSection repo={repo} />
      <QualityGatesSection repo={repo} tree={blobNodes} />
      <CodeAnalysisSection tree={tree.tree} />
      <TopicsSection repo={repo} />
      <LiveStatusSection repo={repo} />
      <Footer />
    </div>
  );
}
