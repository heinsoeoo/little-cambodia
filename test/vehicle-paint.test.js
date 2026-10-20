import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VEHICLES,
  VEHICLE_PAINTS,
  vehiclePaint,
  paintColor,
  vehiclePhysics,
} from "../src/vehicle-catalog.js";
import { vehicleModel, repaintVehicle } from "../src/vehicle-model.js";
import { createCharacter, disposeMeshes } from "../src/character.js";
test("all vehicles support eight body paints without recoloring tires and lights", () => {
  assert.equal(VEHICLE_PAINTS.filter((p) => p.color !== undefined).length, 8);
  for (const spec of VEHICLES) {
    const model = vehicleModel(spec.id);
    const body = model.userData.paintMaterial;
    const other = new Map();
    model.traverse((o) => {
      if (o.material && o.material !== body)
        other.set(o.material, o.material.color.getHex());
    });
    for (const paint of VEHICLE_PAINTS) {
      repaintVehicle(model, paint.id);
      assert.equal(body.color.getHex(), paintColor(spec.id, paint.id));
    }
    for (const [material, color] of other)
      assert.equal(material.color.getHex(), color);
    repaintVehicle(model, "invalid");
    assert.equal(body.color.getHex(), spec.color);
    disposeMeshes(model);
  }
  assert.equal(vehiclePaint(null), "factory");
});
test("both scooters have distinct geometry, driving tune, and a visible seated rider", () => {
  const vespa = vehicleModel("vespa"),
    scoopy = vehicleModel("scoopy");
  assert.notEqual(vespa.children.length, scoopy.children.length);
  for (const type of ["vespa", "scoopy"]) {
    assert.ok(vehiclePhysics(type).power > 0);
    const rider = createCharacter();
    rider.pose({ mode: "drive", vehicle: { type, heading: 0.5 } });
    assert.equal(rider.group.visible, true);
    assert.equal(rider.group.position.y, 0.52);
    rider.dispose();
  }
  disposeMeshes(vespa);
  disposeMeshes(scoopy);
});
