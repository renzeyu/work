import { SHAPE_BRAND_COLORS, SHAPE_GLYPHS } from "./shapeLibrary.mjs";
import { SHAPE_GLYPH_HULLS } from "./shapeCollisionHulls.mjs";

export const PLAYGROUND_MAX_BODIES = 8;
export const PLAYGROUND_FIXED_STEP_MS = 1000 / 60;
export const PLAYGROUND_MAX_FRAME_DELTA_MS = 50;
export const PLAYGROUND_MAX_CATCH_UP_STEPS = 3;
export const PLAYGROUND_COLLIDER_SCALE = 1.08;
export const PLAYGROUND_SHAPE_SIZE_RATIO = 0.34;

export const PLAYGROUND_PHYSICS = Object.freeze({
  friction: 0.25,
  frictionAir: 0.01,
  frictionStatic: 0.6,
  restitution: 0.3,
});

const FALLBACK_HULL = Object.freeze([
  [-0.5, -0.5],
  [0.5, -0.5],
  [0.5, 0.5],
  [-0.5, 0.5],
]);

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function unitRandom(random) {
  const value = Number(random());
  if (!Number.isFinite(value)) return 0;
  return clamp(value, 0, 0.999999);
}

export function playgroundShortSide(width, height) {
  const safeWidth = Number.isFinite(width) ? Math.max(width, 1) : 1;
  const safeHeight = Number.isFinite(height) ? Math.max(height, 1) : 1;
  return Math.min(safeWidth, safeHeight);
}

export function playgroundBodyLimit(requestedLimit = PLAYGROUND_MAX_BODIES) {
  if (!Number.isFinite(requestedLimit)) return PLAYGROUND_MAX_BODIES;
  return Math.min(
    Math.max(Math.trunc(requestedLimit), 1),
    PLAYGROUND_MAX_BODIES,
  );
}

export function createPlaygroundColorCycle({
  palette = SHAPE_BRAND_COLORS,
  random = Math.random,
} = {}) {
  const colors = [...new Set(palette)];
  let remaining = [];
  let previousColor;

  function refill() {
    remaining = [...colors];
    for (let index = remaining.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(unitRandom(random) * (index + 1));
      [remaining[index], remaining[swapIndex]] = [
        remaining[swapIndex],
        remaining[index],
      ];
    }

    if (
      remaining.length > 1 &&
      previousColor !== undefined &&
      remaining[0] === previousColor
    ) {
      [remaining[0], remaining[1]] = [remaining[1], remaining[0]];
    }
  }

  return {
    next() {
      if (remaining.length === 0) refill();
      const color = remaining.shift();
      previousColor = color;
      return color;
    },
    reset() {
      remaining = [];
      previousColor = undefined;
    },
  };
}

export function playgroundCollider(glyph, inkWidth, inkHeight) {
  const width = Math.max(Number(inkWidth) || 1, 1) * PLAYGROUND_COLLIDER_SCALE;
  const height = Math.max(Number(inkHeight) || 1, 1) * PLAYGROUND_COLLIDER_SCALE;
  const normalizedHull = SHAPE_GLYPH_HULLS[glyph]?.v ?? FALLBACK_HULL;

  return {
    kind: "vertices",
    vertices: normalizedHull.map(([x, y]) => ({
      x: x * width,
      y: y * height,
    })),
  };
}

export function playgroundGlyphInkSize(glyph, fontSize) {
  const normalizedSize = Math.max(Number(fontSize) || 1, 1);
  const hull = SHAPE_GLYPH_HULLS[glyph];
  return {
    width: (hull?.w ?? 0.75) * normalizedSize,
    height: (hull?.h ?? 0.75) * normalizedSize,
  };
}

export function createPlaygroundSpawnSpec({
  color,
  x,
  y,
  width,
  height,
  random = Math.random,
}) {
  const glyph = SHAPE_GLYPHS[
    Math.floor(unitRandom(random) * SHAPE_GLYPHS.length)
  ];
  const resolvedColor = SHAPE_BRAND_COLORS.includes(color)
    ? color
    : SHAPE_BRAND_COLORS[0];
  const shortSide = playgroundShortSide(width, height);
  const size =
    shortSide *
    PLAYGROUND_SHAPE_SIZE_RATIO *
    (0.88 + unitRandom(random) * 0.22);
  const safeRadius = size * 0.82;
  const maximumX = Math.max(safeRadius, width - safeRadius);
  const maximumY = Math.max(safeRadius, height - safeRadius);

  return {
    glyph,
    color: resolvedColor,
    x: clamp(x, safeRadius, maximumX),
    y: clamp(y, safeRadius, maximumY),
    size,
    fontSize: size * 1.08,
    angle: (unitRandom(random) - 0.5) * Math.PI * 0.7,
    angularVelocity: (unitRandom(random) - 0.5) * 0.075,
    horizontalVelocity: (unitRandom(random) - 0.5) * 1.6,
    density: 0.00135 + unitRandom(random) * 0.00065,
    restitution:
      PLAYGROUND_PHYSICS.restitution + unitRandom(random) * 0.08,
  };
}
