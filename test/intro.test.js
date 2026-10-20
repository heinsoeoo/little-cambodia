import { test } from "node:test";
import assert from "node:assert/strict";
import { createIntro } from "../src/intro.js";

test("reload and replay always restart the portrait and cancel old scene timers", () => {
  const saved = Object.fromEntries(
    [
      "document",
      "matchMedia",
      "setTimeout",
      "clearTimeout",
      "localStorage",
    ].map((k) => [k, globalThis[k]]),
  );
  const element = () => ({
    hidden: false,
    classList: { toggle() {}, add() {}, remove() {} },
    setAttribute(k, v) {
      this[k] = v;
    },
    focus() {},
    addEventListener() {},
    offsetWidth: 1,
  });
  const cards = Array.from({ length: 7 }, (_, index) => ({
      ...element(),
      dataset: { duration: [5000, 9000, 12000, 6000, 7000, 5000, 6000][index] },
    })),
    overlay = element(),
    skip = element(),
    replay = element(),
    motion = element();
  overlay.querySelectorAll = () => cards;
  const pending = new Map();
  let sequence = 0,
    opens = 0,
    closes = 0;
  globalThis.document = {
    getElementById: (id) =>
      ({
        intro: overlay,
        "intro-skip": skip,
        "intro-replay": replay,
        "intro-motion": motion,
      })[id],
    body: element(),
  };
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.setTimeout = (fn, delay) => {
    pending.set(++sequence, { fn, delay });
    return sequence;
  };
  globalThis.clearTimeout = (id) => pending.delete(id);
  try {
    const stages = [];
    const intro = createIntro({
      onCard: (index) => stages.push(index),
      onOpen: () => opens++,
      onClose: () => closes++,
    });
    assert.equal(intro.active, true);
    assert.deepEqual(
      [...pending.values()].map((timer) => timer.delay),
      [5000, 14000, 26000, 32000, 39000, 44000, 50000],
    );
    assert.deepEqual(stages, [0]);
    assert.equal(cards[0]["aria-hidden"], "false");
    assert.equal(pending.size, 7);
    pending.values().next().value.fn();
    assert.equal(cards[1]["aria-hidden"], "false");
    assert.deepEqual(stages, [0, 1]);
    replay.onclick();
    assert.equal(cards[0]["aria-hidden"], "false");
    assert.equal(pending.size, 7);
    skip.onclick();
    assert.equal(pending.size, 0);
    assert.equal(intro.active, false);
    // A fresh page/controller must not consult any previous watched flag.
    createIntro({ onOpen: () => opens++ });
    assert.equal(overlay.hidden, false);
    assert.equal(cards[0]["aria-hidden"], "false");
    assert.equal(opens, 3);
    assert.equal(closes, 1);
    pending.clear();
    const preferences = new Map();
    globalThis.localStorage = {
      getItem: (key) => preferences.get(key),
      setItem: (key, value) => preferences.set(key, value),
    };
    globalThis.matchMedia = () => ({ matches: true });
    createIntro();
    assert.equal(pending.size, 0);
    assert.equal(skip.textContent, "Continue →");
    assert.equal(motion.hidden, false);
    motion.onclick();
    assert.equal(pending.size, 7);
    assert.equal(skip.textContent, "Skip intro →");
    assert.equal(preferences.get("phnom-intro-animate"), "1");
    pending.clear();
    createIntro();
    assert.equal(
      pending.size,
      7,
      "reload retains the explicit animation choice",
    );
    motion.onclick();
    assert.equal(pending.size, 0);
    assert.equal(skip.textContent, "Continue →");
    assert.equal(preferences.get("phnom-intro-animate"), "0");
  } finally {
    for (const [key, value] of Object.entries(saved)) globalThis[key] = value;
  }
});
