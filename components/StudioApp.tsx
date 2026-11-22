'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { MotionConfig } from 'motion/react';
import { StudioAudioEngine } from '@/lib/audio-engine';
import {
  DEFAULT_BACKGROUND_CONFIG,
  DEFAULT_BRANDING_CONFIG,
  DEFAULT_EXPORT_CONFIG,
  DEFAULT_VISUALIZER_CONFIG,
  VISUALIZER_TEMPLATES,
} from '@/lib/constants';
import { auth } from '@/lib/firebase';
import {
  deleteExportHistoryEntry,
  saveExportHistoryEntry,
  subscribeToUserHistory,
  upsertUserProfile,
} from '@/lib/firebase-history';
import { createDemoTrackWavFile } from '@/lib/sample-audio';
import { validateAudioFile } from '@/lib/studio-math';
import {
  AspectRatioId,
  AudioAsset,
  BackgroundConfig,
  BrandingConfig,
  CodecSupportReport,
  ExportConfig,
  ExportProgressState,
  LeftSidebarTab,
  UserHistoryEntry,
  VisualizerConfig,
  VisualizerTemplateId,
} from '@/lib/types';
import {
  checkExportCapabilities,
  exportStudioVideoToMp4,
} from '@/lib/video-exporter';
import { AuthModal } from './AuthModal';
import { ExportModal } from './ExportModal';
import { HistoryModal } from './HistoryModal';
import { LeftSidebar } from './LeftSidebar';
import { PreviewWorkspace } from './PreviewWorkspace';
import { RightSidebar } from './RightSidebar';
import { TopNav } from './TopNav';

const INITIAL_EXPORT_STATE: ExportProgressState = {
  phase: 'idle',
  progress: 0,
  currentFrame: 0,
  totalFrames: 0,
  statusMessage: '',
  estimatedRemainingSeconds: null,
  errorMessage: null,
  outputBlob: null,
  outputUrl: null,
  outputFileName: null,
  outputSizeBytes: null,
  outputWidth: null,
  outputHeight: null,
  outputFps: null,
  outputCodecLabel: null,
  fallbackNotice: null,
};

