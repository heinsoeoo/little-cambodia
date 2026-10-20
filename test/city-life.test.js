import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as T from "three";
import { CityClock, phnomPenhTime, activityAt } from "../src/schedule.js";
import { describeBuilding, insidePolygon } from "../src/buildings.js";
import { needsRotation, bindHoldControls } from "../src/mobile.js";
import { cities } from "../src/cities.js";
import { prepare } from "../src/geo.js";
import { riversidePath, samplePath } from "../src/riverside.js";
import { createStreetLife } from "../src/street-life.js";

test("Phnom Penh clock uses UTC+7 across a day boundary", () => {
  const time = phnomPenhTime(new Date("2026-10-16T18:00:00Z"));
  assert.deepEqual(time, { day: 6, hour: 1, minute: 0, label: "Sat 01:00" });
});
test("weekend market starts at 18:00 and closes at 23:00, with quieter weekdays", () => {
  assert.equal(activityAt({ day: 6, hour: 17, minute: 59 }).market, false);
  assert.equal(activityAt({ day: 6, hour: 18 }).market, true);
  assert.equal(activityAt({ day: 0, hour: 22, minute: 59 }).market, true);
  assert.equal(activityAt({ day: 0, hour: 23 }).market, false);
  assert.equal(activityAt({ day: 5, hour: 19 }).market, false);
  assert.equal(activityAt({ day: 1, hour: 3 }).vendors, 0);
  assert.ok(
    activityAt({ day: 6, hour: 19 }).people >
      activityAt({ day: 1, hour: 12 }).people * 4,
  );
});
test("time preview crosses closing time and returns to the shared game calendar", () => {
  const clock = new CityClock();
  clock.setMode("market");
  assert.equal(activityAt(clock.read()).market, true);
  clock.tick(2100);
  assert.equal(activityAt(clock.read()).market, false);
  clock.setMode("now");
  assert.equal(clock.read().hour, 13);
  assert.equal(clock.read().minute, 50);
});
test("mapped building height, levels and residential type override visual estimates", () => {
  const polygon = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ];
  const house = describeBuilding(
    { building: "house", "building:levels": "2" },
    polygon,
    1,
  );
  assert.equal(house.kind, "home");
  assert.equal(house.height, 6.4);
  assert.equal(house.heightSource, "levels");
  assert.equal(house.roof, "pyramidal");
  assert.equal(
    describeBuilding({ building: "apartments", height: "100 ft" }, polygon, 2)
      .height,
    30.48,
  );
  assert.equal(
    describeBuilding({ building: "yes" }, polygon, 1).heightSource,
    "estimated",
  );
});
test("rotation prompt applies to portrait touch devices without blocking landscape or desktop", () => {
  assert.equal(needsRotation({ width: 390, height: 844, coarse: true }), true);
  assert.equal(needsRotation({ width: 844, height: 390, coarse: true }), false);
  assert.equal(
    needsRotation({ width: 700, height: 1000, coarse: false }),
    false,
  );
});
test("multi-touch keeps accelerator held when steering is released and cancels cleanly", () => {
  const button = (key) => ({
    dataset: { key },
    handlers: {},
    classList: { add() {}, remove() {} },
    setPointerCapture() {},
    addEventListener(type, fn) {
      this.handlers[type] = fn;
    },
  });
  const left = button("arrowleft"),
    go = button("arrowup"),
    buttons = [left, go],
    keys = new Set(),
    clear = bindHoldControls(
      {
        querySelectorAll() {
          return buttons;
        },
      },
      keys,
    );
  const event = (id) => ({ pointerId: id, preventDefault() {} });
  left.handlers.pointerdown(event(1));
  go.handlers.pointerdown(event(2));
  left.handlers.pointerup(event(1));
  assert.ok(keys.has("arrowup"));
  assert.ok(!keys.has("arrowleft"));
  go.handlers.pointercancel(event(2));
  assert.equal(keys.size, 0);
  go.handlers.pointerdown(event(3));
  clear();
  assert.equal(keys.size, 0);
});
test("riverside population uses the mapped bank and vendors open and close on schedule", () => {
  const city = cities.phnomPenh,
    map = prepare(JSON.parse(fs.readFileSync(`public${city.data}`)), city),
    path = riversidePath(map, city),
    river = map.water.find((w) => w.river);
  assert.ok(path.length > 50);
  for (const p of path) assert.ok(!insidePolygon(...p, river.points));
  const life = createStreetLife(new T.Scene(), path);
  life.update(1, { day: 6, hour: 19 });
  assert.equal(life.activity.vendors, 22);
  assert.equal(life.activity.people, 240);
  const sample = samplePath(path, 0.5),
    vendor = life.nearest({ x: sample.point[0], z: sample.point[1] });
  assert.ok(vendor);
  assert.ok(life.collides(...vendor.point));
  life.update(1, { day: 1, hour: 3 });
  assert.equal(life.nearest({ x: 0, z: 0 }), undefined);
});
