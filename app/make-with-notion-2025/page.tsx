import type { Metadata } from "next";
import { withBasePath } from "../lib/portfolio";
import { absoluteSiteUrl } from "../lib/site";
import { ShapePlayground } from "../playground/shape-typer/ShapePlayground";
import { ShapeTyper } from "../playground/shape-typer/ShapeTyper";
import styles from "./MakeWithNotionProject.module.css";

const projectTitle = "Make with Notion 2025";
const projectDescription =
  "Created interstitials for the annual Make with Notion conference, built the team's typer tool, and produced the Notion 3.0 keynote.";
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
        width: 720,
        height: 404,
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
        <p>{projectDescription}</p>
      </header>

      <section
        className={styles.prototype}
        aria-label="Interactive Make with Notion prototype"
      >
        <ShapeTyper variant="project" showPlayground={false} />
      </section>

      <section
        className={styles.devBlog}
        aria-labelledby="dev-blog-title"
      >
        <header className={styles.blogHeading}>
          <h2 id="dev-blog-title">Building the Make with Notion typer</h2>
          <p>
            We started by screen-recording a web-based typer. That led us to
            rebuild it in After Effects, where pasted Figma copy becomes
            on-brand motion with zero keyframes.
          </p>
        </header>

        <section
          className={styles.chapter}
          aria-labelledby="why-screen-recording-stopped-working"
        >
          <h3 id="why-screen-recording-stopped-working">
            Why screen recording stopped working
          </h3>
          <div className={styles.chapterBody}>
            <p>
              At the start of Make with Notion 2025 production, we were using a
              web-based typer and recording the result. It looked great, but
              the recording flattened everything. Any post-production change
              meant recording the full animation again.
            </p>
            <p>
              The fix was to rebuild the idea natively in After Effects. The
              brief was simple: anyone on the team should be able to paste text
              from Figma and render an on-brand typer without setting a single
              keyframe.
            </p>
          </div>
        </section>

        <section
          className={styles.chapter}
          aria-labelledby="the-system-begins-with-type"
        >
          <h3 id="the-system-begins-with-type">The system begins with type</h3>
          <div className={styles.chapterBody}>
            <p>
              Brand designer Lorin Schaecher created a custom shape font based
              on Inter. Each character maps to a distinct shape, such as a
              triangle for <i>a</i> or a circle for <i>o</i>. Because those
              shapes live in an actual font, they inherit the kerning and
              spacing behavior we already rely on. A line can move between
              Inter and the shape font without its composition falling apart.
            </p>
            <p>
              Lorin also drew alternate orientations for the shapes, which let
              us match the Figma designs more closely. Because the system was
              still text, expressions could animate, color, and replace shapes
              one character at a time.
            </p>
          </div>
        </section>

        <section
          className={styles.chapter}
          aria-labelledby="two-ways-through-the-template"
        >
          <h3 id="two-ways-through-the-template">
            Two ways through the template
          </h3>
          <div className={styles.chapterBody}>
            <p>
              <code>EasyType</code> covers the common case. It contains one text
              layer: paste the copy, and the animation is ready to render.
            </p>
            <p>
              <code>TyperOn</code> is for designs that need a shape to linger
              after the rest of the line resolves. It separates the setup into
              two layers. <code>Text</code> holds the final design, while
              <code>Shapes</code> handles the opening motion. On its own, the
              Text layer is a straightforward typewriter. The Shapes layer adds
              the shape, rotation, and transition into each letter.
            </p>
            <p>
              To leave a shape behind, we style that character with the shape
              font on the Text layer, then copy the full styled line to the
              Shapes layer and set that layer in the shape font. Kerning may
              need a small adjustment to match the design. This manual sync is
              a necessary workaround. After Effects expressions can link
              <code> sourceText</code> in a simple setup, but they cannot
              transfer per-character styles such as font and color between
              layers.
            </p>
          </div>
        </section>

        <section
          className={styles.chapter}
          aria-labelledby="controls-not-timelines"
        >
          <h3 id="controls-not-timelines">Controls, not timelines</h3>
          <div className={styles.chapterBody}>
            <p>
              Nobody using the template needs to open its animators or
              expressions. The working controls live on the Text layer in
              Effect Controls.
            </p>
            <ul>
              <li>
                Color overrides target a character by index. Entering
                <code> 5</code> in <code>Yellow Index</code>, for example, turns
                the fifth character yellow. Any overridden character starts
                wiggling after it appears, following the same behavior used
                across the event identity.
              </li>
              <li>
                Wiggle Amount and Wiggle Seed change the intensity and
                variation of lingering shapes.
              </li>
              <li>
                Typing Speed and Animation Delay control the pace of the line
                and the handoff from shape to letter.
              </li>
            </ul>
            <p>
              It behaves more like a small plugin than an animation template.
              The controls a designer needs are all in one place.
            </p>
          </div>
        </section>

        <section
          className={styles.chapter}
          aria-labelledby="what-the-expressions-automate"
        >
          <h3 id="what-the-expressions-automate">
            What the expressions automate
          </h3>
          <div className={styles.chapterBody}>
            <div className={styles.mechanism}>
              <h4>Color without hand assignment</h4>
              <p>
                Last year&apos;s animations cycled each letter through four brand
                colors. A modulo expression checks the character index and
                assigns the right color. For blue,
                <code> (textIndex - 1) % 4 == 1</code> catches characters 2, 6,
                10, and so on. A longer sentence still follows the same color
                rhythm with no extra setup.
              </p>
            </div>

            <div className={styles.mechanism}>
              <h4>One typing speed for every line</h4>
              <p>
                Instead of stretching keyframes, the expression calculates the
                duration from the copy length and a characters-per-second
                control. It also starts at the layer&apos;s in point, so multiple
                instances can be staggered freely in a timeline.
              </p>
              <pre className={styles.expression}>
                <code>{`var charsPerSecond = 15;
var startTime = inPoint;
var duration = text.sourceText.length / charsPerSecond;
var animEndTime = startTime + duration;`}</code>
              </pre>
            </div>

            <div className={styles.mechanism}>
              <h4>A stop-motion wiggle</h4>
              <p>
                A <code>posterizeTime</code> expression makes After Effects
                evaluate the wiggle at 12 frames per second. The movement stays
                random, but it lands with a choppy, stylized stop-motion feel.
              </p>
            </div>
          </div>
        </section>

        <section
          className={styles.chapter}
          aria-labelledby="type-on-was-only-half"
        >
          <h3 id="type-on-was-only-half">
            Type on was only half the transition
          </h3>
          <div className={styles.chapterBody}>
            <p>
              We later added a Type Off mode that sends text back into shapes
              from left to right. Pairing Type On with Type Off lets one
              sentence become the next without cutting to white. The tool is
              still evolving as we use it, and Lorin has continued expanding
              the shape font alongside it.
            </p>
            <p>
              Now, when copy or timing changes, we can update the composition
              instead of recording the whole sequence again.
            </p>
          </div>
        </section>
      </section>

      <div className={`${styles.prototype} ${styles.playgroundPrototype}`}>
        <ShapePlayground />
      </div>
    </article>
  );
}
