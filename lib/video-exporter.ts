import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import { loadImageAsset, renderStudioFrame } from './canvas-compositor';
import { OfflineAudioAnalyzer } from './offline-fft';
import { computeExportDimensions, estimateVideoBitrate } from './studio-math';
import {
  AspectRatioId,
  AudioAsset,
  BackgroundConfig,
  BrandingConfig,
  CodecSupportReport,
  ExportConfig,
  VisualizerConfig,
} from './types';

function getCandidateH264Codecs(width: number, height: number, fps: number): string[] {
  const macroblocks = Math.ceil(width / 16) * Math.ceil(height / 16) * fps;
  // Level 5.2 (34) for 4K60, Level 5.1 (33) for 4K30, Level 4.2 (2a) for 1080p60/2K, Level 4.0 (28) for 1080p30
  if (macroblocks > 983040) {
    return ['avc1.640034', 'avc1.4d0034', 'avc1.640033', 'avc1.420033'];
  }
  if (width > 2560 || height > 2560) {
    return ['avc1.640033', 'avc1.4d0033', 'avc1.640032', 'avc1.420032'];
  }
  if (fps > 30 || width > 1920 || height > 1920) {
    return ['avc1.64002a', 'avc1.4d002a', 'avc1.640028', 'avc1.42002a'];
  }
  return ['avc1.640028', 'avc1.4d0028', 'avc1.420028', 'avc1.42001f'];
}

export async function checkExportCapabilities(
  aspectRatio: AspectRatioId,
  exportConfig: ExportConfig,
  audio: AudioAsset | null
): Promise<CodecSupportReport> {
  const { width, height } = computeExportDimensions(aspectRatio, exportConfig.resolution);
  const warnings: string[] = [];

  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
    return {
      supported: false,
      videoCodec: 'none',
      audioCodec: null,
      engine: 'unsupported',
      warnings,
      blockingReason:
        'Your browser does not support WebCodecs VideoEncoder required for local H.264 MP4 rendering. Please use a recent version of Chrome, Edge, or Safari.',
    };
  }

  const bitrate = estimateVideoBitrate(width, height, exportConfig.fps, exportConfig.quality);
  const candidates = getCandidateH264Codecs(width, height, exportConfig.fps);

  let selectedVideoCodec: string | null = null;
  for (const codec of candidates) {
    try {
      const res = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        bitrate,
        framerate: exportConfig.fps,
        latencyMode: 'realtime',
      });
      if (res.supported) {
        selectedVideoCodec = codec;
        break;
      }
    } catch {
      // try without latencyMode or next codec profile
    }
    try {
      const res = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        bitrate,
        framerate: exportConfig.fps,
      });
      if (res.supported) {
        selectedVideoCodec = codec;
        break;
      }
    } catch {
      // try next codec profile
    }
  }

  if (!selectedVideoCodec) {
    // Suggest a compatible resolution/FPS without silently downgrading
    let suggestedResolution = exportConfig.resolution;
    let suggestedFps = exportConfig.fps;
    if (exportConfig.resolution === '4k') suggestedResolution = '2k';
    else if (exportConfig.resolution === '2k') suggestedResolution = '1080p';
    if (exportConfig.fps > 30) suggestedFps = 30;

    return {
      supported: false,
      videoCodec: 'unsupported',
      audioCodec: null,
      engine: 'unsupported',
      warnings,
      blockingReason: `H.264 hardware/software encoding at ${width}×${height} @ ${exportConfig.fps} FPS is not supported by this browser.`,
      suggestedResolution,
      suggestedFps,
    };
  }

  let selectedAudioCodec: string | null = null;
  if (exportConfig.includeAudio) {
    if (typeof AudioEncoder === 'undefined' || typeof AudioData === 'undefined') {
      warnings.push(
        'AudioEncoder is unavailable in this browser; the exported MP4 will contain video only unless you switch to Chrome/Edge/Safari.'
      );
    } else {
      const sampleRate = audio?.audioBuffer.sampleRate ?? 48000;
      const numberOfChannels = Math.min(2, audio?.audioBuffer.numberOfChannels ?? 2);

      // Prefer AAC (mp4a.40.2), fallback to Opus in MP4 if browser lacks proprietary AAC encoder
      const aacCheck = await AudioEncoder.isConfigSupported({
        codec: 'mp4a.40.2',
        sampleRate,
        numberOfChannels,
        bitrate: 192_000,
      }).catch(() => ({ supported: false }));

      if (aacCheck.supported) {
        selectedAudioCodec = 'mp4a.40.2';
      } else {
        const opusCheck = await AudioEncoder.isConfigSupported({
          codec: 'opus',
          sampleRate: 48000,
          numberOfChannels,
          bitrate: 160_000,
        }).catch(() => ({ supported: false }));

        if (opusCheck.supported) {
          selectedAudioCodec = 'opus';
          warnings.push(
            'This browser does not include an AAC encoder; audio will be encoded as Opus inside the MP4 container.'
          );
        } else {
          warnings.push(
            'Neither AAC nor Opus WebCodecs audio encoding is supported in this browser; video will export without an audio track.'
          );
        }
      }
    }
  }

  if (audio && exportConfig.resolution === '4k' && audio.duration > 180) {
    warnings.push(
      '4K rendering for tracks longer than 3 minutes uses significant browser memory and may take several minutes.'
    );
  }

  return {
    supported: true,
    videoCodec: selectedVideoCodec,
    audioCodec: selectedAudioCodec,
    engine: 'webcodecs-mp4',
    warnings,
    blockingReason: null,
  };
}

