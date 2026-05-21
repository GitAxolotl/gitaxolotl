import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  SlidersHorizontal, 
  Terminal, 
  Flame, 
  Trash2, 
  Info,
  Database
} from 'lucide-react';

// ==========================================
// KONFIGURASI TEMA MATEKS NEON
// ==========================================
interface ColorTheme {
  id: string;
  name: string;
  accentColor: string;
  glowColor: string;
  logoColor: string;
  bgColor: string;
  bgGradient: string;
  rainColor: string;
  glowAccent: string;
}

const THEMES: ColorTheme[] = [
  {
    id: 'matrix-green',
    name: 'Emerald Matrix',
    accentColor: '#00ff66',
    glowColor: '#00ff55',
    logoColor: '#ffffff',
    bgColor: '#020617',
    bgGradient: 'radial-gradient(circle at center, rgba(0, 50, 20, 0.25) 0%, rgba(2, 6, 23, 1) 75%)',
    rainColor: 'rgba(0, 255, 102, 0.08)',
    glowAccent: '#00ffaa'
  },
  {
    id: 'cyber-amber',
    name: 'Phosphor Amber',
    accentColor: '#ffaa00',
    glowColor: '#ff9900',
    logoColor: '#ffffff',
    bgColor: '#0c0500',
    bgGradient: 'radial-gradient(circle at center, rgba(60, 25, 0, 0.3) 0%, rgba(12, 5, 0, 1) 75%)',
    rainColor: 'rgba(255, 170, 0, 0.06)',
    glowAccent: '#ffdd00'
  },
  {
    id: 'vaporwave',
    name: 'Vapor Wave',
    accentColor: '#00f0ff',
    glowColor: '#00bcff',
    logoColor: '#ff007f',
    bgColor: '#080010',
    bgGradient: 'radial-gradient(circle at center, rgba(40, 0, 60, 0.35) 0%, rgba(8, 0, 16, 1) 75%)',
    rainColor: 'rgba(0, 240, 255, 0.06)',
    glowAccent: '#ff00cc'
  },
  {
    id: 'crimson',
    name: 'Crimson Hack',
    accentColor: '#ff2a2a',
    glowColor: '#ff0000',
    logoColor: '#ffffff',
    bgColor: '#0a0002',
    bgGradient: 'radial-gradient(circle at center, rgba(50, 0, 5, 0.35) 0%, rgba(10, 0, 2, 1) 75%)',
    rainColor: 'rgba(255, 42, 42, 0.06)',
    glowAccent: '#ff5555'
  }
];

interface FoodChip {
  id: number;
  x: number;
  y: number;
  value: string;
  speed: number;
  rotation: number;
  opacity: number;
  eaten: boolean;
}

interface CyberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  char: string;
  color: string;
  life: number;
  size: number;
}

interface RainStream {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  opacity: number;
}

