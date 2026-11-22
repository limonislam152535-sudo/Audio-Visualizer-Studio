import { AudioAnalysisFrame, VisualizerConfig } from '../types';

export interface RenderContextData {
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  width: number;
  height: number;
  analysis: AudioAnalysisFrame;
  config: VisualizerConfig;
  time: number; // seconds
  isExport?: boolean;
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  let r = 56;
  let g = 189;
  let b = 248;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length >= 6) {
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
  }
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return `rgba(56, 189, 248, ${Math.max(0, Math.min(1, alpha))})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

export function sampleBin(bins: Float32Array, t: number): number {
  if (bins.length === 0) return 0;
  const clamped = Math.max(0, Math.min(0.999, t));
  const fIdx = clamped * (bins.length - 1);
  const i0 = Math.floor(fIdx);
  const i1 = Math.min(bins.length - 1, i0 + 1);
  const frac = fIdx - i0;
  return bins[i0] * (1 - frac) + bins[i1] * frac;
}

export function sampleWave(wave: Float32Array, t: number): number {
  if (wave.length === 0) return 0;
  const clamped = Math.max(0, Math.min(0.999, t));
  const fIdx = clamped * (wave.length - 1);
  const i0 = Math.floor(fIdx);
  const i1 = Math.min(wave.length - 1, i0 + 1);
  const frac = fIdx - i0;
  return wave[i0] * (1 - frac) + wave[i1] * frac;
}

export function drawClosedSmoothCurve(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>
): void {
  const len = points.length;
  if (len < 3) return;
  ctx.beginPath();
  const firstMidX = (points[len - 1].x + points[0].x) * 0.5;
  const firstMidY = (points[len - 1].y + points[0].y) * 0.5;
  ctx.moveTo(firstMidX, firstMidY);
  for (let i = 0; i < len; i++) {
    const curr = points[i];
    const next = points[(i + 1) % len];
    const midX = (curr.x + next.x) * 0.5;
    const midY = (curr.y + next.y) * 0.5;
    ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
  }
  ctx.closePath();
}

export function drawOpenSmoothCurve(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>
): void {
  const len = points.length;
  if (len < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < len - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) * 0.5;
    const midY = (points[i].y + points[i + 1].y) * 0.5;
    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
  }
  ctx.lineTo(points[len - 1].x, points[len - 1].y);
}

export function project3D(
  x: number,
  y: number,
  z: number,
  rotX: number,
  rotY: number,
  cx: number,
  cy: number,
  fov: number
): { sx: number; sy: number; scale: number; depth: number } {
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const x1 = x * cosY - z * sinY;
  const z1 = x * sinY + z * cosY;

  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const y2 = y * cosX - z1 * sinX;
  const z2 = y * sinX + z1 * cosX;

  const dist = Math.max(fov * 0.25, fov + z2);
  const scale = fov / dist;
  return {
    sx: cx + x1 * scale,
    sy: cy + y2 * scale,
    scale,
    depth: z2,
  };
}

export function applyGlow(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  color: string,
  glowIntensity: number,
  baseRadius: number
): void {
  if (glowIntensity > 0.02) {
    ctx.shadowColor = color;
    ctx.shadowBlur = baseRadius * glowIntensity;
  } else {
    ctx.shadowBlur = 0;
  }
}

export function clearGlow(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
): void {
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
}

export function pseudoRandom(seed: number): number {
  const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}
