"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  createPlaygroundAutoSpawnController,
  PLAYGROUND_AUTO_SPAWN_MAX_BODIES,
  playgroundAutoSpawnPosition,
} from "./playgroundAutoSpawn.mjs";
import styles from "./ShapeTyper.module.css";

type PlaygroundEngine = ReturnType<
  typeof import("./shapePlaygroundEngine").createShapePlaygroundEngine
>;

type ShapePlaygroundProps = {
  fontsReady: boolean;
};

export function ShapePlayground({ fontsReady }: ShapePlaygroundProps) {
  const frameRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PlaygroundEngine | null>(null);
  const autoSpawnControllerRef = useRef<ReturnType<
    typeof createPlaygroundAutoSpawnController
  > | null>(null);
  const [bodyCount, setBodyCount] = useState(0);
  const [engineReady, setEngineReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [runtimeEligible, setRuntimeEligible] = useState(false);
  const [status, setStatus] = useState("Playground empty");

  useEffect(() => {
    let cancelled = false;
    let cleanupRuntime = () => {};

    void import("./shapePlaygroundEngine")
      .then(({ createShapePlaygroundEngine }) => {
        if (cancelled) return;
        const canvas = canvasRef.current;
        const frame = frameRef.current;
        if (!canvas || !frame) return;

        const engine = createShapePlaygroundEngine({
          canvas,
          onCountChange: (count) => {
            if (!cancelled) setBodyCount(count);
          },
        });
        engineRef.current = engine;

        const reducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        );
        let isIntersecting = false;

        const syncEligibility = () => {
          const nextEligibility =
            isIntersecting && !document.hidden && !reducedMotion.matches;
          engine.setEligible(nextEligibility);
          if (!cancelled) setRuntimeEligible(nextEligibility);
        };
        const resize = () => {
          const bounds = frame.getBoundingClientRect();
          engine.resize(bounds.width, bounds.height, window.devicePixelRatio);
        };
        const resizeObserver = new ResizeObserver(resize);
        const intersectionObserver = new IntersectionObserver(([entry]) => {
          isIntersecting = entry?.isIntersecting ?? true;
          syncEligibility();
        });

        resizeObserver.observe(frame);
        intersectionObserver.observe(frame);
        document.addEventListener("visibilitychange", syncEligibility);
        reducedMotion.addEventListener("change", syncEligibility);
        resize();
        setEngineReady(true);

        cleanupRuntime = () => {
          resizeObserver.disconnect();
          intersectionObserver.disconnect();
          document.removeEventListener("visibilitychange", syncEligibility);
          reducedMotion.removeEventListener("change", syncEligibility);
          engine.dispose();
          if (engineRef.current === engine) engineRef.current = null;
        };
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
      cleanupRuntime();
    };
  }, []);

  const canSpawn = fontsReady && engineReady && !loadFailed;

  useEffect(() => {
    if (!canSpawn) return;

    const controller = createPlaygroundAutoSpawnController({
      onSpawn: () => {
        const engine = engineRef.current;
        const frame = frameRef.current;
        if (!engine || !frame) return;

        const bounds = frame.getBoundingClientRect();
        if (bounds.width <= 1 || bounds.height <= 1) return;
        const point = playgroundAutoSpawnPosition(bounds.width);
        engine.spawn(
          point.x,
          point.y,
          PLAYGROUND_AUTO_SPAWN_MAX_BODIES,
        );
      },
      onResume: () => {
        engineRef.current?.trimToBodyLimit(
          PLAYGROUND_AUTO_SPAWN_MAX_BODIES,
        );
      },
    });
    autoSpawnControllerRef.current = controller;

    return () => {
      controller.dispose();
      if (autoSpawnControllerRef.current === controller) {
        autoSpawnControllerRef.current = null;
      }
    };
  }, [canSpawn]);

  useEffect(() => {
    autoSpawnControllerRef.current?.setEligible(
      canSpawn && runtimeEligible,
    );
  }, [canSpawn, runtimeEligible]);

  function refreshPlaygroundAutoplay() {
    autoSpawnControllerRef.current?.interact();
  }

  function refreshPlaygroundAutoplayFromKeyboard(
    event: KeyboardEvent<HTMLElement>,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      refreshPlaygroundAutoplay();
    }
  }

  function addShape(event: MouseEvent<HTMLButtonElement>) {
    if (event.button !== 0 || event.ctrlKey) return;
    refreshPlaygroundAutoplay();
    const engine = engineRef.current;
    if (!engine || !canSpawn) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const isKeyboardActivation = event.detail === 0;
    const result = engine.spawn(
      isKeyboardActivation ? bounds.width / 2 : event.clientX - bounds.left,
      isKeyboardActivation
        ? Math.max(56, bounds.height * 0.16)
        : event.clientY - bounds.top,
    );
    if (!result) return;

    setStatus(
      `Shape ${result.glyph} added. ${result.count} ${
        result.count === 1 ? "shape" : "shapes"
      } in the playground.`,
    );
  }

  function resetPlayground() {
    refreshPlaygroundAutoplay();
    engineRef.current?.reset();
    setStatus("Playground cleared.");
  }

  function resetFromContextMenu(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    resetPlayground();
  }

  return (
    <section
      className={styles.playgroundSection}
      aria-labelledby="shape-playground-title"
      data-shape-playground="true"
      onPointerDownCapture={refreshPlaygroundAutoplay}
      onKeyDownCapture={refreshPlaygroundAutoplayFromKeyboard}
    >
      <div className={styles.playgroundHeader}>
        <div className={styles.playgroundHeading}>
          <h2 id="shape-playground-title">Shape playground</h2>
          <p id="shape-playground-instructions">
            Click or tap anywhere to drop a shape. Right-click to reset.
          </p>
        </div>
        <button
          className={styles.playgroundReset}
          type="button"
          disabled={bodyCount === 0}
          onClick={resetPlayground}
        >
          Reset
        </button>
      </div>

      <button
        ref={frameRef}
        className={styles.playgroundFrame}
        type="button"
        aria-label="Add a random shape to the playground"
        aria-describedby="shape-playground-instructions"
        data-shape-count={bodyCount}
        disabled={!canSpawn}
        onClick={addShape}
        onContextMenu={resetFromContextMenu}
      >
        <canvas ref={canvasRef} className={styles.playgroundCanvas} aria-hidden="true">
          Interactive shape physics playground
        </canvas>
        {bodyCount === 0 ? (
          <span className={styles.playgroundPrompt} aria-hidden="true">
            {loadFailed
              ? "Playground unavailable"
              : canSpawn
                ? "Click anywhere"
                : "Loading shapes"}
          </span>
        ) : null}
      </button>
      <span className={styles.srOnly} role="status">
        {status}
      </span>
    </section>
  );
}
