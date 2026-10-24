import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { vehicleModel, repaintVehicle } from "../src/vehicle-model.js";
import { VEHICLES, paintColor } from "../src/vehicle-catalog.js";
import { createCharacter, disposeMeshes } from "../src/character.js";
import { prepareVehicleMotion, animateVehicle } from "../src/vehicle-motion.js";

test("every restyled vehicle retains paint customization, grounded wheels and finite geometry", () => {
  for (const spec of VEHICLES) {
    const model = vehicleModel(spec.id);
    prepareVehicleMotion(model);
    repaintVehicle(model, "sage");
    assert.equal(
      model.userData.paintMaterial.color.getHex(),
      paintColor(spec.id, "sage"),
    );
    assert.ok(model.userData.wheelPivots.length >= 2, spec.id);
    animateVehicle(
      model,
      { type: spec.id, speed: 12, steering: 0.5, turnRate: 0.4 },
      1 / 30,
      true,
    );
    model.updateMatrixWorld(true);
    model.traverse((o) => {
      if (!o.isMesh) return;
      const position = o.geometry.attributes.position;
      assert.ok(
        Array.from(position.array).every(Number.isFinite),
        `${spec.id}: ${o.name}`,
      );
    });
    const bounds = new T.Box3().setFromObject(model);
    assert.ok(bounds.getSize(new T.Vector3()).z >= spec.length * 0.8, spec.id);
    disposeMeshes(model);
  }
});
test("expressive characters keep mixed customization through walking, running, riding and sitting", () => {
  for (const gender of ["male", "female", "unspecified"]) {
    const c = createCharacter({
      gender,
      top: "street",
      bottom: "luxury",
      hair: "casual",
      shoes: "sporty",
    });
    for (const state of [
      { mode: "walk", speed: 3 },
      { mode: "walk", speed: 7 },
      { mode: "drive", speed: 15, vehicle: { type: "vespa", heading: 1 } },
      { mode: "walk", speed: 0, posture: "sit" },
    ]) {
      c.pose(state, 1 / 30);
      c.group.updateMatrixWorld(true);
      assert.ok(
        new T.Box3().setFromObject(c.group).getSize(new T.Vector3()).y > 1.5,
      );
    }
    assert.equal(c.group.userData.appearance.top, "street");
    assert.ok(c.group.getObjectByName("eye-highlight"));
    assert.ok(c.group.getObjectByName("sculpted-face"));
    c.dispose();
  }
});

import {
  createCharacter as sourceCharacter,
  createVehicle as sourceVehicle,
} from "../src/luma-models.js";
test("default player uses the actual reference shoulder, leg, face and hair geometry", () => {
  const source = sourceCharacter(),
    player = createCharacter({ gender: "male", top: "casual", hair: "casual" }),
    rig = player.group.children[0].userData;
  for (const [a, b] of [
    [rig.arms[0], source.userData.arms[0]],
    [rig.legs[0], source.userData.legs[0]],
  ]) {
    assert.deepEqual(a.position.toArray(), b.position.toArray());
    assert.deepEqual(
      Array.from(a.children[0].geometry.attributes.position.array),
      Array.from(b.children[0].geometry.attributes.position.array),
    );
  }
  for (let i = 0; i < 7; i++)
    assert.deepEqual(
      Array.from(rig.head.children[i].geometry.attributes.position.array),
      Array.from(
        source.userData.head.children[i].geometry.attributes.position.array,
      ),
    );
  player.dispose();
  disposeMeshes(source);
});
test("sedan body is imported directly and materials stay independent between guests", () => {
  const reference = sourceVehicle({ id: "sedan", color: 0x20242b }),
    first = vehicleModel("mercedes-c300"),
    second = vehicleModel("mercedes-c300");
  assert.deepEqual(
    Array.from(
      first.getObjectByName("sculpted-body").geometry.attributes.position.array,
    ),
    Array.from(reference.children[0].geometry.attributes.position.array),
  );
  const original = second.userData.paintMaterial.color.getHex();
  first.userData.paintMaterial.color.setHex(0xff0000);
  assert.equal(second.userData.paintMaterial.color.getHex(), original);
  [reference, first, second].forEach(disposeMeshes);
});

import { createHunter } from "../src/dungeon-models.js";
import { createLumaCrowd } from "../src/luma-crowd.js";
test("dungeon hunters and animated city crowds use the same reference character safely", () => {
  for (const role of [
    "fighter",
    "mage",
    "assassin",
    "marksman",
    "support",
    "tank",
  ]) {
    const hunter = createHunter({ gender: "female" }, role);
    assert.ok(hunter.group.getObjectByName("sculpted-face"));
    for (const action of ["attack", "skill", "dodge"]) {
      hunter.update(
        {
          speed: 4,
          heading: 1,
          combat: { lastAttackAt: 1000, lastAction: action },
        },
        1 / 30,
        1100,
      );
      hunter.group.updateMatrixWorld(true);
      assert.ok(hunter.group.matrixWorld.elements.every(Number.isFinite));
    }
    disposeMeshes(hunter.group);
  }
  const scene = new T.Group(),
    crowd = createLumaCrowd(scene, 3);
  crowd.pose(0, [1, 2], 0.5, 3, true);
  crowd.flush(1);
  scene.traverse((o) => {
    if (o.isInstancedMesh) {
      assert.equal(o.count, 1);
      const matrix = new T.Matrix4();
      o.getMatrixAt(0, matrix);
      assert.ok(matrix.elements.every(Number.isFinite));
    }
  });
  disposeMeshes(scene);
});
