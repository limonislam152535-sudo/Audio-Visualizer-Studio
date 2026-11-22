import {
  RenderContextData,
  drawClosedSmoothCurve,
  drawOpenSmoothCurve,
  hexToRgba,
  project3D,
  pseudoRandom,
  sampleBin,
} from './helpers';

export function renderLiquidPlasma(rc: RenderContextData): void {
  const { ctx, width, height, analysis, config, time } = rc;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const minDim = Math.min(width, height);
  const shells = 4;
  const ptsCount = 72;

  for (let s = shells - 1; s >= 0; s--) {
    const baseR = minDim * (0.12 + s * 0.055) * config.size * (1 + analysis.bass * 0.16);
    const amp = minDim * 0.055 * config.waveIntensity * config.size;
    const pts: Array<{ x: number; y: number }> = [];
    const rot = time * config.rotationSpeed * (s % 2 === 0 ? 0.5 : -0.4);

    for (let i = 0; i < ptsCount; i++) {
      const t = i / ptsCount;
      const angle = t * Math.PI * 2 + rot;
      const lobe1 = Math.sin(angle * 3 + time * 1.6 + s) * (0.4 + analysis.bass * 0.9);
      const lobe2 = Math.cos(angle * 5 - time * 2.1 + s * 2) * (0.25 + analysis.mid * 0.7);
      const spec = sampleBin(analysis.frequencyData, ((i + s * 12) % 64) / 64);
      const r = baseR + (lobe1 + lobe2) * amp * 0.5 + spec * amp * 0.8;
      pts.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
      });
    }

    const col =
      s === 0
        ? config.accentColor
        : s === 1
          ? config.primaryColor
          : config.secondaryColor;

    ctx.save();
    drawClosedSmoothCurve(ctx, pts);
    ctx.fillStyle = hexToRgba(col, 0.09 + (shells - s) * 0.03);
    ctx.fill();
    const coreWidth = Math.max(1.4, minDim * (0.0032 - s * 0.0004));
    if (config.glowIntensity > 0.05) {
      ctx.lineWidth = coreWidth * (3.4 + config.glowIntensity);
      ctx.strokeStyle = hexToRgba(col, 0.15 * config.glowIntensity);
      ctx.stroke();
    }
    ctx.lineWidth = coreWidth;
    ctx.strokeStyle = hexToRgba(col, 0.75);
    ctx.stroke();
    ctx.restore();
  }
}

