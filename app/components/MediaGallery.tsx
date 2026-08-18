"use client";

/* Local portfolio media intentionally uses native img elements so static export
   stays independent from an image optimization service. */

import type { CSSProperties, KeyboardEvent } from "react";
import { useRef, useState } from "react";
import type { MediaAsset } from "../lib/portfolio";
import { withBasePath } from "../lib/portfolio";
import { LoopVideo } from "./LoopVideo";

type MediaGalleryProps = {
  items: MediaAsset[];
  layout: "single" | "grid";
  projectTitle: string;
  projectSlug: string;
  moduleIndex: number;
};

type GridStyle = CSSProperties & {
  "--grid-columns": number;
  "--tablet-columns": number;
  "--mobile-columns": number;
};

function gridColumns(projectSlug: string, itemCount: number, layout: string) {
  if (layout === "single" || itemCount === 1) {
    return { desktop: 1, tablet: 1, mobile: 1, dense: false };
  }
  if (projectSlug === "reddit-motion-design-system" && itemCount >= 20) {
    return { desktop: 7, tablet: 5, mobile: 3, dense: true };
  }
  if (projectSlug === "reddit-recap-1" && itemCount === 5) {
    return { desktop: 5, tablet: 3, mobile: 2, dense: false };
  }
  if (itemCount === 4) {
    return { desktop: 4, tablet: 3, mobile: 2, dense: false };
  }
  return { desktop: 2, tablet: 2, mobile: 1, dense: false };
}

function GalleryAsset({
  item,
  label,
  priority = false,
}: {
  item: MediaAsset;
  label: string;
  priority?: boolean;
}) {
  if (item.kind === "video") {
    return (
      <LoopVideo
        src={item.src}
        poster={item.poster}
        width={item.width}
        height={item.height}
        label={label}
      />
    );
  }

  return (
    <span
      className="static-media"
      style={{
        aspectRatio:
          item.width && item.height ? `${item.width} / ${item.height}` : "auto",
      }}
    >
      <picture>
        {item.optimizedSrc ? (
          <source srcSet={withBasePath(item.optimizedSrc)} type="image/avif" />
        ) : null}
        <img
          src={withBasePath(item.src)}
          alt={label}
          width={item.width}
          height={item.height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
        />
      </picture>
    </span>
  );
}

export function MediaGallery({
  items,
  layout,
  projectTitle,
  projectSlug,
  moduleIndex,
}: MediaGalleryProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [allowMotion, setAllowMotion] = useState(true);
  const columns = gridColumns(projectSlug, items.length, layout);
  const style: GridStyle = {
    "--grid-columns": columns.desktop,
    "--tablet-columns": columns.tablet,
    "--mobile-columns": columns.mobile,
  };

  function openLightbox(index: number) {
    setActiveIndex(index);
    setAllowMotion(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setIsOpen(true);
    dialogRef.current?.showModal();
  }

  function closeLightbox() {
    dialogRef.current?.close();
    setIsOpen(false);
  }

  function showPrevious() {
    setActiveIndex((index) => (index - 1 + items.length) % items.length);
  }

  function showNext() {
    setActiveIndex((index) => (index + 1) % items.length);
  }

  function handleKeys(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.target instanceof HTMLVideoElement) {
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showPrevious();
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      showNext();
    }
  }

  const activeItem = items[activeIndex];
  const activeLabel = `${projectTitle}, detail ${activeIndex + 1} of ${items.length}`;

  return (
    <>
      <div
        className={`media-grid${columns.dense ? " media-grid--dense" : ""}`}
        style={style}
      >
        {items.map((item, index) => (
          <button
            className="media-trigger"
            type="button"
            key={`${moduleIndex}-${item.src}`}
            aria-label={`Open ${projectTitle} detail ${index + 1} of ${items.length}`}
            onClick={() => openLightbox(index)}
          >
            <GalleryAsset
              item={item}
              label={`${projectTitle} detail ${index + 1}`}
              priority={moduleIndex === 0 && index === 0}
            />
          </button>
        ))}
      </div>
      <dialog
        ref={dialogRef}
        className="lightbox"
        aria-label={`${projectTitle} media viewer`}
        onKeyDown={handleKeys}
        onClose={() => setIsOpen(false)}
      >
        <div className="lightbox__stage">
          {isOpen && activeItem?.kind === "video" ? (
            <video
              key={activeItem.src}
              src={withBasePath(activeItem.src)}
              poster={
                activeItem.poster ? withBasePath(activeItem.poster) : undefined
              }
              aria-label={activeLabel}
              autoPlay={allowMotion}
              loop
              muted
              playsInline
              controls
            />
          ) : isOpen && activeItem ? (
            <picture>
              {activeItem.optimizedSrc ? (
                <source
                  srcSet={withBasePath(activeItem.optimizedSrc)}
                  type="image/avif"
                />
              ) : null}
              <img src={withBasePath(activeItem.src)} alt={activeLabel} />
            </picture>
          ) : null}
        </div>
        <div className="lightbox__controls">
          {items.length > 1 ? (
            <>
              <button type="button" onClick={showPrevious}>
                Previous
              </button>
              <span aria-live="polite">
                {activeIndex + 1} / {items.length}
              </span>
              <button type="button" onClick={showNext}>
                Next
              </button>
            </>
          ) : (
            <span />
          )}
          <button type="button" onClick={closeLightbox}>
            Close
          </button>
        </div>
      </dialog>
    </>
  );
}
