import type { Metadata } from "next";
import { LoaderPrototype } from "./LoaderPrototype";

export const metadata: Metadata = {
  title: "Loader Prototypes",
  description: "Interactive AMA and RPAN loader motion studies.",
};

export default function LoadersPage() {
  return <LoaderPrototype />;
}
