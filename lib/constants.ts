import {
  AspectRatioOption,
  BackgroundConfig,
  BrandingConfig,
  ExportConfig,
  VisualizerConfig,
  VisualizerTemplateMeta,
} from './types';

export const VISUALIZER_CATEGORIES = [
  'All',
  'Circular',
  'Waveform',
  'Particle',
  'Spectrum',
  'Abstract',
  '3D Inspired',
] as const;

export const VISUALIZER_TEMPLATES: VisualizerTemplateMeta[] = [
  {
    id: 'liquid-wave-ring',
    name: 'Liquid Wave Ring',
    category: 'Circular',
    description: 'Smooth harmonic closed-loop waves with translucent fluid ribbon depth.',
    defaultColors: { primary: '#38BDF8', secondary: '#818CF8', accent: '#E0F2FE' },
  },
  {
    id: 'particle-sphere',
    name: 'Particle Sphere',
    category: 'Particle',
    description: '3D Fibonacci lattice of audio-reactive particles spinning in depth.',
    defaultColors: { primary: '#60A5FA', secondary: '#34D399', accent: '#F8FAFC' },
  },
  {
    id: 'circular-spectrum',
    name: 'Circular Spectrum',
    category: 'Spectrum',
    description: 'Precision radial frequency bars with mirrored harmonic ticks and peak caps.',
    defaultColors: { primary: '#0EA5E9', secondary: '#2563EB', accent: '#BAE6FD' },
  },
  {
    id: 'neon-wave-ring',
    name: 'Neon Wave Ring',
    category: 'Circular',
    description: 'Dual-phase luminous oscilloscope halo with transient shockwave ripples.',
    defaultColors: { primary: '#22D3EE', secondary: '#3B82F6', accent: '#F0FDFA' },
  },
  {
    id: 'radial-pulse',
    name: 'Radial Pulse',
    category: 'Circular',
    description: 'Expanding sonar wavefront rings triggered by bass transients and core bursts.',
    defaultColors: { primary: '#38BDF8', secondary: '#0284C7', accent: '#FFFFFF' },
  },
  {
    id: 'wireframe-sphere',
    name: '3D Wireframe Sphere',
    category: '3D Inspired',
    description: 'Rotating geodesic wireframe globe with frequency-displaced mesh vertices.',
    defaultColors: { primary: '#38BDF8', secondary: '#6366F1', accent: '#E0F2FE' },
  },
  {
    id: 'circular-equalizer',
    name: 'Circular Equalizer',
    category: 'Spectrum',
    description: 'Segmented radial meter blocks organized in concentric energy shells.',
    defaultColors: { primary: '#06B6D4', secondary: '#3B82F6', accent: '#A5F3FC' },
  },
  {
    id: 'flowing-wave',
    name: 'Flowing Wave',
    category: 'Waveform',
    description: 'Silky multi-layered horizontal sine ribbons gliding across the frame.',
    defaultColors: { primary: '#38BDF8', secondary: '#60A5FA', accent: '#E0F2FE' },
  },
  {
    id: 'dual-ring-spectrum',
    name: 'Dual Ring Spectrum',
    category: 'Circular',
    description: 'Counter-rotating bass and treble rings bridged by harmonic filaments.',
    defaultColors: { primary: '#0EA5E9', secondary: '#6366F1', accent: '#F0F9FF' },
  },
  {
    id: 'frequency-pulse',
    name: 'Frequency Pulse',
    category: 'Waveform',
    description: 'Symmetrical mirrored horizon spectrum with crisp vertical energy needles.',
    defaultColors: { primary: '#38BDF8', secondary: '#1D4ED8', accent: '#F8FAFC' },
  },
  {
    id: 'liquid-plasma',
    name: 'Liquid Plasma',
    category: 'Abstract',
    description: 'Organic morphing polar contour lobes blending smoothly with mid/bass energy.',
    defaultColors: { primary: '#0284C7', secondary: '#2DD4BF', accent: '#ECFEFF' },
  },
  {
    id: 'particle-orbit',
    name: 'Particle Orbit',
    category: 'Particle',
    description: 'Elliptical Keplerian particle streams accelerating with transient energy.',
    defaultColors: { primary: '#60A5FA', secondary: '#22D3EE', accent: '#FFFFFF' },
  },
  {
    id: 'audio-tunnel',
    name: 'Audio Tunnel',
    category: '3D Inspired',
    description: 'Perspective tunnel of receding frequency polygons pulsing toward the viewer.',
    defaultColors: { primary: '#38BDF8', secondary: '#4F46E5', accent: '#E0F2FE' },
  },
  {
    id: '3d-frequency-bars',
    name: '3D Frequency Bars',
    category: '3D Inspired',
    description: 'Isometric extruded 3D bar matrix with specular floor reflections.',
    defaultColors: { primary: '#0EA5E9', secondary: '#2563EB', accent: '#BAE6FD' },
  },
  {
    id: 'aurora-wave',
    name: 'Aurora Wave',
    category: 'Waveform',
    description: 'Sweeping vertical gradient curtains shimmering with mid and high harmonics.',
    defaultColors: { primary: '#2DD4BF', secondary: '#38BDF8', accent: '#E0F2FE' },
  },
  {
    id: 'neon-pulse-circle',
    name: 'Neon Pulse Circle',
    category: 'Circular',
    description: 'Sculpted luminous torus ring with traveling phase arcs and inner aperture.',
    defaultColors: { primary: '#38BDF8', secondary: '#818CF8', accent: '#FFFFFF' },
  },
  {
    id: 'dynamic-sound-ring',
    name: 'Dynamic Sound Ring',
    category: 'Circular',
    description: 'Kinetic concentric arc segments spinning at frequency-driven velocities.',
    defaultColors: { primary: '#0284C7', secondary: '#06B6D4', accent: '#E0F2FE' },
  },
  {
    id: 'dotted-spectrum',
    name: 'Dotted Spectrum',
    category: 'Particle',
    description: 'Polar dot-matrix spiral field modulated in radius and luminance by FFT bins.',
    defaultColors: { primary: '#38BDF8', secondary: '#60A5FA', accent: '#F8FAFC' },
  },
  {
    id: 'energy-orb',
    name: 'Energy Orb',
    category: 'Abstract',
    description: 'Volumetric plasma core surrounded by curled magnetic field streamlines.',
    defaultColors: { primary: '#22D3EE', secondary: '#3B82F6', accent: '#FFFFFF' },
  },
  {
    id: 'abstract-sound-mesh',
    name: 'Abstract Sound Mesh',
    category: 'Abstract',
    description: 'Triangulated 3D wireframe terrain undulating in real time to spectral waves.',
    defaultColors: { primary: '#38BDF8', secondary: '#0EA5E9', accent: '#E0F2FE' },
  },
];

