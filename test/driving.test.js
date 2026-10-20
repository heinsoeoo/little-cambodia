import { test } from "node:test";
import assert from "node:assert/strict";
import { stepVehicle } from "../src/vehicle.js";
import { vehiclePhysics } from "../src/vehicle-catalog.js";
const car = (type = "corolla", speed = 0) => ({
  type,
  x: 0,
  z: 0,
  heading: 0,
  speed,
});
function run(c, keys, seconds) {
  for (let i = 0; i < seconds * 60; i++)
    stepVehicle(c, new Set(keys), 1 / 60, () => false);
  return c;
}
test("power and braking differ modestly between cars; regular brake stops without creeping or reversing", () => {
  const a = run(car("corolla"), ["w"], 2),
    b = run(car("skyline-r34"), ["w"], 2);
  assert.ok(b.speed > a.speed * 1.2);
  const strong = run(car("skyline-r34", 20), [" "], 0.5),
    soft = run(car("cedric", 20), [" "], 0.5);
  assert.ok(strong.speed < soft.speed);
  run(soft, ["w", " "], 2);
  assert.equal(soft.speed, 0);
  assert.equal(run(car("corolla", 20), [" "], 0.7).speed, 0);
  assert.equal(vehiclePhysics("car").power, vehiclePhysics("corolla").power);
  assert.ok(run(car("rickshaw"), ["w"], 1).speed > 1);
});
test("handbrake permits a sideways slide while normal tyres regain grip", () => {
  const slide = run(car("skyline-r34", 20), ["a", "shift"], 0.4),
    grip = run(car("skyline-r34", 20), ["a"], 0.4);
  const slip = (c) =>
    Math.abs(c.vx * Math.cos(c.heading) - c.vz * Math.sin(c.heading));
  assert.ok(slip(slide) > slip(grip) * 2);
  assert.equal(slide.drifting, true);
  run(slide, [], 1);
  assert.ok(slip(slide) < 0.1);
  assert.equal(slide.drifting, false);
});
test("drifting collision clears velocity and substeps cannot jump a thin obstacle", () => {
  const c = car("cedric", 30);
  c.vx = 5;
  c.vz = 30;
  assert.equal(
    stepVehicle(c, new Set(["shift"]), 0.1, (x, z) => z >= 1 && z < 1.6),
    true,
  );
  assert.equal(c.x, 0);
  assert.equal(c.z, 0);
  assert.equal(c.speed, 0);
  assert.equal(c.vx, 0);
  assert.equal(c.vz, 0);
});