export interface ExportRunOptions {
  audio: AudioAsset;
  aspectRatio: AspectRatioId;
  exportConfig: ExportConfig;
  visualizer: VisualizerConfig;
  background: BackgroundConfig;
  branding: BrandingConfig;
  supportReport: CodecSupportReport;
  signal: AbortSignal;
  onProgress: (info: {
    phase: 'rendering' | 'muxing';
    progress: number;
    currentFrame: number;
    totalFrames: number;
    statusMessage: string;
    estimatedRemainingSeconds: number | null;
  }) => void;
}

export interface ExportResult {
  blob: Blob;
  fileName: string;
  width: number;
  height: number;
  fps: number;
  codecLabel: string;
}

function resampleAudioBufferTo48k(
  source: AudioBuffer,
  targetRate: number
): AudioBuffer {
  if (source.sampleRate === targetRate) return source;
  const channels = Math.min(2, source.numberOfChannels);
  const ratio = targetRate / source.sampleRate;
  const targetLen = Math.max(1, Math.round(source.length * ratio));
  const offline = new OfflineAudioContext(channels, targetLen, targetRate);
  // Create plain AudioBuffer manually via offline context
  const out = offline.createBuffer(channels, targetLen, targetRate);
  for (let c = 0; c < channels; c++) {
    const srcData = source.getChannelData(Math.min(c, source.numberOfChannels - 1));
    const dstData = out.getChannelData(c);
    for (let i = 0; i < targetLen; i++) {
      const srcIdx = i / ratio;
      const i0 = Math.floor(srcIdx);
      const i1 = Math.min(source.length - 1, i0 + 1);
      const frac = srcIdx - i0;
      dstData[i] = srcData[i0] * (1 - frac) + srcData[i1] * frac;
    }
  }
  return out;
}

async function waitForEncoderDrain(
  encoder: VideoEncoder,
  maxQueueSize: number,
  signal: AbortSignal
): Promise<void> {
  while (encoder.encodeQueueSize > maxQueueSize) {
    if (signal.aborted) {
      throw new DOMException('Export cancelled', 'AbortError');
    }
    await new Promise<void>((resolve) => {
      const onDone = () => {
        clearTimeout(timer);
        encoder.removeEventListener('dequeue', onDone);
        signal.removeEventListener('abort', onDone);
        resolve();
      };
      const timer = setTimeout(onDone, 250);
      encoder.addEventListener('dequeue', onDone, { once: true });
      signal.addEventListener('abort', onDone, { once: true });
    });
  }
}

