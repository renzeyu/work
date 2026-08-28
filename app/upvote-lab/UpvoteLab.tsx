"use client";

/* eslint-disable @next/next/no-img-element */

import {
  ArrowCounterClockwise,
  Check,
  Minus,
  Play,
  Plus,
  Shuffle,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { withBasePath } from "../lib/base-path";
import {
  CodeVoteMotion,
  type CodeVoteMotionKind,
  VoteMotionThumbnail,
} from "./CodeVoteMotion";
import {
  DOWNVOTE_COLOR,
  UPVOTE_ARROW_COLOR,
  UPVOTE_COUNTER_COLOR,
} from "./voteColors";
import styles from "./UpvoteLab.module.css";
import { TRACED_UPVOTE_PATH } from "./votePaths";

const baseScore = 256;

const commentIconPath =
  "M10 1a9 9 0 0 0-9 9c0 1.947.79 3.58 1.935 4.957L.231 17.661A.784.784 0 0 0 .785 19H10a9 9 0 0 0 9-9 9 9 0 0 0-9-9Zm0 16.2H6.162c-.994.004-1.907.053-3.045.144l-.076-.188a36.981 36.981 0 0 0 2.328-2.087l-1.05-1.263C3.297 12.576 2.8 11.331 2.8 10c0-3.97 3.23-7.2 7.2-7.2s7.2 3.23 7.2 7.2-3.23 7.2-7.2 7.2Z";

const shareIconPath =
  "m12.8 17.524 6.89-6.887a.9.9 0 0 0 0-1.273L12.8 2.477a1.64 1.64 0 0 0-1.782-.349 1.64 1.64 0 0 0-1.014 1.518v2.593C4.054 6.728 1.192 12.075 1 17.376a1.353 1.353 0 0 0 .862 1.32 1.35 1.35 0 0 0 1.531-.364l.334-.381c1.705-1.944 3.323-3.791 6.277-4.103v2.509c0 .667.398 1.262 1.014 1.518a1.638 1.638 0 0 0 1.783-.349v-.002Zm-.994-1.548V12h-.9c-3.969 0-6.162 2.1-8.001 4.161.514-4.011 2.823-8.16 8-8.16h.9V4.024L17.784 10l-5.977 5.976Z";

const studies = [
  {
    id: "lift",
    name: "Default",
    description: "Large vertical travel",
  },
  {
    id: "clean",
    name: "Clean",
    description: "Fast vertical pop",
  },
  {
    id: "spring",
    name: "Spring",
    description: "Rise, overshoot, settle",
  },
  {
    id: "burst",
    name: "Burst",
    description: "Particle celebration",
  },
  {
    id: "ripple",
    name: "Ripple",
    description: "Expanding response ring",
  },
  {
    id: "soft",
    name: "Soft pop",
    description: "Stretch and settle",
  },
  {
    id: "quick-burst",
    name: "Quick burst",
    description: "Nine-point radial release",
  },
] as const;

const randomOption = {
  id: "random",
  name: "Random",
  description: "Cycles through every motion",
} as const;

const motionMenuOptions = [randomOption, ...studies] as const;

const presenceAssets = [
  "/reddit-seamless/couple.jpg",
  "/reddit-seamless/kitten-poster.jpg",
  "/reddit-seamless/dog-wind-poster.jpg",
  "/reddit-seamless/tickets.jpg",
] as const;

type Study = (typeof studies)[number];
type StudyId = Study["id"];
type MotionSelectionId = (typeof motionMenuOptions)[number]["id"];
type VoteDirection = "up" | "down";
type VoteState = VoteDirection | "neutral";

const VOTE_ARROW_COLORS = {
  up: UPVOTE_ARROW_COLOR,
  down: DOWNVOTE_COLOR,
} as const satisfies Record<VoteDirection, string>;

const VOTE_COUNTER_COLORS = {
  up: UPVOTE_COUNTER_COLOR,
  down: DOWNVOTE_COLOR,
} as const satisfies Record<VoteDirection, string>;

type MotionRun = {
  direction: VoteDirection;
  id: number;
  kind: CodeVoteMotionKind;
  studyId?: StudyId;
};

type UpvoteLabProps = {
  variant?: "page" | "playground";
};

function assetUrl(file: string) {
  return withBasePath(`/upvote-lab/${file}`);
}

function voteScore(state: VoteState) {
  if (state === "up") return baseScore + 1;
  if (state === "down") return baseScore - 1;
  return baseScore;
}

function formatScore(value: number) {
  return String(value);
}

function nextVoteState(current: VoteState, direction: VoteDirection): VoteState {
  return current === direction ? "neutral" : direction;
}

function stateLabel(state: VoteState) {
  if (state === "up") return "Upvoted";
  if (state === "down") return "Downvoted";
  return "Neutral";
}

function studyFromId(studyId: StudyId): Study {
  return studies.find((study) => study.id === studyId) ?? studies[0];
}

function nextCycledStudy(currentStudyId: StudyId): Study {
  const currentIndex = studies.findIndex((study) => study.id === currentStudyId);
  return studies[(currentIndex + 1) % studies.length];
}

function TracedVoteArrow({
  className,
  direction = "up",
  outline = false,
}: {
  className?: string;
  direction?: VoteDirection;
  outline?: boolean;
}) {
  if (outline) {
    return (
      <img
        alt=""
        aria-hidden="true"
        className={className}
        data-direction={direction}
        data-official-outline
        draggable={false}
        src={assetUrl("reddit-upvote-dark.svg")}
      />
    );
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      data-direction={direction}
      focusable="false"
      viewBox="0 0 144 152"
    >
      <path d={TRACED_UPVOTE_PATH} fill="currentColor" />
    </svg>
  );
}

function ReferenceActionIcon({
  className,
  path,
}: {
  className?: string;
  path: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 20 20"
    >
      <path d={path} fill="currentColor" />
    </svg>
  );
}

function RollingNumber({
  className,
  direction,
  reduceMotion,
  value,
}: {
  className?: string;
  direction: -1 | 1;
  reduceMotion: boolean;
  value: number | string;
}) {
  return (
    <span className={`${styles.rollingNumber} ${className ?? ""}`} aria-hidden="true">
      {String(value)
        .split("")
        .map((digit, index) => (
          <span className={styles.digitWindow} data-character={digit} key={index}>
            <AnimatePresence initial={false}>
              <motion.span
                className={styles.digit}
                key={`${index}-${digit}`}
                initial={
                  reduceMotion
                    ? false
                    : { opacity: 0, y: direction > 0 ? "105%" : "-105%" }
                }
                animate={{ opacity: 1, y: "0%" }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: direction > 0 ? "-105%" : "105%" }
                }
                transition={{
                  duration: reduceMotion ? 0 : 0.34,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {digit}
              </motion.span>
            </AnimatePresence>
          </span>
        ))}
    </span>
  );
}

function VoteGlyph({
  active,
  direction,
  onMotionComplete,
  motionRun,
  reduceMotion,
}: {
  active: boolean;
  direction: VoteDirection;
  onMotionComplete: (id: number) => void;
  motionRun: MotionRun | null;
  reduceMotion: boolean;
}) {
  const running = !reduceMotion && motionRun?.direction === direction;

  return (
    <span
      className={styles.voteGlyph}
      data-direction={direction}
      data-playing={running || undefined}
    >
      <span
        className={styles.voteStatic}
        data-active={active || undefined}
        data-direction={direction}
        style={active ? { color: VOTE_ARROW_COLORS[direction] } : undefined}
      >
        <TracedVoteArrow
          className={styles.tracedVoteArrow}
          direction={direction}
          outline={!active}
        />
      </span>

      {running ? (
        <CodeVoteMotion
          key={`${direction}-${motionRun.id}`}
          kind={motionRun.kind}
          onComplete={() => onMotionComplete(motionRun.id)}
        />
      ) : null}
    </span>
  );
}

function PresenceRail({
  count,
  direction,
  reduceMotion,
  step,
}: {
  count: number;
  direction: -1 | 1;
  reduceMotion: boolean;
  step: number;
}) {
  const visibleAssets = useMemo(() => {
    const start = ((step % presenceAssets.length) + presenceAssets.length) % presenceAssets.length;
    return Array.from(
      { length: 3 },
      (_, index) => presenceAssets[(start + index) % presenceAssets.length],
    );
  }, [step]);
  const expanded = step !== 0;

  return (
    <div
      className={styles.presenceRail}
      aria-label={`${count} people here now`}
      data-expanded={expanded || undefined}
    >
      {expanded ? (
        <span className={styles.avatarStack} aria-hidden="true">
          <AnimatePresence initial={!reduceMotion} mode="popLayout">
            {visibleAssets.map((source, index) => (
              <motion.img
                className={styles.presenceAvatar}
                key={source}
                layout={!reduceMotion}
                src={withBasePath(source)}
                alt=""
                initial={
                  reduceMotion
                    ? false
                    : { opacity: 0, x: direction > 0 ? 18 : -18 }
                }
                animate={{ opacity: 1, x: 0 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, x: direction > 0 ? -18 : 18 }
                }
                transition={{
                  delay: reduceMotion ? 0 : index * 0.07,
                  duration: reduceMotion ? 0 : 0.32,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            ))}
          </AnimatePresence>
        </span>
      ) : (
        <span className={styles.presenceDot} aria-hidden="true" />
      )}
      <span className={styles.presenceBadge} data-expanded={expanded || undefined}>
        <RollingNumber
          value={count}
          direction={direction}
          reduceMotion={reduceMotion}
        />
      </span>
      <span className={styles.presenceLabel}>{expanded ? "•••" : "here now"}</span>
    </div>
  );
}

export function UpvoteLab({ variant = "page" }: UpvoteLabProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const embedded = variant === "playground";
  const motionMenuId = useId();
  const [voteState, setVoteState] = useState<VoteState>("neutral");
  const [score, setScore] = useState(baseScore);
  const [scoreDirection, setScoreDirection] = useState<-1 | 1>(1);
  const [studyId, setStudyId] = useState<StudyId>("lift");
  const [motionSelection, setMotionSelection] =
    useState<MotionSelectionId>("random");
  const [motionRun, setMotionRun] = useState<MotionRun | null>(null);
  const [motionMenuOpen, setMotionMenuOpen] = useState(false);
  const [presenceCount, setPresenceCount] = useState(12);
  const [presenceDirection, setPresenceDirection] = useState<-1 | 1>(1);
  const [presenceStep, setPresenceStep] = useState(0);
  const [announcement, setAnnouncement] = useState("Neutral. 256 upvotes.");
  const runId = useRef(1);
  const motionMenuRef = useRef<HTMLDivElement>(null);
  const motionMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const motionMenuItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const cycleStudyIdRef = useRef<StudyId>("lift");

  const selectedStudy = studyFromId(studyId);
  const replayLabel =
    motionSelection === "random"
      ? `Replay current Random motion: ${selectedStudy.name}`
      : `Replay ${selectedStudy.name} motion`;

  const triggerMotion = useCallback(
    (direction: VoteDirection, activated: boolean, study: Study) => {
      if (!activated || reduceMotion) {
        setMotionRun(null);
        return;
      }

      runId.current += 1;
      const run: MotionRun = {
        direction,
        id: runId.current,
        kind: direction === "up" ? study.id : "down",
        ...(direction === "up" ? { studyId: study.id } : {}),
      };
      setMotionRun(run);
    },
    [reduceMotion],
  );

  const handleMotionComplete = useCallback((id: number) => {
    window.requestAnimationFrame(() => {
      setMotionRun((run) => (run?.id === id ? null : run));
    });
  }, []);

  const handleVote = useCallback(
    (direction: VoteDirection) => {
      const nextState = nextVoteState(voteState, direction);
      const nextScore = voteScore(nextState);
      const nextDirection = nextScore >= score ? 1 : -1;
      const shouldAdvanceCycle =
        direction === "up" &&
        nextState === "up" &&
        motionSelection === "random";
      const motionStudy = shouldAdvanceCycle
        ? nextCycledStudy(cycleStudyIdRef.current)
        : selectedStudy;

      setVoteState(nextState);
      setScore(nextScore);
      setScoreDirection(nextDirection);
      if (shouldAdvanceCycle) {
        cycleStudyIdRef.current = motionStudy.id;
        setStudyId(motionStudy.id);
      }
      triggerMotion(direction, nextState === direction, motionStudy);
      setAnnouncement(
        `${stateLabel(nextState)}. ${formatScore(nextScore)} upvotes.${
          shouldAdvanceCycle ? ` Random cycle: ${motionStudy.name}.` : ""
        }`,
      );
    },
    [motionSelection, score, selectedStudy, triggerMotion, voteState],
  );

  useEffect(() => {
    if (embedded) return;

    function handleKeyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.matches("button, input, select, textarea, a")) return;
      if (event.key === "ArrowUp") {
        event.preventDefault();
        handleVote("up");
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        handleVote("down");
      }
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [embedded, handleVote]);

  useEffect(() => {
    if (!motionMenuOpen) return;

    const selectedIndex = motionMenuOptions.findIndex(
      (option) => option.id === motionSelection,
    );
    const focusFrame = window.requestAnimationFrame(() => {
      motionMenuItemRefs.current[selectedIndex]?.focus();
    });

    function handleOutsidePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        motionMenuRef.current?.contains(target) ||
        motionMenuTriggerRef.current?.contains(target)
      ) {
        return;
      }
      setMotionMenuOpen(false);
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown, true);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
    };
  }, [motionMenuOpen, motionSelection]);

  function selectMotion(nextSelection: MotionSelectionId) {
    setMotionSelection(nextSelection);
    setMotionMenuOpen(false);
    if (nextSelection === "random") {
      cycleStudyIdRef.current = "lift";
      setStudyId("lift");
      setAnnouncement("Random motion selected. Starting with Default.");
    } else {
      setStudyId(nextSelection);
      const study =
        studies.find((item) => item.id === nextSelection) ?? studies[0];
      setAnnouncement(`${study.name} motion selected.`);
    }
    window.requestAnimationFrame(() => motionMenuTriggerRef.current?.focus());
  }

  function replaySelectedMotion() {
    const replayStudy =
      motionSelection === "random"
        ? studyFromId(cycleStudyIdRef.current)
        : selectedStudy;
    triggerMotion("up", true, replayStudy);
    setAnnouncement(`${replayStudy.name} motion replayed.`);
  }

  function resetPrototype() {
    setVoteState("neutral");
    setScore(baseScore);
    setScoreDirection(1);
    setMotionRun(null);
    setMotionMenuOpen(false);
    cycleStudyIdRef.current = "lift";
    setMotionSelection("random");
    setStudyId("lift");
    setPresenceCount(12);
    setPresenceDirection(1);
    setPresenceStep(0);
    setAnnouncement("Prototype reset. Neutral. 256 upvotes.");
  }

  function simulatePresence(delta: -1 | 1) {
    if (delta < 0 && presenceCount <= 1) return;
    setPresenceDirection(delta);
    setPresenceCount((count) => Math.max(1, count + delta));
    setPresenceStep((step) => step + delta);
  }

  function handleMotionMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setMotionMenuOpen(false);
      motionMenuTriggerRef.current?.focus();
      return;
    }

    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();

    const items = motionMenuItemRefs.current.filter(
      (item): item is HTMLButtonElement => Boolean(item),
    );
    if (!items.length) return;

    const currentIndex = items.findIndex((item) => item === document.activeElement);
    let nextIndex = currentIndex;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;
    if (event.key === "ArrowDown") nextIndex = (currentIndex + 1 + items.length) % items.length;
    if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  }

  const Root = embedded ? "div" : "section";

  return (
    <Root
      className={`${styles.prototype} ${
        embedded ? styles.playgroundVariant : "reddit-prototype-page"
      }`}
      aria-labelledby={embedded ? undefined : "vote-lab-title"}
      data-upvote-lab
      data-variant={variant}
      data-motion-selection={motionSelection}
      data-active-study={selectedStudy.id}
    >
      {!embedded ? (
        <h1 id="vote-lab-title" className="sr-only">
          Vote motion lab
        </h1>
      ) : null}

      <div className={styles.snippet}>
        <article className={styles.postCard} aria-label="Interactive Arctic puffins post preview">
          <div className={styles.referenceCanvas}>
            <img
              className={styles.referenceCardFrame}
              src={assetUrl("post-v2-still.png")}
              alt="Post by stoise titled Finally saw Arctic Puffins in Látrabjarg, Iceland"
              width="1661"
              height="1661"
              draggable="false"
            />

            <img
              className={styles.referenceAuthorAvatar}
              src={assetUrl("stoise-avatar.png")}
              alt=""
              aria-hidden="true"
              width="256"
              height="256"
              draggable="false"
            />

            <button
              ref={motionMenuTriggerRef}
              className={styles.motionMenuTrigger}
              type="button"
              aria-haspopup="menu"
              aria-expanded={motionMenuOpen}
              aria-controls={motionMenuId}
              aria-label={`Choose vote motion. Current selection: ${
                motionSelection === "random"
                  ? `Random. Current behavior: ${selectedStudy.name}`
                  : selectedStudy.name
              }`}
              onClick={() => setMotionMenuOpen((open) => !open)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
                event.preventDefault();
                setMotionMenuOpen(true);
              }}
            >
              <span className={styles.motionMenuDots} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </button>

            <div
              ref={motionMenuRef}
              id={motionMenuId}
              className={styles.motionMenu}
              role="menu"
              aria-label="Vote motion behavior"
              tabIndex={-1}
              hidden={!motionMenuOpen}
              onKeyDown={handleMotionMenuKeyDown}
              onBlur={(event) => {
                const nextTarget = event.relatedTarget;
                if (
                  nextTarget instanceof Node &&
                  (event.currentTarget.contains(nextTarget) ||
                    motionMenuTriggerRef.current?.contains(nextTarget))
                ) {
                  return;
                }
                setMotionMenuOpen(false);
              }}
            >
              <div className={styles.motionMenuHeading}>
                <strong>Motion behavior</strong>
                <span>{motionMenuOptions.length} options</span>
              </div>
              <div className={styles.motionMenuList}>
                {motionMenuOptions.map((option, index) => {
                  const selected = option.id === motionSelection;
                  const random = option.id === "random";
                  return (
                    <button
                      ref={(node) => {
                        motionMenuItemRefs.current[index] = node;
                      }}
                      className={styles.motionMenuItem}
                      data-selected={selected || undefined}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      tabIndex={selected ? 0 : -1}
                      key={option.id}
                      onClick={() => selectMotion(option.id)}
                    >
                      <span className={styles.motionMenuThumbnail} aria-hidden="true">
                        {random ? (
                          <Shuffle
                            className={styles.motionMenuRandomIcon}
                            weight="bold"
                          />
                        ) : (
                          <VoteMotionThumbnail
                            className={styles.motionMenuThumbnailPreview}
                            kind={option.id}
                          />
                        )}
                      </span>
                      <span className={styles.motionMenuCopy}>
                        <strong>{option.name}</strong>
                        <small>
                          {random && selected
                            ? `Current: ${selectedStudy.name}`
                            : option.description}
                        </small>
                      </span>
                      {selected ? (
                        <Check
                          className={styles.motionMenuCheck}
                          aria-hidden="true"
                          weight="bold"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.referenceActionMask} aria-hidden="true" />

            <div className={styles.referenceActionBar}>
              <div className={styles.referenceVotePill}>
                <span className={styles.referenceVoteDivider} aria-hidden="true" />
                <output
                  className={styles.referenceScore}
                  data-state={voteState}
                  style={
                    voteState === "neutral"
                      ? undefined
                      : { color: VOTE_COUNTER_COLORS[voteState] }
                  }
                  aria-label={`${formatScore(score)} upvotes`}
                >
                  <RollingNumber
                    className={styles.referenceScoreNumber}
                    value={formatScore(score)}
                    direction={scoreDirection}
                    reduceMotion={reduceMotion}
                  />
                </output>
              </div>

              <div className={styles.referenceCommentPill} aria-hidden="true">
                <ReferenceActionIcon
                  className={styles.referenceCommentIcon}
                  path={commentIconPath}
                />
                <span>114 Comments</span>
              </div>

              <div className={styles.referenceSharePill} aria-hidden="true">
                <ReferenceActionIcon
                  className={styles.referenceShareIcon}
                  path={shareIconPath}
                />
              </div>
            </div>

            <div className={styles.referenceVoteControls} role="group" aria-label="Vote on this post">
              <button
                className={`${styles.voteButton} ${styles.referenceVoteButton}`}
                data-direction="up"
                type="button"
                aria-label="Upvote"
                aria-pressed={voteState === "up"}
                onPointerDown={(event) => {
                  if (event.isPrimary && event.button === 0) handleVote("up");
                }}
                onClick={(event) => {
                  if (event.detail === 0) handleVote("up");
                }}
              >
                <VoteGlyph
                  active={voteState === "up"}
                  direction="up"
                  onMotionComplete={handleMotionComplete}
                  motionRun={motionRun}
                  reduceMotion={reduceMotion}
                />
              </button>
              <button
                className={`${styles.voteButton} ${styles.referenceVoteButton}`}
                data-direction="down"
                type="button"
                aria-label="Downvote"
                aria-pressed={voteState === "down"}
                onPointerDown={(event) => {
                  if (event.isPrimary && event.button === 0) handleVote("down");
                }}
                onClick={(event) => {
                  if (event.detail === 0) handleVote("down");
                }}
              >
                <VoteGlyph
                  active={voteState === "down"}
                  direction="down"
                  onMotionComplete={handleMotionComplete}
                  motionRun={motionRun}
                  reduceMotion={reduceMotion}
                />
              </button>
            </div>
          </div>
        </article>

        {!embedded ? (
          <div className={styles.snippetControls} role="group" aria-label="Prototype controls">
            <div className={styles.presenceControlGroup}>
              <div className={styles.snippetPresence}>
                <PresenceRail
                  count={presenceCount}
                  direction={presenceDirection}
                  reduceMotion={reduceMotion}
                  step={presenceStep}
                />
              </div>
              <button
                className={styles.utilityButton}
                type="button"
                aria-label="One person leaves"
                title="One person leaves"
                disabled={presenceCount <= 1}
                onClick={() => simulatePresence(-1)}
              >
                <Minus aria-hidden="true" />
              </button>
              <button
                className={styles.utilityButton}
                type="button"
                aria-label="One person joins"
                title="One person joins"
                onClick={() => simulatePresence(1)}
              >
                <Plus aria-hidden="true" />
              </button>
            </div>

            <div className={styles.snippetActions}>
              <button
                className={styles.utilityButton}
                type="button"
                aria-label={replayLabel}
                title={replayLabel}
                onClick={replaySelectedMotion}
              >
                <Play aria-hidden="true" weight="fill" />
              </button>
              <button
                className={styles.utilityButton}
                type="button"
                aria-label="Reset prototype"
                title="Reset prototype"
                onClick={resetPrototype}
              >
                <ArrowCounterClockwise aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </Root>
  );
}
