import { portfolio, withBasePath } from "../lib/portfolio";
import { LoopVideo } from "./LoopVideo";

export function PortfolioGrid() {
  return (
    <section className="work-page" aria-labelledby="work-heading">
      <header className="work-header">
        <p className="work-eyebrow">Selected work</p>
        <h1 id="work-heading">Product Motion</h1>
        <p>
          Motion systems, launch stories, and interaction-focused work for digital products.
        </p>
      </header>

      <div className="work-database-heading" aria-hidden="true">
        <span>Projects</span>
        <span>{portfolio.covers.length} items</span>
      </div>

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
