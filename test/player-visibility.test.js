import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createPlayerVisibility } from "../src/player-visibility.js";
test("cutaway follows the projected player in screen pixels, scales for high DPI and disables on leave", () => {
  const visibility = createPlayerVisibility(),
    camera = new T.OrthographicCamera(-20, 20, 20, -20, 0.1, 100);
  camera.position.set(0, 30, 20);
  camera.lookAt(0, 1.2, 0);
  camera.updateMatrixWorld();
  visibility.update(camera, { x: 0, z: 0, mode: "walk" }, 800, 600, 2);
  const { value: center } = visibility.uniforms.playerCutawayCenter;
  assert.ok(Math.abs(center.x - 800) < 1e-8);
  assert.ok(Math.abs(center.y - 600) < 1e-8);
  assert.ok(center.z > 0 && center.z < 1);
  assert.equal(visibility.uniforms.playerCutawayRadius.value, 92);
  visibility.update(camera, { x: 0, z: 0, mode: "drive" }, 800, 600, 2);
  assert.equal(visibility.uniforms.playerCutawayRadius.value, 120);
  visibility.update(camera, null, 800, 600);
  assert.equal(visibility.uniforms.playerCutawayRadius.value, 0);
});
test("cutaway patches batched walls and facade materials without enabling transparency or disabling depth", () => {
  const visibility = createPlayerVisibility();
  for (const material of [
    new T.MeshLambertMaterial(),
    new T.MeshBasicMaterial(),
  ]) {
    visibility.apply(material);
    visibility.apply(material);
    const shader = {
      uniforms: {},
      fragmentShader: "void main(){\n#include <clipping_planes_fragment>\n}",
    };
    material.onBeforeCompile(shader, {});
    assert.equal(
      shader.uniforms.playerCutawayCenter,
      visibility.uniforms.playerCutawayCenter,
    );
    assert.match(
      shader.fragmentShader,
      /gl_FragCoord.z < playerCutawayCenter.z/,
    );
    assert.match(shader.fragmentShader, /discard/);
    assert.match(shader.fragmentShader, /cutawayAmount = 0.45/);
    assert.equal(material.transparent, false);
    assert.equal(material.depthWrite, true);
  }
});
