"use client";

import { ArrowCounterClockwise, Pause, Play } from "@phosphor-icons/react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  createLoaderTransport,
  createMotionAnimations,
  type LoaderTransport,
} from "./loaderMotion";
import styles from "./LoaderPrototype.module.css";
import {
  RPAN_SOURCE_FILL,
  rpanABarMask,
  rpanGlyphPaths,
  rpanLayoutBoxes,
  rpanMorphPaths,
  rpanPlacement,
  rpanRTrimMask,
  rpanRTrimPath,
  rpanRTrimSeam,
} from "./rpanLogoGeometry";

const loaderStudies = [
  {
    id: "ama",
    name: "AMA",
    duration: "1.01 s",
    dimensions: "Inline vectors · 1080 grid",
  },
  {
    id: "rpan",
    name: "RPAN",
    duration: "1.28 s",
    dimensions: "Inline vectors · 480 grid",
  },
] as const;

const playbackRates = [0.5, 1, 1.5] as const;
const RPAN_MASK_OVERSCAN = 2;

type PlaybackRate = (typeof playbackRates)[number];
type MotionSupport = "pending" | "ready" | "unsupported";

const amaPaths = {
  aLeft:
    "M299,617L363,461L392,461L453,606L456,617L420,617L409,586L347,586L336,617L299,617ZM377,502L358,557L398,557L380,505L377,502Z",
  m: "M465,461L492,461L544,537L546,537L599,461L625,462L624,617L590,617L591,523L588,525L549,585L541,585L538,582L509,537L500,524L498,524L499,617L465,617L465,461Z",
  aRight:
    "M789,617L753,617L742,586L680,586L669,617L633,617L697,461L726,462L789,617ZM710,502L691,557L731,557L713,504L710,502Z",
} as const;

type MotionLayerProps = {
  bounds: {
    height: number;
    width: number;
    x: number;
    y: number;
  };
  canvasSize: number;
  color: string;
  originX: number;
  path: string;
  track: string;
};

function MotionLayer({
  bounds,
  canvasSize,
  color,
  originX,
  path,
  track,
}: MotionLayerProps) {
  return (
    <div
      className={styles.motionLayer}
      data-motion-layer={track}
      style={
        {
          "--motion-height": `${(bounds.height / canvasSize) * 100}%`,
          "--motion-left": `${(bounds.x / canvasSize) * 100}%`,
          "--motion-origin-x": `${((originX - bounds.x) / bounds.width) * 100}%`,
          "--motion-origin-y": "50%",
          "--motion-top": `${(bounds.y / canvasSize) * 100}%`,
          "--motion-width": `${(bounds.width / canvasSize) * 100}%`,
        } as CSSProperties
      }
    >
      <svg
        aria-hidden="true"
        focusable="false"
        preserveAspectRatio="none"
        viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
      >
        <path d={path} fill={color} fillRule="evenodd" clipRule="evenodd" />
      </svg>
    </div>
  );
}

type RpanMotionLayerProps = {
  bounds: {
    height: number;
    width: number;
    x: number;
    y: number;
  };
  children: ReactNode;
  originX: number;
  originY?: number;
  track: string;
};

function RpanMotionLayer({
  bounds,
  children,
  originX,
  originY = 240,
  track,
}: RpanMotionLayerProps) {
  return (
    <div
      className={styles.motionLayer}
      data-motion-layer={track}
      style={
        {
          "--motion-height": `${(bounds.height / 480) * 100}%`,
          "--motion-left": `${(bounds.x / 480) * 100}%`,
          "--motion-origin-x": `${((originX - bounds.x) / bounds.width) * 100}%`,
          "--motion-origin-y": `${((originY - bounds.y) / bounds.height) * 100}%`,
          "--motion-top": `${(bounds.y / 480) * 100}%`,
          "--motion-width": `${(bounds.width / 480) * 100}%`,
        } as CSSProperties
      }
    >
      <svg
        aria-hidden="true"
        focusable="false"
        preserveAspectRatio="none"
        viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
      >
        {children}
      </svg>
    </div>
  );
}

