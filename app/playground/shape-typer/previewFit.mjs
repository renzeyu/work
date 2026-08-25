export const PREVIEW_FIT_SAFETY_PX = 1;
export const PREVIEW_RESIZE_TOLERANCE_PX = 0.5;

export function shouldRefitPreview(
  previousWidth,
  nextWidth,
  tolerance = PREVIEW_RESIZE_TOLERANCE_PX,
) {
  if (!Number.isFinite(nextWidth) || nextWidth <= 0) return false;
  if (!Number.isFinite(previousWidth)) return true;
  return Math.abs(nextWidth - previousWidth) >= Math.max(tolerance, 0);
}

/**
 * Fit a line measured at the responsive base size into the available width.
 * The one-pixel inset prevents subpixel rounding from clipping the final glyph.
 *
 * @param {{
 *   availableWidth: number;
 *   baseFontSize: number;
 *   naturalWidth: number;
 * }} options
 */
export function fittedPreviewFontSize({
  availableWidth,
  baseFontSize,
  naturalWidth,
}) {
  if (
    !Number.isFinite(availableWidth) ||
    !Number.isFinite(baseFontSize) ||
    !Number.isFinite(naturalWidth) ||
    availableWidth <= 0 ||
    baseFontSize <= 0 ||
    naturalWidth <= 0
  ) {
    return Math.max(baseFontSize, 1);
  }

  const usableWidth = Math.max(availableWidth - PREVIEW_FIT_SAFETY_PX, 1);
  const scale = Math.min(1, usableWidth / naturalWidth);
  return Math.max(baseFontSize * scale, 1);
}
