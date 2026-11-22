/**
 * Generates an in-memory stereo 16-bit PCM WAV File with a rich musical
 * electronic ambient groove (sub-bass kick, warm synth pad, arpeggio, hi-hats)
 * so users can immediately test real audio playback, FFT analysis, and MP4 export.
 */
export function createDemoTrackWavFile(durationSeconds = 12): File {
  const sampleRate = 44100;
  const numChannels = 2;
  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const bytesPerSample = 2;
  const dataSize = totalSamples * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // WAV Header
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  const bpm = 120;
  const beatLen = 60 / bpm; // 0.5s per beat
  const chordRoots = [130.81, 164.81, 146.83, 196.0]; // C3, E3, D3, G3
  const arpRatios = [1, 1.25, 1.5, 2, 1.5, 1.25];

  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const beatPos = (t % beatLen) / beatLen;
    const barIndex = Math.floor(t / (beatLen * 4)) % chordRoots.length;
    const rootFreq = chordRoots[barIndex];

    // 1. Punchy kick drum on every beat
    const kickEnv = Math.exp(-beatPos * 10);
    const kickFreq = 48 + 110 * Math.exp(-beatPos * 26);
    const kick = Math.sin(2 * Math.PI * kickFreq * (t % beatLen)) * kickEnv * 0.55;

    // 2. Warm stereo chord pad (root + fifth + octave)
    const padEnv = 0.25 + 0.1 * Math.sin(t * 1.6);
    const padL =
      (Math.sin(2 * Math.PI * rootFreq * t) +
        0.6 * Math.sin(2 * Math.PI * rootFreq * 1.498 * t + 0.4) +
        0.35 * Math.sin(2 * Math.PI * rootFreq * 2.0 * t)) *
      0.16 *
      padEnv;
    const padR =
      (Math.sin(2 * Math.PI * rootFreq * t + 0.25) +
        0.6 * Math.sin(2 * Math.PI * rootFreq * 1.502 * t) +
        0.35 * Math.sin(2 * Math.PI * rootFreq * 2.0 * t + 0.3)) *
      0.16 *
      padEnv;

    // 3. Melodic eighth-note arpeggio
    const stepLen = beatLen * 0.5;
    const stepIdx = Math.floor(t / stepLen) % arpRatios.length;
    const stepPos = (t % stepLen) / stepLen;
    const arpFreq = rootFreq * 2 * arpRatios[stepIdx];
    const arpEnv = Math.exp(-stepPos * 5.5);
    const arp =
      (Math.sin(2 * Math.PI * arpFreq * t) +
        0.25 * Math.sin(4 * Math.PI * arpFreq * t)) *
      arpEnv *
      0.22;

    // 4. Crisp off-beat hi-hat transient
    const hatPos = ((t + beatLen * 0.5) % beatLen) / beatLen;
    const hatEnv = Math.exp(-hatPos * 38);
    const pseudoNoise = Math.sin(i * 12.9898) * 43758.5453;
    const white = (pseudoNoise - Math.floor(pseudoNoise)) * 2 - 1;
    const hat = white * hatEnv * 0.14;

    // Fade in/out smoothly
    const fadeIn = Math.min(1, t / 0.15);
    const fadeOut = Math.min(1, (durationSeconds - t) / 0.3);
    const master = fadeIn * fadeOut;

    const sampleL = Math.max(-0.98, Math.min(0.98, (kick + padL + arp * 0.9 + hat * 0.8) * master));
    const sampleR = Math.max(-0.98, Math.min(0.98, (kick + padR + arp * 1.1 + hat * 1.1) * master));

    view.setInt16(offset, Math.round(sampleL * 32767), true);
    view.setInt16(offset + 2, Math.round(sampleR * 32767), true);
    offset += 4;
  }

  return new File([buffer], 'Demo_Studio_Pulse_120BPM.wav', { type: 'audio/wav' });
}
