"use client";

import { useEffect, useRef } from "react";

type NotionNoodleGlyphProps = {
  className?: string;
  paused?: boolean;
};

const TAU = Math.PI * 2;
const FOOTAGE_TIME_SCALE = 0.75;
const LOGICAL_WIDTH = 24;
const LOGICAL_HEIGHT = 16;
const TEMPO = 16;
const TEMPO_MODULATION = 8;
const MODULATION_SPEED = 0.5;
const ACCELERATION = 0.3;
const ACCELERATION_MODULATION = 0.1;
const LOOP_SPACING = 1.3;
const TAIL_LENGTH = 72;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mix(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function smoothstep(value: number) {
  const amount = clamp(value, 0, 1);
  return amount * amount * (3 - 2 * amount);
}

/**
 * The procedural 24 × 16 Notion noodling line used by the embedded chat.
 * It alternates quick turns with a longer trough instead of looping evenly.
 */
export function NotionNoodleGlyph({
  className,
  paused = false,
}: NotionNoodleGlyphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const redrawRef = useRef<(() => void) | null>(null);
  const reconcileRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
    redrawRef.current?.();
    reconcileRef.current?.();
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let phase = Math.PI / 2;
    let animationTime = 0;
    let introDistance = 0;
    let previousTime = performance.now();
    let pageVisible = !document.hidden;
    let inViewport = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    const advance = (delta: number) => {
      const scaledDelta = delta;
      animationTime += Math.abs(scaledDelta);
      const modulationPhase =
        TAU * MODULATION_SPEED * animationTime * FOOTAGE_TIME_SCALE - Math.PI / 2;
      const effectiveTempo = Math.max(
        0.2,
        TEMPO + TEMPO_MODULATION * Math.sin(modulationPhase),
      );
      const phaseDelta = scaledDelta * effectiveTempo * FOOTAGE_TIME_SCALE;
      phase += phaseDelta;
      introDistance += Math.abs(phaseDelta);
    };

    const draw = () => {
      resize();
      const pixelScaleX = canvas.width / LOGICAL_WIDTH;
      const pixelScaleY = canvas.height / LOGICAL_HEIGHT;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(pixelScaleX, 0, 0, pixelScaleY, 0, 0);

      const modulationPhase =
        TAU * MODULATION_SPEED * animationTime * FOOTAGE_TIME_SCALE - Math.PI / 2;
      const secondaryWave = Math.sin(modulationPhase + Math.PI * 0.58);
      const effectiveAcceleration = clamp(
        ACCELERATION + ACCELERATION_MODULATION * secondaryWave,
        -0.9,
        1.8,
      );
      const smallLoop = 24;
      const largeLoop = 32;
      const parameterStep = 0.112 + effectiveAcceleration * 0.012;
      const fullSpan = Math.max(parameterStep, (TAIL_LENGTH - 1) * parameterStep);
      const introProgress =
        reducedMotion.matches || (pausedRef.current && introDistance === 0)
          ? 1
          : clamp(introDistance / fullSpan, 0, 1);
      const middle = phase - fullSpan / 2;
      const drift = LOGICAL_HEIGHT * 0.071 * LOOP_SPACING;
      const points: Array<{ x: number; y: number }> = [];

      for (let index = 0; index < TAIL_LENGTH; index += 1) {
        const u = phase - (TAIL_LENGTH - 1 - index) * parameterStep;
        const loopRhythm =
          0.5 + 0.5 * Math.sin(u * 0.46 + effectiveAcceleration * 1.7);
        const loopPercent = mix(smallLoop, largeLoop, smoothstep(loopRhythm));
        const radius = LOGICAL_HEIGHT * loopPercent * 0.01;
        points.push({
          x: drift * (u - middle) + radius * Math.sin(u),
          y: radius * Math.cos(u),
        });
      }

      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = 1.5;
      context.strokeStyle = getComputedStyle(canvas).color;

      const visibleSegments = (TAIL_LENGTH - 1) * introProgress;
      if (visibleSegments <= 0) return;

      const fractionalStart = TAIL_LENGTH - 1 - visibleSegments;
      const lowerIndex = Math.max(0, Math.floor(fractionalStart));
      const upperIndex = Math.min(points.length - 1, lowerIndex + 1);
      const fraction = fractionalStart - lowerIndex;
      let previous = {
        x: mix(points[lowerIndex].x, points[upperIndex].x, fraction),
        y: mix(points[lowerIndex].y, points[upperIndex].y, fraction),
      };

      for (let index = upperIndex; index < points.length; index += 1) {
        const point = points[index];
        context.beginPath();
        context.moveTo(
          LOGICAL_WIDTH / 2 + previous.x,
          LOGICAL_HEIGHT / 2 + previous.y,
        );
        context.lineTo(LOGICAL_WIDTH / 2 + point.x, LOGICAL_HEIGHT / 2 + point.y);
        context.stroke();
        previous = point;
      }
    };

    const stop = () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    };

    const tick = (now: number) => {
      animationFrame = 0;
      if (pausedRef.current || reducedMotion.matches || !pageVisible || !inViewport) {
        draw();
        return;
      }

      const delta = Math.min(0.08, Math.max(0, (now - previousTime) / 1000));
      previousTime = now;
      advance(delta);
      draw();
      animationFrame = requestAnimationFrame(tick);
    };

    const reconcile = () => {
      stop();
      draw();
      if (pausedRef.current || reducedMotion.matches || !pageVisible || !inViewport) {
        return;
      }
      previousTime = performance.now();
      animationFrame = requestAnimationFrame(tick);
    };

    redrawRef.current = draw;
    reconcileRef.current = reconcile;

    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(canvas);
    const intersectionObserver =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver((entries) => {
            inViewport = entries[0]?.isIntersecting ?? true;
            reconcile();
          });
    intersectionObserver?.observe(canvas);

    const handleVisibility = () => {
      pageVisible = !document.hidden;
      reconcile();
    };
    const handleReducedMotion = () => reconcile();
    document.addEventListener("visibilitychange", handleVisibility);
    reducedMotion.addEventListener("change", handleReducedMotion);
    reconcile();

    return () => {
      stop();
      redrawRef.current = null;
      reconcileRef.current = null;
      resizeObserver.disconnect();
      intersectionObserver?.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      reducedMotion.removeEventListener("change", handleReducedMotion);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      width={LOGICAL_WIDTH}
      height={LOGICAL_HEIGHT}
      aria-hidden="true"
    />
  );
}
