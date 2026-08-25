"use client";

import {
  type CSSProperties,
  type ChangeEvent,
  type CompositionEvent,
  type FormEvent,
  type MouseEvent,
  type SyntheticEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import styles from "./ShapeTyper.module.css";
import {
  createShapeColorSequence,
  DEFAULT_COLOR_SEED,
  MAX_COLOR_SEED,
  MIN_COLOR_SEED,
  normalizeColorSeed,
  stepColorSeed,
} from "./shapeColorSequence.mjs";
import {
  fittedPreviewFontSize,
  shouldRefitPreview,
} from "./previewFit.mjs";
import {
  createRetainedShapeState,
  resolveKeepShapesPreference,
} from "./retainedShapeState.mjs";
import {
  createWiggleTiming,
  DEFAULT_WIGGLE_FPS,
  DEFAULT_WIGGLE_PERCENT,
  WIGGLE_POSE_COUNT,
} from "./wiggleTiming.mjs";
import {
  codePointIndexFromCodeUnitOffset,
  codeUnitOffsetFromCodePointIndex,
  findTextHistoryIndex,
  MAX_TYPER_CHARACTERS,
  rebaseTextIndex,
  resolveTyperTextEdit,
  shouldShowCharacterCount,
} from "./textEditing.mjs";
import { createIdleReplayController } from "./idleReplay.mjs";
import { SHAPE_GLYPHS, SHAPE_PALETTE as PALETTE } from "./shapeLibrary.mjs";
import { ShapePlayground } from "./ShapePlayground";

const DEFAULT_TEXT = "Make with Notion";
const BASE_STAGGER_MS = 1000 / 15;
const BASE_TURN_MS = 240;
const PLAYBACK_RATES = [0.25, 1] as const;
const TEXT_ALIGNMENTS = ["left", "center", "right"] as const;
const MIN_SHAPE_NUDGE = -20;
const MAX_SHAPE_NUDGE = 20;
const MOBILE_KEEP_SHAPES_QUERY = "(max-width: 860px)";

function subscribeToMobileViewport(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(MOBILE_KEEP_SHAPES_QUERY);
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getMobileViewportSnapshot() {
  return window.matchMedia(MOBILE_KEEP_SHAPES_QUERY).matches;
}

function getServerMobileViewportSnapshot() {
  return false;
}

type PlaybackRate = (typeof PLAYBACK_RATES)[number];
type TextAlignment = (typeof TEXT_ALIGNMENTS)[number];

const REFERENCE_SHAPE_GLYPHS: Record<string, string> = {
  M: "m",
  N: "n",
  e: "X",
  k: "K",
};

const REFERENCE_ENTRY_ROTATIONS: Record<string, number> = {
  A: -25,
  K: -30,
  X: -15,
  a: -10,
  d: -10,
  e: -15,
  f: 0,
  h: -15,
  i: -7.5,
  l: -18,
  m: -22.5,
  n: -22.5,
  o: -10,
  r: -9,
  s: -3.5,
  t: 0,
  v: -20,
  w: -22.5,
  z: -10,
};

type ShapeSetting = {
  glyph: string;
  color: string;
  wiggleSeed: number;
  nudgeX: number;
  nudgeY: number;
};

type ShapeMap = Record<number, ShapeSetting>;

type EditBounds = {
  prefixLength: number;
  previousEnd: number;
  nextEnd: number;
};

type EditorHistoryEntry = {
  text: string;
  pinnedShapes: ShapeMap;
};

const DEFAULT_PINNED_SHAPES: ShapeMap = {
  1: {
    glyph: "a",
    color: PALETTE[0].value,
    wiggleSeed: 12_724,
    nudgeX: -1,
    nudgeY: 0,
  },
  11: {
    glyph: "z",
    color: PALETTE[3].value,
    wiggleSeed: 14_728,
    nudgeX: -3,
    nudgeY: 0,
  },
};

type AnimatedCharacter = {
  character: string;
  stringIndex: number;
  animationIndex: number;
  animates: boolean;
};

type TextToken =
  | { kind: "word"; key: string; characters: AnimatedCharacter[] }
  | { kind: "space"; key: string; character: string }
  | { kind: "lineBreak"; key: string };

type EditorSnapshot = {
  previousText: string;
  selectionStart: number;
  selectionEnd: number;
  inputType: string;
};

function selectableCharacterIndices(value: string) {
  return Array.from(value).flatMap((character, index) =>
    isShapeCharacter(character) ? [index] : [],
  );
}

function isShapeCharacter(character: string) {
  return /^[A-Za-z0-9]$/.test(character);
}

function rebaseShapeMap(
  current: ShapeMap,
  nextCharacters: string[],
  editBounds: EditBounds,
) {
  return Object.fromEntries(
    Object.entries(current).flatMap(([rawIndex, setting]) => {
      const nextIndex = rebaseTextIndex(Number(rawIndex), editBounds);
      if (
        nextIndex === null ||
        nextIndex >= nextCharacters.length ||
        !isShapeCharacter(nextCharacters[nextIndex])
      ) {
        return [];
      }

      return [[nextIndex, setting]];
    }),
  );
}

function shapeGlyphFor(character: string) {
  return REFERENCE_SHAPE_GLYPHS[character] ?? character;
}

function shapeDescription(glyph: string) {
  const descriptions: Record<string, string> = {
    a: "upright triangle",
    v: "downward triangle",
    o: "faceted circle",
    z: "reference hexagon",
    A: "uppercase A shape",
    V: "uppercase V shape",
    O: "uppercase O shape",
  };

  return descriptions[glyph] ?? `shape mapped from ${glyph}`;
}

function nearestOrdinal(indices: number[], targetIndex: number) {
  if (indices.length === 0) return 0;

  return indices.reduce((nearest, index, ordinal) =>
    Math.abs(index - targetIndex) < Math.abs(indices[nearest] - targetIndex)
      ? ordinal
      : nearest,
  0);
}

function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function centeredPseudoRandom(seed: number) {
  return pseudoRandom(seed) * 2 - 1;
}

function randomWiggleSeed() {
  return Math.floor(Math.random() * 900_000) + 10_000;
}

function rounded(value: number) {
  return Math.round(value * 1000) / 1000;
}

function centeredPoseValues(seed: number, salt: number, amplitude: number) {
  const rawValues = Array.from({ length: WIGGLE_POSE_COUNT }, (_, pose) =>
    centeredPseudoRandom(seed + salt + pose * 97),
  );
  const mean =
    rawValues.reduce((sum, value) => sum + value, 0) / WIGGLE_POSE_COUNT;
  const centeredValues = rawValues.map((value) => value - mean);
  const maxMagnitude = Math.max(
    ...centeredValues.map((value) => Math.abs(value)),
    0.0001,
  );

  return centeredValues.map((value) => (value / maxMagnitude) * amplitude);
}

function wiggleRotationRange(setting: ShapeSetting) {
  if (setting.color.toLowerCase() !== "#000000") return 0.12;
  if (["o", "z"].includes(setting.glyph.toLowerCase())) return 2.4;
  return 0.6;
}

function referenceShapeOptics(
  character: string,
  glyph: string,
): CSSProperties {
  const variables: Record<string, string> = {};

  if (character === "M" && glyph === "m") {
    variables["--shape-scale-x"] = "1.067";
    variables["--shape-scale-y"] = "1.076";
    variables["--shape-shift-x"] = "-0.08em";
    variables["--shape-shift-y"] = "-0.04em";
  }

  if (character === "N" && glyph === "n") {
    variables["--shape-scale-x"] = "1.69";
    variables["--shape-scale-y"] = "1.02";
  }

  if (character === "e" && glyph === "X") {
    variables["--shape-scale-x"] = "0.648";
    variables["--shape-scale-y"] = "0.641";
    variables["--shape-shift-x"] = "-0.023em";
    variables["--shape-shift-y"] = "0.115em";
  }

  if (character === "k" && glyph === "K") {
    variables["--shape-scale-x"] = "0.773";
    variables["--shape-scale-y"] = "0.773";
    variables["--shape-shift-x"] = "0.035em";
    variables["--shape-shift-y"] = "0.075em";
  }

  return variables as CSSProperties;
}

function retainedShapeOptics(glyph: string): CSSProperties {
  const normalizedGlyph = glyph.toLowerCase();
  const variables: Record<string, string> = {};

  if (normalizedGlyph === "v") {
    variables["--shape-font-size"] = "1em";
    variables["--shape-shift-x"] = "0.026em";
    variables["--shape-shift-y"] = "-0.033em";
    variables["--shape-scale-x"] = "1.01";
    variables["--shape-scale-y"] = "1.03";
    return variables as CSSProperties;
  }

  if (normalizedGlyph === "a") {
    variables["--shape-font-size"] = "0.94em";
    variables["--shape-shift-x"] = "0.07em";
    variables["--shape-shift-y"] = "0.03em";
    variables["--shape-scale-x"] = "0.975";
    variables["--shape-advance"] = "0.09em";
    return variables as CSSProperties;
  }

  if (normalizedGlyph === "o") {
    variables["--shape-font-size"] = "1em";
    variables["--shape-shift-x"] = "0.072em";
    variables["--shape-scale-x"] = "1.03";
    variables["--shape-advance"] = "0.105em";
    return variables as CSSProperties;
  }

  if (normalizedGlyph === "z") {
    variables["--shape-font-size"] = "1em";
    variables["--shape-shift-x"] = "0.098em";
    variables["--shape-shift-y"] = "-0.012em";
    variables["--shape-scale-x"] = "1.073";
    variables["--shape-scale-y"] = "1.009";
    variables["--shape-advance"] = "0.105em";
    return variables as CSSProperties;
  }

  if (normalizedGlyph === "l") {
    variables["--shape-font-size"] = "1em";
    variables["--shape-shift-x"] = "0.05em";
    variables["--shape-shift-y"] = "-0.082em";
    variables["--shape-scale-x"] = "1.02";
  }

  return variables as CSSProperties;
}

function retainedWiggleStyle(
  setting: ShapeSetting,
  item: AnimatedCharacter,
  playbackRate: number,
) {
  const strength = DEFAULT_WIGGLE_PERCENT / 100;
  const { cycleMs, frameMs } = createWiggleTiming({
    fps: DEFAULT_WIGGLE_FPS,
    playbackRate,
  });
  const phaseMs = pseudoRandom(setting.wiggleSeed + 809) * frameMs;
  const rotationRange = wiggleRotationRange(setting);
  const xPoses = centeredPoseValues(
    setting.wiggleSeed,
    11,
    (2.4 + pseudoRandom(setting.wiggleSeed + 101) * 0.4) * strength,
  );
  const yPoses = centeredPoseValues(
    setting.wiggleSeed,
    37,
    (1.8 + pseudoRandom(setting.wiggleSeed + 211) * 0.4) * strength,
  );
  const rotationPoses = centeredPoseValues(
    setting.wiggleSeed,
    61,
    rotationRange * strength,
  );
  const variables: Record<string, string> = {
    "--wiggle-cycle": `${cycleMs}ms`,
    "--wiggle-delay": `${
      (item.animationIndex * BASE_STAGGER_MS + BASE_TURN_MS) / playbackRate +
      phaseMs
    }ms`,
  };

  for (let pose = 0; pose < WIGGLE_POSE_COUNT; pose += 1) {
    variables[`--wiggle-x${pose}`] = `${rounded(xPoses[pose])}px`;
    variables[`--wiggle-y${pose}`] = `${rounded(yPoses[pose])}px`;
    variables[`--wiggle-r${pose}`] = `${rounded(rotationPoses[pose])}deg`;
  }

  return variables as CSSProperties;
}

function transientRotation(glyph: string) {
  const referenceRotation = REFERENCE_ENTRY_ROTATIONS[glyph];
  if (referenceRotation !== undefined) return referenceRotation;

  const codePoint = glyph.codePointAt(0) ?? 0;
  return -Math.round(12 + pseudoRandom(codePoint * 53) * 18);
}

function tokenize(value: string): TextToken[] {
  const tokens: TextToken[] = [];
  let word: AnimatedCharacter[] = [];
  let timelineIndex = 0;

  function flushWord() {
    if (word.length === 0) return;
    tokens.push({
      kind: "word",
      key: `word-${word[0].stringIndex}`,
      characters: word,
    });
    word = [];
  }

  Array.from(value).forEach((character, stringIndex) => {
    if (character === "\n") {
      flushWord();
      tokens.push({ kind: "lineBreak", key: `break-${stringIndex}` });
      timelineIndex += 1;
      return;
    }

    if (/\s/u.test(character)) {
      flushWord();
      tokens.push({
        kind: "space",
        key: `space-${stringIndex}`,
        character,
      });
      timelineIndex += 1;
      return;
    }

    const animates = isShapeCharacter(character);
    word.push({
      character,
      stringIndex,
      animationIndex: timelineIndex,
      animates,
    });
    timelineIndex += 1;
  });

  flushWord();
  return tokens;
}

function rangeStyle(value: number, min: number, max: number) {
  const denominator = Math.max(max - min, 1);
  const progress = ((value - min) / denominator) * 100;
  return { "--range-progress": `${progress}%` } as CSSProperties;
}

function nudgeDescription(value: number, axis: "x" | "y") {
  if (value === 0) {
    return axis === "x" ? "Centered horizontally" : "Centered vertically";
  }

  const direction =
    axis === "x"
      ? value < 0
        ? "left"
        : "right"
      : value < 0
        ? "up"
        : "down";

  return `${Math.abs(value)} percent ${direction}`;
}

type ToolIconName =
  | "align-center"
  | "align-left"
  | "align-right"
  | "chevron-down"
  | "chevron-up"
  | "color"
  | "horizontal"
  | "pin"
  | "plus"
  | "replay"
  | "shape"
  | "vertical";

function ToolIcon({ name }: { name: ToolIconName }) {
  let artwork;

  switch (name) {
    case "replay":
      artwork = (
        <>
          <path d="M16 9a6 6 0 1 0 .1 3" />
          <path d="M16 4v5h-5" />
        </>
      );
      break;
    case "align-left":
      artwork = <path d="M3 5h14M3 10h10M3 15h14" />;
      break;
    case "align-center":
      artwork = <path d="M3 5h14M5 10h10M3 15h14" />;
      break;
    case "align-right":
      artwork = <path d="M3 5h14M7 10h10M3 15h14" />;
      break;
    case "chevron-up":
      artwork = <path d="m5 12.5 5-5 5 5" />;
      break;
    case "chevron-down":
      artwork = <path d="m5 7.5 5 5 5-5" />;
      break;
    case "pin":
      artwork = (
        <>
          <path d="M7 3h6l-.8 5 2.8 3H5l2.8-3L7 3Z" />
          <path d="M10 11v6" />
        </>
      );
      break;
    case "shape":
      artwork = <path d="m10 3 7 13H3L10 3Z" />;
      break;
    case "horizontal":
      artwork = <path d="M3 10h14M6 7l-3 3 3 3M14 7l3 3-3 3" />;
      break;
    case "vertical":
      artwork = <path d="M10 3v14M7 6l3-3 3 3M7 14l3 3 3-3" />;
      break;
    case "color":
      artwork = <path d="M10 3s5 5.2 5 8.2A5 5 0 0 1 5 11.2C5 8.2 10 3 10 3Z" />;
      break;
    case "plus":
      artwork = <path d="M10 5v10M5 10h10" />;
      break;
  }

  return (
    <svg
      className={styles.icon}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      {artwork}
    </svg>
  );
}

function AnimatedGlyph({
  item,
  shapeColor,
  playbackRate,
  pinnedShape,
}: {
  item: AnimatedCharacter;
  shapeColor?: string;
  playbackRate: number;
  pinnedShape?: ShapeSetting;
}) {
  const color = pinnedShape?.color ?? shapeColor ?? PALETTE[0].value;
  const shapeGlyph = pinnedShape?.glyph ?? shapeGlyphFor(item.character);
  const rotation = transientRotation(shapeGlyph);
  const characterStyle = {
    "--delay": `${(item.animationIndex * BASE_STAGGER_MS) / playbackRate}ms`,
    "--shape-color": color,
    "--entry-rotation": `${rotation}deg`,
    ...referenceShapeOptics(item.character, shapeGlyph),
    ...(pinnedShape
      ? {
          ...retainedShapeOptics(shapeGlyph),
          "--shape-nudge-x": `${pinnedShape.nudgeX / 100}em`,
          "--shape-nudge-y": `${pinnedShape.nudgeY / 100}em`,
          ...retainedWiggleStyle(pinnedShape, item, playbackRate),
        }
      : {}),
  } as CSSProperties;

  if (!item.animates) {
    return (
      <span
        className={`${styles.character} ${styles.staticCharacter}`}
        data-string-index={item.stringIndex}
      >
        <span className={styles.measure}>{item.character}</span>
        <span className={`${styles.face} ${styles.staticLetter}`}>
          {item.character}
        </span>
      </span>
    );
  }

  return (
    <span
      className={`${styles.character} ${pinnedShape ? styles.pinned : ""}`}
      data-retained={pinnedShape ? "true" : undefined}
      data-string-index={item.stringIndex}
      style={characterStyle}
    >
      <span className={styles.measure}>{item.character}</span>
      <span className={`${styles.face} ${styles.shapeFace}`}>
        <span className={styles.shapeGlyph}>
          <span className={styles.shapeOptical}>{shapeGlyph}</span>
        </span>
      </span>
      <span className={`${styles.face} ${styles.letterFace}`}>
        {item.character}
      </span>
    </span>
  );
}

type ShapeTyperVariant = "standalone" | "project" | "preview";

type ShapeTyperProps = {
  variant?: ShapeTyperVariant;
  showPlayground?: boolean;
};

export function ShapeTyper({
  variant = "standalone",
  showPlayground = true,
}: ShapeTyperProps) {
  const isPreview = variant === "preview";
  const isContained = variant !== "standalone";
  const isMobileViewport = useSyncExternalStore(
    subscribeToMobileViewport,
    getMobileViewportSnapshot,
    getServerMobileViewportSnapshot,
  );
  const usesMobileKeepShapesDefault = isMobileViewport && !isPreview;
  const stageRef = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewInputRef = useRef<HTMLTextAreaElement>(null);
  const previewContentRef = useRef<HTMLSpanElement>(null);
  const pendingTextEditRef = useRef<EditorSnapshot | null>(null);
  const compositionTextEditRef = useRef<EditorSnapshot | null>(null);
  const isComposingRef = useRef(false);
  const idleReplayControllerRef = useRef<
    ReturnType<typeof createIdleReplayController> | null
  >(null);
  const idleReplayEligibleRef = useRef(false);
  const textValueRef = useRef(DEFAULT_TEXT);
  const pinnedShapesRef = useRef<ShapeMap>(DEFAULT_PINNED_SHAPES);
  const editorHistoryRef = useRef<{
    entries: EditorHistoryEntry[];
    index: number;
  }>({
    entries: [
      { text: DEFAULT_TEXT, pinnedShapes: DEFAULT_PINNED_SHAPES },
    ],
    index: 0,
  });
  const [text, setText] = useState(DEFAULT_TEXT);
  const [animationRun, setAnimationRun] = useState(0);
  const [colorSeed, setColorSeed] = useState(DEFAULT_COLOR_SEED);
  const [fontsReady, setFontsReady] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedOrdinal, setSelectedOrdinal] = useState(1);
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1);
  const [textAlignment, setTextAlignment] =
    useState<TextAlignment>("center");
  const [keepShapesOverride, setKeepShapesOverride] = useState<boolean | null>(
    null,
  );
  const [pinnedShapes, setPinnedShapesState] = useState<ShapeMap>(
    DEFAULT_PINNED_SHAPES,
  );
  const keepShapes = resolveKeepShapesPreference(
    keepShapesOverride,
    usesMobileKeepShapesDefault,
  );

  useEffect(() => {
    let active = true;

    document.fonts.ready.then(() => {
      if (!active) return;
      setFontsReady(true);
      setAnimationRun((current) => current + 1);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!fontsReady) return;

    const stage = stageRef.current;
    if (!stage) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const controller = createIdleReplayController({
      onReplay: () => {
        if (isComposingRef.current) return;
        setIsEditing(false);
        setAnimationRun((current) => current + 1);
      },
    });
    idleReplayControllerRef.current = controller;

    let isStageVisible = true;
    let isEligible = false;
    const syncEligibility = () => {
      const nextEligibility =
        !document.hidden && isStageVisible && !reducedMotion.matches;
      if (nextEligibility === isEligible) return;

      isEligible = nextEligibility;
      idleReplayEligibleRef.current = isEligible;
      if (isEligible) {
        controller.start();
      } else {
        controller.pause();
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      isStageVisible = entry?.isIntersecting ?? true;
      syncEligibility();
    });
    observer.observe(stage);
    document.addEventListener("visibilitychange", syncEligibility);
    reducedMotion.addEventListener("change", syncEligibility);
    syncEligibility();

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncEligibility);
      reducedMotion.removeEventListener("change", syncEligibility);
      controller.pause();
      idleReplayEligibleRef.current = false;
      if (idleReplayControllerRef.current === controller) {
        idleReplayControllerRef.current = null;
      }
    };
  }, [fontsReady]);

  const characterIndices = useMemo(
    () => selectableCharacterIndices(text),
    [text],
  );
  const tokens = useMemo(() => tokenize(text), [text]);
  const retainedShapeState = useMemo(
    () => createRetainedShapeState(pinnedShapes, keepShapes),
    [keepShapes, pinnedShapes],
  );
  const activePinnedShapes = retainedShapeState.activeShapes;
  const previewShapeLayoutKey = Object.entries(activePinnedShapes)
    .map(([index, setting]) => `${index}:${setting.glyph}`)
    .join("|");
  const shapeColors = useMemo(
    () =>
      createShapeColorSequence({
        positions: characterIndices,
        pinnedColors: Object.fromEntries(
          Object.entries(activePinnedShapes).map(([index, setting]) => [
            Number(index),
            setting.color,
          ]),
        ),
        palette: PALETTE.map((color) => color.value),
        seed: colorSeed,
      }),
    [activePinnedShapes, characterIndices, colorSeed],
  );

  useLayoutEffect(() => {
    if (!fontsReady) return;

    const stage = stageRef.current;
    const previewElement = previewRef.current;
    if (!stage || !previewElement) return;
    const preview: HTMLDivElement = previewElement;

    function fitPreview() {
      const content = previewContentRef.current;
      if (!content) return;

      preview.style.removeProperty("--preview-fit-size");
      const baseFontSize = Number.parseFloat(
        window.getComputedStyle(preview).fontSize,
      );
      const fittedSize = fittedPreviewFontSize({
        availableWidth: preview.clientWidth,
        baseFontSize,
        naturalWidth: content.getBoundingClientRect().width,
      });

      preview.style.setProperty("--preview-fit-size", `${fittedSize}px`);
    }

    fitPreview();
    let observedWidth = Number.NaN;
    let scheduledFrame = 0;
    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = entry?.contentRect.width ?? 0;
      if (!shouldRefitPreview(observedWidth, nextWidth)) return;

      observedWidth = nextWidth;
      window.cancelAnimationFrame(scheduledFrame);
      scheduledFrame = window.requestAnimationFrame(fitPreview);
    });
    observer.observe(stage);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(scheduledFrame);
    };
  }, [fontsReady, previewShapeLayoutKey, text]);

  const selectedStringIndex = characterIndices[selectedOrdinal] ?? 0;
  const characters = Array.from(text);
  const selectedCharacter = characters[selectedStringIndex] ?? "";
  const selectedShapeSetting = pinnedShapes[selectedStringIndex];
  const characterCount = characters.length;
  const showCharacterCount = shouldShowCharacterCount(text);
  const selectedGlyphIndex = Math.max(
    SHAPE_GLYPHS.indexOf(
      selectedShapeSetting?.glyph ?? shapeGlyphFor(selectedCharacter),
    ),
    0,
  );
  const pinnedCount = retainedShapeState.activeCount;

  function refreshIdleReplay() {
    idleReplayControllerRef.current?.refresh();
  }

  function replaceCurrentHistoryPins(nextPinnedShapes: ShapeMap) {
    const history = editorHistoryRef.current;
    const currentEntry = history.entries[history.index];
    if (!currentEntry || currentEntry.text !== textValueRef.current) return;
    history.entries[history.index] = {
      ...currentEntry,
      pinnedShapes: nextPinnedShapes,
    };
  }

  function updatePinnedShapes(
    updater: (current: ShapeMap) => ShapeMap,
  ) {
    const nextPinnedShapes = updater(pinnedShapesRef.current);
    pinnedShapesRef.current = nextPinnedShapes;
    setPinnedShapesState(nextPinnedShapes);
    replaceCurrentHistoryPins(nextPinnedShapes);
  }

  function pushEditorHistory(nextText: string, nextPinnedShapes: ShapeMap) {
    const history = editorHistoryRef.current;
    history.entries = [
      ...history.entries.slice(0, history.index + 1),
      { text: nextText, pinnedShapes: nextPinnedShapes },
    ];
    history.index += 1;
  }

  function restoreEditorHistory(
    inputType: string,
    nextText: string,
    editBounds: EditBounds,
  ) {
    const history = editorHistoryRef.current;
    const historyIndex = findTextHistoryIndex(
      history.entries,
      history.index,
      inputType,
      nextText,
    );
    if (historyIndex < 0) return false;

    const entry = history.entries[historyIndex];
    history.index = historyIndex;
    textValueRef.current = entry.text;
    pinnedShapesRef.current = entry.pinnedShapes;
    setText(entry.text);
    setPinnedShapesState(entry.pinnedShapes);
    const nextCharacters = Array.from(entry.text);
    const nextIndices = selectableCharacterIndices(entry.text);
    const historyTarget =
      editBounds.nextEnd > editBounds.prefixLength
        ? editBounds.nextEnd - 1
        : Math.min(
            editBounds.prefixLength,
            Math.max(nextCharacters.length - 1, 0),
          );
    setSelectedOrdinal(nearestOrdinal(nextIndices, historyTarget));
    refreshIdleReplay();
    return true;
  }

  function commitTextEdit(
    requestedText: string,
    snapshot: EditorSnapshot | null,
  ) {
    const previousText = snapshot?.previousText ?? textValueRef.current;
    const { nextText, editBounds } = resolveTyperTextEdit({
      previousText,
      requestedText,
      selectionStart: snapshot?.selectionStart,
      selectionEnd: snapshot?.selectionEnd,
      inputType: snapshot?.inputType,
      maxCharacters: MAX_TYPER_CHARACTERS,
    });
    const nextCharacters = Array.from(nextText);
    const nextIndices = selectableCharacterIndices(nextText);

    if (
      snapshot?.inputType.startsWith("history") &&
      restoreEditorHistory(snapshot.inputType, nextText, editBounds)
    ) {
      return true;
    }

    textValueRef.current = nextText;
    setText(nextText);

    if (nextText === previousText) return false;

    const insertedTarget =
      editBounds.nextEnd > editBounds.prefixLength
        ? editBounds.nextEnd - 1
        : Math.min(
            editBounds.prefixLength,
            Math.max(nextCharacters.length - 1, 0),
          );
    setSelectedOrdinal(nearestOrdinal(nextIndices, insertedTarget));
    const nextPinnedShapes = rebaseShapeMap(
      pinnedShapesRef.current,
      nextCharacters,
      editBounds,
    );
    pinnedShapesRef.current = nextPinnedShapes;
    setPinnedShapesState(nextPinnedShapes);
    pushEditorHistory(nextText, nextPinnedShapes);
    refreshIdleReplay();
    return true;
  }

  function captureBeforeInput(event: FormEvent<HTMLTextAreaElement>) {
    if (isComposingRef.current) return;
    const nativeEvent = event.nativeEvent as InputEvent;
    pendingTextEditRef.current = {
      previousText: textValueRef.current,
      selectionStart: event.currentTarget.selectionStart,
      selectionEnd: event.currentTarget.selectionEnd,
      inputType: nativeEvent.inputType ?? "",
    };
  }

  function changeText(event: ChangeEvent<HTMLTextAreaElement>) {
    const requestedText = event.currentTarget.value;
    const nativeEvent = event.nativeEvent as InputEvent;
    refreshIdleReplay();

    if (isComposingRef.current || nativeEvent.isComposing) {
      textValueRef.current = requestedText;
      setText(requestedText);
      setIsEditing(true);
      return;
    }

    const snapshot = pendingTextEditRef.current;
    pendingTextEditRef.current = null;
    commitTextEdit(requestedText, snapshot);
  }

  function startComposition(event: CompositionEvent<HTMLTextAreaElement>) {
    idleReplayControllerRef.current?.pause();
    isComposingRef.current = true;
    pendingTextEditRef.current = null;
    compositionTextEditRef.current = {
      previousText: textValueRef.current,
      selectionStart: event.currentTarget.selectionStart,
      selectionEnd: event.currentTarget.selectionEnd,
      inputType: "insertCompositionText",
    };
    setIsEditing(true);
  }

  function endComposition(event: CompositionEvent<HTMLTextAreaElement>) {
    isComposingRef.current = false;
    pendingTextEditRef.current = null;
    const snapshot = compositionTextEditRef.current;
    compositionTextEditRef.current = null;
    commitTextEdit(event.currentTarget.value, snapshot);
    if (idleReplayEligibleRef.current) {
      idleReplayControllerRef.current?.start();
    }
  }

  function selectFromEditor(event: SyntheticEvent<HTMLTextAreaElement>) {
    const editor = event.currentTarget;
    const currentText = textValueRef.current;
    const currentIndices = selectableCharacterIndices(currentText);
    const start = codePointIndexFromCodeUnitOffset(
      currentText,
      editor.selectionStart,
    );
    const end = codePointIndexFromCodeUnitOffset(
      currentText,
      editor.selectionEnd,
    );
    const targetIndex = start === end ? Math.max(0, start - 1) : start;
    setSelectedOrdinal(nearestOrdinal(currentIndices, targetIndex));
  }

  function selectFromPreviewPointer(event: MouseEvent<HTMLTextAreaElement>) {
    const editor = event.currentTarget;
    if (editor.selectionStart !== editor.selectionEnd) return;
    const glyphs = previewContentRef.current?.querySelectorAll<HTMLElement>(
      "[data-string-index]",
    );
    if (!glyphs || glyphs.length === 0) return;

    let nearestGlyph: HTMLElement | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const glyph of glyphs) {
      const rect = glyph.getBoundingClientRect();
      const nearestX = Math.max(rect.left, Math.min(event.clientX, rect.right));
      const nearestY = Math.max(rect.top, Math.min(event.clientY, rect.bottom));
      const distance = Math.hypot(
        event.clientX - nearestX,
        event.clientY - nearestY,
      );
      if (distance >= nearestDistance) continue;
      nearestDistance = distance;
      nearestGlyph = glyph;
    }

    if (!nearestGlyph) return;
    const stringIndex = Number(nearestGlyph.dataset.stringIndex);
    if (!Number.isFinite(stringIndex)) return;
    const rect = nearestGlyph.getBoundingClientRect();
    const caretIndex = stringIndex + (event.clientX >= rect.left + rect.width / 2 ? 1 : 0);
    const currentText = textValueRef.current;
    const caretOffset = codeUnitOffsetFromCodePointIndex(
      currentText,
      caretIndex,
    );
    editor.setSelectionRange(caretOffset, caretOffset);
    setSelectedOrdinal(
      nearestOrdinal(selectableCharacterIndices(currentText), stringIndex),
    );
  }

  function focusEditor() {
    setIsEditing(true);
    refreshIdleReplay();
  }

  function blurEditor() {
    if (!isComposingRef.current) {
      setIsEditing(false);
    }
    refreshIdleReplay();
  }

  function replay() {
    if (isComposingRef.current) return;
    pendingTextEditRef.current = null;
    setIsEditing(false);
    setAnimationRun((current) => current + 1);
    refreshIdleReplay();
  }

  function resetTyper() {
    pendingTextEditRef.current = null;
    compositionTextEditRef.current = null;
    isComposingRef.current = false;
    textValueRef.current = DEFAULT_TEXT;
    pinnedShapesRef.current = DEFAULT_PINNED_SHAPES;
    editorHistoryRef.current = {
      entries: [
        { text: DEFAULT_TEXT, pinnedShapes: DEFAULT_PINNED_SHAPES },
      ],
      index: 0,
    };

    previewInputRef.current?.blur();
    setText(DEFAULT_TEXT);
    setPinnedShapesState(DEFAULT_PINNED_SHAPES);
    setAnimationRun((current) => current + 1);
    setColorSeed(DEFAULT_COLOR_SEED);
    setIsEditing(false);
    setSelectedOrdinal(1);
    setPlaybackRate(1);
    setTextAlignment("center");
    setKeepShapesOverride(null);
    refreshIdleReplay();
  }

  function resetFromContextMenu(event: MouseEvent<HTMLElement>) {
    if (!isPreview) return;
    event.preventDefault();
    resetTyper();
  }

  function selectColorSeed(nextSeed: number) {
    setColorSeed(normalizeColorSeed(nextSeed));
    replay();
  }

  function toggleKeepShapes() {
    setKeepShapesOverride((current) =>
      !resolveKeepShapesPreference(current, usesMobileKeepShapesDefault),
    );
    replay();
  }

  function selectPlaybackRate(rate: PlaybackRate) {
    setPlaybackRate(rate);
    setIsEditing(false);
    refreshIdleReplay();
  }

  function selectTextAlignment(alignment: TextAlignment) {
    setTextAlignment(alignment);
    refreshIdleReplay();
  }

  function toggleSelectedPinnedShape() {
    if (!selectedCharacter) return;

    updatePinnedShapes((current) => {
      if (current[selectedStringIndex]) {
        const next = { ...current };
        delete next[selectedStringIndex];
        return next;
      }

      return {
        ...current,
        [selectedStringIndex]: {
          glyph: shapeGlyphFor(selectedCharacter),
          color: shapeColors[selectedStringIndex] ?? PALETTE[0].value,
          wiggleSeed: randomWiggleSeed(),
          nudgeX: 0,
          nudgeY: 0,
        },
      };
    });
    replay();
  }

  function updateSelectedShape(setting: Partial<ShapeSetting>) {
    if (!selectedShapeSetting) return;
    updatePinnedShapes((current) => ({
      ...current,
      [selectedStringIndex]: {
        ...current[selectedStringIndex],
        ...setting,
      },
    }));
    refreshIdleReplay();
  }

  const toolStyle = {
    "--turn-duration": `${BASE_TURN_MS / playbackRate}ms`,
  } as CSSProperties;

  const ToolRoot = isContained ? "section" : "main";
  const ToolHeading = isContained ? "h2" : "h1";

  return (
    <ToolRoot
      className={`${styles.tool} ${isPreview ? styles.embedded : ""} ${variant === "project" ? styles.projectMode : ""}`}
      data-shape-typer="true"
      data-shape-typer-variant={variant}
      aria-label={isPreview ? "Shape Typer tool" : undefined}
      aria-labelledby={isPreview ? undefined : "mwn-typer-tool-title"}
      style={toolStyle}
    >
      {!isPreview ? (
      <header className={styles.header}>
        <div className={styles.identity}>
          <span className={styles.identityMark} aria-hidden="true">
            A
          </span>
          <ToolHeading id="mwn-typer-tool-title">MWN typer tool</ToolHeading>
        </div>
        <button
          className={styles.replayButton}
          type="button"
          aria-label="Replay animation"
          title="Replay animation"
          disabled={!fontsReady}
          onClick={replay}
        >
          <ToolIcon name="replay" />
        </button>
      </header>
      ) : null}

      <div
        className={styles.workspace}
        onPointerDownCapture={refreshIdleReplay}
        onKeyDownCapture={refreshIdleReplay}
        onClickCapture={refreshIdleReplay}
        onInputCapture={refreshIdleReplay}
        onFocusCapture={refreshIdleReplay}
        onWheelCapture={refreshIdleReplay}
      >
        <section
          ref={stageRef}
          className={styles.stage}
          aria-label="Editable animated type preview"
          onContextMenu={resetFromContextMenu}
        >
          {!fontsReady ? (
            <span className={styles.fontLoading}>Loading typefaces</span>
          ) : null}
          <div
            ref={previewRef}
            className={`${styles.preview} ${fontsReady ? "" : styles.previewLoading} ${isEditing ? styles.previewEditing : ""}`}
            data-editing={isEditing}
            style={
              {
                "--preview-line-count": Math.max(
                  text.split("\n").length,
                  1,
                ),
                "--preview-text-align": textAlignment,
              } as CSSProperties
            }
            data-text-alignment={textAlignment}
          >
            <label className={styles.srOnly} htmlFor="shape-typer-preview-input">
              Edit preview text
            </label>
            <textarea
              ref={previewInputRef}
              id="shape-typer-preview-input"
              className={styles.previewInput}
              data-preview-editor="true"
              value={text}
              rows={Math.max(text.split("\n").length, 1)}
              wrap="off"
              aria-describedby={
                showCharacterCount
                  ? "shape-typer-limit-help shape-typer-character-count"
                  : "shape-typer-limit-help"
              }
              spellCheck="true"
              placeholder="Type something to begin."
              onBeforeInput={captureBeforeInput}
              onChange={changeText}
              onCompositionStart={startComposition}
              onCompositionEnd={endComposition}
              onFocus={focusEditor}
              onBlur={blurEditor}
              onSelect={selectFromEditor}
              onClick={selectFromPreviewPointer}
            />
            <span
              ref={previewContentRef}
              key={`${animationRun}-${playbackRate}-${fontsReady}`}
              className={styles.previewContent}
              aria-hidden="true"
              data-animation-run={animationRun}
            >
              {tokens.length > 0 ? (
                tokens.map((token) => {
                  if (token.kind === "lineBreak") {
                    return <br key={token.key} />;
                  }

                  if (token.kind === "space") {
                    return (
                      <span className={styles.space} key={token.key}>
                        {token.character}
                      </span>
                    );
                  }

                  return (
                    <span className={styles.word} key={token.key}>
                      {token.characters.map((item) => (
                        <AnimatedGlyph
                          key={`${animationRun}-${item.stringIndex}-${item.character}`}
                          item={item}
                          shapeColor={shapeColors[item.stringIndex]}
                          playbackRate={playbackRate}
                          pinnedShape={activePinnedShapes[item.stringIndex]}
                        />
                      ))}
                    </span>
                  );
                })
              ) : (
                <span className={styles.emptyPreview}>
                  Type something to begin.
                </span>
              )}
            </span>
          </div>
          <span id="shape-typer-limit-help" className={styles.srOnly}>
            Maximum {MAX_TYPER_CHARACTERS} characters.
          </span>
          {showCharacterCount ? (
            <span
              id="shape-typer-character-count"
              className={styles.characterCount}
            >
              {characterCount} / {MAX_TYPER_CHARACTERS}
            </span>
          ) : null}
        </section>

        {!isPreview ? (
        <aside className={styles.inspector} aria-label="MWN typer tool controls">
          <section
            className={`${styles.controlSection} ${styles.utilitySection}`}
            aria-label="Preview settings"
          >
            <div className={styles.utilityGrid}>
              <div
                className={`${styles.segmentedControl} ${styles.alignmentControl}`}
                role="group"
                aria-label="Text alignment"
              >
                {TEXT_ALIGNMENTS.map((alignment) => (
                  <button
                    key={alignment}
                    className={`${styles.segmentButton} ${styles.iconSegment}`}
                    type="button"
                    data-alignment={alignment}
                    aria-label={`Align text ${alignment}`}
                    aria-pressed={textAlignment === alignment}
                    title={`Align text ${alignment}`}
                    onClick={() => selectTextAlignment(alignment)}
                  >
                    <ToolIcon
                      name={`align-${alignment}` as ToolIconName}
                    />
                  </button>
                ))}
              </div>

              <div
                className={`${styles.segmentedControl} ${styles.speedControl}`}
                role="group"
                aria-label="Playback speed"
              >
                {PLAYBACK_RATES.map((rate) => (
                  <button
                    key={rate}
                    className={styles.segmentButton}
                    type="button"
                    data-playback-rate={rate}
                    aria-label={`Play at ${rate} times speed`}
                    aria-pressed={playbackRate === rate}
                    title={`${rate}× speed`}
                    onClick={() => selectPlaybackRate(rate)}
                  >
                    {rate}×
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.controlSection}>
            <div className={styles.pinRow}>
              <div className={styles.compactTitle}>
                <h2>Kept shapes</h2>
                <span aria-label={`${pinnedCount} shapes kept`}>
                  {pinnedCount}
                </span>
              </div>
              <button
                className={styles.toggle}
                type="button"
                aria-pressed={keepShapes}
                aria-label={
                  keepShapes
                    ? "Hide all kept shapes"
                    : "Show all kept shapes"
                }
                title={keepShapes ? "Hide kept shapes" : "Show kept shapes"}
                onClick={toggleKeepShapes}
              >
                <span />
              </button>
            </div>

            {keepShapes ? (
              <div className={styles.selectionPanel}>
                <div className={styles.selectionRow}>
                  <div className={styles.characterReadout} aria-hidden="true">
                    <span className={styles.characterSample}>
                      {selectedCharacter || " "}
                    </span>
                    <span>
                      {characterIndices.length > 0 ? selectedOrdinal + 1 : 0} /{" "}
                      {characterIndices.length}
                    </span>
                  </div>
                  <button
                    className={styles.pinAction}
                    type="button"
                    aria-pressed={Boolean(selectedShapeSetting)}
                    aria-label={`Keep as shape: ${selectedCharacter}`}
                    title={
                      selectedShapeSetting
                        ? "Transform to letter"
                        : "Keep as shape"
                    }
                    disabled={!selectedCharacter}
                    onClick={toggleSelectedPinnedShape}
                  >
                    <ToolIcon name="pin" />
                    <span>Keep as shape</span>
                  </button>
                </div>

                <label className={styles.srOnly} htmlFor="selected-character">
                  Select a character position
                </label>
                <input
                  id="selected-character"
                  className={styles.range}
                  style={rangeStyle(
                    selectedOrdinal + 1,
                    1,
                    Math.max(characterIndices.length, 1),
                  )}
                  type="range"
                  min="1"
                  max={Math.max(characterIndices.length, 1)}
                  value={Math.min(
                    selectedOrdinal + 1,
                    Math.max(characterIndices.length, 1),
                  )}
                  disabled={characterIndices.length === 0}
                  aria-valuetext={
                    selectedCharacter
                      ? `Position ${selectedOrdinal + 1}, character ${selectedCharacter}`
                      : "No selectable character"
                  }
                  onChange={(event) =>
                    setSelectedOrdinal(Number(event.currentTarget.value) - 1)
                  }
                />

                {selectedShapeSetting ? (
                  <fieldset className={styles.appearanceControls}>
                    <legend className={styles.srOnly}>
                      Kept shape appearance
                    </legend>

                    <div className={styles.settingBlock}>
                      <div className={styles.settingHeader}>
                        <label
                          className={styles.settingLabel}
                          htmlFor="selected-shape"
                        >
                          <ToolIcon name="shape" />
                          <span>Shape</span>
                        </label>
                        <div
                          className={styles.shapeReadout}
                          style={{ color: selectedShapeSetting.color }}
                          aria-hidden="true"
                        >
                          {selectedShapeSetting.glyph}
                        </div>
                      </div>
                      <input
                        id="selected-shape"
                        className={styles.range}
                        style={rangeStyle(
                          selectedGlyphIndex,
                          0,
                          SHAPE_GLYPHS.length - 1,
                        )}
                        type="range"
                        min="0"
                        max={SHAPE_GLYPHS.length - 1}
                        value={selectedGlyphIndex}
                        aria-valuetext={shapeDescription(
                          SHAPE_GLYPHS[selectedGlyphIndex],
                        )}
                        onChange={(event) =>
                          updateSelectedShape({
                            glyph: SHAPE_GLYPHS[
                              Number(event.currentTarget.value)
                            ],
                          })
                        }
                      />
                    </div>

                    <div className={styles.settingBlock}>
                      <div className={styles.settingHeader}>
                        <label
                          className={styles.settingLabel}
                          htmlFor="shape-nudge-x"
                        >
                          <ToolIcon name="horizontal" />
                          <span>Horizontal</span>
                        </label>
                        <span className={styles.settingValue}>
                          {selectedShapeSetting.nudgeX}%
                        </span>
                      </div>
                      <input
                        id="shape-nudge-x"
                        className={styles.range}
                        style={rangeStyle(
                          selectedShapeSetting.nudgeX,
                          MIN_SHAPE_NUDGE,
                          MAX_SHAPE_NUDGE,
                        )}
                        type="range"
                        min={MIN_SHAPE_NUDGE}
                        max={MAX_SHAPE_NUDGE}
                        step="1"
                        value={selectedShapeSetting.nudgeX}
                        aria-valuetext={nudgeDescription(
                          selectedShapeSetting.nudgeX,
                          "x",
                        )}
                        onChange={(event) =>
                          updateSelectedShape({
                            nudgeX: Number(event.currentTarget.value),
                          })
                        }
                      />
                    </div>

                    <div className={styles.settingBlock}>
                      <div className={styles.settingHeader}>
                        <label
                          className={styles.settingLabel}
                          htmlFor="shape-nudge-y"
                        >
                          <ToolIcon name="vertical" />
                          <span>Vertical</span>
                        </label>
                        <span className={styles.settingValue}>
                          {selectedShapeSetting.nudgeY}%
                        </span>
                      </div>
                      <input
                        id="shape-nudge-y"
                        className={styles.range}
                        style={rangeStyle(
                          selectedShapeSetting.nudgeY,
                          MIN_SHAPE_NUDGE,
                          MAX_SHAPE_NUDGE,
                        )}
                        type="range"
                        min={MIN_SHAPE_NUDGE}
                        max={MAX_SHAPE_NUDGE}
                        step="1"
                        value={selectedShapeSetting.nudgeY}
                        aria-valuetext={nudgeDescription(
                          selectedShapeSetting.nudgeY,
                          "y",
                        )}
                        onChange={(event) =>
                          updateSelectedShape({
                            nudgeY: Number(event.currentTarget.value),
                          })
                        }
                      />
                    </div>

                    <div className={styles.settingBlock}>
                      <div className={styles.settingHeader}>
                        <span
                          id="shape-color-label"
                          className={styles.settingLabel}
                        >
                          <ToolIcon name="color" />
                          <span>Color</span>
                        </span>
                        <span className={styles.settingValue}>
                          {selectedShapeSetting.color.toUpperCase()}
                        </span>
                      </div>
                      <div
                        className={styles.swatches}
                        role="group"
                        aria-labelledby="shape-color-label"
                      >
                        {PALETTE.map((color) => (
                          <button
                            key={color.value}
                            className={styles.swatch}
                            type="button"
                            aria-label={`Use ${color.name}`}
                            aria-pressed={
                              selectedShapeSetting.color === color.value
                            }
                            style={
                              { "--swatch": color.value } as CSSProperties
                            }
                            onClick={() =>
                              updateSelectedShape({ color: color.value })
                            }
                          />
                        ))}
                        <label
                          className={styles.customColor}
                          title="Custom color"
                        >
                          <span className={styles.srOnly}>
                            Choose a custom color
                          </span>
                          <input
                            type="color"
                            value={selectedShapeSetting.color}
                            onChange={(event) =>
                              updateSelectedShape({
                                color: event.currentTarget.value,
                              })
                            }
                          />
                          <ToolIcon name="plus" />
                        </label>
                      </div>
                    </div>
                  </fieldset>
                ) : null}
              </div>
            ) : null}
          </section>

          <section
            className={`${styles.controlSection} ${styles.colorSeedSection}`}
          >
            <label
              id="color-seed-label"
              className={styles.colorSeedLabel}
              htmlFor="color-seed"
            >
              Color seed
            </label>
            <div
              className={styles.seedControl}
              role="group"
              aria-labelledby="color-seed-label"
            >
              <input
                id="color-seed"
                className={styles.seedInput}
                type="number"
                inputMode="numeric"
                min={MIN_COLOR_SEED}
                max={MAX_COLOR_SEED}
                step="1"
                value={colorSeed}
                onChange={(event) =>
                  selectColorSeed(Number(event.currentTarget.value))
                }
              />
              <div className={styles.seedStepper}>
                <button
                  className={styles.seedButton}
                  type="button"
                  aria-label="Next color seed"
                  title="Next seed"
                  onClick={() =>
                    selectColorSeed(stepColorSeed(colorSeed, 1))
                  }
                >
                  <ToolIcon name="chevron-up" />
                </button>
                <button
                  className={styles.seedButton}
                  type="button"
                  aria-label="Previous color seed"
                  title="Previous seed"
                  onClick={() =>
                    selectColorSeed(stepColorSeed(colorSeed, -1))
                  }
                >
                  <ToolIcon name="chevron-down" />
                </button>
              </div>
            </div>
          </section>
        </aside>
        ) : null}
      </div>
      {!isPreview && showPlayground ? (
        <ShapePlayground fontsReady={fontsReady} />
      ) : null}
    </ToolRoot>
  );
}
