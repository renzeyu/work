import type { Metadata } from "next";
import { absoluteSiteUrl } from "../lib/site";
import { RedditSeamlessPrototype } from "./RedditSeamlessPrototype";

export const metadata: Metadata = {
  title: "Reddit Seamless Feed Prototype",
  description:
    "An interactive prototype exploring continuous movement from the Reddit feed into posts, comments, and immersive media.",
  alternates: { canonical: absoluteSiteUrl("/reddit-seamless/") },
  openGraph: {
    type: "website",
    url: absoluteSiteUrl("/reddit-seamless/"),
    siteName: "Zeyu Ren",
    title: "Zeyu Ren - Reddit Seamless Feed Prototype",
    description:
      "A continuous Reddit feed, post, comments, and immersive media interaction prototype.",
    images: [{ url: absoluteSiteUrl("/og.jpg"), width: 1916, height: 1080 }],
  },
};

export default function RedditSeamlessPage() {
  return <RedditSeamlessPrototype />;
}
