"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import styles from "./NoodlingWorkbench.module.css";

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

type SettingKey = keyof NoodlingSettings;

type ControlDefinition = {
  key: SettingKey;
  label: string;
  min: number;
  max: number;
  step: number;
};

type NoodleCanvasProps = {
  settings: NoodlingSettings;
  paused: boolean;
  oldVersion: boolean;
  restartToken: number;
  magnification: number;
  tone?: "primary" | "muted";
  decorative?: boolean;
};

const TAU = Math.PI * 2;
const STATUS_LABELS = ["Crafting", "Brewing", "Thinking", "Noodling"] as const;
const STATUS_DWELL_MS = 10000;
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

const CONTROL_SECTIONS: Array<{
  title: string;
  controls: ControlDefinition[];
}> = [
  {
    title: "Canvas Settings",
    controls: [
      { key: "width", label: "width", min: 12, max: 48, step: 1 },
      { key: "height", label: "height", min: 8, max: 32, step: 1 },
    ],
  },
  {
    title: "Motion Settings",
    controls: [
      { key: "tempo", label: "tempo", min: 4, max: 36, step: 1 },
      {
        key: "acceleration",
        label: "acceleration",
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        key: "minLoopSize",
        label: "minLoopSize",
        min: 8,
        max: 48,
        step: 1,
      },
      {
        key: "maxLoopSize",
        label: "maxLoopSize",
        min: 12,
        max: 56,
        step: 1,
      },
      {
        key: "loopSpacing",
        label: "loopSpacing",
        min: 0.5,
        max: 2.5,
        step: 0.1,
      },
    ],
  },
  {
    title: "Style Settings",
    controls: [
      {
        key: "tailLength",
        label: "tailLength",
        min: 16,
        max: 140,
        step: 1,
      },
      {
        key: "strokeWidth",
        label: "strokeWidth",
        min: 0.5,
        max: 3,
        step: 0.1,
      },
    ],
  },
  {
    title: "Modulation Settings",
    controls: [
      {
        key: "modulationSpeed",
        label: "modulationSpeed (Hz)",
        min: 0,
        max: 2,
        step: 0.1,
      },
      {
        key: "phaseOffset",
        label: "phaseOffset (radians)",
        min: -3.1,
        max: 3.1,
        step: 0.1,
      },
      {
        key: "tempoModulation",
        label: "tempoModulation",
        min: 0,
        max: 16,
        step: 0.5,
      },
      {
        key: "accelerationModulation",
        label: "accelerationModulation",
        min: 0,
        max: 0.5,
        step: 0.05,
      },
      {
        key: "minLoopSizeModulation",
        label: "minLoopSizeModulation",
        min: 0,
        max: 16,
        step: 0.5,
      },
      {
        key: "maxLoopSizeModulation",
        label: "maxLoopSizeModulation",
        min: 0,
        max: 16,
        step: 0.5,
      },
      {
        key: "loopSpacingModulation",
        label: "loopSpacingModulation",
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        key: "strokeWidthModulation",
        label: "strokeWidthModulation",
        min: 0,
        max: 1.5,
        step: 0.05,
      },
    ],
  },
];

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

function CyclingStatusLabel({ paused }: { paused: boolean }) {
  const [labelIndex, setLabelIndex] = useState(0);
  const remainingTimeRef = useRef(STATUS_DWELL_MS);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (paused) return;

    startedAtRef.current = performance.now();
    const timeout = window.setTimeout(() => {
      startedAtRef.current = null;
      remainingTimeRef.current = STATUS_DWELL_MS;
      setLabelIndex((current) => (current + 1) % STATUS_LABELS.length);
    }, remainingTimeRef.current);

    return () => {
      window.clearTimeout(timeout);
      if (startedAtRef.current === null) return;

      const elapsed = performance.now() - startedAtRef.current;
      remainingTimeRef.current = Math.max(
        0,
        remainingTimeRef.current - elapsed,
      );
      startedAtRef.current = null;
    };
  }, [labelIndex, paused]);

  return (
    <span className={styles.statusText}>
      <span className={styles.srOnly} role="status">
        AI is working
      </span>
      <span
        className={styles.statusWord}
        data-paused={paused || undefined}
        aria-hidden="true"
      >
        {STATUS_LABELS[labelIndex]}
      </span>
    </span>
  );
}

