import { test } from "node:test";
import assert from "node:assert/strict";
import { cityErrands } from "../src/city-errands.js";
import { Activities } from "../src/activities.js";
import { places } from "../src/places.js";
import { phnomMap, spawn } from "../src/phnom-map.js";
import { blocked } from "../src/open-world.js";
const errands = cityErrands(phnomMap.roads, places, spawn, blocked);
test("city errands use reachable pavement outside buildings and water, with dialogue and city-wide destinations", () => {
  assert.equal(errands.length, 3);
  for (const errand of errands) {
    assert.ok(errand.reward > 0);
    for (const stop of errand.stops) {
      assert.equal(blocked(...stop.point), false);
      assert.ok(stop.dialog);
    }
    assert.ok(
      errand.stops.some(
        (stop) =>
          Math.hypot(stop.point[0] - spawn[0], stop.point[1] - spawn[1]) > 500,
      ),
    );
  }
});
test("errands carry the right NPC dialogue through each step and award only on delivery", () => {
  const game = new Activities(errands);
  game.start("parcel");
  for (let i = 0; i < 3; i++) {
    const target = game.target;
    const result = game.interact({
      x: target.point[0],
      z: target.point[1],
      mode: "walk",
      speed: 0,
    });
    assert.equal(result.dialog, target.dialog);
    assert.equal(game.stamps, i === 2 ? 60 : 0);
  }
});
