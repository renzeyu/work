import { SHAPE_COLOR_VALUES } from "./shapeColorSequence.mjs";

export const SHAPE_GLYPHS = Object.freeze(
  Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"),
);

export const SHAPE_BRAND_COLORS = Object.freeze([...SHAPE_COLOR_VALUES]);

export const SHAPE_PALETTE = Object.freeze([
  { name: "Signal red", value: SHAPE_BRAND_COLORS[0] },
  { name: "Bright blue", value: SHAPE_BRAND_COLORS[1] },
  { name: "Golden yellow", value: SHAPE_BRAND_COLORS[2] },
  { name: "Black", value: SHAPE_BRAND_COLORS[3] },
]);
