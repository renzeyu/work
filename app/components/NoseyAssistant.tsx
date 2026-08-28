"use client";

import {
  lazy,
  Suspense,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

const ASSISTANT_LOAD_DELAY_MS = 500;
const ASSISTANT_IDLE_TIMEOUT_MS = 1500;

const LazyNoseyPrototype = lazy(() =>
  import("../nosey-ai/NoseyPrototype").then(({ NoseyPrototype }) => ({
    default: NoseyPrototype,
  })),
);

const subscribeToBrowser = () => () => undefined;

export function NoseyAssistant() {
  const canUseBrowser = useSyncExternalStore(
    subscribeToBrowser,
    () => true,
    () => false,
  );
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (!canUseBrowser) return;

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
  }, [canUseBrowser]);

  if (!canUseBrowser) return null;

  return createPortal(
    shouldLoad ? (
      <Suspense fallback={null}>
        <LazyNoseyPrototype variant="assistant" />
      </Suspense>
    ) : null,
    document.body,
  );
}
