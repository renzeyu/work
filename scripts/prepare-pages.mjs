import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const outputRoot = path.resolve("dist/client");
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

if (basePath) {
  const prefixedAssetRoot = path.join(outputRoot, basePath.replace(/^\/+/, ""));
  const prefixedNextRoot = path.join(prefixedAssetRoot, "_next");

  try {
    await rename(prefixedNextRoot, path.join(outputRoot, "_next"));
    await rm(prefixedAssetRoot, { force: true, recursive: true });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

const files = await readdir(outputRoot);

if (basePath) {
  for (const file of files) {
    if (!/\.(?:html|rsc)$/.test(file)) continue;
    const filePath = path.join(outputRoot, file);
    const source = await readFile(filePath, "utf8");
    const prefixed = source
      .replaceAll('href="/favicon.png"', `href="${basePath}/favicon.png"`)
      .replaceAll(
        'href":"/favicon.png"',
        `href":"${basePath}/favicon.png"`,
      )
      .replaceAll(
        'href\\":\\"/favicon.png\\"',
        `href\\":\\"${basePath}/favicon.png\\"`,
      )
      .replaceAll('href="/og.jpg"', `href="${basePath}/og.jpg"`);
    await writeFile(filePath, prefixed);
  }
}

for (const file of files) {
  if (!file.endsWith(".html") || file === "index.html" || file === "404.html") {
    continue;
  }

  const route = file.slice(0, -".html".length);
  const routeDirectory = path.join(outputRoot, route);
  await mkdir(routeDirectory, { recursive: true });
  await copyFile(path.join(outputRoot, file), path.join(routeDirectory, "index.html"));

  const rscFile = `${route}.rsc`;
  if (files.includes(rscFile)) {
    await copyFile(path.join(outputRoot, rscFile), path.join(routeDirectory, "index.rsc"));
  }
}

await writeFile(path.join(outputRoot, ".nojekyll"), "");