function NoodleCanvas({
  settings,
  paused,
  oldVersion,
  restartToken,
  magnification,
  tone = "primary",
  decorative = false,
}: NoodleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configurationRef = useRef({ settings, paused, oldVersion });
  const redrawRef = useRef<(() => void) | null>(null);
  const reconcileRef = useRef<(() => void) | null>(null);
  const restartRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    configurationRef.current = { settings, paused, oldVersion };
    redrawRef.current?.();
    reconcileRef.current?.();
  }, [oldVersion, paused, settings]);

  useEffect(() => {
    restartRef.current?.();
  }, [restartToken]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const systemDarkMode = window.matchMedia("(prefers-color-scheme: dark)");
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
      const current = configurationRef.current.settings;
      animationTime += delta;

      const modulationPhase =
        TAU * current.modulationSpeed * animationTime * FOOTAGE_TIME_SCALE +
        current.phaseOffset -
        Math.PI / 2;
      const effectiveTempo = configurationRef.current.oldVersion
        ? Math.max(0.2, current.tempo * OLD_VERSION_FAST_MULTIPLIER)
        : Math.max(
            0.2,
            current.tempo +
              current.tempoModulation * Math.sin(modulationPhase),
          );
      const phaseDelta = delta * effectiveTempo * FOOTAGE_TIME_SCALE;
      phase += phaseDelta;
      introDistance += phaseDelta;
    };

    const draw = () => {
      resize();
      const current = configurationRef.current.settings;
      const pixelScaleX = canvas.width / Math.max(1, current.width);
      const pixelScaleY = canvas.height / Math.max(1, current.height);
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(pixelScaleX, 0, 0, pixelScaleY, 0, 0);

      const modulationPhase =
        TAU * current.modulationSpeed * animationTime * FOOTAGE_TIME_SCALE +
        current.phaseOffset -
        Math.PI / 2;
      const primaryWave = Math.sin(modulationPhase);
      const secondaryWave = Math.sin(modulationPhase + Math.PI * 0.58);
      const tertiaryWave = Math.sin(modulationPhase + Math.PI * 1.13);
      const modulationAmount = configurationRef.current.oldVersion ? 0 : 1;

      const minSize = clamp(
        current.minLoopSize +
          current.minLoopSizeModulation * primaryWave * modulationAmount,
        4,
        80,
      );
      const maxSize = clamp(
        current.maxLoopSize +
          current.maxLoopSizeModulation * secondaryWave * modulationAmount,
        4,
        88,
      );
      const smallLoop = Math.min(minSize, maxSize);
      const largeLoop = Math.max(minSize, maxSize);
      const spacing = Math.max(
        0.12,
        current.loopSpacing +
          current.loopSpacingModulation * tertiaryWave * modulationAmount,
      );
      const stroke = Math.max(
        0.2,
        current.strokeWidth +
          current.strokeWidthModulation * primaryWave * modulationAmount,
      );
      const targetPoints = Math.max(8, Math.round(current.tailLength));
      const effectiveAcceleration = clamp(
        current.acceleration +
          current.accelerationModulation * secondaryWave * modulationAmount,
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
      const drift = current.height * 0.071 * spacing;
      const points: Array<{ x: number; y: number }> = [];

      for (let index = 0; index < targetPoints; index += 1) {
        const position =
          phase - (targetPoints - 1 - index) * parameterStep;
        const loopRhythm =
          0.5 +
          0.5 * Math.sin(position * 0.46 + effectiveAcceleration * 1.7);
        const loopPercent = mix(
          smallLoop,
          largeLoop,
          smoothstep(loopRhythm),
        );
        const radius = current.height * loopPercent * 0.01;
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
          current.width / 2 + previous.x,
          current.height / 2 + previous.y,
        );
        context.lineTo(
          current.width / 2 + point.x,
          current.height / 2 + point.y,
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
      const current = configurationRef.current;
      if (
        current.paused ||
        reducedMotion.matches ||
        !pageVisible ||
        !inViewport
      ) {
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
      const current = configurationRef.current;
      if (
        current.paused ||
        reducedMotion.matches ||
        !pageVisible ||
        !inViewport
      ) {
        return;
      }
      previousTime = performance.now();
      animationFrame = requestAnimationFrame(tick);
    };

    const restart = () => {
      phase = Math.PI / 2;
      animationTime = 0;
      introDistance = 0;
      reconcile();
    };

    const refreshColor = () => {
      lineColor = getComputedStyle(canvas).color;
      draw();
    };

    redrawRef.current = draw;
    reconcileRef.current = reconcile;
    restartRef.current = restart;

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
      redrawRef.current = null;
      reconcileRef.current = null;
      restartRef.current = null;
      resizeObserver.disconnect();
      intersectionObserver?.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      reducedMotion.removeEventListener("change", reconcile);
      systemDarkMode.removeEventListener("change", refreshColor);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`${styles.noodleCanvas} ${
        tone === "muted" ? styles.noodleCanvasMuted : styles.noodleCanvasPrimary
      }`}
      style={{
        width: `${settings.width * magnification}px`,
        height: `${settings.height * magnification}px`,
      }}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={
        decorative
          ? undefined
          : "Animated looping line for the AI thinking state"
      }
    >
      Animated looping line for the AI thinking state.
    </canvas>
  );
}

