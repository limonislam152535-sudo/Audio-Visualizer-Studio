import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampVisualizerOffset,
  computeBrandingAnchor,
  computeExportDimensions,
  computeFrequencyBands,
  computeImageDrawRect,
  computeVisualizerOffsetPx,
  estimateVideoBitrate,
  formatBytes,
  formatDuration,
} from './studio-math';
import { computeRadix2FFT } from './offline-fft';
import {
  VISUALIZER_TEMPLATES,
  ASPECT_RATIOS,
  DEFAULT_VISUALIZER_CONFIG,
} from './constants';

test('all 20 unique visualizer templates are defined', () => {
  assert.ok(VISUALIZER_TEMPLATES.length >= 20);
  const ids = new Set(VISUALIZER_TEMPLATES.map((t) => t.id));
  assert.equal(ids.size, VISUALIZER_TEMPLATES.length);
});

test('all 8 required aspect ratios are defined', () => {
  const required = ['9:16', '16:9', '1:1', '4:5', '4:3', '3:4', '21:9', '2:1'];
  for (const r of required) {
    assert.ok(
      ASPECT_RATIOS.some((item) => item.id === r),
      `Missing aspect ratio ${r}`
    );
  }
});

test('computeExportDimensions returns even dimensions matching target ratios', () => {
  const hd169 = computeExportDimensions('16:9', '1080p');
  assert.deepEqual(hd169, { width: 1920, height: 1080 });

  const portrait916 = computeExportDimensions('9:16', '1080p');
  assert.deepEqual(portrait916, { width: 1080, height: 1920 });

  const k4 = computeExportDimensions('16:9', '4k');
  assert.deepEqual(k4, { width: 3840, height: 2160 });

  const k2 = computeExportDimensions('1:1', '2k');
  assert.deepEqual(k2, { width: 1440, height: 1440 });

  for (const ratio of ASPECT_RATIOS) {
    for (const res of ['1080p', '2k', '4k'] as const) {
      const dims = computeExportDimensions(ratio.id, res);
      assert.equal(dims.width % 2, 0, `${ratio.id} ${res} width must be even`);
      assert.equal(dims.height % 2, 0, `${ratio.id} ${res} height must be even`);
      const actualRatio = dims.width / dims.height;
      const expectedRatio = ratio.widthRatio / ratio.heightRatio;
      assert.ok(
        Math.abs(actualRatio - expectedRatio) < 0.02,
        `Aspect mismatch for ${ratio.id} ${res}`
      );
    }
  }
});

test('computeImageDrawRect handles cover and contain modes cleanly', () => {
  const coverWide = computeImageDrawRect(1920, 1080, 1080, 1080, 'cover', 1, 0, 0);
  assert.equal(coverWide.dh, 1080);
  assert.equal(coverWide.dw, 1920);
  assert.equal(coverWide.dx, -420);

  const containWide = computeImageDrawRect(1920, 1080, 1080, 1080, 'contain', 1, 0, 0);
  assert.equal(containWide.dw, 1080);
  assert.ok(Math.abs(containWide.dh - 607.5) < 0.1);
});

test('computeBrandingAnchor adapts accurately to any canvas aspect ratio', () => {
  const tl = computeBrandingAnchor('top-left', 1080, 1920, 48, 60);
  assert.equal(tl.x, 48);
  assert.equal(tl.y, 60);
  assert.equal(tl.horizontal, 'left');
  assert.equal(tl.vertical, 'top');

  const br = computeBrandingAnchor('bottom-right', 1920, 1080, 48, 60);
  assert.equal(br.x, 1920 - 48);
  assert.equal(br.y, 1080 - 60);
  assert.equal(br.horizontal, 'right');
  assert.equal(br.vertical, 'bottom');
});

test('computeRadix2FFT detects pure sine frequency peak accurately', () => {
  const n = 256;
  const targetBin = 16;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    real[i] = Math.sin((2 * Math.PI * targetBin * i) / n);
  }
  computeRadix2FFT(real, imag);

  let peakIdx = 0;
  let peakMag = 0;
  for (let k = 1; k < n / 2; k++) {
    const mag = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]);
    if (mag > peakMag) {
      peakMag = mag;
      peakIdx = k;
    }
  }
  assert.equal(peakIdx, targetBin);
});

test('computeFrequencyBands and formatters behave predictably', () => {
  const bins = new Float32Array(128).fill(0.5);
  const bands = computeFrequencyBands(bins, 48000, 1.0, 0.2);
  assert.ok(bands.bass > 0.4 && bands.bass <= 1.0);
  assert.ok(bands.energy > 0.4);
  assert.equal(formatDuration(125), '2:05');
  assert.equal(formatBytes(1024 * 1024 * 2.5), '2.50 MB');
  assert.ok(estimateVideoBitrate(1920, 1080, 30, 'high') >= 5_000_000);
});

test('visualizer offset clamping and pixel mapping work accurately', () => {
  assert.equal(DEFAULT_VISUALIZER_CONFIG.offsetX, 0);
  assert.equal(DEFAULT_VISUALIZER_CONFIG.offsetY, 0);
  assert.equal(clampVisualizerOffset(75), 50);
  assert.equal(clampVisualizerOffset(-82), -50);
  assert.equal(clampVisualizerOffset(Number.NaN), 0);
  assert.deepEqual(computeVisualizerOffsetPx(25, -10, 1920, 1080), {
    x: 480,
    y: -108,
  });
});

