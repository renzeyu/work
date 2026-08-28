"use client";

import "./RPlacePreview.css";

import {
  Check,
  Clock,
  DownloadSimple,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import {
  BOARD_CELL_COUNT,
  BOARD_SIZE,
  COOLDOWN_MS,
  EMPTY_COLOR_INDEX,
  PALETTE,
  STORAGE_KEY,
  cellIndex,
  clamp,
  createSeedBoard,
  formatCooldown,
  pointToCell,
  screenToWorld,
  worldToScreen,
  type Cell,
  type Point,
  type ViewTransform,
} from "./place-model";
import { HELP_POSTER_SRC } from "./helpPosterData";
import { withBasePath } from "../../lib/base-path";
import { useCallback, useEffect, useRef, useState } from "react";

type BoardBitmap = {
  pixels: Uint8Array;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  placements: Map<number, number>;
};

type PointerPosition = Point & { startX: number; startY: number };

type GestureState = {
  mode: "idle" | "pan" | "pinch";
  startView: ViewTransform;
  startPoint: Point;
  startDistance: number;
  worldAtPinch: Point;
  suppressTap: boolean;
  moved: number;
};

type SavedState = {
  version: 1;
  placements: Array<[number, number]>;
  nextAllowedAt: number;
};

const INITIAL_CELL: Cell = { x: 62, y: 61 };
const MAX_SCALE = 48;
const TAP_DISTANCE = 7;
const LOADER_DURATION_MS = 2_120;
const LOADER_PATH: Point[] = [
  { x: 50, y: 500 },
  { x: 50, y: 50 },
  { x: 450, y: 50 },
  { x: 450, y: 450 },
  { x: 200, y: 450 },
];
const LOADER_SEGMENT_LENGTHS = LOADER_PATH.slice(1).map((point, index) =>
  getDistance(LOADER_PATH[index], point),
);
const LOADER_PATH_LENGTH = LOADER_SEGMENT_LENGTHS.reduce((total, length) => total + length, 0);

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function getDistance(left: Point, right: Point) {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

function getMidpoint(left: Point, right: Point): Point {
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
}

function getLoaderPathPoint(distance: number) {
  let remaining = clamp(distance, 0, LOADER_PATH_LENGTH);
  for (let index = 0; index < LOADER_SEGMENT_LENGTHS.length; index += 1) {
    const segmentLength = LOADER_SEGMENT_LENGTHS[index];
    if (remaining <= segmentLength) {
      const start = LOADER_PATH[index];
      const end = LOADER_PATH[index + 1];
      const progress = segmentLength === 0 ? 0 : remaining / segmentLength;
      return {
        point: {
          x: start.x + (end.x - start.x) * progress,
          y: start.y + (end.y - start.y) * progress,
        },
        segmentIndex: index,
      };
    }
    remaining -= segmentLength;
  }
  return {
    point: LOADER_PATH[LOADER_PATH.length - 1],
    segmentIndex: LOADER_SEGMENT_LENGTHS.length - 1,
  };
}

function strokeLoaderPath(
  context: CanvasRenderingContext2D,
  startDistance: number,
  endDistance: number,
) {
  if (endDistance <= startDistance) return;
  const start = getLoaderPathPoint(startDistance);
  const end = getLoaderPathPoint(endDistance);
  context.beginPath();
  context.moveTo(start.point.x, start.point.y);
  for (let index = start.segmentIndex + 1; index <= end.segmentIndex; index += 1) {
    context.lineTo(LOADER_PATH[index].x, LOADER_PATH[index].y);
  }
  context.lineTo(end.point.x, end.point.y);
  context.strokeStyle = "#ff4400";
  context.lineWidth = 100;
  context.lineCap = "butt";
  context.lineJoin = "miter";
  context.miterLimit = 2;
  context.stroke();
}

function drawPixelLoader(context: CanvasRenderingContext2D, progress: number) {
  context.clearRect(0, 0, 500, 500);
  context.fillStyle = "#d7dfe3";
  context.fillRect(0, 0, 500, 500);

  if (progress < 0.5) {
    strokeLoaderPath(context, 0, progress * 2 * LOADER_PATH_LENGTH);
  } else {
    strokeLoaderPath(context, (progress * 2 - 1) * LOADER_PATH_LENGTH, LOADER_PATH_LENGTH);
  }

  context.fillStyle = "#ffffff";
  context.fillRect(100, 100, 300, 300);
  context.fillRect(100, 400, 100, 100);
  context.fillStyle = "#222222";
  context.fillRect(200, 200, 100, 100);
}

function PixelLoader() {
  const loaderCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = loaderCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      drawPixelLoader(context, 0);
      return;
    }

    const startTime = performance.now();
    let animationFrame = 0;
    const animate = (now: number) => {
      const progress = ((now - startTime) % LOADER_DURATION_MS) / LOADER_DURATION_MS;
      drawPixelLoader(context, progress);
      animationFrame = window.requestAnimationFrame(animate);
    };
    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  return <canvas ref={loaderCanvasRef} className="pixel-loader" width={500} height={500} aria-hidden="true" />;
}

function makeBoardBitmap(pixels: Uint8Array, placements = new Map<number, number>()) {
  const canvas = document.createElement("canvas");
  canvas.width = BOARD_SIZE;
  canvas.height = BOARD_SIZE;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas is not available in this browser.");

  const bitmap: BoardBitmap = { pixels, canvas, context, placements };
  repaintBoard(bitmap);
  return bitmap;
}

function repaintBoard(bitmap: BoardBitmap) {
  const { context, pixels } = bitmap;
  context.imageSmoothingEnabled = false;
  context.fillStyle = PALETTE[EMPTY_COLOR_INDEX].hex;
  context.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

  for (let index = 0; index < BOARD_CELL_COUNT; index += 1) {
    const colorIndex = pixels[index];
    if (colorIndex === EMPTY_COLOR_INDEX) continue;
    context.fillStyle = PALETTE[colorIndex].hex;
    context.fillRect(index % BOARD_SIZE, Math.floor(index / BOARD_SIZE), 1, 1);
  }
}

function repaintCell(bitmap: BoardBitmap, index: number, colorIndex: number) {
  bitmap.context.fillStyle = PALETTE[colorIndex].hex;
  bitmap.context.fillRect(index % BOARD_SIZE, Math.floor(index / BOARD_SIZE), 1, 1);
}

function parseSavedState(raw: string | null): SavedState | null {
  if (!raw) return null;

  try {
    const candidate = JSON.parse(raw) as Partial<SavedState>;
    if (candidate.version !== 1 || !Array.isArray(candidate.placements)) return null;

    const placements: Array<[number, number]> = [];
    for (const entry of candidate.placements) {
      if (!Array.isArray(entry) || entry.length !== 2) return null;
      const [index, colorIndex] = entry;
      if (
        !Number.isInteger(index) ||
        !Number.isInteger(colorIndex) ||
        index < 0 ||
        index >= BOARD_CELL_COUNT ||
        colorIndex < 0 ||
        colorIndex >= PALETTE.length
      ) {
        return null;
      }
      placements.push([index, colorIndex]);
    }

    const nextAllowedAt = Number.isFinite(candidate.nextAllowedAt)
      ? Math.max(0, Number(candidate.nextAllowedAt))
      : 0;

    return { version: 1, placements, nextAllowedAt };
  } catch {
    return null;
  }
}

export function RPlacePreview() {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coordinateRef = useRef<HTMLOutputElement>(null);
  const placeButtonRef = useRef<HTMLButtonElement>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const helpDialogRef = useRef<HTMLElement>(null);
  const firstSwatchRef = useRef<HTMLButtonElement>(null);

  const boardRef = useRef<BoardBitmap | null>(null);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const viewRef = useRef<ViewTransform>({ scale: 1, tx: 0, ty: 0 });
  const viewInitializedRef = useRef(false);
  const zoomUnitRef = useRef(1);
  const selectedCellRef = useRef<Cell | null>(INITIAL_CELL);
  const draftColorRef = useRef<number | null>(null);
  const sheetOpenRef = useRef(false);
  const submittingRef = useRef(false);
  const nextAllowedAtRef = useRef(0);
  const reduceMotionRef = useRef(false);
  const isDarkRef = useRef(false);
  const mountedRef = useRef(true);
  const storageAvailableRef = useRef(true);
  const cooldownAnnouncedRef = useRef(false);

  const pointersRef = useRef(new Map<number, PointerPosition>());
  const gestureRef = useRef<GestureState>({
    mode: "idle",
    startView: { scale: 1, tx: 0, ty: 0 },
    startPoint: { x: 0, y: 0 },
    startDistance: 0,
    worldAtPinch: { x: 0, y: 0 },
    suppressTap: false,
    moved: 0,
  });

  const drawAnimationRef = useRef<number | null>(null);
  const viewAnimationRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [hydrated, setHydrated] = useState(false);
  const [minimumLoadElapsed, setMinimumLoadElapsed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<Cell>(INITIAL_CELL);
  const [draftColor, setDraftColor] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [nextAllowedAt, setNextAllowedAt] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const appReady = hydrated && minimumLoadElapsed;

  const showToast = useCallback((message: string, duration = 1_900) => {
    setToast(message);
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), duration);
  }, []);

  const closeHelp = useCallback(() => {
    setHelpOpen(false);
    window.setTimeout(() => helpButtonRef.current?.focus(), 0);
  }, []);

  const getFitScale = useCallback(() => {
    const { width, height } = sizeRef.current;
    if (!width || !height) return 1;
    return Math.max(0.5, Math.min((width - 28) / BOARD_SIZE, (height - 28) / BOARD_SIZE));
  }, []);

  const getFocusPoint = useCallback((): Point => {
    const { width, height } = sizeRef.current;
    if (!sheetOpenRef.current) return { x: width / 2, y: height / 2 };
    const sheetReserve = Math.min(272, Math.max(228, height * 0.32));
    return { x: width / 2, y: Math.max(118, (height - sheetReserve) / 2) };
  }, []);

  const clampView = useCallback(
    (candidate: ViewTransform): ViewTransform => {
      const { width, height } = sizeRef.current;
      const fitScale = getFitScale();
      const scale = clamp(candidate.scale, fitScale, MAX_SCALE);
      const boardPixels = BOARD_SIZE * scale;
      const focus = getFocusPoint();

      let tx = candidate.tx;
      let ty = candidate.ty;

      if (boardPixels <= width - 24) {
        tx = (width - boardPixels) / 2;
      } else {
        tx = clamp(tx, focus.x - boardPixels + scale * 0.5, focus.x - scale * 0.5);
      }

      if (boardPixels <= height - 24) {
        ty = (height - boardPixels) / 2;
      } else {
        ty = clamp(ty, focus.y - boardPixels + scale * 0.5, focus.y - scale * 0.5);
      }

      return { scale, tx, ty };
    },
    [getFitScale, getFocusPoint],
  );

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const bitmap = boardRef.current;
    const { width, height, dpr } = sizeRef.current;
    if (!canvas || !bitmap || !width || !height) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.imageSmoothingEnabled = false;

    const view = viewRef.current;
    const boardPixels = BOARD_SIZE * view.scale;

    context.save();
    context.fillStyle = "#ffffff";
    context.shadowColor = isDarkRef.current ? "rgba(0, 0, 0, 0.48)" : "rgba(59, 65, 72, 0.22)";
    context.shadowBlur = 24;
    context.fillRect(view.tx, view.ty, boardPixels, boardPixels);
    context.restore();

    context.drawImage(bitmap.canvas, view.tx, view.ty, boardPixels, boardPixels);

    const lockedCell = sheetOpenRef.current ? selectedCellRef.current : null;
    let previewBounds: { x: number; y: number; size: number } | null = null;
    if (lockedCell && draftColorRef.current !== null) {
      const previewX = view.tx + lockedCell.x * view.scale;
      const previewY = view.ty + lockedCell.y * view.scale;
      context.fillStyle = PALETTE[draftColorRef.current].hex;
      context.fillRect(previewX, previewY, view.scale, view.scale);
      previewBounds = { x: previewX, y: previewY, size: view.scale };
    }

    if (view.scale >= 9) {
      const startColumn = clamp(Math.floor(-view.tx / view.scale), 0, BOARD_SIZE);
      const endColumn = clamp(Math.ceil((width - view.tx) / view.scale), 0, BOARD_SIZE);
      const startRow = clamp(Math.floor(-view.ty / view.scale), 0, BOARD_SIZE);
      const endRow = clamp(Math.ceil((height - view.ty) / view.scale), 0, BOARD_SIZE);

      context.beginPath();
      for (let column = startColumn; column <= endColumn; column += 1) {
        const x = view.tx + column * view.scale;
        context.moveTo(x, view.ty + startRow * view.scale);
        context.lineTo(x, view.ty + endRow * view.scale);
      }
      for (let row = startRow; row <= endRow; row += 1) {
        const y = view.ty + row * view.scale;
        context.moveTo(view.tx + startColumn * view.scale, y);
        context.lineTo(view.tx + endColumn * view.scale, y);
      }
      context.strokeStyle = "rgba(26, 29, 32, 0.10)";
      context.lineWidth = 0.7;
      context.stroke();
    }

    if (previewBounds) {
      context.save();
      context.strokeStyle = "#ffffff";
      context.lineWidth = 2;
      context.shadowColor = "rgba(25, 28, 31, 0.28)";
      context.shadowBlur = 4;
      context.strokeRect(
        previewBounds.x - 1,
        previewBounds.y - 1,
        previewBounds.size + 2,
        previewBounds.size + 2,
      );
      context.restore();
    }

    const focus = getFocusPoint();
    const targetCell = lockedCell ?? pointToCell(focus, view);
    if (targetCell) {
      if (!previewBounds) {
        const center = worldToScreen({ x: targetCell.x + 0.5, y: targetCell.y + 0.5 }, view);
        const lineWidth = Math.min(2, Math.max(1, view.scale * 0.1));
        const half = Math.max(0.5, (view.scale - lineWidth) / 2);
        const corner = Math.max(1, Math.min(half, view.scale * 0.32));

        context.save();
        context.beginPath();
        context.moveTo(center.x - half + corner, center.y - half);
        context.lineTo(center.x - half, center.y - half);
        context.lineTo(center.x - half, center.y - half + corner);
        context.moveTo(center.x + half - corner, center.y - half);
        context.lineTo(center.x + half, center.y - half);
        context.lineTo(center.x + half, center.y - half + corner);
        context.moveTo(center.x - half, center.y + half - corner);
        context.lineTo(center.x - half, center.y + half);
        context.lineTo(center.x - half + corner, center.y + half);
        context.moveTo(center.x + half - corner, center.y + half);
        context.lineTo(center.x + half, center.y + half);
        context.lineTo(center.x + half, center.y + half - corner);
        context.strokeStyle = "#45484d";
        context.lineWidth = lineWidth;
        context.lineCap = "square";
        context.stroke();
        context.restore();
      }

      if (coordinateRef.current) {
        const zoom = view.scale / Math.max(0.01, zoomUnitRef.current);
        coordinateRef.current.textContent = `(${targetCell.x}, ${targetCell.y}) ${zoom.toFixed(1)}x`;
      }
    } else if (coordinateRef.current) {
      coordinateRef.current.textContent = "Outside canvas";
    }
  }, [getFocusPoint]);

  const scheduleDraw = useCallback(() => {
    if (drawAnimationRef.current !== null) return;
    drawAnimationRef.current = window.requestAnimationFrame(() => {
      drawAnimationRef.current = null;
      drawFrame();
    });
  }, [drawFrame]);

  const cancelViewAnimation = useCallback(() => {
    if (viewAnimationRef.current !== null) {
      window.cancelAnimationFrame(viewAnimationRef.current);
      viewAnimationRef.current = null;
    }
  }, []);

  const animateToView = useCallback(
    (candidate: ViewTransform, duration = 340) => {
      cancelViewAnimation();
      const target = clampView(candidate);
      if (reduceMotionRef.current || duration <= 0) {
        viewRef.current = target;
        scheduleDraw();
        return;
      }

      const start = { ...viewRef.current };
      const startTime = performance.now();
      const tick = (now: number) => {
        const progress = clamp((now - startTime) / duration, 0, 1);
        const eased = easeOutCubic(progress);
        viewRef.current = {
          scale: start.scale + (target.scale - start.scale) * eased,
          tx: start.tx + (target.tx - start.tx) * eased,
          ty: start.ty + (target.ty - start.ty) * eased,
        };
        scheduleDraw();
        if (progress < 1) {
          viewAnimationRef.current = window.requestAnimationFrame(tick);
        } else {
          viewAnimationRef.current = null;
        }
      };
      viewAnimationRef.current = window.requestAnimationFrame(tick);
    },
    [cancelViewAnimation, clampView, scheduleDraw],
  );

  const focusCell = useCallback(
    (cell: Cell, autoZoom = true) => {
      selectedCellRef.current = cell;
      setSelectedCell(cell);
      const current = viewRef.current;
      const fitScale = getFitScale();
      const targetScale = autoZoom
        ? Math.max(current.scale, Math.min(MAX_SCALE, Math.max(17, fitScale * 4.5)))
        : current.scale;
      const focus = getFocusPoint();
      animateToView({
        scale: targetScale,
        tx: focus.x - (cell.x + 0.5) * targetScale,
        ty: focus.y - (cell.y + 0.5) * targetScale,
      });
    },
    [animateToView, getFitScale, getFocusPoint],
  );

  const fitCanvas = useCallback(() => {
    const scale = getFitScale();
    const { width, height } = sizeRef.current;
    animateToView({
      scale,
      tx: (width - BOARD_SIZE * scale) / 2,
      ty: (height - BOARD_SIZE * scale) / 2,
    });
    setAnnouncement("The full 100 by 100 canvas is visible.");
  }, [animateToView, getFitScale]);

  const zoomAtPoint = useCallback(
    (point: Point, requestedScale: number, animate = false) => {
      const current = viewRef.current;
      const world = screenToWorld(point, current);
      const scale = clamp(requestedScale, getFitScale(), MAX_SCALE);
      const next = clampView({
        scale,
        tx: point.x - world.x * scale,
        ty: point.y - world.y * scale,
      });
      if (animate) animateToView(next, 220);
      else {
        viewRef.current = next;
        scheduleDraw();
      }
    },
    [animateToView, clampView, getFitScale, scheduleDraw],
  );

  const persistState = useCallback(
    (nextAllowed: number) => {
      if (!storageAvailableRef.current) return;
      const bitmap = boardRef.current;
      if (!bitmap) return;

      const saved: SavedState = {
        version: 1,
        placements: [...bitmap.placements.entries()],
        nextAllowedAt: nextAllowed,
      };

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      } catch {
        storageAvailableRef.current = false;
        showToast("Storage is unavailable. Pixels will last until this tab closes.", 3_200);
      }
    },
    [showToast],
  );

  const openColorSheet = useCallback(() => {
    if (!appReady || submittingRef.current) return;
    const remaining = Math.max(0, nextAllowedAtRef.current - Date.now());
    if (remaining > 0) {
      showToast(`Your next pixel is ready in ${Math.ceil(remaining / 1_000)} seconds.`);
      return;
    }

    const focus = getFocusPoint();
    const cell = pointToCell(focus, viewRef.current);
    if (!cell) {
      showToast("Move the reticle onto the canvas first.");
      return;
    }

    selectedCellRef.current = cell;
    setSelectedCell(cell);
    draftColorRef.current = null;
    setDraftColor(null);
    sheetOpenRef.current = true;
    setSheetOpen(true);

    const sheetFocus = getFocusPoint();
    const scale = viewRef.current.scale;
    animateToView(
      {
        scale,
        tx: sheetFocus.x - (cell.x + 0.5) * scale,
        ty: sheetFocus.y - (cell.y + 0.5) * scale,
      },
      280,
    );
    setAnnouncement(`Choose a color for pixel ${cell.x}, ${cell.y}.`);
    window.setTimeout(
      () => firstSwatchRef.current?.focus(),
      reduceMotionRef.current ? 0 : 300,
    );
  }, [animateToView, appReady, getFocusPoint, showToast]);

  const closeColorSheet = useCallback(() => {
    if (submittingRef.current) return;
    const cell = selectedCellRef.current;
    sheetOpenRef.current = false;
    setSheetOpen(false);
    draftColorRef.current = null;
    setDraftColor(null);

    if (cell) {
      const focus = getFocusPoint();
      const scale = viewRef.current.scale;
      animateToView(
        {
          scale,
          tx: focus.x - (cell.x + 0.5) * scale,
          ty: focus.y - (cell.y + 0.5) * scale,
        },
        280,
      );
    }
    setAnnouncement("Color selection canceled.");
    window.setTimeout(() => placeButtonRef.current?.focus(), reduceMotionRef.current ? 0 : 300);
  }, [animateToView, getFocusPoint]);

  const chooseColor = useCallback(
    (colorIndex: number) => {
      if (submittingRef.current) return;
      draftColorRef.current = colorIndex;
      setDraftColor(colorIndex);
      scheduleDraw();
      setAnnouncement(`${PALETTE[colorIndex].name} selected. Preview shown on the canvas.`);
    },
    [scheduleDraw],
  );

  const commitPixel = useCallback(async () => {
    const bitmap = boardRef.current;
    const cell = selectedCellRef.current;
    const chosenColor = draftColorRef.current;
    if (!bitmap || !cell || chosenColor === null || submittingRef.current) return;
    if (Date.now() < nextAllowedAtRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);

    if (!reduceMotionRef.current) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 80));
      draftColorRef.current = 2;
      scheduleDraw();
      await new Promise<void>((resolve) => window.setTimeout(resolve, 100));
      draftColorRef.current = chosenColor;
      scheduleDraw();
      await new Promise<void>((resolve) => window.setTimeout(resolve, 180));
    }

    if (!mountedRef.current) return;

    const index = cellIndex(cell);
    bitmap.pixels[index] = chosenColor;
    bitmap.placements.set(index, chosenColor);
    repaintCell(bitmap, index, chosenColor);

    const nextAllowed = Date.now() + COOLDOWN_MS;
    nextAllowedAtRef.current = nextAllowed;
    setNextAllowedAt(nextAllowed);
    setRemainingMs(COOLDOWN_MS);
    cooldownAnnouncedRef.current = false;
    persistState(nextAllowed);

    sheetOpenRef.current = false;
    setSheetOpen(false);
    draftColorRef.current = null;
    setDraftColor(null);
    submittingRef.current = false;
    setSubmitting(false);

    const focus = getFocusPoint();
    const scale = viewRef.current.scale;
    animateToView(
      {
        scale,
        tx: focus.x - (cell.x + 0.5) * scale,
        ty: focus.y - (cell.y + 0.5) * scale,
      },
      300,
    );
    scheduleDraw();
    showToast(`Pixel placed at (${cell.x}, ${cell.y}).`);
    setAnnouncement(
      `${PALETTE[chosenColor].name} placed at pixel ${cell.x}, ${cell.y}. Cooldown started.`,
    );
  }, [animateToView, getFocusPoint, persistState, scheduleDraw, showToast]);

  const handleDownload = useCallback(() => {
    const bitmap = boardRef.current;
    if (!bitmap) return;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = 1_000;
    exportCanvas.height = 1_000;
    const context = exportCanvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingEnabled = false;
    context.drawImage(bitmap.canvas, 0, 0, exportCanvas.width, exportCanvas.height);
    exportCanvas.toBlob((blob) => {
      if (!blob) {
        showToast("The canvas could not be exported.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "local-place-canvas.png";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      showToast("Canvas saved as a PNG.");
    }, "image/png");
  }, [showToast]);

  const handleZoomControl = useCallback(() => {
    const fitScale = getFitScale();
    if (viewRef.current.scale > fitScale * 1.35) {
      fitCanvas();
      return;
    }
    const focus = getFocusPoint();
    const cell = pointToCell(focus, viewRef.current) ?? INITIAL_CELL;
    focusCell(cell, true);
  }, [fitCanvas, focusCell, getFitScale, getFocusPoint]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (sheetOpenRef.current || submittingRef.current) return;
      cancelViewAnimation();
      event.currentTarget.setPointerCapture(event.pointerId);
      const bounds = event.currentTarget.getBoundingClientRect();
      const point = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      pointersRef.current.set(event.pointerId, {
        ...point,
        startX: point.x,
        startY: point.y,
      });

      const pointers = [...pointersRef.current.values()];
      if (pointers.length === 1) {
        gestureRef.current = {
          mode: "pan",
          startView: { ...viewRef.current },
          startPoint: point,
          startDistance: 0,
          worldAtPinch: { x: 0, y: 0 },
          suppressTap: false,
          moved: 0,
        };
      } else if (pointers.length >= 2) {
        const midpoint = getMidpoint(pointers[0], pointers[1]);
        gestureRef.current = {
          mode: "pinch",
          startView: { ...viewRef.current },
          startPoint: midpoint,
          startDistance: Math.max(1, getDistance(pointers[0], pointers[1])),
          worldAtPinch: screenToWorld(midpoint, viewRef.current),
          suppressTap: true,
          moved: TAP_DISTANCE + 1,
        };
      }
    },
    [cancelViewAnimation],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const stored = pointersRef.current.get(event.pointerId);
      if (!stored || sheetOpenRef.current) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      stored.x = event.clientX - bounds.left;
      stored.y = event.clientY - bounds.top;

      const pointers = [...pointersRef.current.values()];
      const gesture = gestureRef.current;
      if (pointers.length >= 2) {
        const midpoint = getMidpoint(pointers[0], pointers[1]);
        const distance = Math.max(1, getDistance(pointers[0], pointers[1]));
        if (gesture.mode !== "pinch") {
          gestureRef.current = {
            mode: "pinch",
            startView: { ...viewRef.current },
            startPoint: midpoint,
            startDistance: distance,
            worldAtPinch: screenToWorld(midpoint, viewRef.current),
            suppressTap: true,
            moved: TAP_DISTANCE + 1,
          };
          return;
        }

        const scale = clamp(
          gesture.startView.scale * (distance / gesture.startDistance),
          getFitScale(),
          MAX_SCALE,
        );
        viewRef.current = clampView({
          scale,
          tx: midpoint.x - gesture.worldAtPinch.x * scale,
          ty: midpoint.y - gesture.worldAtPinch.y * scale,
        });
        scheduleDraw();
        return;
      }

      if (pointers.length === 1 && gesture.mode === "pan") {
        const pointer = pointers[0];
        const dx = pointer.x - gesture.startPoint.x;
        const dy = pointer.y - gesture.startPoint.y;
        gesture.moved = Math.max(gesture.moved, Math.hypot(dx, dy));
        viewRef.current = clampView({
          scale: gesture.startView.scale,
          tx: gesture.startView.tx + dx,
          ty: gesture.startView.ty + dy,
        });
        scheduleDraw();
      }
    },
    [clampView, getFitScale, scheduleDraw],
  );

  const finishPointer = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>, canceled = false) => {
      const pointer = pointersRef.current.get(event.pointerId);
      const gesture = gestureRef.current;
      const isTap = Boolean(
        !canceled &&
          pointer &&
          pointersRef.current.size === 1 &&
          gesture.mode === "pan" &&
          !gesture.suppressTap &&
          gesture.moved < TAP_DISTANCE,
      );
      const tapPoint = pointer ? { x: pointer.x, y: pointer.y } : null;
      pointersRef.current.delete(event.pointerId);

      const remainingPointers = [...pointersRef.current.values()];
      if (remainingPointers.length === 1) {
        const remaining = remainingPointers[0];
        gestureRef.current = {
          mode: "pan",
          startView: { ...viewRef.current },
          startPoint: { x: remaining.x, y: remaining.y },
          startDistance: 0,
          worldAtPinch: { x: 0, y: 0 },
          suppressTap: true,
          moved: TAP_DISTANCE + 1,
        };
      } else if (remainingPointers.length === 0) {
        gestureRef.current.mode = "idle";
      }

      if (isTap && tapPoint) {
        const cell = pointToCell(tapPoint, viewRef.current);
        if (cell) {
          focusCell(cell, true);
          setAnnouncement(`Pixel ${cell.x}, ${cell.y} selected.`);
        }
      }
    },
    [focusCell],
  );

  const handleCanvasKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (sheetOpenRef.current) {
        if (event.key === "Escape") closeColorSheet();
        return;
      }

      const step = event.shiftKey ? 10 : 1;
      const current = viewRef.current;
      let next: ViewTransform | null = null;
      if (event.key === "ArrowLeft") next = { ...current, tx: current.tx + current.scale * step };
      if (event.key === "ArrowRight") next = { ...current, tx: current.tx - current.scale * step };
      if (event.key === "ArrowUp") next = { ...current, ty: current.ty + current.scale * step };
      if (event.key === "ArrowDown") next = { ...current, ty: current.ty - current.scale * step };

      if (next) {
        event.preventDefault();
        viewRef.current = clampView(next);
        scheduleDraw();
        return;
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomAtPoint(getFocusPoint(), current.scale * 1.25, true);
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoomAtPoint(getFocusPoint(), current.scale / 1.25, true);
      } else if (event.key.toLowerCase() === "f" || event.key === "0") {
        event.preventDefault();
        fitCanvas();
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openColorSheet();
      }
    },
    [clampView, closeColorSheet, fitCanvas, getFocusPoint, openColorSheet, scheduleDraw, zoomAtPoint],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setMinimumLoadElapsed(true), LOADER_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    reduceMotionRef.current = reducedMotionQuery.matches;

    const handleReducedMotion = (event: MediaQueryListEvent) => {
      reduceMotionRef.current = event.matches;
    };
    const syncDarkMode = () => {
      const explicitTheme = document.documentElement.dataset.theme;
      const darkMode =
        explicitTheme === "dark" ||
        (explicitTheme !== "light" && darkModeQuery.matches);
      isDarkRef.current = darkMode;
      if (rootRef.current) {
        rootRef.current.dataset.rplaceTheme = darkMode ? "dark" : "light";
      }
      scheduleDraw();
    };
    const themeObserver = new MutationObserver(syncDarkMode);
    syncDarkMode();
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    reducedMotionQuery.addEventListener("change", handleReducedMotion);
    darkModeQuery.addEventListener("change", syncDarkMode);

    const pixels = createSeedBoard();
    const placements = new Map<number, number>();
    let stored: SavedState | null = null;
    try {
      stored = parseSavedState(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      storageAvailableRef.current = false;
    }

    if (stored) {
      stored.placements.forEach(([index, colorIndex]) => {
        pixels[index] = colorIndex;
        placements.set(index, colorIndex);
      });
      nextAllowedAtRef.current = stored.nextAllowedAt;
    }

    try {
      boardRef.current = makeBoardBitmap(pixels, placements);
      window.queueMicrotask(() => {
        if (!mountedRef.current) return;
        if (stored) {
          setNextAllowedAt(stored.nextAllowedAt);
          setRemainingMs(Math.max(0, stored.nextAllowedAt - Date.now()));
        }
        setHydrated(true);
        scheduleDraw();
      });
    } catch {
      window.queueMicrotask(() => {
        if (mountedRef.current) {
          showToast("This browser could not start the pixel canvas.", 4_000);
        }
      });
    }

    return () => {
      mountedRef.current = false;
      reducedMotionQuery.removeEventListener("change", handleReducedMotion);
      darkModeQuery.removeEventListener("change", syncDarkMode);
      themeObserver.disconnect();
      if (drawAnimationRef.current !== null) window.cancelAnimationFrame(drawAnimationRef.current);
      if (viewAnimationRef.current !== null) window.cancelAnimationFrame(viewAnimationRef.current);
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, [scheduleDraw, showToast]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !canvas) return;

    const resize = () => {
      const bounds = viewport.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const previousSize = sizeRef.current;
      const previousFit = getFitScale();
      const previousFocus = getFocusPoint();
      const previousWorld = viewInitializedRef.current
        ? screenToWorld(previousFocus, viewRef.current)
        : { x: INITIAL_CELL.x + 0.5, y: INITIAL_CELL.y + 0.5 };

      sizeRef.current = { width, height, dpr };
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      const fitScale = getFitScale();
      const focus = getFocusPoint();
      if (!viewInitializedRef.current) {
        const initialScale = Math.min(16, Math.max(8, fitScale * 3.2));
        zoomUnitRef.current = initialScale / 2.4;
        viewRef.current = clampView({
          scale: initialScale,
          tx: focus.x - (INITIAL_CELL.x + 0.5) * initialScale,
          ty: focus.y - (INITIAL_CELL.y + 0.5) * initialScale,
        });
        viewInitializedRef.current = true;
      } else {
        const ratio = previousSize.width && previousSize.height ? viewRef.current.scale / previousFit : 1;
        const scale = clamp(fitScale * ratio, fitScale, MAX_SCALE);
        viewRef.current = clampView({
          scale,
          tx: focus.x - previousWorld.x * scale,
          ty: focus.y - previousWorld.y * scale,
        });
      }
      scheduleDraw();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    resize();
    return () => observer.disconnect();
  }, [clampView, getFitScale, getFocusPoint, scheduleDraw]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (event: WheelEvent) => {
      if (sheetOpenRef.current) return;
      event.preventDefault();
      cancelViewAnimation();
      const bounds = viewport.getBoundingClientRect();
      const point = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      const modeMultiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? bounds.height : 1;
      const normalizedDelta = event.deltaY * modeMultiplier;
      const nextScale = viewRef.current.scale * Math.exp(-normalizedDelta * 0.0015);
      zoomAtPoint(point, nextScale);
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [cancelViewAnimation, zoomAtPoint]);

  useEffect(() => {
    if (!nextAllowedAt) {
      return;
    }

    const update = () => {
      const remaining = Math.max(0, nextAllowedAt - Date.now());
      setRemainingMs(remaining);
      if (remaining === 0 && !cooldownAnnouncedRef.current) {
        cooldownAnnouncedRef.current = true;
        nextAllowedAtRef.current = 0;
        setNextAllowedAt(0);
        setAnnouncement("Cooldown complete. You can place another pixel.");
      }
    };

    update();
    const timer = window.setInterval(update, 250);
    const handleVisibility = () => {
      if (!document.hidden) update();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", update);
    };
  }, [nextAllowedAt]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const stored = parseSavedState(event.newValue);
      const bitmap = boardRef.current;
      if (!bitmap) return;

      const pixels = createSeedBoard();
      const placements = new Map<number, number>();
      stored?.placements.forEach(([index, colorIndex]) => {
        pixels[index] = colorIndex;
        placements.set(index, colorIndex);
      });
      bitmap.pixels = pixels;
      bitmap.placements = placements;
      repaintBoard(bitmap);
      const next = stored?.nextAllowedAt ?? 0;
      nextAllowedAtRef.current = next;
      setNextAllowedAt(next);
      setRemainingMs(Math.max(0, next - Date.now()));
      scheduleDraw();
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [scheduleDraw]);

  useEffect(() => {
    if (!helpOpen) return;
    window.setTimeout(() => helpDialogRef.current?.focus(), 0);
  }, [helpOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (helpOpen) {
        closeHelp();
      } else if (sheetOpenRef.current) {
        closeColorSheet();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [closeColorSheet, closeHelp, helpOpen]);

  const cooldownActive = remainingMs > 0;

  return (
    <div
      ref={rootRef}
      className="rplace-root"
      data-rplace-preview="true"
      aria-label="Local r/place prototype"
    >
      <div className="canvas-checker" aria-hidden="true" />
      <div ref={viewportRef} className="canvas-viewport">
        <canvas
          ref={canvasRef}
          className="place-canvas"
          tabIndex={appReady ? 0 : -1}
          role="img"
          aria-label="Interactive 100 by 100 pixel canvas. Drag to pan, pinch or scroll to zoom, and tap a pixel to select it."
          aria-describedby="canvas-instructions"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => finishPointer(event)}
          onPointerCancel={(event) => finishPointer(event, true)}
          onKeyDown={handleCanvasKeyDown}
        />
      </div>

      <div className="edge-fade edge-fade-top" aria-hidden="true" />
      <div className="edge-fade edge-fade-bottom" aria-hidden="true" />

      <header className="top-controls" aria-label="Canvas controls">
        <button
          className="circle-control"
          type="button"
          aria-label={sheetOpen ? "Close color tray" : "Fit the full canvas"}
          onClick={sheetOpen ? closeColorSheet : fitCanvas}
          disabled={!appReady}
        >
          <X size={22} weight="regular" />
        </button>

        <output ref={coordinateRef} className="coordinate-pill" aria-live="off">
          (62, 61) 2.4x
        </output>

        <button
          ref={helpButtonRef}
          className="circle-control"
          type="button"
          aria-label="Open canvas help"
          onClick={() => setHelpOpen(true)}
          disabled={!appReady || sheetOpen}
        >
          <span className="help-icon" aria-hidden="true">
            <img
              className="help-question-glyph"
              src={withBasePath("/rplace/question-mark.svg")}
              alt=""
            />
          </span>
        </button>
      </header>

      {!sheetOpen && (
        <nav className="bottom-controls" aria-label="Placement controls">
          <button
            className="circle-control"
            type="button"
            aria-label="Download the canvas as a PNG"
            onClick={handleDownload}
            disabled={!appReady}
          >
            <DownloadSimple size={21} weight="regular" />
          </button>

          {cooldownActive ? (
            <div className="place-pill cooldown-pill" role="timer" aria-label="Pixel placement cooldown">
              <Clock size={17} weight="regular" />
              <span>{formatCooldown(remainingMs)}</span>
            </div>
          ) : (
            <button
              ref={placeButtonRef}
              className="place-pill"
              type="button"
              onClick={openColorSheet}
              disabled={!appReady}
            >
              Place a tile
            </button>
          )}

          <button
            className="circle-control"
            type="button"
            aria-label="Zoom into the target or fit the full canvas"
            onClick={handleZoomControl}
            disabled={!appReady}
          >
            <MagnifyingGlass size={21} weight="regular" />
          </button>
        </nav>
      )}

      {sheetOpen && (
        <section
          className={`palette-sheet${submitting ? " is-submitting" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="palette-title"
          aria-busy={submitting}
        >
          <div className="palette-handle" aria-hidden="true" />
          <div className="palette-content">
            <h2 id="palette-title" className="sr-only">
              Choose a color for pixel {selectedCell.x}, {selectedCell.y}
            </h2>
            <div className="palette-grid" aria-label="Pixel colors">
              {PALETTE.map((color, colorIndex) => (
                <button
                  key={color.hex}
                  ref={colorIndex === 0 ? firstSwatchRef : undefined}
                  className={`color-swatch${draftColor === colorIndex ? " is-selected" : ""}`}
                  style={{ backgroundColor: color.hex }}
                  type="button"
                  aria-label={color.name}
                  aria-pressed={draftColor === colorIndex}
                  onClick={() => chooseColor(colorIndex)}
                  disabled={submitting}
                >
                  {draftColor === colorIndex && (
                    <Check
                      size={17}
                      weight="bold"
                      color={color.darkText ? "#222426" : "#ffffff"}
                      aria-hidden="true"
                    />
                  )}
                </button>
              ))}
            </div>

            <div className={`palette-actions${submitting ? " single-action" : ""}`}>
              <button
                className="sheet-action"
                type="button"
                aria-label={submitting ? "Placing pixel" : "Cancel color selection"}
                onClick={closeColorSheet}
                disabled={submitting}
              >
                <X size={22} weight="regular" />
              </button>
              {!submitting && (
                <button
                  className={`sheet-action confirm-action${draftColor !== null ? " is-ready" : ""}`}
                  type="button"
                  aria-label="Confirm pixel placement"
                  onClick={commitPixel}
                  disabled={draftColor === null || cooldownActive}
                >
                  <Check size={22} weight="regular" />
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {helpOpen && (
        <div
          className="help-page"
          role="presentation"
          onPointerDown={(event) => {
            if (event.currentTarget === event.target) closeHelp();
          }}
        >
          <section
            ref={helpDialogRef}
            className="help-image-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="About Place"
            tabIndex={-1}
          >
            <button
              className="help-image-close"
              type="button"
              aria-label="Close help and return to the canvas"
              onClick={closeHelp}
            >
              <X size={22} weight="bold" aria-hidden="true" />
            </button>
            <img
              className="help-reference-image"
              src={HELP_POSTER_SRC}
              width={2160}
              height={2716}
              alt="Place. There is an empty canvas. You may place a tile upon it, but you must wait to place another. Individually you can create something. Together you can create something more."
            />
          </section>
        </div>
      )}

      {!appReady && (
        <div className="loading-cover" role="status">
          <PixelLoader />
          <span className="sr-only">Loading r/place</span>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      <p id="canvas-instructions" className="sr-only">
        Arrow keys move the target. Hold Shift to move ten pixels. Plus and minus zoom. F fits the
        whole canvas. Enter opens the color tray. Escape closes it.
      </p>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  );
}
