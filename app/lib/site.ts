export const siteUrl = "https://zeyuren.com";

export function absoluteSiteUrl(path: string) {
  return new URL(path.replace(/^\//, ""), `${siteUrl}/`).toString();
}