function RpanArtwork({ children }: { children: ReactNode }) {
  return (
    <g transform={rpanPlacement.transform}>
      {children}
    </g>
  );
}

type RpanAProps = {
  animated?: boolean;
};

function RpanA({ animated = false }: RpanAProps) {
  const instanceId = useId().replaceAll(":", "");
  const barMaskId = `rpan-a-bar-mask-${instanceId}`;

  if (!animated) {
    return (
      <RpanArtwork>
        <path
          d={rpanGlyphPaths.a}
          fill={RPAN_SOURCE_FILL}
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </RpanArtwork>
    );
  }

  return (
    <RpanArtwork>
      <defs>
        <mask
          id={barMaskId}
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
          x={rpanABarMask.bounds.x - RPAN_MASK_OVERSCAN}
          y={rpanABarMask.bounds.y - RPAN_MASK_OVERSCAN}
          width={rpanABarMask.bounds.width + RPAN_MASK_OVERSCAN * 2}
          height={rpanABarMask.bounds.height + RPAN_MASK_OVERSCAN * 2}
          style={{ maskType: "alpha" }}
        >
          <path
            data-motion-property="rpan-a-bar-mask-dash"
            d={rpanABarMask.path}
            fill="none"
            stroke="#ffffff"
            strokeDasharray={`${rpanABarMask.length} 1000`}
            strokeLinecap="round"
            strokeWidth={rpanABarMask.strokeWidth}
          />
        </mask>
      </defs>
      <g mask={`url(#${barMaskId})`}>
        <path
          d={rpanGlyphPaths.a}
          fill={RPAN_SOURCE_FILL}
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </g>
      <path
        data-motion-property="rpan-a-body-path"
        d={rpanMorphPaths.aToN.from}
        fill={RPAN_SOURCE_FILL}
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </RpanArtwork>
  );
}

type RpanRProps = {
  animated?: boolean;
};

function RpanR({ animated = false }: RpanRProps) {
  const instanceId = useId().replaceAll(":", "");
  const trimMaskId = `rpan-r-trim-mask-${instanceId}`;

  if (!animated) {
    return (
      <RpanArtwork>
        <path
          d={rpanGlyphPaths.r}
          fill={RPAN_SOURCE_FILL}
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </RpanArtwork>
    );
  }

  return (
    <RpanArtwork>
      <defs>
        <mask
          id={trimMaskId}
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
          x={rpanRTrimMask.bounds.x - RPAN_MASK_OVERSCAN}
          y={rpanRTrimMask.bounds.y - RPAN_MASK_OVERSCAN}
          width={rpanRTrimMask.bounds.width + RPAN_MASK_OVERSCAN * 2}
          height={rpanRTrimMask.bounds.height + RPAN_MASK_OVERSCAN * 2}
          style={{ maskType: "alpha" }}
        >
          <path
            data-motion-property="rpan-r-trim-mask-dash"
            d={rpanRTrimMask.path}
            fill="none"
            stroke="#ffffff"
            strokeDasharray={`${rpanRTrimMask.length} 1000`}
            strokeLinecap="round"
            strokeWidth={rpanRTrimMask.strokeWidth}
          />
        </mask>
      </defs>
      <g mask={`url(#${trimMaskId})`}>
        <path d={rpanRTrimPath} fill={RPAN_SOURCE_FILL} />
        <path
          d={rpanRTrimSeam.path}
          fill="none"
          stroke={RPAN_SOURCE_FILL}
          strokeLinecap="butt"
          strokeWidth={rpanRTrimSeam.strokeWidth}
        />
      </g>
      <path
        data-motion-property="rpan-r-body-path"
        d={rpanMorphPaths.rToP.from}
        fill={RPAN_SOURCE_FILL}
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </RpanArtwork>
  );
}