export function StudioApp() {
  const [audioEngine] = useState<StudioAudioEngine>(() => new StudioAudioEngine());
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const exportAbortRef = useRef<AbortController | null>(null);

  // Studio Core State (Session-only in memory; zero persistence per privacy rules)
  const [leftTab, setLeftTab] = useState<LeftSidebarTab>('audio');
  const [audio, setAudio] = useState<AudioAsset | null>(null);
  const [isDecodingAudio, setIsDecodingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.85);

  const [aspectRatio, setAspectRatio] = useState<AspectRatioId>('16:9');
  const [visualizer, setVisualizer] = useState<VisualizerConfig>(
    DEFAULT_VISUALIZER_CONFIG
  );
  const [background, setBackground] = useState<BackgroundConfig>(
    DEFAULT_BACKGROUND_CONFIG
  );
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING_CONFIG);
  const [exportConfig, setExportConfig] = useState<ExportConfig>(
    DEFAULT_EXPORT_CONFIG
  );

  // Responsive drawer toggle for smaller viewports (<1024px)
  const [mobileSection, setMobileSection] = useState<'preview' | 'design' | 'export'>(
    'preview'
  );

  // Modals & Firebase Auth / History State
  const [showNewProjectConfirm, setShowNewProjectConfirm] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [historyItems, setHistoryItems] = useState<UserHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [supportReport, setSupportReport] = useState<CodecSupportReport | null>(
    null
  );
  const [exportState, setExportState] =
    useState<ExportProgressState>(INITIAL_EXPORT_STATE);

  // Object URL cleanup helpers
  const audioUrlRef = useRef<string | null>(null);
  const bgUrlRef = useRef<string | null>(null);
  const logoUrlRef = useRef<string | null>(null);
  const exportUrlRef = useRef<string | null>(null);

  const revokeUrl = (ref: React.MutableRefObject<string | null>) => {
    if (ref.current) {
      URL.revokeObjectURL(ref.current);
      ref.current = null;
    }
  };

  useEffect(() => {
    const clearEphemeralSessionMedia = () => {
      revokeUrl(audioUrlRef);
      revokeUrl(bgUrlRef);
      revokeUrl(logoUrlRef);
      revokeUrl(exportUrlRef);
      audioEngine.dispose();
    };
    window.addEventListener('beforeunload', clearEphemeralSessionMedia);
    return () => {
      window.removeEventListener('beforeunload', clearEphemeralSessionMedia);
      clearEphemeralSessionMedia();
    };
  }, [audioEngine]);

  // Firebase Auth & Firestore User History Subscription
  useEffect(() => {
    let unsubscribeHistory: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeHistory) {
        unsubscribeHistory();
        unsubscribeHistory = null;
      }

      setAuthUser(user);
      if (!user) {
        setHistoryItems([]);
        setHistoryLoading(false);
        setHistoryError(null);
        return;
      }

      setHistoryLoading(true);
      setHistoryError(null);
      void upsertUserProfile(user).catch((err) => {
        console.error('Failed to sync user profile:', err);
      });

      unsubscribeHistory = subscribeToUserHistory(
        user.uid,
        (items) => {
          setHistoryItems(items);
          setHistoryLoading(false);
          setHistoryError(null);
        },
        (err) => {
          setHistoryLoading(false);
          setHistoryError(err.message);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeHistory) unsubscribeHistory();
    };
  }, []);

  // Audio playback event sync
  const attachAudioPlayback = useCallback(
    (objectUrl: string, vol: number) => {
      const el = audioEngine.attachMediaElement(objectUrl, vol);
      audioElRef.current = el;

      el.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        el.currentTime = 0;
      };
      el.ontimeupdate = () => {
        setCurrentTime(el.currentTime);
      };
      el.onpause = () => setIsPlaying(false);
      el.onplay = () => setIsPlaying(true);
    },
    [audioEngine]
  );

  const loadAudioFile = useCallback(
    async (file: File, isDemo = false) => {
      const check = validateAudioFile(file);
      if (!check.valid) {
        setAudioError(check.error || 'Invalid audio file.');
        return;
      }

      setAudioError(null);
      setIsDecodingAudio(true);
      setIsPlaying(false);
      setCurrentTime(0);

      try {
        const decoded = await audioEngine.decodeAudioFile(file);

        revokeUrl(audioUrlRef);
        const objectUrl = URL.createObjectURL(file);
        audioUrlRef.current = objectUrl;

        attachAudioPlayback(objectUrl, volume);

        setAudio({
          file,
          objectUrl,
          name: file.name,
          size: file.size,
          duration: decoded.duration,
          sampleRate: decoded.sampleRate,
          numberOfChannels: decoded.numberOfChannels,
          mimeType: file.type || 'audio/wav',
          audioBuffer: decoded,
          isDemo,
        });
      } catch {
        setAudioError(
          'This audio file could not be decoded by your browser. Try MP3, WAV, M4A, or AAC.'
        );
      } finally {
        setIsDecodingAudio(false);
      }
    },
    [attachAudioPlayback, audioEngine, volume]
  );

  const handleLoadDemoTrack = useCallback(() => {
    const demoFile = createDemoTrackWavFile(12);
    void loadAudioFile(demoFile, true);
  }, [loadAudioFile]);

  const handleRemoveAudio = useCallback(() => {
    audioEngine.detachMediaElement();
    audioElRef.current = null;
    revokeUrl(audioUrlRef);
    setAudio(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setAudioError(null);
  }, [audioEngine]);

  const handleTogglePlay = useCallback(async () => {
    const el = audioElRef.current;
    if (!el || !audio) return;
    await audioEngine.resumeContext();
    if (el.paused) {
      await el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [audio, audioEngine]);

  const handleRestart = useCallback(async () => {
    const el = audioElRef.current;
    if (!el || !audio) return;
    await audioEngine.resumeContext();
    el.currentTime = 0;
    setCurrentTime(0);
    await el.play().catch(() => {});
  }, [audio, audioEngine]);

  const handleSeek = useCallback((time: number) => {
    const el = audioElRef.current;
    if (!el) return;
    el.currentTime = time;
    setCurrentTime(time);
  }, []);

  const handleChangeVolume = useCallback(
    (vol: number) => {
      setVolume(vol);
      audioEngine.setVolume(vol);
    },
    [audioEngine]
  );

  const handleSelectTemplate = useCallback((id: VisualizerTemplateId) => {
    const meta = VISUALIZER_TEMPLATES.find((t) => t.id === id);
    setVisualizer((prev) => ({
      ...prev,
      templateId: id,
      ...(meta
        ? {
            primaryColor: meta.defaultColors.primary,
            secondaryColor: meta.defaultColors.secondary,
            accentColor: meta.defaultColors.accent,
          }
        : {}),
    }));
  }, []);

  const handleResetVisualizer = useCallback(() => {
    const meta = VISUALIZER_TEMPLATES.find((t) => t.id === visualizer.templateId);
    setVisualizer({
      ...DEFAULT_VISUALIZER_CONFIG,
      templateId: visualizer.templateId,
      ...(meta
        ? {
            primaryColor: meta.defaultColors.primary,
            secondaryColor: meta.defaultColors.secondary,
            accentColor: meta.defaultColors.accent,
          }
        : {}),
    });
  }, [visualizer.templateId]);

  const handleChangeVisualizerOffset = useCallback(
    (offsetX: number, offsetY: number) => {
      setVisualizer((prev) => ({
        ...prev,
        offsetX,
        offsetY,
      }));
    },
    []
  );

  const handleApplyHistoryPreset = useCallback((entry: UserHistoryEntry) => {
    setAspectRatio(entry.aspectRatio);
    setVisualizer((prev) => ({
      ...prev,
      templateId: entry.templateId,
      primaryColor: entry.primaryColor,
      secondaryColor: entry.secondaryColor,
      accentColor: entry.accentColor,
      offsetX: entry.offsetX,
      offsetY: entry.offsetY,
    }));
    setExportConfig((prev) => ({
      ...prev,
      resolution: entry.resolution,
      fps: entry.fps,
      quality: entry.quality,
    }));
  }, []);

  const handleDeleteHistoryItem = useCallback(
    async (id: string) => {
      if (!authUser) return;
      await deleteExportHistoryEntry(authUser.uid, id);
    },
    [authUser]
  );

  const handleUploadBackgroundImage = useCallback((file: File) => {
    revokeUrl(bgUrlRef);
    const url = URL.createObjectURL(file);
    bgUrlRef.current = url;
    setBackground((prev) => ({
      ...prev,
      type: 'custom-image',
      imageUrl: url,
      imageName: file.name,
      presetId: null,
    }));
  }, []);

  const handleResetBackground = useCallback(() => {
    revokeUrl(bgUrlRef);
    setBackground(DEFAULT_BACKGROUND_CONFIG);
  }, []);

  const handleUploadLogo = useCallback((file: File) => {
    revokeUrl(logoUrlRef);
    const url = URL.createObjectURL(file);
    logoUrlRef.current = url;
    setBranding((prev) => ({
      ...prev,
      visible: true,
      logoUrl: url,
      logoName: file.name,
    }));
  }, []);

  const handleRemoveLogo = useCallback(() => {
    revokeUrl(logoUrlRef);
    setBranding((prev) => ({
      ...prev,
      logoUrl: null,
      logoName: null,
    }));
  }, []);

  const handleConfirmNewProject = useCallback(() => {
    handleRemoveAudio();
    revokeUrl(bgUrlRef);
    revokeUrl(logoUrlRef);
    revokeUrl(exportUrlRef);
    setAspectRatio('16:9');
    setVisualizer(DEFAULT_VISUALIZER_CONFIG);
    setBackground(DEFAULT_BACKGROUND_CONFIG);
    setBranding(DEFAULT_BRANDING_CONFIG);
    setExportConfig(DEFAULT_EXPORT_CONFIG);
    setExportState(INITIAL_EXPORT_STATE);
    setShowNewProjectConfirm(false);
    setLeftTab('audio');
  }, [handleRemoveAudio]);

  const handleOpenExport = useCallback(async () => {
    if (!audio) return;
    // Pause live preview playback while exporting
    if (audioElRef.current && !audioElRef.current.paused) {
      audioElRef.current.pause();
    }
    revokeUrl(exportUrlRef);
    setExportState({ ...INITIAL_EXPORT_STATE, phase: 'checking' });
    setIsExportModalOpen(true);

    const report = await checkExportCapabilities(aspectRatio, exportConfig, audio);
    setSupportReport(report);
    setExportState(INITIAL_EXPORT_STATE);
  }, [aspectRatio, audio, exportConfig]);

  const handleApplySuggestedSettings = useCallback(async () => {
    if (!supportReport) return;
    const nextConfig: ExportConfig = {
      ...exportConfig,
      resolution: supportReport.suggestedResolution || '1080p',
      fps: supportReport.suggestedFps || 30,
    };
    setExportConfig(nextConfig);
    const report = await checkExportCapabilities(aspectRatio, nextConfig, audio);
    setSupportReport(report);
  }, [aspectRatio, audio, exportConfig, supportReport]);

  const handleStartExport = useCallback(async () => {
    if (!audio || !supportReport?.supported) return;

    const controller = new AbortController();
    exportAbortRef.current = controller;
    revokeUrl(exportUrlRef);

    setExportState({
      ...INITIAL_EXPORT_STATE,
      phase: 'rendering',
      statusMessage: 'Initializing local MP4 encoder...',
    });

    try {
      const result = await exportStudioVideoToMp4({
        audio,
        aspectRatio,
        exportConfig,
        visualizer,
        background,
        branding,
        supportReport,
        signal: controller.signal,
        onProgress: (info) => {
          setExportState((prev) => ({
            ...prev,
            phase: info.phase,
            progress: info.progress,
            currentFrame: info.currentFrame,
            totalFrames: info.totalFrames,
            statusMessage: info.statusMessage,
            estimatedRemainingSeconds: info.estimatedRemainingSeconds,
          }));
        },
      });

      const outUrl = URL.createObjectURL(result.blob);
      exportUrlRef.current = outUrl;

      setExportState({
        phase: 'completed',
        progress: 100,
        currentFrame: Math.ceil(audio.duration * result.fps),
        totalFrames: Math.ceil(audio.duration * result.fps),
        statusMessage: 'Export completed',
        estimatedRemainingSeconds: 0,
        errorMessage: null,
        outputBlob: result.blob,
        outputUrl: outUrl,
        outputFileName: result.fileName,
        outputSizeBytes: result.blob.size,
        outputWidth: result.width,
        outputHeight: result.height,
        outputFps: result.fps,
        outputCodecLabel: result.codecLabel,
        fallbackNotice: null,
      });

      if (authUser) {
        void saveExportHistoryEntry(authUser, {
          audioFileName: audio.name,
          audioDurationSec: audio.duration,
          audioSampleRate: audio.sampleRate,
          aspectRatio,
          resolution: exportConfig.resolution,
          fps:
            result.fps === 24 ||
            result.fps === 30 ||
            result.fps === 50 ||
            result.fps === 60
              ? result.fps
              : exportConfig.fps,
          quality: exportConfig.quality,
          outputWidth: result.width,
          outputHeight: result.height,
          outputSizeBytes: result.blob.size,
          codecLabel: result.codecLabel,
          visualizer,
          backgroundType: background.type,
        }).catch((err) => {
          console.error('Failed to record export history:', err);
        });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setExportState({
          ...INITIAL_EXPORT_STATE,
          phase: 'cancelled',
        });
      } else {
        setExportState({
          ...INITIAL_EXPORT_STATE,
          phase: 'error',
          errorMessage:
            err instanceof Error
              ? err.message
              : 'Video encoding failed. Try lowering resolution or frame rate.',
        });
      }
    } finally {
      exportAbortRef.current = null;
    }
  }, [
    aspectRatio,
    audio,
    authUser,
    background,
    branding,
    exportConfig,
    supportReport,
    visualizer,
  ]);

  const handleCancelExport = useCallback(() => {
    exportAbortRef.current?.abort();
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="h-screen w-screen overflow-hidden flex flex-col">
        <TopNav
          audio={audio}
          aspectRatio={aspectRatio}
          exportConfig={exportConfig}
          isPlaying={isPlaying}
          canExport={Boolean(audio && !isDecodingAudio)}
          user={authUser}
          historyCount={historyItems.length}
          onTogglePlay={() => void handleTogglePlay()}
          onNewProject={() => setShowNewProjectConfirm(true)}
          onOpenExport={() => void handleOpenExport()}
          onOpenHistory={() => setIsHistoryModalOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />

        {/* Mobile/Tablet section switcher (<1024px) */}
        <div className="lg:hidden mx-3 mt-2 p-1 rounded-xl liquid-glass grid grid-cols-3 gap-1 shrink-0">
          {(
            [
              { id: 'design', label: 'Design' },
              { id: 'preview', label: 'Preview' },
              { id: 'export', label: 'Properties' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMobileSection(item.id)}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                mobileSection === item.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Main 3-Panel Studio Workspace */}
        <div className="flex-1 min-h-0 p-3 flex flex-col lg:flex-row gap-3">
          <div
            className={`${
              mobileSection === 'design' ? 'flex' : 'hidden'
            } lg:flex min-h-0 shrink-0`}
          >
            <LeftSidebar
              activeTab={leftTab}
              onSelectTab={setLeftTab}
              audio={audio}
              isDecodingAudio={isDecodingAudio}
              audioError={audioError}
              onSelectAudioFile={(f) => void loadAudioFile(f, false)}
              onLoadDemoTrack={handleLoadDemoTrack}
              onRemoveAudio={handleRemoveAudio}
              selectedTemplateId={visualizer.templateId}
              onSelectTemplate={handleSelectTemplate}
              background={background}
              onChangeBackground={setBackground}
              onUploadBackgroundImage={handleUploadBackgroundImage}
              onResetBackground={handleResetBackground}
              branding={branding}
              onChangeBranding={setBranding}
              onUploadLogo={handleUploadLogo}
              onRemoveLogo={handleRemoveLogo}
              aspectRatio={aspectRatio}
              resolution={exportConfig.resolution}
              onSelectRatio={setAspectRatio}
            />
          </div>

          <div
            className={`${
              mobileSection === 'preview' ? 'flex' : 'hidden'
            } lg:flex flex-1 min-w-0 min-h-0`}
          >
            <PreviewWorkspace
              audioEngine={audioEngine}
              audio={audio}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={audio?.duration ?? 0}
              volume={volume}
              aspectRatio={aspectRatio}
              visualizer={visualizer}
              background={background}
              branding={branding}
              onTogglePlay={() => void handleTogglePlay()}
              onRestart={() => void handleRestart()}
              onSeek={handleSeek}
              onChangeVolume={handleChangeVolume}
              onChangeVisualizerOffset={handleChangeVisualizerOffset}
              onPromptAudioUpload={() => {
                setLeftTab('audio');
                setMobileSection('design');
              }}
              isExporting={isExportModalOpen}
            />
          </div>

          <div
            className={`${
              mobileSection === 'export' ? 'flex' : 'hidden'
            } lg:flex min-h-0 shrink-0`}
          >
            <RightSidebar
              visualizer={visualizer}
              onChangeVisualizer={setVisualizer}
              onResetVisualizer={handleResetVisualizer}
              aspectRatio={aspectRatio}
              exportConfig={exportConfig}
              onChangeExport={setExportConfig}
              audio={audio}
              onOpenExport={() => void handleOpenExport()}
            />
          </div>
        </div>

        {/* New Project Confirmation Dialog */}
        {showNewProjectConfirm && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-project-dialog-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm"
          >
            <div className="liquid-glass w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-xl">
              <div>
                <h2
                  id="new-project-dialog-title"
                  className="font-display text-base font-bold text-slate-900"
                >
                  Start a New Project?
                </h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  This will clear your current audio file, custom background, branding,
                  and reset all studio settings for this session.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectConfirm(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200/60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmNewProject}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                >
                  Reset Studio
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export Modal */}
        <ExportModal
          isOpen={isExportModalOpen}
          audio={audio}
          aspectRatio={aspectRatio}
          exportConfig={exportConfig}
          supportReport={supportReport}
          exportState={exportState}
          onStartExport={() => void handleStartExport()}
          onCancelExport={handleCancelExport}
          onApplySuggestedSettings={() => void handleApplySuggestedSettings()}
          onClose={() => setIsExportModalOpen(false)}
        />

        {/* Auth Modal (Email/Password + Google) */}
        <AuthModal
          isOpen={isAuthModalOpen}
          user={authUser}
          onClose={() => setIsAuthModalOpen(false)}
        />

        {/* User Export History Modal */}
        <HistoryModal
          isOpen={isHistoryModalOpen}
          user={authUser}
          items={historyItems}
          loading={historyLoading}
          error={historyError}
          onClose={() => setIsHistoryModalOpen(false)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onApplyPreset={handleApplyHistoryPreset}
          onDeleteItem={handleDeleteHistoryItem}
        />
      </div>
    </MotionConfig>
  );
}