export function renderParticleOrbit(rc: RenderContextData): void {
  const { ctx, width, height, analysis, config, time } = rc;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const minDim = Math.min(width, height);
  const orbits = 5;
  const particlesPerOrbit = Math.round(34 * config.particleDensity);

  ctx.save();
  for (let o = 0; o < orbits; o++) {
    const rx = minDim * (0.14 + o * 0.058) * config.size * (1 + analysis.bass * 0.12);
    const ry = rx * (0.42 + (o % 2) * 0.18);
    const tilt = (o * Math.PI) / orbits + time * config.rotationSpeed * 0.2;

    // Orbital ring path
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt);
    ctx.strokeStyle = hexToRgba(config.secondaryColor, 0.18 + analysis.energy * 0.25);
    ctx.lineWidth = Math.max(1, minDim * 0.0016);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    for (let p = 0; p < particlesPerOrbit; p++) {
      const bin = sampleBin(analysis.frequencyData, ((o * 17 + p) % 64) / 64);
      const speed = (0.5 + o * 0.18) * (config.rotationSpeed >= 0 ? 1 : -1) * (0.6 + Math.abs(config.rotationSpeed));
      const angle = (p / particlesPerOrbit) * Math.PI * 2 + time * speed;
      const radialBoost = 1 + bin * 0.18 * config.waveIntensity;
      const px = Math.cos(angle) * rx * radialBoost;
      const py = Math.sin(angle) * ry * radialBoost;
      const dotR = Math.max(1.4, minDim * 0.0038 * (0.65 + bin * 1.4) * config.size);
      const col = p % 4 === 0 ? config.accentColor : o % 2 === 0 ? config.primaryColor : config.secondaryColor;

      const baseA = 0.55 + bin * 0.45;
      if (config.glowIntensity > 0.08) {
        ctx.fillStyle = hexToRgba(col, baseA * 0.22 * config.glowIntensity);
        ctx.beginPath();
        ctx.arc(px, py, dotR * 2.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = hexToRgba(col, baseA);
      ctx.beginPath();
      ctx.arc(px, py, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

export function renderAudioTunnel(rc: RenderContextData): void {
  const { ctx, width, height, analysis, config, time } = rc;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const minDim = Math.min(width, height);
  const depthCount = 14;
  const sides = 12;
  const travel = (time * (0.55 + Math.abs(config.rotationSpeed) * 0.5 + analysis.bass * 0.65)) % 1;

  ctx.save();
  for (let d = depthCount - 1; d >= 0; d--) {
    const zNorm = (d + travel) / depthCount; // 0 (far) to 1 (near)
    const persp = Math.pow(zNorm, 1.85);
    const radius = minDim * 0.52 * config.size * persp;
    if (radius < 4) continue;

    const rot = time * config.rotationSpeed * 0.4 + d * 0.12;
    const bin = sampleBin(analysis.frequencyData, (1 - zNorm) * 0.8);
    const col = d % 2 === 0 ? config.primaryColor : config.secondaryColor;

    ctx.strokeStyle = hexToRgba(
      bin > 0.6 ? config.accentColor : col,
      Math.min(0.95, zNorm * (0.4 + bin * 0.6))
    );
    ctx.lineWidth = Math.max(1, minDim * 0.004 * zNorm);

    ctx.beginPath();
    for (let s = 0; s <= sides; s++) {
      const a = (s / sides) * Math.PI * 2 + rot;
      const localBin = sampleBin(analysis.frequencyData, ((s % sides) / sides) * 0.7);
      const rMod = radius * (1 + localBin * 0.25 * config.waveIntensity);
      const x = cx + Math.cos(a) * rMod;
      const y = cy + Math.sin(a) * rMod;
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

export function render3DFrequencyBars(rc: RenderContextData): void {
  const { ctx, width, height, analysis, config, time } = rc;
  const cx = width * 0.5;
  const cy = height * 0.56;
  const minDim = Math.min(width, height);
  const cols = 16;
  const rows = 4;
  const maxBarH = minDim * 0.24 * config.waveIntensity * config.size;
  const tileW = (minDim * 0.66 * config.size) / cols;
  const tileD = minDim * 0.045 * config.size;

  ctx.save();
  for (let r = rows - 1; r >= 0; r--) {
    for (let c = 0; c < cols; c++) {
      const binIdx = (c / cols) * 0.75 + (r / rows) * 0.2;
      const val = sampleBin(analysis.frequencyData, binIdx);
      const waveRipple = Math.sin(c * 0.45 - time * 3 + r) * 0.06;
      const barH = Math.max(minDim * 0.012, (val + Math.max(0, waveRipple)) * maxBarH);

      const xOffset = (c - (cols - 1) * 0.5) * tileW * 1.15;
      const yBase = cy + (rows * 0.5 - r) * tileD * 0.9 - r * minDim * 0.02;
      const x = cx + xOffset + (r - 1.5) * tileW * 0.28;
      const bw = tileW * 0.74;
      const depthDx = tileW * 0.32;
      const depthDy = -tileD * 0.45;

      // Front face
      const frontGrad = ctx.createLinearGradient(x, yBase - barH, x, yBase);
      frontGrad.addColorStop(0, hexToRgba(config.primaryColor, 0.92));
      frontGrad.addColorStop(1, hexToRgba(config.secondaryColor, 0.75));
      ctx.fillStyle = frontGrad;
      ctx.fillRect(x, yBase - barH, bw, barH);

      // Top face
      ctx.fillStyle = hexToRgba(config.accentColor, 0.85);
      ctx.beginPath();
      ctx.moveTo(x, yBase - barH);
      ctx.lineTo(x + depthDx, yBase - barH + depthDy);
      ctx.lineTo(x + bw + depthDx, yBase - barH + depthDy);
      ctx.lineTo(x + bw, yBase - barH);
      ctx.closePath();
      ctx.fill();

      // Right side face
      ctx.fillStyle = hexToRgba(config.secondaryColor, 0.65);
      ctx.beginPath();
      ctx.moveTo(x + bw, yBase - barH);
      ctx.lineTo(x + bw + depthDx, yBase - barH + depthDy);
      ctx.lineTo(x + bw + depthDx, yBase + depthDy);
      ctx.lineTo(x + bw, yBase);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

export function renderAuroraWave(rc: RenderContextData): void {
  const { ctx, width, height, analysis, config, time } = rc;
  const minDim = Math.min(width, height);
  const curtains = 4;
  const steps = 64;

  ctx.save();
  for (let c = 0; c < curtains; c++) {
    const baseY = height * (0.42 + c * 0.07);
    const curtainH = height * (0.28 + analysis.energy * 0.16) * config.size;
    const pts: Array<{ x: number; y: number }> = [];
    const col = c % 2 === 0 ? config.primaryColor : config.secondaryColor;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = t * width;
      const spec = sampleBin(analysis.frequencyData, t * 0.75);
      const sway =
        Math.sin(t * Math.PI * (2.5 + c * 0.7) + time * (0.9 + c * 0.25)) *
          height *
          0.08 *
          config.waveIntensity +
        Math.cos(t * Math.PI * 5 - time * 1.4) * spec * height * 0.12 * config.waveIntensity;
      pts.push({ x, y: baseY + sway });
    }

    // Vertical aurora ribbon
    const grad = ctx.createLinearGradient(0, baseY - curtainH, 0, baseY + curtainH * 0.4);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.45, hexToRgba(col, 0.22 + analysis.mid * 0.22));
    grad.addColorStop(0.85, hexToRgba(config.accentColor, 0.35 + analysis.treble * 0.25));
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    for (let i = pts.length - 1; i >= 0; i--) {
      const spec = sampleBin(analysis.frequencyData, (i / steps) * 0.75);
      ctx.lineTo(pts[i].x, pts[i].y - curtainH * (0.4 + spec * 0.8));
    }
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    drawOpenSmoothCurve(ctx, pts);
    const coreWidth = Math.max(1.2, minDim * 0.0024);
    if (config.glowIntensity > 0.05) {
      ctx.lineWidth = coreWidth * (3.2 + config.glowIntensity);
      ctx.strokeStyle = hexToRgba(col, 0.15 * config.glowIntensity);
      ctx.stroke();
    }
    ctx.strokeStyle = hexToRgba(config.accentColor, 0.55 + analysis.energy * 0.35);
    ctx.lineWidth = coreWidth;
    ctx.stroke();
  }
  ctx.restore();
}

export function renderNeonPulseCircle(rc: RenderContextData): void {
  const { ctx, width, height, analysis, config, time } = rc;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const minDim = Math.min(width, height);
  const r = minDim * 0.24 * config.size * (1 + analysis.bass * 0.22 * config.waveIntensity);

  ctx.save();
  // Outer atmospheric halo
  const halo = ctx.createRadialGradient(cx, cy, r * 0.65, cx, cy, r * 1.45);
  halo.addColorStop(0, 'rgba(0,0,0,0)');
  halo.addColorStop(0.55, hexToRgba(config.primaryColor, 0.16 + analysis.energy * 0.22));
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.45, 0, Math.PI * 2);
  ctx.fill();

  // Main luminous torus
  const coreWidth = Math.max(4, minDim * (0.014 + analysis.bass * 0.01));
  if (config.glowIntensity > 0.05) {
    ctx.strokeStyle = hexToRgba(config.primaryColor, 0.14 * config.glowIntensity);
    ctx.lineWidth = coreWidth * (3.2 + config.glowIntensity);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = hexToRgba(config.primaryColor, 0.28 * config.glowIntensity);
    ctx.lineWidth = coreWidth * 1.9;
    ctx.stroke();
  }
  ctx.strokeStyle = config.primaryColor;
  ctx.lineWidth = coreWidth;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Traveling phase-locked highlight arcs
  const arcRot = time * config.rotationSpeed * 1.5;
  for (let a = 0; a < 3; a++) {
    const start = arcRot + (a * Math.PI * 2) / 3;
    const span = Math.PI * (0.28 + analysis.treble * 0.22);
    ctx.strokeStyle = a === 0 ? config.accentColor : config.secondaryColor;
    ctx.lineWidth = Math.max(2, minDim * 0.006);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r * (1 + (a - 1) * 0.07), start, start + span);
    ctx.stroke();
  }
  ctx.restore();
}

export function renderDynamicSoundRing(rc: RenderContextData): void {
  const { ctx, width, height, analysis, config, time } = rc;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const minDim = Math.min(width, height);
  const rings = 7;

  ctx.save();
  for (let i = 0; i < rings; i++) {
    const bandVal = sampleBin(analysis.frequencyData, (i / rings) * 0.8);
    const r =
      minDim * (0.09 + i * 0.036) * config.size * (1 + bandVal * 0.18 * config.waveIntensity);
    const segments = 3 + (i % 4);
    const dir = i % 2 === 0 ? 1 : -1;
    const rot = time * config.rotationSpeed * (0.4 + i * 0.14) * dir;
    const col =
      i === rings - 1
        ? config.accentColor
        : i % 2 === 0
          ? config.primaryColor
          : config.secondaryColor;

    ctx.strokeStyle = hexToRgba(col, 0.5 + bandVal * 0.5);
    ctx.lineWidth = Math.max(2, minDim * (0.0045 + bandVal * 0.004));
    ctx.lineCap = 'round';

    const segStep = (Math.PI * 2) / segments;
    const arcLen = segStep * (0.45 + bandVal * 0.3);
    for (let s = 0; s < segments; s++) {
      const a0 = rot + s * segStep;
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0, a0 + arcLen);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function renderDottedSpectrum(rc: RenderContextData): void {
  const { ctx, width, height, analysis, config, time } = rc;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const minDim = Math.min(width, height);
  const totalDots = Math.round(260 * config.particleDensity);
  const maxR = minDim * 0.37 * config.size;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const rot = time * config.rotationSpeed * 0.35;

  ctx.save();
  for (let i = 0; i < totalDots; i++) {
    const norm = i / totalDots;
    const bin = sampleBin(analysis.frequencyData, norm * 0.9);
    const r = Math.sqrt(norm) * maxR * (1 + bin * 0.14 * config.waveIntensity);
    const angle = i * goldenAngle + rot;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    const dotSize = Math.max(1.2, minDim * (0.0022 + bin * 0.0068) * config.size);

    const col =
      bin > 0.62
        ? config.accentColor
        : norm < 0.45
          ? config.primaryColor
          : config.secondaryColor;

    const alpha = 0.35 + bin * 0.65;
    if (config.glowIntensity > 0.08) {
      ctx.fillStyle = hexToRgba(col, alpha * 0.22 * config.glowIntensity);
      ctx.beginPath();
      ctx.arc(x, y, dotSize * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = hexToRgba(col, alpha);
    ctx.beginPath();
    ctx.arc(x, y, dotSize, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function renderEnergyOrb(rc: RenderContextData): void {
  const { ctx, width, height, analysis, config, time } = rc;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const minDim = Math.min(width, height);
  const coreR = minDim * 0.13 * config.size * (1 + analysis.bass * 0.25);

  ctx.save();
  // Volumetric core plasma
  const grad = ctx.createRadialGradient(cx, cy, coreR * 0.1, cx, cy, coreR * 2.1);
  grad.addColorStop(0, hexToRgba(config.accentColor, 0.95));
  grad.addColorStop(0.35, hexToRgba(config.primaryColor, 0.68));
  grad.addColorStop(0.7, hexToRgba(config.secondaryColor, 0.22));
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR * 2.1, 0, Math.PI * 2);
  ctx.fill();

  // Magnetic field streamlines
  const streamCount = Math.round(18 * Math.min(1.5, config.particleDensity));
  for (let s = 0; s < streamCount; s++) {
    const baseAngle = (s / streamCount) * Math.PI * 2 + time * config.rotationSpeed * 0.5;
    const bin = sampleBin(analysis.frequencyData, (s % 16) / 16);
    const pts: Array<{ x: number; y: number }> = [];
    const steps = 16;

    for (let k = 0; k <= steps; k++) {
      const kt = k / steps;
      const r = coreR * 0.7 + kt * minDim * 0.24 * config.size * (0.6 + bin * 0.8 * config.waveIntensity);
      const curl = Math.sin(kt * Math.PI * 2 + time * 2.5 + s) * 0.55 * (1 + analysis.mid);
      const a = baseAngle + curl * kt;
      pts.push({
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r,
      });
    }

    const col = s % 2 === 0 ? config.primaryColor : config.secondaryColor;
    drawOpenSmoothCurve(ctx, pts);
    ctx.strokeStyle = hexToRgba(col, 0.35 + bin * 0.55);
    ctx.lineWidth = Math.max(1.2, minDim * 0.0024);
    ctx.stroke();
  }
  ctx.restore();
}

export function renderAbstractSoundMesh(rc: RenderContextData): void {
  const { ctx, width, height, analysis, config, time } = rc;
  const cx = width * 0.5;
  const cy = height * 0.52;
  const minDim = Math.min(width, height);
  const cols = 14;
  const rows = 10;
  const span = minDim * 0.62 * config.size;
  const fov = minDim * 1.3;
  const rotY = Math.sin(time * 0.35) * 0.32 + time * config.rotationSpeed * 0.25;
  const rotX = 0.72;

  const nodes: Array<Array<{ sx: number; sy: number; energy: number; depth: number }>> = [];

  for (let r = 0; r < rows; r++) {
    const rowArr: Array<{ sx: number; sy: number; energy: number; depth: number }> = [];
    for (let c = 0; c < cols; c++) {
      const nx = (c / (cols - 1) - 0.5) * span;
      const nz = (r / (rows - 1) - 0.5) * span;
      const dist = Math.sqrt(nx * nx + nz * nz) / (span * 0.75);
      const bin = sampleBin(analysis.frequencyData, Math.min(0.95, dist));
      const ny =
        -(bin * minDim * 0.16 * config.waveIntensity +
          Math.sin(nx * 0.018 + time * 2.5) * Math.cos(nz * 0.018 - time * 2) * minDim * 0.025);

      const p = project3D(nx, ny, nz, rotX, rotY, cx, cy, fov);
      rowArr.push({ sx: p.sx, sy: p.sy, energy: bin, depth: p.depth });
    }
    nodes.push(rowArr);
  }

  ctx.save();
  ctx.lineWidth = Math.max(1, minDim * 0.0018);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const n = nodes[r][c];
      const alpha = Math.max(0.18, Math.min(0.92, 0.4 + n.energy * 0.6));
      if (c < cols - 1) {
        const right = nodes[r][c + 1];
        ctx.strokeStyle = hexToRgba(config.primaryColor, alpha);
        ctx.beginPath();
        ctx.moveTo(n.sx, n.sy);
        ctx.lineTo(right.sx, right.sy);
        ctx.stroke();
      }
      if (r < rows - 1) {
        const down = nodes[r + 1][c];
        ctx.strokeStyle = hexToRgba(config.secondaryColor, alpha * 0.9);
        ctx.beginPath();
        ctx.moveTo(n.sx, n.sy);
        ctx.lineTo(down.sx, down.sy);
        ctx.stroke();
      }
      if (r < rows - 1 && c < cols - 1) {
        const diag = nodes[r + 1][c + 1];
        ctx.strokeStyle = hexToRgba(config.primaryColor, alpha * 0.35);
        ctx.beginPath();
        ctx.moveTo(n.sx, n.sy);
        ctx.lineTo(diag.sx, diag.sy);
        ctx.stroke();
      }

      if (n.energy > 0.35 || (r + c) % 2 === 0) {
        ctx.fillStyle = hexToRgba(config.accentColor, alpha);
        ctx.beginPath();
        ctx.arc(n.sx, n.sy, Math.max(1.2, minDim * 0.0028 * (0.7 + n.energy)), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

export { pseudoRandom };
