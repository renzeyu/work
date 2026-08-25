export const SHAPE_COLOR_VALUES = [
  "#f84a32",
  "#1682e0",
  "#f9b118",
  "#000000",
];

export const DEFAULT_COLOR_SEED = 1;
export const MIN_COLOR_SEED = 1;
export const MAX_COLOR_SEED = 99;

function normalized(color) {
  return color?.trim().toLowerCase();
}

function mixedInteger(value) {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

function seededRank(seed, position, sequenceIndex, paletteIndex) {
  return mixedInteger(
    normalizeColorSeed(seed) ^
      Math.imul(position + 1, 0x9e3779b1) ^
      Math.imul(sequenceIndex + 1, 0x85ebca6b) ^
      Math.imul(paletteIndex + 1, 0xc2b2ae35),
  );
}

export function normalizeColorSeed(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_COLOR_SEED;
  return Math.min(
    MAX_COLOR_SEED,
    Math.max(MIN_COLOR_SEED, Math.trunc(number)),
  );
}

export function stepColorSeed(value, amount) {
  const range = MAX_COLOR_SEED - MIN_COLOR_SEED + 1;
  const offset = normalizeColorSeed(value) - MIN_COLOR_SEED;
  return (
    ((offset + Math.trunc(amount)) % range + range) % range + MIN_COLOR_SEED
  );
}

/**
 * Assign a repeatable palette to shape-capable character positions.
 *
 * Palette-matching pins are counted before automatic colors are chosen, so
 * generated colors compensate for retained colors across the whole sentence.
 * Among eligible colors, the least-used color always wins and the seed only
 * breaks ties. With no pins, every palette-sized group therefore contains each
 * color exactly once. Equal adjacent pins remain untouched as an intentional
 * user override; every pair containing an automatic color is kept distinct.
 *
 * @param {{
 *   positions: readonly number[];
 *   pinnedColors: Readonly<Record<number, string | undefined>>;
 *   palette: readonly string[];
 *   seed: number;
 * }} options
 * @returns {Record<number, string>}
 */
export function createShapeColorSequence({
  positions,
  pinnedColors,
  palette,
  seed,
}) {
  const seenColors = new Set();
  const paletteEntries = palette.flatMap((color, paletteIndex) => {
    const value = normalized(color);
    if (!value || seenColors.has(value)) return [];
    seenColors.add(value);
    return [{ color, value, paletteIndex }];
  });
  const usage = new Map(
    paletteEntries.map(({ value }) => [value, 0]),
  );

  positions.forEach((position) => {
    const pinnedValue = normalized(pinnedColors[position]);
    if (pinnedValue && usage.has(pinnedValue)) {
      usage.set(pinnedValue, (usage.get(pinnedValue) ?? 0) + 1);
    }
  });

  /** @type {Record<number, string>} */
  const colors = {};
  /** @type {string | undefined} */
  let previousColor;

  positions.forEach((position, sequenceIndex) => {
    const pinnedColor = pinnedColors[position];

    if (pinnedColor) {
      colors[position] = pinnedColor;
      previousColor = normalized(pinnedColor);
      return;
    }

    const nextPosition = positions[sequenceIndex + 1];
    const nextPinnedColor =
      nextPosition === undefined
        ? undefined
        : normalized(pinnedColors[nextPosition]);
    const adjacencySafe = paletteEntries.filter(
      ({ value }) => value !== previousColor && value !== nextPinnedColor,
    );
    const previousSafe = paletteEntries.filter(
      ({ value }) => value !== previousColor,
    );
    const candidates =
      adjacencySafe.length > 0
        ? adjacencySafe
        : previousSafe.length > 0
          ? previousSafe
          : paletteEntries;
    const minimumUsage = Math.min(
      ...candidates.map(({ value }) => usage.get(value) ?? 0),
    );
    const leastUsed = candidates.filter(
      ({ value }) => (usage.get(value) ?? 0) === minimumUsage,
    );
    const selected = leastUsed.reduce((best, candidate) => {
      if (!best) return candidate;
      const candidateRank = seededRank(
        seed,
        position,
        sequenceIndex,
        candidate.paletteIndex,
      );
      const bestRank = seededRank(
        seed,
        position,
        sequenceIndex,
        best.paletteIndex,
      );
      if (candidateRank !== bestRank) {
        return candidateRank < bestRank ? candidate : best;
      }
      return candidate.paletteIndex < best.paletteIndex ? candidate : best;
    }, undefined);

    if (!selected) return;
    colors[position] = selected.color;
    usage.set(selected.value, (usage.get(selected.value) ?? 0) + 1);
    previousColor = selected.value;
  });

  return colors;
}
