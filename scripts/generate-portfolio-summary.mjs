import { readFile, writeFile } from "node:fs/promises";

const sourceUrl = new URL("../app/data/portfolio.json", import.meta.url);
const outputUrl = new URL("../app/data/portfolio-summary.json", import.meta.url);
const portfolio = JSON.parse(await readFile(sourceUrl, "utf8"));
const summary = {
  brand: portfolio.brand,
  socials: portfolio.socials,
  covers: portfolio.covers,
};

await writeFile(outputUrl, `${JSON.stringify(summary, null, 2)}\n`);
