import { test } from "node:test";
import assert from "node:assert/strict";
import { createCityGuide } from "../src/city-guide.js";
test("city guide tabs reveal one section, support keyboard navigation, and retain real player progress", () => {
  const previous = globalThis.document;
  const names = ["explore", "garage", "settings"];
  const tabs = names.map((name) => ({
    dataset: { guideTab: name },
    setAttribute(key, value) {
      this[key] = value;
    },
    focus() {
      this.focused = true;
    },
  }));
  const panels = names.map((name) => ({
    dataset: { guidePanel: name },
    hidden: false,
  }));
  const ids = Object.fromEntries(
    ["guide-map", "guide-player", "guide-stamps", "guide-completed"].map(
      (id) => [id, {}],
    ),
  );
  let maps = 0;
  globalThis.document = {
    getElementById: (id) => ids[id],
    querySelectorAll: (selector) =>
      selector.includes("data-guide-tab") ? tabs : panels,
  };
  try {
    const guide = createCityGuide({ onMap: () => maps++ });
    assert.deepEqual(
      panels.map((panel) => panel.hidden),
      [false, true, true],
    );
    tabs[1].onclick();
    assert.deepEqual(
      panels.map((panel) => panel.hidden),
      [true, false, true],
    );
    assert.equal(tabs[1]["aria-selected"], "true");
    tabs[1].onkeydown({ key: "ArrowRight", preventDefault() {} });
    assert.equal(panels[2].hidden, false);
    assert.equal(tabs[2].focused, true);
    ids["guide-map"].onclick();
    assert.equal(maps, 1);
    guide.update(
      { nickname: "Casual" },
      { stamps: 42, completed: { parcel: 2, delivery: 1 } },
    );
    assert.equal(ids["guide-player"].textContent, "Casual");
    assert.equal(ids["guide-stamps"].textContent, "42");
    assert.equal(ids["guide-completed"].textContent, "3");
  } finally {
    globalThis.document = previous;
  }
});
