import { test } from "node:test";
import assert from "node:assert/strict";
import { createPwa } from "../src/pwa.js";

test("install notice respects Home Screen mode, Later and native installation without blocking manual help", async (t) => {
  const names = [
    "document",
    "navigator",
    "matchMedia",
    "addEventListener",
    "localStorage",
  ];
  const originals = new Map(
    names.map((name) => [
      name,
      Object.getOwnPropertyDescriptor(globalThis, name),
    ]),
  );
  t.after(() => {
    for (const [name, value] of originals) {
      if (value) Object.defineProperty(globalThis, name, value);
      else delete globalThis[name];
    }
  });
  const nodes = new Map(),
    handlers = {},
    storage = new Map();
  let standalone = false,
    opened = 0,
    prompted = 0;
  const node = (id) => {
    if (!nodes.has(id))
      nodes.set(id, { hidden: true, addEventListener() {}, focus() {} });
    return nodes.get(id);
  };
  const button = node("install-button");
  const mocks = {
    document: { getElementById: node, querySelectorAll: () => [button] },
    navigator: { onLine: true, userAgent: "iPhone" },
    matchMedia: () => ({ matches: standalone }),
    addEventListener: (name, handler) => (handlers[name] = handler),
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
  };
  for (const [name, value] of Object.entries(mocks))
    Object.defineProperty(globalThis, name, { configurable: true, value });
  createPwa({ onOpen: () => opened++ });
  assert.equal(node("install-notice").hidden, false);
  node("install-later").onclick();
  assert.equal(node("install-notice").hidden, true);
  createPwa({ onOpen: () => opened++ });
  assert.equal(node("install-notice").hidden, true);
  await button.onclick();
  assert.equal(opened, 1);
  assert.equal(node("install-help").hidden, false);
  assert.match(node("install-instructions").textContent, /In Safari/);
  storage.clear();
  createPwa();
  assert.equal(node("install-notice").hidden, false);
  handlers.beforeinstallprompt({
    preventDefault() {},
    async prompt() {
      prompted++;
    },
    userChoice: Promise.resolve({ outcome: "accepted" }),
  });
  await button.onclick();
  assert.equal(prompted, 1);
  handlers.appinstalled();
  assert.equal(node("install-notice").hidden, true);
  assert.equal(button.hidden, true);
  storage.clear();
  standalone = true;
  createPwa();
  assert.equal(node("install-notice").hidden, true);
  assert.equal(button.hidden, true);
});
