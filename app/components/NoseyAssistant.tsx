"use client";

import { lazy, Suspense, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

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

  if (!canUseBrowser) return null;

  return createPortal(
    <Suspense fallback={null}>
      <LazyNoseyPrototype variant="assistant" />
    </Suspense>,
    document.body,
  );
}
