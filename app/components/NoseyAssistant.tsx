"use client";

/* Native image is a 7 KB exact idle-state fallback for the deferred Rive UI. */
/* eslint-disable @next/next/no-img-element */

import {
  lazy,
  Suspense,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { withBasePath } from "../lib/base-path";

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
  const [entranceArmed, setEntranceArmed] = useState(false);
  const [activated, setActivated] = useState(false);
  const [startWithRandomState, setStartWithRandomState] = useState(false);
  const [riveReady, setRiveReady] = useState(false);

  useEffect(() => {
    if (!canUseBrowser) return;

    let cancelled = false;
    let entranceTimer = 0;
    let loadListener: (() => void) | null = null;

    const begin = () => {
      entranceTimer = window.setTimeout(() => {
        if (!cancelled) setEntranceArmed(true);
      }, 500);
    };

    if (document.readyState === "complete") begin();
    else {
      loadListener = begin;
      window.addEventListener("load", begin, { once: true });
    }

    return () => {
      cancelled = true;
      window.clearTimeout(entranceTimer);
      if (loadListener) window.removeEventListener("load", loadListener);
    };
  }, [canUseBrowser]);

  if (!canUseBrowser) return null;

  const activate = (playState: boolean) => {
    if (playState) setStartWithRandomState(true);
    setActivated(true);
  };

  return createPortal(
    <>
      <button
        type="button"
        className="nosey-assistant-placeholder"
        data-active={activated}
        data-entrance={entranceArmed ? "armed" : "waiting"}
        data-hidden={riveReady}
        aria-label="Play a Nosey animation"
        onClick={() => activate(true)}
      >
        <img
          src={withBasePath("/media/nosey-assistant-static.png")}
          alt=""
          aria-hidden="true"
          width={84}
          height={84}
          decoding="async"
        />
      </button>
      {activated ? (
        <Suspense fallback={null}>
          <LazyNoseyPrototype
            variant="assistant"
            startWithRandomState={startWithRandomState}
            onAssistantReady={() => {
              window.setTimeout(() => setRiveReady(true), 300);
            }}
          />
        </Suspense>
      ) : null}
    </>,
    document.body,
  );
}
