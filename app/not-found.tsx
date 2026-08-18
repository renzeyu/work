import { withBasePath } from "./lib/portfolio";

export default function NotFound() {
  return (
    <section className="not-found">
      <p className="eyebrow">404</p>
      <h1>That page is not here.</h1>
      <a href={withBasePath("/work/")}>Return to the work</a>
    </section>
  );
}
