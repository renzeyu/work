"use client";

/* eslint-disable @next/next/no-img-element */

import { Plus } from "@phosphor-icons/react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { withBasePath } from "../lib/base-path";
import styles from "./RedditIconPrototype.module.css";

const actionDuration = 1040;
const screenAssetVersion = "webp-q95-20260827";

const tabs = [
  { id: "home", label: "Home" },
  { id: "communities", label: "Communities" },
  { id: "chat", label: "Chat" },
  { id: "inbox", label: "Inbox" },
] as const;

type TabId = (typeof tabs)[number]["id"];

type AnimationRun = {
  id: number;
  tab: TabId;
};

type RedditIconPrototypeProps = {
  variant?: "page" | "playground";
};

function assetUrl(path: string) {
  return withBasePath(`/reddit-icons/${path}`);
}

function screenAssetUrl(tab: TabId, extension: "png" | "webp") {
  return `${assetUrl(`screens/${tab}.${extension}`)}?v=${screenAssetVersion}`;
}

export function RedditIconPrototype({
  variant = "page",
}: RedditIconPrototypeProps) {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [animationRun, setAnimationRun] = useState<AnimationRun | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const runId = useRef(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduceMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (!animationRun) return;

    const currentRun = animationRun.id;
    const timeout = window.setTimeout(() => {
      setAnimationRun((run) => (run?.id === currentRun ? null : run));
    }, actionDuration);

    return () => window.clearTimeout(timeout);
  }, [animationRun]);

  function selectTab(tab: TabId) {
    setActiveTab(tab);

    if (reduceMotion) {
      setAnimationRun(null);
      return;
    }

    runId.current += 1;
    setAnimationRun({ id: runId.current, tab });
  }

  const activeLabel = tabs.find((tab) => tab.id === activeTab)?.label ?? "Home";
  const titleId =
    variant === "playground"
      ? "reddit-icons-embedded-title"
      : "reddit-icons-title";
  const instructionsId =
    variant === "playground"
      ? "reddit-icons-embedded-instructions"
      : "reddit-icons-instructions";
  const Heading = variant === "playground" ? "h3" : "h1";
  const navMaskStyle = {
    "--nav-screen-mask": `url("${assetUrl("nav/screen-mask.svg")}")`,
  } as CSSProperties;

  return (
    <section
      className={`${styles.prototypePage} ${
        variant === "playground" ? styles.playgroundVariant : ""
      }`}
      data-reddit-icons
      data-variant={variant}
      aria-labelledby={titleId}
    >
      <Heading id={titleId} className="sr-only">
        Reddit bottom navigation icon animations
      </Heading>
      <p id={instructionsId} className="sr-only">
        Select Home, Communities, Chat, or Inbox to replay its icon animation.
      </p>

      <div
        className={styles.device}
        role="group"
        aria-label="Interactive Reddit mobile app prototype"
        aria-describedby={instructionsId}
      >
        <div className={styles.screenStack} aria-hidden="true">
          <picture>
            <source
              srcSet={screenAssetUrl(activeTab, "webp")}
              type="image/webp"
            />
            <img
              className={`${styles.screen} ${styles.screenActive}`}
              src={screenAssetUrl(activeTab, "png")}
              alt=""
              width="934"
              height="1856"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </picture>
        </div>

        <nav
          className={styles.bottomNav}
          style={navMaskStyle}
          aria-label="Reddit app sections"
        >
          {tabs.slice(0, 2).map((tab) => (
            <NavButton
              key={tab.id}
              tab={tab}
              activeTab={activeTab}
              animationRun={animationRun}
              onSelect={selectTab}
            />
          ))}

          <button
            className={`${styles.navButton} ${styles.createButton}`}
            type="button"
            disabled
            aria-label="Create"
          >
            <Plus className={styles.createIcon} aria-hidden="true" weight="regular" />
            <span className={styles.navLabel}>Create</span>
          </button>

          {tabs.slice(2).map((tab) => (
            <NavButton
              key={tab.id}
              tab={tab}
              activeTab={activeTab}
              animationRun={animationRun}
              onSelect={selectTab}
            />
          ))}
        </nav>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {activeLabel} selected
        </p>
      </div>
    </section>
  );
}

function NavButton({
  tab,
  activeTab,
  animationRun,
  onSelect,
}: {
  tab: (typeof tabs)[number];
  activeTab: TabId;
  animationRun: AnimationRun | null;
  onSelect: (tab: TabId) => void;
}) {
  const selected = activeTab === tab.id;
  const running = animationRun?.tab === tab.id;
  const restingState = selected ? "active" : "idle";

  return (
    <button
      className={`${styles.navButton} ${selected ? styles.navButtonActive : ""}`}
      type="button"
      aria-pressed={selected}
      aria-label={tab.label}
      onClick={() => onSelect(tab.id)}
    >
      <span className={styles.iconSlot} aria-hidden="true">
        <img
          className={styles.navIcon}
          src={assetUrl(`nav/${tab.id}-${restingState}.png`)}
          alt=""
          width="380"
          height="380"
          draggable="false"
          decoding="sync"
        />
        {running ? (
          <img
            key={`${tab.id}-action-${animationRun.id}`}
            className={`${styles.navIcon} ${styles.navIconAction}`}
            src={assetUrl(
              `nav/${tab.id}-action.png?play=${animationRun.id}`,
            )}
            alt=""
            width="380"
            height="380"
            draggable="false"
            decoding="sync"
          />
        ) : null}
      </span>
      <span className={styles.navLabel}>{tab.label}</span>
    </button>
  );
}
