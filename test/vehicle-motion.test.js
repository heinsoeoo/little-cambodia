import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { vehicleModel } from "../src/vehicle-model.js";
import {
  prepareVehicleMotion,
  animateVehicle,
  bikeLean,
  roadHeight,
} from "../src/vehicle-motion.js";
import { disposeMeshes } from "../src/character.js";
import { stepVehicle } from "../src/vehicle.js";

test("bike lean increases with turning force and returns upright when stopped", () => {
  assert.equal(bikeLean(0, 1), 0);
  assert.ok(Math.abs(bikeLean(14, 1)) > Math.abs(bikeLean(4, 0.3)));
  assert.ok(bikeLean(14, 1) < 0);
  assert.ok(bikeLean(14, -1) > 0);
  assert.ok(Math.abs(bikeLean(100, 10)) <= 0.48);
  const model = vehicleModel("racing-moto");
  prepareVehicleMotion(model);
  for (let i = 0; i < 30; i++)
    animateVehicle(
      model,
      { type: "racing-moto", speed: 16, turnRate: 1, steering: 1 },
      1 / 30,
      true,
    );
  assert.ok(model.rotation.z < -0.2);
  for (let i = 0; i < 60; i++)
    animateVehicle(
      model,
      { type: "racing-moto", speed: 0, turnRate: 0 },
      1 / 30,
      true,
    );
  assert.ok(Math.abs(model.rotation.z) < 0.001);
  disposeMeshes(model);
});
test("rolling tires clear the road and wheel spin follows travelled distance", () => {
  for (const type of [
    "offroad-moto",
    "racing-moto",
    "vespa",
    "mercedes-c300",
    "tuktuk",
  ]) {
    const model = vehicleModel(type);
    prepareVehicleMotion(model);
    model.position.y = roadHeight(type);
    assert.ok(model.userData.wheelPivots.length >= 2, type);
    animateVehicle(
      model,
      { type, speed: 8, turnRate: 0, steering: 0 },
      0.1,
      true,
    );
    assert.ok(model.userData.wheelPivots[0].rotation.x > 0, type);
    model.updateMatrixWorld(true);
    let minimum = Infinity;
    model.traverse((object) => {
      if (object.userData.wheel && object.geometry) {
        const vertices = object.geometry.attributes.position;
        for (let i = 0; i < vertices.count; i++) {
          const point = new T.Vector3()
            .fromBufferAttribute(vertices, i)
            .applyMatrix4(object.matrixWorld);
          minimum = Math.min(minimum, point.y);
        }
      }
    });
    assert.ok(minimum >= 0.12 - 1e-5, `${type}: tire bottom ${minimum}`);
    disposeMeshes(model);
  }
});
test("reverse input first brakes forward motion, then reverses, and steering is shared for animation", () => {
  const car = { type: "offroad-moto", x: 0, z: 0, heading: 0, speed: 8 };
  stepVehicle(car, new Set(["s", "a"]), 1 / 30, () => false);
  assert.ok(car.speed < 8 && car.speed > 0);
  assert.equal(car.braking, true);
  assert.equal(car.steering, 1);
  assert.ok(car.turnRate > 0);
  for (let i = 0; i < 150; i++)
    stepVehicle(car, new Set(["s"]), 1 / 30, () => false);
  assert.ok(car.speed < 0);
});
