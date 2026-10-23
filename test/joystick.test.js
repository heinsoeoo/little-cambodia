import { test } from "node:test";
import assert from "node:assert/strict";
import { bindWalkingJoystick } from "../src/mobile.js";

test("walking joystick supports diagonals, dead zone, pointer ownership and cancellation", () => {
  const handlers = new Map(),
    properties = new Map(),
    keys = new Set();
  const element = {
    addEventListener: (name, fn) => handlers.set(name, fn),
    setPointerCapture() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    style: { setProperty: (key, value) => properties.set(key, value) },
    classList: { add() {}, remove() {} },
  };
  const clear = bindWalkingJoystick(element, keys);
  const event = (x, y, id = 1) => ({
    clientX: x,
    clientY: y,
    pointerId: id,
    preventDefault() {},
  });
  handlers.get("pointerdown")(event(90, 10));
  assert.deepEqual([...keys].sort(), ["arrowright", "arrowup"]);
  handlers.get("pointerdown")(event(0, 100, 2));
  handlers.get("pointerup")(event(0, 0, 2));
  assert.ok(keys.has("arrowup"));
  handlers.get("pointermove")(event(50, 50));
  assert.equal(keys.size, 0);
  handlers.get("pointermove")(event(0, 50));
  assert.ok(keys.has("arrowleft"));
  handlers.get("pointercancel")(event(0, 50));
  assert.equal(keys.size, 0);
  assert.equal(properties.get("--stick-x"), "0px");
  handlers.get("pointerdown")(event(50, 100));
  clear();
  assert.equal(keys.size, 0);
  handlers.get("pointermove")(event(100, 100));
  assert.equal(keys.size, 0);
});

test("outer joystick edge sprints but release and cancellation always stop", () => {
  const handlers = new Map(),
    keys = new Set();
  let sprint = false;
  const element = {
    addEventListener: (name, fn) => handlers.set(name, fn),
    setPointerCapture() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    style: { setProperty() {} },
    classList: { add() {}, remove() {} },
  };
  const clear = bindWalkingJoystick(element, keys, {
    onSprint: (value) => (sprint = value),
  });
  const event = (x, y, id = 1) => ({
    clientX: x,
    clientY: y,
    pointerId: id,
    preventDefault() {},
  });
  handlers.get("pointerdown")(event(50, 35));
  assert.equal(sprint, false);
  handlers.get("pointermove")(event(50, 20));
  assert.equal(sprint, true);
  handlers.get("pointerup")(event(50, 20));
  assert.equal(keys.size, 0);
  assert.equal(sprint, false);
  handlers.get("pointerdown")(event(50, 20));
  handlers.get("pointermove")(event(50, -30));
  handlers.get("pointerup")(event(50, -30));
  assert.equal(keys.size, 0);
  assert.equal(sprint, false);
  clear();
  handlers.get("pointerdown")(event(50, -30));
  handlers.get("pointercancel")(event(50, -30));
  assert.equal(sprint, false);
  assert.equal(keys.size, 0);
});
