"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "@phosphor-icons/react";
import {
  darkThemeColor,
  lightThemeColor,
  themeChangeEvent,
  themeStorageKey,
  type ColorTheme,
} from "../lib/theme";

function isColorTheme(value: unknown): value is ColorTheme {
  return value === "light" || value === "dark";
}

function systemTheme(): ColorTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function storedTheme(): ColorTheme | null {
  try {
    const value = window.localStorage.getItem(themeStorageKey);
    return isColorTheme(value) ? value : null;
  } catch {
    return null;
  }
}

function resolvedTheme(): ColorTheme {
  const value = document.documentElement.dataset.theme;
  return isColorTheme(value) ? value : systemTheme();
}

function applyTheme(theme: ColorTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute(
      "content",
      theme === "dark" ? darkThemeColor : lightThemeColor,
    );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ColorTheme | null>(null);

  useEffect(() => {
    const initialSync = window.requestAnimationFrame(() => {
      setTheme(resolvedTheme());
    });

    function syncTheme(event: Event) {
      const nextTheme = (event as CustomEvent<ColorTheme>).detail;
      const resolved = isColorTheme(nextTheme) ? nextTheme : resolvedTheme();
      applyTheme(resolved);
      setTheme(resolved);
    }

    function syncStoredTheme(event: StorageEvent) {
      if (event.key !== themeStorageKey && event.key !== null) return;
      const resolved = isColorTheme(event.newValue)
        ? event.newValue
        : systemTheme();
      applyTheme(resolved);
      setTheme(resolved);
    }

    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    function syncSystemTheme() {
      if (storedTheme() !== null) return;
      const resolved = systemTheme();
      applyTheme(resolved);
      setTheme(resolved);
    }

    window.addEventListener(themeChangeEvent, syncTheme);
    window.addEventListener("storage", syncStoredTheme);
    colorScheme.addEventListener("change", syncSystemTheme);

    return () => {
      window.cancelAnimationFrame(initialSync);
      window.removeEventListener(themeChangeEvent, syncTheme);
      window.removeEventListener("storage", syncStoredTheme);
      colorScheme.removeEventListener("change", syncSystemTheme);
    };
  }, []);

  const darkModeActive = theme === "dark";
  const actionLabel = theme === null
    ? "Toggle color theme"
    : `Switch to ${darkModeActive ? "light" : "dark"} mode`;

  function toggleTheme() {
    const nextTheme: ColorTheme = resolvedTheme() === "dark" ? "light" : "dark";

    try {
      window.localStorage.setItem(themeStorageKey, nextTheme);
    } catch {
      // The current page can still switch themes when storage is unavailable.
    }

    applyTheme(nextTheme);
    setTheme(nextTheme);
    window.dispatchEvent(
      new CustomEvent<ColorTheme>(themeChangeEvent, { detail: nextTheme }),
    );
  }

  return (
    <button
      className="theme-toggle"
      type="button"
      data-theme-toggle
      role="switch"
      aria-checked={darkModeActive}
      aria-label="Dark mode"
      title={actionLabel}
      onClick={toggleTheme}
    >
      <span className="theme-toggle__switch" aria-hidden="true">
        <Sun
          className="theme-toggle__icon theme-toggle__sun"
          data-theme-icon="sun"
          aria-hidden="true"
          weight="regular"
        />
        <Moon
          className="theme-toggle__icon theme-toggle__moon"
          data-theme-icon="moon"
          aria-hidden="true"
          weight="regular"
        />
        <span className="theme-toggle__thumb" />
      </span>
    </button>
  );
}
