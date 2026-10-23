import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

test("install manifest includes home screen icons and a standalone launch", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../public/manifest.webmanifest", import.meta.url)),
  );
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  for (const size of ["192x192", "512x512"]) {
    const icon = manifest.icons.find((item) => item.sizes === size);
    assert.ok(icon);
    assert.ok(
      (await readFile(new URL(`../public${icon.src}`, import.meta.url)))
        .length > 0,
    );
  }
});

test("cached shell opens without network and multiplayer requests bypass the worker", async () => {
  const handlers = {};
  const cachedShell = new Response("cached game");
  const source = await readFile(
    new URL("../src/service-worker-template.js", import.meta.url),
    "utf8",
  );
  runInNewContext(source, {
    URL,
    self: {
      location: { origin: "https://game.example" },
      addEventListener: (name, handler) => {
        handlers[name] = handler;
      },
    },
    caches: { match: async () => cachedShell },
    fetch: () => {
      throw new Error("offline");
    },
  });
  let response;
  handlers.fetch({
    request: {
      url: "https://game.example/",
      method: "GET",
      mode: "navigate",
      headers: new Headers(),
    },
    respondWith: (promise) => {
      response = promise;
    },
  });
  assert.equal(await (await response).text(), "cached game");
  for (const path of ["/healthz", "/multiplayer"]) {
    handlers.fetch({
      request: {
        url: `https://game.example${path}`,
        method: "GET",
        headers: new Headers(),
      },
      respondWith: () => assert.fail("live state must bypass cache"),
    });
  }
});
