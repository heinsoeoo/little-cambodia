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

test("leaning motorcycle and rider stay aligned while rotating tires clear the road", () => {
  const previous = globalThis.document;
  globalThis.document = {
    createElement: () => ({ style: {}, remove() {} }),
    body: { append() {} },
  };
  try {
    const scene = new T.Scene();
    const state = {
      id: "lean",
      nickname: "Rider",
      x: 0,
      z: 0,
      heading: 0.8,
      mode: "drive",
      speed: 14,
      vehicle: {
        type: "offroad-moto",
        x: 0,
        z: 0,
        heading: 0.8,
        speed: 14,
        turnRate: 0.9,
        steering: 1,
      },
    };
    const actor = createActor(scene, state);
    for (let i = 0; i < 45; i++) actor.update(state, 1 / 30, true, true);
    const avatar = scene.children[0].children[0],
      model = scene.children.find((object) => object.userData.vehicleType);
    assert.ok(model.rotation.z < -0.2);
    assert.equal(avatar.rotation.z, model.rotation.z);
    scene.updateMatrixWorld(true);
    let minimum = Infinity;
    model.traverse((object) => {
      if (object.userData.wheel) {
        const vertices = object.geometry.attributes.position;
        for (let i = 0; i < vertices.count; i++)
          minimum = Math.min(
            minimum,
            new T.Vector3()
              .fromBufferAttribute(vertices, i)
              .applyMatrix4(object.matrixWorld).y,
          );
      }
    });
    assert.ok(minimum > 0.11, `leaning tire bottom ${minimum}`);
    state.vehicle.speed = state.speed = state.vehicle.turnRate = 0;
    for (let i = 0; i < 60; i++) actor.update(state, 1 / 30, true, true);
    assert.ok(Math.abs(model.rotation.z) < 0.001);
    actor.dispose();
  } finally {
    globalThis.document = previous;
  }
});
