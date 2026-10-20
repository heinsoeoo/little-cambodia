import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createActor } from "../src/actors.js";

test("motorcycle mounting keeps the rider above the seat through turns and restores walking on exit", () => {
  const previous = globalThis.document;
  globalThis.document = {
    createElement: () => ({ style: {}, remove() {} }),
    body: { append() {} },
  };
  try {
    const scene = new T.Scene();
    const state = {
      id: "rider",
      nickname: "Sok",
      x: 72,
      z: 12,
      heading: 0,
      speed: 0,
      mode: "walk",
      vehicle: { type: "moto", x: 72, z: 12, heading: 0 },
    };
    const actor = createActor(scene, state),
      avatar = scene.children[0].children[0];
    for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      state.mode = "drive";
      state.heading = state.vehicle.heading = heading;
      actor.update(state, 1 / 60, true);
      assert.equal(avatar.visible, true);
      assert.equal(avatar.position.y, 0.52);
      assert.ok(Math.abs(avatar.position.x + Math.sin(heading) * 0.15) < 1e-9);
      assert.ok(Math.abs(avatar.position.z + Math.cos(heading) * 0.15) < 1e-9);
      assert.equal(avatar.rotation.y, heading);
    }
    state.mode = "walk";
    actor.update(state, 1 / 60, true);
    assert.equal(avatar.visible, true);
    assert.equal(avatar.position.length(), 0);
    state.mode = "drive";
    state.vehicle.type = "corolla";
    actor.update(state, 1 / 60, true);
    assert.equal(avatar.visible, false);
    actor.dispose();
    assert.equal(scene.children.length, 0);
  } finally {
    globalThis.document = previous;
  }
});