function rpanCenter(
  glyph: keyof typeof rpanLayoutBoxes,
  axis: "x" | "y",
) {
  const box = rpanLayoutBoxes[glyph];
  return axis === "x" ? box.x + box.width / 2 : box.y + box.height / 2;
}

function AmaLoader() {
  return (
    <div
      className={styles.codeLoader}
      data-code-loader="ama"
      role="img"
      aria-label="AMA animated loader rebuilt with inline vector code"
    >
      <MotionLayer
        bounds={{ x: 299, y: 461, width: 158, height: 156 }}
        canvasSize={1080}
        color="#ff4500"
        originX={378}
        path={amaPaths.aLeft}
        track="ama-a-outgoing"
      />
      <MotionLayer
        bounds={{ x: 465, y: 461, width: 160, height: 156 }}
        canvasSize={1080}
        color="#ff4500"
        originX={545}
        path={amaPaths.m}
        track="ama-m"
      />
      <MotionLayer
        bounds={{ x: 633, y: 461, width: 157, height: 156 }}
        canvasSize={1080}
        color="#ff4500"
        originX={711.5}
        path={amaPaths.aRight}
        track="ama-a-right"
      />
      <MotionLayer
        bounds={{ x: 299, y: 461, width: 158, height: 156 }}
        canvasSize={1080}
        color="#ff4500"
        originX={378}
        path={amaPaths.aLeft}
        track="ama-a-incoming"
      />
    </div>
  );
}

function RpanLoader() {
  return (
    <div
      className={styles.codeLoader}
      data-code-loader="rpan"
      role="img"
      aria-label="RPAN animated loader rebuilt from the supplied SVG geometry"
    >
      <RpanMotionLayer
        bounds={rpanLayoutBoxes.r}
        originX={rpanCenter("r", "x")}
        originY={rpanCenter("r", "y")}
        track="rpan-r-main"
      >
        <RpanR animated />
      </RpanMotionLayer>
      <RpanMotionLayer
        bounds={rpanLayoutBoxes.p}
        originX={rpanCenter("p", "x")}
        originY={rpanCenter("p", "y")}
        track="rpan-p"
      >
        <RpanArtwork>
          <path
            d={rpanGlyphPaths.p}
            fill={RPAN_SOURCE_FILL}
            fillRule="evenodd"
            clipRule="evenodd"
          />
        </RpanArtwork>
      </RpanMotionLayer>
      <RpanMotionLayer
        bounds={rpanLayoutBoxes.r}
        originX={rpanCenter("r", "x")}
        originY={rpanCenter("r", "y")}
        track="rpan-r-incoming"
      >
        <RpanR />
      </RpanMotionLayer>
      <RpanMotionLayer
        bounds={rpanLayoutBoxes.a}
        originX={rpanCenter("a", "x")}
        originY={rpanCenter("a", "y")}
        track="rpan-a-main"
      >
        <RpanA animated />
      </RpanMotionLayer>
      <RpanMotionLayer
        bounds={rpanLayoutBoxes.n}
        originX={rpanCenter("n", "x")}
        originY={rpanCenter("n", "y")}
        track="rpan-n"
      >
        <RpanArtwork>
          <path
            d={rpanGlyphPaths.n}
            fill={RPAN_SOURCE_FILL}
            fillRule="evenodd"
            clipRule="evenodd"
          />
        </RpanArtwork>
      </RpanMotionLayer>
      <RpanMotionLayer
        bounds={rpanLayoutBoxes.a}
        originX={rpanCenter("a", "x")}
        originY={rpanCenter("a", "y")}
        track="rpan-a-incoming"
      >
        <RpanA />
      </RpanMotionLayer>
    </div>
  );
}

type LoaderPrototypeProps = {
  variant?: "page" | "playground";
};

