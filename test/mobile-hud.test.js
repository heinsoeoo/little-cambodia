import { test } from "node:test";
import assert from "node:assert/strict";
import { mobileViewport } from "../src/mobile-hud.js";
test("touch phones use the mobile HUD even when landscape width exceeds the old breakpoint", () => {
  assert.equal(
    mobileViewport({ width: 1024, height: 348, coarse: true }),
    true,
  );
  assert.equal(mobileViewport({ width: 932, height: 300, coarse: true }), true);
  assert.equal(
    mobileViewport({ width: 844, height: 390, coarse: false }),
    true,
  );
  assert.equal(
    mobileViewport({ width: 1280, height: 720, coarse: false }),
    false,
  );
  assert.equal(
    mobileViewport({ width: 1024, height: 768, coarse: true }),
    true,
  );
});
