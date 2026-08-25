import {
  rpanABarMask,
  rpanLayoutBoxes,
  rpanMorphPaths,
  rpanRTrimMask,
  rpanTravel,
} from "./rpanLogoGeometry";

export const AMA_DURATION_MS = 1010;
export const RPAN_DURATION_MS = 1280;

// Keep animated SVG layers allocated at their visually empty endpoints. Exact
// zero scales produce a singular compositor matrix, and exact zero-length
// round dashes can make an SVG mask alternate between a culled layer and a
// one-pixel cap as the infinite animation wraps.
export const MIN_COMPOSITOR_SCALE = 0.0001;
export const RPAN_MIN_MASK_DASH = 0.01;

type MotionSample = readonly [
  frame: number,
  x: number,
  width: number,
  opacity?: number,
  scaleY?: number,
  visibility?: "hidden" | "visible",
];

type MotionTrack = {
  canvasWidth: number;
  duration: number;
  interpolation?: "smooth" | "stepped";
  frameStarts: readonly number[];
  baseX: number;
  baseWidth: number;
  jumpAfterFrames?: readonly number[];
  segmentEasing?: Readonly<Record<number, string>>;
  samples: readonly MotionSample[];
};

type StrokeDashSample = readonly [
  frame: number,
  dashLength: number,
  opacity?: number,
];

type StrokeDashTrack = {
  duration: number;
  interpolation?: "smooth" | "stepped";
  frameStarts: readonly number[];
  segmentEasing?: Readonly<Record<number, string>>;
  samples: readonly StrokeDashSample[];
};

type PathMorphSample = readonly [frame: number, progress: number];

type PathMorphTrack = {
  duration: number;
  frameStarts: readonly number[];
  from: string;
  to: string;
  samples: readonly PathMorphSample[];
};

export type LoaderTransport = {
  destroy: () => void;
  isRunning: () => boolean;
  pause: () => void;
  play: () => void;
  restart: () => void;
  setActiveAnimations: (activeAnimations: readonly Animation[]) => void;
  setRate: (rate: number) => void;
};

const amaFrameDelays = [
  30, 40, 30, 30, 40, 30, 30, 40, 30, 30, 40, 30, 30, 40, 30, 30, 40, 30, 30,
  40, 30, 30, 40, 30, 30, 40, 30, 30, 40, 40,
] as const;

function frameStartsFromDelays(delays: readonly number[]) {
  let elapsed = 0;
  return [
    ...delays.map((delay) => {
      const start = elapsed;
      elapsed += delay;
      return start;
    }),
    elapsed,
  ];
}

const amaFrameStarts = frameStartsFromDelays(amaFrameDelays);
const rpanFrameStarts = Array.from({ length: 33 }, (_, frame) => frame * 40);

function uniformWrapSamples(
  baseWidth: number,
  baseHeight: number,
  samples: readonly (readonly [
    frame: number,
    x: number,
    width: number,
    height: number,
  ])[],
): MotionSample[] {
  return samples.map(([frame, x, width, height]) => [
    frame,
    x,
    width,
    1,
    height / baseHeight,
  ]);
}

export const rpanRMainSamples = [
  // The loop opens in the same covered handoff state that frame 32 closes in.
  // While the source letters cover both positions, this layer resets to R
  // during the static hold instead of jumping from P to R at the loop seam.
  [0, 249.75, 112.5],
  [2, 249.75, 112.5],
  [3, 249.75, 112.5, 1, 1, "hidden"],
  [4, 249.75, 112.5, 1, 1, "hidden"],
  [5, 119.25, 112.5, 1, 1, "hidden"],
  [6, 119.25, 112.5, 1, 1, "hidden"],
  [7, 119.25, 112.5],
  [13, 119.25, 112.5],
  [14, 124.26923, 112.5],
  [15, 133.30385, 112.5],
  [16, 145.35, 112.5],
  [17, 160.40769, 112.5],
  [18, 175.46538, 112.5],
  [19, 192.53077, 112.5],
  [20, 208.59231, 112.5],
  [21, 222.64615, 112.5],
  [22, 235.69615, 112.5],
  [23, 244.73077, 112.5],
  [24, 249.75, 112.5],
  [32, 249.75, 112.5],
] as const satisfies readonly MotionSample[];

