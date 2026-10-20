import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  places,
  buildingPlace,
  detailFootprint,
  nearestPlace,
} from "../src/places.js";
import { addPlaceDetails } from "../src/place-details.js";
import { phnomMap } from "../src/phnom-map.js";
import { insidePolygon } from "../src/buildings.js";

test("named places match retained footprints and nearby discovery", () => {
  const palace = phnomMap.buildings.find((b) => b.id === 172268276);
  assert.equal(buildingPlace(palace).kind, "palace");
  const market = phnomMap.buildings.find((b) => b.id === 340680100);
  assert.equal(buildingPlace(market).kind, "central-market");
  for (const place of places) assert.ok(place.center.every(Number.isFinite));
  const p = places.find((p) => p.id === 222235120);
  assert.equal(nearestPlace(...p.center).id, p.id);
  assert.equal(nearestPlace(1e6, 1e6), undefined);
});
test("landmark details stay within retained buildings and merge into a bounded set of draws", () => {
  const batches = new Map();
  const before = JSON.stringify(phnomMap.buildings);
  const count = addPlaceDetails(phnomMap.buildings, (geo, material) => {
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(geo);
  });
  assert.ok(count >= 10);
  assert.ok(batches.size <= 6);
  for (const geometries of batches.values()) {
    const merged = mergeGeometries(geometries);
    assert.ok(merged instanceof T.BufferGeometry);
    for (const value of merged.attributes.position.array)
      assert.ok(Number.isFinite(value));
    merged.dispose();
    geometries.forEach((g) => g.dispose());
  }
  assert.equal(JSON.stringify(phnomMap.buildings), before);
  for (const b of phnomMap.buildings.filter(buildingPlace)) {
    const f = detailFootprint(b.points);
    if (!f) continue;
    for (const a of [-1, 1])
      for (const c of [-1, 1])
        assert.ok(
          insidePolygon(
            f.x +
              ((a * f.w) / 2) * Math.cos(f.angle) -
              ((c * f.d) / 2) * Math.sin(f.angle),
            f.z +
              ((a * f.w) / 2) * Math.sin(f.angle) +
              ((c * f.d) / 2) * Math.cos(f.angle),
            b.points,
          ),
        );
  }
});
