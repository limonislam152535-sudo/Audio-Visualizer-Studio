'use client';

import React from 'react';
import { Download, Move, RotateCcw, Sliders } from 'lucide-react';
import { VISUALIZER_TEMPLATES } from '@/lib/constants';
import { computeExportDimensions } from '@/lib/studio-math';
import {
  AspectRatioId,
  AudioAsset,
  ExportConfig,
  ExportFps,
  ExportQuality,
  ExportResolutionId,
  VisualizerConfig,
} from '@/lib/types';
import { StudioSlider } from './ui/StudioSlider';

interface RightSidebarProps {
  visualizer: VisualizerConfig;
  onChangeVisualizer: (next: VisualizerConfig) => void;
  onResetVisualizer: () => void;
  aspectRatio: AspectRatioId;
  exportConfig: ExportConfig;
  onChangeExport: (next: ExportConfig) => void;
  audio: AudioAsset | null;
  onOpenExport: () => void;
}

export function RightSidebar({
  visualizer,
  onChangeVisualizer,
  onResetVisualizer,
  aspectRatio,
  exportConfig,
  onChangeExport,
  audio,
  onOpenExport,
}: RightSidebarProps) {
  const activeMeta =
    VISUALIZER_TEMPLATES.find((t) => t.id === visualizer.templateId) ??
    VISUALIZER_TEMPLATES[0];

  const targetDims = computeExportDimensions(aspectRatio, exportConfig.resolution);

  return (
    <aside
      aria-label="Properties and Export"
      className="liquid-glass rounded-2xl w-full lg:w-[272px] xl:w-[320px] shrink-0 flex flex-col min-h-0 overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto studio-scroll p-4 space-y-5">
        {/* Selected Visualizer Header */}
        <section className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-sky-600">
                <Sliders className="w-3 h-3" aria-hidden="true" />
                <span>{activeMeta.category}</span>
              </div>
              <h2 className="font-display text-sm font-semibold text-slate-900 truncate mt-0.5">
                {activeMeta.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onResetVisualizer}
              title="Reset visualizer settings to defaults"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors shrink-0"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>

          {/* Color Pickers */}
          <div className="rounded-2xl bg-white/75 border border-slate-200/80 p-3 space-y-2.5">
            <span className="text-xs font-semibold text-slate-800 block">
              Color Palette
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { key: 'primaryColor', label: 'Primary' },
                  { key: 'secondaryColor', label: 'Secondary' },
                  { key: 'accentColor', label: 'Accent' },
                ] as const
              ).map((item) => (
                <label
                  key={item.key}
                  className="flex flex-col items-center gap-1.5 p-1.5 rounded-xl bg-slate-50/90 border border-slate-200/70 cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <input
                    type="color"
                    value={visualizer[item.key]}
                    onChange={(e) =>
                      onChangeVisualizer({
                        ...visualizer,
                        [item.key]: e.target.value,
                      })
                    }
                    aria-label={`${item.label} color`}
                    className="w-8 h-6 rounded-md border-0 bg-transparent cursor-pointer p-0"
                  />
                  <span className="text-[10px] font-medium text-slate-600">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Animation & Geometry Sliders */}
          <div className="rounded-2xl bg-white/75 border border-slate-200/80 p-3.5 space-y-3">
            <span className="text-xs font-semibold text-slate-800 block">
              Animation &amp; Dynamics
            </span>

            <StudioSlider
              label="Visualizer Size"
              value={visualizer.size}
              min={0.45}
              max={1.55}
              step={0.05}
              displayValue={`${Math.round(visualizer.size * 100)}%`}
              onChange={(val) => onChangeVisualizer({ ...visualizer, size: val })}
            />

            {/* Visualizer Position (X / Y) */}
            <div className="pt-2 border-t border-slate-200/70 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                  <Move className="w-3 h-3 text-sky-600" aria-hidden="true" />
                  <span>Visualizer Position</span>
                </span>
                <button
                  type="button"
                  disabled={visualizer.offsetX === 0 && visualizer.offsetY === 0}
                  onClick={() =>
                    onChangeVisualizer({ ...visualizer, offsetX: 0, offsetY: 0 })
                  }
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200/80 hover:bg-sky-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Center
                </button>
              </div>
              <StudioSlider
                label="Horizontal (X)"
                value={visualizer.offsetX}
                min={-50}
                max={50}
                step={1}
                displayValue={`${visualizer.offsetX > 0 ? '+' : ''}${Math.round(visualizer.offsetX)}%`}
                onChange={(val) =>
                  onChangeVisualizer({ ...visualizer, offsetX: val })
                }
              />
              <StudioSlider
                label="Vertical (Y)"
                value={visualizer.offsetY}
                min={-50}
                max={50}
                step={1}
                displayValue={`${visualizer.offsetY > 0 ? '+' : ''}${Math.round(visualizer.offsetY)}%`}
                onChange={(val) =>
                  onChangeVisualizer({ ...visualizer, offsetY: val })
                }
              />
            </div>
            <StudioSlider
              label="Audio Sensitivity"
              value={visualizer.sensitivity}
              min={0.3}
              max={2.4}
              step={0.05}
              displayValue={`${visualizer.sensitivity.toFixed(2)}×`}
              onChange={(val) =>
                onChangeVisualizer({ ...visualizer, sensitivity: val })
              }
            />
            <StudioSlider
              label="Glow Intensity"
              value={visualizer.glowIntensity}
              min={0}
              max={1.0}
              step={0.05}
              displayValue={`${Math.round(visualizer.glowIntensity * 100)}%`}
              onChange={(val) =>
                onChangeVisualizer({ ...visualizer, glowIntensity: val })
              }
            />
            <StudioSlider
              label="Wave Intensity"
              value={visualizer.waveIntensity}
              min={0.2}
              max={2.0}
              step={0.05}
              displayValue={`${visualizer.waveIntensity.toFixed(2)}×`}
              onChange={(val) =>
                onChangeVisualizer({ ...visualizer, waveIntensity: val })
              }
            />
            <StudioSlider
              label="Particle / Bar Density"
              value={visualizer.particleDensity}
              min={0.3}
              max={1.8}
              step={0.05}
              displayValue={`${Math.round(visualizer.particleDensity * 100)}%`}
              onChange={(val) =>
                onChangeVisualizer({ ...visualizer, particleDensity: val })
              }
            />
            <StudioSlider
              label="Rotation Speed"
              value={visualizer.rotationSpeed}
              min={-2.0}
              max={2.0}
              step={0.05}
              displayValue={`${visualizer.rotationSpeed.toFixed(2)}`}
              onChange={(val) =>
                onChangeVisualizer({ ...visualizer, rotationSpeed: val })
              }
            />
            <StudioSlider
              label="Smoothness"
              value={visualizer.smoothness}
              min={0.1}
              max={0.94}
              step={0.02}
              displayValue={`${Math.round(visualizer.smoothness * 100)}%`}
              onChange={(val) =>
                onChangeVisualizer({ ...visualizer, smoothness: val })
              }
            />
          </div>
        </section>

        <hr className="border-slate-200/75" />

        {/* Export Configuration */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-slate-900">
              Export Settings
            </h2>
            <span className="text-[11px] font-mono-tabular text-slate-500">
              {targetDims.width}×{targetDims.height}
            </span>
          </div>

          <div className="rounded-2xl bg-white/75 border border-slate-200/80 p-3.5 space-y-3">
            {/* Resolution */}
            <div>
              <span className="block text-xs font-medium text-slate-700 mb-1.5">
                Resolution
              </span>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100">
                {(
                  [
                    { id: '1080p', label: 'Full HD' },
                    { id: '2k', label: '2K QHD' },
                    { id: '4k', label: '4K UHD' },
                  ] as Array<{ id: ExportResolutionId; label: string }>
                ).map((res) => {
                  const active = exportConfig.resolution === res.id;
                  return (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() =>
                        onChangeExport({ ...exportConfig, resolution: res.id })
                      }
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${
                        active
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {res.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Frame Rate */}
            <div>
              <span className="block text-xs font-medium text-slate-700 mb-1.5">
                Frame Rate
              </span>
              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100">
                {([24, 30, 50, 60] as ExportFps[]).map((fps) => {
                  const active = exportConfig.fps === fps;
                  return (
                    <button
                      key={fps}
                      type="button"
                      onClick={() => onChangeExport({ ...exportConfig, fps })}
                      className={`py-1.5 rounded-lg text-[11px] font-mono-tabular font-medium transition-all ${
                        active
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {fps}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quality & Format */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="export-quality-select"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Bitrate Quality
                </label>
                <select
                  id="export-quality-select"
                  value={exportConfig.quality}
                  onChange={(e) =>
                    onChangeExport({
                      ...exportConfig,
                      quality: e.target.value as ExportQuality,
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                >
                  <option value="standard">Standard</option>
                  <option value="high">High</option>
                  <option value="ultra">Ultra</option>
                </select>
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-700 mb-1">
                  Container
                </span>
                <div className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-mono-tabular text-slate-700">
                  MP4 (H.264)
                </div>
              </div>
            </div>

            {/* Include Audio Toggle */}
            <label className="flex items-center justify-between gap-2 pt-1 cursor-pointer">
              <span className="text-xs font-medium text-slate-700">
                Include Audio Track
              </span>
              <input
                type="checkbox"
                checked={exportConfig.includeAudio}
                onChange={(e) =>
                  onChangeExport({ ...exportConfig, includeAudio: e.target.checked })
                }
                className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
            </label>
          </div>

          <button
            type="button"
            disabled={!audio}
            onClick={onOpenExport}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 shadow-sm shadow-sky-600/25 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Export MP4 Video</span>
          </button>

          {!audio && (
            <p className="text-[11px] text-slate-500 text-center">
              Upload an audio file or load the sample track to export.
            </p>
          )}
        </section>
      </div>
    </aside>
  );
}