export const rpanPWrapSamples = uniformWrapSamples(109.5, 121.5, [
  [0, 441, 0, 0],
  [1, 441, 0, 0],
  [2, 249.75, 109.5, 121.5],
  [12, 249.75, 109.5, 121.5],
  [13, 249.75, 109.5, 120.5041],
  [14, 257.84325, 104.47706, 115.52459],
  [15, 271.00057, 97.44495, 107.55738],
  [16, 288.20709, 88.40367, 96.60246],
  [17, 310.46739, 75.34404, 83.65574],
  [18, 333.74256, 62.2844, 68.71721],
  [19, 358.0326, 49.22477, 53.77869],
  [20, 381.30777, 36.16514, 38.84016],
  [21, 403.56807, 23.1055, 24.89754],
  [22, 421.78431, 13.05963, 12.94672],
  [23, 435.95136, 5.02294, 3.98361],
  [24, 441, 0, 0],
  [32, 441, 0, 0],
]);

export const rpanRIncomingWrapSamples = uniformWrapSamples(112.5, 121.5, [
  [0, 119.25, 112.5, 121.5],
  [8, 119.25, 112.5, 121.5],
  [9, 33, 0, 0],
  [13, 33, 0, 0],
  [14, 34.95531, 4.93421, 4.97951],
  [15, 40.83553, 12.82895, 13.94262],
  [16, 48.67309, 24.67105, 24.89754],
  [17, 58.47618, 36.51316, 38.84016],
  [18, 69.25998, 49.34211, 52.78279],
  [19, 80.0397, 64.14474, 67.72131],
  [20, 90.82146, 77.96053, 83.65574],
  [21, 100.62455, 89.80263, 97.59836],
  [22, 109.44896, 99.67105, 107.55738],
  [23, 115.32917, 107.56579, 115.52459],
  [24, 118.26724, 112.5, 121.5],
  [25, 119.25, 112.5, 121.5],
  [32, 119.25, 112.5, 121.5],
]);

export const rpanAMainSamples = [
  // Match the terminal N state at offset zero, then reset invisibly beneath
  // the supplied N and A outlines during the opening hold.
  [0, 243.75, 111],
  [2, 243.75, 111],
  [3, 243.75, 111, 1, 1, "hidden"],
  [4, 243.75, 111, 1, 1, "hidden"],
  [5, 119.25, 111, 1, 1, "hidden"],
  [6, 119.25, 111, 1, 1, "hidden"],
  [7, 119.25, 111],
  [18, 119.25, 111],
  [19, 120.20038, 111],
  [20, 124.95229, 111],
  [21, 133.50573, 111],
  [22, 144.91031, 111],
  [23, 158.21565, 111],
  [24, 173.42176, 111],
  [25, 181.02481, 111],
  [26, 196.23092, 111],
  [27, 211.43702, 111],
  [28, 223.79198, 111],
  [29, 234.24618, 111],
  [30, 240.89885, 111],
  [31, 243.75, 111],
  [32, 243.75, 111],
] as const satisfies readonly MotionSample[];

export const rpanNWrapSamples = uniformWrapSamples(117, 120, [
  [0, 439, 0, 0],
  [1, 439, 0, 0],
  [2, 243.75, 117, 120],
  [18, 243.75, 117, 120],
  [19, 244.75092, 116, 117.9661],
  [20, 251.76007, 112, 113.89831],
  [21, 265.77839, 104, 105.76271],
  [22, 283.80128, 93, 95.59322],
  [23, 304.82875, 81, 81.35593],
  [24, 328.85989, 67, 67.11864],
  [25, 341.87637, 59, 61.01695],
  [26, 365.90751, 45, 44.74576],
  [27, 387.9359, 32, 30.50847],
  [28, 407.96154, 20, 18.30508],
  [29, 424.98352, 10, 8.13559],
  [30, 436.99817, 2, 1.01695],
  [31, 439, 0, 0],
  [32, 439, 0, 0],
]);

