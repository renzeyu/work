export const siteUrl = "https://renzeyu.github.io/product-motion";

export function absoluteSiteUrl(path: string) {
  return new URL(path.replace(/^\//, ""), `${siteUrl}/`).toString();
}
