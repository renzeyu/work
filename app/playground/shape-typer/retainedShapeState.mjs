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