export const rpanAIncomingWrapSamples = uniformWrapSamples(111, 117, [
  [0, 119.25, 111, 117],
  [8, 119.25, 111, 117],
  [9, 27, 0, 0],
  [19, 27, 0, 0],
  [20, 31.2744, 4.74359, 3.9661],
  [21, 37.74133, 13.28205, 13.88136],
  [22, 46.32701, 23.71795, 23.79661],
  [23, 56.00896, 36.05128, 37.67797],
  [24, 67.77278, 49.33333, 51.55932],
  [25, 73.14344, 55.97436, 57.50847],
  [26, 84.90726, 69.25641, 73.37288],
  [27, 95.64859, 82.53846, 86.26271],
  [28, 105.29365, 93.92308, 99.15254],
  [29, 112.78307, 102.46154, 107.08475],
  [30, 118.11685, 108.15385, 114.02542],
  [31, 119.25, 111, 117],
  [32, 119.25, 111, 117],
]);

export const motionTracks: Record<string, MotionTrack> = {
  "ama-a-outgoing": {
    canvasWidth: 1080,
    duration: AMA_DURATION_MS,
    frameStarts: amaFrameStarts,
    baseX: 299,
    baseWidth: 158,
    samples: [
      [0, 299, 158],
      [1, 299, 158],
      [2, 300, 158],
      [3, 301, 157],
      [4, 302, 157],
      [5, 304, 156],
      [6, 307, 155],
      [7, 311, 153],
      [8, 315, 151],
      [9, 321, 148],
      [10, 328, 145],
      [11, 339, 140],
      [12, 353, 134],
      [13, 376, 108],
      [14, 376, 108, 0],
      [30, 299, 158, 1],
    ],
  },
  "ama-m": {
    canvasWidth: 1080,
    duration: AMA_DURATION_MS,
    frameStarts: amaFrameStarts,
    baseX: 465,
    baseWidth: 160,
    samples: [
      [0, 465, 160],
      [2, 465, 160],
      [3, 466, 160],
      [4, 466, 162],
      [5, 467, 163],
      [6, 468, 164],
      [7, 470, 165],
      [8, 472, 167],
      [9, 474, 171],
      [10, 478, 176],
      [11, 482, 177],
      [12, 488, 191],
      [13, 394, 198],
      [14, 411, 190],
      [15, 430, 177],
      [16, 435, 177],
      [17, 445, 170],
      [18, 451, 167],
      [19, 455, 164],
      [20, 457, 164],
      [21, 459, 163],
      [22, 461, 162],
      [23, 462, 162],
      [24, 463, 161],
      [25, 463, 161],
      [26, 464, 160],
      [27, 465, 160],
      [30, 465, 160],
    ],
  },
  "ama-a-right": {
    canvasWidth: 1080,
    duration: AMA_DURATION_MS,
    frameStarts: amaFrameStarts,
    baseX: 633,
    baseWidth: 157,
    samples: [
      [0, 633, 157],
      [1, 634, 156],
      [2, 635, 155],
      [3, 636, 154],
      [4, 638, 152],
      [5, 640, 151],
      [6, 643, 148],
      [7, 646, 145],
      [8, 651, 140],
      [9, 657, 135],
      [10, 668, 125],
      [11, 731, 67],
      [12, 797, 1, 0],
      [13, 570, 144, 1],
      [14, 603, 133],
      [15, 611, 140],
      [16, 616, 145],
      [17, 620, 149],
      [18, 623, 151],
      [19, 626, 153],
      [20, 628, 154],
      [21, 629, 156],
      [22, 630, 157],
      [23, 631, 157],
      [24, 631, 158],
      [25, 632, 158],
      [26, 632, 158],
      [27, 633, 157],
      [30, 633, 157],
    ],
  },
  "ama-a-incoming": {
    canvasWidth: 1080,
    duration: AMA_DURATION_MS,
    frameStarts: amaFrameStarts,
    baseX: 299,
    baseWidth: 158,
    samples: [
      [0, 289, 1, 0],
      [13, 289, 1, 0],
      [14, 289, 34, 1],
      [15, 293, 79],
      [16, 297, 124],
      [17, 297, 135],
      [18, 298, 140],
      [19, 298, 145],
      [20, 298, 149],
      [21, 299, 150],
      [22, 299, 152],
      [23, 299, 154],
      [24, 299, 155],
      [25, 299, 156],
      [26, 299, 157],
      [27, 299, 158],
      [29, 299, 158],
      [30, 299, 158, 0],
    ],
  },
  "rpan-r-main": {
    canvasWidth: 480,
    duration: RPAN_DURATION_MS,
    interpolation: "smooth",
    frameStarts: rpanFrameStarts,
    baseX: 119.25,
    baseWidth: 112.5,
    samples: rpanRMainSamples,
  },
  "rpan-p": {
    canvasWidth: 480,
    duration: RPAN_DURATION_MS,
    interpolation: "smooth",
    frameStarts: rpanFrameStarts,
    baseX: 249.75,
    baseWidth: 109.5,
    jumpAfterFrames: [1],
    samples: rpanPWrapSamples,
  },
  "rpan-r-incoming": {
    canvasWidth: 480,
    duration: RPAN_DURATION_MS,
    interpolation: "smooth",
    frameStarts: rpanFrameStarts,
    baseX: 119.25,
    baseWidth: 112.5,
    jumpAfterFrames: [8],
    samples: rpanRIncomingWrapSamples,
  },
  "rpan-a-main": {
    canvasWidth: 480,
    duration: RPAN_DURATION_MS,
    interpolation: "smooth",
    frameStarts: rpanFrameStarts,
    baseX: 119.25,
    baseWidth: 111,
    samples: rpanAMainSamples,
  },
  "rpan-n": {
    canvasWidth: 480,
    duration: RPAN_DURATION_MS,
    interpolation: "smooth",
    frameStarts: rpanFrameStarts,
    baseX: 243.75,
    baseWidth: 117,
    jumpAfterFrames: [1],
    samples: rpanNWrapSamples,
  },
  "rpan-a-incoming": {
    canvasWidth: 480,
    duration: RPAN_DURATION_MS,
    interpolation: "smooth",
    frameStarts: rpanFrameStarts,
    baseX: 119.25,
    baseWidth: 111,
    jumpAfterFrames: [8],
    samples: rpanAIncomingWrapSamples,
  },
};

