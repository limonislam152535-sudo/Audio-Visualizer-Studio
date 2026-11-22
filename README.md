# Audio Visualizer Studio

A client-side audio visualization and MP4 video creator studio built with Next.js, React, TypeScript, Tailwind CSS, Web Audio API, HTML5 Canvas, WebCodecs, and `mp4-muxer`.

## Key Capabilities

- **100% Client-Side Processing**: Audio decoding, FFT spectrum analysis, real-time visualization, and MP4 video encoding run locally in the browser. No audio files or projects are uploaded to servers or persisted in localStorage/IndexedDB.
- **20 Distinct Audio-Reactive Templates**: Liquid Wave Ring, Particle Sphere, Circular Spectrum, Neon Wave Ring, Radial Pulse, 3D Wireframe Sphere, Circular Equalizer, Flowing Wave, Dual Ring Spectrum, Frequency Pulse, Liquid Plasma, Particle Orbit, Audio Tunnel, 3D Frequency Bars, Aurora Wave, Neon Pulse Circle, Dynamic Sound Ring, Dotted Spectrum, Energy Orb, and Abstract Sound Mesh.
- **Complete Background & Branding System**: Default pure black (`#000000`) canvas, solid colors, gradients, curated studio presets, custom image upload (`JPG`, `JPEG`, `PNG`, `WEBP`) with fit/zoom/position/opacity/blur, plus independent logo and text positioning.
- **8 Aspect Ratios**: `16:9`, `9:16`, `1:1`, `4:5`, `4:3`, `3:4`, `21:9`, and `2:1`.
- **Genuine MP4 Export**: Frame-accurate offline Radix-2 FFT analysis synchronized with WebCodecs H.264 video + AAC/Opus audio muxed into `.mp4` via `mp4-muxer` at Full HD (1080p), 2K (1440p), or 4K (2160p) across 24, 30, 50, or 60 FPS.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploying to Vercel

1. Push this repository to GitHub.
2. Import the repository into [Vercel](https://vercel.com).
3. Leave the framework preset as **Next.js** (`npm run build`).
4. No environment variables or backend databases are required for core studio functionality.
