import { computeFrequencyBands } from './studio-math';
import { AudioAnalysisFrame } from './types';

/**
 * Pure TypeScript Radix-2 Cooley-Tukey FFT for deterministic,
 * frame-accurate offline video rendering synchronized to AudioBuffer PCM.
 */
export function computeRadix2FFT(real: Float32Array, imag: Float32Array): void {
  const n = real.length;
  if (n <= 1) return;

  // Bit-reversal permutation
  let j = 0;
  for (let i = 0; i < n; i++) {
    if (i < j) {
      const tr = real[i];
      real[i] = real[j];
      real[j] = tr;
      const ti = imag[i];
      imag[i] = imag[j];
      imag[j] = ti;
    }
    let m = n >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }

  // Butterfly stages
  for (let size = 2; size <= n; size <<= 1) {
    const halfSize = size >> 1;
    const angleStep = (-2 * Math.PI) / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < halfSize; k++) {
        const angle = angleStep * k;
        const wr = Math.cos(angle);
        const wi = Math.sin(angle);
        const idx1 = start + k;
        const idx2 = idx1 + halfSize;
        const tReal = wr * real[idx2] - wi * imag[idx2];
        const tImag = wr * imag[idx2] + wi * real[idx2];
        real[idx2] = real[idx1] - tReal;
        imag[idx2] = imag[idx1] - tImag;
        real[idx1] += tReal;
        imag[idx1] += tImag;
      }
    }
  }
}

export class OfflineAudioAnalyzer {
  private readonly fftSize = 1024;
  private readonly outputBins = 128;
  private readonly waveformSamples = 256;
  private readonly hannWindow: Float32Array;
  private readonly real: Float32Array;
  private readonly imag: Float32Array;
  private smoothedBins: Float32Array;
  private prevPeakBass = 0;

  constructor() {
    this.hannWindow = new Float32Array(this.fftSize);
    for (let i = 0; i < this.fftSize; i++) {
      this.hannWindow[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (this.fftSize - 1)));
    }
    this.real = new Float32Array(this.fftSize);
    this.imag = new Float32Array(this.fftSize);
    this.smoothedBins = new Float32Array(this.outputBins);
  }

  public analyzeAtTime(
    audioBuffer: AudioBuffer,
    timeSeconds: number,
    smoothness: number,
    sensitivity: number
  ): AudioAnalysisFrame {
    const sampleRate = audioBuffer.sampleRate;
    const totalSamples = audioBuffer.length;
    const centerSample = Math.floor(timeSeconds * sampleRate);
    const startSample = centerSample - (this.fftSize >> 1);

    const ch0 = audioBuffer.getChannelData(0);
    const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : ch0;

    const waveform = new Float32Array(this.waveformSamples);
    const waveStep = Math.floor(this.fftSize / this.waveformSamples);

    for (let i = 0; i < this.fftSize; i++) {
      const idx = startSample + i;
      const sample =
        idx >= 0 && idx < totalSamples ? 0.5 * (ch0[idx] + ch1[idx]) : 0;
      this.real[i] = sample * this.hannWindow[i];
      this.imag[i] = 0;
      if (i % waveStep === 0) {
        const wIdx = i / waveStep;
        if (wIdx < this.waveformSamples) {
          waveform[wIdx] = Math.max(-1, Math.min(1, sample * sensitivity));
        }
      }
    }

    computeRadix2FFT(this.real, this.imag);

    const halfBins = this.fftSize >> 1;
    const rawSpectrum = new Float32Array(this.outputBins);
    const minDb = -85;
    const maxDb = -12;
    const dbRange = maxDb - minDb;

    // Map FFT bins logarithmically/perceptually into 128 visual bins
    for (let b = 0; b < this.outputBins; b++) {
      const t0 = b / this.outputBins;
      const t1 = (b + 1) / this.outputBins;
      const idxStart = Math.max(1, Math.floor(Math.pow(t0, 1.55) * (halfBins - 1)));
      const idxEnd = Math.max(
        idxStart + 1,
        Math.floor(Math.pow(t1, 1.55) * (halfBins - 1))
      );

      let magSum = 0;
      let count = 0;
      for (let k = idxStart; k < idxEnd && k < halfBins; k++) {
        const mag = Math.sqrt(this.real[k] * this.real[k] + this.imag[k] * this.imag[k]);
        magSum += mag / (this.fftSize * 0.25);
        count++;
      }
      const avgMag = count > 0 ? magSum / count : 0;
      const db = 20 * Math.log10(Math.max(avgMag, 1e-6));
      const normalized = Math.max(0, Math.min(1, (db - minDb) / dbRange));
      rawSpectrum[b] = normalized;
    }

    const alpha = Math.max(0.05, Math.min(0.94, smoothness));
    for (let b = 0; b < this.outputBins; b++) {
      this.smoothedBins[b] =
        alpha * this.smoothedBins[b] + (1 - alpha) * rawSpectrum[b];
    }

    const freqCopy = new Float32Array(this.smoothedBins);
    const bands = computeFrequencyBands(
      freqCopy,
      sampleRate,
      sensitivity,
      this.prevPeakBass
    );
    this.prevPeakBass = bands.peakBass;

    return {
      frequencyData: freqCopy,
      waveformData: waveform,
      bass: bands.bass,
      mid: bands.mid,
      treble: bands.treble,
      energy: bands.energy,
      peakBass: bands.peakBass,
    };
  }
}
