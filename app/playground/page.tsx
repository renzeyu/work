import type { Metadata } from "next";
import { LoaderPrototype } from "../loaders/LoaderPrototype";
import { NoseyPrototype } from "../nosey-ai/NoseyPrototype";
import { absoluteSiteUrl } from "../lib/site";
import { RedditIconPrototype } from "../reddit-icons/RedditIconPrototype";
import { RedditSeamlessPrototype } from "../reddit-seamless/RedditSeamlessPrototype";
import { UpvoteLab } from "../upvote-lab/UpvoteLab";
import { ShapePlaygroundPreview } from "./shape-typer/ShapePlaygroundPreview";
import { ShapeTyper } from "./shape-typer/ShapeTyper";
import { NoodlingSnippet } from "./noodling/NoodlingSnippet";
import { PlaygroundMasonry } from "./PlaygroundMasonry";
import { RPlacePreview } from "./rplace/RPlacePreview";
import styles from "./Playground.module.css";

export const metadata: Metadata = {
  title: "Playground",
  description: "Interactive motion prototypes by Zeyu Ren.",
  alternates: { canonical: absoluteSiteUrl("/playground/") },
  openGraph: {
    type: "website",
    url: absoluteSiteUrl("/playground/"),
    siteName: "Zeyu Ren",
    title: "Zeyu Ren - Playground",
    description: "Interactive motion prototypes by Zeyu Ren.",
    images: [{ url: absoluteSiteUrl("/og.jpg"), width: 1916, height: 1080 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zeyu Ren - Playground",
    description: "Interactive motion prototypes by Zeyu Ren.",
    images: [absoluteSiteUrl("/og.jpg")],
  },
};

export default function PlaygroundPage() {
  return (
    <section
      className={`playground-page ${styles.playground}`}
      aria-labelledby="playground-title"
    >
      <h1 id="playground-title" className="sr-only">
        Playground
      </h1>
      <PlaygroundMasonry>
        <section
          className={`${styles.tile} ${styles.typerTile}`}
          aria-labelledby="shape-typer-title"
          data-company="notion"
          data-prototype="shape-typer"
        >
          <h2 id="shape-typer-title" className="sr-only">
            Shape Typer
          </h2>
          <ShapeTyper variant="preview" />
        </section>
        <section
          className={`${styles.tile} ${styles.shapePlaygroundTile}`}
          aria-labelledby="shape-playground-preview-title"
          data-company="notion"
          data-prototype="shape-playground"
        >
          <h2 id="shape-playground-preview-title" className="sr-only">
            Shape playground
          </h2>
          <p id="shape-playground-preview-instructions" className="sr-only">
            Click or tap to drop a shape. Right-click to reset the playground.
          </p>
          <ShapePlaygroundPreview
            instructionsId="shape-playground-preview-instructions"
          />
        </section>
        <section
          className={`${styles.tile} ${styles.noodlingTile}`}
          aria-labelledby="noodling-title"
          data-company="notion"
          data-prototype="noodling"
        >
          <h2 id="noodling-title" className="sr-only">
            Noodling
          </h2>
          <NoodlingSnippet />
        </section>
        <section
          className={`${styles.tile} ${styles.noseyTile}`}
          aria-labelledby="nosey-title"
          data-company="notion"
          data-prototype="nosey-ai"
        >
          <h2 id="nosey-title" className="sr-only">
            Nosey AI
          </h2>
          <NoseyPrototype variant="playground" />
        </section>
        <section
          className={`${styles.tile} ${styles.loaderTile}`}
          aria-labelledby="loader-preview-title"
          data-company="reddit"
          data-prototype="loaders"
        >
          <h2 id="loader-preview-title" className="sr-only">
            AMA and RPAN loader animations
          </h2>
          <LoaderPrototype variant="playground" />
        </section>
        <section
          className={`${styles.tile} ${styles.redditTile}`}
          aria-labelledby="reddit-icons-playground-title"
          data-company="reddit"
          data-prototype="reddit-icons"
        >
          <h2 id="reddit-icons-playground-title" className="sr-only">
            Reddit icon animations
          </h2>
          <RedditIconPrototype variant="playground" />
        </section>
        <section
          className={`${styles.tile} ${styles.rplaceTile}`}
          aria-labelledby="rplace-playground-title"
          data-company="reddit"
          data-prototype="rplace"
        >
          <h2 id="rplace-playground-title" className="sr-only">
            Interactive r/place canvas
          </h2>
          <RPlacePreview />
        </section>
        <section
          className={`${styles.tile} ${styles.upvoteTile}`}
          aria-labelledby="upvote-lab-playground-title"
          data-company="reddit"
          data-prototype="upvote-lab"
        >
          <h2 id="upvote-lab-playground-title" className="sr-only">
            Vote motion lab
          </h2>
          <UpvoteLab variant="playground" />
        </section>
        <section
          className={`${styles.tile} ${styles.redditSeamlessTile}`}
          aria-labelledby="reddit-seamless-playground-title"
          data-company="reddit"
          data-prototype="reddit-seamless"
        >
          <h2 id="reddit-seamless-playground-title" className="sr-only">
            Reddit seamless feed-to-post experience
          </h2>
          <RedditSeamlessPrototype
            variant="playground"
            ariaLabelledBy="reddit-seamless-playground-title"
          />
        </section>
      </PlaygroundMasonry>
    </section>
  );
}
