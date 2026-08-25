import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  createShapeColorSequence,
  DEFAULT_COLOR_SEED,
  SHAPE_COLOR_VALUES,
} from "../app/playground/shape-typer/shapeColorSequence.mjs";
import { createRetainedShapeState } from "../app/playground/shape-typer/retainedShapeState.mjs";
import {
  limitTyperText,
  MAX_TYPER_CHARACTERS,
  resolveTyperTextEdit,
  shouldShowCharacterCount,
} from "../app/playground/shape-typer/textEditing.mjs";
import { IDLE_REPLAY_INTERVAL_MS } from "../app/playground/shape-typer/idleReplay.mjs";
import {
  createPlaygroundColorCycle,
  createPlaygroundSpawnSpec,
  PLAYGROUND_MAX_BODIES,
  PLAYGROUND_SHAPE_SIZE_RATIO,
  playgroundBodyLimit,
  playgroundShortSide,
} from "../app/playground/shape-typer/shapePlaygroundConfig.mjs";
import {
  createPlaygroundAutoSpawnController,
  PLAYGROUND_AUTO_SPAWN_INTERVAL_MS,
  PLAYGROUND_AUTO_SPAWN_MAX_BODIES,
  PLAYGROUND_AUTOPLAY_RESUME_DELAY_MS,
} from "../app/playground/shape-typer/playgroundAutoSpawn.mjs";
import {
  SHAPE_BRAND_COLORS,
  SHAPE_GLYPHS,
} from "../app/playground/shape-typer/shapeLibrary.mjs";

const projectRoot = new URL("../", import.meta.url);
const outputRoot = new URL("../dist/client/", import.meta.url);

const routes = [
  "work",
  "make-with-notion-2025",
  "playground",
  "loaders",
  "reddit-icons",
  "2024-reel",
  "brand-refresh-launch",
  "reddit-ipo-social-video",
  "reddit-recap-1",
  "reddit-seamless",
  "upvote-lab",
  "collectable-avatars-launch-video",
  "rplace-returns-teaser",
  "reddit-motion-design-system",
  "hatch-awards-2019",
  "nihonto-enter-the-swordsmith",
  "nosey-ai",
  "notion-ai-motion-design",
  "contact",
];

test("keeps the mobile page entrance free of vertical refresh drift", async () => {
  const globalCss = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );

  assert.match(
    globalCss,
    /@keyframes page-fade-in\s*\{\s*from\s*\{\s*opacity:\s*0;\s*\}\s*to\s*\{\s*opacity:\s*1;\s*\}\s*\}/,
  );
  assert.match(
    globalCss,
    /@media \(max-width: 930px\)[\s\S]*?\.site-main\s*\{[^}]*animation:\s*page-fade-in 160ms ease-out both;/,
  );
  assert.doesNotMatch(
    globalCss.match(/@keyframes page-fade-in\s*\{([\s\S]*?)\n\}/)?.[1] ?? "",
    /transform/,
  );
});

