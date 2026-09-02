"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { NotionNoodleGlyph } from "./NotionNoodleGlyph";
import {
  DEFAULT_NOTION_RECRUITER_FLOW_ID,
  NOTION_CHAT_STAGES,
  NOTION_RECRUITER_FLOWS,
  createNotionResponseModel,
  flattenNotionResponse,
  getNotionActivity,
  getNotionRecruiterFlow,
  getNotionRecruiterFlowById,
} from "./notionChatSequence.mjs";
import styles from "./NotionChatDemo.module.css";

type StageId =
  | "plan"
  | "searching"
  | "found-results"
  | "searching-web"
  | "searched-web"
  | "updating-todos"
  | "updated-todos"
  | "todo-ready"
  | "todo-1"
  | "todo-2"
  | "todo-3"
  | "answering";

type ChatPhase = "idle" | "running" | "answering" | "done";
type Feedback = "good" | "bad" | null;
type PromptIcon = "overview" | "ownership" | "impact" | "collaboration";
type RecruiterFlowId = "overview" | "ownership" | "impact" | "collaboration";

type ActivityRow = {
  label: string;
  state: "live" | "done";
  hasPageBadge: boolean;
};

type ActivityView = {
  summary: string;
  rows: readonly ActivityRow[];
  showChecklist: boolean;
  checklistProgress: number;
};

type ResponseSection = {
  title: string;
  items: readonly string[];
};

type RecruiterResponse = {
  intro: string;
  sections: readonly ResponseSection[];
  closing: string;
};

type RecruiterFlow = {
  id: RecruiterFlowId;
  label: string;
  icon: PromptIcon;
  planSummary: string;
  planChunks: readonly string[];
  searchSummary: string;
  checklist: readonly string[];
  response: RecruiterResponse;
};

type ResponseModel = ReturnType<typeof createNotionResponseModel>;

const START_PROMPTS = NOTION_RECRUITER_FLOWS as readonly RecruiterFlow[];
const PREFACE_DWELLS_MS = [1_130, 34, 33, 33, 300, 34] as const;
const RESPONSE_INTERVAL_PATTERN = [200, 250, 200, 300, 200] as const;

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return reducedMotion;
}

function StartPromptIcon({ name }: { name: PromptIcon }) {
  if (name === "overview") {
    return (
      <span className={styles.promptIcon} aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="3.25" />
          <path d="M5.5 20c.65-4.35 3-6.5 6.5-6.5s5.85 2.15 6.5 6.5" />
        </svg>
      </span>
    );
  }

  if (name === "ownership") {
    return (
      <span className={styles.promptIcon} aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3 12.2c2.85 1.55 5.85 2.3 9 2.3s6.15-.75 9-2.3" />
          <path d="M10 13.5h4" />
        </svg>
      </span>
    );
  }

  if (name === "impact") {
    return (
      <span className={styles.promptIcon} aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M4 4.5V20h16" />
          <path d="m7 16 4-4 3 2.25L20 7" />
          <path d="m16.75 7 3.25-.1-.1 3.25" />
        </svg>
      </span>
    );
  }

  return (
    <span className={styles.promptIcon} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <circle cx="8.25" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M2.75 20c.55-4 2.4-6 5.5-6s4.95 2 5.5 6M14 14.5c3.65-.8 6.1 1 6.75 4.5" />
      </svg>
    </span>
  );
}

