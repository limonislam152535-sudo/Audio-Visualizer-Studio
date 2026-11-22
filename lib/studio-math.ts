import { ASPECT_RATIOS } from './constants';
import {
  AspectRatioId,
  AudioAnalysisFrame,
  ExportQuality,
  ExportResolutionId,
  ImageFitMode,
  PlacementPosition,
  TextAlignMode,
} from './types';

function makeEven(n: number): number {
  const rounded = Math.round(n);
  return rounded % 2 === 0 ? rounded : rounded + 1;
}

/**
 * Computes exact even pixel dimensions matching the requested aspect ratio
 * and resolution tier (Full HD, 2K, 4K) without stretching or distortion.
 */
export function computeExportDimensions(
  ratioId: AspectRatioId,
  resolutionId: ExportResolutionId
): { width: number; height: number } {
  const ratio = ASPECT_RATIOS.find((r) => r.id === ratioId) ?? ASPECT_RATIOS[0];
  const shortSideTarget =
    resolutionId === '4k' ? 2160 : resolutionId === '2k' ? 1440 : 1080;

  // Base scale on the shorter dimension for standard/portrait ratios,
  // and keep ultrawide ratios within sensible encoder limits.
  const isLandscape = ratio.widthRatio >= ratio.heightRatio;
  if (isLandscape) {
    // For 21:9 or 2:1, scale using long side or short side capped safely for H.264 levels
    if (ratio.widthRatio / ratio.heightRatio > 1.9) {
      const targetWidth =
        resolutionId === '4k' ? 3840 : resolutionId === '2k' ? 2560 : 1920;
      const height = makeEven((targetWidth * ratio.heightRatio) / ratio.widthRatio);
      return { width: makeEven(targetWidth), height };
    }
    const height = makeEven(shortSideTarget);
    const width = makeEven((height * ratio.widthRatio) / ratio.heightRatio);
    return { width, height };
  } else {
    const width = makeEven(shortSideTarget);
    const height = makeEven((width * ratio.heightRatio) / ratio.widthRatio);
    return { width, height };
  }
}

export function estimateVideoBitrate(
  width: number,
  height: number,
  fps: number,
  quality: ExportQuality
): number {
  const pixelsPerSec = width * height * fps;
  const bpp = quality === 'ultra' ? 0.16 : quality === 'high' ? 0.1 : 0.06;
  const raw = Math.round(pixelsPerSec * bpp);
  // Clamp between 2.5 Mbps and 45 Mbps
  return Math.max(2_500_000, Math.min(45_000_000, raw));
}

export function computeImageDrawRect(
  imgW: number,
  imgH: number,
  canvasW: number,
  canvasH: number,
  fit: ImageFitMode,
  scale: number,
  posXPercent: number,
  posYPercent: number
): { dx: number; dy: number; dw: number; dh: number } {
  if (imgW <= 0 || imgH <= 0 || canvasW <= 0 || canvasH <= 0) {
    return { dx: 0, dy: 0, dw: canvasW, dh: canvasH };
  }
  const imgAspect = imgW / imgH;
  const canvasAspect = canvasW / canvasH;

  let baseW: number;
  let baseH: number;

  if (fit === 'cover') {
    if (imgAspect > canvasAspect) {
      baseH = canvasH;
      baseW = canvasH * imgAspect;
    } else {
      baseW = canvasW;
      baseH = canvasW / imgAspect;
    }
  } else {
    if (imgAspect > canvasAspect) {
      baseW = canvasW;
      baseH = canvasW / imgAspect;
    } else {
      baseH = canvasH;
      baseW = canvasH * imgAspect;
    }
  }

  const dw = baseW * scale;
  const dh = baseH * scale;
  const offsetX = (posXPercent / 100) * canvasW;
  const offsetY = (posYPercent / 100) * canvasH;
  const dx = (canvasW - dw) / 2 + offsetX;
  const dy = (canvasH - dh) / 2 + offsetY;

  return { dx, dy, dw, dh };
}

