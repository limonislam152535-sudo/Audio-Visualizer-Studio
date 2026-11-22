import {
  computeBrandingAnchor,
  computeImageDrawRect,
  computeVisualizerOffsetPx,
} from './studio-math';
import {
  AudioAnalysisFrame,
  BackgroundConfig,
  BrandingConfig,
  VisualizerConfig,
} from './types';
import { renderVisualizerTemplate } from './visualizers';

export interface StudioFrameParams {
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  width: number;
  height: number;
  analysis: AudioAnalysisFrame;
  visualizer: VisualizerConfig;
  background: BackgroundConfig;
  branding: BrandingConfig;
  time: number;
  bgImage: CanvasImageSource | null;
  logoImage: CanvasImageSource | null;
  isExport?: boolean;
}

function getSourceDimensions(img: CanvasImageSource): { w: number; h: number } {
  if ('naturalWidth' in img && typeof img.naturalWidth === 'number') {
    return { w: img.naturalWidth || 1920, h: img.naturalHeight || 1080 };
  }
  if (
    'width' in img &&
    'height' in img &&
    typeof img.width === 'number' &&
    typeof img.height === 'number'
  ) {
    return { w: img.width || 1920, h: img.height || 1080 };
  }
  return { w: 1920, h: 1080 };
}

function drawTextWithLetterSpacing(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  align: CanvasTextAlign,
  letterSpacingPx: number
): void {
  if (Math.abs(letterSpacingPx) < 0.2) {
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
    return;
  }

  const ctxWithSpacing = ctx as unknown as { letterSpacing?: string };
  if (typeof ctxWithSpacing.letterSpacing === 'string') {
    ctxWithSpacing.letterSpacing = `${letterSpacingPx}px`;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
    ctxWithSpacing.letterSpacing = '0px';
    return;
  }

  const chars = Array.from(text);
  const widths = chars.map((c) => ctx.measureText(c).width);
  const totalW =
    widths.reduce((acc, w) => acc + w, 0) +
    Math.max(0, chars.length - 1) * letterSpacingPx;

  let cursorX = x;
  if (align === 'center') cursorX = x - totalW * 0.5;
  else if (align === 'right' || align === 'end') cursorX = x - totalW;

  ctx.textAlign = 'left';
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], cursorX, y);
    cursorX += widths[i] + letterSpacingPx;
  }
}

