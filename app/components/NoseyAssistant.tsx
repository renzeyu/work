"use client";

/* The 4.8 KB static Nosey keeps the launcher functional on constrained clients. */
/* eslint-disable @next/next/no-img-element */

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { withBasePath } from "../lib/base-path";
import styles from "./NoseyAssistant.module.css";

const ASSISTANT_LOAD_DELAY_MS = 500;
const ASSISTANT_IDLE_TIMEOUT_MS = 1500;
const PANEL_MINIMIZE_FALLBACK_MS = 140;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type NetworkInformation = EventTarget & {
  effectiveType?: string;
  saveData?: boolean;
};

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformation;
};

const LazyNoseyPrototype = lazy(() =>
  import("../nosey-ai/NoseyPrototype").then(({ NoseyPrototype }) => ({
    default: NoseyPrototype,
  })),
);

const loadNotionChatDemo = () =>
  import("./notion-ai-chat/NotionChatDemo").then(({ NotionChatDemo }) => ({
    default: NotionChatDemo,
  }));

const LazyNotionChatDemo = lazy(loadNotionChatDemo);

const subscribeToBrowser = () => () => undefined;
const getServerPreference = () => false;

const getReducedMotionPreference = () =>
  window.matchMedia(REDUCED_MOTION_QUERY).matches;

const subscribeToReducedMotion = (notify: () => void) => {
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};

const getConstrainedConnection = () => {
  const connection = (navigator as NavigatorWithConnection).connection;
  return Boolean(
    connection?.saveData ||
      connection?.effectiveType === "slow-2g" ||
      connection?.effectiveType === "2g" ||
      connection?.effectiveType === "3g",
  );
};

const subscribeToConnection = (notify: () => void) => {
  const connection = (navigator as NavigatorWithConnection).connection;
  connection?.addEventListener("change", notify);
  return () => connection?.removeEventListener("change", notify);
};

