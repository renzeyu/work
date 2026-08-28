"use client";

/* Small native images keep deferred prototypes visually recognizable. */
/* eslint-disable @next/next/no-img-element */

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type LazyExoticComponent,
} from "react";
import { withBasePath } from "../lib/base-path";
import styles from "./Playground.module.css";

export type PlaygroundPrototypeId =
  | "shape-typer"
  | "shape-playground"
  | "noodling"
  | "nosey-ai"
  | "loaders"
  | "reddit-icons"
  | "rplace"
  | "upvote-lab"
  | "reddit-seamless"
  | "reddit-recap";

type PrototypeComponent = LazyExoticComponent<ComponentType>;
type LoadMode = "interaction" | "viewport";

const backgroundLoadOrder: PlaygroundPrototypeId[] = [
  "shape-typer",
  "shape-playground",
  "noodling",
  "loaders",
  "reddit-icons",
  "rplace",
  "upvote-lab",
  "reddit-seamless",
  "reddit-recap",
  // Rive is the heaviest runtime, so it gets the final idle slot.
  "nosey-ai",
];

const BACKGROUND_START_DELAY_MS = 1800;
const BACKGROUND_STEP_DELAY_MS = 2600;
const BACKGROUND_IDLE_TIMEOUT_MS = 1800;

const loadModes: Record<PlaygroundPrototypeId, LoadMode> = {
  "shape-typer": "interaction",
  "shape-playground": "interaction",
  noodling: "viewport",
  "nosey-ai": "interaction",
  loaders: "viewport",
  "reddit-icons": "interaction",
  rplace: "interaction",
  "upvote-lab": "interaction",
  "reddit-seamless": "interaction",
  "reddit-recap": "interaction",
};

const prototypeLabels: Record<PlaygroundPrototypeId, string> = {
  "shape-typer": "Shape Typer",
  "shape-playground": "Shape playground",
  noodling: "Noodling",
  "nosey-ai": "Nosey AI",
  loaders: "AMA and RPAN loaders",
  "reddit-icons": "Reddit icon animations",
  rplace: "r/place canvas",
  "upvote-lab": "Vote motion lab",
  "reddit-seamless": "Reddit seamless feed",
  "reddit-recap": "Reddit Recap 2022",
};

const prototypes: Record<PlaygroundPrototypeId, PrototypeComponent> = {
  "shape-typer": lazy(async () => {
    const { ShapeTyper } = await import("./shape-typer/ShapeTyper");
    return {
      default: function ShapeTyperIsland() {
        return <ShapeTyper variant="preview" />;
      },
    };
  }),
  "shape-playground": lazy(async () => {
    const { ShapePlaygroundPreview } = await import(
      "./shape-typer/ShapePlaygroundPreview"
    );
    return {
      default: function ShapePlaygroundIsland() {
        return (
          <ShapePlaygroundPreview
            instructionsId="shape-playground-preview-instructions"
          />
        );
      },
    };
  }),
  noodling: lazy(async () => {
    const { NoodlingSnippet } = await import("./noodling/NoodlingSnippet");
    return { default: NoodlingSnippet };
  }),
  "nosey-ai": lazy(async () => {
    const { NoseyPrototype } = await import("../nosey-ai/NoseyPrototype");
    return {
      default: function NoseyIsland() {
        return <NoseyPrototype variant="playground" />;
      },
    };
  }),
  loaders: lazy(async () => {
    const { LoaderPrototype } = await import("../loaders/LoaderPrototype");
    return {
      default: function LoadersIsland() {
        return <LoaderPrototype variant="playground" />;
      },
    };
  }),
  "reddit-icons": lazy(async () => {
    const { RedditIconPrototype } = await import(
      "../reddit-icons/RedditIconPrototype"
    );
    return {
      default: function RedditIconsIsland() {
        return <RedditIconPrototype variant="playground" />;
      },
    };
  }),
  rplace: lazy(async () => {
    const { RPlacePreview } = await import("./rplace/RPlacePreview");
    return { default: RPlacePreview };
  }),
  "upvote-lab": lazy(async () => {
    const { UpvoteLab } = await import("../upvote-lab/UpvoteLab");
    return {
      default: function UpvoteLabIsland() {
        return <UpvoteLab variant="playground" />;
      },
    };
  }),
  "reddit-seamless": lazy(async () => {
    const { RedditSeamlessPrototype } = await import(
      "../reddit-seamless/RedditSeamlessPrototype"
    );
    return {
      default: function RedditSeamlessIsland() {
        return (
          <RedditSeamlessPrototype
            variant="playground"
            ariaLabelledBy="reddit-seamless-playground-title"
          />
        );
      },
    };
  }),
  "reddit-recap": lazy(async () => {
    const { RedditRecapPreview } = await import(
      "./reddit-recap/RedditRecapPreview"
    );
    return { default: RedditRecapPreview };
  }),
};

