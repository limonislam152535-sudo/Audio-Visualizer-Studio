'use client';

import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Disc3,
  FolderOpen,
  Music,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { AudioAsset } from '@/lib/types';
import { formatBytes, formatDuration } from '@/lib/studio-math';

interface AudioPanelProps {
  audio: AudioAsset | null;
  isDecoding: boolean;
  error: string | null;
  onSelectFile: (file: File) => void;
  onLoadDemoTrack: () => void;
  onRemoveAudio: () => void;
}

export function AudioPanel({
  audio,
  isDecoding,
  error,
  onSelectFile,
  onLoadDemoTrack,
  onRemoveAudio,
}: AudioPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onSelectFile(files[0]);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-sm font-semibold text-slate-900">
          Audio Source
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          All audio decoding and analysis stays locally inside your browser.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.wav,.m4a,.aac,.flac,audio/*"
        aria-label="Upload audio file"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Drag and drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-2xl border-2 border-dashed p-5 text-center transition-all ${
          isDragging
            ? 'border-sky-500 bg-sky-50/70'
            : 'border-slate-200 bg-white/60 hover:border-sky-300 hover:bg-white/80'
        }`}
      >
        <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center mx-auto mb-3">
          <Upload className="w-5 h-5 text-sky-600" aria-hidden="true" />
        </div>
        <p className="text-xs font-semibold text-slate-800">
          {isDecoding ? 'Decoding audio waveform...' : 'Drag & drop an audio file'}
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          MP3 · WAV · M4A · AAC · FLAC
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            disabled={isDecoding}
            onClick={() => inputRef.current?.click()}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <FolderOpen className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Browse Files</span>
          </button>

          <button
            type="button"
            disabled={isDecoding}
            onClick={onLoadDemoTrack}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <Disc3 className="w-3.5 h-3.5 text-sky-600" aria-hidden="true" />
            <span>Load Sample Beat</span>
          </button>
        </div>
      </div>

      {isDecoding && (
        <div
          role="status"
          className="rounded-xl bg-sky-50/80 border border-sky-200/80 p-3 flex items-center gap-2.5"
        >
          <div className="w-4 h-4 rounded-full border-2 border-sky-600 border-t-transparent animate-spin shrink-0" />
          <span className="text-xs text-sky-900 font-medium">
            Analyzing audio spectrum &amp; preparing visualizer...
          </span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-rose-800 leading-relaxed">{error}</p>
        </div>
      )}

      {/* Active audio metadata */}
      {audio && !isDecoding && (
        <div
          data-testid="active-audio-card"
          className="rounded-2xl bg-white/80 border border-slate-200/85 p-3.5 space-y-3"
        >
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100/80 flex items-center justify-center shrink-0">
              <Music className="w-4 h-4 text-sky-700" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="text-xs font-semibold text-slate-900 truncate"
                title={audio.name}
              >
                {audio.name}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 font-mono-tabular">
                <span>{formatDuration(audio.duration)}</span>
                <span aria-hidden="true">·</span>
                <span>{formatBytes(audio.size)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
            <div>
              <span className="text-slate-400 block">Sample Rate</span>
              <span className="font-mono-tabular font-medium text-slate-700">
                {(audio.sampleRate / 1000).toFixed(1)} kHz
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Channels</span>
              <span className="font-mono-tabular font-medium text-slate-700">
                {audio.numberOfChannels === 1 ? 'Mono' : 'Stereo'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <RefreshCw className="w-3 h-3" aria-hidden="true" />
              <span>Replace Audio</span>
            </button>
            <button
              type="button"
              onClick={onRemoveAudio}
              aria-label="Remove audio"
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
