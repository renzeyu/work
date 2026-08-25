import type { Metadata } from "next";
import { RedditIconPrototype } from "./RedditIconPrototype";

export const metadata: Metadata = {
  title: "Reddit Icon Animations",
  description:
    "An interactive prototype of the Reddit mobile bottom navigation animations.",
};

export default function RedditIconsPage() {
  return <RedditIconPrototype />;
}