function NotionPageBadge() {
  return (
    <svg
      className={styles.pageBadge}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M6.017 4.313l55.333-4.087c6.797-.583 8.543-.19 12.817 2.917L91.83 15.586c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277-1.553 6.807-6.99 7.193l-64.256 3.891c-4.08.193-6.023-.39-8.16-3.113L3.3 79.94C.967 76.827 0 74.497 0 71.773v-60.66c0-3.497 1.553-6.413 6.017-6.8z"
        fill="#fff"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M61.35.227 6.017 4.314C1.553 4.7 0 7.617 0 11.113v60.66c0 2.723.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257-3.89c5.433-.387 6.99-2.917 6.99-7.193V20.64c0-2.21-.873-2.847-3.443-4.733L74.167 3.143C69.894.036 68.147-.357 61.35.227ZM25.92 19.523c-5.247.353-6.437.433-9.417-1.99l-7.576-6.026c-.77-.78-.383-1.753 1.557-1.947l53.193-3.887c4.467-.39 6.793 1.167 8.54 2.527l9.123 6.61c.39.197 1.36 1.36.193 1.36L26.6 19.477l-.68.047ZM19.803 88.3V30.367c0-2.53.777-3.697 3.103-3.893L86 22.78c2.14-.193 3.107 1.167 3.107 3.693V84.02c0 2.53-.39 4.67-3.883 4.863l-60.377 3.5c-3.493.193-5.043-.97-5.043-4.083Zm59.6-54.827c.387 1.75 0 3.5-1.75 3.7l-2.91.577v42.773c-2.527 1.36-4.853 2.137-6.797 2.137-3.107 0-3.883-.973-6.21-3.887l-19.03-29.94V77.8l6.02 1.363s0 3.5-4.857 3.5l-13.39.777c-.39-.78 0-2.723 1.357-3.11l3.497-.97v-38.3l-4.853-.393c-.39-1.75.58-4.277 3.3-4.473l14.367-.967 19.8 30.327v-26.83l-5.047-.58c-.39-2.143 1.163-3.7 3.103-3.89l13.4-.78Z"
        fill="#000"
      />
    </svg>
  );
}

function FeedbackIcon({ name }: { name: "copy" | "new" | "thumbs-up" | "thumbs-down" }) {
  const thumb = (
    <>
      <path d="M7 10v12" />
      <path d="M7 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" />
      <path d="M7 20.5h10.5a2 2 0 0 0 1.92-1.45l2.25-7.5A2 2 0 0 0 19.75 9H14l.85-3.4A3 3 0 0 0 13 2.1L12.5 2 7 10" />
    </>
  );

  return (
    <svg className={styles.feedbackIcon} viewBox="0 0 24 24" aria-hidden="true">
      {name === "copy" ? (
        <>
          <rect x="8" y="8" width="14" height="14" rx="2" />
          <path d="M16 8V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" />
        </>
      ) : null}
      {name === "new" ? <path d="M12 5v14M5 12h14" /> : null}
      {name === "thumbs-up" ? thumb : null}
      {name === "thumbs-down" ? <g transform="rotate(180 12 12)">{thumb}</g> : null}
    </svg>
  );
}

function BrewingStatus({ paused }: { paused: boolean }) {
  return (
    <div className={styles.brewing} role="status">
      <span className={styles.noodleSlot}>
        <NotionNoodleGlyph className={styles.noodleCanvas} paused={paused} />
      </span>
      <span className={styles.brewingCopy}>Brewing</span>
      <i className={styles.caretDown} aria-hidden="true" />
    </div>
  );
}

function StreamingResponse({
  flowId,
  response,
  responseModel,
  visibleWords,
}: {
  flowId: RecruiterFlowId;
  response: RecruiterResponse;
  responseModel: ResponseModel;
  visibleWords: number;
}) {
  const renderSegment = (id: string) => {
    const segment = responseModel.segmentOffsets.find((entry) => entry.id === id);
    const content = responseModel.segments.find((entry) => entry.id === id);
    if (!segment || !content) return null;
    return responseModel.arrivalRanges.flatMap((range) => {
      if (range.end > visibleWords || range.end <= segment.start || range.start >= segment.end) {
        return [];
      }
      const start = Math.max(range.start, segment.start) - segment.start;
      const end = Math.min(range.end, segment.end) - segment.start;
      return [
        <span
          className={styles.responseChunk}
          key={`${flowId}-${id}-${range.index}`}
        >
          {content.tokens.slice(start, end).join("")}
        </span>,
      ];
    });
  };

  const isVisible = (id: string) => {
    const segment = responseModel.segmentOffsets.find((entry) => entry.id === id);
    return Boolean(segment && visibleWords > segment.start);
  };

  return (
    <div className={styles.answer} aria-label="Notion AI response">
      {isVisible("intro") ? <p>{renderSegment("intro")}</p> : null}
      {response.sections.map((section, sectionIndex) =>
        isVisible(`section-${sectionIndex}-title`) ? (
          <section key={`${flowId}-${section.title}`}>
            <h3>{renderSegment(`section-${sectionIndex}-title`)}</h3>
            <ul>
              {section.items.map((item, itemIndex) =>
                isVisible(`section-${sectionIndex}-item-${itemIndex}`) ? (
                  <li key={`${flowId}-${item}`}>
                    {renderSegment(`section-${sectionIndex}-item-${itemIndex}`)}
                  </li>
                ) : null,
              )}
            </ul>
          </section>
        ) : null,
      )}
      {isVisible("closing") ? <p>{renderSegment("closing")}</p> : null}
    </div>
  );
}