export function NoseyAssistant() {
  const canUseBrowser = useSyncExternalStore(
    subscribeToBrowser,
    () => true,
    () => false,
  );
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionPreference,
    getServerPreference,
  );
  const hasConstrainedConnection = useSyncExternalStore(
    subscribeToConnection,
    getConstrainedConnection,
    getServerPreference,
  );
  const useLightweightLauncher =
    prefersReducedMotion || hasConstrainedConnection;
  const [shouldLoad, setShouldLoad] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelClosing, setPanelClosing] = useState(false);
  const [chatSessionKey, setChatSessionKey] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const minimizeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const restoreLauncherFocus = useCallback(() => {
    const focusTarget = restoreFocusRef.current;
    restoreFocusRef.current = null;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => focusTarget?.focus());
    });
  }, []);

  const warmNotionChat = useCallback(() => {
    void loadNotionChatDemo();
  }, []);

  const finishPanelMinimize = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    setPanelOpen(false);
    setPanelClosing(false);
    restoreLauncherFocus();
  }, [restoreLauncherFocus]);

  const openPanel = useCallback((launcher?: HTMLButtonElement) => {
    warmNotionChat();
    restoreFocusRef.current = launcher ?? null;
    setPanelMounted(true);
    setPanelClosing(false);
    setPanelOpen(true);
  }, [warmNotionChat]);

  const requestPanelMinimize = useCallback(() => {
    if (!dialogRef.current?.open) {
      finishPanelMinimize();
      return;
    }
    setPanelClosing(true);
  }, [finishPanelMinimize]);

  const startNewChat = useCallback(() => {
    setChatSessionKey((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!canUseBrowser || useLightweightLauncher) return;

    let cancelled = false;
    let loadTimer = 0;
    let idleCallback: number | undefined;
    let loadListener: (() => void) | null = null;

    const loadAssistant = () => {
      idleCallback = undefined;
      if (!cancelled) setShouldLoad(true);
    };

    const begin = () => {
      loadListener = null;
      loadTimer = window.setTimeout(() => {
        if (cancelled) return;

        if (typeof window.requestIdleCallback === "function") {
          idleCallback = window.requestIdleCallback(loadAssistant, {
            timeout: ASSISTANT_IDLE_TIMEOUT_MS,
          });
          return;
        }

        loadAssistant();
      }, ASSISTANT_LOAD_DELAY_MS);
    };

    if (document.readyState === "complete") begin();
    else {
      loadListener = begin;
      window.addEventListener("load", begin, { once: true });
    }

    return () => {
      cancelled = true;
      window.clearTimeout(loadTimer);
      if (idleCallback !== undefined) {
        window.cancelIdleCallback?.(idleCallback);
      }
      if (loadListener) window.removeEventListener("load", loadListener);
    };
  }, [canUseBrowser, useLightweightLauncher]);

  useEffect(() => {
    if (!panelOpen) return;
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;

    dialog.show();
    const focusFrame = window.requestAnimationFrame(() => {
      minimizeButtonRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(focusFrame);
  }, [panelOpen]);

  useEffect(() => {
    if (!panelOpen) return;

    const minimizeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      requestPanelMinimize();
    };

    document.addEventListener("keydown", minimizeOnEscape);
    return () => document.removeEventListener("keydown", minimizeOnEscape);
  }, [panelOpen, requestPanelMinimize]);

  useEffect(() => {
    if (!panelClosing) return;
    const closeTimer = window.setTimeout(
      finishPanelMinimize,
      PANEL_MINIMIZE_FALLBACK_MS,
    );
    return () => window.clearTimeout(closeTimer);
  }, [finishPanelMinimize, panelClosing]);

  useEffect(
    () => () => {
      const dialog = dialogRef.current;
      if (dialog?.open) dialog.close();
    },
    [],
  );

  if (!canUseBrowser) return null;

  return createPortal(
    <div
      className={styles.assistantShell}
      data-panel-state={panelClosing ? "closing" : panelOpen ? "open" : "closed"}
      data-panel-mounted={panelMounted || undefined}
    >
      {useLightweightLauncher ? (
        <div
          className={styles.noseySlot}
          data-nosey-slot="true"
          data-nosey-launcher-mode="static"
        >
          <button
            type="button"
            className={styles.lightweightLauncher}
            disabled={panelOpen}
            tabIndex={panelOpen ? -1 : undefined}
            aria-label="Open AI chat demo"
            aria-describedby="lightweight-nosey-description"
            aria-haspopup="dialog"
            aria-controls="nosey-chat-dialog"
            aria-expanded={panelOpen}
            data-nosey-chat-trigger="true"
            onPointerEnter={warmNotionChat}
            onPointerDown={warmNotionChat}
            onFocus={warmNotionChat}
            onClick={(event) => {
              openPanel(event.currentTarget);
              if (event.detail > 0) event.currentTarget.blur();
            }}
          >
            <img
              src={withBasePath("/media/nosey-assistant-static.png")}
              alt=""
              aria-hidden="true"
              width={84}
              height={84}
              loading="eager"
              fetchPriority="low"
              decoding="async"
            />
          </button>
          <span id="lightweight-nosey-description" className="sr-only">
            Open the interactive Notion AI chat panel.
          </span>
        </div>
      ) : shouldLoad ? (
        <Suspense fallback={null}>
          <div
            className={styles.noseySlot}
            data-nosey-slot="true"
            data-nosey-launcher-mode="rive"
          >
            <LazyNoseyPrototype
              variant="assistant"
              assistantPlacement="slot"
              onAssistantActivate={openPanel}
              onAssistantIntent={warmNotionChat}
              assistantExpanded={panelOpen}
            />
          </div>
        </Suspense>
      ) : null}

      {panelMounted ? (
        <dialog
          ref={dialogRef}
          id="nosey-chat-dialog"
          className={styles.dialog}
          data-nosey-chat-dialog="true"
          data-state={panelClosing ? "closing" : panelOpen ? "open" : "minimized"}
          aria-labelledby="nosey-chat-title"
          aria-modal="false"
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget && panelClosing) {
              finishPanelMinimize();
            }
          }}
          onClose={finishPanelMinimize}
        >
          <h2 id="nosey-chat-title" className="sr-only">
            Nosey AI chat demo
          </h2>
          <header className={styles.panelHeader} data-nosey-chat-header="true">
            <span className={styles.panelTitleGroup}>
              <span className={styles.panelTitle}>New AI chat</span>
              <svg
                className={styles.panelChevron}
                data-nosey-header-icon="chevron"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path d="m4.5 6 3.5 3.5L11.5 6" />
              </svg>
            </span>
            <span className={styles.panelActions}>
              <button
                type="button"
                className={`${styles.headerUtility} ${styles.newChatButton}`}
                data-nosey-header-icon="new-chat"
                aria-label="Start a new AI chat"
                aria-controls="nosey-chat-demo"
                onClick={startNewChat}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10 3.25c-4.28 0-7.25 2.38-7.25 5.85 0 1.72.76 3.2 2.11 4.25l-.58 2.9 3.15-1.54c.82.2 1.68.3 2.57.3 4.28 0 7.25-2.42 7.25-5.91S14.28 3.25 10 3.25Z" />
                  <path d="M10 6.3v5.6M7.2 9.1h5.6" />
                </svg>
              </button>
              <span
                className={styles.headerUtility}
                data-nosey-header-icon="panel-mode"
                aria-hidden="true"
              >
                <svg viewBox="0 0 20 20">
                  <rect x="3" y="5" width="14" height="10" rx="1.5" />
                  <rect
                    className={styles.panelModeFill}
                    x="11.75"
                    y="9.25"
                    width="3.75"
                    height="3.75"
                    rx="0.65"
                  />
                </svg>
              </span>
              <button
                ref={minimizeButtonRef}
                type="button"
                className={styles.minimizeButton}
                data-nosey-chat-minimize="true"
                aria-label="Minimize AI chat demo"
                onClick={requestPanelMinimize}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M4 10h12" />
                </svg>
              </button>
            </span>
          </header>
          <Suspense
            fallback={
              <div
                className={styles.panelLoading}
                data-nosey-chat-loading="true"
                role="status"
                aria-live="polite"
              >
                Loading AI chat…
              </div>
            }
          >
            <LazyNotionChatDemo key={chatSessionKey} active={panelOpen} />
          </Suspense>
        </dialog>
      ) : null}
    </div>,
    document.body,
  );
}
