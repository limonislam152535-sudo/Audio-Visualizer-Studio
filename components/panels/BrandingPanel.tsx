'use client';

import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Eye,
  EyeOff,
  ImagePlus,
  Trash2,
} from 'lucide-react';
import { BRANDING_FONTS } from '@/lib/constants';
import { validateImageFile } from '@/lib/studio-math';
import { BrandingConfig, PlacementPosition, TextAlignMode } from '@/lib/types';
import { StudioSlider } from '../ui/StudioSlider';

interface BrandingPanelProps {
  branding: BrandingConfig;
  onChange: (next: BrandingConfig) => void;
  onUploadLogo: (file: File) => void;
  onRemoveLogo: () => void;
}

const POSITION_OPTIONS: Array<{ id: PlacementPosition; short: string; label: string }> = [
  { id: 'top-left', short: 'TL', label: 'Top Left' },
  { id: 'top-center', short: 'TC', label: 'Top Center' },
  { id: 'top-right', short: 'TR', label: 'Top Right' },
  { id: 'center', short: 'C', label: 'Center' },
  { id: 'bottom-left', short: 'BL', label: 'Bottom Left' },
  { id: 'bottom-center', short: 'BC', label: 'Bottom Center' },
  { id: 'bottom-right', short: 'BR', label: 'Bottom Right' },
];

function PositionPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: PlacementPosition;
  onChange: (pos: PlacementPosition) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-700">{label}</span>
        <span className="text-[11px] text-slate-500">
          {POSITION_OPTIONS.find((p) => p.id === value)?.label}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {POSITION_OPTIONS.map((pos) => {
          const active = value === pos.id;
          return (
            <button
              key={pos.id}
              type="button"
              title={pos.label}
              aria-label={`${label}: ${pos.label}`}
              aria-pressed={active}
              onClick={() => onChange(pos.id)}
              className={`py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                active
                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                  : 'bg-white/80 text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              {pos.short}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BrandingPanel({
  branding,
  onChange,
  onUploadLogo,
  onRemoveLogo,
}: BrandingPanelProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const handleLogoSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const check = validateImageFile(file);
    if (!check.valid) {
      setLogoError(check.error || 'Unsupported logo format.');
      return;
    }
    setLogoError(null);
    onUploadLogo(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-900">
            Branding &amp; Text
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Position text and logo independently across any ratio.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...branding, visible: !branding.visible })}
          aria-pressed={branding.visible}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
            branding.visible
              ? 'bg-sky-50 border-sky-200 text-sky-700'
              : 'bg-white border-slate-200 text-slate-500'
          }`}
        >
          {branding.visible ? (
            <>
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Visible</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Hidden</span>
            </>
          )}
        </button>
      </div>

      {/* Text Inputs */}
      <div className="rounded-2xl bg-white/75 border border-slate-200/80 p-3.5 space-y-3">
        <div>
          <label
            htmlFor="brand-name-input"
            className="block text-xs font-medium text-slate-700 mb-1"
          >
            Brand / Artist Name
          </label>
          <input
            id="brand-name-input"
            type="text"
            value={branding.brandName}
            onChange={(e) => onChange({ ...branding, brandName: e.target.value })}
            placeholder="e.g. Horizon Records"
            className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
          />
        </div>

        <div>
          <label
            htmlFor="brand-custom-text-input"
            className="block text-xs font-medium text-slate-700 mb-1"
          >
            Subtitle / Custom Text
          </label>
          <input
            id="brand-custom-text-input"
            type="text"
            value={branding.customText}
            onChange={(e) => onChange({ ...branding, customText: e.target.value })}
            placeholder="e.g. Midnight Sessions · Vol. 04"
            className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
          />
        </div>
      </div>

      {/* Typography & Text Position */}
      <div className="rounded-2xl bg-white/75 border border-slate-200/80 p-3.5 space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label
              htmlFor="brand-font-select"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Font Family
            </label>
            <select
              id="brand-font-select"
              value={branding.fontFamily}
              onChange={(e) => onChange({ ...branding, fontFamily: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            >
              {BRANDING_FONTS.map((f) => (
                <option key={f.label} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="brand-weight-select"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Weight
            </label>
            <select
              id="brand-weight-select"
              value={branding.fontWeight}
              onChange={(e) =>
                onChange({
                  ...branding,
                  fontWeight: e.target.value as BrandingConfig['fontWeight'],
                })
              }
              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            >
              <option value="400">Regular</option>
              <option value="500">Medium</option>
              <option value="600">SemiBold</option>
              <option value="700">Bold</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <label
              htmlFor="brand-text-color"
              className="text-xs font-medium text-slate-700"
            >
              Text Color
            </label>
            <input
              id="brand-text-color"
              type="color"
              value={branding.textColor}
              onChange={(e) => onChange({ ...branding, textColor: e.target.value })}
              className="w-7 h-7 rounded-lg border border-slate-200 cursor-pointer p-0 bg-transparent"
            />
          </div>

          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100">
            {(
              [
                { id: 'left', icon: AlignLeft, label: 'Align left' },
                { id: 'center', icon: AlignCenter, label: 'Align center' },
                { id: 'right', icon: AlignRight, label: 'Align right' },
              ] as Array<{ id: TextAlignMode; icon: typeof AlignLeft; label: string }>
            ).map((item) => {
              const Icon = item.icon;
              const active = branding.textAlign === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={item.label}
                  onClick={() => onChange({ ...branding, textAlign: item.id })}
                  className={`p-1.5 rounded-md transition-colors ${
                    active
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </div>

        <StudioSlider
          label="Font Size"
          value={branding.fontSize}
          min={16}
          max={72}
          step={1}
          displayValue={`${branding.fontSize}px`}
          onChange={(val) => onChange({ ...branding, fontSize: val })}
        />

        <StudioSlider
          label="Letter Spacing"
          value={branding.letterSpacing}
          min={-2}
          max={16}
          step={0.5}
          displayValue={`${branding.letterSpacing}px`}
          onChange={(val) => onChange({ ...branding, letterSpacing: val })}
        />

        <PositionPicker
          label="Text Position"
          value={branding.textPosition}
          onChange={(pos) => onChange({ ...branding, textPosition: pos })}
        />
      </div>

      {/* Logo Upload & Positioning */}
      <div className="rounded-2xl bg-white/75 border border-slate-200/80 p-3.5 space-y-3">
        <input
          ref={logoInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          aria-label="Upload brand logo"
          className="hidden"
          onChange={(e) => {
            handleLogoSelect(e.target.files);
            e.target.value = '';
          }}
        />

        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-800">Brand Logo</span>
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors"
          >
            <ImagePlus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{branding.logoUrl ? 'Replace' : 'Upload Logo'}</span>
          </button>
        </div>

        {logoError && (
          <div
            role="alert"
            className="rounded-xl bg-rose-50 border border-rose-200 p-2 flex items-start gap-2"
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-rose-800">{logoError}</p>
          </div>
        )}

        {branding.logoUrl && (
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={branding.logoUrl}
                alt={branding.logoName || 'Uploaded brand logo'}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-lg object-contain bg-slate-900/90 p-1 shrink-0"
              />
              <span className="text-xs text-slate-700 truncate">
                {branding.logoName || 'Logo'}
              </span>
            </div>
            <button
              type="button"
              onClick={onRemoveLogo}
              aria-label="Remove logo"
              className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        <StudioSlider
          label="Logo Size"
          value={branding.logoSize}
          min={32}
          max={240}
          step={4}
          displayValue={`${branding.logoSize}px`}
          onChange={(val) => onChange({ ...branding, logoSize: val })}
        />

        <PositionPicker
          label="Logo Position"
          value={branding.logoPosition}
          onChange={(pos) => onChange({ ...branding, logoPosition: pos })}
        />

        <StudioSlider
          label="Branding Opacity"
          value={branding.opacity}
          min={0.1}
          max={1.0}
          step={0.05}
          displayValue={`${Math.round(branding.opacity * 100)}%`}
          onChange={(val) => onChange({ ...branding, opacity: val })}
        />
      </div>
    </div>
  );
}
