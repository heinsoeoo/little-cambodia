import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { townCity, createTownMap } from "../src/town-map.js";
import { makeTownWorld } from "../src/town-world.js";
import { nearestRoad } from "../src/geo.js";
import { buildGraph, findRoute, approachSpawn } from "../src/navigation.js";
const map = createTownMap(),
  graph = buildGraph(map.roads);
test("authored town has a connected taxi circuit with accessible stops", () => {
  const world = makeTownWorld(new T.Scene(), map, townCity),
    stops = townCity.landmarks.map((l) => nearestRoad(l.point, map.roads));
  for (let i = 0; i < stops.length; i++) {
    assert.ok(!world.collides(...stops[i].point), townCity.landmarks[i].name);
    assert.ok(
      findRoute(
        stops[i].point,
        stops[(i + 1) % stops.length].point,
        map.roads,
        graph,
      ),
    );
  }
  const spawn = approachSpawn(stops[0]);
  assert.ok(!world.collides(...spawn.point));
  assert.ok(
    Math.abs(
      findRoute(spawn.point, stops[0].point, map.roads, graph).distance - 45,
    ) < 0.01,
  );
});
test("tile-town collisions agree with the authored house footprints and river edge", () => {
  const world = makeTownWorld(new T.Scene(), map, townCity);
  for (const b of map.buildings) {
    const p = b.points[0],
      q = b.points[2];
    assert.equal(world.collides((p[0] + q[0]) / 2, (p[1] + q[1]) / 2), true);
  }
  assert.equal(world.collides(100, 0), true);
  assert.equal(world.collides(-32, 0), false);
  assert.equal(world.collides(-130, 0), true);
});
