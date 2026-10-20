import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createMultiplayer } from "./multiplayer.js";
const root = fileURLToPath(new URL("../dist/", import.meta.url));
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost"),
      path = resolve(
        root,
        "." +
          decodeURIComponent(
            url.pathname === "/" ? "/index.html" : url.pathname,
          ),
      );
    if (!path.startsWith(root)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const body = await readFile(path);
    res.writeHead(200, {
      "Content-Type": mime[extname(path)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
const multiplayer = createMultiplayer(server);
server.listen(
  Number(process.env.PORT) || 5173,
  process.env.HOST || "127.0.0.1",
  () =>
    console.log(
      `Phnom Life is ready at http://${process.env.HOST || "127.0.0.1"}:${Number(process.env.PORT) || 5173}/`,
    ),
);
process.on("SIGTERM", () => {
  multiplayer.close();
  server.close();
});
