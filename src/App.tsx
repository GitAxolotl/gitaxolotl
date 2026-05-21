import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  GitBranch, Star, FileCode, Clock, 
  Loader2, ExternalLink, Zap, Shield,
  Code2, TestTube, FileText, Scale, Settings, Activity
} from 'lucide-react';

// ============================================
// TYPES
// ============================================
type SourceKind = 'repo' | 'site';

interface RepoData {
  name: string;
  full_name: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  languages: Record<string, number>;
  files: FileNode[];
  readme: string;
  packageJson: any;
  hasTests: boolean;
  hasCI: boolean;
  hasLicense: boolean;
  hasTypescript: boolean;
  hasLinting: boolean;
  fileCount: number;
  totalLOC: number;
  lastUpdated: string;
  topics: string[];
  defaultBranch: string;
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
}

interface QualityGate {
  id: string;
  name: string;
  icon: any;
  status: 'pass' | 'warn' | 'fail' | 'pending';
  detail: string;
  score: number;
}

interface PipelineStep {
  id: string;
  name: string;
  status: 'done' | 'active' | 'queued' | 'error';
  detail: string;
  duration: string;
}

interface ActivityLog {
  time: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

// ============================================
// MAIN APP
// ============================================
export default function App() {
  const [sourceKind, setSourceKind] = useState<SourceKind>('repo');
  const [inputValue, setInputValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [repoData, setRepoData] = useState<RepoData | null>(null);
  const [qualityGates, setQualityGates] = useState<QualityGate[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStep[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [qualityScore, setQualityScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [nodeStatus, setNodeStatus] = useState<any>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Fetch GitLawB node status on mount
  useEffect(() => {
    fetch('https://node.gitlawb.com/')
      .then(r => r.json())
      .then(setNodeStatus)
      .catch(() => {});
  }, []);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [activityLog]);

  const addLog = useCallback((message: string, type: ActivityLog['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setActivityLog(prev => [...prev, { time, message, type }]);
  }, []);

  const updatePipeline = useCallback((stepId: string, status: PipelineStep['status'], detail: string, duration?: string) => {
    setPipeline(prev => prev.map(s => 
      s.id === stepId ? { ...s, status, detail, duration: duration || s.duration } : s
    ));
  }, []);

  // ============================================
  // GITHUB API FETCHING
  // ============================================
  const fetchGitHubAPI = async (path: string) => {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    return res.json();
  };

  const fetchGitHubFile = async (owner: string, repo: string, path: string): Promise<string | null> => {
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        headers: { 'Accept': 'application/vnd.github.v3.raw' }
      });
      if (!res.ok) return null;
      return await res.text();
    } catch { return null; }
  };

  const fetchLanguages = async (owner: string, repo: string): Promise<Record<string, number>> => {
    try {
      return await fetchGitHubAPI(`/repos/${owner}/${repo}/languages`);
    } catch { return {}; }
  };

  const fetchRepoTree = async (owner: string, repo: string, branch: string): Promise<FileNode[]> => {
    try {
      const data = await fetchGitHubAPI(`/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
      return (data.tree || []).map((item: any) => ({
        name: item.path.split('/').pop(),
        path: item.path,
        type: item.type === 'tree' ? 'dir' : 'file',
        size: item.size
      }));
    } catch { return []; }
  };

  // ============================================
  // ANALYSIS ENGINE
  // ============================================
  const analyzeRepo = async () => {
    if (!inputValue.trim()) return;
    
    setIsAnalyzing(true);
    setError(null);
    setRepoData(null);
    setQualityGates([]);
    setActivityLog([]);
    setQualityScore(0);

    // Initialize pipeline
    setPipeline([
      { id: 'intake', name: 'Source Intake', status: 'active', detail: 'Parsing input...', duration: '—' },
      { id: 'fetch', name: 'Data Fetch', status: 'queued', detail: 'Waiting...', duration: '—' },
      { id: 'analyze', name: 'Code Analysis', status: 'queued', detail: 'Waiting...', duration: '—' },
      { id: 'gates', name: 'Quality Gates', status: 'queued', detail: 'Waiting...', duration: '—' },
      { id: 'brief', name: 'Brief Generation', status: 'queued', detail: 'Waiting...', duration: '—' },
      { id: 'build', name: 'Build Prep', status: 'queued', detail: 'Waiting...', duration: '—' },
    ]);

    const startTime = Date.now();

    try {
      // Step 1: Parse input
      addLog('Parsing source input...', 'info');
      let owner = '', repo = '';
      
      const input = inputValue.trim();
      if (input.includes('github.com')) {
        const match = input.match(/github\.com\/([^\/]+)\/([^\/\s?#]+)/);
        if (match) { owner = match[1]; repo = match[2].replace('.git', ''); }
      } else if (input.includes('/')) {
        [owner, repo] = input.split('/');
      }
      
      if (!owner || !repo) {
        throw new Error('Invalid format. Use: owner/repo or GitHub URL');
      }

      addLog(`Resolved: ${owner}/${repo}`, 'success');
      updatePipeline('intake', 'done', `${owner}/${repo}`, `${Date.now() - startTime}ms`);

      // Step 2: Fetch real data
      const fetchStart = Date.now();
      updatePipeline('fetch', 'active', 'Contacting GitHub API...');
      addLog('Fetching repository metadata...', 'info');

      const [repoInfo, languages, readmeContent] = await Promise.all([
        fetchGitHubAPI(`/repos/${owner}/${repo}`),
        fetchLanguages(owner, repo),
        fetchGitHubFile(owner, repo, 'README.md'),
      ]);

      addLog(`Found: ${repoInfo.description || 'No description'}`, 'info');
      addLog(`Stars: ${repoInfo.stargazers_count} | Forks: ${repoInfo.forks_count}`, 'info');
      addLog(`Language: ${repoInfo.language || 'Unknown'}`, 'info');

      updatePipeline('fetch', 'active', 'Fetching file tree...');
      addLog('Fetching complete file tree...', 'info');

      const tree = await fetchRepoTree(owner, repo, repoInfo.default_branch);
      const files = tree.filter(f => f.type === 'file');
      
      addLog(`Found ${files.length} files in repository`, 'success');

      // Fetch package.json if exists
      let packageJson = null;
      const pkgFile = await fetchGitHubFile(owner, repo, 'package.json');
      if (pkgFile) {
        try { packageJson = JSON.parse(pkgFile); } catch {}
      }

      updatePipeline('fetch', 'done', `${files.length} files fetched`, `${Date.now() - fetchStart}ms`);

      // Step 3: Code Analysis
      const analyzeStart = Date.now();
      updatePipeline('analyze', 'active', 'Analyzing codebase...');
      addLog('Analyzing codebase structure...', 'info');

      const filePaths = files.map(f => f.path);
      const totalLOC = files.reduce((sum, f) => sum + (f.size || 0), 0);

      // Detect features
      const hasTests = filePaths.some(p => 
        /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(p) || 
        p.includes('__tests__') || 
        p.includes('/test/') ||
        p.includes('/tests/')
      );
      const hasCI = filePaths.some(p => 
        p.includes('.github/workflows') || 
        p.includes('.circleci') || 
        p.includes('.travis.yml') ||
        p.includes('Jenkinsfile')
      );
      const hasLicense = filePaths.some(p => 
        p.toLowerCase().startsWith('license') || 
        p.toLowerCase().startsWith('licence')
      );
      const hasTypescript = filePaths.some(p => p.endsWith('.ts') || p.endsWith('.tsx')) ||
        !!pkgFile?.includes('"typescript"');
      const hasLinting = filePaths.some(p => 
        p.includes('.eslintrc') || 
        p.includes('.prettierrc') || 
        p.includes('biome.json') ||
        p.includes('eslint.config')
      );

      // Calculate LOC by language
      const langLOC: Record<string, number> = {};
      files.forEach(f => {
        const ext = f.name?.split('.').pop()?.toLowerCase() || '';
        const langMap: Record<string, string> = {
          ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript',
          py: 'Python', rs: 'Rust', go: 'Go', sol: 'Solidity',
          css: 'CSS', html: 'HTML', md: 'Markdown', json: 'JSON',
          yaml: 'YAML', yml: 'YAML', toml: 'TOML', sh: 'Shell',
        };
        const lang = langMap[ext];
        if (lang) {
          langLOC[lang] = (langLOC[lang] || 0) + (f.size || 0);
        }
      });

      addLog(`Stack: ${Object.keys(langLOC).join(', ') || 'Unknown'}`, 'info');
      addLog(`Tests: ${hasTests ? 'Yes' : 'No'} | CI: ${hasCI ? 'Yes' : 'No'} | TS: ${hasTypescript ? 'Yes' : 'No'}`, 'info');

      const repoResult: RepoData = {
        name: repoInfo.name,
        full_name: repoInfo.full_name,
        description: repoInfo.description || '',
        stars: repoInfo.stargazers_count,
        forks: repoInfo.forks_count,
        language: repoInfo.language || 'Unknown',
        languages: languages,
        files: tree,
        readme: readmeContent || '',
        packageJson,
        hasTests,
        hasCI,
        hasLicense,
        hasTypescript,
        hasLinting,
        fileCount: files.length,
        totalLOC,
        lastUpdated: repoInfo.updated_at,
        topics: repoInfo.topics || [],
        defaultBranch: repoInfo.default_branch,
      };

      setRepoData(repoResult);
      updatePipeline('analyze', 'done', `${files.length} files, ${Object.keys(langLOC).length} languages`, `${Date.now() - analyzeStart}ms`);

      // Step 4: Quality Gates
      const gatesStart = Date.now();
      updatePipeline('gates', 'active', 'Running quality checks...');
      addLog('Running quality gates...', 'info');

      const gates: QualityGate[] = [
        {
          id: 'readme',
          name: 'README',
          icon: FileText,
          status: hasLicense ? 'pass' : readmeContent ? 'pass' : 'fail',
          detail: readmeContent ? `${Math.ceil((readmeContent.length || 0) / 100)}00+ chars` : 'Missing README.md',
          score: readmeContent ? 100 : 0,
        },
        {
          id: 'ci',
          name: 'CI/CD',
          icon: Zap,
          status: hasCI ? 'pass' : 'warn',
          detail: hasCI ? 'GitHub Actions detected' : 'No CI pipeline found',
          score: hasCI ? 100 : 40,
        },
        {
          id: 'tests',
          name: 'Tests',
          icon: TestTube,
          status: hasTests ? 'pass' : 'warn',
          detail: hasTests ? 'Test files detected' : 'No test files found',
          score: hasTests ? 100 : 30,
        },
        {
          id: 'typescript',
          name: 'TypeScript',
          icon: Code2,
          status: hasTypescript ? 'pass' : 'warn',
          detail: hasTypescript ? 'TypeScript enabled' : 'JavaScript only',
          score: hasTypescript ? 100 : 60,
        },
        {
          id: 'linting',
          name: 'Linting',
          icon: Settings,
          status: hasLinting ? 'pass' : 'warn',
          detail: hasLinting ? 'Linter configured' : 'No linter config found',
          score: hasLinting ? 100 : 50,
        },
        {
          id: 'license',
          name: 'License',
          icon: Scale,
          status: hasLicense ? 'pass' : 'fail',
          detail: hasLicense ? 'License file present' : 'No license file',
          score: hasLicense ? 100 : 0,
        },
      ];

      setQualityGates(gates);
      const avgScore = Math.round(gates.reduce((s, g) => s + g.score, 0) / gates.length);
      setQualityScore(avgScore);

      gates.forEach(g => {
        const icon = g.status === 'pass' ? '✓' : g.status === 'warn' ? '!' : '✗';
        addLog(`[${icon}] ${g.name}: ${g.detail}`, g.status === 'pass' ? 'success' : g.status === 'warn' ? 'warn' : 'error');
      });

      addLog(`Quality Score: ${avgScore}/100`, avgScore >= 70 ? 'success' : 'warn');
      updatePipeline('gates', 'done', `Score: ${avgScore}/100`, `${Date.now() - gatesStart}ms`);

      // Step 5: Brief Generation
      const briefStart = Date.now();
      updatePipeline('brief', 'active', 'Generating brief...');

      const topLangs = Object.entries(languages)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([lang]) => lang);

      addLog(`Brief: ${repoInfo.name} — ${repoInfo.description || 'No description'}`, 'info');
      addLog(`Stack: ${topLangs.join(', ')} | ${files.length} files | ${formatLOC(totalLOC)}`, 'info');
      addLog(`Score: ${avgScore}/100 | ${hasTests ? 'Tested' : 'Untested'} | ${hasCI ? 'CI/CD' : 'No CI'}`, 'info');

      updatePipeline('brief', 'done', 'Brief ready', `${Date.now() - briefStart}ms`);

      // Step 6: Build Prep
      updatePipeline('build', 'active', 'Preparing for Playground...');
      addLog('Ready for GitLawB Playground deployment', 'success');
      addLog(`Playground: https://playground.gitlawb.com`, 'info');
      addLog(`GitHub: https://github.com/${owner}/${repo}`, 'info');
      updatePipeline('build', 'done', 'Ready', `${Date.now() - startTime}ms`);

      addLog(`Analysis complete in ${((Date.now() - startTime) / 1000).toFixed(1)}s`, 'success');

    } catch (err: any) {
      setError(err.message);
      addLog(`Error: ${err.message}`, 'error');
      setPipeline(prev => prev.map(s => 
        s.status === 'active' ? { ...s, status: 'error', detail: err.message } : s
      ));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatLOC = (bytes: number) => {
    if (bytes > 1000000) return `${(bytes / 1000000).toFixed(1)}MB`;
    if (bytes > 1000) return `${(bytes / 1000).toFixed(0)}KB`;
    return `${bytes}B`;
  };

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': case 'done': case 'success': return '#00ff66';
      case 'warn': case 'active': return '#ffaa00';
      case 'fail': case 'error': return '#ff2a2a';
      default: return '#555';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#00ff66';
    if (score >= 60) return '#ffaa00';
    return '#ff2a2a';
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div style={{
      minHeight: '100vh',
      background: '#07090d',
      color: '#e0e0e0',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: '13px',
      lineHeight: '1.6',
    }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid #1a1d24',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#00ff66', fontSize: '18px', fontWeight: 700 }}>⬡</span>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>gitaxolotl</span>
          <span style={{ color: '#555', fontSize: '11px' }}>builder control room</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {nodeStatus && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#555', fontSize: '11px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff66', display: 'inline-block' }} />
              node v{nodeStatus.version}
            </div>
          )}
          <a href="https://playground.gitlawb.com" target="_blank" rel="noopener" style={{ color: '#555', fontSize: '11px', textDecoration: 'none' }}>
            playground ↗
          </a>
          <a href="https://github.com/GitAxolotl/gitaxolotl" target="_blank" rel="noopener" style={{ color: '#555', fontSize: '11px', textDecoration: 'none' }}>
            github ↗
          </a>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1px', background: '#1a1d24', minHeight: 'calc(100vh - 53px)' }}>
        {/* Main Panel */}
        <div style={{ background: '#07090d', padding: '24px', overflowY: 'auto' }}>
          {/* Source Intake */}
          <section style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <GitBranch size={14} color="#555" />
              <span style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source Intake</span>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {(['repo', 'site'] as SourceKind[]).map(kind => (
                <button
                  key={kind}
                  onClick={() => { setSourceKind(kind); setInputValue(''); }}
                  style={{
                    padding: '6px 14px',
                    background: sourceKind === kind ? '#1a1d24' : 'transparent',
                    border: `1px solid ${sourceKind === kind ? '#333' : '#1a1d24'}`,
                    color: sourceKind === kind ? '#fff' : '#555',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    borderRadius: '2px',
                  }}
                >
                  {kind === 'repo' ? 'GitHub Repo' : 'Live Site'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && analyzeRepo()}
                placeholder={sourceKind === 'repo' ? 'owner/repo or GitHub URL' : 'https://example.com'}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  background: '#0d0f14',
                  border: '1px solid #1a1d24',
                  color: '#fff',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  borderRadius: '2px',
                }}
              />
              <button
                onClick={analyzeRepo}
                disabled={isAnalyzing || !inputValue.trim()}
                style={{
                  padding: '10px 20px',
                  background: isAnalyzing ? '#1a1d24' : '#00ff66',
                  border: 'none',
                  color: isAnalyzing ? '#555' : '#000',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isAnalyzing ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isAnalyzing ? <Loader2 size={14} className="spin" /> : <Zap size={14} />}
                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>

            {/* Quick examples */}
            {!repoData && !isAnalyzing && (
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['GitAxolotl/gitaxolotl', 'Gitlawb/openclaude', 'Gitlawb/contracts'].map(ex => (
                  <button
                    key={ex}
                    onClick={() => { setInputValue(ex); }}
                    style={{
                      padding: '4px 10px',
                      background: '#0d0f14',
                      border: '1px solid #1a1d24',
                      color: '#555',
                      fontSize: '10px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      borderRadius: '2px',
                    }}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div style={{ marginTop: '12px', padding: '10px', background: '#1a0002', border: '1px solid #3a0004', color: '#ff5555', fontSize: '12px', borderRadius: '2px' }}>
                {error}
              </div>
            )}
          </section>

          {/* Repo Info */}
          {repoData && (
            <section style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <FileCode size={14} color="#555" />
                <span style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Repository</span>
              </div>

              <div style={{ background: '#0d0f14', border: '1px solid #1a1d24', borderRadius: '2px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 600, margin: '0 0 6px 0' }}>
                      {repoData.full_name}
                    </h2>
                    <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>{repoData.description}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#ffaa00', fontSize: '16px', fontWeight: 700 }}>{formatNumber(repoData.stars)}</div>
                      <div style={{ color: '#555', fontSize: '10px' }}>stars</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#00bcff', fontSize: '16px', fontWeight: 700 }}>{formatNumber(repoData.forks)}</div>
                      <div style={{ color: '#555', fontSize: '10px' }}>forks</div>
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  {[
                    { label: 'Language', value: repoData.language },
                    { label: 'Files', value: repoData.fileCount.toString() },
                    { label: 'Size', value: formatLOC(repoData.totalLOC) },
                    { label: 'Branch', value: repoData.defaultBranch },
                  ].map(stat => (
                    <div key={stat.label} style={{ background: '#07090d', padding: '10px', borderRadius: '2px', border: '1px solid #1a1d24' }}>
                      <div style={{ color: '#555', fontSize: '10px', marginBottom: '4px' }}>{stat.label}</div>
                      <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{stat.value}</div>
                    </div>
                  ))}
                </div>

                {/* Languages bar */}
                {Object.keys(repoData.languages).length > 0 && (
                  <div>
                    <div style={{ color: '#555', fontSize: '10px', marginBottom: '6px' }}>Languages</div>
                    <div style={{ display: 'flex', height: '4px', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
                      {Object.entries(repoData.languages)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([lang, bytes], i) => {
                          const total = Object.values(repoData.languages).reduce((s, v) => s + v, 0);
                          const pct = (bytes / total) * 100;
                          const colors = ['#00ff66', '#00bcff', '#ffaa00', '#ff00cc', '#ff2a2a'];
                          return (
                            <div key={lang} style={{ width: `${pct}%`, background: colors[i % colors.length] }} title={`${lang}: ${pct.toFixed(1)}%`} />
                          );
                        })}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {Object.entries(repoData.languages)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([lang, bytes], i) => {
                          const total = Object.values(repoData.languages).reduce((s, v) => s + v, 0);
                          const pct = ((bytes / total) * 100).toFixed(1);
                          const colors = ['#00ff66', '#00bcff', '#ffaa00', '#ff00cc', '#ff2a2a'];
                          return (
                            <span key={lang} style={{ fontSize: '10px', color: '#888' }}>
                              <span style={{ color: colors[i % colors.length] }}>●</span> {lang} {pct}%
                            </span>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Topics */}
                {repoData.topics.length > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {repoData.topics.map(topic => (
                      <span key={topic} style={{ padding: '2px 8px', background: '#1a1d24', color: '#00bcff', fontSize: '10px', borderRadius: '2px' }}>
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Quality Gates */}
          {qualityGates.length > 0 && (
            <section style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Shield size={14} color="#555" />
                <span style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quality Gates</span>
                <span style={{ 
                  marginLeft: 'auto', 
                  color: getScoreColor(qualityScore), 
                  fontSize: '14px', 
                  fontWeight: 700 
                }}>
                  {qualityScore}/100
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {qualityGates.map(gate => {
                  const Icon = gate.icon;
                  return (
                    <div key={gate.id} style={{
                      background: '#0d0f14',
                      border: `1px solid ${getStatusColor(gate.status)}22`,
                      borderRadius: '2px',
                      padding: '14px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Icon size={12} color={getStatusColor(gate.status)} />
                        <span style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>{gate.name}</span>
                        <span style={{ 
                          marginLeft: 'auto',
                          width: 8, height: 8, borderRadius: '50%',
                          background: getStatusColor(gate.status),
                          boxShadow: `0 0 6px ${getStatusColor(gate.status)}`,
                        }} />
                      </div>
                      <div style={{ color: '#888', fontSize: '11px' }}>{gate.detail}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Pipeline */}
          {pipeline.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Activity size={14} color="#555" />
                <span style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pipeline</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {pipeline.map((step) => (
                  <div key={step.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    background: step.status === 'active' ? '#0d1a0d' : '#0d0f14',
                    border: `1px solid ${step.status === 'active' ? '#00ff6622' : '#1a1d24'}`,
                    borderRadius: '2px',
                  }}>
                    <span style={{ 
                      color: getStatusColor(step.status), 
                      fontSize: '14px',
                      width: '20px',
                      textAlign: 'center',
                    }}>
                      {step.status === 'done' ? '✓' : step.status === 'active' ? '●' : step.status === 'error' ? '✗' : '○'}
                    </span>
                    <span style={{ color: step.status === 'queued' ? '#555' : '#fff', fontSize: '12px', fontWeight: 500, minWidth: '120px' }}>
                      {step.name}
                    </span>
                    <span style={{ color: '#555', fontSize: '11px', flex: 1 }}>{step.detail}</span>
                    <span style={{ color: '#444', fontSize: '10px' }}>{step.duration}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ background: '#0a0c11', borderLeft: '1px solid #1a1d24', display: 'flex', flexDirection: 'column' }}>
          {/* Score */}
          {repoData && (
            <div style={{ padding: '24px', borderBottom: '1px solid #1a1d24', textAlign: 'center' }}>
              <div style={{ color: '#555', fontSize: '10px', textTransform: 'uppercase', marginBottom: '8px' }}>Quality Score</div>
              <div style={{ 
                fontSize: '48px', 
                fontWeight: 700, 
                color: getScoreColor(qualityScore),
                textShadow: `0 0 20px ${getScoreColor(qualityScore)}44`,
                lineHeight: 1,
              }}>
                {qualityScore}
              </div>
              <div style={{ color: '#555', fontSize: '11px', marginTop: '4px' }}>/100</div>
            </div>
          )}

          {/* Quick Stats */}
          {repoData && (
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #1a1d24' }}>
              <div style={{ color: '#555', fontSize: '10px', textTransform: 'uppercase', marginBottom: '12px' }}>Quick Stats</div>
              {[
                { icon: Star, label: 'Stars', value: formatNumber(repoData.stars), color: '#ffaa00' },
                { icon: GitBranch, label: 'Forks', value: formatNumber(repoData.forks), color: '#00bcff' },
                { icon: FileCode, label: 'Files', value: repoData.fileCount.toString(), color: '#00ff66' },
                { icon: Clock, label: 'Updated', value: new Date(repoData.lastUpdated).toLocaleDateString(), color: '#888' },
              ].map(stat => (
                <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <stat.icon size={12} color={stat.color} />
                  <span style={{ color: '#555', fontSize: '11px', flex: 1 }}>{stat.label}</span>
                  <span style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>{stat.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Handoff */}
          {repoData && (
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #1a1d24' }}>
              <div style={{ color: '#555', fontSize: '10px', textTransform: 'uppercase', marginBottom: '12px' }}>Handoff</div>
              <a
                href={`https://playground.gitlawb.com`}
                target="_blank"
                rel="noopener"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px',
                  background: '#0d0f14',
                  border: '1px solid #1a1d24',
                  color: '#00ff66',
                  fontSize: '12px',
                  textDecoration: 'none',
                  borderRadius: '2px',
                  marginBottom: '8px',
                }}
              >
                <ExternalLink size={12} />
                Open in Playground
              </a>
              <a
                href={`https://github.com/${repoData.full_name}`}
                target="_blank"
                rel="noopener"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px',
                  background: '#0d0f14',
                  border: '1px solid #1a1d24',
                  color: '#888',
                  fontSize: '12px',
                  textDecoration: 'none',
                  borderRadius: '2px',
                }}
              >
                <ExternalLink size={12} />
                View on GitHub
              </a>
            </div>
          )}

          {/* Activity Log */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '16px 24px 8px' }}>
              <div style={{ color: '#555', fontSize: '10px', textTransform: 'uppercase' }}>Activity Log</div>
            </div>
            <div ref={logRef} style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
              {activityLog.length === 0 ? (
                <div style={{ color: '#333', fontSize: '11px', fontStyle: 'italic' }}>No activity yet</div>
              ) : (
                activityLog.map((log, i) => (
                  <div key={i} style={{ marginBottom: '6px', fontSize: '11px' }}>
                    <span style={{ color: '#444', marginRight: '8px' }}>{log.time}</span>
                    <span style={{ color: getStatusColor(log.type) }}>{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        input::placeholder { color: #333; }
        input:focus { border-color: #333 !important; }
      `}</style>
    </div>
  );
}
