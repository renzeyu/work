/**
 * Derive the shapes currently visible without mutating the saved configuration.
 *
 * @template {Record<number, unknown>} T
 * @param {T} configuredShapes
 * @param {boolean} keepShapes
 * @returns {{ activeShapes: T, activeCount: number }}
 */
export function createRetainedShapeState(configuredShapes, keepShapes) {
  const activeShapes = keepShapes
    ? configuredShapes
    : /** @type {T} */ ({});

  return {
    activeShapes,
    activeCount: Object.keys(activeShapes).length,
  };
}

/**
 * Use the viewport default until the user makes an explicit choice.
 *
 * @param {boolean | null} override
 * @param {boolean} isMobile
 * @returns {boolean}
 */
export function resolveKeepShapesPreference(override, isMobile) {
  return override ?? !isMobile;
}
