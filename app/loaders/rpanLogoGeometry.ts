import rpanSvgMarkup from "./assets/RPAN_icon.svg?raw";
import { buildRpanSvgGeometry } from "./rpanSvgGeometry.mjs";

// RPAN_icon.svg is the only source of letter geometry. This module contains no
// replacement outlines. It parses the supplied asset synchronously so the
// exact curves are available to both SSR and the shared browser timeline.
export const rpanSvgGeometry = buildRpanSvgGeometry(rpanSvgMarkup);

export const RPAN_SOURCE_FILL = rpanSvgGeometry.source.fill;
export const RPAN_SOURCE_VIEWBOX = rpanSvgGeometry.source.viewBox;
export const rpanGlyphPaths = rpanSvgGeometry.glyphPaths;
export const rpanMorphPaths = rpanSvgGeometry.morphPaths;
export const rpanPlacement = rpanSvgGeometry.placement;
export const rpanLayoutBoxes = rpanSvgGeometry.layoutBoxes;
export const rpanTravel = rpanSvgGeometry.travel;
export const rpanRTrimPath = rpanSvgGeometry.rTrimPath;
export const rpanRTrimSeam = rpanSvgGeometry.rTrimSeam;
export const rpanRTrimMask = rpanSvgGeometry.rTrimMask;
export const rpanABarMask = rpanSvgGeometry.aBarMask;

export type RpanGlyphName = keyof typeof rpanGlyphPaths;
