import { test } from "node:test";
import assert from "node:assert/strict";
import { clampZoom } from "../src/camera-zoom.js";
test("camera zoom stays within a useful character-close and city-wide range", () => {
  assert.equal(clampZoom(1), 7);
  assert.equal(clampZoom(120), 60);
  assert.equal(clampZoom(25), 25);
  assert.equal(clampZoom(NaN), 25);
  assert.equal(clampZoom("12"), 12);
});
