"use client";

import { useEffect, useRef, useState } from "react";
import { withBasePath } from "../lib/portfolio";

type LoopVideoProps = {
  src: string;
  poster?: string;
  label: string;
  width?: number;
  height?: number;
};

export function LoopVideo({
  src,
  poster,
  label,
  width = 16,
  height = 9,
}: LoopVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="loop-video"
      style={{ aspectRatio: `${width} / ${height}` }}
      role="img"
      aria-label={label}
    >
      <video
        aria-hidden="true"
        autoPlay
        loop
        muted
        playsInline
        poster={poster ? withBasePath(poster) : undefined}
        preload="none"
        src={shouldLoad ? withBasePath(src) : undefined}
      />
    </div>
  );
}
