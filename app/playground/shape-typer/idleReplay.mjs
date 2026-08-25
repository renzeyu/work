export const IDLE_REPLAY_INTERVAL_MS = 4_000;

/**
 * Run one replay at a time on a refreshable idle clock. Recursive timeouts
 * avoid interval catch-up after a busy frame or a backgrounded tab.
 *
 * @param {{
 *   onReplay: () => void;
 *   intervalMs?: number;
 *   setTimer?: (callback: () => void, delay: number) => unknown;
 *   clearTimer?: (timer: unknown) => void;
 * }} options
 */
export function createIdleReplayController({
  onReplay,
  intervalMs = IDLE_REPLAY_INTERVAL_MS,
  setTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimer = (timer) => globalThis.clearTimeout(timer),
}) {
  if (typeof onReplay !== "function") {
    throw new TypeError("createIdleReplayController requires onReplay");
  }

  const safeInterval = Number.isFinite(intervalMs)
    ? Math.max(1, Math.trunc(intervalMs))
    : IDLE_REPLAY_INTERVAL_MS;
  let timer = null;
  let running = false;
  let generation = 0;

  function clearScheduledReplay() {
    generation += 1;
    if (timer === null) return;
    clearTimer(timer);
    timer = null;
  }

  function arm() {
    clearScheduledReplay();
    if (!running) return;
    const scheduledGeneration = generation;

    timer = setTimer(() => {
      if (!running || scheduledGeneration !== generation) return;
      timer = null;
      onReplay();
      arm();
    }, safeInterval);
  }

  return {
    start() {
      running = true;
      arm();
    },
    refresh() {
      if (!running) return;
      arm();
    },
    pause() {
      running = false;
      clearScheduledReplay();
    },
  };
}
