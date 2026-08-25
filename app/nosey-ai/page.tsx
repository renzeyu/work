import type { Metadata } from "next";
import { NoseyPrototype } from "./NoseyPrototype";

export const metadata: Metadata = {
  title: "Your AI Team",
  description:
    "A character-led motion system that turned Notion AI products into a human-centered team of specialist helpers.",
};

export default function NoseyAiPage() {
  return <NoseyPrototype />;
}
