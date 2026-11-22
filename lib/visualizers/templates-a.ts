import {
  RenderContextData,
  drawClosedSmoothCurve,
  drawOpenSmoothCurve,
  hexToRgba,
  project3D,
  pseudoRandom,
  sampleBin,
  sampleWave,
} from './helpers';

export function renderLiquidWaveRing(rc: RenderContextData): void {
  const { ctx, width, height, analysis, config, time } = rc;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const minDim = Math.min(width, height);
  const baseRadius = minDim * 0.23 * config.size;
  const waveAmp = minDim * 0.075 * config.waveIntensity * config.size;
  const rot = time * config.rotationSpeed * 0.6;

  // Ambient core halo
  const halo = ctx.createRadialGradient(
    cx,
    cy,
    baseRadius * 0.35,
    cx,
    cy,
    baseRadius * (1.8 + analysis.bass * 0.5)
  );
  halo.addColorStop(0, hexToRgba(config.primaryColor, 0.12 + analysis.energy * 0.16));
  halo.addColorStop(0.55, hexToRgba(config.secondaryColor, 0.06 + analysis.mid * 0.08));
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, baseRadius * 2.3, 0, Math.PI * 2);
  ctx.fill();

  const layers = 3;
  const numPts = 96;

  for (let l = 0; l < layers; l++) {
    const pts: Array<{ x: number; y: number }> = [];
    const layerPhase = rot * (l % 2 === 0 ? 1 : -0.75) + l * 1.4;
    const layerOffset = (l - 1) * minDim * 0.012 * config.size;

    for (let i = 0; i < numPts; i++) {
      const t = i / numPts;
      const angle = t * Math.PI * 2 + layerPhase;
      // Symmetric wrap-around spectrum sampling
      const symT = t <= 0.5 ? t * 2 : (1 - t) * 2;
      const spec = sampleBin(analysis.frequencyData, symT * 0.72);
      const harmonic =
        Math.sin(t * Math.PI * 6 + time * (2.2 + l * 0.6)) *
        (0.15 + analysis.mid * 0.45);
      const ripple =
        Math.cos(t * Math.PI * 12 - time * 3.1 + l) * (0.08 + analysis.treble * 0.3);
      const r =
        baseRadius +
        layerOffset +
        analysis.bass * minDim * 0.03 * config.size +
        (spec * 0.85 + harmonic * 0.35 + ripple * 0.25) * waveAmp;
      pts.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
      });
    }

    const strokeColor =
      l === 0
        ? config.secondaryColor
        : l === 1
          ? config.primaryColor
          : config.accentColor;

    ctx.save();
    drawClosedSmoothCurve(ctx, pts);
    ctx.fillStyle = hexToRgba(strokeColor, l === 1 ? 0.09 : 0.045);
    ctx.fill();
    const coreWidth = Math.max(1.5, minDim * (l === 1 ? 0.0045 : 0.0028));
    if (config.glowIntensity > 0.05) {
      ctx.lineWidth = coreWidth * (3.6 + config.glowIntensity * 1.4);
      ctx.strokeStyle = hexToRgba(strokeColor, 0.14 * config.glowIntensity);
      ctx.stroke();
      ctx.lineWidth = coreWidth * 2.0;
      ctx.strokeStyle = hexToRgba(strokeColor, 0.28 * config.glowIntensity);
      ctx.stroke();
    }
    ctx.lineWidth = coreWidth;
    ctx.strokeStyle = hexToRgba(strokeColor, l === 1 ? 0.95 : 0.65);
    ctx.stroke();
    ctx.restore();
  }
}

