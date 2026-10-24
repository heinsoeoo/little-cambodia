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
    assert.ok(c.group.getObjectByName("cheek-tint"));
    c.dispose();
  }
});
