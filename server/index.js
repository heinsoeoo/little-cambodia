import { serveStatic } from "./static.js";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { createMultiplayer } from "./multiplayer.js";
const root = fileURLToPath(new URL("../dist/", import.meta.url));
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/healthz") {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify({ ok: true, game: "little-cambodia" }));
      return;
    }
    await serveStatic(root, req, res);
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
