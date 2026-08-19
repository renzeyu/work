import assert from "node:assert/strict";
import { access, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const outputRoot = new URL("../dist/client/", import.meta.url);

const routes = [
  "work",
  "2024-reel",
  "brand-refresh-launch",
  "reddit-ipo-social-video",
  "reddit-recap-1",
  "collectable-avatars-launch-video",
  "rplace-returns-teaser",
  "reddit-motion-design-system",
  "hatch-awards-2019",
  "nihonto-enter-the-swordsmith",
  "contact",
];

test("exports every legacy portfolio route as static HTML", async () => {
  await access(new URL("index.html", outputRoot));
  for (const route of routes) {
    await access(new URL(`${route}/index.html`, outputRoot));
  }
  await access(new URL(".nojekyll", outputRoot));
  await access(new URL("robots.txt", outputRoot));
  await access(new URL("sitemap.xml", outputRoot));
});

test("work page contains all project links and migration-safe metadata", async () => {
  const [html, rootHtml] = await Promise.all([
    readFile(new URL("work/index.html", outputRoot), "utf8"),
    readFile(new URL("index.html", outputRoot), "utf8"),
  ]);

  for (const frontpage of [rootHtml, html]) {
    assert.match(frontpage, /<h1 id="work-heading">Product Motion<\/h1>/);
    assert.match(
      frontpage,
      /<p>Motion systems, launch stories, and interaction-focused work for digital products\.<\/p>/,
    );
    assert.doesNotMatch(frontpage, /work-eyebrow|Selected work/);
    assert.doesNotMatch(frontpage, /class="work-database-heading"/);
    assert.doesNotMatch(
      frontpage,
      /<span>Projects<\/span>|>9(?:<!-- -->)? items</,
    );
  }

  assert.match(html, /Zeyu Ren/);
  assert.match(html, /Product Motion Designer/);
  assert.match(html, /Product Motion/);
  assert.match(html, /2025 Reel/);
  assert.match(html, /Reddit Motion Design System/);
  assert.match(html, /Nihont/);
  assert.match(
    html,
    /https:\/\/renzeyu\.github\.io\/product-motion\/work\//,
  );
  assert.match(html, /class="workspace-panel"/);
  assert.match(html, /class="project-card__meta"/);
  assert.doesNotMatch(html, /project-card__overlay/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
  assert.doesNotMatch(html, /noindex/i);
  assert.doesNotMatch(html, /cdn\.myportfolio\.com|www-ccv\.adobe\.io/i);
});

test("publishes repository-path sitemap and robots URLs", async () => {
  const sitemap = await readFile(new URL("sitemap.xml", outputRoot), "utf8");
  const robots = await readFile(new URL("robots.txt", outputRoot), "utf8");

  assert.match(sitemap, /https:\/\/renzeyu\.github\.io\/product-motion\/work\//);
  assert.match(
    robots,
    /Sitemap: https:\/\/renzeyu\.github\.io\/product-motion\/sitemap\.xml/,
  );
  assert.doesNotMatch(sitemap, /https:\/\/zeyuren\.com\//);
});

test("about page preserves the form and accessible field labels", async () => {
  const html = await readFile(new URL("contact/index.html", outputRoot), "utf8");

  assert.match(html, /<label[^>]*for="contact-name"[^>]*>Name \*<\/label>/);
  assert.match(html, /id="contact-email"/);
  assert.match(html, /type="email"/);
  assert.match(html, /Your Message/);
  assert.match(html, />Submit<\/button>/);
});

test("rich project copy is semantic and closed lightboxes do not preload", async () => {
  const html = await readFile(
    new URL("reddit-motion-design-system/index.html", outputRoot),
    "utf8",
  );

  assert.match(html, /<h2 class="title">/);
  assert.match(html, /<h3 class="sub-title">/);
  assert.match(html, /<p>/);
  assert.doesNotMatch(html, /<video[^>]+src="\/media\//);
});

test("uses standardized client identities on matching project routes", async () => {
  const [datadog, reddit, blackMath] = await Promise.all([
    readFile(new URL("2024-reel/index.html", outputRoot), "utf8"),
    readFile(new URL("brand-refresh-launch/index.html", outputRoot), "utf8"),
    readFile(new URL("hatch-awards-2019/index.html", outputRoot), "utf8"),
  ]);

  assert.match(datadog, /brand-mark--datadog/);
  assert.match(datadog, /\/brand-logos\/datadog\.svg/);
  assert.doesNotMatch(datadog, />ZR<\/span>/);
  assert.match(reddit, /brand-mark--reddit/);
  assert.match(reddit, /\/brand-logos\/reddit\.png/);
  assert.match(blackMath, /brand-mark--black-math/);
  assert.match(blackMath, /\/brand-logos\/black-math\.png/);

  for (const logo of [
    "datadog.svg",
    "reddit.png",
    "notion.png",
    "black-math.png",
  ]) {
    await access(new URL(`../public/brand-logos/${logo}`, import.meta.url));
  }
});

test("uses Datadog as the neutral identity", async () => {
  for (const route of [
    "index.html",
    "work/index.html",
    "contact/index.html",
    "2024-reel/index.html",
    "404.html",
  ]) {
    const html = await readFile(new URL(route, outputRoot), "utf8");
    assert.match(html, /brand-mark--datadog/);
    assert.match(html, /\/brand-logos\/datadog\.svg/);
  }
});

test("uses the symbol-only Datadog asset", async () => {
  const svg = await readFile(
    new URL("../public/brand-logos/datadog.svg", import.meta.url),
    "utf8",
  );

  assert.equal((svg.match(/<path\b/g) ?? []).length, 1);
  assert.match(svg, /id="datadog-mark"/);
  assert.doesNotMatch(svg, /path20188|DATADOG/);
});

test("serves the optimized Nihonto lead image without dropping its PNG fallback", async () => {
  const html = await readFile(
    new URL("nihonto-enter-the-swordsmith/index.html", outputRoot),
    "utf8",
  );

  assert.match(html, /<source[^>]+\.avif[^>]+type="image\/avif"/);
  assert.match(html, /b103b1b5-ce5e-4d87-92cd-17d054bd2c2e\.png/);
  assert.match(html, /fetchPriority="high"/);
  assert.match(html, /loading="eager"/);
});

test("prefixes generated assets for repository-subpath Pages builds", async (context) => {
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  if (!basePath) {
    context.skip("root-domain build");
    return;
  }

  const html = await readFile(new URL("index.html", outputRoot), "utf8");
  assert.ok(html.includes(`src="${basePath}/_next/`));
  assert.ok(
    html.includes(`src="${basePath}/brand-logos/datadog.svg"`),
  );
  assert.doesNotMatch(html, /src="\/_next\//);

  const redditHtml = await readFile(
    new URL("brand-refresh-launch/index.html", outputRoot),
    "utf8",
  );
  assert.ok(redditHtml.includes(`src="${basePath}/brand-logos/reddit.png"`));

  const cssRoot = new URL("_next/static/css/", outputRoot);
  const cssFiles = (await readdir(cssRoot)).filter((file) => file.endsWith(".css"));
  const css = (
    await Promise.all(cssFiles.map((file) => readFile(new URL(file, cssRoot), "utf8")))
  ).join("\n");
  assert.ok(css.includes(`url(${basePath}/_next/`));
  assert.doesNotMatch(css, /url\(\/_next\//);
});

test("all local media stays within GitHub's single-file limit", async () => {
  const mediaRoot = new URL("public/media/", projectRoot);
  const files = await readdir(mediaRoot);
  assert.ok(files.length >= 200);

  for (const file of files) {
    const fileStat = await stat(path.join(mediaRoot.pathname, file));
    assert.ok(fileStat.size < 100_000_000, `${file} exceeds 100 MB`);
  }
});