export const rpanABarMaskSamples = [
  [0, 0],
  [4, 0],
  [5, rpanABarMask.length],
  [21, rpanABarMask.length],
  [22, (rpanABarMask.length * 58) / 83],
  [23, (rpanABarMask.length * 50.5) / 83],
  [24, (rpanABarMask.length * 42.5) / 83],
  [25, (rpanABarMask.length * 38.5) / 83],
  [26, (rpanABarMask.length * 30) / 83],
  [27, (rpanABarMask.length * 21.5) / 83],
  [28, (rpanABarMask.length * 15) / 83],
  [29, (rpanABarMask.length * 9.5) / 83],
  [30, 0],
  [32, 0],
] satisfies readonly StrokeDashSample[];

const rpanRTrimProgressSamples = [
  [0, 0],
  [4, 0],
  [5, 1],
  [13, 1],
  [14, 48.25 / 56],
  [15, 44.75 / 56],
  [16, 40.25 / 56],
  [17, 35.5 / 56],
  [18, 30 / 56],
  [19, 24.25 / 56],
  [20, 18.5 / 56],
  [21, 13.5 / 56],
  [22, 9 / 56],
  [23, 5.75 / 56],
  [24, 0],
  [32, 0],
] as const;

export const rpanRTrimMaskSamples: readonly StrokeDashSample[] =
  rpanRTrimProgressSamples.map(([frame, remaining]) => [
    frame,
    rpanRTrimMask.length * remaining,
  ]);

export const rpanRBodyMorphSamples: readonly PathMorphSample[] =
  rpanRTrimProgressSamples.map(([frame, remaining]) => [
    frame,
    1 - remaining,
  ]);

export const rpanABodyMorphSamples: readonly PathMorphSample[] =
  rpanAMainSamples.map(([frame, x]): PathMorphSample => [
    frame,
    (x - rpanLayoutBoxes.a.x) / rpanTravel.aToN,
  ]);

const strokeDashTracks: Record<string, StrokeDashTrack> = {
  "rpan-r-trim-mask-dash": {
    duration: RPAN_DURATION_MS,
    interpolation: "smooth",
    frameStarts: rpanFrameStarts,
    samples: rpanRTrimMaskSamples,
  },
  "rpan-a-bar-mask-dash": {
    duration: RPAN_DURATION_MS,
    interpolation: "smooth",
    frameStarts: rpanFrameStarts,
    samples: rpanABarMaskSamples,
  },
};

