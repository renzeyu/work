import { portfolio, withBasePath } from "../lib/portfolio";
import { LoopVideo } from "./LoopVideo";

export function PortfolioGrid() {
  return (
    <section className="work-page" aria-labelledby="work-heading">
      <header className="work-header">
        <h1 id="work-heading">Motion Design Works</h1>
        <p>
          Motion systems, launch stories, and interaction-focused work for digital products.
        </p>
      </header>

      <div className="portfolio-grid">
        {portfolio.covers.map((project) => (
          <a
            className="project-card"
            href={withBasePath(`/${project.slug}/`)}
            key={project.slug}
          >
            <span className="project-card__media">
              <LoopVideo
                {...project.asset}
                label={`${project.title} animated cover`}
              />
            </span>
            <span className="project-card__meta">
              <span>{project.title}</span>
              <span className="project-card__action" aria-hidden="true">View</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
