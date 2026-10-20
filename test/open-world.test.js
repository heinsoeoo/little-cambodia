import { spawn, bounds, phnomMap } from "../src/phnom-map.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nickname,
  createGuest,
  stepGuest,
  guestAction,
  blocked,
  VEHICLE_TYPES,
} from "../src/open-world.js";

test("guests begin on the walkable riverside and nicknames are bounded plain text", () => {
  const p = createGuest("test", "Traveller");
  assert.equal(p.mode, "walk");
  assert.equal(p.vehicle, null);
  assert.equal(blocked(p.x, p.z), false);
  assert.equal(nickname(" <A>\nB "), "AB");
  assert.equal([...nickname("😀".repeat(25))].length, 20);
  assert.equal(nickname({}), "");
});
test("walking uses screen directions, normalizes diagonals and stops at water and homes", () => {
  const p = createGuest("test", "Traveller");
  stepGuest(p, new Set(["w"]), 1);
  assert.equal(p.z, spawn[1] - 4.5);
  assert.equal(p.x, spawn[0]);
  const before = [p.x, p.z];
  stepGuest(p, new Set(["a", "s"]), 1);
  assert.ok(
    Math.abs(Math.hypot(p.x - before[0], p.z - before[1]) - 4.5) < 0.001,
  );
  assert.equal(blocked(bounds.max[0] + 1, 0), true);
  const water = phnomMap.water.find((w) => w.river);
  const center = water.points.reduce(
    (a, p) => [
      a[0] + p[0] / water.points.length,
      a[1] + p[1] / water.points.length,
    ],
    [0, 0],
  );
  assert.equal(blocked(...center), true);
  const b = phnomMap.buildings[100],
    a = b.points[0];
  assert.equal(blocked(...a), true);
});
test("personal vehicles require proximity, can be entered and exited, and stay parked", () => {
  for (const type of VEHICLE_TYPES) {
    const p = createGuest("test", "Guest");
    assert.equal(guestAction(p, "summon", type), null);
    assert.equal(p.vehicle.type, type);
    assert.ok(guestAction(p, "enter"));
    p.x = p.vehicle.x - 2;
    p.z = p.vehicle.z;
    assert.equal(guestAction(p, "enter"), null);
    assert.equal(p.mode, "drive");
    for (let i = 0; i < 60; i++) stepGuest(p, new Set(["w"]), 1 / 60);
    assert.ok(Math.abs(p.speed) > 0);
    assert.equal(guestAction(p, "exit"), null);
    assert.equal(p.mode, "walk");
    assert.equal(p.vehicle.speed, 0);
    const parked = [p.vehicle.x, p.vehicle.z];
    stepGuest(p, new Set(["s"]), 0.1);
    assert.deepEqual([p.vehicle.x, p.vehicle.z], parked);
  }
});
test("summoning checks vehicle type and occupied parking spots", () => {
  const p = createGuest("test", "Guest");
  assert.ok(guestAction(p, "summon", "plane"));
  assert.equal(guestAction(p, "summon", "car"), null);
  const first = { ...p.vehicle };
  const q = createGuest("other", "Other");
  assert.equal(guestAction(q, "summon", "car", [first]), null);
  assert.ok(Math.hypot(first.x - q.vehicle.x, first.z - q.vehicle.z) > 4);
});
