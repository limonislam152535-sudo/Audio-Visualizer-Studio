'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { ASPECT_RATIOS } from '@/lib/constants';
import { computeExportDimensions } from '@/lib/studio-math';
import { AspectRatioId, ExportResolutionId } from '@/lib/types';

interface AspectRatioPanelProps {
  selectedRatio: AspectRatioId;
  resolution: ExportResolutionId;
  onSelectRatio: (ratio: AspectRatioId) => void;
}

export function AspectRatioPanel({
  selectedRatio,
  resolution,
  onSelectRatio,
}: AspectRatioPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-sm font-semibold text-slate-900">
          Canvas &amp; Aspect Ratio
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Select frame proportions. Branding &amp; visualizers adapt automatically.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {ASPECT_RATIOS.map((ratio) => {
          const isSelected = selectedRatio === ratio.id;
          const dims = computeExportDimensions(ratio.id, resolution);
          const maxBox = 30;
          const aspect = ratio.widthRatio / ratio.heightRatio;
          const iconW = aspect >= 1 ? maxBox : Math.round(maxBox * aspect);
          const iconH = aspect >= 1 ? Math.round(maxBox / aspect) : maxBox;

          return (
            <button
              key={ratio.id}
              type="button"
              onClick={() => onSelectRatio(ratio.id)}
              aria-pressed={isSelected}
              className={`rounded-2xl p-3 border text-left transition-all flex flex-col justify-between gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                isSelected
                  ? 'bg-white border-sky-500 shadow-sm shadow-sky-500/10'
                  : 'bg-white/65 border-slate-200/80 hover:bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100/80">
                  <div
                    className={`rounded-[3px] border-2 transition-colors ${
                      isSelected
                        ? 'border-sky-600 bg-sky-100/60'
                        : 'border-slate-400 bg-white'
                    }`}
                    style={{
                      width: `${Math.max(10, iconW)}px`,
                      height: `${Math.max(10, iconH)}px`,
                    }}
                    aria-hidden="true"
                  />
                </div>
                {isSelected && (
                  <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center">
                    <Check className="w-3 h-3" aria-hidden="true" />
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="font-display text-sm font-bold text-slate-900">
                    {ratio.label}
                  </span>
                  <span className="text-[10px] font-mono-tabular text-slate-500">
                    {dims.width}×{dims.height}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                  {ratio.usage}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
