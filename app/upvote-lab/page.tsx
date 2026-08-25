import type { Metadata } from "next";
import { absoluteSiteUrl } from "../lib/site";
import { UpvoteLab } from "./UpvoteLab";

export const metadata: Metadata = {
  title: "Vote Motion Lab",
  description:
    "An interactive Reddit vote-motion prototype for comparing feedback, number tickers, and live presence behavior.",
  alternates: { canonical: absoluteSiteUrl("/upvote-lab/") },
};

export default function UpvoteLabPage() {
  return <UpvoteLab />;
}