test("exports the interactive Playground snippets and primary nav order", async () => {
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  const [
    html,
    pageSource,
    playgroundCss,
    masonrySource,
    loaderSource,
    loaderCss,
    shapeSource,
    shapeCss,
    shapePlaygroundSource,
    shapePlaygroundCss,
    shapePlaygroundEngineSource,
    noseySource,
    noodlingSource,
    noodlingCss,
    globalCss,
    shapeFont,
  ] = await Promise.all([
    readFile(new URL("playground/index.html", outputRoot), "utf8"),
    readFile(new URL("../app/playground/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/playground/Playground.module.css", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/playground/PlaygroundMasonry.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/loaders/LoaderPrototype.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/loaders/LoaderPrototype.module.css", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/playground/shape-typer/ShapeTyper.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../app/playground/shape-typer/ShapeTyper.module.css",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../app/playground/shape-typer/ShapePlaygroundPreview.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../app/playground/shape-typer/ShapePlaygroundPreview.module.css",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../app/playground/shape-typer/shapePlaygroundEngine.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../app/nosey-ai/NoseyPrototype.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../app/playground/noodling/NoodlingSnippet.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../app/playground/noodling/NoodlingSnippet.module.css",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../app/playground/shape-typer/Shapes-Regular-091025.ttf",
        import.meta.url,
      ),
    ),
  ]);
  const primaryLists = [
    ...html.matchAll(/<ul class="workspace-nav__primary">([\s\S]*?)<\/ul>/g),
  ];
  const playgroundBranch =
    noseySource.match(
      /if \(variant === "playground"\) \{([\s\S]*?)\n\s{2}\}\n\n\s{2}return \(/,
    )?.[1] ?? "";
  const sourcePrototypeOrder = [
    ...pageSource.matchAll(/data-prototype="([^"]+)"/g),
  ].map((match) => match[1]);
  const exportedPrototypeNames = [
    ...html.matchAll(/data-prototype="([^"]+)"/g),
  ].map((match) => match[1]);
  const shapeTileStart = html.indexOf('data-prototype="shape-typer"');
  const loaderTileStart = html.indexOf('data-prototype="loaders"');
  const noseyTileStart = html.indexOf('data-prototype="nosey-ai"');
  const redditTileStart = html.indexOf('data-prototype="reddit-icons"');
  const shapePlaygroundTileStart = html.indexOf(
    'data-prototype="shape-playground"',
  );
  const noodlingTileStart = html.indexOf('data-prototype="noodling"');

  assert.ok(shapeTileStart >= 0);
  assert.ok(loaderTileStart >= 0);
  assert.ok(shapePlaygroundTileStart >= 0);
  assert.ok(noodlingTileStart >= 0);
  assert.ok(noseyTileStart >= 0);
  assert.ok(redditTileStart >= 0);
  const shapeTileHtml = html.slice(shapeTileStart, shapePlaygroundTileStart);
  const loaderTileHtml =
    html.match(
      /<section[^>]*data-prototype="loaders"[\s\S]*?<\/section>/,
    )?.[0] ?? "";
  const loaderTileSource =
    pageSource.match(
      /<section[\s\S]*?data-prototype="loaders"[\s\S]*?<\/section>/,
    )?.[0] ?? "";
  const noodlingTileHtml =
    html.match(
      /<section[^>]*data-prototype="noodling"[\s\S]*?<\/section>/,
    )?.[0] ?? "";
  const upvoteTileHtml =
    html.match(
      /<section[^>]*data-prototype="upvote-lab"[\s\S]*?<\/section>/,
    )?.[0] ?? "";
  const playgroundRule =
    playgroundCss.match(/\.playground\s*\{([^}]*)\}/)?.[1] ?? "";
  const masonryRule =
    playgroundCss.match(/\.masonry\s*\{([^}]*)\}/)?.[1] ?? "";
  const masonryItemRule =
    playgroundCss.match(/\.masonryItem\s*\{([^}]*)\}/)?.[1] ?? "";
  const masonryReadyRule =
    playgroundCss.match(
      /\.masonry\[data-masonry-ready="true"\]\s*>\s*\.masonryItem\s*\{([^}]*)\}/,
    )?.[1] ?? "";
  const tileRule = playgroundCss.match(/\.tile\s*\{([^}]*)\}/)?.[1] ?? "";
  const upvoteTileRules = [
    ...playgroundCss.matchAll(/\.upvoteTile\s*\{([^}]*)\}/g),
  ].map((match) => match[1]);

  assert.equal(primaryLists.length, 2);
  for (const [, primaryList] of primaryLists) {
    const labels = [
      ...primaryList.matchAll(/<span class="nav-row__label">([^<]+)<\/span>/g),
    ].map((match) => match[1]);
    assert.deepEqual(labels, ["Work", "Playground", "About"]);
    assert.doesNotMatch(primaryList, />Email<|mailto:/);
  }

  assert.equal(
    (
      html.match(
        new RegExp(`href="${basePath}/playground/" aria-current="page"`, "g"),
      ) ?? []
    ).length,
    2,
  );
  assert.match(
    html,
    /<h1 id="playground-title" class="sr-only">Playground<\/h1>/,
  );
  assert.match(
    html,
    /<h2 id="shape-typer-title" class="sr-only">Shape Typer<\/h2>/,
  );
  assert.match(
    html,
    /<h2 id="loader-preview-title" class="sr-only">AMA and RPAN loader animations<\/h2>/,
  );
  assert.match(html, /<h2 id="nosey-title" class="sr-only">Nosey AI<\/h2>/);
  assert.match(
    html,
    /<h2 id="reddit-icons-playground-title" class="sr-only">Reddit icon animations<\/h2>/,
  );
  assert.match(
    html,
    /<h2 id="rplace-playground-title" class="sr-only">Interactive r\/place canvas<\/h2>/,
  );
  assert.match(
    html,
    /<h2 id="shape-playground-preview-title" class="sr-only">Shape playground<\/h2>/,
  );
  assert.match(
    html,
    /<h2 id="upvote-lab-playground-title" class="sr-only">Vote motion lab<\/h2>/,
  );
  assert.match(
    html,
    /<h2 id="reddit-seamless-playground-title" class="sr-only">Reddit seamless feed-to-post experience<\/h2>/,
  );
  assert.match(html, /<h2 id="noodling-title" class="sr-only">Noodling<\/h2>/);
  assert.equal(new Set(exportedPrototypeNames).size, sourcePrototypeOrder.length);
  for (const prototype of sourcePrototypeOrder) {
    assert.ok(exportedPrototypeNames.includes(prototype));
  }
  assert.match(html, /data-prototype="shape-typer"/);
  assert.match(html, /data-prototype="loaders"/);
  assert.match(html, /data-prototype="nosey-ai"/);
  assert.match(html, /data-prototype="reddit-icons"/);
  assert.match(html, /data-prototype="rplace"/);
  assert.match(html, /data-prototype="noodling"/);
  assert.match(html, /data-prototype="shape-playground"/);
  assert.match(html, /data-prototype="upvote-lab"/);
  assert.match(html, /data-prototype="reddit-seamless"/);
  assert.deepEqual(sourcePrototypeOrder, [
    "shape-typer",
    "shape-playground",
    "noodling",
    "nosey-ai",
    "loaders",
    "reddit-icons",
    "rplace",
    "upvote-lab",
    "reddit-seamless",
  ]);
  assert.deepEqual(exportedPrototypeNames, sourcePrototypeOrder);
  assert.deepEqual(
    [...pageSource.matchAll(/data-company="([^"]+)"/g)].map(
      (match) => match[1],
    ),
    [
      "notion",
      "notion",
      "notion",
      "notion",
      "reddit",
      "reddit",
      "reddit",
      "reddit",
      "reddit",
    ],
  );
  assert.match(pageSource, /data-company="notion"/);
  assert.match(pageSource, /data-company="reddit"/);
  assert.match(html, /data-company="notion"/);
  assert.match(html, /data-company="reddit"/);
  assert.equal(
    sourcePrototypeOrder.filter((prototype) => prototype === "loaders").length,
    1,
  );
  assert.match(html, /data-upvote-lab="true"/);
  assert.match(html, /data-variant="playground"/);
  assert.doesNotMatch(html, /reddit-prototype-page/);
  assert.equal((html.match(/<main\b/g) ?? []).length, 1);
  assert.ok(html.includes(`${basePath}/upvote-lab/post-v2-still.png`));
  assert.match(upvoteTileHtml, /data-upvote-lab="true"/);
  assert.match(upvoteTileHtml, /data-variant="playground"/);
  assert.match(upvoteTileHtml, /upvote-lab\/post-v2-still\.png/);
  assert.match(upvoteTileHtml, /aria-label="(?:Upvote|Downvote)"/);
  assert.doesNotMatch(
    upvoteTileHtml,
    /aria-label="(?:Prototype controls|One person leaves|One person joins|Reset prototype|12 people here now)"|Replay current Random motion|here now/,
  );
  assert.match(html, /data-reddit-seamless-variant="playground"/);
  assert.match(html, /data-device-frame/);
  assert.match(
    html,
    /aria-label="Open For the first time, one of our kittens climbed out of their box today\."/,
  );
  assert.doesNotMatch(html, /Slow motion|Prototype playback controls/);
  assert.doesNotMatch(html, /Open prototype/);
  assert.doesNotMatch(
    pageSource,
    /href=\{withBasePath\("\/reddit-seamless\/"\)\}|PrototypeLaunchIcon|prototypeLinkBadge/,
  );
  assert.match(loaderTileHtml, /data-loader-variant="playground"/);
  assert.deepEqual(
    [...loaderTileHtml.matchAll(/data-code-loader="([^"]+)"/g)].map(
      (match) => match[1],
    ),
    ["ama", "rpan"],
  );
  assert.equal((loaderTileHtml.match(/data-motion-layer=/g) ?? []).length, 10);
  assert.equal(
    (loaderTileHtml.match(/preserveAspectRatio="none"/g) ?? []).length,
    10,
  );
  assert.equal((loaderTileHtml.match(/<mask\b/g) ?? []).length, 2);
  assert.match(
    loaderTileHtml,
    /role="img" aria-label="AMA animated loader rebuilt with inline vector code"/,
  );
  assert.match(
    loaderTileHtml,
    /role="img" aria-label="RPAN animated loader rebuilt from the supplied SVG geometry"/,
  );
  assert.doesNotMatch(
    loaderTileHtml,
    /<(?:img|image|picture|video|source|canvas|iframe)\b/i,
  );
  assert.doesNotMatch(
    loaderTileHtml,
    /\.(?:gif|apng|png|jpe?g|mp4|webm)\b/i,
  );
  assert.doesNotMatch(
    loaderTileHtml,
    /<h1\b|<button\b|aria-live=|Playback controls|Restart both loaders|Pause both loaders|Play both loaders|Playback speed|Inline vectors|1\.01 s|1\.28 s/,
  );
  const loaderTileIds = [
    ...loaderTileHtml.matchAll(/\bid="([^"]+)"/g),
  ].map((match) => match[1]);
  assert.equal(new Set(loaderTileIds).size, loaderTileIds.length);
  for (const [, references] of loaderTileHtml.matchAll(
    /aria-(?:labelledby|describedby)="([^"]+)"/g,
  )) {
    for (const id of references.split(/\s+/)) {
      assert.ok(loaderTileIds.includes(id), `Missing loader preview ID: ${id}`);
    }
  }
  assert.match(html, /data-shape-playground="true"/);
  assert.match(
    html,
    /<button(?=[^>]*aria-label="Add a random shape to the playground")(?=[^>]*data-shape-count="0")(?=[^>]*disabled)[^>]*>/,
  );
  assert.match(html, /<canvas[^>]*aria-hidden="true"[^>]*>/);
  assert.doesNotMatch(html.slice(shapePlaygroundTileStart), />Reset<\/button>/);
  assert.match(shapeTileHtml, /data-shape-typer="true"/);
  assert.match(shapeTileHtml, /id="shape-typer-preview-input"/);
  assert.match(shapeTileHtml, /data-preview-editor="true"/);
  assert.match(shapeTileHtml, /aria-label="Editable animated type preview"/);
  assert.match(shapeTileHtml, /Make with Notion/);
  assert.equal((shapeTileHtml.match(/<textarea\b/g) ?? []).length, 1);
  assert.doesNotMatch(shapeTileHtml, /<button\b/);
  assert.doesNotMatch(shapeTileHtml, /aria-label="Shape typer controls"/);
  assert.doesNotMatch(shapeTileHtml, /id="shape-typer-text"/);
  assert.doesNotMatch(shapeTileHtml, />Replay<\/button>/);
  assert.doesNotMatch(shapeTileHtml, /id="color-seed"/);
  assert.doesNotMatch(shapeTileHtml, /data-alignment=/);
  assert.doesNotMatch(shapeTileHtml, /data-playback-rate=/);
  assert.doesNotMatch(
    shapeTileHtml,
    /Color seed|Keep as shape|Retain selected|Playback speed/,
  );
  assert.doesNotMatch(html, /aria-label="Animation playback controls"/);
  assert.doesNotMatch(
    html,
    /aria-label="(?:Pause animation|Play animation|Replay current animation)"/,
  );
  assert.doesNotMatch(
    html,
    /class="project-heading"|Motion case study|Choose a state|>All work</,
  );
  assert.doesNotMatch(pageSource, /<main\b/);
  assert.match(
    pageSource,
    /import \{ LoaderPrototype \} from "\.\.\/loaders\/LoaderPrototype"/,
  );
  assert.match(pageSource, /<LoaderPrototype variant="playground" \/>/);
  assert.doesNotMatch(
    pageSource,
    /createMotionAnimations|createLoaderTransport|amaPaths|rpanGlyphPaths/,
  );
  assert.doesNotMatch(loaderTileSource, /<svg|<path/);
  assert.match(pageSource, /<ShapeTyper variant="preview" \/>/);
  assert.match(
    pageSource,
    /<ShapePlaygroundPreview[\s\S]*instructionsId="shape-playground-preview-instructions"/,
  );
  assert.match(pageSource, /<NoseyPrototype variant="playground"/);
  assert.match(pageSource, /<UpvoteLab variant="playground" \/>/);
  assert.match(
    pageSource,
    /import \{ RedditSeamlessPrototype \} from "\.\.\/reddit-seamless\/RedditSeamlessPrototype"/,
  );
  assert.match(
    pageSource,
    /<RedditSeamlessPrototype[\s\S]*variant="playground"[\s\S]*ariaLabelledBy="reddit-seamless-playground-title"/,
  );
  assert.doesNotMatch(pageSource, /LoopVideo|reddit-seamless-playground\.(?:mp4|jpg)/);
  assert.match(pageSource, /<NoodlingSnippet \/>/);
  assert.match(pageSource, /styles\.typerTile/);
  assert.match(pageSource, /styles\.noseyTile/);
  assert.match(
    pageSource,
    /import \{ PlaygroundMasonry \} from "\.\/PlaygroundMasonry"/,
  );
  assert.match(pageSource, /<PlaygroundMasonry>[\s\S]*<\/PlaygroundMasonry>/);
  assert.equal((html.match(/data-masonry-item/g) ?? []).length, 9);
  assert.doesNotMatch(pageSource, /styles\.(?:flow|grid|column)/);
  assert.match(
    globalCss,
    /--collection-gutter:\s*clamp\(12px,\s*1\.5vw,\s*20px\)/,
  );
  assert.match(playgroundRule, /--playground-gap:\s*var\(--collection-gutter\)/);
  assert.match(playgroundRule, /padding-block:\s*var\(--collection-gutter\)/);
  assert.match(
    globalCss,
    /\.work-page\s*\{[^}]*padding-top:\s*var\(--collection-gutter\)/s,
  );
  assert.match(
    globalCss,
    /\.portfolio-grid\s*\{[^}]*gap:\s*var\(--collection-gutter\)/s,
  );
  assert.match(masonryRule, /position:\s*relative/);
  assert.match(masonryRule, /display:\s*grid/);
  assert.match(masonryRule, /width:\s*100%/);
  assert.match(masonryRule, /gap:\s*var\(--playground-gap\)/);
  assert.match(masonryItemRule, /display:\s*grid/);
  assert.match(masonryItemRule, /min-width:\s*0/);
  assert.match(masonryReadyRule, /position:\s*absolute/);
  assert.match(masonryReadyRule, /inset:\s*0 auto auto 0/);
  assert.match(tileRule, /border-radius:\s*var\(--radius\)/);
  assert.match(masonrySource, /Math\.min\(\.\.\.columnHeights\)/);
  assert.match(masonrySource, /getComputedStyle\(root\)\.columnGap/);
  assert.match(
    masonrySource,
    /\(availableWidth - gap \* \(columnCount - 1\)\) \/ columnCount/,
  );
  assert.match(masonrySource, /columnIndex \* \(columnWidth \+ gap\)/);
  assert.match(masonrySource, /item\.getBoundingClientRect\(\)\.height/);
  assert.match(masonrySource, /y \+ itemHeights\[itemIndex\] \+ gap/);
  assert.match(
    masonrySource,
    /Math\.max\(0, Math\.max\(\.\.\.columnHeights\) - gap\)/,
  );
  assert.match(masonrySource, /typeof ResizeObserver === "undefined"/);
  assert.match(
    masonrySource,
    /window\.addEventListener\("resize", scheduleLayout\)/,
  );
  assert.match(
    masonrySource,
    /window\.removeEventListener\("resize", scheduleLayout\)/,
  );
  assert.doesNotMatch(playgroundCss, /--playground-gap:\s*12px/);
  assert.match(
    playgroundCss,
    /\.typerTile\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/s,
  );
  assert.match(
    playgroundCss,
    /\.loaderTile\s*\{[^}]*aspect-ratio:\s*2\s*\/\s*1[^}]*background:\s*#000000/s,
  );
  assert.match(
    playgroundCss,
    /\.redditSeamlessTile\s*\{[^}]*width:\s*min\(100%,\s*430px\)[^}]*aspect-ratio:\s*430\s*\/\s*898[^}]*overflow:\s*visible[^}]*border:\s*0[^}]*background:\s*transparent/s,
  );
  assert.doesNotMatch(
    playgroundCss,
    /\.redditSeamlessTile\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/s,
  );
  assert.doesNotMatch(playgroundCss, /loop-video/);
  assert.match(
    loaderCss,
    /\.playgroundPreview\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)[^}]*width:\s*100%[^}]*height:\s*100%[^}]*min-height:\s*0[^}]*gap:\s*0/s,
  );
  assert.match(
    loaderCss,
    /\.playgroundStage\s*\{[^}]*position:\s*relative[^}]*contain:\s*layout paint style[^}]*overflow:\s*hidden/s,
  );
  assert.match(loaderSource, /variant\?: "page" \| "playground"/);
  assert.match(loaderSource, /if \(variant === "playground"\)/);
  assert.match(
    loaderCss,
    /body:has\(\[data-loader-prototype="page"\]\) \.site-footer/,
  );
  assert.match(
    playgroundCss,
    /\.typerTile:focus-within\s*\{[^}]*border-color:\s*var\(--border\)/s,
  );
  assert.match(
    playgroundCss,
    /\.noseyTile\s*\{[^}]*aspect-ratio:\s*1\s*\/\s*1/s,
  );
  assert.match(
    playgroundCss,
    /\.noodlingTile\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*1/s,
  );
  assert.match(
    playgroundCss,
    /\.shapePlaygroundTile\s*\{[^}]*aspect-ratio:\s*1\s*\/\s*1[^}]*border:\s*0/s,
  );
  assert.equal(upvoteTileRules.length, 1);
  assert.match(upvoteTileRules[0], /aspect-ratio:\s*1\s*\/\s*1/);
  assert.match(upvoteTileRules[0], /border:\s*0/);
  assert.match(upvoteTileRules[0], /background:\s*transparent/);
  assert.doesNotMatch(playgroundCss, /grid-(?:row|auto-rows)\s*:/);
  assert.doesNotMatch(playgroundCss, /(?:^|[;{\s])order\s*:/m);
  assert.match(shapeSource, /type ShapeTyperVariant = "standalone" \| "project" \| "preview"/);
  assert.match(shapeSource, /const ToolRoot = isContained \? "section" : "main"/);
  assert.match(shapeSource, /\{!isPreview \? \([\s\S]*?<header/);
  assert.match(shapeSource, /\{!isPreview \? \([\s\S]*?<aside/);
  assert.match(shapeSource, /\{!isPreview \? <ShapePlayground/);
  assert.match(shapeSource, /shape-typer-limit-help/);
  assert.match(shapeSource, /MAX_TYPER_CHARACTERS/);
  assert.match(shapeSource, /createIdleReplayController/);
  assert.match(shapeSource, /new ResizeObserver/);
  assert.match(shapeCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(shapeCss, /\.embedded \.workspace\s*\{[^}]*display:\s*block/s);
  assert.match(shapeCss, /\.embedded \.preview\s*\{[^}]*9\.8cqw/s);
  assert.match(shapePlaygroundCss, /\.frame\s*\{[^}]*border:\s*0/s);
  assert.match(shapePlaygroundSource, /import\("\.\/shapePlaygroundEngine"\)/);
  assert.match(shapePlaygroundSource, /new ResizeObserver/);
  assert.match(shapePlaygroundSource, /new IntersectionObserver/);
  assert.match(shapePlaygroundSource, /visibilitychange/);
  assert.match(shapePlaygroundSource, /prefers-reduced-motion:\s*reduce/);
  assert.match(shapePlaygroundSource, /onContextMenu=\{resetFromContextMenu\}/);
  assert.match(
    shapePlaygroundSource,
    /engine\.spawn\(point\.x, point\.y, PLAYGROUND_AUTO_SPAWN_MAX_BODIES\)/,
  );
  assert.match(
    shapePlaygroundSource,
    /onResume:[\s\S]{0,160}trimToBodyLimit\([\s\S]{0,80}PLAYGROUND_AUTO_SPAWN_MAX_BODIES/,
  );
  assert.match(
    shapePlaygroundSource,
    /onPointerDownCapture=\{refreshPlaygroundAutoplay\}[\s\S]{0,150}onKeyDownCapture=\{refreshPlaygroundAutoplayFromKeyboard\}/,
  );
  assert.match(
    shapePlaygroundSource,
    /autoSpawnControllerRef\.current\?\.interact\(\)/,
  );
  assert.doesNotMatch(
    shapePlaygroundSource,
    /hasUserTakenOverRef|\.takeOver\(/,
  );
  assert.match(
    shapePlaygroundEngineSource,
    /Matter\.Engine\.create\(\{ enableSleeping: true \}\)/,
  );
  assert.match(shapePlaygroundEngineSource, /Matter\.Bodies\.fromVertices/);
  assert.match(shapePlaygroundEngineSource, /colorCycle\.next\(\)/);
  assert.match(
    shapePlaygroundEngineSource,
    /trimToBodyLimit\(requestedBodyLimit: number\)[\s\S]{0,180}trimToLimit\(playgroundBodyLimit\(requestedBodyLimit\)\);[\s\S]{0,80}draw\(\)/,
  );
  assert.match(
    shapePlaygroundEngineSource,
    /fontSizeRatio: spec\.fontSize \/ playgroundShortSide\(width, height\)/,
  );
  assert.match(
    shapePlaygroundEngineSource,
    /nextFontSize = visual\.fontSizeRatio \* nextShortSide[\s\S]{0,240}Matter\.Body\.scale\(body, bodyScale, bodyScale\)/,
  );
  assert.match(
    shapePlaygroundEngineSource,
    /Matter\.Sleeping\.set\(body, false\)/,
  );
  assert.match(
    shapeCss,
    /\.embedded \.stage:focus-within\s*\{[^}]*box-shadow:\s*none/s,
  );
  assert.ok(playgroundBranch);
  assert.match(playgroundBranch, /aria-label="Play a random Nosey state"/);
  assert.match(playgroundBranch, /aria-describedby="playground-nosey-state"/);
  assert.match(playgroundBranch, /className=\{styles\.randomStateButton\}/);
  assert.match(playgroundBranch, /className=\{styles\.playgroundStateName\}/);
  assert.match(playgroundBranch, /<output/);
  assert.match(playgroundBranch, /aria-live="polite"/);
  assert.match(playgroundBranch, /aria-atomic="true"/);
  assert.match(playgroundBranch, /onClick=\{triggerRandomState\}/);
  assert.match(playgroundBranch, /\{activeChoiceLabel\}/);
  assert.doesNotMatch(
    playgroundBranch,
    /playgroundControls|playgroundIconButton|togglePlayback|replay|<Pause|<Play|<Sparkle/,
  );
  assert.match(noodlingTileHtml, /data-noodling-snippet="true"/);
  assert.match(noodlingTileHtml, /aria-label="Compare the Noodling cadence"/);
  assert.match(noodlingTileHtml, /aria-pressed="false"/);
  assert.match(noodlingTileHtml, /data-cadence="refined"/);
  assert.match(
    noodlingTileHtml,
    /<canvas(?=[^>]*role="img")(?=[^>]*aria-label="Animated looping line for the Notion AI thinking state")[^>]*>/,
  );
  assert.equal((noodlingTileHtml.match(/<button\b/g) ?? []).length, 1);
  assert.doesNotMatch(
    noodlingTileHtml,
    /<iframe|<input|<main|Control panel|>Preview<|>About<|>Pause<|>Restart<|>Reset</,
  );
  assert.match(noodlingSource, /FOOTAGE_TIME_SCALE = 0\.75/);
  assert.match(noodlingSource, /OLD_VERSION_FAST_MULTIPLIER/);
  assert.match(
    noodlingSource,
    /Math\.min\(window\.devicePixelRatio \|\| 1, 2\)/,
  );
  assert.match(noodlingSource, /new ResizeObserver/);
  assert.match(noodlingSource, /new IntersectionObserver/);
  assert.match(noodlingSource, /new MutationObserver/);
  assert.match(noodlingSource, /visibilitychange/);
  assert.match(noodlingSource, /prefers-reduced-motion:\s*reduce/);
  assert.match(noodlingSource, /cancelAnimationFrame/);
  assert.match(noodlingSource, /aria-pressed=\{oldVersion\}/);
  assert.match(noodlingCss, /\.trigger:focus-visible/);
  assert.match(globalCss, /body:has\(\.playground-page\) \.site-footer/);
  assert.equal(shapeFont.subarray(0, 4).toString("hex"), "00010000");
  assert.equal(shapeFont.byteLength, 1_662_056);
  assert.equal(
    createHash("sha256").update(shapeFont).digest("hex"),
    "8e02d38542c66c88b811f0ca2d241a20b9ccdfee042f97c37277670b016a84f0",
  );
});

test("work routes mount the fixed interactive Nosey assistant", async () => {
  const [gridSource, assistantSource, noseySource, noseyCss, globalCss] =
    await Promise.all([
      readFile(
        new URL("../app/components/PortfolioGrid.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../app/components/NoseyAssistant.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../app/nosey-ai/NoseyPrototype.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../app/nosey-ai/NoseyPrototype.module.css",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    ]);

  assert.equal((gridSource.match(/<NoseyAssistant\s*\/>/g) ?? []).length, 1);
  assert.match(assistantSource, /lazy\(\(\) =>[\s\S]*NoseyPrototype/);
  assert.match(assistantSource, /createPortal\([\s\S]*document\.body/);
  assert.match(assistantSource, /<LazyNoseyPrototype variant="assistant"\s*\/>/);
  assert.match(noseySource, /variant\?: "assistant" \| "project" \| "playground"/);
  assert.match(noseySource, /if \(variant === "assistant"\)/);
  assert.match(noseySource, /data-frontpage-nosey="true"/);
  assert.match(noseySource, /aria-label="Play a Nosey animation"/);
  assert.match(
    noseySource,
    /<canvas[\s\S]{0,180}styles\.assistantCanvas[\s\S]{0,120}aria-hidden="true"/,
  );
  assert.match(noseySource, /onClick=\{triggerRandomState\}/);
  assert.match(noseySource, /<output className="sr-only" aria-live="polite"/);
  assert.match(noseyCss, /\.assistantPrototype\s*\{[^}]*position:\s*fixed/s);
  assert.match(
    noseyCss,
    /\.assistantPrototype\s*\{[^}]*opacity:\s*0[^}]*translateY\(84px\)/s,
  );
  assert.match(
    noseyCss,
    /\.assistantPrototype\[data-entrance="armed"\][\s\S]{0,180}animation:\s*assistant-reference-in 267ms[\s\S]{0,80}var\(--assistant-entrance-delay, 700ms\) linear both/,
  );
  assert.match(noseySource, /data-entrance=\{assistantEntranceArmed/);
  assert.match(
    noseySource,
    /setAssistantEntranceDelay\(Math\.max\(0, 700 - performance\.now\(\)\)\)/,
  );
  assert.match(noseyCss, /@keyframes assistant-reference-in/);
  assert.match(
    noseyCss,
    /6\.25%\s*\{[^}]*opacity:\s*0\.05[^}]*translateY\(70px\)/s,
  );
  assert.match(
    noseyCss,
    /50%,\s*56\.25%\s*\{[^}]*translateY\(-4px\)/s,
  );
  assert.doesNotMatch(
    noseyCss,
    /@keyframes assistant-reference-in\s*\{[\s\S]*?scale\(/,
  );
  assert.match(noseyCss, /@keyframes assistant-fade-in/);
  assert.match(noseyCss, /env\(safe-area-inset-right, 0px\)/);
  assert.match(noseyCss, /env\(safe-area-inset-bottom, 0px\)/);
  assert.match(noseyCss, /\.assistantButton:focus-visible/);
  assert.match(
    noseySource,
    /if \(event\.detail > 0\) event\.currentTarget\.blur\(\)/,
  );
  assert.doesNotMatch(
    noseyCss,
    /\.assistantButton:focus-visible\s*,[\s\S]{0,120}outline:\s*3px solid #37352f/,
  );
  assert.match(
    noseyCss,
    /\.assistantStage::before\s*\{[^}]*z-index:\s*0[^}]*inset:\s*17%[^}]*border:\s*1px solid #d7d6d2/s,
  );
  assert.match(
    noseyCss,
    /\.canvas\.assistantCanvas\s*\{[^}]*z-index:\s*1/s,
  );
  assert.match(
    noseyCss,
    /\.assistantPrototype:has\(\.assistantButton:hover\)[\s\S]{0,180}transform:\s*scale\(1\.06\)/,
  );
  assert.doesNotMatch(
    noseyCss,
    /\.assistantPrototype:has\(\.assistantButton:hover\)[\s\S]{0,180}translateY/,
  );
  assert.match(
    globalCss,
    /\.main-column:has\(\.work-page\) \.site-footer\s*\{[^}]*padding-right/s,
  );
});

test("shape playground cycles the complete brand palette before repeating", () => {
  assert.equal(SHAPE_GLYPHS.length, 62);
  assert.deepEqual(SHAPE_BRAND_COLORS, SHAPE_COLOR_VALUES);

  const values = [0.12, 0.82, 0.36, 0.61, 0.04, 0.93, 0.48, 0.27];
  let randomIndex = 0;
  const cycle = createPlaygroundColorCycle({
    random: () => values[randomIndex++ % values.length],
  });
  const colors = Array.from({ length: 24 }, () => cycle.next());

  for (let start = 0; start < colors.length; start += 4) {
    assert.deepEqual(
      new Set(colors.slice(start, start + 4)),
      new Set(SHAPE_BRAND_COLORS),
    );
  }
  colors.slice(1).forEach((color, index) => {
    assert.notEqual(color, colors[index]);
  });
});

test("shape playground keeps proportional density and separate body caps", () => {
  const midpointRandom = () => 0.5;
  const compact = createPlaygroundSpawnSpec({
    color: SHAPE_BRAND_COLORS[0],
    x: 160,
    y: 160,
    width: 320,
    height: 320,
    random: midpointRandom,
  });
  const medium = createPlaygroundSpawnSpec({
    color: SHAPE_BRAND_COLORS[0],
    x: 380,
    y: 380,
    width: 760,
    height: 760,
    random: midpointRandom,
  });
  const large = createPlaygroundSpawnSpec({
    color: SHAPE_BRAND_COLORS[0],
    x: 760,
    y: 760,
    width: 1_520,
    height: 1_520,
    random: midpointRandom,
  });
  const landscape = createPlaygroundSpawnSpec({
    color: SHAPE_BRAND_COLORS[0],
    x: 588,
    y: 252,
    width: 1_176,
    height: 504,
    random: midpointRandom,
  });
  const portrait = createPlaygroundSpawnSpec({
    color: SHAPE_BRAND_COLORS[0],
    x: 252,
    y: 588,
    width: 504,
    height: 1_176,
    random: midpointRandom,
  });
  const midpointRatio = PLAYGROUND_SHAPE_SIZE_RATIO * 0.99;

  assert.equal(PLAYGROUND_SHAPE_SIZE_RATIO, 0.34);
  assert.equal(playgroundShortSide(1_176, 504), 504);
  assert.ok(Math.abs(compact.size / 320 - midpointRatio) < 1e-12);
  assert.ok(Math.abs(medium.size / 760 - midpointRatio) < 1e-12);
  assert.ok(Math.abs(large.size / 1_520 - midpointRatio) < 1e-12);
  assert.ok(compact.size < medium.size && medium.size < large.size);
  assert.equal(landscape.size, portrait.size);
  assert.equal(PLAYGROUND_AUTO_SPAWN_MAX_BODIES, 6);
  assert.equal(PLAYGROUND_MAX_BODIES, 8);
  assert.equal(playgroundBodyLimit(6), 6);
  assert.equal(playgroundBodyLimit(), 8);
});

test("shape playground resumes autoplay after three idle seconds", () => {
  let now = 0;
  let nextTimerId = 1;
  let spawnCount = 0;
  let resumeCount = 0;
  const timers = new Map();
  const controller = createPlaygroundAutoSpawnController({
    onSpawn: () => {
      spawnCount += 1;
    },
    onResume: () => {
      resumeCount += 1;
    },
    setTimer(callback, delay) {
      const timerId = nextTimerId++;
      timers.set(timerId, { callback, dueAt: now + delay });
      return timerId;
    },
    clearTimer(timerId) {
      timers.delete(timerId);
    },
  });
  const advance = (duration) => {
    const target = now + duration;
    while (true) {
      const next = [...timers.entries()]
        .filter(([, timer]) => timer.dueAt <= target)
        .sort((left, right) => left[1].dueAt - right[1].dueAt)[0];
      if (!next) break;
      const [timerId, timer] = next;
      timers.delete(timerId);
      now = timer.dueAt;
      timer.callback();
    }
    now = target;
  };

  assert.equal(PLAYGROUND_AUTO_SPAWN_INTERVAL_MS, 1_000);
  assert.equal(PLAYGROUND_AUTOPLAY_RESUME_DELAY_MS, 3_000);
  controller.setEligible(true);
  advance(500);
  controller.setEligible(true);
  advance(499);
  assert.equal(spawnCount, 0);
  advance(1);
  assert.equal(spawnCount, 1);
  advance(1_000);
  assert.equal(spawnCount, 2);

  controller.interact();
  assert.equal(timers.size, 1);
  advance(PLAYGROUND_AUTOPLAY_RESUME_DELAY_MS - 1);
  assert.equal(resumeCount, 0);
  controller.interact();
  assert.equal(timers.size, 1);
  advance(1);
  assert.equal(resumeCount, 0);
  advance(PLAYGROUND_AUTOPLAY_RESUME_DELAY_MS - 1);
  assert.equal(resumeCount, 1);
  assert.equal(spawnCount, 2);
  assert.equal(timers.size, 1);

  advance(PLAYGROUND_AUTO_SPAWN_INTERVAL_MS);
  assert.equal(spawnCount, 3);

  controller.interact();
  controller.setEligible(false);
  assert.equal(timers.size, 0);
  advance(PLAYGROUND_AUTOPLAY_RESUME_DELAY_MS * 2);
  assert.equal(resumeCount, 1);
  controller.setEligible(true);
  advance(PLAYGROUND_AUTOPLAY_RESUME_DELAY_MS - 1);
  assert.equal(resumeCount, 1);
  advance(1);
  assert.equal(resumeCount, 2);
  assert.equal(spawnCount, 3);

  controller.dispose();
  assert.equal(timers.size, 0);
  controller.interact();
  advance(PLAYGROUND_AUTOPLAY_RESUME_DELAY_MS * 2);
  assert.equal(resumeCount, 2);
  assert.equal(spawnCount, 3);
});

test("preserves the finished Shape Typer behavior model", () => {
  const positions = Array.from({ length: 24 }, (_, index) => index);
  const pinnedColors = { 1: SHAPE_COLOR_VALUES[0], 11: SHAPE_COLOR_VALUES[3] };
  const colors = createShapeColorSequence({
    positions,
    pinnedColors,
    palette: SHAPE_COLOR_VALUES,
    seed: DEFAULT_COLOR_SEED,
  });

  assert.equal(colors[1], SHAPE_COLOR_VALUES[0]);
  assert.equal(colors[11], SHAPE_COLOR_VALUES[3]);
  positions.slice(1).forEach((position, index) => {
    assert.notEqual(colors[position], colors[positions[index]]);
  });

  const retained = Object.freeze({
    1: Object.freeze({ glyph: "a", color: "#f84a32", nudgeX: -1 }),
    11: Object.freeze({ glyph: "z", color: "#000000", nudgeX: -3 }),
  });
  assert.strictEqual(
    createRetainedShapeState(retained, true).activeShapes,
    retained,
  );
  assert.deepEqual(createRetainedShapeState(retained, false).activeShapes, {});
  assert.equal(MAX_TYPER_CHARACTERS, 180);
  assert.equal(shouldShowCharacterCount("a".repeat(149)), false);
  assert.equal(shouldShowCharacterCount("a".repeat(150)), true);
  assert.equal(Array.from(limitTyperText("😀".repeat(181))).length, 180);
  assert.deepEqual(
    resolveTyperTextEdit({
      previousText: "aaa",
      requestedText: "aaaa",
      selectionStart: 0,
      selectionEnd: 0,
      inputType: "insertText",
    }).editBounds,
    { prefixLength: 0, previousEnd: 0, nextEnd: 1 },
  );
  assert.equal(IDLE_REPLAY_INTERVAL_MS, 4_000);
});

test("themes the embedded Reddit phone canvas in dark mode", async () => {
  const [css, source, homeScreen] = await Promise.all([
    readFile(
      new URL(
        "../app/reddit-icons/RedditIconPrototype.module.css",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../app/reddit-icons/RedditIconPrototype.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../public/reddit-icons/screens/home.png", import.meta.url),
    ),
  ]);

  assert.match(
    css,
    /:global\(:root\[data-theme="dark"\]\) \.playgroundVariant,\s*:global\(:root\[data-theme="dark"\]\) \.playgroundVariant \.device\s*\{[^}]*background:\s*var\(--media-background\)/s,
  );
  assert.match(
    css,
    /@media \(prefers-color-scheme: dark\)\s*\{[\s\S]*?:global\(:root:not\(\[data-theme\]\)\) \.playgroundVariant,\s*:global\(:root:not\(\[data-theme\]\)\) \.playgroundVariant \.device\s*\{[^}]*background:\s*var\(--media-background\)/,
  );
  assert.equal(homeScreen[25], 6, "Reddit phone screen must remain RGBA");
  assert.equal(
    createHash("sha256").update(homeScreen).digest("hex"),
    "252a1e30c1776c39d3ed80a3d6e98eb2bb4db20c4b95d1909f9a0fcb28be5c24",
  );
  assert.match(source, /screenAssetVersion = "transparent-252a1e30"/);
});

test("crops the interactive Reddit phone to its bottom navigation", async () => {
  const [
    playgroundHtml,
    playgroundSource,
    playgroundCss,
    redditHtml,
    source,
    css,
  ] = await Promise.all([
    readFile(new URL("playground/index.html", outputRoot), "utf8"),
    readFile(new URL("../app/playground/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/playground/Playground.module.css", import.meta.url),
      "utf8",
    ),
    readFile(new URL("reddit-icons/index.html", outputRoot), "utf8"),
    readFile(
      new URL("../app/reddit-icons/RedditIconPrototype.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../app/reddit-icons/RedditIconPrototype.module.css",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  assert.match(
    playgroundSource,
    /<RedditIconPrototype variant="playground" \/>/,
  );
  assert.match(
    playgroundHtml,
    /data-reddit-icons="true" data-variant="playground"/,
  );
  assert.match(playgroundHtml, /aria-label="Reddit app sections"/);
  assert.match(
    playgroundCss,
    /\.redditTile\s*\{[^}]*aspect-ratio:\s*2\s*\/\s*1/s,
  );
  assert.match(css, /\.device\s*\{[^}]*aspect-ratio:\s*934\s*\/\s*1856/s);
  assert.match(
    css,
    /\.playgroundVariant \.device\s*\{[^}]*position:\s*absolute[^}]*bottom:\s*0[^}]*left:\s*50%[^}]*transform:\s*translateX\(-50%\)/s,
  );
  const indicatorCoverRule =
    css.match(/\.device::before\s*\{([^}]*)\}/)?.[1] ?? "";
  const indicatorRule =
    [...css.matchAll(/\.device::after\s*\{([^}]*)\}/g)]
      .map((match) => match[1])
      .find((rule) => /z-index:\s*4/.test(rule)) ?? "";
  assert.match(indicatorCoverRule, /z-index:\s*3/);
  assert.match(indicatorCoverRule, /top:\s*95\.0431%/);
  assert.match(indicatorCoverRule, /height:\s*0\.7005%/);
  assert.match(indicatorCoverRule, /background:\s*#fefefe/);
  assert.match(indicatorRule, /z-index:\s*4/);
  assert.match(indicatorRule, /top:\s*94\.3966%/);
  assert.match(indicatorRule, /width:\s*28\.6938%/);
  assert.match(indicatorRule, /height:\s*0\.5388%/);
  assert.match(indicatorRule, /border-radius:\s*999px/);
  assert.match(indicatorRule, /background:\s*#171b1e/);
  assert.match(
    css,
    /\.device::before,\s*\.device::after\s*\{[^}]*left:\s*49\.0364%[^}]*pointer-events:\s*none[^}]*transform:\s*translateX\(-50%\)/s,
  );
  assert.match(source, /onClick=\{\(\) => onSelect\(tab\.id\)\}/);
  assert.match(redditHtml, /data-reddit-icons="true" data-variant="page"/);
});

test("exports Your AI Team and its local Rive runtime assets", async () => {
  const html = await readFile(
    new URL("nosey-ai/index.html", outputRoot),
    "utf8",
  );
  const prototypeSource = await readFile(
    new URL("../app/nosey-ai/NoseyPrototype.tsx", import.meta.url),
    "utf8",
  );
  const assetPrefix = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(
    /\/$/,
    "",
  );
  const chunksRoot = new URL("_next/static/chunks/", outputRoot);
  const prototypeCss = await readFile(
    new URL("../app/nosey-ai/NoseyPrototype.module.css", import.meta.url),
    "utf8",
  );
  const randomButtonRule =
    prototypeCss.match(/\.randomStateButton\s*\{([^}]*)\}/)?.[1] ?? "";
  const noseyChunkName = (await readdir(chunksRoot)).find((file) =>
    file.startsWith("NoseyPrototype-"),
  );

  assert.match(html, /Your AI Team/);
  assert.match(html, /All work/);
  assert.match(html, /Motion case study/);
  assert.match(html, /Choose a state/);
  assert.doesNotMatch(
    html,
    /Interactive AI assistant|Antimatter|13 states, 23 triggers|Thinking Loop|click (?:the )?assistant/i,
  );
  assert.doesNotMatch(prototypeCss, /\.randomStateButton:hover/);
  assert.doesNotMatch(randomButtonRule, /cursor\s*:/);
  assert.match(prototypeSource, /type TransitionController/);
  assert.match(prototypeSource, /controller\.pending = choice/);
  assert.match(prototypeSource, /fireInput\(choice\.outTrigger, machineName\)/);
  assert.match(prototypeSource, /names\.some\(isIdleState\)/);
  assert.doesNotMatch(prototypeSource, /transitionBusyRef|randomFlowRef/);
  assert.equal(
    (prototypeSource.match(/\.fire\(\)/g) ?? []).length,
    1,
    "Rive triggers must share one low-level fire path",
  );
  const riveFile = await readFile(
    new URL("rive/notionai_assistant_antimatter_0414.riv", outputRoot),
  );
  const wasmFile = await readFile(new URL("rive/rive.wasm", outputRoot));
  const fallbackWasmFile = await readFile(
    new URL("rive/rive_fallback.wasm", outputRoot),
  );
  const coverFile = await readFile(
    new URL("media/your-ai-team-cover.png", outputRoot),
  );
  const coverVideo = await readFile(
    new URL("media/your-ai-team-cover.mp4", outputRoot),
  );
  assert.equal(riveFile.subarray(0, 4).toString(), "RIVE");
  assert.equal(wasmFile.subarray(0, 4).toString("hex"), "0061736d");
  assert.equal(fallbackWasmFile.subarray(0, 4).toString("hex"), "0061736d");
  assert.equal(coverFile.subarray(1, 4).toString(), "PNG");
  assert.equal(coverVideo.subarray(4, 8).toString(), "ftyp");
  assert.ok(noseyChunkName, "Missing Nosey client chunk");
  const noseyChunk = await readFile(
    new URL(noseyChunkName, chunksRoot),
    "utf8",
  );
  if (assetPrefix) assert.ok(noseyChunk.includes(assetPrefix));
  assert.ok(
    noseyChunk.includes("/rive/notionai_assistant_antimatter_0414.riv"),
  );
  assert.ok(noseyChunk.includes("/rive/rive.wasm"));
  assert.ok(noseyChunk.includes("/rive/rive_fallback.wasm"));
});

test("exports the Reddit seamless feed prototype and its local media", async () => {
  const [html, source, css, kittenGif, dogGif, kittenVideo, dogVideo] =
    await Promise.all([
      readFile(new URL("reddit-seamless/index.html", outputRoot), "utf8"),
      readFile(
        new URL(
          "../app/reddit-seamless/RedditSeamlessPrototype.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../app/reddit-seamless/RedditSeamlessPrototype.module.css",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(new URL("reddit-seamless/kitten.gif", outputRoot)),
      readFile(new URL("reddit-seamless/dog-wind.gif", outputRoot)),
      readFile(new URL("reddit-seamless/kitten.mp4", outputRoot)),
      readFile(new URL("reddit-seamless/dog-wind.mp4", outputRoot)),
    ]);

  assert.match(html, /Reddit seamless feed to post experience/);
  assert.match(
    source,
    /drag=\{closing \|\| commentsOpen \|\| reduceMotion \? false : "x"\}/,
  );
  assert.match(source, /viewerOriginPostId/);
  assert.match(source, /className=\{styles\.stickySummary\}/);
  assert.match(source, /data-feed-detail-transition/);
  assert.match(source, /const clipPath = useTransform\(transitionProgress/);
  assert.match(
    source,
    /const canvasY = useTransform\([\s\S]*?lerp\(canvasOffset, 0, progress\)/,
  );
  assert.doesNotMatch(source, /feed-detail-surface-/);
  assert.match(source, /data-detail-media=\{post\.id\}/);
  assert.match(source, /data-viewer-media=\{post\.id\}/);
  assert.match(source, /function ViewerOpenTransitionLayer/);
  assert.match(source, /function ViewerCloseTransitionLayer/);
  assert.match(source, /setViewerDirection\(0\)/);
  assert.match(source, /layoutScroll/);
  assert.doesNotMatch(source, /scale: 0\.985/);
  assert.match(
    source,
    /data-screen="detail"[\s\S]*?initial=\{false\}[\s\S]*?animate=\{\{ opacity: 1 \}\}/,
  );
  assert.match(source, /role="switch"/);
  assert.match(source, /current === 1 \? 0\.25 : 1/);
  assert.match(source, /video\.playbackRate = playbackRate/);
  assert.match(css, /\.viewerCommentsSheet\s*\{[\s\S]*?top: 372px;/);
  assert.match(css, /\.feedDetailTransitionScrim/);
  assert.match(css, /\.feedDetailTransitionMask/);
  assert.match(css, /data-playback-rate="0\.25"/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.equal(kittenGif.subarray(0, 6).toString(), "GIF89a");
  assert.equal(dogGif.subarray(0, 6).toString(), "GIF89a");
  assert.equal(kittenVideo.subarray(4, 8).toString(), "ftyp");
  assert.equal(dogVideo.subarray(4, 8).toString(), "ftyp");
});

test("exports the simplified code-built vote motion snippet", async () => {
  const [
    html,
    source,
    codeMotionSource,
    voteColorsSource,
    votePathsSource,
    pageSource,
    css,
    officialVoteSvg,
    stoiseAvatar,
    upvoteGif,
    quickBurstGif,
    downvoteGif,
    presenceGif,
    postV2Still,
    postV2Gif,
  ] = await Promise.all([
    readFile(new URL("upvote-lab/index.html", outputRoot), "utf8"),
    readFile(
      new URL("../app/upvote-lab/UpvoteLab.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/upvote-lab/CodeVoteMotion.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/upvote-lab/voteColors.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/upvote-lab/votePaths.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/upvote-lab/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/upvote-lab/UpvoteLab.module.css", import.meta.url),
      "utf8",
    ),
    readFile(new URL("upvote-lab/reddit-upvote-dark.svg", outputRoot), "utf8"),
    readFile(new URL("upvote-lab/stoise-avatar.png", outputRoot)),
    readFile(new URL("upvote-lab/upvote-button-1.gif", outputRoot)),
    readFile(new URL("upvote-lab/upvote-quick-burst.gif", outputRoot)),
    readFile(new URL("upvote-lab/downvote.gif", outputRoot)),
    readFile(new URL("upvote-lab/presence.gif", outputRoot)),
    readFile(new URL("upvote-lab/post-v2-still.png", outputRoot)),
    readFile(new URL("upvote-lab/post-v2-reference.gif", outputRoot)),
  ]);

  assert.match(html, /Vote motion lab/);
  assert.match(html, /reddit-prototype-page/);
  assert.equal((html.match(/<main\b/g) ?? []).length, 1);
  assert.match(html, /aria-label="Prototype controls"/);
  assert.match(html, /aria-label="12 people here now"/);
  assert.match(html, /aria-label="One person leaves"/);
  assert.match(html, /aria-label="One person joins"/);
  assert.match(html, /aria-label="Replay current Random motion: Default"/);
  assert.match(html, /aria-label="Reset prototype"/);
  assert.doesNotMatch(source, /<main\b/);
  assert.match(
    css,
    /\.prototype\.playgroundVariant\s*\{[^}]*height:\s*100%[^}]*min-height:\s*0[^}]*padding:\s*0[^}]*background:\s*transparent[^}]*container-type:\s*inline-size/s,
  );
  assert.match(
    css,
    /\.playgroundVariant \.snippet\s*\{[^}]*width:\s*100%[^}]*height:\s*100%[^}]*gap:\s*0/s,
  );
  assert.doesNotMatch(css, /\.playgroundVariant \.utilityButton/);
  assert.match(
    source,
    /\{!embedded \? \([\s\S]*?<div className=\{styles\.snippetControls\}/,
  );
  assert.match(source, /function nextVoteState/);
  assert.match(
    voteColorsSource,
    /UPVOTE_ARROW_COLOR = "#FE4400"/,
  );
  assert.match(voteColorsSource, /UPVOTE_COUNTER_COLOR = "#C84721"/);
  assert.match(voteColorsSource, /DOWNVOTE_COLOR = "#685DF6"/);
  assert.match(
    source,
    /const VOTE_ARROW_COLORS = \{[\s\S]*?up: UPVOTE_ARROW_COLOR,[\s\S]*?down: DOWNVOTE_COLOR/,
  );
  assert.match(
    source,
    /const VOTE_COUNTER_COLORS = \{[\s\S]*?up: UPVOTE_COUNTER_COLOR,[\s\S]*?down: DOWNVOTE_COLOR/,
  );
  assert.match(source, /color: VOTE_ARROW_COLORS\[direction\]/);
  assert.match(source, /color: VOTE_COUNTER_COLORS\[voteState\]/);
  assert.match(
    codeMotionSource,
    /down:\s*\{[\s\S]*?fills: repeated\(DOWNVOTE_COLOR, downY\.length\)/,
  );
  assert.doesNotMatch(codeMotionSource, /#5279a4/i);
  assert.match(source, /data-state=\{voteState\}/);
  assert.doesNotMatch(source, /settledVoteColor|settledKind/);
  assert.match(source, /function RollingNumber/);
  assert.match(source, /function PresenceRail/);
  assert.match(source, /useReducedMotion/);
  assert.match(source, /from "\.\/CodeVoteMotion"/);
  assert.match(
    source,
    /<CodeVoteMotion[\s\S]*?kind=\{motionRun\.kind\}/,
  );
  assert.doesNotMatch(source, /StudyPreviewRun|studyPreviewRun|triggerStudyPreview|mode="preview"/);
  assert.match(source, /aria-haspopup="menu"/);
  assert.match(source, /aria-expanded=\{motionMenuOpen\}/);
  assert.match(source, /role="menu"/);
  assert.match(source, /role="menuitemradio"/);
  assert.match(source, /aria-checked=\{selected\}/);
  assert.match(source, /onClick=\{\(\) => selectMotion\(option\.id\)\}/);
  assert.match(source, /id: "lift",[\s\S]*?name: "Default"/);
  assert.doesNotMatch(source, /Rounded lift/);
  assert.match(
    source,
    /const motionMenuOptions = \[randomOption, \.\.\.studies\] as const/,
  );
  assert.match(source, /name: "Random"/);
  assert.match(source, /Cycles through every motion/);
  assert.match(source, /useState<MotionSelectionId>\("random"\)/);
  assert.match(source, /useRef<StudyId>\("lift"\)/);
  assert.match(source, /function nextCycledStudy\(currentStudyId: StudyId\): Study/);
  assert.match(source, /studies\[\(currentIndex \+ 1\) % studies\.length\]/);
  assert.doesNotMatch(source, /Math\.random/);
  assert.match(
    source,
    /direction === "up" &&[\s\S]*?nextState === "up" &&[\s\S]*?motionSelection === "random"/,
  );
  assert.match(
    source,
    /cycleStudyIdRef\.current = motionStudy\.id;[\s\S]*?triggerMotion\(direction, nextState === direction, motionStudy\)/,
  );
  assert.match(source, /Random motion selected\. Starting with Default\./);
  assert.match(
    source,
    /function resetPrototype\(\)[\s\S]*?setMotionSelection\("random"\);[\s\S]*?setStudyId\("lift"\);/,
  );
  assert.match(source, /motionMenuOptions\.length/);
  assert.match(source, /<Shuffle[\s\S]*?className=\{styles\.motionMenuRandomIcon\}/);
  assert.doesNotMatch(codeMotionSource, /\brandom\b/);
  assert.match(source, /<PresenceRail[\s\S]*?count=\{presenceCount\}/);
  assert.match(source, /function simulatePresence/);
  assert.match(codeMotionSource, /import \{ motion \} from "motion\/react"/);
  assert.match(codeMotionSource, /export type CodeVoteMotionKind/);
  assert.match(codeMotionSource, /function AnimatedArrow/);
  assert.match(codeMotionSource, /<motion\.g/);
  assert.match(
    codeMotionSource,
    /const softBaseTrack = \{[\s\S]*?transformOrigin: "50% 50%"/,
  );
  assert.match(codeMotionSource, /const keepBottomFixed =/);
  assert.match(
    codeMotionSource,
    /value \+ \(\(1 - scaleY\[index\]\) \* baseHeight\) \/ 2/,
  );
  assert.match(
    codeMotionSource,
    /const softArrowY = keepBottomFixed\([\s\S]*?sharedArrowY,[\s\S]*?sharedArrowScaleY/,
  );
  assert.match(
    codeMotionSource,
    /soft:\s*\{[\s\S]*?\.\.\.softBaseTrack[\s\S]*?fills: softArrowFills/,
  );
  assert.match(codeMotionSource, /onAnimationComplete=\{onComplete\}/);
  assert.match(
    codeMotionSource,
    /softArrowFills = \[[\s\S]*?UPVOTE_ARROW_COLOR,[\s\S]*?UPVOTE_ARROW_COLOR/,
  );
  assert.match(
    codeMotionSource,
    /<path d=\{TRACED_UPVOTE_PATH\} transform=\{track\.baseTransform\}/,
  );
  assert.doesNotMatch(codeMotionSource, /path:\s*string/);
  assert.match(codeMotionSource, /function SmallParticleBurst/);
  assert.match(codeMotionSource, /<motion\.rect/);
  assert.match(codeMotionSource, /function ExpandingRing/);
  assert.match(codeMotionSource, /function LargeParticleBurst/);
  assert.match(codeMotionSource, /<motion\.circle/);
  assert.match(codeMotionSource, /function motionCanvas/);
  assert.match(codeMotionSource, /export function VoteMotionThumbnail/);
  assert.match(codeMotionSource, /const thumbnailFrames:/);
  assert.match(codeMotionSource, /data-source-frame=\{frame\.sourceFrame\}/);
  assert.match(codeMotionSource, /function ThumbnailEffects/);
  for (const [kind, sourceFrame] of [
    ["lift", 4],
    ["clean", 3],
    ["spring", 7],
    ["burst", 4],
    ["ripple", 4],
    ["soft", 4],
    ["quick-burst", 2],
  ]) {
    assert.match(
      codeMotionSource,
      new RegExp(`${kind.includes("-") ? `"${kind}"` : kind}:\\s*\\{[\\s\\S]*?sourceFrame: ${sourceFrame}`),
    );
  }
  const thumbnailSource = codeMotionSource.slice(
    codeMotionSource.indexOf("export function VoteMotionThumbnail"),
    codeMotionSource.indexOf("export function CodeVoteMotion"),
  );
  assert.doesNotMatch(thumbnailSource, /<motion\.|animate=|transition=/);
  assert.match(codeMotionSource, /data-code-motion=\{kind\}/);
  assert.doesNotMatch(codeMotionSource, /initial=\{false\}/);
  assert.match(codeMotionSource, /duration: track\.duration/);
  assert.match(codeMotionSource, /ease: "linear" as const/);
  assert.match(codeMotionSource, /times: track\.times/);
  for (const kind of [
    "lift",
    "clean",
    "spring",
    "burst",
    "ripple",
    "soft",
    "quick-burst",
    "down",
  ]) {
    assert.match(codeMotionSource, new RegExp(`["']${kind}["']|\\b${kind}:`));
  }
  assert.doesNotMatch(`${source}\n${codeMotionSource}`, /soft-6|dark-burst/);
  assert.match(source, /className=\{styles\.motionMenuThumbnail\}/);
  assert.match(
    source,
    /<VoteMotionThumbnail[\s\S]*?className=\{styles\.motionMenuThumbnailPreview\}[\s\S]*?kind=\{option\.id\}/,
  );
  assert.doesNotMatch(source, /<CodeVoteMotion[\s\S]*?mode="preview"/);
  assert.match(votePathsSource, /TRACED_UPVOTE_PATH/);
  assert.equal((votePathsSource.match(/export const/g) ?? []).length, 1);
  assert.doesNotMatch(
    `${source}\n${codeMotionSource}\n${votePathsSource}`,
    /ROUNDED_VOTE_OUTLINE_PATH|REDDIT_ACTIVE_VOTE_PATH/,
  );
  assert.doesNotMatch(source, /motionDuration/);
  assert.match(source, /onComplete=\{\(\) => onMotionComplete\(motionRun\.id\)\}/);
  assert.match(
    source,
    /requestAnimationFrame\(\(\) => \{[\s\S]*?run\?\.id === id \? null : run/,
  );
  assert.doesNotMatch(source, /motionRun\.duration/);
  assert.match(source, /onPointerDown=\{\(event\) =>/);
  assert.doesNotMatch(source, /assetUrl\(study\.sourceFile\)/);
  assert.doesNotMatch(source, /\?play=\$\{studyPreviewRun\.id\}/);
  assert.doesNotMatch(source, /\b(?:motionFile|sourceRunId|triggerSourcePreview)\b/);
  assert.doesNotMatch(
    `${source}\n${pageSource}`,
    /upvoting-fire-alpha\.png|downvote-fire-alpha\.png|upvote-button-[1-6]-alpha\.png/,
  );
  assert.doesNotMatch(
    `${source}\n${pageSource}`,
    /new Image\(|image\.decode\(|rel="preload"/,
  );
  assert.doesNotMatch(
    codeMotionSource,
    /<img\b|\.gif\b|\.apng\b|(?:fire-)?alpha\.png|assetUrl\(/i,
  );
  assert.equal((source.match(/<img\b/g) ?? []).length, 3);
  assert.doesNotMatch(source, /assetUrl\(selectedReference\.file\)/);
  assert.doesNotMatch(source, /referenceRun|selectedReference|activeReference/);
  assert.match(source, /post-v2-still\.png/);
  assert.match(source, /assetUrl\("stoise-avatar\.png"\)/);
  assert.match(source, /className=\{styles\.referenceCanvas\}/);
  assert.match(source, /className=\{styles\.referenceActionBar\}/);
  assert.match(source, /assetUrl\("reddit-upvote-dark\.svg"\)/);
  assert.match(source, /data-official-outline/);
  assert.doesNotMatch(source, /outlineClipId|clipPathUnits|strokeWidth="28"/);
  assert.doesNotMatch(source, /scale\(\.88\)/);
  assert.match(source, /114 Comments/);
  assert.match(source, /const baseScore = 256;/);
  assert.match(source, /function formatScore/);
  assert.match(source, /function formatScore\(value: number\) \{\s*return String\(value\);\s*\}/);
  assert.doesNotMatch(source, /2\.2k|Math\.floor\(value \/ 10\)/);
  assert.match(source, /data-character=\{digit\}/);
  assert.doesNotMatch(
    source,
    /ArrowFatUp|ArrowFatDown|glyphAnimation|whileTap=/,
  );
  assert.doesNotMatch(source, /scale:/);
  assert.doesNotMatch(css, /mix-blend-mode|voteButton:has/);
  assert.match(
    css,
    /\.tracedVoteArrow\s*\{[\s\S]*?object-fit:\s*contain;[\s\S]*?object-position:\s*center;/,
  );
  assert.match(
    css,
    /\.tracedVoteArrow\[data-official-outline\]\s*\{[\s\S]*?width:\s*38\.46%;/,
  );
  assert.match(css, /aspect-ratio:\s*1/);
  assert.match(
    css,
    /\.postCard\s*\{[\s\S]*?overflow:\s*visible;[\s\S]*?background:\s*transparent;/,
  );
  const referenceCanvasRule =
    css.match(/\.referenceCanvas\s*\{([^}]*)\}/)?.[1] ?? "";
  const referenceCardFrameRule =
    css.match(/\.referenceCardFrame\s*\{([^}]*)\}/)?.[1] ?? "";
  const referenceCardStrokeRule =
    css.match(/\.referenceCanvas::after\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.match(referenceCanvasRule, /--card-inset-top:\s*8\.4286574cqw/);
  assert.match(referenceCanvasRule, /--card-inset-right:\s*8\.4888621cqw/);
  assert.match(referenceCanvasRule, /--card-inset-bottom:\s*8\.4888621cqw/);
  assert.match(referenceCanvasRule, /--card-inset-left:\s*8\.4286574cqw/);
  assert.match(referenceCanvasRule, /--card-radius:\s*3\.6122818cqw/);
  assert.match(
    referenceCardFrameRule,
    /clip-path:\s*inset\([\s\S]*?var\(--card-inset-top\)[\s\S]*?var\(--card-inset-right\)[\s\S]*?var\(--card-inset-bottom\)[\s\S]*?var\(--card-inset-left\) round var\(--card-radius\)/,
  );
  assert.match(
    referenceCardStrokeRule,
    /inset:[\s\S]*?var\(--card-inset-top\)[\s\S]*?var\(--card-inset-right\)[\s\S]*?var\(--card-inset-bottom\)[\s\S]*?var\(--card-inset-left\)/,
  );
  assert.match(referenceCardStrokeRule, /border:\s*1px solid var\(--card-stroke\)/);
  assert.match(referenceCardStrokeRule, /border-radius:\s*var\(--card-radius\)/);
  assert.match(
    css,
    /\.referenceAuthorAvatar\s*\{[\s\S]*?top:\s*10\.8368453cqw;[\s\S]*?left:\s*12\.5225768cqw;[\s\S]*?width:\s*4\.3347381cqw;[\s\S]*?height:\s*4\.3347381cqw;[\s\S]*?border-radius:\s*50%;[\s\S]*?object-fit:\s*cover;/,
  );
  assert.match(css, /\.referenceCanvas\s*\{[\s\S]*?top:\s*-9\.4555874%;/);
  assert.match(css, /\.referenceCanvas\s*\{[\s\S]*?left:\s*-9\.4555874%;/);
  assert.match(css, /\.referenceCanvas\s*\{[\s\S]*?width:\s*118\.982808%;/);
  assert.match(
    css,
    /\.motionMenuTrigger\s*\{[\s\S]*?top:\s*12\.8838049cqw;[\s\S]*?left:\s*86\.2131246cqw;/,
  );
  assert.match(css, /\.motionMenu\[hidden\]\s*\{[\s\S]*?display:\s*none;/);
  assert.match(
    css,
    /\.motionMenuItem\s*\{[\s\S]*?grid-template-columns:\s*32px minmax\(0, 1fr\) 18px;/,
  );
  assert.match(
    css,
    /\.motionMenuThumbnail\s*\{[\s\S]*?width:\s*32px;[\s\S]*?height:\s*32px;/,
  );
  assert.match(
    css,
    /\.motionMenuThumbnailPreview\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;/,
  );
  assert.match(
    css,
    /\.referenceVotePill,[\s\S]*?\.referenceCommentPill,[\s\S]*?\.referenceSharePill\s*\{[\s\S]*?height:\s*7\.04cqw;/,
  );
  assert.match(css, /font-family:\s*"SF Pro Text", "SF Pro Display"/);
  assert.match(css, /\.referenceActionMask\s*\{[\s\S]*?background:\s*#ffffff;/);
  assert.doesNotMatch(css, /#d5f5fe|\.referenceVoteButton::before/);
  assert.doesNotMatch(css, /\.postMedia|\.postSignals|\.voteCluster/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.equal(upvoteGif.subarray(0, 6).toString(), "GIF89a");
  assert.equal(quickBurstGif.subarray(0, 6).toString(), "GIF89a");
  assert.equal(downvoteGif.subarray(0, 6).toString(), "GIF89a");
  assert.equal(presenceGif.subarray(0, 6).toString(), "GIF89a");
  assert.equal(
    createHash("sha256").update(officialVoteSvg.trim()).digest("hex"),
    "4c1c49ce361dd4257f107c57ce999bc50c8c22313faaeb7edd9b488ff3d1fc66",
  );
  assert.equal(stoiseAvatar.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(stoiseAvatar.readUInt32BE(16), 256);
  assert.equal(stoiseAvatar.readUInt32BE(20), 256);
  assert.equal(
    createHash("sha256").update(stoiseAvatar).digest("hex"),
    "b4be5d320718a5e62a32e756a628dbbae500c42f94fb47937b50c0adca151ed6",
  );
  assert.equal(postV2Still.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(postV2Still.readUInt32BE(16), 1661);
  assert.equal(postV2Still.readUInt32BE(20), 1661);
  assert.equal(postV2Gif.subarray(0, 6).toString(), "GIF89a");
});

test("exports every legacy portfolio route as static HTML", async () => {
  await access(new URL("index.html", outputRoot));
  for (const route of routes) {
    await access(new URL(`${route}/index.html`, outputRoot));
  }
  await access(new URL(".nojekyll", outputRoot));
  await access(new URL("robots.txt", outputRoot));
  await access(new URL("sitemap.xml", outputRoot));
});

test("exports synchronized code-built loader prototypes", async () => {
  const [
    html,
    source,
    motionSource,
    geometrySource,
    generatorSource,
    css,
    rpanAsset,
  ] = await Promise.all([
    readFile(new URL("loaders/index.html", outputRoot), "utf8"),
    readFile(
      new URL("../app/loaders/LoaderPrototype.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/loaders/loaderMotion.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/loaders/rpanLogoGeometry.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/loaders/rpanSvgGeometry.mjs", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/loaders/LoaderPrototype.module.css", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/loaders/assets/RPAN_icon.svg", import.meta.url),
      "utf8",
    ),
  ]);
  const { buildRpanSvgGeometry, rpanSvgGeometryInternals } = await import(
    "../app/loaders/rpanSvgGeometry.mjs"
  );
  const generated = buildRpanSvgGeometry(rpanAsset);

  assert.match(html, /Loader prototypes/);
  assert.match(html, /aria-label="Playback controls"/);
  assert.match(html, /data-code-loader="ama"/);
  assert.match(html, /data-code-loader="rpan"/);
  assert.equal(html.match(/data-motion-layer=/g)?.length, 10);
  assert.equal(html.match(/preserveAspectRatio="none"/g)?.length, 10);
  assert.equal(html.match(/<mask\b/g)?.length, 2);
  assert.equal(
    html.match(/data-motion-property="rpan-a-bar-mask-dash"/g)?.length,
    1,
  );
  assert.equal(
    html.match(/data-motion-property="rpan-r-trim-mask-dash"/g)?.length,
    1,
  );
  assert.equal(
    html.match(/data-motion-property="rpan-r-body-path"/g)?.length,
    1,
  );
  assert.equal(
    html.match(/data-motion-property="rpan-a-body-path"/g)?.length,
    1,
  );
  assert.doesNotMatch(
    html,
    /rpan-(?:r-leg|a-crossbar|source-body-opacity)/,
  );

  assert.equal(
    createHash("sha256").update(rpanAsset).digest("hex"),
    "7b4042ac930689af1a96f0fa8f128de20c18949705cea74b63cfc4f28e008efa",
  );
  assert.equal(Buffer.byteLength(rpanAsset), 2234);
  assert.match(geometrySource, /RPAN_icon\.svg\?raw/);
  assert.match(geometrySource, /buildRpanSvgGeometry\(rpanSvgMarkup\)/);
  assert.doesNotMatch(
    geometrySource,
    /rShell|rLeg|aArch|rpanCrossbar|rpanRLegMaskPath|from:\s*["']/,
  );
  assert.doesNotMatch(
    source,
    /rpanSourcePaths|rpanGlyphGeometry|rpanCrossbar|rpanRLegMaskPath|source-body-opacity|mixBlendMode|plus-lighter/,
  );
  assert.doesNotMatch(source, /<image|<use|\.gif|\.mp4|\.webm/i);
  assert.match(source, /transform=\{rpanPlacement\.transform\}/);
  assert.match(source, /rpanGlyphPaths\.r/);
  assert.match(source, /d=\{rpanGlyphPaths\.p\}/);
  assert.match(source, /d=\{rpanGlyphPaths\.a\}/);
  assert.match(source, /d=\{rpanGlyphPaths\.n\}/);
  const rpanRSource =
    source.match(/function RpanR[\s\S]*?function rpanCenter/)?.[0] ?? "";
  const rpanRTrimGroup =
    rpanRSource.match(
      /<g mask=\{`url\(#\$\{trimMaskId\}\)`\}>([\s\S]*?)<\/g>/,
    )?.[1] ?? "";
  assert.match(
    rpanRSource,
    /rpanRTrimMask\.path[\s\S]*?<g mask=\{`url\(#\$\{trimMaskId\}\)`\}>[\s\S]*?d=\{rpanRTrimPath\}[\s\S]*?d=\{rpanRTrimSeam\.path\}[\s\S]*?strokeLinecap="butt"[\s\S]*?strokeWidth=\{rpanRTrimSeam\.strokeWidth\}/,
  );
  assert.equal((rpanRSource.match(/d=\{rpanRTrimPath\}/g) ?? []).length, 1);
  assert.match(rpanRTrimGroup, /d=\{rpanRTrimPath\}/);
  assert.doesNotMatch(rpanRTrimGroup, /rpanGlyphPaths\.r/);
  assert.match(
    rpanRSource,
    /<g mask=\{`url\(#\$\{trimMaskId\}\)`\}>[\s\S]*?d=\{rpanRTrimPath\}[\s\S]*?<\/g>[\s\S]*?data-motion-property="rpan-r-body-path"[\s\S]*?d=\{rpanMorphPaths\.rToP\.from\}/,
  );
  assert.doesNotMatch(rpanRSource, /bodyMaskId|maskType: "luminance"/);
  assert.match(
    source,
    /data-motion-property="rpan-r-trim-mask-dash"[\s\S]*?strokeDasharray=\{`\$\{rpanRTrimMask\.length\} 1000`\}[\s\S]*?strokeLinecap="round"/,
  );
  assert.doesNotMatch(
    rpanRSource,
    /opacity|scaleX|scaleY/,
  );
  assert.match(
    source,
    /function RpanA[\s\S]*?rpanGlyphPaths\.a[\s\S]*?rpanMorphPaths\.aToN\.from/,
  );
  const rpanASource =
    source.match(/function RpanA[\s\S]*?type RpanRProps/)?.[0] ?? "";
  assert.match(
    rpanASource,
    /if \(!animated\)[\s\S]*?<path[\s\S]*?d=\{rpanGlyphPaths\.a\}[\s\S]*?<\/RpanArtwork>/,
  );
  assert.equal((rpanASource.match(/<mask\b/g) ?? []).length, 1);
  assert.match(
    source,
    /strokeDasharray=\{`\$\{rpanABarMask\.length\} 1000`\}/,
  );
  assert.match(source, /strokeLinecap="round"/);
  assert.doesNotMatch(source, /initialTransform="/);

  assert.equal(generated.source.fill, "#ff4500");
  assert.deepEqual(generated.source.viewBox, [0, 0, 322, 320]);
  assert.deepEqual(generated.source.contourSignature, [
    20, 7, 14, 7, 19, 7, 20,
  ]);
  assert.deepEqual(generated.glyphBounds, {
    r: { x: 0, y: 0, width: 150, height: 162 },
    p: { x: 174, y: 0, width: 146, height: 162 },
    a: { x: 0, y: 164, width: 148, height: 156 },
    n: { x: 166, y: 160, width: 156, height: 160 },
  });
  assert.deepEqual(generated.placement, {
    canvasSize: 480,
    scale: 0.75,
    translateX: 119.25,
    translateY: 120,
    transform: "translate(119.25 120) scale(0.75)",
  });
  assert.notEqual(generated.morphPaths.rToP.from, generated.glyphPaths.r);
  assert.deepEqual(generated.morphPaths.rToP.signature, [15, 7]);
  assert.deepEqual(generated.morphPaths.aToN.signature, [22]);
  assert.equal(
    generated.rTrimPath,
    "M122 98C130 109.333333333333 138 120.666666666667 146 132C148 134 150 138 150 142C150 148 148 152 144 156C138 160 132 162 126 162C118 162 110 158 106 152C96.6666666666667 137.333333333333 87.3333333333333 122.666666666667 78 108C92.6666666666667 104.666666666667 107.333333333333 101.333333333333 122 98Z",
  );
  assert.deepEqual(generated.rTrimSeam, {
    path: "M78 108L122 98",
    strokeWidth: 2.4,
  });
  const [rTrimContour] = rpanSvgGeometryInternals.parseToCubics(
    generated.rTrimPath,
  );
  assert.deepEqual(rTrimContour.start, [122, 98]);
  assert.equal(rTrimContour.segments.length, 7);
  assert.deepEqual(rTrimContour.segments[5].end, [78, 108]);
  assert.deepEqual(rTrimContour.segments[6].end, [122, 98]);
  assert.equal(generated.travel.rToP, 130.5);
  assert.equal(generated.travel.aToN, 124.5);
  assert.equal(generated.aBarMask.path, "M26 257L121 257");
  assert.equal(generated.aBarMask.length, 95);
  assert.equal(generated.aBarMask.strokeWidth, 38);
  assert.equal(
    generated.rTrimMask.path,
    "M80.9161872946398 74.3742809419597L126 142",
  );
  assert.ok(Math.abs(generated.rTrimMask.length - 81.27599920129558) < 1e-10);
  assert.ok(
    Math.abs(generated.rTrimMask.strokeWidth - 50.721359549995796) <
      1e-10,
  );

  const pathNumberPattern = /-?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi;
  const pathSignature = (path) => path.replace(pathNumberPattern, "#");
  for (const pair of Object.values(generated.morphPaths)) {
    assert.equal(pathSignature(pair.from), pathSignature(pair.to));
    for (const path of [pair.from, pair.to]) {
      const coordinates = path.match(pathNumberPattern)?.map(Number) ?? [];
      assert.ok(coordinates.length > 0);
      assert.ok(coordinates.every(Number.isFinite));
    }
  }
  assert.match(
    generatorSource,
    /Straight[\s\S]*mathematically identical collinear cubics/,
  );
  assert.match(generatorSource, /function splitCubic\(/);
  assert.match(generatorSource, /splitCubicEvenly/);
  assert.match(generatorSource, /function deriveRBody\(/);
  assert.match(generatorSource, /function deriveRTrimRegion\(/);
  assert.match(generatorSource, /function deriveRTrimSeam\(/);
  assert.match(generatorSource, /function deriveRTrimMask\(/);
  assert.doesNotMatch(
    generatorSource,
    /M187 186|M130 315|L74 105|L126 94/,
  );

  assert.match(motionSource, /AMA_DURATION_MS = 1010/);
  assert.match(motionSource, /RPAN_DURATION_MS = 1280/);
  assert.match(motionSource, /MIN_COMPOSITOR_SCALE = 0\.0001/);
  assert.match(motionSource, /RPAN_MIN_MASK_DASH = 0\.01/);
  assert.match(
    motionSource,
    /const rpanFrameStarts = Array\.from\(\{ length: 33 \}, \(_, frame\) => frame \* 40\)/,
  );
  assert.match(motionSource, /"rpan-a-bar-mask-dash"/);
  assert.match(motionSource, /rpanABarMaskSamples/);
  assert.match(motionSource, /"rpan-r-trim-mask-dash"/);
  assert.match(motionSource, /rpanRTrimMaskSamples/);
  assert.doesNotMatch(
    motionSource,
    /rpan-r-leg|rpan-a-crossbar|rpanRLeg|rpanACrossbar|OpacityTrack|opacityTracks/,
  );
  assert.match(
    motionSource,
    /rpanRTrimProgressSamples[\s\S]*?\[13, 1\][\s\S]*?\[24, 0\][\s\S]*?\[32, 0\]/,
  );
  assert.match(
    motionSource,
    /rpanRBodyMorphSamples[\s\S]*?1 - remaining/,
  );
  assert.match(
    motionSource,
    /rpanABodyMorphSamples[\s\S]*?rpanLayoutBoxes\.a\.x[\s\S]*?rpanTravel\.aToN/,
  );
  assert.match(
    motionSource,
    /if \(progress <= 0\) return from;[\s\S]*?if \(progress >= 1\) return to;/,
  );
  assert.match(motionSource, /d: `path\("\$\{interpolateCompatiblePath/);
  assert.match(
    motionSource,
    /rpanRMainSamples = \[[\s\S]*?\[0, 249\.75, 112\.5\][\s\S]*?\[32, 249\.75, 112\.5\]/,
  );
  assert.match(
    motionSource,
    /rpanPWrapSamples = uniformWrapSamples[\s\S]*?\[0, 441, 0, 0\][\s\S]*?\[32, 441, 0, 0\]/,
  );
  assert.match(
    motionSource,
    /rpanRIncomingWrapSamples = uniformWrapSamples[\s\S]*?\[0, 119\.25, 112\.5, 121\.5\][\s\S]*?\[32, 119\.25, 112\.5, 121\.5\]/,
  );
  assert.match(
    motionSource,
    /rpanAMainSamples = \[[\s\S]*?\[0, 243\.75, 111\][\s\S]*?\[32, 243\.75, 111\]/,
  );
  assert.match(
    motionSource,
    /rpanNWrapSamples = uniformWrapSamples[\s\S]*?\[0, 439, 0, 0\][\s\S]*?\[32, 439, 0, 0\]/,
  );
  assert.match(
    motionSource,
    /rpanAIncomingWrapSamples = uniformWrapSamples[\s\S]*?\[0, 119\.25, 111, 117\][\s\S]*?\[32, 119\.25, 111, 117\]/,
  );
  assert.match(
    motionSource,
    /rpanABarMaskSamples = \[[\s\S]*?\[0, 0\][\s\S]*?\[32, 0\]/,
  );
  assert.match(
    motionSource,
    /rpanRTrimProgressSamples = \[[\s\S]*?\[0, 0\][\s\S]*?\[32, 0\]/,
  );
  assert.match(motionSource, /new KeyframeEffect/);
  assert.match(motionSource, /new Animation/);
  assert.match(
    motionSource,
    /const translate = \(\(center - baseCenter\) \/ track\.baseWidth\) \* 100/,
  );
  assert.match(
    motionSource,
    /Math\.abs\(scale\) < MIN_COMPOSITOR_SCALE[\s\S]*?Math\.abs\(scaleY\) < MIN_COMPOSITOR_SCALE/,
  );
  assert.match(
    motionSource,
    /scaleX\(\$\{rasterScale\.toFixed\(5\)\}\) scaleY\(\$\{rasterScaleY\.toFixed\(5\)\}\)/,
  );
  assert.match(
    motionSource,
    /Math\.max\(RPAN_MIN_MASK_DASH, dashLength\)[\s\S]*?strokeDasharray: `\$\{rasterDashLength\} 1000`/,
  );
  assert.doesNotMatch(
    motionSource,
    /scaleX\(\$\{scale\.toFixed\(5\)\}\)|scaleY\(\$\{scaleY\.toFixed\(5\)\}\)|strokeDasharray: `\$\{dashLength\} 1000`/,
  );
  assert.doesNotMatch(
    motionSource,
    /const translate = \(\(center - baseCenter\) \/ track\.canvasWidth\) \* 100/,
  );
  assert.equal((motionSource.match(/const animatesOpacity =/g) ?? []).length, 2);
  assert.equal(
    (motionSource.match(/const animatesVisibility =/g) ?? []).length,
    1,
  );
  assert.match(
    motionSource,
    /animatesVisibility \? \{ visibility \} : \{\}/,
  );
  assert.equal(
    (motionSource.match(/\.\.\.\(animatesOpacity \? \{ opacity \} : \{\}\)/g) ?? [])
      .length,
    2,
  );
  assert.match(motionSource, /setActiveAnimations:/);
  assert.match(motionSource, /let activeAnimations = new Set\(animations\)/);
  assert.match(
    motionSource,
    /activeAnimations\.has\(animation\)[\s\S]*?animation\.play\(\)/,
  );
  assert.match(source, /CSS\.supports\("d", 'path\("M0 0C0 0 1 1 1 1Z"\)'\)/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /createLoaderTransport/);
  assert.match(source, /new IntersectionObserver/);
  assert.match(source, /const RPAN_MASK_OVERSCAN = 2/);
  assert.match(
    source,
    /rpanABarMask\.bounds\.x - RPAN_MASK_OVERSCAN[\s\S]*?rpanABarMask\.bounds\.width \+ RPAN_MASK_OVERSCAN \* 2/,
  );
  assert.match(
    source,
    /rpanRTrimMask\.bounds\.x - RPAN_MASK_OVERSCAN[\s\S]*?rpanRTrimMask\.bounds\.width \+ RPAN_MASK_OVERSCAN \* 2/,
  );
  assert.match(source, /transport\.setActiveAnimations/);
  assert.match(
    source,
    /supportsVisibilityObserver[\s\S]*?\? loaderElements\.filter[\s\S]*?: loaderElements/,
  );
  assert.match(source, /visibilityObserver\?\.disconnect\(\)/);
  assert.doesNotMatch(
    source + motionSource,
    /HTMLMediaElement|<video|<source|\.gif/i,
  );

  const rpanSizingRule = css.match(
    /\.codeLoader\[data-code-loader="rpan"\]\s*\{([^}]*)\}/,
  )?.[1];
  assert.ok(rpanSizingRule);
  assert.match(rpanSizingRule, /inset:\s*6%/);
  assert.match(rpanSizingRule, /width:\s*auto/);
  assert.match(rpanSizingRule, /height:\s*auto/);
  assert.doesNotMatch(rpanSizingRule, /animation|transition|transform/);
  const stageRule = css.match(/\.stage\s*\{([^}]*)\}/)?.[1] ?? "";
  const codeLoaderRule = css.match(/\.codeLoader\s*\{([^}]*)\}/)?.[1] ?? "";
  const motionLayerRule = css.match(/\.motionLayer\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.match(stageRule, /contain:\s*layout paint style/);
  assert.match(codeLoaderRule, /contain:\s*strict/);
  assert.match(motionLayerRule, /top:\s*var\(--motion-top\)/);
  assert.match(motionLayerRule, /left:\s*var\(--motion-left\)/);
  assert.match(motionLayerRule, /width:\s*var\(--motion-width\)/);
  assert.match(motionLayerRule, /height:\s*var\(--motion-height\)/);
  assert.match(motionLayerRule, /contain:\s*layout size style/);
  assert.match(motionLayerRule, /will-change:\s*transform/);
  assert.doesNotMatch(motionLayerRule, /inset:\s*0|width:\s*100%|height:\s*100%/);
  assert.doesNotMatch(motionLayerRule, /will-change:[^;]*opacity/);
  assert.match(
    css,
    /transform-origin:\s*var\(--motion-origin-x\) var\(--motion-origin-y, 50%\)/,
  );
});
test("keeps the footer free of a divider", async () => {
  const css = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  const footerRules = [...css.matchAll(/\.site-footer\s*\{([^}]*)\}/g)].map(
    (match) => match[1],
  );

  assert.ok(footerRules.length > 0);
  for (const rule of footerRules) {
    assert.doesNotMatch(rule, /\bborder-(?:top|block-start)\s*:/);
  }
});

test("self-hosts the complete Notion Inter family", async () => {
  const css = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  const faces = [
    ["Regular", 400, "normal"],
    ["Italic", 400, "italic"],
    ["Medium", 500, "normal"],
    ["MediumItalic", 500, "italic"],
    ["SemiBold", 600, "normal"],
    ["SemiBoldItalic", 600, "italic"],
    ["Bold", 700, "normal"],
    ["BoldItalic", 700, "italic"],
  ];
  const fontFaceRules = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(
    (match) => match[1],
  );

  for (const [name, weight, style] of faces) {
    const file = `NotionInter-${name}.woff2`;
    const font = await readFile(
      new URL(`../app/fonts/${file}`, import.meta.url),
    );
    const rule = fontFaceRules.find((fontFace) => fontFace.includes(file));
    assert.equal(font.subarray(0, 4).toString(), "wOF2");
    assert.ok(rule, `Missing @font-face rule for ${file}`);
    assert.match(rule, new RegExp(`font-weight: ${weight};`));
    assert.match(rule, new RegExp(`font-style: ${style};`));
  }

  await access(new URL("../app/fonts/OFL.txt", import.meta.url));
  assert.match(css, /font-family: "Notion Inter"/);
  assert.doesNotMatch(css, /Jost|Trebuchet/);
});

test("work page contains all project links and migration-safe metadata", async () => {
  const [html, rootHtml] = await Promise.all([
    readFile(new URL("work/index.html", outputRoot), "utf8"),
    readFile(new URL("index.html", outputRoot), "utf8"),
  ]);

  for (const frontpage of [rootHtml, html]) {
    assert.match(
      frontpage,
      /<h1 id="work-heading" class="sr-only">Work<\/h1>/,
    );
    assert.doesNotMatch(frontpage, /Motion Design Works/);
    assert.doesNotMatch(
      frontpage,
      /Motion systems, launch stories, and interaction-focused work for digital products\./,
    );
    assert.doesNotMatch(frontpage, /work-eyebrow|Selected work/);
    assert.doesNotMatch(frontpage, /class="work-database-heading"/);
    assert.doesNotMatch(
      frontpage,
      /<span>Projects<\/span>|>9(?:<!-- -->)? items</,
    );
  }

  assert.match(html, /Zeyu Ren/);
  assert.match(html, /Senior Motion Designer/);
  assert.match(html, /Product Motion/);
  assert.match(html, /2025 Reel/);
  assert.match(html, /Reddit Motion Design System/);
  assert.match(html, /Nihont/);
  assert.match(html, /Your AI Team/);
  assert.match(html, /Notion AI Motion Design/);
  assert.match(html, /Make with Notion 2025/);
  assert.match(html, /href="(?:\/work)?\/make-with-notion-2025\/"/);
  assert.match(html, /href="(?:\/work)?\/notion-ai-motion-design\/"/);
  assert.match(html, /https:\/\/renzeyu\.github\.io\/work\/work\//);
  assert.match(html, /class="workspace-panel"/);
  assert.match(html, /class="project-card__meta"/);
  assert.doesNotMatch(html, /project-card__overlay/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
  assert.doesNotMatch(html, /noindex/i);
  assert.doesNotMatch(html, /cdn\.myportfolio\.com|www-ccv\.adobe\.io/i);
});

test("keeps work navigation and project cards concise", async () => {
  const [rootHtml, workHtml, navigationSource, gridSource, css] =
    await Promise.all([
      readFile(new URL("index.html", outputRoot), "utf8"),
      readFile(new URL("work/index.html", outputRoot), "utf8"),
      readFile(
        new URL("../app/components/SiteNavigation.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../app/components/PortfolioGrid.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    ]);

  for (const html of [rootHtml, workHtml]) {
    assert.equal(
      (html.match(/<p class="sidebar-label">Projects<\/p>/g) ?? []).length,
      2,
    );
    assert.doesNotMatch(html, /Project pages/);
    assert.doesNotMatch(html, /class="nav-count"|>Work\s+\d+<\/a>/);
    assert.doesNotMatch(html, /class="project-card__action"|>View<\/span>/);
    assert.match(html, /href="https:\/\/www\.linkedin\.com\/in\/zeyuren\/"/);
    assert.doesNotMatch(html, /linkedin\.com\/in\/renzeyu\//);
  }

  assert.match(navigationSource, />Projects<\/p>/);
  assert.doesNotMatch(navigationSource, /Project pages/);
  assert.doesNotMatch(navigationSource, /nav-count|portfolio\.covers\.length/);
  assert.doesNotMatch(gridSource, /project-card__action|>View</);
  assert.doesNotMatch(css, /\.nav-count\b/);
  assert.doesNotMatch(css, /\.project-card__action\b/);
});

test("assigns every project a distinct icon from the shared navigation system", async () => {
  const [html, data] = await Promise.all([
    readFile(new URL("work/index.html", outputRoot), "utf8"),
    readFile(new URL("../app/data/portfolio.json", import.meta.url), "utf8"),
  ]);
  const expectedIcons = [
    "make-with-notion",
    "ai-team",
    "notion-ai-motion",
    "reel",
    "brand-refresh",
    "ipo",
    "recap",
    "avatars",
    "rplace",
    "motion-system",
    "awards",
    "swordsmith",
  ];
  const portfolioData = JSON.parse(data);
  const renderedIcons = [
    ...html.matchAll(
      /<svg\b([^>]*)data-project-icon="([^"]+)"([^>]*)>([\s\S]*?)<\/svg>/g,
    ),
  ].map((match) => ({
    attributes: `${match[1]}${match[3]}`,
    icon: match[2],
    body: match[4],
  }));

  assert.deepEqual(
    portfolioData.covers.map((project) => project.icon),
    expectedIcons,
  );
  assert.deepEqual(
    [...new Set(renderedIcons.map(({ icon }) => icon))],
    expectedIcons,
  );

  const uniqueIconBodies = new Set();
  for (const icon of expectedIcons) {
    const copies = renderedIcons.filter((rendered) => rendered.icon === icon);
    assert.equal(
      copies.length,
      2,
      `${icon} should render in both navigation views`,
    );
    assert.match(copies[0].attributes, /aria-hidden="true"/);
    assert.equal(copies[0].body, copies[1].body);
    uniqueIconBodies.add(copies[0].body);
  }
  assert.equal(uniqueIconBodies.size, expectedIcons.length);
});

test("feathers and scrolls only overflowing project navigation labels", async () => {
  const [html, component, css] = await Promise.all([
    readFile(new URL("work/index.html", outputRoot), "utf8"),
    readFile(
      new URL("../app/components/ProjectNavLabel.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(
    html,
    /aria-label="Collectable Avatars Launch Video"[^>]*title="Collectable Avatars Launch Video"/,
  );
  assert.match(html, /class="nav-row__label project-nav-label"/);
  assert.match(html, /class="project-nav-label__track"/);
  assert.match(component, /track\.scrollWidth - viewportWidth/);
  assert.match(component, /new ResizeObserver\(measure\)/);
  assert.match(component, /document\.fonts\.ready\.then\(measure\)/);
  assert.match(component, /SCROLL_SPEED_PX_PER_SECOND = 40/);
  assert.match(component, /MIN_SCROLL_DURATION_MS = 1_700/);
  assert.match(
    css,
    /\.project-nav-label\[data-overflowing="true"\][\s\S]*?calc\(100% - 1rem\)/,
  );
  assert.match(css, /\.workspace-nav__row--project:hover[\s\S]*?150ms/);
  assert.match(css, /\.workspace-nav__row--project:focus-visible/);
  assert.match(
    css,
    /\.project-list\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/,
  );
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.project-nav-label__track[\s\S]*?transform: none !important/,
  );
  assert.match(
    css,
    /@media \(forced-colors: active\)[\s\S]*?text-overflow: ellipsis/,
  );
});

test("uses the project-row rhythm for primary navigation states", async () => {
  const css = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  const listRule =
    css.match(/\.workspace-nav__primary,\s*\.project-list\s*\{([^}]*)\}/)?.[1] ??
    "";
  const rowRule =
    css.match(
      /\.sidebar-toggle,\s*\.workspace-nav__row,\s*\.workspace-socials a\s*\{([^}]*)\}/,
    )?.[1] ?? "";

  assert.match(listRule, /display:\s*grid/);
  assert.match(listRule, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(listRule, /gap:\s*1px/);
  assert.match(rowRule, /min-height:\s*44px/);
  assert.match(rowRule, /padding:\s*6px 8px/);
  assert.match(rowRule, /border-radius:\s*8px/);
  assert.match(
    css,
    /\.workspace-nav__row\[aria-current="page"\]\s*\{[^}]*background:\s*var\(--surface-active\)/s,
  );
});

test("feathers the bottom of the overflowing desktop project list", async () => {
  const [html, navigationSource, css] = await Promise.all([
    readFile(new URL("work/index.html", outputRoot), "utf8"),
    readFile(
      new URL("../app/components/SiteNavigation.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  const shellRule =
    css.match(
      /\.desktop-sidebar \.workspace-nav-shell::after\s*\{([^}]*)\}/,
    )?.[1] ?? "";
  const activeRule =
    css.match(
      /\.desktop-sidebar \.workspace-nav-shell\[data-can-scroll-down="true"\]::after\s*\{([^}]*)\}/,
    )?.[1] ?? "";
  const navigationRule =
    css.match(/\.desktop-sidebar \.workspace-nav\s*\{([^}]*)\}/)?.[1] ??
    "";

  assert.match(
    html,
    /class="workspace-nav-shell" data-can-scroll-down="false"/,
  );
  assert.match(
    navigationSource,
    /navigation\.scrollHeight - navigation\.scrollTop - navigation\.clientHeight > 1/,
  );
  assert.match(
    navigationSource,
    /navigation\.addEventListener\("scroll", measureScrollBoundary, \{\s*passive: true/,
  );
  assert.match(navigationSource, /new ResizeObserver\(measureScrollBoundary\)/);
  assert.match(navigationSource, /document\.fonts\.ready\.then\(measureScrollBoundary\)/);
  assert.match(navigationSource, /let mounted = true/);
  assert.match(navigationSource, /if \(!mounted\) return/);
  assert.match(navigationSource, /mounted = false/);
  assert.match(shellRule, /height:\s*36px/);
  assert.match(
    shellRule,
    /background:\s*linear-gradient\(to bottom, transparent, var\(--shell\)\)/,
  );
  assert.match(shellRule, /opacity:\s*0/);
  assert.match(shellRule, /pointer-events:\s*none/);
  assert.match(activeRule, /opacity:\s*1/);
  assert.match(navigationRule, /height:\s*100%/);
  assert.match(navigationRule, /overflow:\s*hidden auto/);
  assert.match(navigationRule, /scroll-padding-bottom:\s*36px/);
  assert.match(
    css,
    /\.desktop-sidebar\[data-collapsed="true"\] \.workspace-nav-shell::after\s*\{[^}]*display:\s*none/s,
  );
  assert.match(
    css,
    /@media \(forced-colors: active\)[\s\S]*?\.desktop-sidebar \.workspace-nav-shell::after\s*\{[^}]*display:\s*none/s,
  );
});

test("supports an icon-only persistent theme switch across both navigation views", async () => {
  const [html, css, themeSource, toggleSource, navigationSource] = await Promise.all([
    readFile(new URL("work/index.html", outputRoot), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/theme.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../app/components/ThemeToggle.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/components/SiteNavigation.tsx", import.meta.url),
      "utf8",
    ),
  ]);
  const headStart = html.indexOf("<head>");
  const themeInitializer = html.indexOf("zeyuren-product-motion-theme");
  const bodyStart = html.indexOf("<body");
  const desktopStart = html.indexOf('<aside class="desktop-sidebar"');
  const desktopEnd = html.indexOf("</aside>", desktopStart);
  const desktopHtml = html.slice(desktopStart, desktopEnd);
  const mobileStart = html.indexOf('<dialog id="mobile-navigation"');
  const mobileEnd = html.indexOf("</dialog>", mobileStart);
  const mobileHtml = html.slice(mobileStart, mobileEnd);
  const sidebarButtonHtml =
    desktopHtml.match(
      /<button(?=[^>]*data-sidebar-toggle)[^>]*>[\s\S]*?<\/button>/,
    )?.[0] ?? "";
  const desktopSidebarToggle = desktopHtml.indexOf("data-sidebar-toggle");
  const desktopNav = desktopHtml.indexOf('<nav class="workspace-nav"');
  const desktopUtilities = desktopHtml.indexOf(
    '<div class="workspace-utilities"',
  );
  const desktopTheme = desktopHtml.indexOf(
    "data-theme-toggle",
    desktopUtilities,
  );
  const desktopSocials = desktopHtml.indexOf(
    '<nav class="workspace-socials"',
    desktopUtilities,
  );
  const mobileContent = mobileHtml.indexOf(
    '<div class="mobile-menu__content"',
  );
  const mobileNav = mobileHtml.indexOf(
    '<nav class="workspace-nav"',
    mobileContent,
  );
  const mobileUtilities = mobileHtml.indexOf(
    '<div class="workspace-utilities"',
    mobileContent,
  );
  const mobileTheme = mobileHtml.indexOf(
    "data-theme-toggle",
    mobileUtilities,
  );
  const mobileSocials = mobileHtml.indexOf(
    '<nav class="workspace-socials"',
    mobileUtilities,
  );
  const toggleRule = css.match(/\.theme-toggle\s*\{([^}]*)\}/)?.[1] ?? "";
  const sidebarToggleRule =
    css.match(/(?:^|\n)\.sidebar-toggle\s*\{([^}]*)\}/m)?.[1] ?? "";
  const utilitiesRule =
    css.match(/\.workspace-utilities\s*\{([^}]*)\}/)?.[1] ?? "";
  const desktopSidebarRule =
    css.match(/\.desktop-sidebar\s*\{([^}]*)\}/)?.[1] ?? "";
  const desktopSidebarInnerRule =
    css.match(/\.desktop-sidebar__inner\s*\{([^}]*)\}/)?.[1] ?? "";
  const desktopNavRule =
    css.match(/\.desktop-sidebar \.workspace-nav\s*\{([^}]*)\}/)?.[1] ?? "";
  const mobileUtilitiesRule =
    css.match(/\.mobile-menu__content \.workspace-utilities\s*\{([^}]*)\}/)?.[1] ??
    "";
  const mobileThemeRule =
    css.match(/\.mobile-menu__content \.theme-toggle\s*\{([^}]*)\}/)?.[1] ??
    "";
  const switchRule =
    css.match(/\.theme-toggle__switch\s*\{([^}]*)\}/)?.[1] ?? "";
  const moonRule =
    css.match(/\.theme-toggle__moon\s*\{([^}]*)\}/)?.[1] ?? "";
  const switchWidth = Number(
    switchRule.match(/width:\s*(\d+)px/)?.[1] ?? 0,
  );
  const switchHeight = Number(
    switchRule.match(/height:\s*(\d+)px/)?.[1] ?? 0,
  );

  assert.equal((html.match(/data-theme-toggle/g) ?? []).length, 2);
  assert.equal((html.match(/role="switch"/g) ?? []).length, 2);
  assert.equal((html.match(/aria-checked="false"/g) ?? []).length, 2);
  assert.equal((html.match(/aria-label="Dark mode"/g) ?? []).length, 2);
  assert.doesNotMatch(
    html,
    /<span[^>]*>\s*(?:Dark mode|Light mode)\s*<\/span>/i,
  );
  assert.equal((html.match(/data-theme-icon="sun"/g) ?? []).length, 2);
  assert.equal((html.match(/data-theme-icon="moon"/g) ?? []).length, 2);
  assert.equal((desktopHtml.match(/data-theme-toggle/g) ?? []).length, 1);
  assert.equal((mobileHtml.match(/data-theme-toggle/g) ?? []).length, 1);
  assert.equal((desktopHtml.match(/data-sidebar-toggle/g) ?? []).length, 1);
  assert.equal((mobileHtml.match(/data-sidebar-toggle/g) ?? []).length, 0);
  assert.match(sidebarButtonHtml, /aria-label="Collapse sidebar"/);
  assert.match(sidebarButtonHtml, /aria-pressed="false"/);
  assert.match(sidebarButtonHtml, /<span class="nav-row__label">Collapse<\/span>/);
  assert.doesNotMatch(mobileHtml, />\s*(?:Collapse|Expand)\s*</);
  assert.ok(
    desktopSidebarToggle >= 0 &&
      desktopSidebarToggle < desktopNav &&
      desktopNav < desktopUtilities &&
      desktopUtilities < desktopTheme &&
      desktopTheme < desktopSocials,
    "Desktop collapse belongs above navigation; theme belongs in bottom utilities above socials",
  );
  assert.ok(
    mobileContent >= 0 &&
      mobileContent < mobileNav &&
      mobileNav < mobileUtilities &&
      mobileUtilities < mobileTheme &&
      mobileTheme < mobileSocials,
    "Mobile theme belongs in bottom utilities above socials",
  );
  assert.match(
    navigationSource,
    /<span className="nav-row__label">\s*\{collapsed \? "Expand" : "Collapse"\}\s*<\/span>/,
  );
  assert.ok(headStart >= 0 && themeInitializer > headStart);
  assert.ok(
    bodyStart > themeInitializer,
    "Theme initializer must run before body paint",
  );
  assert.match(themeSource, /localStorage\.getItem\(storageKey\)/);
  assert.match(themeSource, /prefers-color-scheme: dark/);
  assert.match(toggleSource, /role="switch"/);
  assert.match(toggleSource, /aria-checked=\{darkModeActive\}/);
  assert.match(toggleSource, /data-theme-icon="sun"/);
  assert.match(toggleSource, /data-theme-icon="moon"/);
  assert.match(
    toggleSource,
    /localStorage\.setItem\(themeStorageKey, nextTheme\)/,
  );
  assert.match(toggleSource, /applyTheme\(nextTheme\)/);
  assert.match(toggleSource, /root\.dataset\.theme = theme/);
  assert.match(toggleSource, /root\.style\.colorScheme = theme/);
  assert.match(toggleSource, /meta\[name="theme-color"\]/);
  assert.match(toggleSource, /dispatchEvent\(/);
  assert.match(toggleSource, /addEventListener\("storage"/);
  assert.match(toggleSource, /colorScheme\.addEventListener\("change"/);
  assert.match(css, /:root\[data-theme="dark"\]\s*\{/);
  assert.doesNotMatch(css, /\.sidebar-controls\b/);
  assert.match(sidebarToggleRule, /margin-bottom:\s*12px/);
  assert.doesNotMatch(
    sidebarToggleRule,
    /\b(?:width|height):\s*44px|\bflex:\s*0 0 44px/,
  );
  assert.match(
    css,
    /\.sidebar-toggle,\s*\.workspace-nav__row,\s*\.workspace-socials a\s*\{[^}]*width:\s*100%/s,
  );
  assert.match(utilitiesRule, /margin-top:\s*auto/);
  assert.match(utilitiesRule, /flex:\s*0 0 auto/);
  assert.match(desktopSidebarRule, /overflow:\s*hidden/);
  assert.match(desktopSidebarInnerRule, /height:\s*100%/);
  assert.match(desktopSidebarInnerRule, /min-height:\s*0/);
  assert.match(desktopNavRule, /min-height:\s*0/);
  assert.match(desktopNavRule, /overflow:\s*hidden auto/);
  assert.match(mobileUtilitiesRule, /margin-top:\s*auto/);
  assert.match(toggleRule, /justify-self:\s*start/);
  assert.match(mobileThemeRule, /justify-self:\s*start/);
  assert.match(toggleRule, /min-height:\s*44px/);
  assert.doesNotMatch(css, /\.theme-toggle:hover\b/);
  assert.match(css, /\.theme-toggle__switch\s*\{/);
  assert.match(css, /\.theme-toggle__thumb\s*\{/);
  assert.match(moonRule, /right:\s*7px/);
  assert.ok(switchWidth >= 56);
  assert.ok(switchHeight >= 28);
  assert.match(css, /transform: translateX\(32px\)/);
  assert.match(
    css,
    /\.desktop-sidebar\[data-collapsed="true"\] \.theme-toggle\s*\{[^}]*display:\s*none/s,
  );
  assert.match(
    css,
    /\.desktop-sidebar\[data-collapsed="true"\][^{]*\.nav-row__label[^{]*\{[^}]*display:\s*none/s,
  );
  assert.match(
    css,
    /\.desktop-sidebar\[data-collapsed="true"\] \.sidebar-toggle,[\s\S]*?\{[^}]*justify-content:\s*center/s,
  );
  assert.match(
    css,
    /@media \(prefers-color-scheme: dark\)[\s\S]*?:root:not\(\[data-theme\]\)/,
  );
  assert.doesNotMatch(css, /color-scheme:\s*light dark/);
});

test("publishes repository-path sitemap and robots URLs", async () => {
  const sitemap = await readFile(new URL("sitemap.xml", outputRoot), "utf8");
  const robots = await readFile(new URL("robots.txt", outputRoot), "utf8");

  assert.match(
    sitemap,
    /https:\/\/renzeyu\.github\.io\/work\/work\//,
  );
  assert.match(
    sitemap,
    /https:\/\/renzeyu\.github\.io\/work\/make-with-notion-2025\//,
  );
  assert.match(
    sitemap,
    /https:\/\/renzeyu\.github\.io\/work\/playground\//,
  );
  assert.match(
    sitemap,
    /https:\/\/renzeyu\.github\.io\/work\/nosey-ai\//,
  );
  assert.match(
    sitemap,
    /https:\/\/renzeyu\.github\.io\/work\/notion-ai-motion-design\//,
  );
  assert.match(sitemap, /https:\/\/renzeyu\.github\.io\/work\/loaders\//);
  assert.match(sitemap, /https:\/\/renzeyu\.github\.io\/work\/reddit-icons\//);
  assert.match(
    sitemap,
    /https:\/\/renzeyu\.github\.io\/work\/reddit-seamless\//,
  );
  assert.match(sitemap, /https:\/\/renzeyu\.github\.io\/work\/upvote-lab\//);
  assert.match(
    robots,
    /Sitemap: https:\/\/renzeyu\.github\.io\/work\/sitemap\.xml/,
  );
  assert.doesNotMatch(sitemap, /https:\/\/zeyuren\.com\//);
});

test("about page preserves the form and accessible field labels", async () => {
  const html = await readFile(
    new URL("contact/index.html", outputRoot),
    "utf8",
  );

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
  const [datadog, reddit, notion, blackMath] = await Promise.all([
    readFile(new URL("2024-reel/index.html", outputRoot), "utf8"),
    readFile(new URL("brand-refresh-launch/index.html", outputRoot), "utf8"),
    readFile(new URL("notion-ai-motion-design/index.html", outputRoot), "utf8"),
    readFile(new URL("hatch-awards-2019/index.html", outputRoot), "utf8"),
  ]);

  assert.match(datadog, /brand-mark--datadog/);
  assert.match(datadog, /\/brand-logos\/datadog\.svg/);
  assert.match(datadog, /\/brand-logos\/datadog-dark-e9377862\.png/);
  assert.doesNotMatch(datadog, />ZR<\/span>/);
  assert.match(reddit, /brand-mark--reddit/);
  assert.match(reddit, /\/brand-logos\/reddit\.png/);
  assert.match(notion, /brand-mark--notion/);
  assert.match(notion, /\/brand-logos\/notion\.png/);
  assert.match(blackMath, /brand-mark--black-math/);
  assert.match(blackMath, /\/brand-logos\/black-math\.png/);

  for (const logo of [
    "datadog.svg",
    "datadog-dark-e9377862.png",
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
    assert.match(html, /\/brand-logos\/datadog-dark-e9377862\.png/);
  }
});

test("uses the approved symbol-only Datadog dark-mode artwork", async () => {
  const [svg, darkPng] = await Promise.all([
    readFile(
      new URL("../public/brand-logos/datadog.svg", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../public/brand-logos/datadog-dark-e9377862.png",
        import.meta.url,
      ),
    ),
  ]);

  assert.equal((svg.match(/<path\b/g) ?? []).length, 1);
  assert.match(svg, /id="datadog-mark"/);
  assert.doesNotMatch(svg, /path20188|DATADOG/);
  assert.equal(darkPng.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(darkPng.readUInt32BE(16), 512);
  assert.equal(darkPng.readUInt32BE(20), 512);
  assert.equal(darkPng[24], 8, "Dark logo must remain 8-bit");
  assert.equal(darkPng[25], 6, "Dark logo must remain an RGBA PNG");
  assert.equal(
    createHash("sha256").update(darkPng).digest("hex"),
    "e9377862f9ed3741df1aa391ea28949d687dd2ba16d71196d72bc057d06cb31d",
  );
});

test("exports the interactive Notion AI motion study and its authentic cover", async () => {
  const [
    html,
    workHtml,
    portfolioSource,
    coverPoster,
    coverVideo,
    pageSource,
    projectCss,
    workbenchSource,
    workbenchCss,
    loopVideoSource,
  ] = await Promise.all([
    readFile(new URL("notion-ai-motion-design/index.html", outputRoot), "utf8"),
    readFile(new URL("work/index.html", outputRoot), "utf8"),
    readFile(new URL("../app/data/portfolio.json", import.meta.url), "utf8"),
    readFile(
      new URL(
        "media/notion-ai-motion-design-cover.jpg",
        outputRoot,
      ),
    ),
    readFile(
      new URL(
        "media/notion-ai-motion-design-cover.mp4",
        outputRoot,
      ),
    ),
    readFile(
      new URL("../app/notion-ai-motion-design/page.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../app/notion-ai-motion-design/NoodlingProject.module.css",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../app/notion-ai-motion-design/NoodlingWorkbench.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../app/notion-ai-motion-design/NoodlingWorkbench.module.css",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../app/components/LoopVideo.tsx", import.meta.url),
      "utf8",
    ),
  ]);
  const notionCover = JSON.parse(portfolioSource).covers.find(
    ({ slug }) => slug === "notion-ai-motion-design",
  );
  const notionCard = workHtml.match(
    /<a class="project-card" href="[^"]*\/notion-ai-motion-design\/">[\s\S]*?<\/a>/,
  )?.[0];
  const tkhdIndex = coverVideo.indexOf(Buffer.from("tkhd"));
  const tkhdStart = tkhdIndex - 4;
  const tkhdSize = coverVideo.readUInt32BE(tkhdStart);
  let jpegOffset = 2;
  let posterDimensions;

  while (jpegOffset < coverPoster.length) {
    if (coverPoster[jpegOffset] !== 0xff) {
      jpegOffset += 1;
      continue;
    }

    const marker = coverPoster[jpegOffset + 1];
    jpegOffset += 2;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      posterDimensions = {
        width: coverPoster.readUInt16BE(jpegOffset + 5),
        height: coverPoster.readUInt16BE(jpegOffset + 3),
      };
      break;
    }

    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    jpegOffset += coverPoster.readUInt16BE(jpegOffset);
  }

  assert.match(html, /<h1 id="project-title">Notion AI Motion Design<\/h1>/);
  assert.match(
    html,
    /An interactive motion study of the Notion AI scribble(?:&#x27;|')s thinking cadence\./,
  );
  assert.match(html, /data-noodling-workbench="true"/);
  assert.doesNotMatch(html, /<iframe\b|renzeyu\.github\.io\/noodling/);
  assert.doesNotMatch(html, /Open prototype|View source|aria-label="Project links"/);
  assert.doesNotMatch(html, /href="https:\/\/github\.com\/renzeyu\/noodling"/);
  assert.match(html, /aria-label="Noodling controls"/);
  assert.match(html, />Pause<\/button>/);
  assert.match(html, />Restart<\/button>/);
  assert.match(html, />Reset<\/button>/);
  assert.match(html, />Old Version<\/button>/);
  assert.match(html, />Restore defaults<\/button>/);
  assert.equal((html.match(/type="number"/g) ?? []).length, 17);
  assert.equal((html.match(/type="range"/g) ?? []).length, 17);
  assert.match(
    html,
    /aria-label="Animated looping line for the AI thinking state"/,
  );
  assert.doesNotMatch(workbenchSource, /<main\b/);
  assert.match(pageSource, /<NoodlingWorkbench\s*\/>/);
  assert.match(workbenchSource, /getComputedStyle\(canvas\)\.color/);
  assert.match(workbenchSource, /new MutationObserver\(refreshColor\)/);
  assert.match(workbenchSource, /attributeFilter: \["data-theme", "style"\]/);
  assert.match(workbenchSource, /prefers-reduced-motion: reduce/);
  assert.match(workbenchSource, /new ResizeObserver/);
  assert.match(workbenchSource, /IntersectionObserver/);
  assert.match(workbenchSource, /visibilitychange/);
  assert.match(workbenchSource, /cancelAnimationFrame/);
  assert.match(workbenchCss, /var\(--surface\)/);
  assert.match(workbenchCss, /var\(--media-background\)|var\(--shell\)/);
  assert.match(workbenchCss, /var\(--ink\)/);
  assert.match(workbenchCss, /var\(--border\)/);
  assert.match(workbenchCss, /@container \(max-width: 860px\)/);
  assert.match(workbenchCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(
    projectCss,
    /\.workbenchFrame\s*\{[^}]*container-type:\s*inline-size/s,
  );
  assert.doesNotMatch(workbenchCss, /:global\((?:html|body)\)|100dvh/);
  assert.doesNotMatch(workbenchCss, /color-scheme:\s*light/);
  assert.match(
    html,
    /https:\/\/renzeyu\.github\.io\/work\/notion-ai-motion-design\//,
  );
  assert.match(html, /\/media\/notion-ai-motion-design-cover\.jpg/);
  assert.match(html, /property="og:image:width" content="960"/);
  assert.match(html, /property="og:image:height" content="540"/);
  assert.deepEqual(notionCover?.asset, {
    kind: "video",
    src: "/media/notion-ai-motion-design-cover.mp4",
    poster: "/media/notion-ai-motion-design-cover.jpg",
    width: 960,
    height: 540,
  });
  assert.match(workHtml, /Notion AI Motion Design animated cover/);
  assert.match(workHtml, /\/media\/notion-ai-motion-design-cover\.jpg/);
  assert.match(workHtml, /\/media\/notion-ai-motion-design-cover\.mp4/);
  assert.ok(notionCard);
  assert.match(notionCard, /class="loop-video"/);
  assert.match(notionCard, /style="aspect-ratio:960 \/ 540"/);
  assert.match(
    notionCard,
    /<video\b[^>]*poster="[^"]*\/media\/notion-ai-motion-design-cover\.jpg"/,
  );
  assert.doesNotMatch(notionCard, /<img\b|static-media/);
  assert.match(loopVideoSource, /withBasePath\(src\)/);
  assert.equal(coverPoster.subarray(0, 3).toString("hex"), "ffd8ff");
  assert.deepEqual(posterDimensions, { width: 960, height: 540 });
  assert.equal(
    createHash("sha256").update(coverPoster).digest("hex"),
    "35b3dbe66b756b09cb20520225342bc8c7cb5950cab3f38f933db8cb9e37d366",
  );
  assert.notEqual(
    createHash("sha256").update(coverPoster).digest("hex"),
    "5177d8694113b4ebf8de8a7a6530c3d623fe61cf00a3738e28c301b89d8d7cb9",
  );
  assert.equal(coverVideo.subarray(4, 8).toString(), "ftyp");
  assert.ok(tkhdIndex > 4);
  assert.deepEqual(
    {
      width: coverVideo.readUInt32BE(tkhdStart + tkhdSize - 8) / 65_536,
      height: coverVideo.readUInt32BE(tkhdStart + tkhdSize - 4) / 65_536,
    },
    { width: 960, height: 540 },
  );
  assert.equal(coverVideo.byteLength, 126_244);
  assert.equal(
    createHash("sha256").update(coverVideo).digest("hex"),
    "ff431073134b2ef7ae56374221372dd93bb11f94b4b6915282e8767d9b9c52ba",
  );
});

test("exports Make with Notion 2025 as an interactive Work project", async () => {
  const [
    html,
    pageSource,
    projectCss,
    shapeSource,
    shapeCss,
    playgroundSource,
    coverVideo,
    coverPoster,
  ] = await Promise.all([
    readFile(new URL("make-with-notion-2025/index.html", outputRoot), "utf8"),
    readFile(
      new URL("../app/make-with-notion-2025/page.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../app/make-with-notion-2025/MakeWithNotionProject.module.css",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../app/playground/shape-typer/ShapeTyper.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../app/playground/shape-typer/ShapeTyper.module.css",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../app/playground/shape-typer/ShapePlayground.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../public/media/make-with-notion-2025-cover.mp4",
        import.meta.url,
      ),
    ),
    readFile(
      new URL(
        "../public/media/make-with-notion-2025-cover.jpg",
        import.meta.url,
      ),
    ),
  ]);

  assert.match(html, /<h1 id="project-title">Make with Notion 2025<\/h1>/);
  assert.match(
    html,
    /An interactive typer and physics playground built from the Make with Notion 2025 alphabet\./,
  );
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.equal((html.match(/<main\b/g) ?? []).length, 1);
  assert.match(html, /data-shape-typer="true"/);
  assert.match(html, /data-shape-typer-variant="project"/);
  assert.match(html, /data-shape-playground="true"/);
  assert.match(html, /<h2 id="mwn-typer-tool-title">MWN typer tool<\/h2>/);
  assert.match(html, /aria-label="Editable animated type preview"/);
  assert.match(html, /aria-label="MWN typer tool controls"/);
  assert.match(html, /aria-label="Replay animation"/);
  assert.match(html, /aria-label="Text alignment"/);
  assert.match(html, /aria-label="Playback speed"/);
  assert.match(html, />Kept shapes</);
  assert.match(html, /id="selected-character"/);
  assert.match(html, /id="shape-nudge-x"/);
  assert.match(html, /id="shape-nudge-y"/);
  assert.match(html, /id="color-seed"/);
  assert.match(html, /id="shape-playground-title">Shape playground<\/h2>/);
  assert.match(html, /aria-label="Add a random shape to the playground"/);
  assert.match(html, /Right-click to reset/);
  assert.equal((html.match(/<canvas\b/g) ?? []).length, 1);
  assert.doesNotMatch(html, />Replay<\/button>/);
  assert.match(html, /brand-mark--notion/);
  assert.match(html, /\/brand-logos\/notion\.png/);
  assert.match(
    html,
    /https:\/\/renzeyu\.github\.io\/work\/make-with-notion-2025\//,
  );
  assert.match(html, /\/media\/make-with-notion-2025-cover\.jpg/);
  assert.match(pageSource, /<ShapeTyper variant="project" \/>/);
  assert.doesNotMatch(pageSource, /ShapePlaygroundPreview/);
  assert.match(shapeSource, /\{!isPreview \? <ShapePlayground/);
  assert.match(playgroundSource, /data-shape-playground="true"/);
  assert.match(playgroundSource, /onContextMenu=\{resetFromContextMenu\}/);
  assert.match(projectCss, /\.prototype\s*\{[^}]*width:\s*100%/s);
  assert.doesNotMatch(
    projectCss.match(/\.prototype\s*\{([^}]*)\}/)?.[1] ?? "",
    /border\s*:/,
  );
  assert.match(
    shapeCss,
    /\.playgroundFrame\s*\{[^}]*aspect-ratio:\s*1[^}]*border:\s*0/s,
  );
  assert.equal(coverVideo.subarray(4, 8).toString(), "ftyp");
  assert.equal(coverPoster.subarray(0, 3).toString("hex"), "ffd8ff");
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
  assert.ok(html.includes(`src="${basePath}/brand-logos/datadog.svg"`));
  assert.ok(
    html.includes(`src="${basePath}/brand-logos/datadog-dark-e9377862.png"`),
  );
  assert.doesNotMatch(html, /src="\/_next\//);

  const redditHtml = await readFile(
    new URL("brand-refresh-launch/index.html", outputRoot),
    "utf8",
  );
  assert.ok(redditHtml.includes(`src="${basePath}/brand-logos/reddit.png"`));

  const playgroundHtml = await readFile(
    new URL("playground/index.html", outputRoot),
    "utf8",
  );
  assert.ok(playgroundHtml.includes(`href="${basePath}/playground/"`));
  assert.ok(
    playgroundHtml.includes(
      `${basePath}/rive/notionai_assistant_antimatter_0414.riv`,
    ) || playgroundHtml.includes("NoseyPrototype-"),
  );

  const notionHtml = await readFile(
    new URL("notion-ai-motion-design/index.html", outputRoot),
    "utf8",
  );
  assert.ok(notionHtml.includes(`src="${basePath}/brand-logos/notion.png"`));
  assert.ok(
    notionHtml.includes(`${basePath}/media/notion-ai-motion-design-cover.jpg`),
  );
  assert.ok(
    html.includes(`${basePath}/media/notion-ai-motion-design-cover.jpg`),
  );

  const makeWithNotionHtml = await readFile(
    new URL("make-with-notion-2025/index.html", outputRoot),
    "utf8",
  );
  assert.ok(
    makeWithNotionHtml.includes(`src="${basePath}/brand-logos/notion.png"`),
  );
  assert.ok(
    makeWithNotionHtml.includes(
      `${basePath}/media/make-with-notion-2025-cover.jpg`,
    ),
  );

  const cssRoot = new URL("_next/static/css/", outputRoot);
  const cssFiles = (await readdir(cssRoot)).filter((file) =>
    file.endsWith(".css"),
  );
  const css = (
    await Promise.all(
      cssFiles.map((file) => readFile(new URL(file, cssRoot), "utf8")),
    )
  ).join("\n");
  assert.ok(css.includes(`url(${basePath}/_next/`));
  assert.ok(
    css.includes(`url(${basePath}/_next/static/media/NotionInter-Regular`),
  );
  assert.ok(
    css.includes(`url(${basePath}/_next/static/media/Shapes-Regular-091025`),
  );
  assert.doesNotMatch(css, /url\(\/_next\//);
  assert.doesNotMatch(css, /Jost/);
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
