"use client";

import { motion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./UpvoteLab.module.css";
import { DOWNVOTE_COLOR, UPVOTE_ARROW_COLOR } from "./voteColors";
import { TRACED_UPVOTE_PATH } from "./votePaths";

export type CodeVoteMotionKind =
  | "lift"
  | "clean"
  | "spring"
  | "burst"
  | "ripple"
  | "soft"
  | "quick-burst"
  | "down";

export type VoteMotionThumbnailKind = Exclude<CodeVoteMotionKind, "down">;

type CodeVoteMotionProps = {
  kind: CodeVoteMotionKind;
  mode?: "live" | "preview";
  onComplete?: () => void;
};

type ArrowTrack = {
  baseHeight: number;
  baseTransform: string;
  duration: number;
  fills: string[];
  scaleX?: number[];
  scaleY?: number[];
  times: number[];
  transformOrigin?: string;
  y: number[];
};

type ThumbnailFrame = {
  baseTransform: string;
  fill: string;
  origin: readonly [number, number];
  scaleX?: number;
  scaleY?: number;
  sourceFrame: number;
  viewBox: string;
  y: number;
};

const repeated = <T,>(value: T, count: number) =>
  Array.from({ length: count }, () => value);

const evenlySpacedTimes = (count: number) =>
  Array.from({ length: count }, (_, index) => index / (count - 1));

const keepBottomFixed = (
  y: number[],
  scaleY: number[],
  baseHeight: number,
) =>
  y.map(
    (value, index) =>
      value + ((1 - scaleY[index]) * baseHeight) / 2,
  );

const liftY = [
  0, -218.233, -246, -164, -82, 0, 34.816, 17.874, 0, -4.712,
  -2.419, 0, 0.637, 0.327, 0, -0.086, -0.044, 0, 0.01, 0.006, 0,
];
const liftStartsMs = [
  0, 40, 80, 120, 170, 210, 250, 290, 330, 370, 420, 460, 500, 540,
  580, 620, 670, 710, 750, 790, 830,
];

const downY = [
  0, 118.03, 147.14, 154, 102.67, 51.33, 0, -21.8, -11.19, 0, 2.95,
  1.51, 0, -0.4, -0.21, 0, 0.05, 0.03, 0,
];
const downStartsMs = [
  0, 40, 80, 120, 160, 200, 250, 290, 330, 370, 410, 450, 500, 540,
  580, 620, 660, 700, 750,
];

const cleanY = [-1.42, -18.18, -19.48, -19.48, -18.18, -1.42, -0.13, 0, 0];
const springY = [
  0.9, -17.44, -19.35, -19.44, -18.35, -16.1, -9.85, 1.84, 3.84,
  3.87, 2.82, 1.69, -0.35, -1.16, -1.1, -0.16, 0.77, 0.84, 0.82,
  0.65, -0.05, -0.1, -0.1, 0, 0,
];

const sharedArrowY = [-1, -18, -18, -18, -18, -1, 0, 0, 0, 0, 0, 0, 0];
const sharedArrowScaleY = [1, 1, 1.2, 1.2, 1, 1, 1, 1, 0.9, 0.9, 0.98, 1, 1];
const sharedArrowFills = [
  "#fbbb03",
  "#fa8303",
  "#fb6b03",
  "#fb5b03",
  "#fa4b03",
  "#fb4703",
  "#fb4303",
  "#fb4303",
  "#fb4303",
  "#fb4303",
  "#fb4303",
  "#fb4303",
  "#fb4303",
];

const softArrowFills = [
  ...sharedArrowFills.slice(0, -2),
  UPVOTE_ARROW_COLOR,
  UPVOTE_ARROW_COLOR,
];

const burstArrowY = [-1, -18, -18, -19, -18, -1, 0, 0, 0, 0, 0, 0, 0];
const burstArrowScaleY = [
  1, 1.053, 1.316, 1.263, 1.053, 1.053, 1.053, 1.053, 0.947,
  0.947, 1, 1, 1,
];
const burstArrowFills = [
  "#fbbb03",
  "#fa8303",
  "#fb6b03",
  "#fb5b03",
  "#fb4b03",
  "#fb4303",
  "#fb4303",
  "#fb4303",
  "#fb4303",
  "#fb4303",
  "#fb4303",
  "#fb4303",
  "#fb4303",
];

const quickY = [-6.5, -25.5, -38.5, -40, -36.5, -21.5, -3, 3.5, 1.5, 0];
const quickScaleX = [
  0.925926, 0.888889, 0.962963, 1, 0.962963, 0.962963, 0.962963, 1,
  1, 1,
];
const quickScaleY = [
  1.052632, 1.192982, 1.087719, 1, 1.017544, 1.052632, 0.964912,
  0.912281, 0.947368, 1,
];
const quickFills = [
  "#fff000",
  "#ff9c01",
  "#ff7400",
  "#ff6001",
  "#ff5201",
  "#ff4a02",
  "#ff4602",
  "#ff4400",
  "#ff4400",
  "#ff4400",
];

const smallParticleAngles = Array.from(
  { length: 12 },
  (_, index) => -90 + index * 30,
);
const smallParticleDistance = [10.9, 11.42, 12.72, 15.06, 16.97, 17.8, 17.8];
const smallParticleSize = [4, 6.4, 7.2, 5, 3.2, 1.8, 0];
const smallParticleOpacity = [1, 1, 1, 0.9, 0.6, 0.3, 0];

const largeParticleAngles = [-150, -110, -70, -30, 10, 50, 90, 130, 170];
const quickParticleDistance = [0, 50, 71.72, 84.38, 92.09, 96.88, 99.31, 100, 100, 100];
const quickParticleDiameter = [0, 18, 15, 12, 9, 6, 3, 0, 0, 0];

const smallBaseTrack = {
  baseHeight: 19,
  baseTransform: "translate(41 40) scale(.125)",
  transformOrigin: "50% 100%",
} as const;

// The soft-pop canvas stays source-sized so its travel remains exact. Its
// settled silhouette is scaled and centered to match the resting card icon,
// eliminating any size or baseline change when the motion layer hands off.
const softBaseTrack = {
  baseHeight: 19.50869565,
  baseTransform:
    "translate(40.7590389 40.2456522) scale(.1283466819)",
  // Motion renders SVG group scaling around its visual center. Pair that
  // scale with an exact Y compensation so the rounded bottom stays fixed.
  transformOrigin: "50% 50%",
} as const;
const softArrowY = keepBottomFixed(
  sharedArrowY,
  sharedArrowScaleY,
  softBaseTrack.baseHeight,
);

const arrowTracks: Record<CodeVoteMotionKind, ArrowTrack> = {
  lift: {
    baseHeight: 152,
    baseTransform: "translate(468 460)",
    duration: 0.83,
    fills: repeated("#ff4500", liftY.length),
    times: liftStartsMs.map((time) => time / 830),
    y: liftY,
  },
  down: {
    baseHeight: 152,
    baseTransform: "translate(612 620) rotate(180)",
    duration: 0.75,
    fills: repeated(DOWNVOTE_COLOR, downY.length),
    times: downStartsMs.map((time) => time / 750),
    y: downY,
  },
  clean: {
    ...smallBaseTrack,
    duration: 0.32,
    fills: repeated("#fb4303", cleanY.length),
    times: evenlySpacedTimes(cleanY.length),
    y: cleanY,
  },
  spring: {
    ...smallBaseTrack,
    duration: 0.96,
    fills: repeated("#fb4303", springY.length),
    times: evenlySpacedTimes(springY.length),
    y: springY,
  },
  burst: {
    ...smallBaseTrack,
    duration: 0.48,
    fills: burstArrowFills,
    scaleY: burstArrowScaleY,
    times: evenlySpacedTimes(burstArrowY.length),
    y: burstArrowY,
  },
  ripple: {
    ...smallBaseTrack,
    duration: 0.48,
    fills: sharedArrowFills,
    scaleY: sharedArrowScaleY,
    times: evenlySpacedTimes(sharedArrowY.length),
    y: sharedArrowY,
  },
  soft: {
    ...softBaseTrack,
    duration: 0.48,
    fills: softArrowFills,
    scaleY: sharedArrowScaleY,
    times: evenlySpacedTimes(softArrowY.length),
    y: softArrowY,
  },
  "quick-burst": {
    baseHeight: 57,
    baseTransform: "translate(93 90) scale(.375)",
    duration: 0.36,
    fills: quickFills,
    scaleX: quickScaleX,
    scaleY: quickScaleY,
    times: evenlySpacedTimes(quickY.length),
    transformOrigin: "50% 50%",
    y: quickY,
  },
};

function canvasSize(kind: CodeVoteMotionKind, mode: "live" | "preview") {
  if (mode === "preview") {
    return kind === "lift" || kind === "down" ? "142px" : "100px";
  }
  if (kind === "lift" || kind === "down") return "24.495cqw";
  if (kind === "quick-burst") return "14.22cqw";
  return "17.25cqw";
}

function AnimatedArrow({
  onComplete,
  track,
}: {
  onComplete?: () => void;
  track: ArrowTrack;
}) {
  const scaleX = track.scaleX ?? repeated(1, track.y.length);
  const scaleY = track.scaleY ?? repeated(1, track.y.length);
  const y = track.y.map((value) => `${(value / track.baseHeight) * 100}%`);
  const transition = {
    duration: track.duration,
    ease: "linear" as const,
    times: track.times,
  };

  return (
    <motion.g
      animate={{ fill: track.fills, scaleX, scaleY, y }}
      initial={{
        fill: track.fills[0],
        scaleX: scaleX[0],
        scaleY: scaleY[0],
        y: y[0],
      }}
      style={{
        transformBox: "fill-box",
        transformOrigin: track.transformOrigin ?? "50% 50%",
      }}
      onAnimationComplete={onComplete}
      transition={transition}
    >
      <path d={TRACED_UPVOTE_PATH} transform={track.baseTransform} />
    </motion.g>
  );
}

function SmallParticleBurst() {
  const times = evenlySpacedTimes(smallParticleDistance.length);

  return smallParticleAngles.map((angle) => {
    const x = smallParticleSize.map((size) => -size / 2);
    const y = smallParticleDistance.map(
      (distance, index) => -distance - smallParticleSize[index] / 2,
    );
    return (
      <g key={angle} transform={`translate(50 50) rotate(${angle})`}>
        <motion.rect
          animate={{
            height: smallParticleSize,
            opacity: smallParticleOpacity,
            width: smallParticleSize,
            x,
            y,
          }}
          fill="#fb4303"
          initial={{
            height: smallParticleSize[0],
            opacity: smallParticleOpacity[0],
            width: smallParticleSize[0],
            x: x[0],
            y: y[0],
          }}
          rx="1.4"
          transition={{ duration: 0.24, ease: "linear", times }}
        />
      </g>
    );
  });
}

function ExpandingRing() {
  const times = [
    0, 0.12499, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.87499, 0.875,
    1,
  ];
  return (
    <motion.circle
      animate={{
        opacity: [0, 0, 1, 1, 1, 1, 1, 0.4, 0.4, 0, 0],
        r: [5.5, 5.5, 5.5, 9.5, 14.2, 18.5, 21.5, 23.5, 23.5, 23.5, 23.5],
        strokeWidth: [5.5, 5.5, 5.5, 7, 7.8, 6, 3.5, 1, 1, 1, 1],
      }}
      cx="49.5"
      cy="49.5"
      fill="none"
      initial={{ opacity: 0, r: 5.5, strokeWidth: 5.5 }}
      stroke="#ff4500"
      transition={{ duration: 0.32, ease: "linear", times }}
    />
  );
}

function LargeParticleBurst() {
  const distance = quickParticleDistance;
  const diameter = quickParticleDiameter;
  const opacity = diameter.map((size) => (size === 0 ? 0 : 1));
  const radius = diameter.map((size) => size / 2);
  const times = evenlySpacedTimes(distance.length);

  return largeParticleAngles.map((angle) => (
    <g key={angle} transform={`translate(119.5 115.5) rotate(${angle})`}>
      <motion.circle
        animate={{ cx: distance, opacity, r: radius }}
        cy="0"
        fill="#ff4400"
        initial={{ cx: distance[0], opacity: opacity[0], r: radius[0] }}
        transition={{ duration: 0.36, ease: "linear", times }}
      />
    </g>
  ));
}

function motionCanvas(kind: CodeVoteMotionKind): {
  effects?: ReactNode;
  viewBox: string;
} {
  if (kind === "lift" || kind === "down") {
    return { viewBox: "0 0 1080 1080" };
  }
  if (kind === "quick-burst") {
    return {
      effects: <LargeParticleBurst />,
      viewBox: "0 0 240 240",
    };
  }
  if (kind === "burst") {
    return { effects: <SmallParticleBurst />, viewBox: "0 0 100 100" };
  }
  if (kind === "ripple") {
    return { effects: <ExpandingRing />, viewBox: "0 0 100 100" };
  }
  return { viewBox: "0 0 100 100" };
}

const thumbnailFrames: Record<VoteMotionThumbnailKind, ThumbnailFrame> = {
  lift: {
    baseTransform: "translate(468 460)",
    fill: "#ff4500",
    origin: [540, 536],
    sourceFrame: 4,
    viewBox: "396 204 288 448",
    y: liftY[2],
  },
  clean: {
    baseTransform: smallBaseTrack.baseTransform,
    fill: "#fb4303",
    origin: [50, 49.5],
    sourceFrame: 3,
    viewBox: "32 8 36 56",
    y: cleanY[2],
  },
  spring: {
    baseTransform: smallBaseTrack.baseTransform,
    fill: "#fb4303",
    origin: [50, 49.5],
    sourceFrame: 7,
    viewBox: "32 8 36 56",
    y: springY[6],
  },
  burst: {
    baseTransform: smallBaseTrack.baseTransform,
    fill: burstArrowFills[3],
    origin: [50, 59],
    scaleY: burstArrowScaleY[3],
    sourceFrame: 4,
    viewBox: "18 12 64 64",
    y: burstArrowY[3],
  },
  ripple: {
    baseTransform: smallBaseTrack.baseTransform,
    fill: sharedArrowFills[3],
    origin: [50, 59],
    scaleY: sharedArrowScaleY[3],
    sourceFrame: 4,
    viewBox: "18 12 64 64",
    y: sharedArrowY[3],
  },
  soft: {
    baseTransform: softBaseTrack.baseTransform,
    fill: softArrowFills[3],
    origin: [50, 50],
    scaleY: sharedArrowScaleY[3],
    sourceFrame: 4,
    viewBox: "28 8 44 44",
    y: softArrowY[3],
  },
  "quick-burst": {
    baseTransform: "translate(93 90) scale(.375)",
    fill: quickFills[2],
    origin: [120, 118.5],
    scaleX: quickScaleX[2],
    scaleY: quickScaleY[2],
    sourceFrame: 2,
    viewBox: "29.5 27.5 180 180",
    y: quickY[2],
  },
};

function ThumbnailEffects({ kind }: { kind: VoteMotionThumbnailKind }) {
  if (kind === "burst") {
    const frameIndex = 3;
    const distance = smallParticleDistance[frameIndex];
    const opacity = smallParticleOpacity[frameIndex];
    const size = smallParticleSize[frameIndex];

    return smallParticleAngles.map((angle) => (
      <g key={angle} transform={`translate(50 50) rotate(${angle})`}>
        <rect
          fill="#fb4303"
          height={size}
          opacity={opacity}
          rx="1.4"
          width={size}
          x={-size / 2}
          y={-distance - size / 2}
        />
      </g>
    ));
  }

  if (kind === "ripple") {
    return (
      <circle
        cx="49.5"
        cy="49.5"
        fill="none"
        r="14.2"
        stroke="#ff4500"
        strokeWidth="7.8"
      />
    );
  }

  if (kind === "quick-burst") {
    const frameIndex = 2;
    const distance = quickParticleDistance[frameIndex];
    const radius = quickParticleDiameter[frameIndex] / 2;

    return largeParticleAngles.map((angle) => (
      <g key={angle} transform={`translate(119.5 115.5) rotate(${angle})`}>
        <circle cx={distance} cy="0" fill="#ff4400" r={radius} />
      </g>
    ));
  }

  return null;
}

export function VoteMotionThumbnail({
  className,
  kind,
}: {
  className?: string;
  kind: VoteMotionThumbnailKind;
}) {
  const frame = thumbnailFrames[kind];
  const scaleX = frame.scaleX ?? 1;
  const scaleY = frame.scaleY ?? 1;
  const [originX, originY] = frame.origin;
  const transform = [
    `translate(0 ${frame.y})`,
    `translate(${originX} ${originY})`,
    `scale(${scaleX} ${scaleY})`,
    `translate(${-originX} ${-originY})`,
  ].join(" ");

  return (
    <svg
      aria-hidden="true"
      className={className}
      data-motion-thumbnail={kind}
      data-source-frame={frame.sourceFrame}
      focusable="false"
      viewBox={frame.viewBox}
    >
      <ThumbnailEffects kind={kind} />
      <g transform={transform}>
        <path
          d={TRACED_UPVOTE_PATH}
          fill={frame.fill}
          transform={frame.baseTransform}
        />
      </g>
    </svg>
  );
}

export function CodeVoteMotion({
  kind,
  mode = "live",
  onComplete,
}: CodeVoteMotionProps) {
  const style = {
    "--code-motion-size": canvasSize(kind, mode),
  } as CSSProperties;
  const canvas = motionCanvas(kind);

  return (
    <span
      className={styles.codeVoteMotion}
      data-code-motion={kind}
      style={style}
    >
      <svg aria-hidden="true" focusable="false" viewBox={canvas.viewBox}>
        {canvas.effects}
        <AnimatedArrow onComplete={onComplete} track={arrowTracks[kind]} />
      </svg>
    </span>
  );
}
