export const siteUrl = "https://renzeyu.github.io/work";

export function absoluteSiteUrl(path: string) {
  return new URL(path.replace(/^\//, ""), `${siteUrl}/`).toString();
}
