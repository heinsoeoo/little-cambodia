import test from "node:test";
import assert from "node:assert/strict";
import { createVehicleCamera } from "../src/vehicle-camera.js";
const focus = { x: 0, z: 0 };
function orbit() {
  let yaw = 0;
  return {
    yaw: () => yaw,
    setYaw: (v) => {
      yaw = v;
    },
    offset: () => ({ x: Math.sin(yaw) * 100, y: 60, z: Math.cos(yaw) * 100 }),
  };
}
test("clear roads hold camera; blocked driving view finds a clear angle and holds it", () => {
  const camera = createVehicleCamera([
    { minX: -5, maxX: 5, minZ: 10, maxZ: 30, height: 30 },
  ]);
  const o = orbit();
  for (let i = 0; i < 4; i++) camera.update(0.25, focus, o, true, false);
  assert.notEqual(o.yaw(), 0);
  assert.equal(camera.blocked(focus, o.offset()), false);
  const chosen = o.yaw();
  for (let i = 0; i < 20; i++) camera.update(0.25, focus, o, true, false);
  assert.equal(o.yaw(), chosen);
});
test("walking and manual dragging suppress automatic orbit", () => {
  const camera = createVehicleCamera([
    { minX: -5, maxX: 5, minZ: 10, maxZ: 30, height: 30 },
  ]);
  const o = orbit();
  for (let i = 0; i < 10; i++) {
    camera.update(0.25, focus, o, false, false);
    camera.update(0.25, focus, o, true, true);
  }
  assert.equal(o.yaw(), 0);
});
test("low buildings and buildings behind the player do not block the sightline", () => {
  const camera = createVehicleCamera([
    { minX: -5, maxX: 5, minZ: 30, maxZ: 40, height: 3 },
    { minX: -5, maxX: 5, minZ: -30, maxZ: -10, height: 80 },
  ]);
  assert.equal(camera.blocked(focus, orbit().offset()), false);
});
