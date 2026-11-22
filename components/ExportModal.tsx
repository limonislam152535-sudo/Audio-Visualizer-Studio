'use client';

import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Film,
  Loader2,
  X,
  XCircle,
} from 'lucide-react';
import { computeExportDimensions, formatBytes, formatDuration } from '@/lib/studio-math';
import {
  AspectRatioId,
  AudioAsset,
  CodecSupportReport,
  ExportConfig,
  ExportProgressState,
} from '@/lib/types';

interface ExportModalProps {
  isOpen: boolean;
  audio: AudioAsset | null;
  aspectRatio: AspectRatioId;
  exportConfig: ExportConfig;
  supportReport: CodecSupportReport | null;
  exportState: ExportProgressState;
  onStartExport: () => void;
  onCancelExport: () => void;
  onApplySuggestedSettings: () => void;
  onClose: () => void;
}

export function ExportModal({
  isOpen,
  audio,
  aspectRatio,
  exportConfig,
  supportReport,
  exportState,
  onStartExport,
  onCancelExport,
  onApplySuggestedSettings,
  onClose,
}: ExportModalProps) {
  if (!isOpen) return null;

  const dims = computeExportDimensions(aspectRatio, exportConfig.resolution);
  const isBusy =
    exportState.phase === 'checking' ||
    exportState.phase === 'rendering' ||
    exportState.phase === 'muxing';

  const handleDownload = () => {
    if (!exportState.outputUrl || !exportState.outputFileName) return;
    const a = document.createElement('a');
    a.href = exportState.outputUrl;
    a.download = exportState.outputFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
    >
      <div className="bg-white/95 border border-white/90 w-full max-w-lg rounded-3xl p-6 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
              <Film className="w-5 h-5 text-sky-600" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="export-modal-title"
                className="font-display text-base font-bold text-slate-900"
              >
                Export MP4 Video
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Local browser rendering · No files leave your device
              </p>
            </div>
          </div>

          {!isBusy && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close export modal"
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Summary Card */}
        <div className="rounded-2xl bg-white/80 border border-slate-200/85 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block">Dimensions</span>
            <span className="font-mono-tabular font-semibold text-slate-900">
              {dims.width}×{dims.height}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Frame Rate</span>
            <span className="font-mono-tabular font-semibold text-slate-900">
              {exportConfig.fps} FPS
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Duration</span>
            <span className="font-mono-tabular font-semibold text-slate-900">
              {audio ? formatDuration(audio.duration) : '0:00'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Format</span>
            <span className="font-mono-tabular font-semibold text-slate-900">
              MP4 · {exportConfig.quality}
            </span>
          </div>
        </div>

        {/* Pre-flight Codec Check & Warnings */}
        {exportState.phase === 'idle' && supportReport && (
          <div className="space-y-3">
            {!supportReport.supported ? (
              <div
                role="alert"
                className="rounded-2xl bg-rose-50 border border-rose-200 p-4 space-y-2.5"
              >
                <div className="flex items-start gap-2.5">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-rose-900">
                      Requested export settings are not supported
                    </p>
                    <p className="text-xs text-rose-800 leading-relaxed">
                      {supportReport.blockingReason}
                    </p>
                  </div>
                </div>
                {(supportReport.suggestedResolution || supportReport.suggestedFps) && (
                  <button
                    type="button"
                    onClick={onApplySuggestedSettings}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                  >
                    Switch to {supportReport.suggestedResolution?.toUpperCase() || '1080p'} @{' '}
                    {supportReport.suggestedFps || 30} FPS
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-2xl bg-emerald-50/75 border border-emerald-200/80 p-3.5 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-xs text-emerald-900">
                  Ready to encode via WebCodecs{' '}
                  <span className="font-mono-tabular font-semibold">
                    {supportReport.videoCodec}
                  </span>
                  {supportReport.audioCodec
                    ? ` + ${supportReport.audioCodec === 'opus' ? 'Opus' : 'AAC'}`
                    : ''}
                </div>
              </div>
            )}

            {supportReport.warnings.map((w, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 leading-relaxed">{w}</p>
              </div>
            ))}
          </div>
        )}

        {/* Active Rendering Progress */}
        {isBusy && (
          <div className="rounded-2xl bg-white/85 border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Loader2 className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="text-xs font-semibold text-slate-900 truncate">
                  {exportState.statusMessage}
                </span>
              </div>
              <span className="text-xs font-mono-tabular font-bold text-sky-700 shrink-0">
                {exportState.progress}%
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full"
                style={{ width: `${exportState.progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-500">
              <span>
                Frame {exportState.currentFrame} / {exportState.totalFrames}
              </span>
              <span>
                {exportState.estimatedRemainingSeconds !== null
                  ? `~${formatDuration(exportState.estimatedRemainingSeconds)} remaining`
                  : 'Estimating time...'}
              </span>
            </div>
          </div>
        )}

        {/* Error State */}
        {exportState.phase === 'error' && (
          <div
            role="alert"
            className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-2.5"
          >
            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-rose-900">Export Failed</p>
              <p className="text-xs text-rose-800 mt-0.5">
                {exportState.errorMessage || 'An unexpected encoding error occurred.'}
              </p>
            </div>
          </div>
        )}

        {/* Cancelled State */}
        {exportState.phase === 'cancelled' && (
          <div className="rounded-2xl bg-slate-100 border border-slate-200 p-3.5 text-xs text-slate-700">
            Export was cancelled before completion. No file was generated.
          </div>
        )}

        {/* Completed State */}
        {exportState.phase === 'completed' && exportState.outputBlob && (
          <div
            data-testid="export-completed-card"
            className="rounded-2xl bg-emerald-50/85 border border-emerald-200 p-4 space-y-3"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-emerald-950">
                  Export Completed
                </h3>
                <p className="text-xs text-emerald-800">
                  Your MP4 video is ready to download.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/70 text-xs">
              <div>
                <span className="text-emerald-700/80 block">File Size</span>
                <span className="font-mono-tabular font-semibold text-emerald-950">
                  {formatBytes(exportState.outputSizeBytes || 0)}
                </span>
              </div>
              <div>
                <span className="text-emerald-700/80 block">Encoding</span>
                <span className="font-mono-tabular font-semibold text-emerald-950 truncate block">
                  {exportState.outputCodecLabel}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          {isBusy ? (
            <button
              type="button"
              onClick={onCancelExport}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
            >
              Cancel Export
            </button>
          ) : exportState.phase === 'completed' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 shadow-sm shadow-sky-600/25 transition-all"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Download Video</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!audio || !supportReport?.supported}
                onClick={onStartExport}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 shadow-sm shadow-sky-600/25 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed transition-all"
              >
                <Film className="w-4 h-4" aria-hidden="true" />
                <span>Start Rendering</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
