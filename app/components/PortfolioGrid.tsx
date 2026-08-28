/* Static export uses native images so the portfolio has no image runtime. */
/* eslint-disable @next/next/no-img-element */

import { withBasePath } from "../lib/base-path";
import { portfolioSummary } from "../lib/portfolio-summary";
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
          {portfolioSummary.covers.map((project, index) => (
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
                    priority={index < 2}
                    autoLoad={index === 0}
                  />
                ) : (
                  <span className="static-media">
                    <img
                      src={withBasePath(project.asset.src)}
                      alt={`${project.title} cover`}
                      width={project.asset.width}
                      height={project.asset.height}
                      loading={index === 0 ? "eager" : "lazy"}
                      fetchPriority={index === 0 ? "high" : "auto"}
                      decoding="async"
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
