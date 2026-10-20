import { test } from "node:test";
import assert from "node:assert/strict";
import { bindViewportGestures } from "../src/mobile.js";

test("pinch and Safari zoom are blocked without cancelling single-finger form scrolling", () => {
  const handlers = new Map(),
    removed = [];
  const cleanup = bindViewportGestures({
    addEventListener(type, handler, options) {
      assert.equal(options.passive, false);
      handlers.set(type, handler);
    },
    removeEventListener(type) {
      removed.push(type);
    },
  });
  const event = (touches) => ({
    cancelable: true,
    touches: Array(touches).fill({}),
    preventDefault() {
      this.prevented = true;
    },
  });
  for (const type of ["touchstart", "touchmove"]) {
    const single = event(1);
    handlers.get(type)(single);
    assert.ok(!single.prevented);
    const multi = event(2);
    handlers.get(type)(multi);
    assert.equal(multi.prevented, true);
  }
  for (const type of ["gesturestart", "gesturechange"]) {
    const gesture = event(2);
    handlers.get(type)(gesture);
    assert.equal(gesture.prevented, true);
  }
  const world = { ...event(1), target: { closest: () => true } };
  handlers.get("dblclick")(world);
  assert.equal(world.prevented, true);
  const field = { ...event(1), target: { closest: () => false } };
  handlers.get("dblclick")(field);
  assert.ok(!field.prevented);
  const uncancellable = { ...event(2), cancelable: false };
  handlers.get("touchmove")(uncancellable);
  assert.ok(!uncancellable.prevented);
  const tap = (time, editable = false) => ({
    ...event(0),
    timeStamp: time,
    changedTouches: [{ clientX: 100, clientY: 100 }],
    target: {
      closest: (selector) => (selector.startsWith("input") ? editable : true),
    },
  });
  const first = tap(1000);
  handlers.get("touchend")(first);
  assert.ok(!first.prevented);
  const second = tap(1200);
  handlers.get("touchend")(second);
  assert.equal(second.prevented, true);
  const editable = tap(1250, true);
  handlers.get("touchend")(editable);
  assert.ok(!editable.prevented);
  cleanup();
  assert.equal(removed.length, 6);
});