export const ASPECT_RATIOS: AspectRatioOption[] = [
  { id: '16:9', label: '16:9', usage: 'YouTube, Landscape Video', widthRatio: 16, heightRatio: 9 },
  { id: '9:16', label: '9:16', usage: 'Shorts, Reels, TikTok', widthRatio: 9, heightRatio: 16 },
  { id: '1:1', label: '1:1', usage: 'Square Social Media', widthRatio: 1, heightRatio: 1 },
  { id: '4:5', label: '4:5', usage: 'Instagram & Feed Posts', widthRatio: 4, heightRatio: 5 },
  { id: '4:3', label: '4:3', usage: 'Standard Video', widthRatio: 4, heightRatio: 3 },
  { id: '3:4', label: '3:4', usage: 'Portrait Video', widthRatio: 3, heightRatio: 4 },
  { id: '21:9', label: '21:9', usage: 'Cinematic Ultrawide', widthRatio: 21, heightRatio: 9 },
  { id: '2:1', label: '2:1', usage: 'Wide Video', widthRatio: 2, heightRatio: 1 },
];

export const SOLID_BACKGROUND_COLORS = [
  { name: 'Pure Black', value: '#000000' },
  { name: 'Obsidian', value: '#070B14' },
  { name: 'Midnight Navy', value: '#0B132B' },
  { name: 'Deep Slate', value: '#0F172A' },
  { name: 'Charcoal', value: '#18181B' },
  { name: 'Abyss Teal', value: '#042F2E' },
  { name: 'Dark Cobalt', value: '#172554' },
  { name: 'Studio Ivory', value: '#F8FAFC' },
];

