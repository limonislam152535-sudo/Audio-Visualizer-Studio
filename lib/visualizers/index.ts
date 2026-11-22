import { VisualizerTemplateId } from '../types';
import { RenderContextData } from './helpers';
import {
  renderCircularEqualizer,
  renderCircularSpectrum,
  renderDualRingSpectrum,
  renderFlowingWave,
  renderFrequencyPulse,
  renderLiquidWaveRing,
  renderNeonWaveRing,
  renderParticleSphere,
  renderRadialPulse,
  renderWireframeSphere,
} from './templates-a';
import {
  render3DFrequencyBars,
  renderAbstractSoundMesh,
  renderAudioTunnel,
  renderAuroraWave,
  renderDottedSpectrum,
  renderDynamicSoundRing,
  renderEnergyOrb,
  renderLiquidPlasma,
  renderNeonPulseCircle,
  renderParticleOrbit,
} from './templates-b';

const RENDERER_MAP: Record<VisualizerTemplateId, (rc: RenderContextData) => void> = {
  'liquid-wave-ring': renderLiquidWaveRing,
  'particle-sphere': renderParticleSphere,
  'circular-spectrum': renderCircularSpectrum,
  'neon-wave-ring': renderNeonWaveRing,
  'radial-pulse': renderRadialPulse,
  'wireframe-sphere': renderWireframeSphere,
  'circular-equalizer': renderCircularEqualizer,
  'flowing-wave': renderFlowingWave,
  'dual-ring-spectrum': renderDualRingSpectrum,
  'frequency-pulse': renderFrequencyPulse,
  'liquid-plasma': renderLiquidPlasma,
  'particle-orbit': renderParticleOrbit,
  'audio-tunnel': renderAudioTunnel,
  '3d-frequency-bars': render3DFrequencyBars,
  'aurora-wave': renderAuroraWave,
  'neon-pulse-circle': renderNeonPulseCircle,
  'dynamic-sound-ring': renderDynamicSoundRing,
  'dotted-spectrum': renderDottedSpectrum,
  'energy-orb': renderEnergyOrb,
  'abstract-sound-mesh': renderAbstractSoundMesh,
};

export function renderVisualizerTemplate(rc: RenderContextData): void {
  const renderer = RENDERER_MAP[rc.config.templateId] ?? renderLiquidWaveRing;
  renderer(rc);
}