const pathMorphTracks: Record<string, PathMorphTrack> = {
  "rpan-r-body-path": {
    duration: RPAN_DURATION_MS,
    frameStarts: rpanFrameStarts,
    from: rpanMorphPaths.rToP.from,
    to: rpanMorphPaths.rToP.to,
    samples: rpanRBodyMorphSamples,
  },
  "rpan-a-body-path": {
    duration: RPAN_DURATION_MS,
    frameStarts: rpanFrameStarts,
    from: rpanMorphPaths.aToN.from,
    to: rpanMorphPaths.aToN.to,
    samples: rpanABodyMorphSamples,
  },
};

function sampleTime(frameStarts: readonly number[], frame: number) {
  const lowerFrame = Math.floor(frame);
  const upperFrame = Math.ceil(frame);
  const lowerTime = frameStarts[lowerFrame];

  if (lowerFrame === upperFrame) return lowerTime;

  const upperTime = frameStarts[upperFrame];
  return lowerTime + (upperTime - lowerTime) * (frame - lowerFrame);
}

function keyframesForTrack(track: MotionTrack): Keyframe[] {
  const baseCenter = track.baseX + track.baseWidth / 2;
  const animatesOpacity = track.samples.some(
    (sample) => (sample[3] ?? 1) !== 1,
  );
  const animatesVisibility = track.samples.some(
    (sample) => (sample[5] ?? "visible") !== "visible",
  );

  return track.samples.map(
    ([frame, x, width, opacity = 1, scaleY = 1, visibility = "visible"]) => {
      const center = x + width / 2;
      const translate = ((center - baseCenter) / track.baseWidth) * 100;
      const scale = width / track.baseWidth;
      const rasterScale =
        Math.abs(scale) < MIN_COMPOSITOR_SCALE
          ? MIN_COMPOSITOR_SCALE
          : scale;
      const rasterScaleY =
        Math.abs(scaleY) < MIN_COMPOSITOR_SCALE
          ? MIN_COMPOSITOR_SCALE
          : scaleY;
      const easing = track.jumpAfterFrames?.includes(frame)
        ? "steps(1, end)"
        : (track.segmentEasing?.[frame] ??
          (track.interpolation === "smooth" ? "linear" : "steps(1, end)"));

      return {
        easing,
        offset: sampleTime(track.frameStarts, frame) / track.duration,
        ...(animatesOpacity ? { opacity } : {}),
        ...(animatesVisibility ? { visibility } : {}),
        transform: `translateX(${translate.toFixed(5)}%) scaleX(${rasterScale.toFixed(5)}) scaleY(${rasterScaleY.toFixed(5)})`,
      };
    },
  );
}

function keyframesForStrokeDashTrack(track: StrokeDashTrack): Keyframe[] {
  const animatesOpacity = track.samples.some(
    (sample) => (sample[2] ?? 1) !== 1,
  );

  return track.samples.map(([frame, dashLength, opacity = 1]) => {
    const rasterDashLength = Math.max(RPAN_MIN_MASK_DASH, dashLength);

    return {
      easing:
        track.segmentEasing?.[frame] ??
        (track.interpolation === "smooth" ? "linear" : "steps(1, end)"),
      offset: sampleTime(track.frameStarts, frame) / track.duration,
      ...(animatesOpacity ? { opacity } : {}),
      strokeDasharray: `${rasterDashLength} 1000`,
    };
  });
}

const pathNumberPattern = /-?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi;

function interpolateCompatiblePath(from: string, to: string, progress: number) {
  const fromNumbers = from.match(pathNumberPattern)?.map(Number) ?? [];
  const toNumbers = to.match(pathNumberPattern)?.map(Number) ?? [];
  const fromCommands = from.replace(pathNumberPattern, "#");
  const toCommands = to.replace(pathNumberPattern, "#");

  if (
    fromCommands !== toCommands ||
    fromNumbers.length !== toNumbers.length
  ) {
    throw new Error("Loader path morph endpoints have incompatible topology");
  }

  if (progress <= 0) return from;
  if (progress >= 1) return to;

  const clampedProgress = Math.min(1, Math.max(0, progress));
  let numberIndex = 0;

  return from.replace(pathNumberPattern, () => {
    const fromValue = fromNumbers[numberIndex];
    const toValue = toNumbers[numberIndex];
    numberIndex += 1;
    const value = fromValue + (toValue - fromValue) * clampedProgress;
    return Math.abs(value) < 0.000005
      ? "0"
      : Number(value.toFixed(5)).toString();
  });
}