type NavigatorWithConnection = Navigator & {
  connection?: {
    downlink?: number;
    effectiveType?: string;
    saveData?: boolean;
  };
};

type BackgroundLoader = {
  isLoaded: () => boolean;
  load: () => void;
};

const backgroundLoaders = new Map<PlaygroundPrototypeId, BackgroundLoader>();
let backgroundSchedulerStarted = false;
let backgroundSchedulerIndex = 0;
let backgroundTimer: number | undefined;
let backgroundIdleCallback: number | undefined;
let backgroundLoadListener: (() => void) | undefined;
let backgroundVisibilityListener: (() => void) | undefined;

function prefersConservativeLoading() {
  const connection = (navigator as NavigatorWithConnection).connection;
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const reducedData = window.matchMedia(
    "(prefers-reduced-data: reduce)",
  ).matches;
  const slowConnection =
    connection?.effectiveType === "slow-2g" ||
    connection?.effectiveType === "2g";
  const lowBandwidth =
    typeof connection?.downlink === "number" &&
    connection.downlink > 0 &&
    connection.downlink < 0.75;

  return Boolean(
    connection?.saveData ||
      reducedData ||
      reducedMotion ||
      slowConnection ||
      lowBandwidth,
  );
}

function clearBackgroundScheduler() {
  if (backgroundTimer !== undefined) {
    window.clearTimeout(backgroundTimer);
    backgroundTimer = undefined;
  }

  if (backgroundIdleCallback !== undefined) {
    window.cancelIdleCallback?.(backgroundIdleCallback);
    backgroundIdleCallback = undefined;
  }

  if (backgroundLoadListener) {
    window.removeEventListener("load", backgroundLoadListener);
    backgroundLoadListener = undefined;
  }

  if (backgroundVisibilityListener) {
    document.removeEventListener(
      "visibilitychange",
      backgroundVisibilityListener,
    );
    backgroundVisibilityListener = undefined;
  }

  backgroundSchedulerStarted = false;
  backgroundSchedulerIndex = 0;
}

function loadNextPrototypeInBackground() {
  backgroundIdleCallback = undefined;

  while (backgroundSchedulerIndex < backgroundLoadOrder.length) {
    const prototype = backgroundLoadOrder[backgroundSchedulerIndex];
    backgroundSchedulerIndex += 1;
    const loader = backgroundLoaders.get(prototype);

    if (!loader || loader.isLoaded()) continue;

    loader.load();
    scheduleBackgroundStep(BACKGROUND_STEP_DELAY_MS);
    return;
  }
}

function runBackgroundStepWhenVisible() {
  if (document.visibilityState !== "visible") {
    backgroundVisibilityListener = () => {
      if (document.visibilityState !== "visible") return;
      if (backgroundVisibilityListener) {
        document.removeEventListener(
          "visibilitychange",
          backgroundVisibilityListener,
        );
        backgroundVisibilityListener = undefined;
      }
      runBackgroundStepWhenVisible();
    };
    document.addEventListener(
      "visibilitychange",
      backgroundVisibilityListener,
    );
    return;
  }

  if (typeof window.requestIdleCallback === "function") {
    backgroundIdleCallback = window.requestIdleCallback(
      loadNextPrototypeInBackground,
      { timeout: BACKGROUND_IDLE_TIMEOUT_MS },
    );
    return;
  }

  backgroundTimer = window.setTimeout(loadNextPrototypeInBackground, 0);
}

function scheduleBackgroundStep(delay: number) {
  backgroundTimer = window.setTimeout(() => {
    backgroundTimer = undefined;
    runBackgroundStepWhenVisible();
  }, delay);
}

function startBackgroundScheduler() {
  if (
    backgroundSchedulerStarted ||
    backgroundLoaders.size !== backgroundLoadOrder.length ||
    prefersConservativeLoading()
  ) {
    return;
  }

  backgroundSchedulerStarted = true;

  const start = () => {
    backgroundLoadListener = undefined;
    scheduleBackgroundStep(BACKGROUND_START_DELAY_MS);
  };

  if (document.readyState === "complete") {
    start();
    return;
  }

  backgroundLoadListener = start;
  window.addEventListener("load", start, { once: true });
}

function registerBackgroundLoader(
  prototype: PlaygroundPrototypeId,
  loader: BackgroundLoader,
) {
  backgroundLoaders.set(prototype, loader);
  startBackgroundScheduler();

  return () => {
    if (backgroundLoaders.get(prototype) === loader) {
      backgroundLoaders.delete(prototype);
    }

    if (backgroundLoaders.size === 0) {
      clearBackgroundScheduler();
    }
  };
}

function PreviewImage({
  className = "",
  height,
  src,
  width,
}: {
  className?: string;
  height: number;
  src: string;
  width: number;
}) {
  return (
    <img
      className={className}
      src={withBasePath(src)}
      alt=""
      aria-hidden="true"
      width={width}
      height={height}
      loading="lazy"
      fetchPriority="low"
      decoding="async"
      draggable={false}
    />
  );
}

