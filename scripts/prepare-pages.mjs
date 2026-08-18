import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const outputRoot = path.resolve("dist/client");
const files = await readdir(outputRoot);
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? collectFiles(entryPath) : [entryPath];
    }),
  );
  return nested.flat();
}

if (basePath) {
  const generatedFiles = await collectFiles(outputRoot);
  for (const filePath of generatedFiles) {
    if (!/\.(?:css|html|js|rsc)$/.test(filePath)) continue;
    const source = await readFile(filePath, "utf8");
    const prefixed = source
      .replaceAll("/_next/", `${basePath}/_next/`)
      .replaceAll('href="/favicon.png"', `href="${basePath}/favicon.png"`)
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