export function renderStudioFrame(params: StudioFrameParams): void {
  const {
    ctx,
    width,
    height,
    analysis,
    visualizer,
    background,
    branding,
    time,
    bgImage,
    logoImage,
    isExport = false,
  } = params;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // 1. LAYER 1: BACKGROUND (Pure Black default or customized)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  if (background.type === 'solid') {
    ctx.fillStyle = background.solidColor || '#000000';
    ctx.fillRect(0, 0, width, height);
  } else if (background.type === 'gradient') {
    const angleRad = ((background.gradientAngle - 90) * Math.PI) / 180;
    const halfDiag = Math.sqrt(width * width + height * height) * 0.5;
    const cx = width * 0.5;
    const cy = height * 0.5;
    const x0 = cx - Math.cos(angleRad) * halfDiag;
    const y0 = cy - Math.sin(angleRad) * halfDiag;
    const x1 = cx + Math.cos(angleRad) * halfDiag;
    const y1 = cy + Math.sin(angleRad) * halfDiag;
    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    const cols = background.gradientColors;
    grad.addColorStop(0, cols[0]);
    if (cols[2]) {
      grad.addColorStop(0.5, cols[1]);
      grad.addColorStop(1, cols[2]);
    } else {
      grad.addColorStop(1, cols[1]);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (
    (background.type === 'preset-image' || background.type === 'custom-image') &&
    bgImage
  ) {
    const { w: imgW, h: imgH } = getSourceDimensions(bgImage);
    const rect = computeImageDrawRect(
      imgW,
      imgH,
      width,
      height,
      background.imageFit,
      background.scale,
      background.positionX,
      background.positionY
    );
    ctx.save();
    ctx.globalAlpha = Math.max(0.05, Math.min(1, background.opacity));
    if (background.blur > 0.2 && 'filter' in ctx) {
      const blurScale = Math.min(width, height) / 1080;
      ctx.filter = `blur(${(background.blur * blurScale).toFixed(1)}px)`;
    }
    ctx.drawImage(bgImage, rect.dx, rect.dy, rect.dw, rect.dh);
    ctx.restore();
  }

  // 2. LAYER 2: AUDIO VISUALIZER
  const vizOffset = computeVisualizerOffsetPx(
    visualizer.offsetX ?? 0,
    visualizer.offsetY ?? 0,
    width,
    height
  );
  ctx.save();
  if (vizOffset.x !== 0 || vizOffset.y !== 0) {
    ctx.translate(vizOffset.x, vizOffset.y);
  }
  renderVisualizerTemplate({
    ctx,
    width,
    height,
    analysis,
    config: visualizer,
    time,
    isExport,
  });
  ctx.restore();

  // 3. LAYER 3: BRANDING (LOGO & TEXT)
  if (branding.visible) {
    const uiScale = Math.min(width, height) / 1080;
    const marginX = Math.max(24, width * 0.045);
    const marginY = Math.max(24, height * 0.05);

    ctx.save();
    ctx.globalAlpha = Math.max(0.05, Math.min(1, branding.opacity));

    // Draw Logo independently
    if (logoImage) {
      const { w: lw, h: lh } = getSourceDimensions(logoImage);
      const targetMax = branding.logoSize * uiScale;
      const ratio = lw / Math.max(1, lh);
      const drawW = ratio >= 1 ? targetMax : targetMax * ratio;
      const drawH = ratio >= 1 ? targetMax / ratio : targetMax;

      const anchor = computeBrandingAnchor(
        branding.logoPosition,
        width,
        height,
        marginX,
        marginY
      );

      let lx = anchor.x;
      if (anchor.horizontal === 'center') lx -= drawW * 0.5;
      else if (anchor.horizontal === 'right') lx -= drawW;

      let ly = anchor.y;
      if (anchor.vertical === 'middle') ly -= drawH * 0.5;
      else if (anchor.vertical === 'bottom') ly -= drawH;

      ctx.drawImage(logoImage, lx, ly, drawW, drawH);
    }

    // Draw Brand Name & Custom Text independently
    const hasBrand = branding.brandName.trim().length > 0;
    const hasCustom = branding.customText.trim().length > 0;

    if (hasBrand || hasCustom) {
      const anchor = computeBrandingAnchor(
        branding.textPosition,
        width,
        height,
        marginX,
        marginY,
        branding.textAlign
      );

      const primaryPx = Math.max(12, Math.round(branding.fontSize * uiScale));
      const secondaryPx = Math.max(10, Math.round(primaryPx * 0.56));
      const gapPx = Math.round(primaryPx * 0.35);
      const letterSp = branding.letterSpacing * uiScale;

      let startY = anchor.y;
      const totalTextHeight =
        (hasBrand ? primaryPx : 0) +
        (hasCustom ? secondaryPx : 0) +
        (hasBrand && hasCustom ? gapPx : 0);

      if (anchor.vertical === 'middle') {
        startY = anchor.y - totalTextHeight * 0.5;
      } else if (anchor.vertical === 'bottom') {
        startY = anchor.y - totalTextHeight;
      }

      ctx.textBaseline = 'top';
      const shadowOffset = Math.max(1, Math.round(2 * uiScale));

      let curY = startY;
      if (hasBrand) {
        ctx.font = `${branding.fontWeight} ${primaryPx}px ${branding.fontFamily}`;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
        drawTextWithLetterSpacing(
          ctx,
          branding.brandName.trim(),
          anchor.x,
          curY + shadowOffset,
          anchor.canvasAlign,
          letterSp
        );
        ctx.fillStyle = branding.textColor || '#F8FAFC';
        drawTextWithLetterSpacing(
          ctx,
          branding.brandName.trim(),
          anchor.x,
          curY,
          anchor.canvasAlign,
          letterSp
        );
        curY += primaryPx + gapPx;
      }

      if (hasCustom) {
        ctx.save();
        ctx.font = `400 ${secondaryPx}px ${branding.fontFamily}`;
        ctx.globalAlpha = Math.max(0.05, branding.opacity * 0.42);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        drawTextWithLetterSpacing(
          ctx,
          branding.customText.trim(),
          anchor.x,
          curY + Math.max(1, Math.round(1.5 * uiScale)),
          anchor.canvasAlign,
          letterSp * 0.7
        );
        ctx.globalAlpha = Math.max(0.05, branding.opacity * 0.78);
        ctx.fillStyle = branding.textColor || '#F8FAFC';
        drawTextWithLetterSpacing(
          ctx,
          branding.customText.trim(),
          anchor.x,
          curY,
          anchor.canvasAlign,
          letterSp * 0.7
        );
        ctx.restore();
      }
    }

    ctx.restore();
  }

  ctx.restore();
}

export function loadImageAsset(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}