function keyframesForPathMorphTrack(track: PathMorphTrack): Keyframe[] {
  return track.samples.map(([frame, progress]) => ({
    d: `path("${interpolateCompatiblePath(track.from, track.to, progress)}")`,
    easing: "linear",
    offset: sampleTime(track.frameStarts, frame) / track.duration,
  }));
}

function createAnimation(
  target: Element,
  keyframes: Keyframe[],
  duration: number,
) {
  const effect = new KeyframeEffect(target, keyframes, {
    duration,
    easing: "linear",
    fill: "both",
    iterations: Infinity,
  });
  const animation = new Animation(effect, document.timeline);
  animation.currentTime = 0;
  animation.pause();
  return animation;
}

export function createMotionAnimations(root: HTMLElement): Animation[] {
  const layerAnimations = Object.entries(motionTracks).map(([name, track]) => {
    const target = root.querySelector<HTMLElement>(
      `[data-motion-layer="${name}"]`,
    );

    if (!target) {
      throw new Error(`Missing loader motion layer: ${name}`);
    }

    return createAnimation(target, keyframesForTrack(track), track.duration);
  });

  const strokeDashAnimations = Object.entries(strokeDashTracks).map(
    ([name, track]) => {
      const target = root.querySelector<SVGPathElement>(
        `[data-motion-property="${name}"]`,
      );

      if (!target) {
        throw new Error(`Missing loader motion property: ${name}`);
      }

      return createAnimation(
        target,
        keyframesForStrokeDashTrack(track),
        track.duration,
      );
    },
  );

  const pathMorphAnimations = Object.entries(pathMorphTracks).map(
    ([name, track]) => {
      const target = root.querySelector<SVGPathElement>(
        `[data-motion-property="${name}"]`,
      );

      if (!target) {
        throw new Error(`Missing loader motion property: ${name}`);
      }

      return createAnimation(
        target,
        keyframesForPathMorphTrack(track),
        track.duration,
      );
    },
  );

  return [
    ...layerAnimations,
    ...strokeDashAnimations,
    ...pathMorphAnimations,
  ];
}

export function createLoaderTransport(
  animations: readonly Animation[],
  now: () => number,
): LoaderTransport {
  const knownAnimations = new Set(animations);
  let activeAnimations = new Set(animations);
  let anchor = now();
  let destroyed = false;
  let elapsed = 0;
  let rate = 1;
  let running = false;

  function elapsedAt(time: number) {
    return running ? elapsed + (time - anchor) * rate : elapsed;
  }

  function alignAnimations(time: number) {
    animations.forEach((animation) => {
      animation.playbackRate = rate;

      if (!running || !activeAnimations.has(animation)) {
        animation.pause();
        animation.currentTime = elapsed;
        return;
      }

      animation.currentTime = elapsed;
      animation.play();
      animation.startTime = time - elapsed / rate;
    });
  }

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      running = false;
      animations.forEach((animation) => animation.cancel());
    },
    isRunning() {
      return !destroyed && running;
    },
    pause() {
      if (destroyed || !running) return;
      const time = now();
      elapsed = elapsedAt(time);
      anchor = time;
      running = false;
      alignAnimations(time);
    },
    play() {
      if (destroyed || running) return;
      anchor = now();
      running = true;
      alignAnimations(anchor);
    },
    restart() {
      if (destroyed) return;
      const time = now();
      elapsed = 0;
      anchor = time;
      alignAnimations(time);
    },
    setActiveAnimations(nextAnimations: readonly Animation[]) {
      if (destroyed) return;
      const nextActiveAnimations = new Set(
        nextAnimations.filter((animation) => knownAnimations.has(animation)),
      );
      if (
        nextActiveAnimations.size === activeAnimations.size &&
        [...nextActiveAnimations].every((animation) =>
          activeAnimations.has(animation),
        )
      ) {
        return;
      }

      const time = now();
      elapsed = elapsedAt(time);
      anchor = time;
      activeAnimations = nextActiveAnimations;
      alignAnimations(time);
    },
    setRate(nextRate: number) {
      if (destroyed || nextRate === rate) return;
      const time = now();
      elapsed = elapsedAt(time);
      anchor = time;
      rate = nextRate;
      alignAnimations(time);
    },
  };
}
