import { test } from "node:test";
import assert from "node:assert/strict";
import { Activities, activityCatalog } from "../src/activities.js";
import { phnomMap, promenade, spawn } from "../src/phnom-map.js";
import { nearestRoad } from "../src/geo.js";
const catalog = activityCatalog(promenade, phnomMap.roads, spawn);
test("walking destinations follow the promenade and driving checkpoints share a continuous real road", () => {
  assert.equal(catalog.length, 3);
  for (const item of catalog) {
    assert.equal(item.stops.length, 3);
    for (const stop of item.stops)
      assert.ok(
        nearestRoad(
          stop.point,
          item.mode === "walk" ? [{ points: promenade }] : phnomMap.roads,
        ).distance < 0.01,
      );
    for (let i = 1; i < item.stops.length; i++)
      assert.ok(
        Math.hypot(
          item.stops[i].point[0] - item.stops[i - 1].point[0],
          item.stops[i].point[1] - item.stops[i - 1].point[1],
        ) > 20,
      );
  }
});
test("activities require arriving, stopping, and using the right travel mode; reward is granted once per completion", () => {
  const game = new Activities(catalog);
  assert.equal(game.start("fake"), false);
  assert.equal(game.interact(null), null);
  game.start("delivery");
  const p = { x: 0, z: 0, mode: "walk", speed: 0 };
  assert.equal(game.interact(p), null);
  for (let i = 0; i < 3; i++) {
    const [x, z] = game.target.point;
    Object.assign(p, { x, z, mode: "drive" });
    assert.equal(game.interact(p), null);
    p.mode = "walk";
    p.speed = 2;
    assert.equal(game.interact(p), null);
    p.speed = 0;
    assert.equal(game.interact(p).type, i === 2 ? "complete" : "step");
  }
  assert.equal(game.stamps, 30);
  assert.equal(game.completed.delivery, 1);
  assert.equal(game.interact(p), null);
  assert.equal(game.stamps, 30);
  const restored = new Activities(
    catalog,
    JSON.parse(JSON.stringify(game.save())),
  );
  assert.equal(restored.stamps, 30);
  assert.equal(restored.completed.delivery, 1);
  assert.equal(restored.target, null);
});
test("cancel and switching do not grant rewards; invalid saved values are bounded", () => {
  const game = new Activities(catalog, {
    stamps: -4,
    completed: { delivery: Infinity, drive: 3 },
  });
  assert.equal(game.stamps, 0);
  assert.equal(game.completed.delivery, 0);
  assert.equal(game.completed.drive, 3);
  game.start("postcards");
  game.index = 2;
  game.start("drive");
  assert.equal(game.index, 0);
  game.cancel();
  assert.equal(game.target, null);
  assert.equal(game.stamps, 0);
});
test("an unfinished activity resumes at the saved stop and rejects invalid saved positions", () => {
  const game = new Activities(catalog);
  game.start("postcards");
  const [x, z] = game.target.point;
  game.interact({ x, z, mode: "walk", speed: 0 });
  const restored = new Activities(catalog, game.save());
  assert.equal(restored.current.id, "postcards");
  assert.equal(restored.index, 1);
  assert.equal(restored.stamps, 0);
  assert.equal(
    new Activities(catalog, { active: { id: "postcards", index: 8 } }).target,
    null,
  );
});
