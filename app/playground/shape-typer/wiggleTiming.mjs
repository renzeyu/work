export const DEFAULT_WIGGLE_PERCENT = 10;
export const DEFAULT_WIGGLE_FPS = 3;
export const WIGGLE_POSE_COUNT = 4;

/**
 * @param {{ fps: number; playbackRate?: number }} options
 */
export function createWiggleTiming({ fps, playbackRate = 1 }) {
  const safeFps = Math.max(fps, 0.01);
  const safePlaybackRate = Math.max(playbackRate, 0.01);
  const frameMs = 1000 / (safeFps * safePlaybackRate);

  return {
    frameMs,
    cycleMs: frameMs * WIGGLE_POSE_COUNT,
  };
}
