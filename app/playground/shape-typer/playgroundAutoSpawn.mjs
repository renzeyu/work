export const PLAYGROUND_AUTO_SPAWN_INTERVAL_MS = 1_000;
export const PLAYGROUND_AUTOPLAY_RESUME_DELAY_MS = 3_000;
export const PLAYGROUND_AUTO_SPAWN_INSET_RATIO = 0.1;
export const PLAYGROUND_AUTO_SPAWN_MAX_BODIES = 6;

function unitRandom(random) {
  const value = Number(random());
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(Math.max(value, 0), 0.999999);
}

export function playgroundAutoSpawnPosition(width, random = Math.random) {
  const safeWidth = Number.isFinite(width) ? Math.max(width, 0) : 0;
  const inset = safeWidth * PLAYGROUND_AUTO_SPAWN_INSET_RATIO;

  return {
    x: inset + unitRandom(random) * Math.max(safeWidth - inset * 2, 0),
    y: 0,
  };
}

/**
 * Schedule one automatic drop at a time. User interaction pauses the loop,
 * then a quiet period resumes it without catch-up bursts.
 *
 * @param {{
 *   onSpawn: () => void;
 *   onResume?: () => void;
 *   intervalMs?: number;
 *   resumeDelayMs?: number;
 *   setTimer?: (callback: () => void, delay: number) => unknown;
 *   clearTimer?: (timer: unknown) => void;
 * }} options
 */
export function createPlaygroundAutoSpawnController({
  onSpawn,
  onResume = () => {},
  intervalMs = PLAYGROUND_AUTO_SPAWN_INTERVAL_MS,
  resumeDelayMs = PLAYGROUND_AUTOPLAY_RESUME_DELAY_MS,
  setTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimer = (timer) => globalThis.clearTimeout(timer),
}) {
  if (typeof onSpawn !== "function") {
    throw new TypeError("createPlaygroundAutoSpawnController requires onSpawn");
  }
  if (typeof onResume !== "function") {
    throw new TypeError("createPlaygroundAutoSpawnController requires a valid onResume");
  }

  const safeInterval = Number.isFinite(intervalMs)
    ? Math.max(1, Math.trunc(intervalMs))
    : PLAYGROUND_AUTO_SPAWN_INTERVAL_MS;
  const safeResumeDelay = Number.isFinite(resumeDelayMs)
    ? Math.max(1, Math.trunc(resumeDelayMs))
    : PLAYGROUND_AUTOPLAY_RESUME_DELAY_MS;
  let timer = null;
  let eligible = false;
  let pausedForInteraction = false;
  let disposed = false;
  let generation = 0;

  function clearScheduledAction() {
    generation += 1;
    if (timer === null) return;
    clearTimer(timer);
    timer = null;
  }

  function armSpawn() {
    clearScheduledAction();
    if (!eligible || pausedForInteraction || disposed) return;
    const scheduledGeneration = generation;

    timer = setTimer(() => {
      if (
        !eligible ||
        pausedForInteraction ||
        disposed ||
        scheduledGeneration !== generation
      ) {
        return;
      }

      timer = null;
      onSpawn();
      if (scheduledGeneration === generation && timer === null) armSpawn();
    }, safeInterval);
  }

  function armResume() {
    clearScheduledAction();
    if (!eligible || !pausedForInteraction || disposed) return;
    const scheduledGeneration = generation;

    timer = setTimer(() => {
      if (
        !eligible ||
        !pausedForInteraction ||
        disposed ||
        scheduledGeneration !== generation
      ) {
        return;
      }

      timer = null;
      pausedForInteraction = false;
      onResume();
      if (scheduledGeneration === generation && timer === null) armSpawn();
    }, safeResumeDelay);
  }

  return {
    setEligible(nextEligible) {
      if (disposed) return;
      const normalizedEligibility = Boolean(nextEligible);
      if (eligible === normalizedEligibility) return;
      eligible = normalizedEligibility;
      if (eligible) {
        if (pausedForInteraction) {
          armResume();
        } else {
          armSpawn();
        }
      } else {
        clearScheduledAction();
      }
    },
    interact() {
      if (disposed) return;
      pausedForInteraction = true;
      armResume();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      eligible = false;
      clearScheduledAction();
    },
  };
}
