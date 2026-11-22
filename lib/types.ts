export type VisualizerCategory =
  | 'All'
  | 'Circular'
  | 'Waveform'
  | 'Particle'
  | 'Spectrum'
  | 'Abstract'
  | '3D Inspired';

export type VisualizerTemplateId =
  | 'liquid-wave-ring'
  | 'particle-sphere'
  | 'circular-spectrum'
  | 'neon-wave-ring'
  | 'radial-pulse'
  | 'wireframe-sphere'
  | 'circular-equalizer'
  | 'flowing-wave'
  | 'dual-ring-spectrum'
  | 'frequency-pulse'
  | 'liquid-plasma'
  | 'particle-orbit'
  | 'audio-tunnel'
  | '3d-frequency-bars'
  | 'aurora-wave'
  | 'neon-pulse-circle'
  | 'dynamic-sound-ring'
  | 'dotted-spectrum'
  | 'energy-orb'
  | 'abstract-sound-mesh';

export interface VisualizerTemplateMeta {
  id: VisualizerTemplateId;
  name: string;
  category: Exclude<VisualizerCategory, 'All'>;
  description: string;
  defaultColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface VisualizerConfig {
  templateId: VisualizerTemplateId;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  glowIntensity: number; // 0 to 1
  size: number; // 0.4 to 1.6
  offsetX: number; // -50 to 50 (%)
  offsetY: number; // -50 to 50 (%)
  sensitivity: number; // 0.3 to 2.5
  waveIntensity: number; // 0.2 to 2.0
  particleDensity: number; // 0.2 to 2.0
  rotationSpeed: number; // -2.0 to 2.0
  smoothness: number; // 0.1 to 0.95
}

export type BackgroundType = 'black' | 'solid' | 'gradient' | 'preset-image' | 'custom-image';

export type ImageFitMode = 'cover' | 'contain';

export interface BackgroundConfig {
  type: BackgroundType;
  solidColor: string;
  gradientId: string;
  gradientColors: [string, string, string?];
  gradientAngle: number;
  imageUrl: string | null;
  imageName: string | null;
  presetId: string | null;
  imageFit: ImageFitMode;
  positionX: number; // -50 to 50 (%)
  positionY: number; // -50 to 50 (%)
  scale: number; // 0.5 to 2.5
  opacity: number; // 0.05 to 1.0
  blur: number; // 0 to 40 px
}

export type PlacementPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type TextAlignMode = 'left' | 'center' | 'right';

export interface BrandingConfig {
  visible: boolean;
  brandName: string;
  customText: string;
  fontFamily: string;
  fontSize: number; // 14 to 72 (relative to 1080p baseline)
  fontWeight: '400' | '500' | '600' | '700';
  textColor: string;
  textAlign: TextAlignMode;
  letterSpacing: number; // -2 to 16 px
  textPosition: PlacementPosition;
  logoUrl: string | null;
  logoName: string | null;
  logoPosition: PlacementPosition;
  logoSize: number; // 32 to 240 px (relative to 1080p baseline)
  opacity: number; // 0.1 to 1.0
}

export type AspectRatioId = '9:16' | '16:9' | '1:1' | '4:5' | '4:3' | '3:4' | '21:9' | '2:1';

export interface AspectRatioOption {
  id: AspectRatioId;
  label: string;
  usage: string;
  widthRatio: number;
  heightRatio: number;
}

export type ExportResolutionId = '1080p' | '2k' | '4k';
export type ExportFps = 24 | 30 | 50 | 60;
export type ExportQuality = 'standard' | 'high' | 'ultra';

export interface ExportConfig {
  resolution: ExportResolutionId;
  fps: ExportFps;
  quality: ExportQuality;
  includeAudio: boolean;
  format: 'mp4';
}

export interface AudioAsset {
  file: File;
  objectUrl: string;
  name: string;
  size: number;
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  mimeType: string;
  audioBuffer: AudioBuffer;
  isDemo?: boolean;
}

export interface AudioAnalysisFrame {
  frequencyData: Float32Array; // 0..1 normalized bins (length 128 or 256)
  waveformData: Float32Array; // -1..1 time domain samples (length 256)
  bass: number; // 0..1
  mid: number; // 0..1
  treble: number; // 0..1
  energy: number; // 0..1
  peakBass: number; // 0..1 decaying peak
}

export type LeftSidebarTab = 'audio' | 'templates' | 'backgrounds' | 'branding' | 'canvas';

export type ExportPhase =
  | 'idle'
  | 'checking'
  | 'rendering'
  | 'muxing'
  | 'completed'
  | 'cancelled'
  | 'error';

export interface ExportProgressState {
  phase: ExportPhase;
  progress: number; // 0..100
  currentFrame: number;
  totalFrames: number;
  statusMessage: string;
  estimatedRemainingSeconds: number | null;
  errorMessage: string | null;
  outputBlob: Blob | null;
  outputUrl: string | null;
  outputFileName: string | null;
  outputSizeBytes: number | null;
  outputWidth: number | null;
  outputHeight: number | null;
  outputFps: number | null;
  outputCodecLabel: string | null;
  fallbackNotice: string | null;
}

export interface CodecSupportReport {
  supported: boolean;
  videoCodec: string;
  audioCodec: string | null;
  engine: 'webcodecs-mp4' | 'unsupported';
  warnings: string[];
  blockingReason: string | null;
  suggestedResolution?: ExportResolutionId;
  suggestedFps?: ExportFps;
}

export interface UserHistoryEntry {
  id: string;
  uid: string;
  audioFileName: string;
  audioDurationSec: number;
  audioSampleRate: number;
  templateId: VisualizerTemplateId;
  templateName: string;
  aspectRatio: AspectRatioId;
  resolution: ExportResolutionId;
  fps: ExportFps;
  quality: ExportQuality;
  outputWidth: number;
  outputHeight: number;
  outputSizeBytes: number;
  codecLabel: string;
  offsetX: number;
  offsetY: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundType: BackgroundType;
  createdAtMs: number;
}

