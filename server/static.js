import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
export const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
};
export async function serveStatic(root, req, res) {
  const url = new URL(req.url, "http://localhost");
  const path = resolve(
    root,
    "." +
      decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname),
  );
  if (!path.startsWith(resolve(root) + sep)) {
    res.writeHead(403);
    res.end();
    return;
  }
  let body, encoding;
  const accepted = (req.headers["accept-encoding"] || "")
    .split(",")
    .map((part) => {
      const [name, ...parameters] = part.trim().split(";");
      const quality = parameters.find((value) => value.trim().startsWith("q="));
      return { name, quality: quality ? Number(quality.trim().slice(2)) : 1 };
    });
  for (const [name, suffix] of [
    ["br", ".br"],
    ["gzip", ".gz"],
  ])
    if (accepted.some((item) => item.name === name && item.quality > 0))
      try {
        body = await readFile(path + suffix);
        encoding = name;
        break;
      } catch {}
  body ||= await readFile(path);
  const headers = {
    "Content-Type": mime[extname(path)] || "application/octet-stream",
    "Cache-Control": url.pathname.startsWith("/assets/")
      ? "public, max-age=31536000, immutable"
      : "no-cache",
    Vary: "Accept-Encoding",
    "X-Content-Type-Options": "nosniff",
  };
  if (encoding) headers["Content-Encoding"] = encoding;
  res.writeHead(200, headers);
  res.end(req.method === "HEAD" ? undefined : body);
}