export function NotionChatDemo({ active = true }: { active?: boolean }) {
  const [draft, setDraft] = useState("");
  const [prompt, setPrompt] = useState("");
  const [selectedFlowId, setSelectedFlowId] = useState<RecruiterFlowId>(
    DEFAULT_NOTION_RECRUITER_FLOW_ID,
  );
  const [phase, setPhase] = useState<ChatPhase>("idle");
  const [stageIndex, setStageIndex] = useState(0);
  const [prefaceCount, setPrefaceCount] = useState(0);
  const [visibleWords, setVisibleWords] = useState(0);
  const [streamChunkIndex, setStreamChunkIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [copied, setCopied] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const [jumpLeaving, setJumpLeaving] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const conversationRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const copyTimerRef = useRef<number | null>(null);
  const activeFlow = getNotionRecruiterFlowById(
    selectedFlowId,
  ) as RecruiterFlow;
  const responseModel = useMemo(
    () => createNotionResponseModel(activeFlow.response),
    [activeFlow],
  );

  useEffect(() => {
    if (!active) return;

    let focusFrame = 0;
    const positionFrame = window.requestAnimationFrame(() => {
      focusFrame = window.requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    });

    return () => {
      window.cancelAnimationFrame(positionFrame);
      window.cancelAnimationFrame(focusFrame);
    };
  }, [active]);

  const currentStage = NOTION_CHAT_STAGES[stageIndex] as {
    id: StageId;
    dwellMs: number | null;
  };
  const activity = getNotionActivity(
    currentStage.id,
    activeFlow.id,
  ) as ActivityView | null;
  const isGenerating = phase === "running" || phase === "answering";
  const hasDraft = draft.trim().length > 0;
  const prefaceText = activeFlow.planChunks.slice(0, prefaceCount).join("");
  const renderedPrefaceText =
    prefaceCount === activeFlow.planChunks.length
      ? activeFlow.planSummary
      : prefaceText;
  const showPrefaceBrewing =
    currentStage.id === "plan" &&
    (prefaceCount === 0 || prefaceCount === activeFlow.planChunks.length);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase !== "running") return;
    if (reducedMotion) return;
    if (currentStage.id === "answering") {
      const frame = window.requestAnimationFrame(() => setPhase("answering"));
      return () => window.cancelAnimationFrame(frame);
    }
    const timer = window.setTimeout(
      () => setStageIndex((current) => Math.min(current + 1, NOTION_CHAT_STAGES.length - 1)),
      currentStage.dwellMs ?? 1,
    );
    return () => window.clearTimeout(timer);
  }, [currentStage.dwellMs, currentStage.id, phase, reducedMotion]);

  useEffect(() => {
    if (phase !== "running" || currentStage.id !== "plan") return;
    if (reducedMotion) return;
    if (prefaceCount >= activeFlow.planChunks.length) return;
    const timer = window.setTimeout(
      () =>
        setPrefaceCount((current) =>
          Math.min(current + 1, activeFlow.planChunks.length),
        ),
      PREFACE_DWELLS_MS[prefaceCount] ?? 34,
    );
    return () => window.clearTimeout(timer);
  }, [activeFlow.planChunks, currentStage.id, phase, prefaceCount, reducedMotion]);

  useEffect(() => {
    if (phase !== "answering") return;
    if (reducedMotion) return;
    if (visibleWords >= responseModel.wordTotal) {
      const timer = window.setTimeout(() => setPhase("done"), 300);
      return () => window.clearTimeout(timer);
    }
    const nextRange = responseModel.arrivalRanges[streamChunkIndex];
    const interval =
      RESPONSE_INTERVAL_PATTERN[streamChunkIndex % RESPONSE_INTERVAL_PATTERN.length];
    const timer = window.setTimeout(() => {
      setVisibleWords(nextRange?.end ?? responseModel.wordTotal);
      setStreamChunkIndex((current) => current + 1);
    }, interval);
    return () => window.clearTimeout(timer);
  }, [phase, reducedMotion, responseModel, streamChunkIndex, visibleWords]);

  useEffect(() => {
    if (!reducedMotion || !isGenerating) return;
    const frame = window.requestAnimationFrame(() => {
      setPrefaceCount(activeFlow.planChunks.length);
      setStageIndex(NOTION_CHAT_STAGES.length - 1);
      setVisibleWords(responseModel.wordTotal);
      setPhase("done");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeFlow.planChunks.length, isGenerating, reducedMotion, responseModel.wordTotal]);

  useEffect(() => {
    const scroller = conversationRef.current;
    if (!scroller || phase === "idle" || phase === "done") return;
    if (
      phase === "answering" &&
      visibleWords >= responseModel.wordTotal - responseModel.closingWordTotal
    ) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      scroller.scrollTo({
        top: scroller.scrollHeight,
        behavior: reducedMotion ? "auto" : "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [phase, prefaceCount, reducedMotion, responseModel, stageIndex, visibleWords]);

  useEffect(() => {
    if (phase !== "done" || cancelled) return;
    const frame = window.requestAnimationFrame(() => {
      const scroller = conversationRef.current;
      if (!scroller) return;
      const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
      if (distance > 6) {
        setJumpLeaving(false);
        setShowJump(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [cancelled, phase]);

  const resetConversation = () => {
    setDraft("");
    setPrompt("");
    setSelectedFlowId(DEFAULT_NOTION_RECRUITER_FLOW_ID);
    setPhase("idle");
    setStageIndex(0);
    setPrefaceCount(0);
    setVisibleWords(0);
    setStreamChunkIndex(0);
    setFeedback(null);
    setCopied(false);
    setDictating(false);
    setModelOpen(false);
    setShowJump(false);
    setJumpLeaving(false);
    setCancelled(false);
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const submitPrompt = (
    rawPrompt: string,
    explicitFlowId?: RecruiterFlowId,
  ) => {
    const nextPrompt = rawPrompt.trim();
    if (!nextPrompt || isGenerating) return;
    const nextFlow = (explicitFlowId
      ? getNotionRecruiterFlowById(explicitFlowId)
      : getNotionRecruiterFlow(nextPrompt)) as RecruiterFlow;
    const nextResponseModel = createNotionResponseModel(nextFlow.response);
    setPrompt(nextPrompt);
    setSelectedFlowId(nextFlow.id);
    setDraft("");
    setPhase(reducedMotion ? "done" : "running");
    setStageIndex(reducedMotion ? NOTION_CHAT_STAGES.length - 1 : 0);
    setPrefaceCount(reducedMotion ? nextFlow.planChunks.length : 0);
    setVisibleWords(reducedMotion ? nextResponseModel.wordTotal : 0);
    setStreamChunkIndex(0);
    setFeedback(null);
    setCopied(false);
    setDictating(false);
    setModelOpen(false);
    setShowJump(false);
    setJumpLeaving(false);
    setCancelled(false);
  };

  const handleSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    submitPrompt(draft);
  };

  const handleComposerKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing && !event.shiftKey) {
      event.preventDefault();
      submitPrompt(draft);
    }
  };

  const cancelResponse = () => {
    if (!isGenerating) return;
    setPhase("done");
    setCancelled(true);
    setShowJump(false);
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const copyResponse = async () => {
    const copy = flattenNotionResponse(activeFlow.response);
    try {
      await navigator.clipboard.writeText(copy);
      setCopied(true);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1_400);
    } catch {
      setCopied(false);
    }
  };

  const dismissJump = () => {
    if (!showJump) return;
    if (reducedMotion) {
      setShowJump(false);
      setJumpLeaving(false);
      return;
    }
    setJumpLeaving(true);
  };

  const scrollToEnd = () => {
    dismissJump();
    const scroller = conversationRef.current;
    scroller?.scrollTo({
      top: scroller.scrollHeight,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  };

  const renderActivity = () => {
    if (!activity) return null;
    const completed = phase === "answering" || phase === "done";
    const liveSummary =
      currentStage.id === "searching" ||
      currentStage.id === "searching-web" ||
      currentStage.id === "updating-todos";
    const summaryVerb = activity.summary.match(/^\S+/)?.[0] ?? activity.summary;
    const summaryDetail = activity.summary.slice(summaryVerb.length);

    return (
      <section className={styles.activity} aria-label={completed ? "Completed steps" : "Running tools"}>
        <details className={styles.steps} data-summary-mode={activity.showChecklist ? "steps" : "live"} open>
          <summary>
            {activity.showChecklist ? (
              <span>{activity.summary}</span>
            ) : (
              <>
                <span className={styles.summaryNoodle}>
                  <NotionNoodleGlyph className={styles.noodleCanvas} paused={reducedMotion} />
                </span>
                <span className={styles.liveSummary}>
                  <span className={liveSummary ? styles.shimmer : undefined}>{summaryVerb}</span>
                  <span>{summaryDetail}</span>
                </span>
              </>
            )}
            <i className={styles.headerCaret} aria-hidden="true" />
          </summary>
          <div className={styles.stepList}>
            {activity.rows.map((row, index) => (
              <article
                className={styles.stepRow}
                data-notion-state={row.state}
                key={`notion-step-${index}`}
              >
                <i className={styles.stepDot} aria-hidden="true" />
                <span className={styles.stepContent}>
                  <span className={row.state === "live" ? styles.shimmer : undefined}>
                    {row.label}
                  </span>
                  {row.hasPageBadge ? (
                    <>
                      <NotionPageBadge />
                      <i className={styles.rowCaret} aria-hidden="true" />
                    </>
                  ) : null}
                </span>
              </article>
            ))}
          </div>
        </details>

        {activity.showChecklist ? (
          <aside className={styles.checklist} aria-label={completed ? "Completed plan" : "Working plan"}>
            {activeFlow.checklist.map((label, index) => {
              const state =
                index < activity.checklistProgress
                  ? "done"
                  : index === activity.checklistProgress
                    ? "active"
                    : "queued";
              return (
                <p key={label} data-plan-state={state} aria-label={`${label} — ${state === "done" ? "complete" : state}`}>
                  <i aria-hidden="true" />
                  <span>{label}</span>
                </p>
              );
            })}
          </aside>
        ) : null}

        {activity.showChecklist && !completed ? <BrewingStatus paused={reducedMotion} /> : null}
      </section>
    );
  };

  return (
    <section
      id="nosey-chat-demo"
      className={styles.demo}
      aria-label="Notion AI chat demo"
      data-notion-chat-demo="true"
      data-notion-chat-surface="nosey-panel"
      data-recruiter-flow={activeFlow.id}
      data-phase={phase}
      data-reduced-motion={reducedMotion || undefined}
      onKeyDownCapture={(event) => {
        if (event.key !== "Escape" || !modelOpen) return;
        event.preventDefault();
        event.stopPropagation();
        setModelOpen(false);
      }}
    >
      {prompt ? (
        <div
          ref={conversationRef}
          className={styles.conversation}
          role="log"
          aria-live={phase === "answering" ? "off" : "polite"}
          aria-busy={isGenerating}
          onScroll={(event) => {
            if (phase !== "done" || cancelled) return;
            const element = event.currentTarget;
            const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
            if (distance <= 6) {
              dismissJump();
            } else if (distance > 14 && !jumpLeaving) {
              setShowJump(true);
            }
          }}
        >
          <article className={styles.exchange}>
            <p className={styles.userMessage}>{prompt}</p>
            <div
              className={styles.prelude}
              data-preface-state={
                prefaceCount === 0
                  ? "waiting"
                  : prefaceCount === activeFlow.planChunks.length
                    ? "complete"
                    : "typing"
              }
            >
              {prefaceCount > 0 ? <p>{renderedPrefaceText}</p> : null}
              {showPrefaceBrewing ? <BrewingStatus paused={reducedMotion} /> : null}
            </div>
            {renderActivity()}
            {phase === "answering" || (phase === "done" && !cancelled) ? (
              <div className={styles.assistantMessage}>
                <StreamingResponse
                  flowId={activeFlow.id}
                  response={activeFlow.response}
                  responseModel={responseModel}
                  visibleWords={visibleWords}
                />
                {phase === "done" ? (
                  <div className={styles.feedback} aria-label="Response actions">
                    <button type="button" aria-label={copied ? "Copied" : "Copy response"} onClick={copyResponse}>
                      <FeedbackIcon name="copy" />
                    </button>
                    <button type="button" aria-label="New conversation" onClick={resetConversation}>
                      <FeedbackIcon name="new" />
                    </button>
                    <button
                      type="button"
                      aria-label="Good response"
                      aria-pressed={feedback === "good"}
                      onClick={() => setFeedback((current) => (current === "good" ? null : "good"))}
                    >
                      <FeedbackIcon name="thumbs-up" />
                    </button>
                    <button
                      type="button"
                      aria-label="Bad response"
                      aria-pressed={feedback === "bad"}
                      onClick={() => setFeedback((current) => (current === "bad" ? null : "bad"))}
                    >
                      <FeedbackIcon name="thumbs-down" />
                    </button>
                    <span className={styles.copyStatus} role="status" aria-live="polite">
                      {copied ? "Response copied" : ""}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}
            {cancelled ? <p className={styles.interrupted}>Generation stopped.</p> : null}
          </article>
        </div>
      ) : (
        <div className={styles.startState}>
          <span
            className={styles.startBrandSpace}
            data-nosey-brand-space="true"
            aria-hidden="true"
          />
          <h2>How can I help you today?</h2>
          <div className={styles.startPrompts} aria-label="Suggested prompts">
            {START_PROMPTS.map((item) => (
              <button
                type="button"
                key={item.label}
                className={styles.startPrompt}
                onClick={() => submitPrompt(item.label, item.id)}
              >
                <StartPromptIcon name={item.icon} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showJump && phase === "done" && !cancelled ? (
        <button
          type="button"
          className={styles.jumpToBottom}
          data-motion-state={jumpLeaving ? "leaving" : "visible"}
          aria-label="Scroll to the end of the response"
          onClick={scrollToEnd}
          onAnimationEnd={(event) => {
            if (event.currentTarget !== event.target || !jumpLeaving) return;
            setShowJump(false);
            setJumpLeaving(false);
          }}
        >
          <span />
        </button>
      ) : null}

      <div className={styles.composerWrap}>
        <form
          className={styles.composer}
          data-loading={isGenerating ? "true" : "false"}
          data-ready={!isGenerating && hasDraft ? "true" : "false"}
          onSubmit={handleSubmit}
        >
          <textarea
            ref={textareaRef}
            aria-label="Do anything with AI…"
            placeholder="Do anything with AI…"
            value={draft}
            rows={2}
            maxLength={1_200}
            readOnly={isGenerating}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleComposerKeyDown}
          />
          <div className={styles.composerActions}>
            <div className={styles.composerStart}>
              <button type="button" aria-label="Add context" className={styles.addButton}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
              <button type="button" aria-label="Prompt settings" className={styles.settingsButton}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 7h5m4 0h9M3 17h9m4 0h5" />
                  <circle cx="10" cy="7" r="2" />
                  <circle cx="14" cy="17" r="2" />
                </svg>
              </button>
            </div>
            <div className={styles.composerEnd}>
              <span className={styles.modelControl}>
                <button
                  type="button"
                  className={styles.modelButton}
                  aria-haspopup="menu"
                  aria-expanded={modelOpen}
                  onClick={() => setModelOpen((current) => !current)}
                >
                  Auto
                </button>
                {modelOpen ? (
                  <span className={styles.modelMenu} role="menu">
                    <button type="button" role="menuitem" onClick={() => setModelOpen(false)}>
                      Auto
                    </button>
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                className={styles.micButton}
                aria-label={dictating ? "Stop dictation" : "Start dictation"}
                aria-pressed={dictating}
                disabled={isGenerating}
                onClick={() => setDictating((current) => !current)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="8" y="3" width="8" height="12" rx="4" />
                  <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
                </svg>
              </button>
              <button
                type={isGenerating ? "button" : "submit"}
                className={styles.submitButton}
                aria-label={isGenerating ? "Stop generating" : "Send message"}
                disabled={!isGenerating && !hasDraft}
                onClick={isGenerating ? cancelResponse : undefined}
              >
                {isGenerating ? (
                  <i />
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m5 12 7-7 7 7M12 5v14" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
