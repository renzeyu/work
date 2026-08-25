"use client";

import {
  Children,
  type ReactNode,
  useLayoutEffect,
  useRef,
} from "react";
import styles from "./Playground.module.css";

const MASONRY_BREAKPOINT = 800;

export function PlaygroundMasonry({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const items = Array.from(
      root.querySelectorAll<HTMLElement>(":scope > [data-masonry-item]"),
    );
    let frame = 0;

    const layout = () => {
      frame = 0;
      const availableWidth = root.clientWidth;
      if (availableWidth <= 0) return;

      const columnCount = availableWidth > MASONRY_BREAKPOINT ? 2 : 1;
      const gap = Number.parseFloat(getComputedStyle(root).columnGap) || 0;
      const columnWidth =
        (availableWidth - gap * (columnCount - 1)) / columnCount;
      const columnHeights = Array.from({ length: columnCount }, () => 0);

      root.dataset.masonryReady = "true";
      root.dataset.masonryColumns = String(columnCount);

      for (const item of items) {
        item.style.width = `${columnWidth}px`;
      }

      const itemHeights = items.map(
        (item) => item.getBoundingClientRect().height,
      );

      for (const [itemIndex, item] of items.entries()) {
        const shortestHeight = Math.min(...columnHeights);
        const columnIndex = columnHeights.indexOf(shortestHeight);
        const x = columnIndex * (columnWidth + gap);
        const y = columnHeights[columnIndex];

        item.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        columnHeights[columnIndex] = y + itemHeights[itemIndex] + gap;
      }

      root.style.height = `${Math.max(0, Math.max(...columnHeights) - gap)}px`;
    };

    const scheduleLayout = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(layout);
    };
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(scheduleLayout);

    resizeObserver?.observe(root);
    for (const item of items) resizeObserver?.observe(item);
    window.addEventListener("resize", scheduleLayout);
    layout();
    void document.fonts?.ready.then(scheduleLayout);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleLayout);
      delete root.dataset.masonryReady;
      delete root.dataset.masonryColumns;
      root.style.removeProperty("height");
      for (const item of items) {
        item.style.removeProperty("transform");
        item.style.removeProperty("width");
      }
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.masonry} data-masonry-root>
      {Children.map(children, (child) => (
        <div className={styles.masonryItem} data-masonry-item>
          {child}
        </div>
      ))}
    </div>
  );
}
