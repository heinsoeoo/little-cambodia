import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clearRoadBuildings,
  roadCorridorIndex,
  segmentDistance,
} from "../src/road-clearance.js";
import { phnomMap } from "../src/phnom-map.js";
const square = (x, z, w = 2) => [
  [x, z],
  [x + w, z],
  [x + w, z + w],
  [x, z + w],
  [x, z],
];
test("road clearance catches crossing, enclosed, diagonal and near-edge footprints but keeps clear buildings", () => {
  const road = {
      id: 1,
      width: 8,
      points: [
        [0, 0],
        [0, 100],
      ],
    },
    overlap = roadCorridorIndex([road]);
  assert.equal(overlap(square(-10, 20, 20)), true);
  assert.equal(overlap(square(4.1, 20)), true);
  assert.equal(overlap(square(5, 20)), false);
  assert.equal(
    roadCorridorIndex([
      {
        ...road,
        points: [
          [-20, -20],
          [20, 20],
        ],
      },
    ])(square(-1, -1)),
    true,
  );
  assert.equal(segmentDistance([0, 0], [0, 0], [3, 0], [4, 0]), 3);
  const buildings = [
    { id: 2, points: square(-1, 20) },
    { id: 3, points: square(10, 20) },
  ];
  const map = { roads: [road], buildings },
    clean = clearRoadBuildings(map);
  assert.deepEqual(
    clean.buildings.map((b) => b.id),
    [3],
  );
  assert.deepEqual(clean.roadClearance.omittedBuildingIds, [2]);
  assert.equal(map.buildings.length, 2);
});
test("every active city building clears the actual drivable road corridor", () => {
  const overlaps = roadCorridorIndex(phnomMap.roads);
  for (const building of phnomMap.buildings)
    assert.equal(
      overlaps(building.points),
      false,
      `building ${building.id} blocks a road`,
    );
});