export async function exportStudioVideoToMp4(
  options: ExportRunOptions
): Promise<ExportResult> {
  const {
    audio,
    aspectRatio,
    exportConfig,
    visualizer,
    background,
    branding,
    supportReport,
    signal,
    onProgress,
  } = options;

  if (!supportReport.supported) {
    throw new Error(supportReport.blockingReason || 'Video encoding is not supported.');
  }

  const { width, height } = computeExportDimensions(aspectRatio, exportConfig.resolution);
  const fps = exportConfig.fps;
  const duration = Math.max(0.1, audio.duration);
  const totalFrames = Math.max(1, Math.ceil(duration * fps));
  const bitrate = estimateVideoBitrate(width, height, fps, exportConfig.quality);

  // Preload background & logo images once before rendering loop
  const [bgImg, logoImg] = await Promise.all([
    (background.type === 'preset-image' || background.type === 'custom-image') &&
    background.imageUrl
      ? loadImageAsset(background.imageUrl).catch(() => null)
      : Promise.resolve(null),
    branding.visible && branding.logoUrl
      ? loadImageAsset(branding.logoUrl).catch(() => null)
      : Promise.resolve(null),
  ]);

  if (signal.aborted) {
    throw new DOMException('Export cancelled', 'AbortError');
  }

  const useAudio = Boolean(exportConfig.includeAudio && supportReport.audioCodec);
  const audioCodecType = supportReport.audioCodec === 'opus' ? 'opus' : 'aac';
  const audioTargetRate =
    supportReport.audioCodec === 'opus' ? 48000 : audio.audioBuffer.sampleRate;
  const preparedAudioBuffer = useAudio
    ? resampleAudioBufferTo48k(audio.audioBuffer, audioTargetRate)
    : null;
  const audioChannels = preparedAudioBuffer
    ? Math.min(2, preparedAudioBuffer.numberOfChannels)
    : 2;

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    fastStart: 'in-memory',
    video: {
      codec: 'avc',
      width,
      height,
    },
    ...(useAudio && preparedAudioBuffer
      ? {
          audio: {
            codec: audioCodecType,
            numberOfChannels: audioChannels,
            sampleRate: preparedAudioBuffer.sampleRate,
          },
        }
      : {}),
  });

  let encoderError: Error | null = null;
  let lastAudioTimestampUs = -1;

  let audioEncoder: AudioEncoder | null = null;
  if (useAudio && preparedAudioBuffer && supportReport.audioCodec) {
    audioEncoder = new AudioEncoder({
      output: (chunk, meta) => {
        // Ensure strictly monotonic timestamp even if encoder emits rounding drift
        const rawTs = chunk.timestamp;
        if (rawTs <= lastAudioTimestampUs) {
          const safeTs = lastAudioTimestampUs + 1;
          lastAudioTimestampUs = safeTs;
          const bytes = new Uint8Array(chunk.byteLength);
          chunk.copyTo(bytes);
          const adjusted = new EncodedAudioChunk({
            type: chunk.type,
            timestamp: safeTs,
            duration: chunk.duration ?? undefined,
            data: bytes,
          });
          muxer.addAudioChunk(adjusted, meta);
        } else {
          lastAudioTimestampUs = rawTs;
          muxer.addAudioChunk(chunk, meta);
        }
      },
      error: (err) => {
        encoderError = err instanceof Error ? err : new Error(String(err));
      },
    });
    audioEncoder.configure({
      codec: supportReport.audioCodec,
      sampleRate: preparedAudioBuffer.sampleRate,
      numberOfChannels: audioChannels,
      bitrate: supportReport.audioCodec === 'opus' ? 160_000 : 192_000,
    });
  }

  // Offscreen or hidden canvas at exact target resolution
  const canvas: OffscreenCanvas | HTMLCanvasElement =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : (() => {
          const el = document.createElement('canvas');
          el.width = width;
          el.height = height;
          return el;
        })();

  const ctx = canvas.getContext('2d', { alpha: false }) as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;

  if (!ctx) {
    throw new Error('Could not initialize 2D rendering context for video export.');
  }

  const analyzer = new OfflineAudioAnalyzer();
  const startTimeMs = performance.now();

  try {
    // 1. Encode audio track chunks with frame-aligned boundaries (9600 samples = 200ms @ 48kHz)
    if (audioEncoder && preparedAudioBuffer) {
      onProgress({
        phase: 'rendering',
        progress: 2,
        currentFrame: 0,
        totalFrames,
        statusMessage: 'Encoding synchronized audio stream...',
        estimatedRemainingSeconds: null,
      });

      const chunkSize = supportReport.audioCodec === 'opus' ? 9600 : 4096;
      const totalSamples = preparedAudioBuffer.length;
      const sr = preparedAudioBuffer.sampleRate;
      const ch0 = preparedAudioBuffer.getChannelData(0);
      const ch1 = audioChannels > 1 ? preparedAudioBuffer.getChannelData(1) : null;

      for (let offset = 0; offset < totalSamples; offset += chunkSize) {
        if (signal.aborted) {
          throw new DOMException('Export cancelled', 'AbortError');
        }
        if (encoderError) throw encoderError;

        const framesCount = Math.min(chunkSize, totalSamples - offset);
        const planar = new Float32Array(framesCount * audioChannels);
        planar.set(ch0.subarray(offset, offset + framesCount), 0);
        if (ch1 && audioChannels > 1) {
          planar.set(ch1.subarray(offset, offset + framesCount), framesCount);
        }

        const audioData = new AudioData({
          format: 'f32-planar',
          sampleRate: sr,
          numberOfFrames: framesCount,
          numberOfChannels: audioChannels,
          timestamp: Math.round((offset * 1_000_000) / sr),
          data: planar,
        });
        audioEncoder.encode(audioData);
        audioData.close();

        while (audioEncoder.encodeQueueSize > 24) {
          await new Promise((resolve) => setTimeout(resolve, 4));
        }
      }
      await audioEncoder.flush();
      if (audioEncoder.state !== 'closed') {
        audioEncoder.close();
      }
      audioEncoder = null;
    }

    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => {
        muxer.addVideoChunk(chunk, meta);
      },
      error: (err) => {
        encoderError = err instanceof Error ? err : new Error(String(err));
      },
    });

    const realtimeSupported = await VideoEncoder.isConfigSupported({
      codec: supportReport.videoCodec,
      width,
      height,
      bitrate,
      framerate: fps,
      latencyMode: 'realtime',
    })
      .then((r) => r.supported === true)
      .catch(() => false);

    videoEncoder.configure({
      codec: supportReport.videoCodec,
      width,
      height,
      bitrate,
      framerate: fps,
      ...(realtimeSupported ? { latencyMode: 'realtime' as const } : {}),
      avc: { format: 'avc' },
    });

    // 2. Render & encode video frames deterministically with smooth pipelining
    const keyFrameInterval = Math.max(1, fps * 2);
    let lastUiYieldMs = performance.now();

    onProgress({
      phase: 'rendering',
      progress: 3,
      currentFrame: 0,
      totalFrames,
      statusMessage: `Rendering frame 1 of ${totalFrames} (${width}×${height} @ ${fps} FPS)`,
      estimatedRemainingSeconds: null,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      for (let i = 0; i < totalFrames; i++) {
      if (signal.aborted) {
        throw new DOMException('Export cancelled', 'AbortError');
      }
      if (encoderError) throw encoderError;

      const frameTimeSec = i / fps;
      const analysis = analyzer.analyzeAtTime(
        audio.audioBuffer,
        frameTimeSec,
        visualizer.smoothness,
        visualizer.sensitivity
      );

      renderStudioFrame({
        ctx,
        width,
        height,
        analysis,
        visualizer,
        background,
        branding,
        time: frameTimeSec,
        bgImage: bgImg,
        logoImage: logoImg,
        isExport: true,
      });

      const timestampUs = Math.round(frameTimeSec * 1_000_000);
      const durationUs = Math.round(1_000_000 / fps);
      const videoFrame = new VideoFrame(canvas, {
        timestamp: timestampUs,
        duration: durationUs,
      });

      videoEncoder.encode(videoFrame, { keyFrame: i % keyFrameInterval === 0 });
      videoFrame.close();

      await waitForEncoderDrain(videoEncoder, 4, signal);

      const nowMs = performance.now();
      if (nowMs - lastUiYieldMs >= 250 || i === totalFrames - 1 || i === 0) {
        lastUiYieldMs = nowMs;
        const elapsedSec = (nowMs - startTimeMs) / 1000;
        const pct = Math.min(95, Math.round(((i + 1) / totalFrames) * 92) + 3);
        const rate = (i + 1) / Math.max(0.05, elapsedSec);
        const remainingSec =
          i > 3 ? Math.max(1, Math.round((totalFrames - (i + 1)) / rate)) : null;

        onProgress({
          phase: 'rendering',
          progress: pct,
          currentFrame: i + 1,
          totalFrames,
          statusMessage: `Rendering frame ${i + 1} of ${totalFrames} (${width}×${height} @ ${fps} FPS)`,
          estimatedRemainingSeconds: remainingSec,
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    if (signal.aborted) {
      throw new DOMException('Export cancelled', 'AbortError');
    }

    onProgress({
      phase: 'muxing',
      progress: 97,
      currentFrame: totalFrames,
      totalFrames,
      statusMessage: 'Finalizing MP4 container & audio-video sync...',
      estimatedRemainingSeconds: 1,
    });

    await videoEncoder.flush();
    if (encoderError) throw encoderError;

    muxer.finalize();
    const blob = new Blob([target.buffer], { type: 'video/mp4' });
    const baseName = audio.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '_');
    const fileName = `${baseName}_${aspectRatio.replace(':', 'x')}_${exportConfig.resolution}_${fps}fps.mp4`;

    return {
      blob,
      fileName,
      width,
      height,
      fps,
      codecLabel: useAudio
        ? `H.264 (${supportReport.videoCodec}) + ${audioCodecType.toUpperCase()}`
        : `H.264 (${supportReport.videoCodec}) · Video Only`,
    };
    } finally {
      try {
        if (videoEncoder.state !== 'closed') videoEncoder.close();
      } catch {
        // ignore
      }
    }
  } finally {
    try {
      if (audioEncoder && audioEncoder.state !== 'closed') audioEncoder.close();
    } catch {
      // ignore
    }
  }
}
