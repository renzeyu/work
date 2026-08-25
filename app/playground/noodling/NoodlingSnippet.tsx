"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./NoodlingSnippet.module.css";

type NoodlingSettings = {
  width: number;
  height: number;
  tempo: number;
  acceleration: number;
  minLoopSize: number;
  maxLoopSize: number;
  loopSpacing: number;
  tailLength: number;
  strokeWidth: number;
  modulationSpeed: number;
  phaseOffset: number;
  tempoModulation: number;
  accelerationModulation: number;
  minLoopSizeModulation: number;
  maxLoopSizeModulation: number;
  loopSpacingModulation: number;
  strokeWidthModulation: number;
};

const TAU = Math.PI * 2;
const FOOTAGE_TIME_SCALE = 0.75;

const DEFAULT_SETTINGS: NoodlingSettings = {
  width: 24,
  height: 16,
  tempo: 16,
  acceleration: 0.3,
  minLoopSize: 24,
  maxLoopSize: 32,
  loopSpacing: 1.3,
  tailLength: 72,
  strokeWidth: 1.5,
  modulationSpeed: 0.5,
  phaseOffset: 0,
  tempoModulation: 8,
  accelerationModulation: 0.1,
  minLoopSizeModulation: 0,
  maxLoopSizeModulation: 0,
  loopSpacingModulation: 0,
  strokeWidthModulation: 0,
};

const OLD_VERSION_FAST_MULTIPLIER =
  (DEFAULT_SETTINGS.tempo + DEFAULT_SETTINGS.tempoModulation) /
  DEFAULT_SETTINGS.tempo;

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

function NoodleCanvas({ oldVersion }: { oldVersion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const systemDarkMode = window.matchMedia("(prefers-color-scheme: dark)");
    const settings = DEFAULT_SETTINGS;
    let animationFrame = 0;
    let phase = Math.PI / 2;
    let animationTime = 0;
    let introDistance = 0;
    let previousTime = performance.now();
    let pageVisible = !document.hidden;
    let inViewport = true;
    let lineColor = getComputedStyle(canvas).color;

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
      animationTime += delta;
      const modulationPhase =
        TAU * settings.modulationSpeed * animationTime * FOOTAGE_TIME_SCALE +
        settings.phaseOffset -
        Math.PI / 2;
      const effectiveTempo = oldVersion
        ? Math.max(0.2, settings.tempo * OLD_VERSION_FAST_MULTIPLIER)
        : Math.max(
            0.2,
            settings.tempo +
              settings.tempoModulation * Math.sin(modulationPhase),
          );
      const phaseDelta = delta * effectiveTempo * FOOTAGE_TIME_SCALE;
      phase += phaseDelta;
      introDistance += phaseDelta;
    };

    const draw = () => {
      resize();
      const pixelScaleX = canvas.width / Math.max(1, settings.width);
      const pixelScaleY = canvas.height / Math.max(1, settings.height);
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(pixelScaleX, 0, 0, pixelScaleY, 0, 0);

      const modulationPhase =
        TAU * settings.modulationSpeed * animationTime * FOOTAGE_TIME_SCALE +
        settings.phaseOffset -
        Math.PI / 2;
      const primaryWave = Math.sin(modulationPhase);
      const secondaryWave = Math.sin(modulationPhase + Math.PI * 0.58);
      const tertiaryWave = Math.sin(modulationPhase + Math.PI * 1.13);
      const modulationAmount = oldVersion ? 0 : 1;
      const minSize = clamp(
        settings.minLoopSize +
          settings.minLoopSizeModulation * primaryWave * modulationAmount,
        4,
        80,
      );
      const maxSize = clamp(
        settings.maxLoopSize +
          settings.maxLoopSizeModulation * secondaryWave * modulationAmount,
        4,
        88,
      );
      const smallLoop = Math.min(minSize, maxSize);
      const largeLoop = Math.max(minSize, maxSize);
      const spacing = Math.max(
        0.12,
        settings.loopSpacing +
          settings.loopSpacingModulation * tertiaryWave * modulationAmount,
      );
      const stroke = Math.max(
        0.2,
        settings.strokeWidth +
          settings.strokeWidthModulation * primaryWave * modulationAmount,
      );
      const targetPoints = Math.max(8, Math.round(settings.tailLength));
      const effectiveAcceleration = clamp(
        settings.acceleration +
          settings.accelerationModulation * secondaryWave * modulationAmount,
        -0.9,
        1.8,
      );
      const parameterStep = 0.112 + effectiveAcceleration * 0.012;
      const fullSpan = Math.max(
        parameterStep,
        (targetPoints - 1) * parameterStep,
      );
      const introProgress = reducedMotion.matches
        ? 1
        : clamp(introDistance / fullSpan, 0, 1);
      const middle = phase - fullSpan / 2;
      const drift = settings.height * 0.071 * spacing;
      const points: Array<{ x: number; y: number }> = [];

      for (let index = 0; index < targetPoints; index += 1) {
        const position = phase - (targetPoints - 1 - index) * parameterStep;
        const loopRhythm =
          0.5 +
          0.5 * Math.sin(position * 0.46 + effectiveAcceleration * 1.7);
        const loopPercent = mix(
          smallLoop,
          largeLoop,
          smoothstep(loopRhythm),
        );
        const radius = settings.height * loopPercent * 0.01;
        points.push({
          x: drift * (position - middle) + radius * Math.sin(position),
          y: radius * Math.cos(position),
        });
      }

      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = stroke;
      context.strokeStyle = lineColor;

      const visibleSegments = (targetPoints - 1) * introProgress;
      if (visibleSegments <= 0) return;

      const fractionalStart = targetPoints - 1 - visibleSegments;
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
          settings.width / 2 + previous.x,
          settings.height / 2 + previous.y,
        );
        context.lineTo(
          settings.width / 2 + point.x,
          settings.height / 2 + point.y,
        );
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
      if (reducedMotion.matches || !pageVisible || !inViewport) {
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
      if (reducedMotion.matches || !pageVisible || !inViewport) return;
      previousTime = performance.now();
      animationFrame = requestAnimationFrame(tick);
    };

    const refreshColor = () => {
      lineColor = getComputedStyle(canvas).color;
      draw();
    };

    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(canvas);
    const intersectionObserver = new IntersectionObserver((entries) => {
      inViewport = entries[0]?.isIntersecting ?? true;
      reconcile();
    });
    intersectionObserver.observe(canvas);
    const themeObserver = new MutationObserver(refreshColor);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "style"],
    });

    const handleVisibility = () => {
      pageVisible = !document.hidden;
      reconcile();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    reducedMotion.addEventListener("change", reconcile);
    systemDarkMode.addEventListener("change", refreshColor);
    reconcile();

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      reducedMotion.removeEventListener("change", reconcile);
      systemDarkMode.removeEventListener("change", refreshColor);
    };
  }, [oldVersion]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      role="img"
      aria-label="Animated looping line for the Notion AI thinking state"
    />
  );
}

export function NoodlingSnippet() {
  const [oldVersion, setOldVersion] = useState(false);

  return (
    <button
      className={styles.trigger}
      type="button"
      aria-label="Compare the Noodling cadence"
      aria-pressed={oldVersion}
      data-noodling-snippet="true"
      data-cadence={oldVersion ? "original" : "refined"}
      onClick={() => setOldVersion((current) => !current)}
    >
      <span className={styles.canvasFrame}>
        <NoodleCanvas oldVersion={oldVersion} />
      </span>
      <output className="sr-only" aria-live="polite">
        {oldVersion ? "Original cadence" : "Refined cadence"}
      </output>
    </button>
  );
}