export function computeBrandingAnchor(
  position: PlacementPosition,
  canvasW: number,
  canvasH: number,
  marginX: number,
  marginY: number,
  alignOverride?: TextAlignMode
): {
  x: number;
  y: number;
  horizontal: 'left' | 'center' | 'right';
  vertical: 'top' | 'middle' | 'bottom';
  canvasAlign: CanvasTextAlign;
} {
  let horizontal: 'left' | 'center' | 'right' = 'center';
  if (position.endsWith('left')) horizontal = 'left';
  else if (position.endsWith('right')) horizontal = 'right';

  let vertical: 'top' | 'middle' | 'bottom' = 'middle';
  if (position.startsWith('top')) vertical = 'top';
  else if (position.startsWith('bottom')) vertical = 'bottom';

  const x =
    horizontal === 'left'
      ? marginX
      : horizontal === 'right'
        ? canvasW - marginX
        : canvasW / 2;

  const y =
    vertical === 'top'
      ? marginY
      : vertical === 'bottom'
        ? canvasH - marginY
        : canvasH / 2;

  const canvasAlign: CanvasTextAlign =
    horizontal === 'center' && alignOverride ? alignOverride : horizontal;

  return { x, y, horizontal, vertical, canvasAlign };
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const totalSec = Math.floor(seconds);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const SUPPORTED_AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'aac', 'flac'];
const SUPPORTED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const mime = (file.type || '').toLowerCase();
  const mimeOk =
    mime.startsWith('audio/') ||
    mime === 'video/mp4' || // some browsers report m4a as video/mp4 or audio/mp4
    mime === '';

  if (!SUPPORTED_AUDIO_EXTENSIONS.includes(ext) && !mime.startsWith('audio/')) {
    return {
      valid: false,
      error: `Unsupported audio format "${ext || file.type}". Please upload MP3, WAV, M4A, AAC, or FLAC.`,
    };
  }
  if (!mimeOk && !SUPPORTED_AUDIO_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: 'Selected file does not appear to be a supported audio track.',
    };
  }
  if (file.size === 0) {
    return { valid: false, error: 'The selected audio file is empty.' };
  }
  if (file.size > 500 * 1024 * 1024) {
    return {
      valid: false,
      error: 'Audio file exceeds 500 MB browser memory limit. Please select a smaller file.',
    };
  }
  return { valid: true };
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const mime = (file.type || '').toLowerCase();
  const validExt = SUPPORTED_IMAGE_EXTENSIONS.includes(ext);
  const validMime =
    mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp';

  if (!validExt && !validMime) {
    return {
      valid: false,
      error: `Unsupported image format "${ext || file.type}". Please upload JPG, JPEG, PNG, or WEBP.`,
    };
  }
  if (file.size > 40 * 1024 * 1024) {
    return {
      valid: false,
      error: 'Image file exceeds 40 MB. Please choose a smaller image.',
    };
  }
  return { valid: true };
}

/**
 * Extracts perceptual Bass, Mid, Treble, and Energy values from normalized spectrum bins [0..1].
 */
export function computeFrequencyBands(
  bins: Float32Array,
  sampleRate: number,
  sensitivity: number,
  prevPeakBass: number
): Pick<AudioAnalysisFrame, 'bass' | 'mid' | 'treble' | 'energy' | 'peakBass'> {
  const count = bins.length;
  if (count === 0) {
    return { bass: 0, mid: 0, treble: 0, energy: 0, peakBass: 0 };
  }
  const nyquist = sampleRate / 2;
  let bassSum = 0;
  let bassCount = 0;
  let midSum = 0;
  let midCount = 0;
  let trebleSum = 0;
  let trebleCount = 0;

  for (let i = 0; i < count; i++) {
    // Logarithmic/linear approximation mapped to bins
    const freq = (i / count) * nyquist;
    const v = bins[i];
    if (freq <= 250) {
      bassSum += v;
      bassCount++;
    } else if (freq <= 2400) {
      midSum += v;
      midCount++;
    } else {
      trebleSum += v;
      trebleCount++;
    }
  }

  const rawBass = bassCount > 0 ? bassSum / bassCount : 0;
  const rawMid = midCount > 0 ? midSum / midCount : 0;
  const rawTreble = trebleCount > 0 ? trebleSum / trebleCount : 0;

  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
  const bass = clamp01(rawBass * sensitivity);
  const mid = clamp01(rawMid * sensitivity * 1.15);
  const treble = clamp01(rawTreble * sensitivity * 1.35);
  const energy = clamp01(bass * 0.45 + mid * 0.35 + treble * 0.2);
  const peakBass = Math.max(bass, prevPeakBass * 0.92);

  return { bass, mid, treble, energy, peakBass };
}

export function clampVisualizerOffset(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.max(-50, Math.min(50, Math.round(percent * 10) / 10));
}

export function computeVisualizerOffsetPx(
  offsetXPercent: number,
  offsetYPercent: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  const clampedX = clampVisualizerOffset(offsetXPercent);
  const clampedY = clampVisualizerOffset(offsetYPercent);
  return {
    x: (clampedX / 100) * canvasWidth,
    y: (clampedY / 100) * canvasHeight,
  };
}

