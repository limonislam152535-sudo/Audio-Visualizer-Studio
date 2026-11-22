'use client';

import React, { useId } from 'react';

interface StudioSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function StudioSlider({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
  disabled = false,
}: StudioSliderProps) {
  const id = useId();

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="text-xs font-medium text-slate-700 select-none truncate"
        >
          {label}
        </label>
        <span className="text-xs font-mono-tabular text-slate-500 shrink-0">
          {displayValue ?? value.toFixed(2)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="studio-slider w-full disabled:opacity-45 disabled:cursor-not-allowed"
      />
    </div>
  );
}