export interface GradientPreset {
  id: string;
  name: string;
  colors: [string, string, string?];
  angle: number;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: 'abyss-blue', name: 'Abyssal Blue', colors: ['#020617', '#0F172A', '#0C4A6E'], angle: 135 },
  { id: 'midnight-indigo', name: 'Midnight Indigo', colors: ['#030712', '#1E1B4B', '#0F172A'], angle: 160 },
  { id: 'arctic-shadow', name: 'Arctic Shadow', colors: ['#090D16', '#111827', '#164E63'], angle: 145 },
  { id: 'slate-dusk', name: 'Slate Dusk', colors: ['#0B0F19', '#1E293B', '#334155'], angle: 120 },
  { id: 'cobalt-horizon', name: 'Cobalt Horizon', colors: ['#000000', '#0A192F', '#1E3A8A'], angle: 180 },
  { id: 'frost-light', name: 'Studio Frosted White', colors: ['#F8FAFC', '#E0F2FE', '#F1F5F9'], angle: 135 },
];

export interface PresetBackgroundImage {
  id: string;
  name: string;
  url: string;
}

export const PRESET_BACKGROUND_IMAGES: PresetBackgroundImage[] = [
  { id: 'obsidian-silk', name: 'Obsidian Silk', url: '/presets/obsidian-silk.jpg' },
  { id: 'slate-horizon', name: 'Slate Horizon', url: '/presets/slate-horizon.jpg' },
  { id: 'deep-cosmos', name: 'Deep Cosmos', url: '/presets/deep-cosmos.jpg' },
  { id: 'prism-refraction', name: 'Prism Caustics', url: '/presets/prism-refraction.jpg' },
];

export const BRANDING_FONTS = [
  { label: 'Plus Jakarta Sans', value: '"Plus Jakarta Sans", sans-serif' },
  { label: 'DM Sans', value: '"DM Sans", sans-serif' },
  { label: 'Outfit', value: '"Outfit", sans-serif' },
  { label: 'Playfair Display', value: '"Playfair Display", serif' },
  { label: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
];

export const DEFAULT_VISUALIZER_CONFIG: VisualizerConfig = {
  templateId: 'liquid-wave-ring',
  primaryColor: '#38BDF8',
  secondaryColor: '#818CF8',
  accentColor: '#E0F2FE',
  glowIntensity: 0.65,
  size: 1.0,
  offsetX: 0,
  offsetY: 0,
  sensitivity: 1.15,
  waveIntensity: 1.0,
  particleDensity: 1.0,
  rotationSpeed: 0.45,
  smoothness: 0.72,
};

export const DEFAULT_BACKGROUND_CONFIG: BackgroundConfig = {
  type: 'black', // Mandatory pure BLACK default
  solidColor: '#000000',
  gradientId: 'abyss-blue',
  gradientColors: ['#020617', '#0F172A', '#0C4A6E'],
  gradientAngle: 135,
  imageUrl: null,
  imageName: null,
  presetId: null,
  imageFit: 'cover',
  positionX: 0,
  positionY: 0,
  scale: 1.0,
  opacity: 1.0,
  blur: 0,
};

export const DEFAULT_BRANDING_CONFIG: BrandingConfig = {
  visible: true,
  brandName: '',
  customText: '',
  fontFamily: '"Plus Jakarta Sans", sans-serif',
  fontSize: 32,
  fontWeight: '600',
  textColor: '#F8FAFC',
  textAlign: 'center',
  letterSpacing: 1,
  textPosition: 'bottom-center',
  logoUrl: null,
  logoName: null,
  logoPosition: 'top-left',
  logoSize: 88,
  opacity: 0.92,
};

export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  resolution: '1080p',
  fps: 30,
  quality: 'high',
  includeAudio: true,
  format: 'mp4',
};
