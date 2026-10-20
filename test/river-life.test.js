import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { phnomMap, city, spawn, promenade } from "../src/phnom-map.js";
import {
  animateRiverMaterial,
  buildBoatRoute,
  createRiverLife,
} from "../src/river-life.js";
import { insidePolygon } from "../src/buildings.js";
import { samplePath } from "../src/riverside.js";
import { addLandmarkScenes } from "../src/landmark-scenes.js";
import { places } from "../src/places.js";
test("boat route and interpolated travel stay inside the mapped river", () => {
  const route = buildBoatRoute(phnomMap, city),
    water = phnomMap.water.filter(
      (w) => w.river || w.id === city.riverside.riverWay,
    );
  assert.ok(route.length > 30);
  for (let i = 0; i <= 1000; i++) {
    const p = samplePath(route, i / 1000).point;
    for (const [dx, dz] of [
      [0, 0],
      [-5, -12],
      [5, 12],
    ])
      assert.ok(
        water.some((w) => insidePolygon(p[0] + dx, p[1] + dz, w.points)),
      );
  }
  assert.deepEqual(buildBoatRoute({ water: [] }, city), []);
});
test("river boats move, lighting follows night, and material receives animated uniforms", () => {
  const scene = new T.Scene(),
    material = new T.MeshLambertMaterial();
  const uniforms = animateRiverMaterial(material);
  const shader = {
    uniforms: {},
    vertexShader: "#include <begin_vertex>",
    fragmentShader: "#include <color_fragment>",
  };
  material.onBeforeCompile(shader);
  assert.ok(shader.fragmentShader.includes("riverTime"));
  const life = createRiverLife(scene, phnomMap, city, uniforms);
  assert.equal(life.boats.length, 4);
  life.update(0, false);
  const start = life.boats[0].group.position.clone();
  life.update(10, true);
  assert.ok(life.boats[0].group.position.distanceTo(start) > 20);
  assert.equal(uniforms.riverTime.value, 10);
  assert.equal(uniforms.riverNight.value, 1);
  assert.ok(life.boats.every((b) => b.light.visible && b.reflection.visible));
  life.update(0, false);
  assert.ok(life.boats.every((b) => !b.light.visible && !b.reflection.visible));
});
test("expanded promenade preserves the guest spawn and canopy rows stay in the Night Market site", () => {
  assert.ok(promenade.length > 100);
  assert.ok(phnomMap.water.some((w) => String(w.id).startsWith("mekong")));
  assert.ok(places.some((p) => p.id === 172268264 && p.kind === "palace"));
  assert.ok(Math.abs(spawn[1] + 1558.48) < 0.1);
  const scene = new T.Scene(),
    landmarks = addLandmarkScenes(scene, phnomMap, city, promenade);
  const market = places.find((p) => p.kind === "night-market");
  assert.ok(landmarks.stalls.length > 4);
  for (const p of landmarks.stalls)
    assert.ok(insidePolygon(...p, market.points));
  assert.ok(scene.children.length <= 5);
  landmarks.update(true);
  landmarks.update(false);
});
