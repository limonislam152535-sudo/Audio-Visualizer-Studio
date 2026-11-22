import { computeFrequencyBands } from './studio-math';
import { AudioAnalysisFrame } from './types';

/**
 * Manages real-time Web Audio API playback & FFT frequency analysis
 * cleanly decoupled from React UI state.
 */
export class StudioAudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;

  private rawFreqBytes: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  private rawTimeBytes: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  private outputBins = new Float32Array(128);
  private smoothedBins = new Float32Array(128);
  private outputWave = new Float32Array(256);
  private prevPeakBass = 0;

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.72;
      this.gainNode = this.audioContext.createGain();

      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      this.rawFreqBytes = new Uint8Array(this.analyser.frequencyBinCount);
      this.rawTimeBytes = new Uint8Array(this.analyser.fftSize);
    }
    return this.audioContext;
  }

  public async decodeAudioFile(file: File): Promise<AudioBuffer> {
    const ctx = this.ensureContext();
    const arrayBuffer = await file.arrayBuffer();
    // Copy slice because decodeAudioData detaches the buffer in some browsers
    return await ctx.decodeAudioData(arrayBuffer.slice(0));
  }

  public attachMediaElement(objectUrl: string, volume: number): HTMLAudioElement {
    const ctx = this.ensureContext();
    this.detachMediaElement();

    const audio = new Audio();
    audio.src = objectUrl;
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    this.audioEl = audio;

    if (this.analyser) {
      this.mediaSource = ctx.createMediaElementSource(audio);
      this.mediaSource.connect(this.analyser);
    }
    this.setVolume(volume);
    return audio;
  }

  public detachMediaElement(): void {
    if (this.mediaSource) {
      try {
        this.mediaSource.disconnect();
      } catch {
        // ignore if already disconnected
      }
      this.mediaSource = null;
    }
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.removeAttribute('src');
      this.audioEl.load();
      this.audioEl = null;
    }
    this.smoothedBins.fill(0);
    this.outputBins.fill(0);
    this.outputWave.fill(0);
    this.prevPeakBass = 0;
  }

  public async resumeContext(): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }

  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.setValueAtTime(clamped, this.audioContext.currentTime);
    }
  }

  public sampleLiveFrame(
    smoothness: number,
    sensitivity: number,
    isPlaying: boolean,
    idleTime: number
  ): AudioAnalysisFrame {
    if (this.analyser && this.audioContext && isPlaying) {
      this.analyser.smoothingTimeConstant = Math.max(0.1, Math.min(0.94, smoothness));
      this.analyser.getByteFrequencyData(this.rawFreqBytes);
      this.analyser.getByteTimeDomainData(this.rawTimeBytes);

      const totalBins = this.rawFreqBytes.length;
      const outLen = this.outputBins.length;

      for (let b = 0; b < outLen; b++) {
        const t0 = b / outLen;
        const t1 = (b + 1) / outLen;
        const start = Math.floor(Math.pow(t0, 1.55) * (totalBins * 0.75));
        const end = Math.max(start + 1, Math.floor(Math.pow(t1, 1.55) * (totalBins * 0.75)));
        let sum = 0;
        let count = 0;
        for (let k = start; k < end && k < totalBins; k++) {
          sum += this.rawFreqBytes[k] / 255;
          count++;
        }
        const val = count > 0 ? sum / count : 0;
        this.smoothedBins[b] = this.smoothedBins[b] * 0.25 + val * 0.75;
        this.outputBins[b] = this.smoothedBins[b];
      }

      const waveStep = Math.floor(this.rawTimeBytes.length / this.outputWave.length);
      for (let w = 0; w < this.outputWave.length; w++) {
        const raw = (this.rawTimeBytes[w * waveStep] - 128) / 128;
        this.outputWave[w] = Math.max(-1, Math.min(1, raw * sensitivity));
      }

      const bands = computeFrequencyBands(
        this.outputBins,
        this.audioContext.sampleRate,
        sensitivity,
        this.prevPeakBass
      );
      this.prevPeakBass = bands.peakBass;

      return {
        frequencyData: this.outputBins,
        waveformData: this.outputWave,
        bass: bands.bass,
        mid: bands.mid,
        treble: bands.treble,
        energy: bands.energy,
        peakBass: bands.peakBass,
      };
    }

    // Gentle resting harmonic preview when paused or no audio loaded yet
    // so users can inspect templates cleanly without static dead rectangles
    const outLen = this.outputBins.length;
    for (let b = 0; b < outLen; b++) {
      const norm = b / outLen;
      const resting =
        (0.12 +
          0.08 * Math.sin(norm * Math.PI * 3 - idleTime * 1.4) +
          0.05 * Math.cos(norm * Math.PI * 7 + idleTime * 0.9)) *
        Math.max(0.25, 1 - norm * 0.65);
      this.smoothedBins[b] = this.smoothedBins[b] * 0.85 + resting * 0.15;
      this.outputBins[b] = this.smoothedBins[b];
    }

    for (let w = 0; w < this.outputWave.length; w++) {
      const t = w / this.outputWave.length;
      this.outputWave[w] = 0.08 * Math.sin(t * Math.PI * 4 + idleTime * 2.1);
    }

    return {
      frequencyData: this.outputBins,
      waveformData: this.outputWave,
      bass: 0.14 + 0.05 * Math.sin(idleTime * 1.8),
      mid: 0.12 + 0.04 * Math.cos(idleTime * 1.4),
      treble: 0.08 + 0.03 * Math.sin(idleTime * 2.3),
      energy: 0.12,
      peakBass: 0.16,
    };
  }

  public dispose(): void {
    this.detachMediaElement();
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
      this.analyser = null;
      this.gainNode = null;
    }
  }
}
