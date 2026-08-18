import type { Metadata } from "next";
import { PortfolioGrid } from "./components/PortfolioGrid";
import { absoluteSiteUrl } from "./lib/site";

export const metadata: Metadata = {
  title: "Product Motion Portfolio",
  alternates: { canonical: absoluteSiteUrl("/work/") },
  openGraph: {
    type: "website",
    url: absoluteSiteUrl("/work/"),
    siteName: "Zeyu Ren",
    title: "Zeyu Ren - Product Motion Portfolio",
    description: "Selected product motion, interaction, and motion systems work.",
    images: [{ url: absoluteSiteUrl("/og.jpg"), width: 1916, height: 1080 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zeyu Ren - Product Motion Portfolio",
    description: "Selected product motion, interaction, and motion systems work.",
    images: [absoluteSiteUrl("/og.jpg")],
  },
};

export default function Home() {
  return <PortfolioGrid />;
}
