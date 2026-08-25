import type { Metadata } from "next";
import { withBasePath } from "../lib/portfolio";
import { absoluteSiteUrl } from "../lib/site";
import { NoodlingWorkbench } from "./NoodlingWorkbench";
import styles from "./NoodlingProject.module.css";

const projectTitle = "Notion AI Motion Design";
const projectDescription =
  "An interactive motion study of the Notion AI scribble's thinking cadence.";

export const metadata: Metadata = {
  title: projectTitle,
  description: projectDescription,
  alternates: {
    canonical: absoluteSiteUrl("/notion-ai-motion-design/"),
  },
  openGraph: {
    type: "website",
    url: absoluteSiteUrl("/notion-ai-motion-design/"),
    siteName: "Zeyu Ren",
    title: `Zeyu Ren - ${projectTitle}`,
    description: projectDescription,
    images: [
      {
        url: absoluteSiteUrl("/media/notion-ai-motion-design-cover.jpg"),
        width: 960,
        height: 540,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Zeyu Ren - ${projectTitle}`,
    description: projectDescription,
    images: [absoluteSiteUrl("/media/notion-ai-motion-design-cover.jpg")],
  },
};

export default function NotionAiMotionDesignPage() {
  return (
    <article
      className={`project-page ${styles.project}`}
      aria-labelledby="project-title"
    >
      <header className={`project-heading ${styles.heading}`}>
        <a className="project-back" href={withBasePath("/work/")}>
          <span aria-hidden="true">←</span> All work
        </a>
        <h1 id="project-title">{projectTitle}</h1>
        <p>{projectDescription}</p>
      </header>

      <div className={styles.workbenchFrame}>
        <NoodlingWorkbench />
      </div>
    </article>
  );
}