export default function App() {
  const [activeThemeId, setActiveThemeId] = useState<string>('matrix-green');
  const [orbitRadius, setOrbitRadius] = useState<number>(170);
  const [orbitSpeed, setOrbitSpeed] = useState<number>(0.9);
  const [asciiResolution, setAsciiResolution] = useState<number>(44);
  const [wiggleIntensity, setWiggleIntensity] = useState<number>(1.2);
  const [glowIntensity, setGlowIntensity] = useState<number>(6);
  const [isOrbiting, setIsOrbiting] = useState<boolean>(true);
  const [rotateGlyphsWithBody] = useState<boolean>(true);
  
  const [showSettings, setShowSettings] = useState<boolean>(true);
  const [matrixRainEnabled, setMatrixRainEnabled] = useState<boolean>(true);
  const [scanlinesEnabled, setScanlinesEnabled] = useState<boolean>(true);
  const [alignmentMode, setAlignmentMode] = useState<'inward' | 'tangent'>('inward');
  const [interactiveFeeding] = useState<boolean>(true);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const animationStateRef = useRef({
    time: 0,
    orbitAngle: 0,
    axolotlX: 0,
    axolotlY: 0,
    axolotlRotation: 0,
    cheeksJoyLevel: 0,
    currentJoyDuration: 0,
  });

  const [foodChips, setFoodChips] = useState<FoodChip[]>([]);
  const foodChipsRef = useRef<FoodChip[]>([]);
  const particlesRef = useRef<CyberParticle[]>([]);
  const rainStreamsRef = useRef<RainStream[]>([]);

  const activeTheme = THEMES.find(t => t.id === activeThemeId) || THEMES[0];

  useEffect(() => {
    foodChipsRef.current = foodChips;
  }, [foodChips]);

  const initMatrixRain = useCallback((width: number) => {
    const streams: RainStream[] = [];
    const spacing = 15;
    const count = Math.ceil(width / spacing);
    const chars = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$&%+*=~'.split('');

    for (let i = 0; i < count; i++) {
      if (Math.random() > 0.4) {
        const streamChars: string[] = [];
        const length = 5 + Math.floor(Math.random() * 12);
        for (let j = 0; j < length; j++) {
          streamChars.push(chars[Math.floor(Math.random() * chars.length)]);
        }
        streams.push({
          x: i * spacing,
          y: Math.random() * -1000,
          speed: 1.0 + Math.random() * 2.5,
          chars: streamChars,
          opacity: 0.1 + Math.random() * 0.8
        });
      }
    }
    rainStreamsRef.current = streams;
  }, []);

  const dropFoodChip = useCallback((x: number, y: number) => {
    const newChip: FoodChip = {
      id: Date.now() + Math.random(),
      x,
      y,
      value: Math.random() > 0.5 ? '1' : '0',
      speed: 1.0 + Math.random() * 1.5,
      rotation: Math.random() * Math.PI * 2,
      opacity: 1.0,
      eaten: false
    };
    
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
      const force = 1.5 + Math.random() * 2.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force,
        char: Math.random() > 0.5 ? '0' : '1',
        color: activeTheme.accentColor,
        life: 1.0,
        size: 9 + Math.random() * 5
      });
    }

    setFoodChips(prev => [...prev, newChip]);
  }, [activeTheme]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !interactiveFeeding) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    dropFoodChip(x, y);
  };

  useEffect(() => {
    const offscreen = document.createElement('canvas');
    offscreen.width = 110;
    offscreen.height = 110;
    offscreenCanvasRef.current = offscreen;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = Math.max(parent.clientHeight, 450);
      initMatrixRain(canvas.width);
    };

    resize();
    const observer = new ResizeObserver(() => resize());
    if (canvas.parentElement) {
      observer.observe(canvas.parentElement);
    }
    return () => observer.disconnect();
  }, [initMatrixRain]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const offscreen = offscreenCanvasRef.current;
    if (!canvas || !offscreen) return;

    const ctx = canvas.getContext('2d');
    const offCtx = offscreen.getContext('2d');
    if (!ctx || !offCtx) return;

    let frameId: number;

    const renderLoop = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      const state = animationStateRef.current;
      state.time += 0.016;

      ctx.fillStyle = activeTheme.bgColor;
      ctx.fillRect(0, 0, width, height);

      const grad = ctx.createRadialGradient(cx, cy, 30, cx, cy, Math.max(width, height) * 0.7);
      grad.addColorStop(0, 'rgba(0, 255, 102, 0.04)');
      grad.addColorStop(0.3, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 1)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = activeTheme.rainColor;
      ctx.lineWidth = 0.5;
      const gridSize = 40;
      ctx.beginPath();
      for (let x = cx % gridSize; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = cy % gridSize; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      if (matrixRainEnabled) {
        ctx.font = '10px Courier New, Courier, monospace';
        rainStreamsRef.current.forEach((stream) => {
          stream.y += stream.speed;
          if (stream.y > height + 50) {
            stream.y = Math.random() * -200;
            stream.speed = 0.8 + Math.random() * 2.5;
          }

          stream.chars.forEach((char, index) => {
            const charY = stream.y - index * 14;
            if (charY > 0 && charY < height) {
              const op = stream.opacity * (1 - index / stream.chars.length);
              ctx.fillStyle = activeTheme.rainColor.replace(/[\d.]+\)$/, `${op * 0.4})`);
              ctx.fillText(char, stream.x, charY);
            }
          });
        });
      }

      const currentFood = [...foodChipsRef.current];
      const activeFood = currentFood.filter(chip => !chip.eaten && chip.y < height + 20);

      activeFood.forEach(chip => {
        chip.y += chip.speed * 0.4;
        chip.rotation += 0.01;
        
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = activeTheme.accentColor;
        ctx.translate(chip.x, chip.y);
        ctx.rotate(chip.rotation);
        
        ctx.strokeStyle = activeTheme.accentColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(chip.value, 0, 0);
        ctx.restore();
      });

      const logoPulse = Math.sin(state.time * 2) * 2.5;
      const hx = cx;
      const hy = cy + 45;
      const R = 23 + logoPulse * 0.12;
      const r_cos30 = R * 0.866;

      ctx.save();
      ctx.shadowBlur = 15 + logoPulse * 1.5;
      ctx.shadowColor = activeTheme.logoColor;
      ctx.strokeStyle = activeTheme.logoColor;
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(hx, hy - R);
      ctx.lineTo(hx + r_cos30, hy - R/2);
      ctx.lineTo(hx + r_cos30 + 10, hy - R/2);
      ctx.lineTo(hx + r_cos30 + 10, hy - R/5);
      ctx.lineTo(hx + r_cos30, hy - R/5);
      ctx.lineTo(hx + r_cos30, hy + R/5);
      ctx.lineTo(hx + r_cos30 + 10, hy + R/5);
      ctx.lineTo(hx + r_cos30 + 10, hy + R/2);
      ctx.lineTo(hx + r_cos30, hy + R/2);
      ctx.lineTo(hx, hy + R);
      ctx.lineTo(hx - r_cos30, hy + R/2);
      ctx.lineTo(hx - r_cos30, hy - R/2);
      ctx.closePath();
      ctx.stroke();

      const innerR = R - 8;
      const inner_r_cos30 = innerR * 0.866;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(hx, hy - innerR);
      ctx.lineTo(hx + inner_r_cos30, hy - innerR / 2);
      ctx.lineTo(hx + inner_r_cos30, hy + innerR / 2);
      ctx.lineTo(hx, hy + innerR);
      ctx.lineTo(hx - inner_r_cos30, hy + innerR / 2);
      ctx.lineTo(hx - inner_r_cos30, hy - innerR / 2);
      ctx.closePath();
      ctx.stroke();

      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx, hy - R);
      ctx.lineTo(cx, cy - 10);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx - 52, cy - 62);
      ctx.lineTo(cx - 52, cy - 95);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx + 52, cy - 62);
      ctx.lineTo(cx + 52, cy - 95);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + 20, cy - 30);
      ctx.lineTo(cx + 20, cy - 65);
      ctx.stroke();

      const drawNode = (nx: number, ny: number) => {
        ctx.beginPath();
        ctx.arc(nx, ny, 10, 0, Math.PI * 2);
        ctx.fillStyle = activeTheme.bgColor;
        ctx.fill();
        ctx.stroke();
      };

      drawNode(cx - 52, cy - 106);
      drawNode(cx + 20, cy - 76);
      drawNode(cx + 52, cy - 106);

      ctx.restore();

      let targetX = cx;
      let targetY = cy;
      let targetFound = false;

      if (interactiveFeeding && activeFood.length > 0) {
        let nearestChip = activeFood[0];
        let minDist = Math.hypot(nearestChip.x - state.axolotlX, nearestChip.y - state.axolotlY);
        
        activeFood.forEach(chip => {
          const dist = Math.hypot(chip.x - state.axolotlX, chip.y - state.axolotlY);
          if (dist < minDist) {
            minDist = dist;
            nearestChip = chip;
          }
        });

        targetX = nearestChip.x;
        targetY = nearestChip.y;
        targetFound = true;

        if (minDist < 25) {
          const eatenId = nearestChip.id;
          setFoodChips(prev => prev.map(chip => chip.id === eatenId ? { ...chip, eaten: true } : chip));

          state.cheeksJoyLevel = 1.0;
          state.currentJoyDuration = 25;

          for (let p = 0; p < 22; p++) {
            const scatterAngle = Math.random() * Math.PI * 2;
            const velocityScatter = 2.0 + Math.random() * 4.5;
            particlesRef.current.push({
              x: state.axolotlX,
              y: state.axolotlY,
              vx: Math.cos(scatterAngle) * velocityScatter,
              vy: Math.sin(scatterAngle) * velocityScatter,
              char: Math.random() > 0.5 ? '1' : '0',
              color: activeTheme.accentColor,
              life: 1.0,
              size: 10 + Math.random() * 8
            });
          }
        }
      }

      if (targetFound) {
        const dx = targetX - state.axolotlX;
        const dy = targetY - state.axolotlY;
        const targetAngle = Math.atan2(dy, dx);
        
        const swimSpeed = 4.8 * (orbitSpeed + 0.3);
        state.axolotlX += Math.cos(targetAngle) * swimSpeed;
        state.axolotlY += Math.sin(targetAngle) * swimSpeed;

        const lookAngle = targetAngle + Math.PI / 2;
        const rDiff = lookAngle - state.axolotlRotation;
        state.axolotlRotation += Math.sin(rDiff) * 0.2;
      } else {
        if (isOrbiting) {
          state.orbitAngle += 0.015 * orbitSpeed;
        }
        
        const defaultAx = cx + orbitRadius * Math.cos(state.orbitAngle);
        const defaultAy = cy + orbitRadius * Math.sin(state.orbitAngle);

        state.axolotlX += (defaultAx - state.axolotlX) * 0.12;
        state.axolotlY += (defaultAy - state.axolotlY) * 0.12;

        if (alignmentMode === 'inward') {
          const lookCenterAngle = Math.atan2(cy - state.axolotlY, cx - state.axolotlX);
          state.axolotlRotation = lookCenterAngle + Math.PI / 2;
        } else {
          state.axolotlRotation = state.orbitAngle + Math.PI;
        }
      }

      if (state.cheeksJoyLevel > 0) {
        state.currentJoyDuration--;
        if (state.currentJoyDuration <= 0) {
          state.cheeksJoyLevel -= 0.05;
        }
      }

      offCtx.clearRect(0, 0, 110, 110);
      const ow = 110;
      const oh = 110;
      const ox = ow / 2;
      const oy = oh / 2 - 5;

      const swimSwing = Math.sin(state.time * (10 + wiggleIntensity * 2)) * wiggleIntensity;
      const internalBreathe = Math.sin(state.time * 2.5) * 1.5;

      offCtx.beginPath();
      offCtx.moveTo(ox, oy + 12);
      const tailX1 = ox + swimSwing * 2;
      const tailY1 = oy + 26;
      const tailX2 = ox + swimSwing * 5;
      const tailY2 = oy + 44;
      const tailX3 = ox + swimSwing * 9;
      const tailY3 = oy + 60;

      offCtx.lineTo(ox - 15, oy + 25);
      offCtx.quadraticCurveTo(tailX1 - 10, tailY1, tailX2 - 4, tailY2);
      offCtx.lineTo(tailX3, tailY3);
      offCtx.lineTo(tailX2 + 4, tailY2);
      offCtx.quadraticCurveTo(tailX1 + 10, tailY1, ox + 15, oy + 25);
      offCtx.closePath();
      offCtx.fillStyle = '#ffffff';
      offCtx.fill();

      offCtx.beginPath();
      offCtx.moveTo(tailX1, tailY1 + 4);
      offCtx.bezierCurveTo(tailX2 - 13, tailY2 + 5, tailX3 - 10, tailY3 + 4, tailX3, tailY3);
      offCtx.bezierCurveTo(tailX3 + 10, tailY3 + 4, tailX2 + 13, tailY2 + 5, tailX1, tailY1 + 4);
      offCtx.fillStyle = '#0000ff';
      offCtx.fill();

      offCtx.strokeStyle = '#ffffff';
      offCtx.lineWidth = 4;
      offCtx.lineCap = 'round';
      
      offCtx.beginPath();
      offCtx.moveTo(ox - 14, oy + 18);
      offCtx.quadraticCurveTo(ox - 24, oy + 24, ox - 26 + swimSwing * 0.4, oy + 18);
      offCtx.stroke();

      offCtx.beginPath();
      offCtx.moveTo(ox + 14, oy + 18);
      offCtx.quadraticCurveTo(ox + 24, oy + 24, ox + 26 + swimSwing * 0.4, oy + 18);
      offCtx.stroke();

      offCtx.beginPath();
      offCtx.ellipse(ox, oy, 25 + internalBreathe * 0.2, 19, 0, 0, Math.PI * 2);
      offCtx.fillStyle = '#ffffff';
      offCtx.fill();

      for (let leftRight = 0; leftRight < 2; leftRight++) {
        const isRight = leftRight === 1;
        const scaleDir = isRight ? 1 : -1;
        const gStart = isRight ? ox + 23 : ox - 23;

        for (let gIdx = 0; gIdx < 3; gIdx++) {
          const gY = oy + (gIdx - 1) * 6;
          const baseAngle = isRight ? (gIdx - 1) * 0.35 : Math.PI - (gIdx - 1) * 0.35;
          const angleWobble = swimSwing * 0.08 * (3 - gIdx) + (isRight ? internalBreathe * 0.02 : -internalBreathe * 0.02);
          const finalAngle = baseAngle + angleWobble;
          
          const gLength = 17 + internalBreathe * 0.4 + (gIdx === 1 ? 3 : 0);
          const gEndValX = gStart + Math.cos(finalAngle) * gLength;
          const gEndValY = gY + Math.sin(finalAngle) * gLength;
          
          const gCpX = gStart + Math.cos(finalAngle - scaleDir * 0.3) * (gLength * 0.55);
          const gCpY = gY + Math.sin(finalAngle - scaleDir * 0.3) * (gLength * 0.55);

          offCtx.beginPath();
          offCtx.moveTo(gStart, gY);
          offCtx.quadraticCurveTo(gCpX, gCpY, gEndValX, gEndValY);
          offCtx.lineWidth = 4.5;
          offCtx.strokeStyle = '#ff0000';
          offCtx.stroke();

          offCtx.fillStyle = '#ff0000';
          for (let fIdx = 1; fIdx <= 3; fIdx++) {
            const t = fIdx / 3;
            const x = (1-t)*(1-t)*gStart + 2*(1-t)*t*gCpX + t*t*gEndValX;
            const y = (1-t)*(1-t)*gY + 2*(1-t)*t*gCpY + t*t*gEndValY;
            offCtx.beginPath();
            const perpAngle = finalAngle + scaleDir * Math.PI / 2 + Math.sin(state.time * 12 + fIdx) * 0.2;
            offCtx.arc(x + Math.cos(perpAngle) * 2.5, y + Math.sin(perpAngle) * 2.5, 3.2, 0, Math.PI * 2);
            offCtx.fill();
          }
        }
      }

      const cheeksVal = state.cheeksJoyLevel;
      if (cheeksVal > 0.05) {
        offCtx.fillStyle = '#00ff00';
        offCtx.beginPath();
        offCtx.arc(ox - 14, oy + 5, 4.5 * cheeksVal, 0, Math.PI * 2);
        offCtx.arc(ox + 14, oy + 5, 4.5 * cheeksVal, 0, Math.PI * 2);
        offCtx.fill();
      }

      offCtx.fillStyle = '#000000';
      offCtx.strokeStyle = '#000000';
      offCtx.beginPath();
      offCtx.arc(ox - 10, oy - 1, 3.2, 0, Math.PI * 2);
      offCtx.arc(ox + 10, oy - 1, 3.2, 0, Math.PI * 2);
      offCtx.fill();

      offCtx.strokeStyle = '#000000';
      offCtx.lineWidth = 1.6;
      offCtx.beginPath();
      offCtx.arc(ox, oy + 1.5, 3.5, 0.1, Math.PI - 0.1, false);
      offCtx.stroke();

      const widthSample = offscreen.width;
      const heightSample = offscreen.height;
      const imgData = offCtx.getImageData(0, 0, widthSample, heightSample);

      const cols = asciiResolution;
      const rows = asciiResolution;
      const stepX = widthSample / cols;
      const stepY = heightSample / rows;

      ctx.save();
      ctx.shadowBlur = glowIntensity;
      ctx.shadowColor = activeTheme.glowColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const fontPixelSize = Math.max(7, Math.floor(180 / cols * 1.5));
      ctx.font = `bold ${fontPixelSize}px JetBrains Mono, monospace`;

      const rotateAngle = state.axolotlRotation;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const sampleX = Math.floor(c * stepX + stepX / 2);
          const sampleY = Math.floor(r * stepY + stepY / 2);

          const pixelIndex = (sampleY * widthSample + sampleX) * 4;
          const a = imgData.data[pixelIndex + 3];

          if (a < 25) continue;

          const red = imgData.data[pixelIndex];
          const green = imgData.data[pixelIndex + 1];
          const blue = imgData.data[pixelIndex + 2];

          const isGillsRed = red > 120 && green < 50 && blue < 50;
          const isFinsBlue = blue > 120 && red < 50 && green < 50;
          const isCheeksGreen = green > 150 && red < 100 && blue < 100;
          const isBodyWhite = red > 140 && green > 140 && blue > 140;

          let selectedChar = '=';
          let customColor = activeTheme.accentColor;

          if (isGillsRed) {
            const symbols = ['~', '{', '}', '*', 'v', '^', '(', ')'];
            selectedChar = symbols[(r + c) % symbols.length];
            customColor = activeTheme.glowAccent;
          } else if (isFinsBlue) {
            const symbols = ['=', '-', '`', '\u00b4', '\u00b0', '~'];
            selectedChar = symbols[(r + c) % symbols.length];
            customColor = activeTheme.accentColor;
          } else if (isCheeksGreen) {
            selectedChar = 'O';
            customColor = '#ffffff';
          } else if (isBodyWhite) {
            const symbols = ['#', '@', '%', 'W', 'M', 'H', '8', 'X'];
            selectedChar = symbols[(r + c) % symbols.length];
            customColor = activeTheme.accentColor;
          }

          const lx = (c - cols / 2) * (fontPixelSize * 0.72);
          const ly = (r - rows / 2) * (fontPixelSize * 0.72);

          const rx = lx * Math.cos(rotateAngle) - ly * Math.sin(rotateAngle);
          const ry = lx * Math.sin(rotateAngle) + ly * Math.cos(rotateAngle);

          const canvasX = state.axolotlX + rx;
          const canvasY = state.axolotlY + ry;

          ctx.save();
          ctx.fillStyle = customColor;
          
          if (rotateGlyphsWithBody) {
            ctx.translate(canvasX, canvasY);
            ctx.rotate(rotateAngle);
            ctx.fillText(selectedChar, 0, 0);
          } else {
            ctx.fillText(selectedChar, canvasX, canvasY);
          }
          ctx.restore();
        }
      }
      ctx.restore();

      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04;
        p.life -= 0.015;
        
        ctx.fillStyle = p.color;
        ctx.font = `${p.size * p.life}px JetBrains Mono, monospace`;
        ctx.fillText(p.char, p.x, p.y);
      });
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      if (scanlinesEnabled) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
        for (let y = 0; y < height; y += 4) {
          ctx.fillRect(0, y, width, 1.8);
        }
      }

      const vignette = ctx.createRadialGradient(cx, cy, Math.max(width, height) * 0.42, cx, cy, Math.max(width, height) * 0.75);
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.92)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      frameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => cancelAnimationFrame(frameId);
  }, [
    activeThemeId,
    activeTheme,
    orbitRadius,
    orbitSpeed,
    asciiResolution,
    wiggleIntensity,
    glowIntensity,
    isOrbiting,
    rotateGlyphsWithBody,
    matrixRainEnabled,
    scanlinesEnabled,
    alignmentMode,
    interactiveFeeding
  ]);

  const clearCanvasFoods = () => {
    setFoodChips([]);
    particlesRef.current = [];
  };

  return (
    <div 
      className="relative w-full h-screen overflow-hidden flex flex-col md:flex-row select-none"
      style={{ backgroundColor: activeTheme.bgColor }}
      id="root-container"
    >
      <div className="absolute top-6 left-6 pointer-events-none font-mono text-[10px] space-y-1 z-10 opacity-30 tracking-widest text-[#ffffff] select-none uppercase hidden sm:block">
        <div>CORE OS [ONLINE]</div>
        <div>AXOLOTL COORD: T-{animationStateRef.current.orbitAngle.toFixed(3)}</div>
        <div>GRID SHADER COMPILING</div>
      </div>

      <div className="flex-1 relative w-full h-full flex items-center justify-center">
        <canvas 
          id="main-scrolling-canvas"
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="w-full h-full cursor-crosshair block"
        />

        {interactiveFeeding && foodChips.filter(c => !c.eaten).length === 0 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none text-center bg-black/40 backdrop-blur-md border border-zinc-800/50 px-4 py-2.5 rounded-md max-w-sm">
            <p className="font-mono text-xs tracking-wider text-zinc-400 select-none flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>KLIK DI MANA SAJA UNTUK MENJATUHKAN DIGITAL CODES</span>
            </p>
          </div>
        )}
      </div>

      <div 
        id="side-telemetry-drawer"
        className={`absolute md:relative top-0 right-0 h-full w-full md:w-80 backdrop-blur-xl border-l border-zinc-800/80 transition-all duration-300 transform md:transform-none z-20 flex flex-col bg-zinc-950/80 ${
          showSettings ? 'translate-x-0' : 'translate-x-[calc(100%-48px)] md:w-12'
        }`}
      >
        <div className="flex items-center justify-between p-4 h-14 border-b border-zinc-800/60 shrink-0">
          <div className="flex items-center gap-2 text-zinc-200 font-mono text-xs font-semibold tracking-wider">
            <SlidersHorizontal className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className={showSettings ? 'inline' : 'hidden'}>CONSOLE CONFIGS</span>
          </div>
          <button 
            id="toggle-telemetry-panel"
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 px-2.5 hover:bg-zinc-800/60 border border-zinc-850 rounded-md font-mono text-xs text-zinc-400 transition-colors uppercase cursor-pointer"
          >
            {showSettings ? 'collapse' : 'expand'}
          </button>
        </div>

        <div className={`flex-1 overflow-y-auto p-5 space-y-6 font-mono ${showSettings ? 'block' : 'hidden'}`}>
          <div className="space-y-2">
            <label className="text-[10px] tracking-wider text-zinc-500 font-bold uppercase block">Color Palette Terminal</label>
            <div className="grid grid-cols-2 gap-2" id="grid-theme-selectors">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  id={`theme-btn-${t.id}`}
                  onClick={() => setActiveThemeId(t.id)}
                  className={`flex items-center gap-2 p-2.5 border rounded-md text-left transition-all duration-200 cursor-pointer text-xs ${
                    activeThemeId === t.id 
                    ? 'border-zinc-400 bg-zinc-900/60 text-zinc-100' 
                    : 'border-zinc-800/80 bg-zinc-950 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0 animate-ping" style={{ backgroundColor: t.accentColor }} />
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] tracking-wider text-zinc-500 font-bold uppercase">Mascot Swim Engine</span>
              <button
                id="toggle-simulation-status"
                onClick={() => setIsOrbiting(!isOrbiting)}
                className={`p-1.5 px-3 rounded-md text-[10px] uppercase font-bold border transition-colors cursor-pointer ${
                  isOrbiting 
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40' 
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800'
                }`}
              >
                {isOrbiting ? 'Swimming' : 'Stalled'}
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Circulation Speed</span>
                <span className="text-emerald-400 font-bold">{orbitSpeed.toFixed(1)}x</span>
              </div>
              <input
                id="slider-orbit-speed"
                type="range"
                min="0.2"
                max="2.5"
                step="0.1"
                value={orbitSpeed}
                onChange={(e) => setOrbitSpeed(parseFloat(e.target.value))}
                className="w-full accent-emerald-400 h-1 bg-zinc-800 rounded-lg appearance-none cursor-ew-resize"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Orbit Radius</span>
                <span className="text-emerald-400 font-bold">{orbitRadius}px</span>
              </div>
              <input
                id="slider-orbit-radius"
                type="range"
                min="90"
                max="280"
                step="5"
                value={orbitRadius}
                onChange={(e) => setOrbitRadius(parseInt(e.target.value))}
                className="w-full accent-emerald-400 h-1 bg-zinc-800 rounded-lg appearance-none cursor-ew-resize"
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <span className="text-[10px] tracking-wider text-zinc-500 font-bold uppercase block">ASCII Hardware Layout</span>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Grid Core Resolution</span>
                <span className="text-emerald-400 font-bold">{asciiResolution}x{asciiResolution}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5" id="resolution-selector-group">
                {[32, 44, 56].map((res) => (
                  <button
                    key={res}
                    id={`res-btn-${res}`}
                    onClick={() => setAsciiResolution(res)}
                    className={`p-1.5 border rounded-md text-center transition-all duration-200 cursor-pointer text-[10px] uppercase font-bold ${
                      asciiResolution === res 
                      ? 'border-zinc-400 bg-zinc-900 text-zinc-100' 
                      : 'border-zinc-850 bg-zinc-950 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {res === 32 ? 'Low' : res === 44 ? 'Medium' : 'High'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Neon Glow Size</span>
                <span className="text-emerald-400 font-bold">{glowIntensity}px</span>
              </div>
              <input
                id="slider-glow-size"
                type="range"
                min="0"
                max="16"
                step="1"
                value={glowIntensity}
                onChange={(e) => setGlowIntensity(parseInt(e.target.value))}
                className="w-full accent-emerald-400 h-1 bg-zinc-800 rounded-lg appearance-none cursor-ew-resize"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Wiggle Flutter</span>
                <span className="text-emerald-400 font-bold">{wiggleIntensity.toFixed(1)}</span>
              </div>
              <input
                id="slider-wiggle-intensity"
                type="range"
                min="0.2"
                max="2.5"
                step="0.1"
                value={wiggleIntensity}
                onChange={(e) => setWiggleIntensity(parseFloat(e.target.value))}
                className="w-full accent-emerald-400 h-1 bg-zinc-800 rounded-lg appearance-none cursor-ew-resize"
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <span className="text-[10px] tracking-wider text-zinc-500 font-bold uppercase block">Orientation Controls</span>
            
            <div className="space-y-1">
              <span className="text-xs text-zinc-400 block mb-1">Mascot Face Heading</span>
              <div className="grid grid-cols-2 gap-1.5" id="alignment-selector-group">
                <button
                  id="heading-inward-btn"
                  onClick={() => setAlignmentMode('inward')}
                  className={`p-1.5 border rounded-md text-center transition-all duration-200 cursor-pointer text-[10px] font-bold uppercase ${
                    alignmentMode === 'inward' 
                    ? 'border-zinc-400 bg-zinc-900 text-zinc-100' 
                    : 'border-zinc-850 bg-zinc-950 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Lock Inward
                </button>
                <button
                  id="heading-tangent-btn"
                  onClick={() => setAlignmentMode('tangent')}
                  className={`p-1.5 border rounded-md text-center transition-all duration-200 cursor-pointer text-[10px] font-bold uppercase ${
                    alignmentMode === 'tangent' 
                    ? 'border-zinc-400 bg-zinc-900 text-zinc-100' 
                    : 'border-zinc-850 bg-zinc-950 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Forward Swim
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-zinc-900">
            <span className="text-[10px] tracking-wider text-zinc-500 font-bold uppercase block">Hardware Filters</span>
            
            <button
              id="btn-toggle-matrix-rain"
              onClick={() => setMatrixRainEnabled(!matrixRainEnabled)}
              className="flex items-center justify-between w-full text-left p-2 border border-zinc-900 bg-zinc-950 hover:bg-zinc-900/40 rounded-md transition-colors cursor-pointer text-xs"
            >
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" style={{ color: activeTheme.accentColor }} />
                <span>Ambient Matrix Rain</span>
              </span>
              <span className={matrixRainEnabled ? 'text-emerald-400 font-bold' : 'text-zinc-600'}>
                {matrixRainEnabled ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              id="btn-toggle-scanlines"
              onClick={() => setScanlinesEnabled(!scanlinesEnabled)}
              className="flex items-center justify-between w-full text-left p-2 border border-zinc-900 bg-zinc-950 hover:bg-zinc-900/40 rounded-md transition-colors cursor-pointer text-xs"
            >
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" style={{ color: activeTheme.accentColor }} />
                <span>CRT Scanlines</span>
              </span>
              <span className={scanlinesEnabled ? 'text-emerald-400 font-bold' : 'text-zinc-600'}>
                {scanlinesEnabled ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>

          {foodChips.length > 0 && (
            <button
              id="btn-flush-particles"
              onClick={clearCanvasFoods}
              className="flex items-center justify-center gap-2 w-full p-2.5 bg-red-950/20 hover:bg-red-900/30 border border-red-900/30 text-red-400 rounded-md transition-all text-xs cursor-pointer font-bold uppercase tracking-wider"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>Flush Binary Food ({foodChips.length})</span>
            </button>
          )}

        </div>

        <div className={`p-4 border-t border-zinc-900 bg-zinc-950/90 text-[10px] text-zinc-500 font-mono space-y-1.5 shrink-0 ${showSettings ? 'block' : 'hidden'}`}>
          <div className="flex items-center gap-1 text-zinc-400 uppercase font-bold tracking-wider mb-1">
            <Info className="w-3 h-3 text-emerald-500" />
            <span>Telemetry Diagnostics</span>
          </div>
          <p className="leading-relaxed">
            Mascot axolotl mendeteksi node sirkuit Gitlab di bagian tengah. Klik layar kosong untuk memicu koordinat makanannya secara bertahap.
          </p>
        </div>
      </div>
    </div>
  );
}
