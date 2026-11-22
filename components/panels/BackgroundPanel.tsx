'use client';

import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Image as ImageIcon,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  DEFAULT_BACKGROUND_CONFIG,
  GRADIENT_PRESETS,
  PRESET_BACKGROUND_IMAGES,
  SOLID_BACKGROUND_COLORS,
} from '@/lib/constants';
import { validateImageFile } from '@/lib/studio-math';
import { BackgroundConfig, BackgroundType } from '@/lib/types';
import { StudioSlider } from '../ui/StudioSlider';

interface BackgroundPanelProps {
  background: BackgroundConfig;
  onChange: (next: BackgroundConfig) => void;
  onUploadCustomImage: (file: File) => void;
  onResetBackground: () => void;
}

const MODE_OPTIONS: Array<{ id: BackgroundType; label: string }> = [
  { id: 'black', label: 'Pure Black' },
  { id: 'solid', label: 'Solid' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'preset-image', label: 'Presets' },
  { id: 'custom-image', label: 'Upload' },
];

export function BackgroundPanel({
  background,
  onChange,
  onUploadCustomImage,
  onResetBackground,
}: BackgroundPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleImageSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const check = validateImageFile(file);
    if (!check.valid) {
      setUploadError(check.error || 'Unsupported image format.');
      return;
    }
    setUploadError(null);
    onUploadCustomImage(file);
  };

  const isImageActive =
    (background.type === 'preset-image' || background.type === 'custom-image') &&
    Boolean(background.imageUrl);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-900">
            Background
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pure Black is selected by default.
          </p>
        </div>
        <button
          type="button"
          onClick={onResetBackground}
          title="Reset background to Pure Black"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <RotateCcw className="w-3 h-3" aria-hidden="true" />
          <span>Reset</span>
        </button>
      </div>

      {/* Mode selector */}
      <div
        role="tablist"
        aria-label="Background mode"
        className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-200/55"
      >
        {MODE_OPTIONS.map((opt) => {
          const active = background.type === opt.id;
          return (
            <button
              key={opt.id}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => {
                if (opt.id === 'black') {
                  onChange({ ...background, type: 'black', solidColor: '#000000' });
                } else if (opt.id === 'solid') {
                  onChange({
                    ...background,
                    type: 'solid',
                    solidColor: background.solidColor || '#070B14',
                  });
                } else if (opt.id === 'gradient') {
                  onChange({ ...background, type: 'gradient' });
                } else if (opt.id === 'preset-image') {
                  const first = PRESET_BACKGROUND_IMAGES[0];
                  onChange({
                    ...background,
                    type: 'preset-image',
                    presetId: background.presetId || first.id,
                    imageUrl:
                      background.type === 'preset-image' && background.imageUrl
                        ? background.imageUrl
                        : first.url,
                    imageName:
                      background.type === 'preset-image' && background.imageName
                        ? background.imageName
                        : first.name,
                  });
                } else {
                  onChange({ ...background, type: 'custom-image' });
                }
              }}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                active
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Pure Black */}
      {background.type === 'black' && (
        <div className="rounded-2xl bg-white/75 border border-slate-200/80 p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black border border-slate-300 shrink-0 flex items-center justify-center">
            <Check className="w-4 h-4 text-sky-400" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">
              Pure Black (#000000)
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Maximum contrast canvas for luminous visualizers.
            </p>
          </div>
        </div>
      )}

      {/* Solid Colors */}
      {background.type === 'solid' && (
        <div className="space-y-3 rounded-2xl bg-white/70 border border-slate-200/80 p-3.5">
          <div className="grid grid-cols-4 gap-2">
            {SOLID_BACKGROUND_COLORS.map((swatch) => {
              const selected =
                background.solidColor.toLowerCase() === swatch.value.toLowerCase();
              return (
                <button
                  key={swatch.value}
                  type="button"
                  title={swatch.name}
                  aria-label={`Select solid color ${swatch.name}`}
                  onClick={() =>
                    onChange({
                      ...background,
                      type: swatch.value === '#000000' ? 'black' : 'solid',
                      solidColor: swatch.value,
                    })
                  }
                  className={`h-9 rounded-xl border transition-all flex items-center justify-center ${
                    selected
                      ? 'border-sky-500 ring-2 ring-sky-500/30 scale-[1.03]'
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                  style={{ backgroundColor: swatch.value }}
                >
                  {selected && (
                    <Check
                      className={`w-3.5 h-3.5 ${
                        swatch.value === '#F8FAFC' ? 'text-slate-900' : 'text-white'
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <label
              htmlFor="bg-custom-solid-color"
              className="text-xs font-medium text-slate-700"
            >
              Custom Color
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono-tabular text-slate-500 uppercase">
                {background.solidColor}
              </span>
              <input
                id="bg-custom-solid-color"
                type="color"
                value={background.solidColor}
                onChange={(e) =>
                  onChange({
                    ...background,
                    type: 'solid',
                    solidColor: e.target.value,
                  })
                }
                className="w-7 h-7 rounded-lg border border-slate-200 cursor-pointer bg-transparent p-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* Gradients */}
      {background.type === 'gradient' && (
        <div className="space-y-3 rounded-2xl bg-white/70 border border-slate-200/80 p-3.5">
          <div className="grid grid-cols-2 gap-2">
            {GRADIENT_PRESETS.map((preset) => {
              const selected = background.gradientId === preset.id;
              const bgCss = `linear-gradient(${preset.angle}deg, ${preset.colors.join(', ')})`;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...background,
                      type: 'gradient',
                      gradientId: preset.id,
                      gradientColors: preset.colors,
                      gradientAngle: preset.angle,
                    })
                  }
                  className={`rounded-xl p-1.5 border text-left transition-all ${
                    selected
                      ? 'border-sky-500 bg-white shadow-sm'
                      : 'border-slate-200/80 bg-white/60 hover:border-slate-300'
                  }`}
                >
                  <div
                    className="h-11 rounded-lg w-full relative flex items-center justify-center"
                    style={{ background: bgCss }}
                  >
                    {selected && (
                      <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center shadow">
                        <Check className="w-3 h-3" aria-hidden="true" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-slate-700 mt-1.5 px-0.5 truncate">
                    {preset.name}
                  </p>
                </button>
              );
            })}
          </div>

          <StudioSlider
            label="Gradient Angle"
            value={background.gradientAngle}
            min={0}
            max={360}
            step={5}
            displayValue={`${background.gradientAngle}°`}
            onChange={(val) => onChange({ ...background, gradientAngle: val })}
          />
        </div>
      )}

      {/* Preset Background Images */}
      {background.type === 'preset-image' && (
        <div className="grid grid-cols-2 gap-2">
          {PRESET_BACKGROUND_IMAGES.map((img) => {
            const selected =
              background.type === 'preset-image' && background.presetId === img.id;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() =>
                  onChange({
                    ...background,
                    type: 'preset-image',
                    presetId: img.id,
                    imageUrl: img.url,
                    imageName: img.name,
                  })
                }
                className={`rounded-xl p-1.5 border text-left transition-all ${
                  selected
                    ? 'border-sky-500 bg-white shadow-sm'
                    : 'border-slate-200/80 bg-white/70 hover:border-slate-300'
                }`}
              >
                <div className="relative h-14 rounded-lg overflow-hidden bg-slate-900">
                  <img
                    src={img.url}
                    alt={img.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  {selected && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center shadow">
                      <Check className="w-2.5 h-2.5" aria-hidden="true" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-medium text-slate-700 mt-1.5 px-0.5 truncate">
                  {img.name}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Custom Image Upload */}
      {background.type === 'custom-image' && (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            aria-label="Upload custom background image"
            className="hidden"
            onChange={(e) => {
              handleImageSelect(e.target.files);
              e.target.value = '';
            }}
          />

          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/65 p-4 text-center">
            <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center mx-auto mb-2">
              <ImageIcon className="w-4 h-4 text-sky-600" aria-hidden="true" />
            </div>
            <p className="text-xs font-semibold text-slate-800">
              Upload Background Image
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              JPG · JPEG · PNG · WEBP
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Choose Image</span>
            </button>
          </div>

          {uploadError && (
            <div
              role="alert"
              className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-800">{uploadError}</p>
            </div>
          )}

          {background.imageUrl && (
            <div className="rounded-xl bg-white/80 border border-slate-200 p-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={background.imageUrl}
                  alt={background.imageName || 'Uploaded background'}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-lg object-cover bg-slate-900 shrink-0"
                />
                <span className="text-xs font-medium text-slate-800 truncate">
                  {background.imageName || 'Custom image'}
                </span>
              </div>
              <button
                type="button"
                aria-label="Clear custom background image"
                onClick={() => onChange({ ...DEFAULT_BACKGROUND_CONFIG })}
                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Image Customization Controls */}
      {isImageActive && (
        <div className="rounded-2xl bg-white/75 border border-slate-200/80 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">
              Image Adjustments
            </span>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100">
              {(['cover', 'contain'] as const).map((fit) => (
                <button
                  key={fit}
                  type="button"
                  onClick={() => onChange({ ...background, imageFit: fit })}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-colors ${
                    background.imageFit === fit
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {fit}
                </button>
              ))}
            </div>
          </div>

          <StudioSlider
            label="Scale / Zoom"
            value={background.scale}
            min={0.5}
            max={2.5}
            step={0.05}
            displayValue={`${Math.round(background.scale * 100)}%`}
            onChange={(val) => onChange({ ...background, scale: val })}
          />
          <StudioSlider
            label="Position X"
            value={background.positionX}
            min={-50}
            max={50}
            step={1}
            displayValue={`${background.positionX}%`}
            onChange={(val) => onChange({ ...background, positionX: val })}
          />
          <StudioSlider
            label="Position Y"
            value={background.positionY}
            min={-50}
            max={50}
            step={1}
            displayValue={`${background.positionY}%`}
            onChange={(val) => onChange({ ...background, positionY: val })}
          />
          <StudioSlider
            label="Opacity"
            value={background.opacity}
            min={0.05}
            max={1.0}
            step={0.05}
            displayValue={`${Math.round(background.opacity * 100)}%`}
            onChange={(val) => onChange({ ...background, opacity: val })}
          />
          <StudioSlider
            label="Background Blur"
            value={background.blur}
            min={0}
            max={40}
            step={1}
            displayValue={`${background.blur}px`}
            onChange={(val) => onChange({ ...background, blur: val })}
          />
        </div>
      )}
    </div>
  );
}
