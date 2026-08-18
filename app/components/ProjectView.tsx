import type { PortfolioProject } from "../lib/portfolio";
import { withBasePath } from "../lib/portfolio";
import { MediaGallery } from "./MediaGallery";
import { RichText } from "./RichText";

export function ProjectView({ project }: { project: PortfolioProject }) {
  return (
    <article className="project-page">
      <header className="project-heading">
        <a className="project-back" href={withBasePath("/work/")}>
          <span aria-hidden="true">←</span> All work
        </a>
        <h1>{project.title}</h1>
        <p>Motion case study</p>
      </header>
      <div className="project-modules">
        {project.modules.map((module, index) => {
          if (module.kind === "text") {
            return (
              <section className="project-copy" key={`${project.slug}-text-${index}`}>
                <RichText html={module.html} />
              </section>
            );
          }

          if (module.kind === "media") {
            return (
              <MediaGallery
                key={`${project.slug}-media-${index}`}
                items={module.items}
                layout={module.layout}
                projectTitle={project.title}
                projectSlug={project.slug}
                moduleIndex={index}
              />
            );
          }

          if (module.kind === "video") {
            return (
              <div className="feature-video" key={`${project.slug}-video-${index}`}>
                {/* These portfolio films contain music and design audio, not dialogue. */}
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster={module.poster ? withBasePath(module.poster) : undefined}
                  src={withBasePath(module.src)}
                  aria-label={`${project.title} video`}
                />
              </div>
            );
          }

          return (
            <div className="vimeo-embed" key={`${project.slug}-embed-${index}`}>
              <iframe
                src={module.src}
                title={`${project.title} on Vimeo`}
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                allowFullScreen
                loading="lazy"
              />
            </div>
          );
        })}
      </div>
    </article>
  );
}
