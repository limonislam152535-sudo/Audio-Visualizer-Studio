'use client';

import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Check,
  Clock,
  LogIn,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { formatBytes, formatDuration } from '@/lib/studio-math';
import { UserHistoryEntry } from '@/lib/types';

interface HistoryModalProps {
  isOpen: boolean;
  user: User | null;
  items: UserHistoryEntry[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onOpenAuth: () => void;
  onApplyPreset: (entry: UserHistoryEntry) => void;
  onDeleteItem: (id: string) => Promise<void>;
}

export function HistoryModal({
  isOpen,
  user,
  items,
  loading,
  error,
  onClose,
  onOpenAuth,
  onApplyPreset,
  onDeleteItem,
}: HistoryModalProps) {
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApply = (entry: UserHistoryEntry) => {
    onApplyPreset(entry);
    setAppliedId(entry.id);
    window.setTimeout(() => {
      setAppliedId((prev) => (prev === entry.id ? null : prev));
    }, 1500);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteItem(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
    >
      <div className="bg-white/95 border border-white/90 w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl p-6 space-y-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-sky-600" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="history-modal-title"
                className="font-display text-base font-bold text-slate-900"
              >
                Export History
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Saved visualizer presets &amp; MP4 render logs for your account
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close export history"
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Local-Only Privacy Notice */}
        <div className="rounded-2xl bg-sky-50/75 border border-sky-100 px-3.5 py-2.5 flex items-center gap-2.5 shrink-0">
          <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" aria-hidden="true" />
          <p className="text-[11px] text-sky-900 leading-relaxed">
            Uploaded audio files are processed locally via Web APIs and cleared when you
            close the tab. Only export settings metadata is stored in Firebase.
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto studio-scroll space-y-2.5 pr-1">
          {!user ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-900">
                Sign in to save &amp; view your export history
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                You can still upload audio and export MP4 videos without an account. Sign
                in with Email or Google whenever you want to keep a log of your renders.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 shadow-sm shadow-sky-600/20 transition-all"
              >
                <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sign In or Create Account</span>
              </button>
            </div>
          ) : error ? (
            <div
              role="alert"
              className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800"
            >
              Unable to load history right now. Please check your connection or rules.
            </div>
          ) : loading ? (
            <div className="py-10 text-center text-xs text-slate-500">
              Loading your studio history...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center space-y-1.5">
              <p className="text-sm font-semibold text-slate-900">No export history yet</p>
              <p className="text-xs text-slate-500">
                Export an MP4 video while signed in and it will appear here automatically.
              </p>
            </div>
          ) : (
            items.map((entry) => {
              const dateText = new Date(entry.createdAtMs).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              });
              const hasOffset = entry.offsetX !== 0 || entry.offsetY !== 0;

              return (
                <div
                  key={entry.id}
                  data-testid="history-entry-card"
                  className="rounded-2xl bg-white border border-slate-200/90 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-900 truncate max-w-[260px]">
                        {entry.audioFileName}
                      </span>
                      <span className="text-[11px] font-mono-tabular text-slate-500">
                        {formatDuration(entry.audioDurationSec)}
                      </span>
                      <span className="text-[11px] text-slate-400">·</span>
                      <span className="text-[11px] text-slate-500">{dateText}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600">
                      <span className="font-medium text-sky-700">{entry.templateName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        {entry.aspectRatio} ({entry.outputWidth}×{entry.outputHeight})
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">{entry.fps}fps</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        {formatBytes(entry.outputSizeBytes)}
                      </span>
                      {hasOffset && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular text-slate-700">
                            Pos ({entry.offsetX > 0 ? '+' : ''}
                            {Math.round(entry.offsetX)}%, {entry.offsetY > 0 ? '+' : ''}
                            {Math.round(entry.offsetY)}%)
                          </span>
                        </>
                      )}
                      <span className="inline-flex items-center gap-1 ml-1">
                        {[entry.primaryColor, entry.secondaryColor, entry.accentColor].map(
                          (c, idx) => (
                            <span
                              key={idx}
                              className="w-2.5 h-2.5 rounded-full border border-slate-300/70"
                              style={{ backgroundColor: c }}
                            />
                          )
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleApply(entry)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/80 hover:bg-sky-100 transition-colors"
                    >
                      {appliedId === entry.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Applied</span>
                        </>
                      ) : (
                        <>
                          <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Apply Preset</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={deletingId === entry.id}
                      onClick={() => void handleDelete(entry.id)}
                      aria-label={`Delete history item ${entry.audioFileName}`}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
