import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { project, nearestRoad, prepare } from "../src/geo.js";
import { cities } from "../src/cities.js";
import { stepVehicle } from "../src/vehicle.js";
import { makeWorld } from "../src/world.js";
import * as T from "three";
const city = cities.phnomPenh,
  map = prepare(JSON.parse(fs.readFileSync(`public${city.data}`)), city);
test("OSM extract contains real roads and buildings", () => {
  assert.ok(map.roads.length > 50);
  assert.ok(map.buildings.length > 100);
  assert.deepEqual(project(...city.origin, city.origin), [0, -0]);
});
test("nearest-road projection uses segment interiors", () => {
  const n = nearestRoad(
    [4, 5],
    [
      {
        points: [
          [0, 0],
          [10, 0],
        ],
      },
    ],
  );
  assert.deepEqual(n.point, [4, 0]);
  assert.equal(n.distance, 5);
});
test("car accelerates, brakes, reverses, and rolls back collisions", () => {
  const c = { x: 0, z: 0, heading: 0, speed: 0 };
  for (let i = 0; i < 120; i++)
    stepVehicle(c, new Set(["w"]), 1 / 60, () => false);
  assert.ok(c.speed > 10 && c.z > 10);
  const v = c.speed;
  for (let i = 0; i < 60; i++)
    stepVehicle(c, new Set([" "]), 1 / 60, () => false);
  assert.ok(c.speed < v * 0.02);
  const before = c.z;
  stepVehicle(c, new Set(["w"]), 1 / 60, () => true);
  assert.equal(c.z, before);
  for (let i = 0; i < 120; i++)
    stepVehicle(c, new Set(["s"]), 1 / 60, () => false);
  assert.ok(c.speed < 0);
});
test("all fare stops and spawn are accessible outside buildings", () => {
  const world = makeWorld(new T.Scene(), map, city);
  for (const l of city.landmarks) {
    const n = nearestRoad(project(l.lon, l.lat, city.origin), map.roads);
    assert.ok(!world.collides(...n.point), l.name + " intersects a building");
  }
  const p = nearestRoad(
    project(city.landmarks[0].lon, city.landmarks[0].lat, city.origin),
    map.roads,
  ).point;
  const spawn = nearestRoad([p[0], p[1] + 65], map.roads).point;
  assert.ok(!world.collides(...spawn));
});
import { Missions } from "../src/missions.js";
test("fare requires stopped proximity and rewards only completed trips", () => {
  const m = new Missions([{ point: [0, 0] }, { point: [100, 0] }]);
  assert.equal(m.interact({ x: 50, z: 0, speed: 0 }), null);
  assert.equal(m.interact({ x: 0, z: 0, speed: 5 }), null);
  assert.equal(m.interact({ x: 0, z: 0, speed: 0 }), "pickup");
  assert.equal(m.balance, 0);
  assert.equal(m.interact({ x: 0, z: 0, speed: 0 }), null);
  assert.equal(m.interact({ x: 100, z: 0, speed: 0 }), "complete");
  assert.deepEqual(m.save(), { balance: 6000, trips: 1 });
  assert.equal(m.stage, "pickup");
  assert.deepEqual(new Missions(m.stops, m.save()).save(), m.save());
});
import { buildGraph, findRoute } from "../src/navigation.js";
test("navigation follows connected streets instead of a straight line", () => {
  const roads = [
    {
      points: [
        [0, 0],
        [100, 0],
      ],
      nodeIds: [1, 2],
    },
    {
      points: [
        [100, 0],
        [100, 100],
      ],
      nodeIds: [2, 3],
    },
  ];
  const route = findRoute([20, 0], [100, 80], roads);
  assert.equal(route.distance, 160);
  assert.deepEqual(route.points, [
    [20, 0],
    [100, 0],
    [100, 80],
  ]);
});
test("navigation respects one-way streets and cannot cross disconnected roads", () => {
  const roads = [
    {
      points: [
        [0, 0],
        [100, 0],
      ],
      nodeIds: [1, 2],
      oneway: 1,
    },
  ];
  assert.equal(findRoute([20, 0], [80, 0], roads).distance, 60);
  assert.equal(findRoute([80, 0], [20, 0], roads), null);
  assert.equal(
    findRoute(
      [0, 0],
      [100, 0],
      [
        ...roads,
        {
          points: [
            [50, -50],
            [50, 50],
          ],
          nodeIds: [3, 4],
        },
      ],
    ).distance,
    100,
  );
  assert.equal(
    findRoute(
      [0, 0],
      [50, 50],
      [
        ...roads,
        {
          points: [
            [50, -50],
            [50, 50],
          ],
          nodeIds: [3, 4],
        },
      ],
    ),
    null,
  );
});
test("all bundled mission legs have a connected road route", () => {
  const graph = buildGraph(map.roads),
    stops = city.landmarks.map(
      (l) => nearestRoad(project(l.lon, l.lat, city.origin), map.roads).point,
    );
  for (let i = 0; i < stops.length; i++) {
    const route = findRoute(
      stops[i],
      stops[(i + 1) % stops.length],
      map.roads,
      graph,
    );
    assert.ok(route, city.landmarks[i].name);
    assert.ok(Number.isFinite(route.distance));
  }
});
test("static city geometry is batched to reduce draw calls", () => {
  const scene = new T.Scene();
  makeWorld(scene, map, city);
  let meshes = 0;
  scene.traverse((o) => {
    if (o.isMesh) meshes++;
  });
  assert.ok(meshes < 50, `${meshes} mesh draws`);
});
import { approachSpawn } from "../src/navigation.js";
test("opening spawn is on an accessible road upstream of the first pickup", () => {
  const stop = nearestRoad(
      project(city.landmarks[0].lon, city.landmarks[0].lat, city.origin),
      map.roads,
    ),
    spawn = approachSpawn(stop);
  const route = findRoute(spawn.point, stop.point, map.roads);
  assert.ok(route);
  assert.ok(Math.abs(route.distance - 45) < 0.1);
  assert.ok(!makeWorld(new T.Scene(), map, city).collides(...spawn.point));
});
test("one-way endpoints can connect to other streets without a needless loop", () => {
  const roads = [
    {
      points: [
        [0, 0],
        [100, 0],
      ],
      nodeIds: [1, 2],
      oneway: 1,
    },
    {
      points: [
        [0, 0],
        [0, 100],
      ],
      nodeIds: [1, 3],
    },
  ];
  assert.equal(findRoute([0, 0], [0, 50], roads).distance, 50);
  assert.equal(findRoute([0, 50], [0, 0], roads).distance, 50);
});
