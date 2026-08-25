"use client";

import { useEffect, useRef } from "react";

const MIN_SCROLL_DURATION_MS = 1_700;
const SCROLL_SPEED_PX_PER_SECOND = 40;

export function ProjectNavLabel({ children }: { children: string }) {
  const viewportRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    let mounted = true;

    const measure = () => {
      if (!mounted) return;

      const viewportWidth = viewport.clientWidth;
      const distance = viewportWidth > 0
        ? Math.max(0, Math.ceil(track.scrollWidth - viewportWidth))
        : 0;
      const duration = Math.max(
        MIN_SCROLL_DURATION_MS,
        Math.ceil((distance / SCROLL_SPEED_PX_PER_SECOND) * 1_000),
      );

      viewport.dataset.overflowing = distance > 0 ? "true" : "false";
      viewport.style.setProperty("--nav-label-scroll-distance", `${distance}px`);
      viewport.style.setProperty("--nav-label-scroll-duration", `${duration}ms`);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(track);
    void document.fonts.ready.then(measure);

    return () => {
      mounted = false;
      observer.disconnect();
    };
  }, [children]);

  return (
    <span
      ref={viewportRef}
      className="nav-row__label project-nav-label"
      data-overflowing="false"
    >
      <span ref={trackRef} className="project-nav-label__track">
        {children}
      </span>
    </span>
  );
}
