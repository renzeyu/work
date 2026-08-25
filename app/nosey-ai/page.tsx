import type { Metadata } from "next";
import { NoseyPrototype } from "./NoseyPrototype";

export const metadata: Metadata = {
  title: "Your AI Team",
  description:
    "An interactive motion case study with authored and randomly selected character states.",
};

export default function NoseyAiPage() {
  return <NoseyPrototype />;
}
