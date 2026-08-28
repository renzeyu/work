"use client";

import { withBasePath } from "../../lib/base-path";
import styles from "./RedditRecapPreview.module.css";

export function RedditRecapPreview() {
  return (
    <div
      className={styles.preview}
      data-reddit-recap-preview="true"
      aria-label="Interactive Reddit Recap 2022 prototype in an iPhone frame"
    >
      <div className={styles.deviceFrame} data-reddit-recap-device-frame>
        <span className={styles.frameActionButton} aria-hidden="true" />
        <div className={styles.deviceShell}>
          <div className={styles.screenSurface}>
            <iframe
              className={styles.screen}
              src={withBasePath("/reddit-recap-2022/?v=15")}
              title="Interactive Reddit Recap 2022 prototype"
              allow="clipboard-write"
              loading="lazy"
            />
          </div>
          <span className={styles.notch} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
