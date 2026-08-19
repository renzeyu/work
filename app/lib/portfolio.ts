import portfolioJson from "../data/portfolio.json";

export type MediaAsset = {
  kind: "image" | "video";
  src: string;
  optimizedSrc?: string;
  poster?: string;
  width?: number;
  height?: number;
};

export type TextModule = {
  kind: "text";
  html: string;
  style?: string | null;
};

export type MediaModule = {
  kind: "media";
  layout: "single" | "grid";
  items: MediaAsset[];
};

export type VideoModule = {
  kind: "video";
  src: string;
  poster?: string;
};

export type EmbedModule = {
  kind: "embed";
  provider: "vimeo";
  src: string;
};

export type ProjectModule =
  | TextModule
  | MediaModule
  | VideoModule
  | EmbedModule;

export type PortfolioProject = {
  slug: string;
  title: string;
  modules: ProjectModule[];
};

export type PortfolioClient = "datadog" | "reddit" | "notion" | "black-math";

export type PortfolioCover = {
  slug: string;
  title: string;
  client: PortfolioClient;
  asset: MediaAsset;
};

export type PortfolioData = {
  brand: {
    name: string;
    role: string;
  };
  socials: Record<"linkedin" | "instagram" | "vimeo", string>;
  covers: PortfolioCover[];
  projects: PortfolioProject[];
  about: {
    title: string;
    html: string;
  };
};

export const portfolio = portfolioJson as PortfolioData;

export const projectBySlug = new Map(
  portfolio.projects.map((project) => [project.slug, project]),
);

export const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(
  /\/$/,
  "",
);

export function withBasePath(path: string) {
  if (!path.startsWith("/") || !basePath) return path;
  return `${basePath}${path}`;
}
