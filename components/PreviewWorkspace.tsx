'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Maximize2,
  Music2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { StudioAudioEngine } from '@/lib/audio-engine';
import { loadImageAsset, renderStudioFrame } from '@/lib/canvas-compositor';
import { ASPECT_RATIOS } from '@/lib/constants';
import { clampVisualizerOffset, formatDuration } from '@/lib/studio-math';
import {
  AspectRatioId,
  AudioAsset,
  BackgroundConfig,
  BrandingConfig,
  VisualizerConfig,
} from '@/lib/types';

interface PreviewWorkspaceProps {
  audioEngine: StudioAudioEngine;
  audio: AudioAsset | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  aspectRatio: AspectRatioId;
  visualizer: VisualizerConfig;
  background: BackgroundConfig;
  branding: BrandingConfig;
  onTogglePlay: () => void;
  onRestart: () => void;
  onSeek: (time: number) => void;
  onChangeVolume: (vol: number) => void;
  onChangeVisualizerOffset?: (offsetX: number, offsetY: number) => void;
  onPromptAudioUpload: () => void;
  isExporting?: boolean;
}

export function PreviewWorkspace({
  audioEngine,
  audio,
  isPlaying,
  currentTime,
  duration,
  volume,
  aspectRatio,
  visualizer,
  background,
  branding,
  onTogglePlay,
  onRestart,
  onSeek,
  onChangeVolume,
  onChangeVisualizerOffset,
  onPromptAudioUpload,
  isExporting = false,
}: PreviewWorkspaceProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stageSize, setStageSize] = useState<{ w: number; h: number }>({
    w: 720,
    h: 480,
  });
  const [zoomMode, setZoomMode] = useState<'fit' | 'manual'>('fit');
  const [manualZoom, setManualZoom] = useState<number>(1.0);
  const [prevVolume, setPrevVolume] = useState<number>(0.85);
  const [isDraggingViz, setIsDraggingViz] = useState(false);
  const dragOriginRef = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    startOffsetX: number;
    startOffsetY: number;
    width: number;
    height: number;
  } | null>(null);

  // Refs for zero-rerender 60fps animation loop
  const stateRef = useRef({
    isPlaying,
    visualizer,
    background,
    branding,
    audioTime: currentTime,
    isExporting,
  });

  useEffect(() => {
    stateRef.current = {
      isPlaying,
      visualizer,
      background,
      branding,
      audioTime: currentTime,
      isExporting,
    };
  }, [isPlaying, visualizer, background, branding, currentTime, isExporting]);

  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);

  // Preload background image cleanly
  useEffect(() => {
    let active = true;
    const url =
      (background.type === 'preset-image' || background.type === 'custom-image') &&
      background.imageUrl
        ? background.imageUrl
        : null;

    if (!url) {
      bgImageRef.current = null;
      return;
    }

    loadImageAsset(url)
      .then((img) => {
        if (active) bgImageRef.current = img;
      })
      .catch(() => {
        if (active) bgImageRef.current = null;
      });
    return () => {
      active = false;
    };
  }, [background.type, background.imageUrl]);

  // Preload logo image cleanly
  useEffect(() => {
    let active = true;
    if (!branding.logoUrl) {
      logoImageRef.current = null;
      return;
    }
    loadImageAsset(branding.logoUrl)
      .then((img) => {
        if (active) logoImageRef.current = img;
      })
      .catch(() => {
        if (active) logoImageRef.current = null;
      });
    return () => {
      active = false;
    };
  }, [branding.logoUrl]);

  // Measure available preview stage
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setStageSize({
        w: Math.max(240, Math.floor(rect.width - 32)),
        h: Math.max(200, Math.floor(rect.height - 32)),
      });
    };
    updateSize();

    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute exact proportional canvas display dimensions
  const ratioObj =
    ASPECT_RATIOS.find((r) => r.id === aspectRatio) ?? ASPECT_RATIOS[0];
  const targetAspect = ratioObj.widthRatio / ratioObj.heightRatio;
  const stageAspect = stageSize.w / Math.max(1, stageSize.h);

  let fitW: number;
  let fitH: number;
  if (targetAspect > stageAspect) {
    fitW = stageSize.w;
    fitH = Math.round(stageSize.w / targetAspect);
  } else {
    fitH = stageSize.h;
    fitW = Math.round(stageSize.h * targetAspect);
  }

  const zoomScale = zoomMode === 'fit' ? 1.0 : manualZoom;
  const displayW = Math.max(120, Math.round(fitW * zoomScale));
  const displayH = Math.max(120, Math.round(fitH * zoomScale));

  // Internal crisp rendering resolution capped cleanly for 60fps preview responsiveness
  const maxPreviewDim = 1080;
  const internalW =
    targetAspect >= 1
      ? Math.min(maxPreviewDim, Math.max(640, Math.round(maxPreviewDim)))
      : Math.max(360, Math.round(maxPreviewDim * targetAspect));
  const internalH = Math.max(360, Math.round(internalW / targetAspect));

  // Main 60 FPS requestAnimationFrame live compositor loop (paused cleanly during export)
  useEffect(() => {
    if (isExporting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const startMs = performance.now();

    const tick = (nowMs: number) => {
      rafId = requestAnimationFrame(tick);
      const {
        isPlaying: playing,
        visualizer: viz,
        background: bg,
        branding: br,
        audioTime,
        isExporting: exporting,
      } = stateRef.current;

      if (exporting) return;

      const elapsedSec = (nowMs - startMs) * 0.001;
      const animTime = playing ? audioTime || elapsedSec : elapsedSec * 0.45;
      const analysis = audioEngine.sampleLiveFrame(
        viz.smoothness,
        viz.sensitivity,
        playing,
        elapsedSec
      );

      renderStudioFrame({
        ctx,
        width: canvas.width,
        height: canvas.height,
        analysis,
        visualizer: viz,
        background: bg,
        branding: br,
        time: animTime,
        bgImage: bgImageRef.current,
        logoImage: logoImageRef.current,
      });
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [audioEngine, internalW, internalH, isExporting]);

  const handleZoomIn = () => {
    setZoomMode('manual');
    setManualZoom((z) => Math.min(1.6, Number((z + 0.15).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoomMode('manual');
    setManualZoom((z) => Math.max(0.45, Number((z - 0.15).toFixed(2))));
  };

  const handleFitScreen = () => {
    setZoomMode('fit');
    setManualZoom(1.0);
  };

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      onChangeVolume(0);
    } else {
      onChangeVolume(prevVolume > 0 ? prevVolume : 0.85);
    }
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isExporting || !onChangeVisualizerOffset || e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    canvas.setPointerCapture(e.pointerId);
    dragOriginRef.current = {
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      startOffsetX: visualizer.offsetX,
      startOffsetY: visualizer.offsetY,
      width: rect.width,
      height: rect.height,
    };
    setIsDraggingViz(true);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const origin = dragOriginRef.current;
    if (!origin || origin.pointerId !== e.pointerId || !onChangeVisualizerOffset) return;
    const dxPct = ((e.clientX - origin.clientX) / origin.width) * 100;
    const dyPct = ((e.clientY - origin.clientY) / origin.height) * 100;
    onChangeVisualizerOffset(
      Math.round(clampVisualizerOffset(origin.startOffsetX + dxPct)),
      Math.round(clampVisualizerOffset(origin.startOffsetY + dyPct))
    );
  };

  const handleCanvasPointerEnd = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const origin = dragOriginRef.current;
    if (!origin || origin.pointerId !== e.pointerId) return;
    dragOriginRef.current = null;
    setIsDraggingViz(false);
    if (canvasRef.current?.hasPointerCapture(e.pointerId)) {
      canvasRef.current.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <main className="flex-1 flex flex-col gap-3 min-w-0 min-h-0">
      {/* Top Preview Stage Toolbar */}
      <div className="liquid-glass rounded-2xl px-4 py-2 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2.5 text-xs text-slate-600 min-w-0">
          <span className="font-semibold text-slate-800 whitespace-nowrap">
            Live Preview
          </span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span className="font-mono-tabular text-slate-500 whitespace-nowrap">
            {aspectRatio}
          </span>
          {(visualizer.offsetX !== 0 || visualizer.offsetY !== 0) && (
            <>
              <span aria-hidden="true" className="text-slate-300 hidden sm:inline">
                ·
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 font-mono-tabular text-[11px] text-slate-600 whitespace-nowrap">
                <span>
                  Pos {visualizer.offsetX > 0 ? '+' : ''}
                  {Math.round(visualizer.offsetX)}%, {visualizer.offsetY > 0 ? '+' : ''}
                  {Math.round(visualizer.offsetY)}%
                </span>
                {onChangeVisualizerOffset && (
                  <button
                    type="button"
                    onClick={() => onChangeVisualizerOffset(0, 0)}
                    className="text-sky-600 hover:text-sky-700 font-sans font-semibold underline underline-offset-2"
                  >
                    Center
                  </button>
                )}
              </span>
            </>
          )}
          {!audio && (
            <>
              <span aria-hidden="true" className="text-slate-300 hidden sm:inline">
                ·
              </span>
              <button
                type="button"
                onClick={onPromptAudioUpload}
                className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700 truncate"
              >
                <Music2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Upload or load sample audio to sync</span>
              </button>
            </>
          )}
        </div>

        {/* Zoom & Fit Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="Zoom out preview"
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <span className="text-xs font-mono-tabular text-slate-600 w-11 text-center">
            {Math.round(zoomScale * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label="Zoom in preview"
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleFitScreen}
            className={`ml-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
              zoomMode === 'fit'
                ? 'bg-sky-50 text-sky-700 border border-sky-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Maximize2 className="w-3 h-3" aria-hidden="true" />
            <span>Fit</span>
          </button>
        </div>
      </div>

      {/* Center Canvas Stage */}
      <div
        ref={stageRef}
        className="liquid-glass-subtle rounded-2xl flex-1 min-h-[280px] flex items-center justify-center overflow-auto p-4 relative"
      >
        <div
          className="rounded-xl overflow-hidden shadow-[0_24px_60px_-15px_rgba(15,23,42,0.38)] ring-1 ring-slate-900/15 bg-black transition-[width,height] duration-200 ease-out shrink-0"
          style={{ width: `${displayW}px`, height: `${displayH}px` }}
        >
          <canvas
            ref={canvasRef}
            width={internalW}
            height={internalH}
            data-testid="studio-preview-canvas"
            data-aspect-ratio={aspectRatio}
            data-template-id={visualizer.templateId}
            data-playing={isPlaying ? 'true' : 'false'}
            data-offset-x={visualizer.offsetX}
            data-offset-y={visualizer.offsetY}
            title="Drag on canvas to reposition audio visualizer"
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerEnd}
            onPointerCancel={handleCanvasPointerEnd}
            className={`w-full h-full block touch-none ${
              onChangeVisualizerOffset
                ? isDraggingViz
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
                : ''
            }`}
          />
        </div>
      </div>

      {/* Audio Playback & Timeline Transport Bar */}
      <div className="liquid-glass rounded-2xl px-3 sm:px-4 py-2.5 flex flex-wrap xl:flex-nowrap items-center justify-between gap-2.5 xl:gap-4 shrink-0">
        <div className="flex items-center gap-1.5 shrink-0 order-1">
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={!audio}
            aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
            className="w-9 h-9 rounded-xl bg-sky-600 text-white hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center shadow-sm shadow-sky-600/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={onRestart}
            disabled={!audio}
            aria-label="Restart playback"
            title="Restart"
            className="w-8 h-8 rounded-xl border border-slate-200/90 bg-white/80 text-slate-700 hover:bg-white disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Timeline Scrubber */}
        <div className="order-3 xl:order-2 w-full xl:w-auto xl:flex-1 flex items-center gap-2.5 min-w-0">
          <span
            className="text-xs font-mono-tabular text-slate-600 w-9 text-right shrink-0"
            data-testid="playback-current-time"
          >
            {formatDuration(currentTime)}
          </span>
          <input
            type="range"
            aria-label="Audio playback timeline"
            min={0}
            max={Math.max(0.1, duration)}
            step={0.05}
            value={Math.min(currentTime, duration || 0)}
            disabled={!audio}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="studio-slider flex-1 min-w-0 disabled:opacity-40"
          />
          <span
            className="text-xs font-mono-tabular text-slate-500 w-9 shrink-0"
            data-testid="playback-total-duration"
          >
            {formatDuration(duration)}
          </span>
        </div>

        {/* Volume */}
        <div className="order-2 xl:order-3 flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={volume === 0 ? 'Unmute audio' : 'Mute audio'}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
          >
            {volume === 0 ? (
              <VolumeX className="w-4 h-4 text-slate-400" aria-hidden="true" />
            ) : (
              <Volume2 className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
          <input
            type="range"
            aria-label="Audio volume"
            min={0}
            max={1}
            step={0.02}
            value={volume}
            onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
            className="studio-slider w-20"
          />
        </div>
      </div>
    </main>
  );
}