export function LoaderPrototype({ variant = "page" }: LoaderPrototypeProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const instanceId = useId().replaceAll(":", "");
  const transportRef = useRef<LoaderTransport | null>(null);
  const reconcilePlaybackRef = useRef<() => void>(() => undefined);
  const playbackIntentRef = useRef({
    desired: true,
    hidden: false,
    reduced: false,
    reducedOverride: false,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [motionSupport, setMotionSupport] = useState<MotionSupport>("pending");
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const intent = playbackIntentRef.current;

    intent.hidden = document.hidden;
    intent.reduced = motionPreference.matches;
    setReduceMotion(intent.reduced);

    if (
      !root ||
      typeof Animation !== "function" ||
      typeof KeyframeEffect !== "function" ||
      typeof CSS === "undefined" ||
      !CSS.supports("d", 'path("M0 0C0 0 1 1 1 1Z")')
    ) {
      setMotionSupport("unsupported");
      return;
    }

    let animations: Animation[];
    try {
      animations = createMotionAnimations(root);
    } catch {
      setMotionSupport("unsupported");
      return;
    }

    const transport = createLoaderTransport(animations, () =>
      Number(document.timeline.currentTime ?? performance.now()),
    );
    transportRef.current = transport;

    const loaderElements = Array.from(
      root.querySelectorAll<HTMLElement>("[data-code-loader]"),
    );
    const animationsByLoader = new Map(
      loaderElements.map((loader) => [
        loader,
        animations.filter((animation) => {
          const effect = animation.effect;
          const target =
            effect instanceof KeyframeEffect ? effect.target : null;
          return target instanceof Element && loader.contains(target);
        }),
      ]),
    );
    const supportsVisibilityObserver =
      typeof IntersectionObserver === "function";
    const visibleLoaders = new Set(
      supportsVisibilityObserver
        ? loaderElements.filter((loader) => {
            const bounds = loader.getBoundingClientRect();
            return (
              bounds.bottom >= -160 &&
              bounds.right >= 0 &&
              bounds.top <= window.innerHeight + 160 &&
              bounds.left <= window.innerWidth
            );
          })
        : loaderElements,
    );
    const syncVisibleAnimations = () => {
      loaderElements.forEach((loader) => {
        loader.dataset.motionActive = visibleLoaders.has(loader)
          ? "true"
          : "false";
      });
      transport.setActiveAnimations(
        loaderElements.flatMap((loader) =>
          visibleLoaders.has(loader)
            ? (animationsByLoader.get(loader) ?? [])
            : [],
        ),
      );
    };
    const visibilityObserver =
      supportsVisibilityObserver
        ? new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                const loader = entry.target as HTMLElement;
                if (entry.isIntersecting) {
                  visibleLoaders.add(loader);
                } else {
                  visibleLoaders.delete(loader);
                }
              });
              syncVisibleAnimations();
            },
            { rootMargin: "160px 0px" },
          )
        : null;

    loaderElements.forEach((loader) => visibilityObserver?.observe(loader));
    syncVisibleAnimations();

    const reconcilePlayback = () => {
      const shouldPlay =
        intent.desired &&
        !intent.hidden &&
        (!intent.reduced || intent.reducedOverride);

      if (shouldPlay) {
        transport.play();
      } else {
        transport.pause();
      }
      setIsPlaying(shouldPlay);
    };

    reconcilePlaybackRef.current = reconcilePlayback;

    const handleMotionPreference = () => {
      intent.reduced = motionPreference.matches;
      if (intent.reduced) {
        intent.reducedOverride = false;
        transport.restart();
      }
      setReduceMotion(intent.reduced);
      reconcilePlayback();
    };

    const handleVisibility = () => {
      intent.hidden = document.hidden;
      reconcilePlayback();
    };

    motionPreference.addEventListener("change", handleMotionPreference);
    document.addEventListener("visibilitychange", handleVisibility);
    setMotionSupport("ready");
    reconcilePlayback();

    return () => {
      visibilityObserver?.disconnect();
      motionPreference.removeEventListener("change", handleMotionPreference);
      document.removeEventListener("visibilitychange", handleVisibility);
      reconcilePlaybackRef.current = () => undefined;
      transportRef.current = null;
      transport.destroy();
    };
  }, []);

  function togglePlayback() {
    const transport = transportRef.current;
    if (!transport) return;

    const intent = playbackIntentRef.current;
    if (transport.isRunning()) {
      intent.desired = false;
      intent.reducedOverride = false;
    } else {
      intent.desired = true;
      intent.reducedOverride = intent.reduced;
    }
    reconcilePlaybackRef.current();
  }

  function restartPlayback() {
    transportRef.current?.restart();
  }

  function selectPlaybackRate(rate: PlaybackRate) {
    setPlaybackRate(rate);
    transportRef.current?.setRate(rate);
  }

  const controlsReady = motionSupport === "ready";
  const playbackStatus =
    motionSupport === "pending"
      ? "Preparing the code timeline."
      : motionSupport === "unsupported"
        ? "Static vectors shown. Motion controls are unavailable in this browser."
        : reduceMotion && !isPlaying
          ? "Motion is paused for your reduced-motion setting. Use Play to preview."
          : isPlaying
            ? `Both code timelines are playing at ${playbackRate}× speed.`
            : "Both code timelines are paused.";

  if (variant === "playground") {
    return (
      <div
        ref={rootRef}
        className={styles.playgroundPreview}
        data-loader-variant="playground"
      >
        <div className={styles.playgroundStage}>
          <AmaLoader />
        </div>
        <div className={styles.playgroundStage}>
          <RpanLoader />
        </div>
      </div>
    );
  }

  const titleId = `loader-prototype-title-${instanceId}`;

  return (
    <section
      ref={rootRef}
      className={styles.prototypePage}
      data-loader-prototype="page"
      aria-labelledby={titleId}
    >
      <header className={styles.header}>
        <div className={styles.heading}>
          <h1 id={titleId}>Loader prototypes</h1>
          <p>
            Two reference loops rebuilt as inline vector paths and synchronized
            code timelines.
          </p>
        </div>

        <div className={styles.controls} aria-label="Playback controls">
          <button
            className={styles.iconButton}
            type="button"
            onClick={restartPlayback}
            aria-label="Restart both loaders"
            disabled={!controlsReady}
          >
            <ArrowCounterClockwise aria-hidden="true" weight="bold" />
          </button>
          <button
            className={`${styles.iconButton} ${styles.primaryControl}`}
            type="button"
            onClick={togglePlayback}
            aria-label={isPlaying ? "Pause both loaders" : "Play both loaders"}
            aria-pressed={isPlaying}
            disabled={!controlsReady}
          >
            {isPlaying ? (
              <Pause aria-hidden="true" weight="fill" />
            ) : (
              <Play aria-hidden="true" weight="fill" />
            )}
          </button>

          <div
            className={styles.rateGroup}
            role="group"
            aria-label="Playback speed"
          >
            {playbackRates.map((rate) => (
              <button
                key={rate}
                className={`${styles.rateButton} ${
                  playbackRate === rate ? styles.rateButtonActive : ""
                }`}
                type="button"
                onClick={() => selectPlaybackRate(rate)}
                aria-pressed={playbackRate === rate}
                disabled={!controlsReady}
              >
                {rate}×
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className={styles.loaderGrid}>
        {loaderStudies.map((loader) => (
          <article
            key={loader.id}
            className={styles.loaderStudy}
            aria-labelledby={`${instanceId}-${loader.id}-loader-title`}
          >
            <div className={styles.stage}>
              {loader.id === "ama" ? <AmaLoader /> : <RpanLoader />}
            </div>

            <div className={styles.loaderMeta}>
              <div>
                <h2 id={`${instanceId}-${loader.id}-loader-title`}>
                  {loader.name}
                </h2>
                <p>{loader.dimensions}</p>
              </div>
              <span>{loader.duration}</span>
            </div>
          </article>
        ))}
      </div>

      <p
        className={styles.playbackStatus}
        aria-live="polite"
        aria-atomic="true"
      >
        {playbackStatus}
      </p>
    </section>
  );
}
