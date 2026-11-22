'use client';

import React from 'react';
import type { User } from 'firebase/auth';
import {
  AudioWaveform,
  Clock,
  Download,
  FilePlus2,
  LogIn,
  Pause,
  Play,
  UserCircle2,
} from 'lucide-react';
import { AspectRatioId, AudioAsset, ExportConfig } from '@/lib/types';
import { formatDuration } from '@/lib/studio-math';

interface TopNavProps {
  audio: AudioAsset | null;
  aspectRatio: AspectRatioId;
  exportConfig: ExportConfig;
  isPlaying: boolean;
  canExport: boolean;
  user: User | null;
  historyCount: number;
  onTogglePlay: () => void;
  onNewProject: () => void;
  onOpenExport: () => void;
  onOpenHistory: () => void;
  onOpenAuth: () => void;
}

export function TopNav({
  audio,
  aspectRatio,
  exportConfig,
  isPlaying,
  canExport,
  user,
  historyCount,
  onTogglePlay,
  onNewProject,
  onOpenExport,
  onOpenHistory,
  onOpenAuth,
}: TopNavProps) {
  const resolutionLabel =
    exportConfig.resolution === '4k'
      ? '4K'
      : exportConfig.resolution === '2k'
        ? '2K'
        : '1080p';

  return (
    <header className="liquid-glass mx-3 mt-3 px-3 sm:px-4 py-2.5 rounded-2xl flex items-center justify-between gap-2 sm:gap-4 shrink-0 z-20">
      {/* Zone 1: Brand Title */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-sm shadow-sky-500/25 shrink-0">
          <AudioWaveform className="w-4 h-4 text-white" aria-hidden="true" />
        </div>
        <span className="font-display text-sm sm:text-base font-bold tracking-tight text-slate-900 truncate">
          Audio Visualizer Studio
        </span>
      </div>

      {/* Zone 2: Project Status & New Project */}
      <div className="hidden md:flex items-center gap-4 lg:gap-5 min-w-0">
        <button
          type="button"
          onClick={onNewProject}
          className="inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-900/5 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <FilePlus2 className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
          <span>New Project</span>
        </button>

        <div className="h-4 w-px bg-slate-200/90" aria-hidden="true" />

        <div
          className="flex items-center gap-2 text-xs text-slate-500 min-w-0"
          data-testid="project-status-summary"
        >
          <span className="truncate max-w-[140px] lg:max-w-[200px] font-medium text-slate-700">
            {audio ? audio.name : 'No audio loaded'}
          </span>
          {audio && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular whitespace-nowrap shrink-0">
                {formatDuration(audio.duration)}
              </span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular whitespace-nowrap shrink-0">
            {aspectRatio}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular whitespace-nowrap shrink-0">
            {resolutionLabel} {exportConfig.fps}fps
          </span>
        </div>
      </div>

      {/* Zone 3: History, Account, Preview Quick Toggle & Primary Export Action */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenHistory}
          aria-label="Export History"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border border-slate-200/90 bg-white/80 text-slate-700 hover:bg-white hover:text-slate-900 transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <Clock className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
          <span className="hidden sm:inline">History</span>
          {user && historyCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-md bg-sky-100 text-sky-700 font-mono-tabular text-[10px] font-semibold">
              {historyCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenAuth}
          aria-label={user ? 'Studio Account' : 'Sign In'}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border border-slate-200/90 bg-white/80 text-slate-700 hover:bg-white hover:text-slate-900 transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          {user ? (
            <>
              <UserCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              <span className="hidden md:inline max-w-[100px] truncate">
                {user.displayName || user.email?.split('@')[0] || 'Account'}
              </span>
            </>
          ) : (
            <>
              <LogIn className="w-3.5 h-3.5 text-sky-600" aria-hidden="true" />
              <span className="hidden sm:inline">Sign In</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onTogglePlay}
          disabled={!audio}
          aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200/90 bg-white/80 text-slate-700 hover:bg-white hover:text-slate-900 disabled:opacity-45 disabled:cursor-not-allowed transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 text-sky-600" aria-hidden="true" />
          ) : (
            <Play className="w-3.5 h-3.5 text-sky-600" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">{isPlaying ? 'Pause' : 'Preview'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenExport}
          disabled={!canExport}
          aria-label="Export Video"
          title={
            canExport
              ? 'Configure and export MP4 video'
              : 'Upload an audio file first to enable video export'
          }
          className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 shadow-sm shadow-sky-600/25 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          <span>
            Export<span className="hidden sm:inline"> Video</span>
          </span>
        </button>
      </div>
    </header>
  );
}
