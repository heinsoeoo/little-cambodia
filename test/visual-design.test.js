import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { VEHICLES } from "../src/vehicle-catalog.js";
import { vehicleModel } from "../src/vehicle-model.js";
import { updateVehicleLighting } from "../src/vehicle-lighting.js";
import { createCharacter, disposeMeshes } from "../src/character.js";
import { stepVehicle } from "../src/vehicle.js";

test("vehicle lights follow day/night, parking and braking without dynamic GPU lights", () => {
  for (const spec of VEHICLES) {
    const model = vehicleModel(spec.id),
      light = model.userData.lighting;
    assert.ok(light);
    model.traverse((object) => assert.ok(!object.isLight));
    updateVehicleLighting(model, { night: false, driving: true });
    assert.equal(light.root.visible, false);
    updateVehicleLighting(model, { night: true, driving: true });
    assert.equal(light.root.visible, true);
    const tail = light.tailLamp.color.getHex(),
      opacity = light.brakeMaterial.opacity;
    updateVehicleLighting(model, { night: true, driving: true, braking: true });
    assert.notEqual(light.tailLamp.color.getHex(), tail);
    assert.ok(light.brakeMaterial.opacity > opacity);
    const front = model.getObjectByName("headlight-road-pool");
    assert.ok(front.position.z > 0);
    assert.ok(model.getObjectByName("brake-road-glow").position.z < 0);
    model.rotation.y = Math.PI / 2;
    model.updateMatrixWorld(true);
    assert.ok(front.getWorldPosition(new T.Vector3()).x > 0);
    updateVehicleLighting(model, { night: true, driving: false });
    assert.equal(light.root.visible, false);
    disposeMeshes(model);
  }
});

test("car silhouettes have distinct shaped cabins and preserve the Skyline round rear lenses", () => {
  const sedan = vehicleModel("mercedes-c300"),
    coupe = vehicleModel("skyline-r34"),
    suv = vehicleModel("land-cruiser");
  for (const model of [sedan, coupe, suv]) {
    const shell = model.getObjectByName("sculpted-body");
    shell.geometry.computeBoundingBox();
    assert.ok(shell.geometry.boundingBox.getSize(new T.Vector3()).z > 4);
    assert.ok(model.getObjectByName("shaped-cabin-glass"));
  }
  assert.ok(suv.userData.design.roof > sedan.userData.design.roof);
  assert.notEqual(
    coupe.userData.design.cabinFront,
    sedan.userData.design.cabinFront,
  );
  const lenses = [];
  coupe.traverse((object) => {
    if (object.name === "round-tail-lamp") lenses.push(object);
  });
  assert.equal(lenses.length, 4);
  [sedan, coupe, suv].forEach(disposeMeshes);
});

test("adult character details survive mixed clothes and seated/standing pose changes", () => {
  const character = createCharacter({
    gender: "female",
    top: "luxury",
    bottom: "bohemian",
    hair: "old-money",
    shoes: "street",
  });
  for (const name of [
    "sculpted-face",
    "iris",
    "hair-cap",
    "shirt-collar",
    "hand",
    "shaped-shoe",
    "flowing-skirt",
  ])
    assert.ok(character.group.getObjectByName(name), name);
  character.pose({
    mode: "drive",
    vehicle: { type: "vespa", heading: 1 },
    speed: 0,
  });
  assert.equal(character.group.position.y, 0.52);
  character.pose({ mode: "walk", heading: 0, speed: 0 });
  assert.equal(character.group.position.y, 0);
  assert.equal(
    character.group
      .getObjectByName("illustrated-head")
      .getWorldPosition(new T.Vector3()).y,
    1.84,
  );
  character.dispose();
});

test("brake lamps use authoritative brake input, including reverse-direction braking", () => {
  const car = { type: "mercedes-c300", x: 0, z: 0, heading: 0, speed: 3 };
  stepVehicle(car, new Set([" "]), 1 / 30, () => false);
  assert.equal(car.braking, true);
  stepVehicle(car, new Set(["w"]), 1 / 30, () => false);
  assert.equal(car.braking, false);
  stepVehicle(car, new Set(["s"]), 1 / 30, () => false);
  assert.equal(car.braking, true);
});