function PhonePreview({ recap = false }: { recap?: boolean }) {
  return (
    <span className={styles.phonePreview} aria-hidden="true">
      <span className={styles.phonePreviewScreen}>
        {recap ? (
          <PreviewImage
            className={styles.phonePreviewRecap}
            src="/media/covers/reddit-recap-1.jpg"
            width={716}
            height={404}
          />
        ) : (
          <PreviewImage
            className={styles.phonePreviewLogo}
            src="/brand-logos/reddit.png"
            width={128}
            height={128}
          />
        )}
      </span>
      <span className={styles.phonePreviewNotch} />
    </span>
  );
}

function PrototypePreviewArtwork({
  prototype,
}: {
  prototype: PlaygroundPrototypeId;
}) {
  switch (prototype) {
    case "shape-typer":
      return (
        <PreviewImage
          className={styles.previewPoster}
          src="/media/covers/make-with-notion-2025.jpg"
          width={720}
          height={404}
        />
      );
    case "shape-playground":
      return (
        <span className={styles.shapePreview} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </span>
      );
    case "noodling":
      return <span className={styles.noodlingPreview} aria-hidden="true" />;
    case "nosey-ai":
      return (
        <PreviewImage
          className={styles.noseyPreview}
          src="/media/nosey-assistant-static.png"
          width={84}
          height={84}
        />
      );
    case "loaders":
      return (
        <span className={styles.loaderPreview} aria-hidden="true">
          <span />
          <span />
        </span>
      );
    case "reddit-icons":
      return (
        <span className={styles.redditIconsPreview} aria-hidden="true">
          <PreviewImage
            src="/reddit-icons/nav/home-idle.png"
            width={380}
            height={380}
          />
          <PreviewImage
            src="/reddit-icons/nav/communities-idle.png"
            width={380}
            height={380}
          />
          <PreviewImage
            src="/reddit-icons/nav/chat-idle.png"
            width={380}
            height={380}
          />
          <PreviewImage
            src="/reddit-icons/nav/inbox-idle.png"
            width={380}
            height={380}
          />
        </span>
      );
    case "rplace":
      return (
        <span className={styles.rplacePreview} aria-hidden="true">
          <PreviewImage
            src="/rplace/question-mark.svg"
            width={800}
            height={800}
          />
        </span>
      );
    case "upvote-lab":
      return (
        <PreviewImage
          className={styles.upvotePreview}
          src="/upvote-lab/reddit-upvote-dark.svg"
          width={512}
          height={512}
        />
      );
    case "reddit-seamless":
      return <PhonePreview />;
    case "reddit-recap":
      return <PhonePreview recap />;
  }
}

function PrototypePreview({
  activate,
  prototype,
}: {
  activate: () => void;
  prototype: PlaygroundPrototypeId;
}) {
  const artwork = <PrototypePreviewArtwork prototype={prototype} />;

  if (loadModes[prototype] === "interaction") {
    return (
      <button
        type="button"
        className={`${styles.prototypePreview} ${styles.prototypePreviewButton}`}
        aria-label={`Load ${prototypeLabels[prototype]} prototype`}
        onClick={activate}
      >
        {artwork}
      </button>
    );
  }

  return (
    <div className={styles.prototypePreview} aria-hidden="true">
      {artwork}
    </div>
  );
}

export function PlaygroundPrototypeIsland({
  prototype,
}: {
  prototype: PlaygroundPrototypeId;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const shouldLoadRef = useRef(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const load = useCallback(() => {
    shouldLoadRef.current = true;
    setShouldLoad(true);
  }, []);

  useEffect(
    () =>
      registerBackgroundLoader(prototype, {
        isLoaded: () => shouldLoadRef.current,
        load,
      }),
    [load, prototype],
  );

  useEffect(() => {
    if (shouldLoad) return;

    if (loadModes[prototype] === "interaction") return;

    // On constrained devices, loading a prototype can mean megabytes of
    // fonts, video, canvas code, or Rive. Keep the lightweight shell until the
    // visitor deliberately interacts with it.
    if (prefersConservativeLoading()) return;

    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") {
      load();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        load();
        observer.disconnect();
      },
      {
        rootMargin: "0px",
        threshold: 0.01,
      },
    );

    observer.observe(root);
    return () => observer.disconnect();
  }, [load, prototype, shouldLoad]);

  const Prototype = prototypes[prototype];

  return (
    <div
      ref={rootRef}
      className={styles.prototypeIsland}
      data-prototype-island={prototype}
      data-prototype-loaded={shouldLoad ? "true" : "false"}
      data-prototype-load-mode={loadModes[prototype]}
    >
      {shouldLoad ? (
        <Suspense
          fallback={<PrototypePreview activate={load} prototype={prototype} />}
        >
          <Prototype />
        </Suspense>
      ) : (
        <PrototypePreview activate={load} prototype={prototype} />
      )}
    </div>
  );
}
