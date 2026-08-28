"use client";

/* Native lazy images avoid mounting a framework image runtime for video posters. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { withBasePath } from "../lib/base-path";

type NetworkInformation = {
  effectiveType?: string;
  saveData?: boolean;
};

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformation;
};

type WindowWithIdleCallback = Window & {
  cancelIdleCallback?: (handle: number) => void;
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
};

type LoopVideoProps = {
  src: string;
  optimizedSrc?: string;
  poster?: string;
  optimizedPoster?: string;
  label: string;
  width?: number;
  height?: number;
  priority?: boolean;
  autoLoad?: boolean;
  motionDelay?: number;
};

function constrainedConnection() {
  const connection = (navigator as NavigatorWithConnection).connection;
  return Boolean(
    connection?.saveData ||
      connection?.effectiveType === "slow-2g" ||
      connection?.effectiveType === "2g" ||
      connection?.effectiveType === "3g",
  );
}

export function LoopVideo({
  src,
  optimizedSrc,
  poster,
  optimizedPoster,
  label,
  width = 16,
  height = 9,
  priority = false,
  autoLoad = false,
  motionDelay = 500,
}: LoopVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [posterVisible, setPosterVisible] = useState(priority);
  const [videoReady, setVideoReady] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasPointerIntent, setHasPointerIntent] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    let cancelled = false;
    let timer = 0;
    let idleHandle = 0;
    let loadListener: (() => void) | null = null;
    const browserWindow = window as WindowWithIdleCallback;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const scheduleLoad = () => {
      if (
        cancelled ||
        !autoLoad ||
        reduceMotion ||
        constrainedConnection()
      ) {
        return;
      }

      const begin = () => {
        timer = window.setTimeout(() => {
          if (browserWindow.requestIdleCallback) {
            idleHandle = browserWindow.requestIdleCallback(
              () => {
                if (!cancelled) setShouldLoad(true);
              },
              { timeout: 1200 },
            );
          } else if (!cancelled) {
            setShouldLoad(true);
          }
        }, motionDelay);
      };

      if (document.readyState === "complete") begin();
      else {
        loadListener = begin;
        window.addEventListener("load", begin, { once: true });
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        const nextVisible = entry.isIntersecting && entry.intersectionRatio > 0;
        setIsVisible(nextVisible);
        if (nextVisible) {
          setPosterVisible(true);
          scheduleLoad();
        }
        else videoRef.current?.pause();
      },
      { rootMargin: "0px", threshold: 0.05 },
    );

    observer.observe(element);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (loadListener) window.removeEventListener("load", loadListener);
      if (idleHandle && browserWindow.cancelIdleCallback) {
        browserWindow.cancelIdleCallback(idleHandle);
      }
      observer.disconnect();
    };
  }, [autoLoad, motionDelay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoReady) return;

    if (isVisible && (autoLoad || hasPointerIntent)) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [autoLoad, hasPointerIntent, isVisible, videoReady]);

  const requestMotion = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setHasPointerIntent(true);
    setShouldLoad(true);
  };

  const preview = optimizedPoster ?? poster;

  return (
    <div
      ref={containerRef}
      className="loop-video"
      data-video-ready={videoReady}
      style={{ aspectRatio: `${width} / ${height}` }}
      role="img"
      aria-label={label}
      onPointerEnter={requestMotion}
      onPointerLeave={() => setHasPointerIntent(false)}
      onFocusCapture={requestMotion}
    >
      {preview && posterVisible ? (
        <img
          className="loop-video__poster"
          src={withBasePath(preview)}
          alt=""
          aria-hidden="true"
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
        />
      ) : null}
      {shouldLoad ? (
        <video
          ref={videoRef}
          aria-hidden="true"
          autoPlay={autoLoad || hasPointerIntent}
          loop
          muted
          playsInline
          preload="none"
          src={withBasePath(optimizedSrc ?? src)}
          onCanPlay={() => setVideoReady(true)}
        />
      ) : null}
    </div>
  );
}