function NumericRangeControl({
  definition,
  value,
  onChange,
}: {
  definition: ControlDefinition;
  value: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const progress =
    ((value - definition.min) / (definition.max - definition.min)) * 100;
  const rangeStyle = {
    "--range-progress": `${clamp(progress, 0, 100)}%`,
  } as CSSProperties;

  const commit = (next: number) => {
    if (!Number.isFinite(next)) return;
    onChange(clamp(next, definition.min, definition.max));
  };

  return (
    <div className={styles.control}>
      <label htmlFor={`${id}-number`}>{definition.label}</label>
      <div className={styles.controlInputs}>
        <input
          id={`${id}-number`}
          className={styles.numberInput}
          type="number"
          min={definition.min}
          max={definition.max}
          step={definition.step}
          value={value}
          onChange={(event) => commit(event.currentTarget.valueAsNumber)}
        />
        <input
          id={`${id}-range`}
          className={styles.rangeInput}
          type="range"
          min={definition.min}
          max={definition.max}
          step={definition.step}
          value={value}
          style={rangeStyle}
          aria-label={`${definition.label} slider`}
          onChange={(event) => commit(event.currentTarget.valueAsNumber)}
        />
      </div>
    </div>
  );
}

export function NoodlingWorkbench() {
  const [settings, setSettings] = useState<NoodlingSettings>({
    ...DEFAULT_SETTINGS,
  });
  const [paused, setPaused] = useState(false);
  const [oldVersion, setOldVersion] = useState(false);
  const [restartToken, setRestartToken] = useState(0);

  const updateSetting = (key: SettingKey, value: number) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const restart = () => {
    setPaused(false);
    setRestartToken((current) => current + 1);
  };

  const reset = () => {
    setSettings({ ...DEFAULT_SETTINGS });
    setPaused(false);
    setRestartToken((current) => current + 1);
  };

  return (
    <section
      className={styles.shell}
      aria-label="Notion AI scribble motion workbench"
      data-noodling-workbench="true"
    >
      <header className={styles.topbar}>
        <div className={styles.titleGroup}>
          <h2>Notion AI Scribble Motion Design</h2>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => setPaused((current) => !current)}
          >
            {paused ? "Play" : "Pause"}
          </button>
          <button type="button" onClick={restart}>
            Restart
          </button>
          <button type="button" onClick={reset}>
            Reset
          </button>
        </div>
      </header>

      <div className={styles.workbench}>
        <section className={styles.previewPane} aria-labelledby="preview-title">
          <header className={styles.previewHeader}>
            <h3 id="preview-title">Preview</h3>
          </header>

          <div className={styles.previewBody}>
            <div className={styles.studyCard}>
              <div className={styles.studyStage}>
                <div className={styles.canvasBounds}>
                  <NoodleCanvas
                    settings={settings}
                    paused={paused}
                    oldVersion={oldVersion}
                    restartToken={restartToken}
                    magnification={10}
                  />
                </div>
              </div>
            </div>

            <div className={styles.contextCard}>
              <div className={styles.messageBubble}>
                <p>
                  How can motion signal AI reasoning while keeping users engaged?
                </p>
              </div>
              <div
                key={`status-${restartToken}`}
                className={styles.statusRow}
                data-paused={paused || undefined}
              >
                <NoodleCanvas
                  settings={settings}
                  paused={paused}
                  oldVersion={oldVersion}
                  restartToken={restartToken}
                  magnification={1}
                  tone="muted"
                  decorative
                />
                <CyclingStatusLabel paused={paused} />
                <span className={styles.chevron} aria-hidden="true" />
              </div>
            </div>

            <section className={styles.philosophy} aria-labelledby="about-title">
              <h3 id="about-title">About</h3>
              <p>
                Thinking does not move at one speed. Noodling alternates three
                fast turns with one slow turn, giving the motion a natural
                cadence. It holds attention without demanding it and makes the
                wait feel intentional. A collaboration between Simon Last and
                Zeyu Ren.
              </p>
            </section>
          </div>
        </section>

        <aside className={styles.inspector} aria-label="Noodling controls">
          <header className={styles.inspectorHeader}>
            <h3>Control panel</h3>
            <div className={styles.inspectorActions}>
              <button
                type="button"
                className={styles.oldVersionToggle}
                aria-pressed={oldVersion}
                onClick={() => setOldVersion((current) => !current)}
              >
                Old Version
              </button>
              <button type="button" onClick={reset}>
                Restore defaults
              </button>
            </div>
          </header>

          {CONTROL_SECTIONS.filter(
            (section) =>
              !oldVersion || section.title !== "Modulation Settings",
          ).map((section) => (
            <section className={styles.controlSection} key={section.title}>
              <header>
                <h4>{section.title}</h4>
              </header>
              <div className={styles.controlGrid}>
                {section.controls.map((definition) => (
                  <NumericRangeControl
                    key={definition.key}
                    definition={definition}
                    value={settings[definition.key]}
                    onChange={(value) =>
                      updateSetting(definition.key, value)
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </aside>
      </div>
    </section>
  );
}
