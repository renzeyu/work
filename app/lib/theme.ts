export type ColorTheme = "light" | "dark";

export const themeStorageKey = "zeyuren-product-motion-theme";
export const themeChangeEvent = "zeyuren-theme-change";
export const lightThemeColor = "#f7f7f5";
export const darkThemeColor = "#202020";

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