export function renderParticleSphere(rc: RenderContextData): void {
  const { ctx, width, height, analysis, config, time } = rc;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const minDim = Math.min(width, height);
  const radius = minDim * 0.25 * config.size * (1 + analysis.bass * 0.18);
  const count = Math.round(220 * config.particleDensity);
  const rotY = time * config.rotationSpeed * 0.75;
  const rotX = Math.sin(time * 0.45) * 0.45 + time * config.rotationSpeed * 0.22;
  const fov = minDim * 1.15;

  const projected: Array<{
    sx: number;
    sy: number;
    scale: number;
    depth: number;
    energy: number;
    idx: number;
  }> = [];

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const yNorm = 1 - (i / Math.max(1, count - 1)) * 2;
    const rCircle = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));
    const theta = goldenAngle * i;

    const binVal = sampleBin(analysis.frequencyData, (i % 64) / 64);
    const disp = 1 + binVal * 0.38 * config.waveIntensity;

    const x = Math.cos(theta) * rCircle * radius * disp;
    const y = yNorm * radius * disp;
    const z = Math.sin(theta) * rCircle * radius * disp;

    const p = project3D(x, y, z, rotX, rotY, cx, cy, fov);
    projected.push({
      sx: p.sx,
      sy: p.sy,
      scale: p.scale,
      depth: p.depth,
      energy: binVal,
      idx: i,
    });
  }

  projected.sort((a, b) => b.depth - a.depth);

  ctx.save();
  for (const p of projected) {
    const depthNorm = Math.max(0.15, Math.min(1, (p.scale - 0.55) * 1.4));
    const dotSize =
      Math.max(1.2, minDim * 0.0042 * config.size * p.scale * (0.7 + p.energy * 1.4));
    const color =
      p.energy > 0.55
        ? config.accentColor
        : p.idx % 3 === 0
          ? config.secondaryColor
          : config.primaryColor;
    const baseAlpha = Math.min(1, depthNorm * (0.5 + p.energy * 0.6));

    if (config.glowIntensity > 0.05) {
      ctx.fillStyle = hexToRgba(color, baseAlpha * 0.22 * config.glowIntensity);
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, dotSize * (2.1 + config.glowIntensity), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = hexToRgba(color, baseAlpha);
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, dotSize, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function renderCircularSpectrum(rc: RenderContextData): void {
  const { ctx, width, height, analysis, config, time } = rc;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const minDim = Math.min(width, height);
  const innerR = minDim * 0.19 * config.size * (1 + analysis.bass * 0.1);
  const maxBarLen = minDim * 0.21 * config.waveIntensity * config.size;
  const barCount = Math.max(48, Math.round(88 * Math.min(1.4, config.particleDensity)));
  const rot = time * config.rotationSpeed * 0.35;

  // Inner reference ring
  ctx.save();
  ctx.strokeStyle = hexToRgba(config.primaryColor, 0.35 + analysis.energy * 0.35);
  ctx.lineWidth = Math.max(1.2, minDim * 0.0022);
  ctx.beginPath();
  ctx.arc(cx, cy, innerR * 0.94, 0, Math.PI * 2);
  ctx.stroke();

  const barWidth = Math.max(1.8, ((Math.PI * 2 * innerR) / barCount) * 0.52);

  for (let i = 0; i < barCount; i++) {
    const t = i / barCount;
    const symT = t <= 0.5 ? t * 2 : (1 - t) * 2;
    const val = sampleBin(analysis.frequencyData, symT * 0.85);
    const angle = t * Math.PI * 2 - Math.PI / 2 + rot;
    const len = Math.max(minDim * 0.008, val * maxBarLen);

    const x0 = cx + Math.cos(angle) * innerR;
    const y0 = cy + Math.sin(angle) * innerR;
    const x1 = cx + Math.cos(angle) * (innerR + len);
    const y1 = cy + Math.sin(angle) * (innerR + len);

    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, hexToRgba(config.secondaryColor, 0.85));
    grad.addColorStop(0.65, hexToRgba(config.primaryColor, 0.95));
    grad.addColorStop(1, hexToRgba(config.accentColor, 1));

    if (config.glowIntensity > 0.08) {
      ctx.strokeStyle = hexToRgba(config.primaryColor, 0.22 * config.glowIntensity);
      ctx.lineWidth = barWidth * 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    ctx.strokeStyle = grad;
    ctx.lineWidth = barWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    // Inner mirrored subtle tick
    const innerTick = len * 0.22;
    ctx.strokeStyle = hexToRgba(config.secondaryColor, 0.45);
    ctx.lineWidth = Math.max(1, barWidth * 0.6);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * (innerR - minDim * 0.01), cy + Math.sin(angle) * (innerR - minDim * 0.01));
    ctx.lineTo(
      cx + Math.cos(angle) * (innerR - minDim * 0.01 - innerTick),
      cy + Math.sin(angle) * (innerR - minDim * 0.01 - innerTick)
    );
    ctx.stroke();
  }
  ctx.restore();
}

export function renderNeonWaveRing(rc: RenderContextData): void {
  const { ctx, width, height, analysis, config, time } = rc;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const minDim = Math.min(width, height);
  const baseR = minDim * 0.24 * config.size;
  const amp = minDim * 0.095 * config.waveIntensity * config.size;
  const ptsCount = 128;

  for (let pass = 0; pass < 2; pass++) {
    const pts: Array<{ x: number; y: number }> = [];
    const rot = time * config.rotationSpeed * (pass === 0 ? 0.5 : -0.4);
    for (let i = 0; i < ptsCount; i++) {
      const t = i / ptsCount;
      const angle = t * Math.PI * 2 + rot;
      const waveVal = sampleWave(analysis.waveformData, t);
      const binVal = sampleBin(analysis.frequencyData, (t * 2) % 1);
      const offset =
        (pass === 0 ? waveVal : -waveVal * 0.75) * amp +
        binVal * amp * 0.35 +
        Math.sin(t * Math.PI * 8 + time * 4) * minDim * 0.005;
      const r = baseR + offset + analysis.bass * minDim * 0.025;
      pts.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
      });
    }

    const col = pass === 0 ? config.primaryColor : config.secondaryColor;
    const coreWidth = Math.max(1.8, minDim * (pass === 0 ? 0.005 : 0.003));
    ctx.save();
    drawClosedSmoothCurve(ctx, pts);
    if (config.glowIntensity > 0.05) {
      ctx.lineWidth = coreWidth * (3.8 + config.glowIntensity * 1.6);
      ctx.strokeStyle = hexToRgba(col, 0.15 * config.glowIntensity);
      ctx.stroke();
      ctx.lineWidth = coreWidth * 2.1;
      ctx.strokeStyle = hexToRgba(col, 0.3 * config.glowIntensity);
      ctx.stroke();
    }
    ctx.lineWidth = coreWidth;
    ctx.strokeStyle = pass === 0 ? config.accentColor : hexToRgba(col, 0.85);
    ctx.stroke();
    ctx.restore();
  }

  // Transient shockwave ring on bass peak
  if (analysis.peakBass > 0.32) {
    const pulseProgress = (time * 1.4) % 1;
    const shockR = baseR * (1.05 + pulseProgress * 0.75);
    ctx.save();
    ctx.strokeStyle = hexToRgba(config.primaryColor, (1 - pulseProgress) * analysis.peakBass * 0.65);
    ctx.lineWidth = Math.max(1, minDim * 0.0025);
    ctx.beginPath();
    ctx.arc(cx, cy, shockR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export function renderRadialPulse(rc: RenderContextData): void {
  const { ctx, width, height, analysis, config, time } = rc;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const minDim = Math.min(width, height);
  const maxR = minDim * 0.42 * config.size;

  // Expanding sonar wavefronts
  const ringCount = 6;
  ctx.save();
  for (let i = 0; i < ringCount; i++) {
    const phase = ((time * (0.45 + Math.abs(config.rotationSpeed) * 0.25) + i / ringCount) % 1);
    const r = minDim * 0.04 + phase * maxR;
    const bin = sampleBin(analysis.frequencyData, phase * 0.6);
    const alpha = (1 - phase) * (0.28 + bin * 0.65 + analysis.bass * 0.25);
    const col = i % 2 === 0 ? config.primaryColor : config.secondaryColor;
    const lw = Math.max(1.5, minDim * (0.005 * (1 - phase * 0.6) + analysis.bass * 0.003));
    if (config.glowIntensity > 0.08) {
      ctx.strokeStyle = hexToRgba(col, Math.min(0.3, alpha * 0.3 * config.glowIntensity));
      ctx.lineWidth = lw * 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = hexToRgba(col, Math.min(0.95, alpha));
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Central starburst rays
  const rays = Math.round(36 * Math.min(1.5, config.particleDensity));
  const coreR = minDim * (0.075 + analysis.bass * 0.05) * config.size;
  for (let i = 0; i < rays; i++) {
    const t = i / rays;
    const angle = t * Math.PI * 2 + time * config.rotationSpeed * 0.5;
    const val = sampleBin(analysis.frequencyData, (i % 32) / 32);
    const rayEnd = coreR + val * minDim * 0.16 * config.waveIntensity * config.size;
    ctx.strokeStyle = hexToRgba(config.accentColor, 0.35 + val * 0.6);
    ctx.lineWidth = Math.max(1.2, minDim * 0.0025);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * (coreR * 0.6), cy + Math.sin(angle) * (coreR * 0.6));
    ctx.lineTo(cx + Math.cos(angle) * rayEnd, cy + Math.sin(angle) * rayEnd);
    ctx.stroke();
  }

  // Glowing core orb
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 1.4);
  coreGrad.addColorStop(0, hexToRgba(config.accentColor, 0.95));
  coreGrad.addColorStop(0.5, hexToRgba(config.primaryColor, 0.65));
  coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR * 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function renderWireframeSphere(rc: RenderContextData): void {
  const { ctx, width, height, analysis, config, time } = rc;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const minDim = Math.min(width, height);
  const radius = minDim * 0.26 * config.size * (1 + analysis.bass * 0.14);
  const fov = minDim * 1.25;
  const rotY = time * config.rotationSpeed * 0.65;
  const rotX = 0.35 + Math.sin(time * 0.4) * 0.25;

  const latSteps = 12;
  const lonSteps = 20;
  const grid: Array<Array<{ sx: number; sy: number; depth: number; energy: number }>> = [];

  for (let lat = 0; lat <= latSteps; lat++) {
    const row: Array<{ sx: number; sy: number; depth: number; energy: number }> = [];
    const phi = (lat / latSteps) * Math.PI;
    for (let lon = 0; lon <= lonSteps; lon++) {
      const theta = (lon / lonSteps) * Math.PI * 2;
      const bin = sampleBin(analysis.frequencyData, ((lat + lon) % 32) / 32);
      const r = radius * (1 + bin * 0.24 * config.waveIntensity);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);

      const p = project3D(x, y, z, rotX, rotY, cx, cy, fov);
      row.push({ sx: p.sx, sy: p.sy, depth: p.depth, energy: bin });
    }
    grid.push(row);
  }

  ctx.save();
  ctx.lineWidth = Math.max(1, minDim * 0.0018);

  for (let lat = 0; lat <= latSteps; lat++) {
    for (let lon = 0; lon < lonSteps; lon++) {
      const p1 = grid[lat][lon];
      const p2 = grid[lat][lon + 1];
      const frontness = Math.max(0.1, Math.min(1, 0.55 - p1.depth / (radius * 2.2)));
      ctx.strokeStyle = hexToRgba(
        lat % 2 === 0 ? config.primaryColor : config.secondaryColor,
        frontness * (0.45 + p1.energy * 0.55)
      );
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();

      if (lat < latSteps) {
        const p3 = grid[lat + 1][lon];
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p3.sx, p3.sy);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

export function renderCircularEqualizer(rc: RenderContextData): void {
  const { ctx, width, height, analysis, config, time } = rc;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const minDim = Math.min(width, height);
  const baseR = minDim * 0.16 * config.size;
  const channels = 44;
  const maxBlocks = 12;
  const blockH = minDim * 0.015 * config.waveIntensity * config.size;
  const gap = minDim * 0.006 * config.size;
  const rot = time * config.rotationSpeed * 0.25;

  ctx.save();
  for (let c = 0; c < channels; c++) {
    const t = c / channels;
    const symT = t <= 0.5 ? t * 2 : (1 - t) * 2;
    const val = sampleBin(analysis.frequencyData, symT * 0.85);
    const activeBlocks = Math.max(1, Math.round(val * maxBlocks));
    const angle = t * Math.PI * 2 - Math.PI / 2 + rot;
    const arcSpan = ((Math.PI * 2) / channels) * 0.68;

    for (let b = 0; b < activeBlocks; b++) {
      const r = baseR + b * (blockH + gap);
      const ratio = b / maxBlocks;
      const col =
        ratio > 0.72
          ? config.accentColor
          : ratio > 0.35
            ? config.primaryColor
            : config.secondaryColor;

      ctx.strokeStyle = hexToRgba(col, 0.72 + ratio * 0.28);
      ctx.lineWidth = blockH;
      ctx.beginPath();
      ctx.arc(cx, cy, r, angle - arcSpan * 0.5, angle + arcSpan * 0.5);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function renderFlowingWave(rc: RenderContextData): void {
  const { ctx, width, height, analysis, config, time } = rc;
  const cy = height * 0.5;
  const minDim = Math.min(width, height);
  const ribbons = 5;
  const steps = 90;
  const maxAmp = height * 0.24 * config.waveIntensity * config.size;

  for (let r = 0; r < ribbons; r++) {
    const pts: Array<{ x: number; y: number }> = [];
    const speed = (0.8 + r * 0.25) * (1 + Math.abs(config.rotationSpeed));
    const phase = time * speed + r * 0.9;
    const color =
      r === 0
        ? config.accentColor
        : r % 2 === 1
          ? config.primaryColor
          : config.secondaryColor;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = t * width;
      const envelope = Math.sin(t * Math.PI); // taper cleanly at edges
      const freqVal = sampleBin(analysis.frequencyData, Math.abs(t - 0.5) * 1.7);
      const waveVal = sampleWave(analysis.waveformData, t);
      const yOffset =
        (Math.sin(t * Math.PI * (3 + r * 0.8) + phase) * (0.28 + freqVal * 0.85) +
          waveVal * 0.45) *
        maxAmp *
        envelope *
        (1 - r * 0.12);
      pts.push({ x, y: cy + yOffset });
    }

    ctx.save();
    drawOpenSmoothCurve(ctx, pts);
    const coreWidth = Math.max(1.5, minDim * (r === 0 ? 0.0048 : 0.0026));
    if (config.glowIntensity > 0.05) {
      ctx.lineWidth = coreWidth * (3.2 + config.glowIntensity);
      ctx.strokeStyle = hexToRgba(color, 0.14 * config.glowIntensity);
      ctx.stroke();
    }
    ctx.lineWidth = coreWidth;
    ctx.strokeStyle = hexToRgba(color, r === 0 ? 0.95 : 0.68 - r * 0.09);
    ctx.stroke();

    // Soft translucent ribbon fill under primary waves
    if (r < 2) {
      ctx.lineTo(width, cy);
      ctx.lineTo(0, cy);
      ctx.closePath();
      const fillGrad = ctx.createLinearGradient(0, cy - maxAmp, 0, cy + maxAmp);
      fillGrad.addColorStop(0, hexToRgba(color, 0.14));
      fillGrad.addColorStop(0.5, hexToRgba(color, 0.03));
      fillGrad.addColorStop(1, hexToRgba(color, 0.14));
      ctx.fillStyle = fillGrad;
      ctx.fill();
    }
    ctx.restore();
  }
}

export function renderDualRingSpectrum(rc: RenderContextData): void {
  const { ctx, width, height, analysis, config, time } = rc;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const minDim = Math.min(width, height);
  const innerR = minDim * 0.15 * config.size * (1 + analysis.bass * 0.15);
  const outerR = minDim * 0.30 * config.size;
  const count = 64;
  const rotInner = time * config.rotationSpeed * 0.7;
  const rotOuter = -time * config.rotationSpeed * 0.45;

  ctx.save();
  // Outer and inner rings + harmonic bridges
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const bin = sampleBin(analysis.frequencyData, (t * 2) % 1);
    const a1 = t * Math.PI * 2 + rotInner;
    const a2 = t * Math.PI * 2 + rotOuter;

    const r1 = innerR + bin * minDim * 0.06 * config.waveIntensity * config.size;
    const r2 = outerR + bin * minDim * 0.09 * config.waveIntensity * config.size;

    const x1 = cx + Math.cos(a1) * r1;
    const y1 = cy + Math.sin(a1) * r1;
    const x2 = cx + Math.cos(a2) * r2;
    const y2 = cy + Math.sin(a2) * r2;

    if (i % 2 === 0) {
      ctx.strokeStyle = hexToRgba(config.secondaryColor, 0.18 + bin * 0.45);
      ctx.lineWidth = Math.max(1, minDim * 0.0018);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    const outerDotR = Math.max(1.8, minDim * 0.0038 * (0.7 + bin));
    if (config.glowIntensity > 0.08) {
      ctx.fillStyle = hexToRgba(config.primaryColor, 0.22 * config.glowIntensity);
      ctx.beginPath();
      ctx.arc(x2, y2, outerDotR * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = hexToRgba(config.accentColor, 0.65 + bin * 0.35);
    ctx.beginPath();
    ctx.arc(x2, y2, outerDotR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hexToRgba(config.primaryColor, 0.75 + bin * 0.25);
    ctx.beginPath();
    ctx.arc(x1, y1, Math.max(1.5, minDim * 0.0032 * (0.7 + bin)), 0, Math.PI * 2);
    ctx.fill();
  }

  // Structural circles
  ctx.strokeStyle = hexToRgba(config.primaryColor, 0.4);
  ctx.lineWidth = Math.max(1.2, minDim * 0.0025);
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = hexToRgba(config.secondaryColor, 0.35);
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function renderFrequencyPulse(rc: RenderContextData): void {
  const { ctx, width, height, analysis, config } = rc;
  const cy = height * 0.5;
  const minDim = Math.min(width, height);
  const bars = Math.max(48, Math.round(76 * Math.min(1.4, config.particleDensity)));
  const spanW = width * 0.82;
  const startX = (width - spanW) * 0.5;
  const step = spanW / bars;
  const maxHalfH = height * 0.34 * config.waveIntensity * config.size;

  ctx.save();
  // Horizon axis line
  ctx.strokeStyle = hexToRgba(config.primaryColor, 0.35);
  ctx.lineWidth = Math.max(1, minDim * 0.002);
  ctx.beginPath();
  ctx.moveTo(startX, cy);
  ctx.lineTo(startX + spanW, cy);
  ctx.stroke();

  for (let i = 0; i < bars; i++) {
    const t = i / (bars - 1);
    const centerDist = Math.abs(t - 0.5) * 2; // 0 at center, 1 at edges
    const val = sampleBin(analysis.frequencyData, centerDist * 0.85);
    const h = Math.max(minDim * 0.006, val * maxHalfH * (1 - centerDist * 0.35));
    const x = startX + i * step;

    const grad = ctx.createLinearGradient(x, cy - h, x, cy + h);
    grad.addColorStop(0, hexToRgba(config.accentColor, 0.95));
    grad.addColorStop(0.5, hexToRgba(config.primaryColor, 0.95));
    grad.addColorStop(1, hexToRgba(config.secondaryColor, 0.95));

    const lw = Math.max(2, step * 0.55);
    if (config.glowIntensity > 0.08) {
      ctx.strokeStyle = hexToRgba(config.primaryColor, 0.2 * config.glowIntensity);
      ctx.lineWidth = lw * 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, cy - h);
      ctx.lineTo(x, cy + h);
      ctx.stroke();
    }
    ctx.strokeStyle = grad;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, cy - h);
    ctx.lineTo(x, cy + h);
    ctx.stroke();
  }
  ctx.restore();
}

// Re-export pseudoRandom so unused lint warning never occurs if needed
export { pseudoRandom };
