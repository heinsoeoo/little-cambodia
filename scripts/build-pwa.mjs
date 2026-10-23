import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { brotliCompressSync, gzipSync } from "node:zlib";
const root = new URL("../dist/", import.meta.url);
const assets = (await readdir(new URL("assets/", root)))
  .filter((name) => /\.(js|css)$/.test(name))
  .map((name) => "/assets/" + name);
const shell = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/angkor-192.png",
  "/icons/angkor-512.png",
  ...assets,
];
const versionHash = createHash("sha256");
for (const item of shell)
  versionHash.update(
    await readFile(new URL(item === "/" ? "index.html" : item.slice(1), root)),
  );
const version = versionHash.digest("hex").slice(0, 12);
const template = await readFile(
  new URL("../src/service-worker-template.js", import.meta.url),
  "utf8",
);
await writeFile(
  new URL("sw.js", root),
  template
    .replace("__VERSION__", version)
    .replace('"__SHELL__"', JSON.stringify(shell)),
);
async function compress(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const url = new URL(item.name + (item.isDirectory() ? "/" : ""), directory);
    if (item.isDirectory()) await compress(url);
    else if (/\.(html|js|css|json|webmanifest|svg)$/.test(item.name)) {
      const body = await readFile(url);
      await writeFile(
        new URL(item.name + ".br", directory),
        brotliCompressSync(body),
      );
      await writeFile(
        new URL(item.name + ".gz", directory),
        gzipSync(body, { level: 9 }),
      );
    }
  }
}
await compress(root);
console.log(
  `Installable shell ${version}: ${assets.length} game assets, Brotli and gzip ready.`,
);
