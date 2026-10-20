import { test } from "node:test";
import assert from "node:assert/strict";
import { phnomMap, bounds, spawn } from "../src/phnom-map.js";
import {
  blocked,
  createGuest,
  guestAction,
  stepGuest,
} from "../src/open-world.js";
test("expanded geographic world covers central Phnom Penh with real source way IDs", () => {
  assert.equal(phnomMap.roads.length, 961);
  assert.equal(phnomMap.buildings.length, 4842);
  assert.ok(bounds.max[0] - bounds.min[0] > 2700);
  assert.ok(bounds.max[1] - bounds.min[1] > 3000);
  assert.ok(phnomMap.roads.some((r) => r.id === 29544442));
  assert.ok(
    phnomMap.buildings.some((b) => b.name === "Phnom Penh railway station"),
  );
  for (let i = 0; i < 16; i++) {
    const p = createGuest(`guest${i}`, "Guest", i);
    assert.equal(blocked(p.x, p.z), false);
  }
});
test("city arrival can summon a vehicle and drive away along its road", () => {
  const p = createGuest("driver", "Driver");
  assert.equal(guestAction(p, "summon", "cedric"), null);
  p.x = p.vehicle.x;
  p.z = p.vehicle.z;
  assert.equal(guestAction(p, "enter"), null);
  const start = [p.x, p.z];
  for (let i = 0; i < 60; i++) stepGuest(p, new Set(["w"]), 1 / 60);
  assert.ok(Math.hypot(p.x - start[0], p.z - start[1]) > 3);
  assert.equal(blocked(p.x, p.z, "drive"), false);
  assert.ok(Math.hypot(spawn[0] - start[0], spawn[1] - start[1]) < 38);
});
