import { test } from "node:test";
import assert from "node:assert/strict";
import { followCamera } from "../src/camera-follow.js";
test("fast motion keeps the camera offset and vehicle framing stable", () => {
  let position, look;
  const camera = {
    position: { set: (...args) => (position = args) },
    lookAt: (...args) => (look = args),
  };
  const offset = { x: 40, y: 58, z: 90 },
    desired = { ...offset };
  for (let frame = 0; frame < 120; frame++) {
    const focus = { x: frame * 1.2, z: frame * 0.5 };
    followCamera(camera, focus, desired, offset, 1 / 60);
    assert.ok(Math.abs(position[0] - focus.x - 40) < 1e-8);
    assert.ok(Math.abs(position[2] - focus.z - 90) < 1e-8);
    assert.deepEqual(look, [focus.x, 0, focus.z]);
  }
  followCamera(
    camera,
    { x: 0, z: 0 },
    { x: -90, y: 50, z: 40 },
    offset,
    1 / 60,
  );
  assert.ok(offset.x < 40 && offset.x > -90);
  assert.ok(offset.y < 58 && offset.y > 50);
});
