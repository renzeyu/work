export type ColorTheme = "light" | "dark";

export const themeStorageKey = "zeyuren-product-motion-theme";
export const themeChangeEvent = "zeyuren-theme-change";
export const lightThemeColor = "#ffffff";
export const darkThemeColor = "#191919";
export const lightScrimmedThemeColor = "#9e9e9e";
export const darkScrimmedThemeColor = "#080808";

export function browserThemeColor(
  theme: ColorTheme,
  scrimmed = false,
): string {
  if (scrimmed) {
    return theme === "dark"
      ? darkScrimmedThemeColor
      : lightScrimmedThemeColor;
  }

  return theme === "dark" ? darkThemeColor : lightThemeColor;
}

export function syncBrowserThemeColor(
  theme: ColorTheme,
  scrimmed = document.documentElement.classList.contains("menu-open"),
) {
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", browserThemeColor(theme, scrimmed));
}

export const themeInitScript = `
(() => {
  const storageKey = ${JSON.stringify(themeStorageKey)};
  let storedTheme = null;

  try {
    storedTheme = window.localStorage.getItem(storageKey);
  } catch {}

  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
  const theme = storedTheme === "light" || storedTheme === "dark"
    ? storedTheme
    : systemTheme;
  const root = document.documentElement;

  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute(
      "content",
      theme === "dark" ? ${JSON.stringify(darkThemeColor)} : ${JSON.stringify(lightThemeColor)},
    );
  }
})();
`;
