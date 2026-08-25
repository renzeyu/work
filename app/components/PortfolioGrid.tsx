import Image from "next/image";
import { portfolio, withBasePath } from "../lib/portfolio";
import { LoopVideo } from "./LoopVideo";
import { NoseyAssistant } from "./NoseyAssistant";

export function PortfolioGrid() {
  return (
    <>
      <section className="work-page" aria-labelledby="work-heading">
        <h1 id="work-heading" className="sr-only">
          Work
        </h1>

        <div className="portfolio-grid">
          {portfolio.covers.map((project) => (
            <a
              className="project-card"
              href={withBasePath(`/${project.slug}/`)}
              key={project.slug}
            >
              <span className="project-card__media">
                {project.asset.kind === "video" ? (
                  <LoopVideo
                    {...project.asset}
                    label={`${project.title} animated cover`}
                  />
                ) : (
                  <span className="static-media">
                    <Image
                      src={withBasePath(project.asset.src)}
                      alt={`${project.title} cover`}
                      fill
                      sizes="(max-width: 760px) 100vw, 50vw"
                      unoptimized
                    />
                  </span>
                )}
              </span>
              <span className="project-card__meta">
                <span>{project.title}</span>
              </span>
            </a>
          ))}
        </div>
      </section>
      <NoseyAssistant />
    </>
  );
}
