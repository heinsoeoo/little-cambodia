import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { brotliCompressSync } from "node:zlib";
import { serveStatic } from "../server/static.js";
test("static game assets use Brotli and immutable caching while HTML and the worker can update", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "cambodia-static-"));
  await mkdir(join(root, "assets"));
  const text = "game code ".repeat(100);
  await writeFile(join(root, "assets/test-hash.js"), text);
  await writeFile(
    join(root, "assets/test-hash.js.br"),
    brotliCompressSync(text),
  );
  await writeFile(join(root, "index.html"), "game shell");
  await writeFile(join(root, "sw.js"), "worker");
  const server = createServer((req, res) =>
    serveStatic(root, req, res).catch(() => {
      res.writeHead(404);
      res.end();
    }),
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const script = await fetch(base + "/assets/test-hash.js", {
    headers: { "accept-encoding": "br" },
  });
  assert.equal(script.headers.get("content-encoding"), "br");
  assert.match(script.headers.get("cache-control"), /immutable/);
  assert.equal(await script.text(), text);
  for (const path of ["/", "/sw.js"]) {
    const response = await fetch(base + path);
    assert.equal(response.headers.get("cache-control"), "no-cache");
  }
});
