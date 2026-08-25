import type { Metadata } from "next";
import { withBasePath } from "../lib/portfolio";
import { absoluteSiteUrl } from "../lib/site";
import { ShapeTyper } from "../playground/shape-typer/ShapeTyper";
import styles from "./MakeWithNotionProject.module.css";

const projectTitle = "Make with Notion 2025";
const projectDescription =
  "An interactive typer and physics playground built from the Make with Notion 2025 alphabet.";
const coverPath = "/media/make-with-notion-2025-cover.jpg";

export const metadata: Metadata = {
  title: projectTitle,
  description: projectDescription,
  alternates: {
    canonical: absoluteSiteUrl("/make-with-notion-2025/"),
  },
  openGraph: {
    type: "website",
    url: absoluteSiteUrl("/make-with-notion-2025/"),
    siteName: "Zeyu Ren",
    title: `Zeyu Ren - ${projectTitle}`,
    description: projectDescription,
    images: [
      {
        url: absoluteSiteUrl(coverPath),
        width: 1980,
        height: 1080,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Zeyu Ren - ${projectTitle}`,
    description: projectDescription,
    images: [absoluteSiteUrl(coverPath)],
  },
};

export default function MakeWithNotion2025Page() {
  return (
    <article
      className={`project-page ${styles.project}`}
      aria-labelledby="project-title"
    >
      <header className="project-heading">
        <a className="project-back" href={withBasePath("/work/")}>
          <span aria-hidden="true">←</span> All work
        </a>
        <h1 id="project-title">{projectTitle}</h1>
        <p>
          Type a message, choose which characters remain shapes, then drop the
          same alphabet into a physics playground.
        </p>
      </header>

      <section
        className={styles.prototype}
        aria-label="Interactive Make with Notion prototype"
      >
        <ShapeTyper variant="project" />
      </section>
    </article>
  );
}
