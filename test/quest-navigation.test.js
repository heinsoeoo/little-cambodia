import { test } from "node:test";
import assert from "node:assert/strict";
import { createQuestNavigation, radarPoint } from "../src/quest-navigation.js";
const roads = [
  {
    points: [
      [0, 0],
      [100, 0],
      [100, 100],
    ],
    nodeIds: [1, 2, 3],
    oneway: 0,
  },
];
test("radar keeps nearby destinations in place and clamps distant targets to the correct edge", () => {
  assert.deepEqual(radarPoint([0, 0], [0, 0], 340), {
    x: 140,
    y: 140,
    offscreen: false,
    angle: Math.PI,
  });
  const east = radarPoint([1000, 0], [0, 0], 340);
  assert.equal(east.x, 264);
  assert.equal(east.y, 140);
  assert.equal(east.offscreen, true);
  assert.equal(east.angle, Math.PI / 2);
  const north = radarPoint([0, -1000], [0, 0], 340);
  assert.ok(Math.abs(north.y - 16) < 1e-9);
  assert.equal(north.angle, 0);
});
test("city route follows road bends, updates on destination/mode changes and clears on completion", () => {
  const nav = createQuestNavigation(roads, [
      [0, -500],
      [100, -500],
    ]),
    player = { x: 0, z: 0, mode: "drive" },
    target = { point: [100, 100] };
  const route = nav.update(player, target, 0);
  assert.equal(route.kind, "route");
  assert.ok(route.points.some((p) => p[0] === 100 && p[1] === 0));
  assert.equal(nav.update(player, target, 500), route);
  assert.notEqual(nav.update({ ...player, mode: "walk" }, target, 600), route);
  assert.equal(nav.update(player, null, 700), null);
});
test("walking follows the promenade and disconnected roads use an explicitly dashed direction", () => {
  const nav = createQuestNavigation(roads, [
    [0, -500],
    [50, -500],
    [50, -400],
  ]);
  const route = nav.update(
    { x: 0, z: -500, mode: "walk" },
    { point: [50, -400] },
    0,
  );
  assert.equal(route.kind, "route");
  assert.ok(route.points.some((p) => p[0] === 50 && p[1] === -500));
  const isolated = [
    ...roads,
    {
      points: [
        [500, 500],
        [600, 500],
      ],
      nodeIds: [8, 9],
    },
  ];
  assert.equal(
    createQuestNavigation(isolated, [
      [0, -500],
      [100, -500],
    ]).update({ x: 0, z: 0, mode: "drive" }, { point: [600, 500] }, 0).kind,
    "direction",
  );
});
