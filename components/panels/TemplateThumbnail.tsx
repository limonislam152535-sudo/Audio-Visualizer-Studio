'use client';

import React, { useEffect, useRef } from 'react';
import { DEFAULT_VISUALIZER_CONFIG } from '@/lib/constants';
import { AudioAnalysisFrame, VisualizerTemplateMeta } from '@/lib/types';
import { renderVisualizerTemplate } from '@/lib/visualizers';

interface TemplateThumbnailProps {
  template: VisualizerTemplateMeta;
  isSelected: boolean;
}

export function TemplateThumbnail({ template, isSelected }: TemplateThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 180;
    const h = 104;
    canvas.width = w;
    canvas.height = h;

    const bins = new Float32Array(128);
    const wave = new Float32Array(256);

    let rafId = 0;
    let isVisible = false;

    const drawSampleFrame = (timeSec: number) => {
      for (let i = 0; i < 128; i++) {
        const n = i / 128;
        bins[i] =
          (0.28 +
            0.34 * Math.sin(n * Math.PI * 3.5 - timeSec * 2.6) +
            0.22 * Math.cos(n * Math.PI * 8 + timeSec * 1.9)) *
          Math.max(0.2, 1 - n * 0.55);
        bins[i] = Math.max(0.04, Math.min(1, bins[i]));
      }
      for (let i = 0; i < 256; i++) {
        const n = i / 256;
        wave[i] =
          0.35 * Math.sin(n * Math.PI * 4 + timeSec * 3.2) +
          0.18 * Math.cos(n * Math.PI * 10 - timeSec * 2.4);
      }

      const analysis: AudioAnalysisFrame = {
        frequencyData: bins,
        waveformData: wave,
        bass: 0.45 + 0.25 * Math.sin(timeSec * 3.2),
        mid: 0.42 + 0.2 * Math.cos(timeSec * 2.4),
        treble: 0.35 + 0.18 * Math.sin(timeSec * 4.1),
        energy: 0.44,
        peakBass: 0.62,
      };

      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, w, h);

      renderVisualizerTemplate({
        ctx,
        width: w,
        height: h,
        analysis,
        config: {
          ...DEFAULT_VISUALIZER_CONFIG,
          templateId: template.id,
          primaryColor: template.defaultColors.primary,
          secondaryColor: template.defaultColors.secondary,
          accentColor: template.defaultColors.accent,
        },
        time: timeSec,
      });
    };

    // Draw initial crisp frame immediately
    drawSampleFrame(1.2);

    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? false;
      },
      { threshold: 0.1 }
    );
    observer.observe(canvas);

    let lastTick = 0;
    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop);
      if (!isVisible) return;
      // Throttle thumbnail animation to ~20 FPS for crisp lightness
      if (now - lastTick < 48) return;
      lastTick = now;
      drawSampleFrame(now * 0.001 + (isSelected ? 0.5 : 0));
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [template, isSelected]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-[88px] rounded-xl block bg-[#050811]"
      aria-hidden="true"
    />
  );
}
