import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  GitBranch, Star, FileCode, Clock, 
  Loader2, ExternalLink, Zap, Shield,
  Code2, TestTube, FileText, Scale, Settings, Activity,
  SlidersHorizontal, Terminal, Flame
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
  testFiles: number;
  testRatio: number;
  tsRatio: number;
  strictMode: boolean;
  workflowCount: number;
  licenseType: string;
  readmeLength: number;
  readmeSections: number;
  readmeCodeBlocks: number;
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
// THEMES
// ============================================
interface ColorTheme {
  id: string;
  name: string;
  accent: string;
  glow: string;
  bg: string;
  rain: string;
}

const THEMES: ColorTheme[] = [
  { id: 'green', name: 'Emerald', accent: '#00ff66', glow: '#00ff55', bg: '#07090d', rain: 'rgba(0,255,102,0.08)' },
  { id: 'amber', name: 'Amber', accent: '#ffaa00', glow: '#ff9900', bg: '#0c0500', rain: 'rgba(255,170,0,0.06)' },
  { id: 'cyan', name: 'Cyan', accent: '#00f0ff', glow: '#00bcff', bg: '#080010', rain: 'rgba(0,240,255,0.06)' },
  { id: 'red', name: 'Crimson', accent: '#ff2a2a', glow: '#ff0000', bg: '#0a0002', rain: 'rgba(255,42,42,0.06)' },
];

