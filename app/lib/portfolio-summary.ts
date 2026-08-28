import portfolioSummaryJson from "../data/portfolio-summary.json";
import type {
  PortfolioClient,
  PortfolioCover,
  PortfolioProjectIcon,
} from "./portfolio";

export type PortfolioSummary = {
  brand: {
    name: string;
    role: string;
  };
  socials: Record<"linkedin" | "instagram" | "vimeo", string>;
  covers: PortfolioCover[];
};

export const portfolioSummary = portfolioSummaryJson as PortfolioSummary;

export type { PortfolioClient, PortfolioCover, PortfolioProjectIcon };