// ============================================
// MAIN APP
// ============================================
export default function App() {
  const [themeId, setThemeId] = useState('green');
  const [sourceKind, setSourceKind] = useState<SourceKind>('repo');
  const [inputValue, setInputValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [repoData, setRepoData] = useState<RepoData | null>(null);
  const [qualityGates, setQualityGates] = useState<QualityGate[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStep[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [qualityScore, setQualityScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [nodeStatus, setNodeStatus] = useState<any>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const animRef = useRef({ time: 0, angle: 0, ax: 0, ay: 0, joy: 0, joyDur: 0 });
  const rainRef = useRef<{ x: number; y: number; speed: number; chars: string[]; op: number }[]>([]);
  const foodRef = useRef<{ id: number; x: number; y: number; val: string; speed: number; rot: number; eaten: boolean }[]>([]);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; char: string; life: number }[]>([]);

  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];

  // Fetch node status
  useEffect(() => {
    fetch('https://node.gitlawb.com/').then(r => r.json()).then(setNodeStatus).catch(() => {});
  }, []);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [activityLog]);

  // ============================================
  // CANVAS ANIMATION
  // ============================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
      initRain(canvas.width);
    };
    resize();
    const obs = new ResizeObserver(resize);
    if (canvas.parentElement) obs.observe(canvas.parentElement);
    return () => obs.disconnect();
  }, []);

  const initRain = useCallback((w: number) => {
    const streams: typeof rainRef.current = [];
    const chars = '01ABCDEF@#$%&*='.split('');
    for (let i = 0; i < Math.ceil(w / 15); i++) {
      if (Math.random() > 0.4) {
        const c: string[] = [];
        for (let j = 0; j < 5 + Math.floor(Math.random() * 12); j++) c.push(chars[Math.floor(Math.random() * chars.length)]);
        streams.push({ x: i * 15, y: Math.random() * -1000, speed: 1 + Math.random() * 2.5, chars: c, op: 0.1 + Math.random() * 0.8 });
      }
    }
    rainRef.current = streams;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame: number;
    const render = () => {
      const W = canvas.width, H = canvas.height;
      const cx = W / 2, cy = H / 2;
      const s = animRef.current;
      s.time += 0.016;

      // Background
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = theme.rain;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let x = cx % 40; x < W; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = cy % 40; y < H; y += 40) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();

      // Rain
      ctx.font = '10px Courier New';
      rainRef.current.forEach(stream => {
        stream.y += stream.speed;
        if (stream.y > H + 50) { stream.y = Math.random() * -200; stream.speed = 0.8 + Math.random() * 2.5; }
        stream.chars.forEach((ch, i) => {
          const y = stream.y - i * 14;
          if (y > 0 && y < H) {
            ctx.fillStyle = theme.rain.replace(/[\d.]+\)$/, `${stream.op * (1 - i / stream.chars.length) * 0.4})`);
            ctx.fillText(ch, stream.x, y);
          }
        });
      });

      // Food chips
      const food = foodRef.current.filter(f => !f.eaten && f.y < H + 20);
      food.forEach(f => {
        f.y += f.speed * 0.4;
        f.rot += 0.01;
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = theme.accent;
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.val, 0, 0);
        ctx.restore();
      });

      // Particles
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        ctx.fillStyle = theme.accent.replace(')', `,${p.life})`).replace('rgb', 'rgba');
        ctx.font = '10px monospace';
        ctx.fillText(p.char, p.x, p.y);
      });

      // Logo (hexagon)
      const pulse = Math.sin(s.time * 2) * 2.5;
      const hx = cx, hy = cy + 45;
      const R = 23 + pulse * 0.12;
      const rcos = R * 0.866;
      ctx.save();
      ctx.shadowBlur = 15 + pulse * 1.5;
      ctx.shadowColor = '#fff';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(hx, hy - R);
      ctx.lineTo(hx + rcos, hy - R/2);
      ctx.lineTo(hx + rcos + 10, hy - R/2);
      ctx.lineTo(hx + rcos + 10, hy - R/5);
      ctx.lineTo(hx + rcos, hy - R/5);
      ctx.lineTo(hx + rcos, hy + R/5);
      ctx.lineTo(hx + rcos + 10, hy + R/5);
      ctx.lineTo(hx + rcos + 10, hy + R/2);
      ctx.lineTo(hx + rcos, hy + R/2);
      ctx.lineTo(hx, hy + R);
      ctx.lineTo(hx - rcos, hy + R/2);
      ctx.lineTo(hx - rcos, hy - R/2);
      ctx.closePath();
      ctx.stroke();
      // Inner hex
      const iR = R - 8, ircos = iR * 0.866;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(hx, hy - iR);
      ctx.lineTo(hx + ircos, hy - iR/2);
      ctx.lineTo(hx + ircos, hy + iR/2);
      ctx.lineTo(hx, hy + iR);
      ctx.lineTo(hx - ircos, hy + iR/2);
      ctx.lineTo(hx - ircos, hy - iR/2);
      ctx.closePath();
      ctx.stroke();
      // Stem + branches
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(cx, hy - R); ctx.lineTo(cx, cy - 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx - 52, cy - 62); ctx.lineTo(cx - 52, cy - 95); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx + 52, cy - 62); ctx.lineTo(cx + 52, cy - 95); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 20, cy - 30); ctx.lineTo(cx + 20, cy - 65); ctx.stroke();
      // Nodes
      const drawNode = (nx: number, ny: number) => {
        ctx.beginPath(); ctx.arc(nx, ny, 10, 0, Math.PI * 2);
        ctx.fillStyle = theme.bg; ctx.fill(); ctx.stroke();
      };
      drawNode(cx - 52, cy - 106);
      drawNode(cx + 20, cy - 76);
      drawNode(cx + 52, cy - 106);
      ctx.restore();

      // Axolotl movement
      let tx = cx, ty = cy, found = false;
      if (food.length > 0) {
        let nearest = food[0], minD = Infinity;
        food.forEach(f => {
          const d = Math.hypot(f.x - s.ax, f.y - s.ay);
          if (d < minD) { minD = d; nearest = f; }
        });
        tx = nearest.x; ty = nearest.y; found = true;
        if (minD < 25) {
          nearest.eaten = true;
          s.joy = 1; s.joyDur = 25;
          for (let p = 0; p < 22; p++) {
            const a = Math.random() * Math.PI * 2;
            particlesRef.current.push({ x: s.ax, y: s.ay, vx: Math.cos(a) * (2 + Math.random() * 4.5), vy: Math.sin(a) * (2 + Math.random() * 4.5), char: Math.random() > 0.5 ? '1' : '0', life: 1 });
          }
        }
      }

      if (found) {
        const dx = tx - s.ax, dy = ty - s.ay;
        const a = Math.atan2(dy, dx);
        s.ax += Math.cos(a) * 4.8;
        s.ay += Math.sin(a) * 4.8;
      } else {
        s.angle += 0.015;
        s.ax += (cx + 170 * Math.cos(s.angle) - s.ax) * 0.12;
        s.ay += (cy + 170 * Math.sin(s.angle) - s.ay) * 0.12;
      }

      if (s.joy > 0) { s.joyDur--; if (s.joyDur <= 0) s.joy -= 0.05; }

      // Draw axolotl (simplified)
      const swing = Math.sin(s.time * 12) * 1.2;
      ctx.save();
      ctx.translate(s.ax, s.ay);
      ctx.rotate(Math.atan2(cy - s.ay, cx - s.ax) + Math.PI / 2);
      ctx.strokeStyle = theme.accent;
      ctx.fillStyle = theme.accent;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = theme.glow;
      // Body
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 16, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Tail
      ctx.beginPath();
      ctx.moveTo(0, 16);
      ctx.quadraticCurveTo(swing * 3, 28, swing * 5, 35);
      ctx.stroke();
      // Gills
      ctx.lineWidth = 1.5;
      [-1, 1].forEach(side => {
        ctx.beginPath();
        ctx.moveTo(side * 8, -8);
        ctx.lineTo(side * 16, -16);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(side * 8, -6);
        ctx.lineTo(side * 14, -12);
        ctx.stroke();
      });
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-5, -6, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5, -6, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(-5, -6, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5, -6, 1.5, 0, Math.PI * 2); ctx.fill();
      // Cheeks (joy)
      if (s.joy > 0) {
        ctx.fillStyle = `rgba(255,150,150,${s.joy * 0.5})`;
        ctx.beginPath(); ctx.arc(-8, -2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, -2, 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [theme]);

  // Canvas click → drop food
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    foodRef.current.push({ id: Date.now(), x, y, val: Math.random() > 0.5 ? '1' : '0', speed: 1 + Math.random() * 1.5, rot: Math.random() * Math.PI * 2, eaten: false });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
      particlesRef.current.push({ x, y, vx: Math.cos(a) * (1.5 + Math.random() * 2.5), vy: Math.sin(a) * (1.5 + Math.random() * 2.5), char: Math.random() > 0.5 ? '0' : '1', life: 1 });
    }
  };

  // ============================================
  // GITHUB API
  // ============================================
  const gh = async (path: string) => {
    const r = await fetch(`https://api.github.com${path}`, { headers: { 'Accept': 'application/vnd.github.v3+json' } });
    if (!r.ok) throw new Error(`GitHub API: ${r.status}`);
    return r.json();
  };
  const ghFile = async (owner: string, repo: string, path: string) => {
    try { const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, { headers: { 'Accept': 'application/vnd.github.v3.raw' } }); return r.ok ? await r.text() : null; } catch { return null; }
  };

  const addLog = useCallback((msg: string, type: ActivityLog['type'] = 'info') => {
    const t = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setActivityLog(p => [...p, { time: t, message: msg, type }]);
  }, []);

  const updateStep = useCallback((id: string, status: PipelineStep['status'], detail: string, dur?: string) => {
    setPipeline(p => p.map(s => s.id === id ? { ...s, status, detail, duration: dur || s.duration } : s));
  }, []);

  // ============================================
  // ANALYSIS
  // ============================================
  const analyze = async () => {
    if (!inputValue.trim()) return;
    setIsAnalyzing(true); setError(null); setRepoData(null); setQualityGates([]); setActivityLog([]); setQualityScore(0); setShowAnalysis(true);

    setPipeline([
      { id: 'intake', name: 'Source Intake', status: 'active', detail: 'Parsing...', duration: '—' },
      { id: 'fetch', name: 'Data Fetch', status: 'queued', detail: 'Waiting...', duration: '—' },
      { id: 'analyze', name: 'Code Analysis', status: 'queued', detail: 'Waiting...', duration: '—' },
      { id: 'gates', name: 'Quality Gates', status: 'queued', detail: 'Waiting...', duration: '—' },
      { id: 'brief', name: 'Brief', status: 'queued', detail: 'Waiting...', duration: '—' },
      { id: 'build', name: 'Build Prep', status: 'queued', detail: 'Waiting...', duration: '—' },
    ]);

    const t0 = Date.now();
    try {
      addLog('Parsing source input...', 'info');
      let owner = '', repo = '';
      const inp = inputValue.trim();
      if (inp.includes('github.com')) { const m = inp.match(/github\.com\/([^\/]+)\/([^\/\s?#]+)/); if (m) { owner = m[1]; repo = m[2].replace('.git', ''); } }
      else if (inp.includes('/')) { [owner, repo] = inp.split('/'); }
      if (!owner || !repo) throw new Error('Invalid format. Use: owner/repo or GitHub URL');
      addLog(`Resolved: ${owner}/${repo}`, 'success');
      updateStep('intake', 'done', `${owner}/${repo}`, `${Date.now() - t0}ms`);

      // Fetch
      const t1 = Date.now();
      updateStep('fetch', 'active', 'Contacting GitHub API...');
      const [info, langs, readme, pkg, tsconfig, wf, contrib, changelog, security] = await Promise.all([
        gh(`/repos/${owner}/${repo}`),
        gh(`/repos/${owner}/${repo}/languages`).catch(() => ({})),
        ghFile(owner, repo, 'README.md'),
        ghFile(owner, repo, 'package.json'),
        ghFile(owner, repo, 'tsconfig.json'),
        gh(`/repos/${owner}/${repo}/contents/.github/workflows`).catch(() => null),
        ghFile(owner, repo, 'CONTRIBUTING.md'),
        ghFile(owner, repo, 'CHANGELOG.md'),
        ghFile(owner, repo, 'SECURITY.md'),
      ]);
      addLog(`Stars: ${info.stargazers_count} | Forks: ${info.forks_count}`, 'info');
      addLog(`Language: ${info.language || 'Unknown'}`, 'info');

      updateStep('fetch', 'active', 'Fetching file tree...');
      const tree = await gh(`/repos/${owner}/${repo}/git/trees/${info.default_branch}?recursive=1`);
      const files = (tree.tree || []).filter((f: any) => f.type === 'blob');
      addLog(`${files.length} files found`, 'success');

      let pkgJson: any = null;
      if (pkg) try { pkgJson = JSON.parse(pkg); } catch {}
      let tsconfigJson: any = null;
      if (tsconfig) try { tsconfigJson = JSON.parse(tsconfig); } catch {}

      const wfArr = Array.isArray(wf) ? wf : [];
      let wfContent = '';
      if (wfArr.length > 0) wfContent = await ghFile(owner, repo, `.github/workflows/${wfArr[0].name}`) || '';

      updateStep('fetch', 'done', `${files.length} files`, `${Date.now() - t1}ms`);

      // Analysis
      const t2 = Date.now();
      updateStep('analyze', 'active', 'Analyzing...');
      const paths = files.map((f: any) => f.path);
      const totalSize = files.reduce((s: number, f: any) => s + (f.size || 0), 0);

      const testFiles = files.filter((f: any) => /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(f.path) || f.path.includes('__tests__') || f.path.includes('/test/') || f.path.includes('/tests/'));
      const srcFiles = files.filter((f: any) => /\.(ts|tsx|js|jsx)$/.test(f.path) && !f.path.includes('.d.ts'));
      const tsFiles = files.filter((f: any) => f.path.endsWith('.ts') || f.path.endsWith('.tsx'));
      const jsFiles = files.filter((f: any) => f.path.endsWith('.js') || f.path.endsWith('.jsx'));

      const hasTests = testFiles.length > 0;
      const testRatio = srcFiles.length > 0 ? testFiles.length / srcFiles.length : 0;
      const hasCI = paths.some((p: string) => p.includes('.github/workflows'));
      const hasLicense = paths.some((p: string) => p.toLowerCase().startsWith('license'));
      const hasTS = tsFiles.length > 0;
      const tsRatio = (tsFiles.length + jsFiles.length) > 0 ? tsFiles.length / (tsFiles.length + jsFiles.length) : 0;
      const strictMode = tsconfigJson?.compilerOptions?.strict === true;
      const hasLint = paths.some((p: string) => p.includes('.eslintrc') || p.includes('.prettierrc') || p.includes('biome.json') || p.includes('eslint.config'));

      let licType = 'Unknown';
      if (hasLicense) {
        const lc = await ghFile(owner, repo, 'LICENSE') || '';
        if (lc.includes('MIT')) licType = 'MIT';
        else if (lc.includes('Apache')) licType = 'Apache 2.0';
        else if (lc.includes('GNU GPL')) licType = 'GPL';
        else if (lc.includes('BSD')) licType = 'BSD';
        else licType = 'Custom';
      }

      const hasBuildStep = wfContent.includes('build');
      const hasTestStep = wfContent.includes('test');
      const hasDeployStep = wfContent.includes('deploy') || wfContent.includes('publish');
      const hasLintScript = pkgJson?.scripts?.lint || pkgJson?.scripts?.format;
      const hasPrettier = paths.some((p: string) => p.includes('.prettierrc') || p.includes('prettier.config'));

      // README quality
      const rLen = readme?.length || 0;
      const rSections = (readme?.match(/^## /gm) || []).length;
      const rCode = (readme?.match(/```/g) || []).length / 2;

      addLog(`Stack: ${hasTS ? 'TypeScript' : 'JavaScript'}${paths.some((p: string) => p.endsWith('.py')) ? ', Python' : ''}`, 'info');
      addLog(`Tests: ${testFiles.length} files (${(testRatio * 100).toFixed(0)}%) | CI: ${hasCI ? `${wfArr.length} workflows` : 'No'} | TS: ${hasTS ? `${(tsRatio * 100).toFixed(0)}%` : 'No'}`, 'info');

      const rd: RepoData = {
        name: info.name, full_name: info.full_name, description: info.description || '',
        stars: info.stargazers_count, forks: info.forks_count, language: info.language || 'Unknown',
        languages: langs, readme: readme || '', packageJson: pkgJson,
        hasTests, hasCI, hasLicense, hasTypescript: hasTS, hasLinting: hasLint,
        fileCount: files.length, totalLOC: totalSize, lastUpdated: info.updated_at,
        topics: info.topics || [], defaultBranch: info.default_branch,
        testFiles: testFiles.length, testRatio, tsRatio, strictMode,
        workflowCount: wfArr.length, licenseType: licType,
        readmeLength: rLen, readmeSections: rSections, readmeCodeBlocks: rCode,
      };
      setRepoData(rd);
      updateStep('analyze', 'done', `${files.length} files, ${Object.keys(langs).length} langs`, `${Date.now() - t2}ms`);

      // Quality Gates — DATA-DRIVEN
      const t3 = Date.now();
      updateStep('gates', 'active', 'Running checks...');

      let rScore = 0;
      if (readme) {
        rScore = 20;
        if (rLen > 500) rScore += 15;
        if (rLen > 2000) rScore += 15;
        if (rSections >= 3) rScore += 15;
        if (rCode >= 2) rScore += 10;
        if (readme?.toLowerCase().includes('install') || readme?.toLowerCase().includes('getting started')) rScore += 10;
        if (readme?.toLowerCase().includes('usage') || readme?.toLowerCase().includes('example')) rScore += 10;
        if (readme?.includes('![') && (readme?.includes('shield') || readme?.includes('badge'))) rScore += 5;
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
        if (paths.some((p: string) => p.includes('jest.config') || p.includes('vitest.config'))) tScore += 15;
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

      const gates: QualityGate[] = [
        { id: 'readme', name: 'README', icon: FileText, status: rScore >= 70 ? 'pass' : rScore >= 40 ? 'warn' : 'fail', detail: readme ? `${rLen} chars, ${rSections} sections` : 'Missing', score: rScore },
        { id: 'ci', name: 'CI/CD', icon: Zap, status: cScore >= 70 ? 'pass' : cScore >= 40 ? 'warn' : 'fail', detail: hasCI ? `${wfArr.length} workflow(s)` : 'None', score: cScore },
        { id: 'tests', name: 'Tests', icon: TestTube, status: tScore >= 70 ? 'pass' : tScore >= 40 ? 'warn' : 'fail', detail: hasTests ? `${testFiles.length} files, ${(testRatio * 100).toFixed(0)}%` : 'None', score: tScore },
        { id: 'ts', name: 'TypeScript', icon: Code2, status: tsScore >= 70 ? 'pass' : tsScore >= 40 ? 'warn' : 'fail', detail: hasTS ? `${(tsRatio * 100).toFixed(0)}%${strictMode ? ', strict' : ''}` : 'JS only', score: tsScore },
        { id: 'lint', name: 'Linting', icon: Settings, status: lScore >= 70 ? 'pass' : lScore >= 40 ? 'warn' : 'fail', detail: hasLint ? 'Configured' : 'None', score: lScore },
        { id: 'license', name: 'License', icon: Scale, status: hasLicense ? 'pass' : 'fail', detail: hasLicense ? licType : 'None', score: licScore },
      ];
      setQualityGates(gates);
      const avg = Math.round(gates.reduce((s, g) => s + g.score, 0) / gates.length);
      setQualityScore(avg);
      gates.forEach(g => { const i = g.status === 'pass' ? '✓' : g.status === 'warn' ? '!' : '✗'; addLog(`[${i}] ${g.name}: ${g.detail}`, g.status === 'pass' ? 'success' : g.status === 'warn' ? 'warn' : 'error'); });
      addLog(`Quality Score: ${avg}/100`, avg >= 70 ? 'success' : 'warn');
      updateStep('gates', 'done', `Score: ${avg}/100`, `${Date.now() - t3}ms`);

      // Brief
      updateStep('brief', 'active', 'Generating...');
      addLog(`Brief: ${info.name} — ${info.description || 'No description'}`, 'info');
      updateStep('brief', 'done', 'Ready', `${Date.now() - t0}ms`);

      // Build
      updateStep('build', 'active', 'Preparing...');
      addLog(`Playground: https://playground.gitlawb.com`, 'info');
      addLog(`GitHub: https://github.com/${owner}/${repo}`, 'info');
      updateStep('build', 'done', 'Ready', `${Date.now() - t0}ms`);
      addLog(`Analysis complete in ${((Date.now() - t0) / 1000).toFixed(1)}s`, 'success');

    } catch (err: any) {
      setError(err.message);
      addLog(`Error: ${err.message}`, 'error');
      setPipeline(p => p.map(s => s.status === 'active' ? { ...s, status: 'error', detail: err.message } : s));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fmt = (n: number) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : n.toString();
  const statusClr = (s: string) => s === 'pass' || s === 'done' || s === 'success' ? theme.accent : s === 'warn' || s === 'active' ? '#ffaa00' : s === 'fail' || s === 'error' ? '#ff2a2a' : '#555';

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: '#e0e0e0', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid #1a1d24', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: theme.accent, fontSize: '16px', fontWeight: 700 }}>⬡</span>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>gitaxolotl</span>
          <span style={{ color: '#555', fontSize: '11px' }}>builder control room</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Theme switcher */}
          {THEMES.map(t => (
            <button key={t.id} onClick={() => setThemeId(t.id)} style={{
              width: 14, height: 14, borderRadius: '50%', background: t.accent,
              border: themeId === t.id ? '2px solid #fff' : '2px solid transparent',
              cursor: 'pointer', opacity: themeId === t.id ? 1 : 0.4,
            }} />
          ))}
          {nodeStatus && (
            <span style={{ color: '#555', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff66' }} /> node v{nodeStatus.version}
            </span>
          )}
          <a href="https://playground.gitlawb.com" target="_blank" rel="noopener" style={{ color: '#555', fontSize: '11px', textDecoration: 'none' }}>playground ↗</a>
          <a href="https://github.com/GitAxolotl/gitaxolotl" target="_blank" rel="noopener" style={{ color: '#555', fontSize: '11px', textDecoration: 'none' }}>github ↗</a>
        </div>
      </header>

      <div style={{ display: 'flex', height: 'calc(100vh - 45px)' }}>
        {/* Canvas (mascot area) */}
        <div style={{ flex: showAnalysis ? '0 0 45%' : '1', position: 'relative', transition: 'flex 0.3s' }}>
          <canvas ref={canvasRef} onClick={handleCanvasClick} style={{ width: '100%', height: '100%', cursor: 'crosshair' }} />
          {/* Scanlines */}
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)', pointerEvents: 'none' }} />
          {/* Center prompt when no analysis */}
          {!showAnalysis && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px' }}>
              <div style={{ maxWidth: 500, margin: '0 auto' }}>
                <div style={{ color: '#555', fontSize: '10px', textAlign: 'center', marginBottom: '8px' }}>click to feed the axolotl · enter a repo to analyze</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && analyze()}
                    placeholder="owner/repo or GitHub URL"
                    style={{ flex: 1, padding: '10px 14px', background: '#0d0f14ee', border: `1px solid ${theme.accent}33`, color: '#fff', fontSize: '12px', fontFamily: 'inherit', outline: 'none', borderRadius: '2px', backdropFilter: 'blur(8px)' }}
                  />
                  <button onClick={analyze} disabled={isAnalyzing || !inputValue.trim()}
                    style={{ padding: '10px 18px', background: isAnalyzing ? '#1a1d24' : theme.accent, border: 'none', color: isAnalyzing ? '#555' : '#000', fontSize: '11px', fontWeight: 600, cursor: isAnalyzing ? 'wait' : 'pointer', fontFamily: 'inherit', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {isAnalyzing ? <Loader2 size={12} className="spin" /> : <Zap size={12} />}
                    {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
                  {['GitAxolotl/gitaxolotl', 'Gitlawb/openclaude', 'Gitlawb/contracts'].map(ex => (
                    <button key={ex} onClick={() => setInputValue(ex)} style={{ padding: '3px 8px', background: '#0d0f14aa', border: `1px solid ${theme.accent}22`, color: '#555', fontSize: '9px', cursor: 'pointer', fontFamily: 'inherit', borderRadius: '2px' }}>{ex}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Analysis Panel */}
        {showAnalysis && (
          <div style={{ flex: 1, borderLeft: '1px solid #1a1d24', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Input */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a1d24' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && analyze()}
                  placeholder="owner/repo or GitHub URL"
                  style={{ flex: 1, padding: '8px 12px', background: '#0d0f14', border: '1px solid #1a1d24', color: '#fff', fontSize: '12px', fontFamily: 'inherit', outline: 'none', borderRadius: '2px' }}
                />
                <button onClick={analyze} disabled={isAnalyzing || !inputValue.trim()}
                  style={{ padding: '8px 16px', background: isAnalyzing ? '#1a1d24' : theme.accent, border: 'none', color: isAnalyzing ? '#555' : '#000', fontSize: '11px', fontWeight: 600, cursor: isAnalyzing ? 'wait' : 'pointer', fontFamily: 'inherit', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {isAnalyzing ? <Loader2 size={12} className="spin" /> : <Zap size={12} />}
                  {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>
              {/* Quick examples */}
              <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                {['GitAxolotl/gitaxolotl', 'Gitlawb/openclaude', 'Gitlawb/contracts'].map(ex => (
                  <button key={ex} onClick={() => setInputValue(ex)} style={{ padding: '3px 8px', background: '#0d0f14', border: '1px solid #1a1d24', color: '#555', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit', borderRadius: '2px' }}>{ex}</button>
                ))}
              </div>
              {error && <div style={{ marginTop: '8px', padding: '8px', background: '#1a0002', border: '1px solid #3a0004', color: '#ff5555', fontSize: '11px', borderRadius: '2px' }}>{error}</div>}
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {/* Repo Info */}
              {repoData && (
                <section style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <FileCode size={12} color="#555" />
                    <span style={{ color: '#888', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Repository</span>
                  </div>
                  <div style={{ background: '#0d0f14', border: '1px solid #1a1d24', borderRadius: '2px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div>
                        <h2 style={{ color: '#fff', fontSize: '15px', fontWeight: 600, margin: '0 0 4px 0' }}>{repoData.full_name}</h2>
                        <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>{repoData.description}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ textAlign: 'center' }}><div style={{ color: '#ffaa00', fontSize: '14px', fontWeight: 700 }}>{fmt(repoData.stars)}</div><div style={{ color: '#555', fontSize: '9px' }}>stars</div></div>
                        <div style={{ textAlign: 'center' }}><div style={{ color: '#00bcff', fontSize: '14px', fontWeight: 700 }}>{fmt(repoData.forks)}</div><div style={{ color: '#555', fontSize: '9px' }}>forks</div></div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
                      {[
                        { l: 'Language', v: repoData.language }, { l: 'Files', v: repoData.fileCount.toString() },
                        { l: 'Size', v: repoData.totalLOC > 1000000 ? `${(repoData.totalLOC/1000000).toFixed(1)}MB` : `${(repoData.totalLOC/1000).toFixed(0)}KB` },
                        { l: 'Branch', v: repoData.defaultBranch },
                      ].map(s => (
                        <div key={s.l} style={{ background: '#07090d', padding: '8px', borderRadius: '2px', border: '1px solid #1a1d24' }}>
                          <div style={{ color: '#555', fontSize: '9px', marginBottom: '2px' }}>{s.l}</div>
                          <div style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>{s.v}</div>
                        </div>
                      ))}
                    </div>
                    {/* Languages */}
                    {Object.keys(repoData.languages).length > 0 && (
                      <div>
                        <div style={{ display: 'flex', height: '3px', borderRadius: '2px', overflow: 'hidden', marginBottom: '6px' }}>
                          {Object.entries(repoData.languages).sort(([,a],[,b]) => b-a).slice(0,5).map(([lang, bytes], i) => {
                            const total = Object.values(repoData.languages).reduce((s,v) => s+v, 0);
                            const colors = [theme.accent, '#00bcff', '#ffaa00', '#ff00cc', '#ff2a2a'];
                            return <div key={lang} style={{ width: `${(bytes/total)*100}%`, background: colors[i%5] }} />;
                          })}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          {Object.entries(repoData.languages).sort(([,a],[,b]) => b-a).slice(0,5).map(([lang, bytes], i) => {
                            const total = Object.values(repoData.languages).reduce((s,v) => s+v, 0);
                            const colors = [theme.accent, '#00bcff', '#ffaa00', '#ff00cc', '#ff2a2a'];
                            return <span key={lang} style={{ fontSize: '10px', color: '#888' }}><span style={{ color: colors[i%5] }}>●</span> {lang} {((bytes/total)*100).toFixed(1)}%</span>;
                          })}
                        </div>
                      </div>
                    )}
                    {repoData.topics.length > 0 && (
                      <div style={{ marginTop: '10px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {repoData.topics.map(t => <span key={t} style={{ padding: '2px 6px', background: '#1a1d24', color: '#00bcff', fontSize: '9px', borderRadius: '2px' }}>{t}</span>)}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Quality Gates */}
              {qualityGates.length > 0 && (
                <section style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <Shield size={12} color="#555" />
                    <span style={{ color: '#888', fontSize: '10px', textTransform: 'uppercase' }}>Quality Gates</span>
                    <span style={{ marginLeft: 'auto', color: qualityScore >= 70 ? theme.accent : '#ffaa00', fontSize: '13px', fontWeight: 700 }}>{qualityScore}/100</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    {qualityGates.map(g => {
                      const Icon = g.icon;
                      return (
                        <div key={g.id} style={{ background: '#0d0f14', border: `1px solid ${statusClr(g.status)}22`, borderRadius: '2px', padding: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <Icon size={11} color={statusClr(g.status)} />
                            <span style={{ color: '#fff', fontSize: '11px', fontWeight: 600 }}>{g.name}</span>
                            <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 700, color: statusClr(g.status) }}>{g.score}</span>
                          </div>
                          <div style={{ color: '#888', fontSize: '10px' }}>{g.detail}</div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Pipeline */}
              {pipeline.length > 0 && (
                <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <Activity size={12} color="#555" />
                    <span style={{ color: '#888', fontSize: '10px', textTransform: 'uppercase' }}>Pipeline</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {pipeline.map(step => (
                      <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: step.status === 'active' ? '#0d1a0d' : '#0d0f14', border: `1px solid ${step.status === 'active' ? theme.accent + '22' : '#1a1d24'}`, borderRadius: '2px' }}>
                        <span style={{ color: statusClr(step.status), fontSize: '12px', width: '16px', textAlign: 'center' }}>
                          {step.status === 'done' ? '✓' : step.status === 'active' ? '●' : step.status === 'error' ? '✗' : '○'}
                        </span>
                        <span style={{ color: step.status === 'queued' ? '#555' : '#fff', fontSize: '11px', fontWeight: 500, minWidth: '100px' }}>{step.name}</span>
                        <span style={{ color: '#555', fontSize: '10px', flex: 1 }}>{step.detail}</span>
                        <span style={{ color: '#444', fontSize: '9px' }}>{step.duration}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Bottom bar: Activity Log */}
            <div style={{ borderTop: '1px solid #1a1d24', height: '160px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '8px 20px 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Terminal size={11} color="#555" />
                <span style={{ color: '#555', fontSize: '9px', textTransform: 'uppercase' }}>Activity Log</span>
                {repoData && (
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                    <a href={`https://playground.gitlawb.com`} target="_blank" rel="noopener" style={{ color: theme.accent, fontSize: '10px', textDecoration: 'none' }}>Playground ↗</a>
                    <a href={`https://github.com/${repoData.full_name}`} target="_blank" rel="noopener" style={{ color: '#888', fontSize: '10px', textDecoration: 'none' }}>GitHub ↗</a>
                  </div>
                )}
              </div>
              <div ref={logRef} style={{ flex: 1, overflowY: 'auto', padding: '0 20px 8px' }}>
                {activityLog.length === 0 ? (
                  <div style={{ color: '#333', fontSize: '10px', fontStyle: 'italic' }}>No activity yet</div>
                ) : activityLog.map((log, i) => (
                  <div key={i} style={{ marginBottom: '3px', fontSize: '10px' }}>
                    <span style={{ color: '#444', marginRight: '6px' }}>{log.time}</span>
                    <span style={{ color: statusClr(log.type) }}>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        input::placeholder { color: #333; }
        input:focus { border-color: #333 !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0c11; }
        ::-webkit-scrollbar-thumb { background: #1a1d24; border-radius: 2px; }
      `}</style>
    </div>
  );
}
