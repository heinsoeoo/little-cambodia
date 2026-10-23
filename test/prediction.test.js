import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalPrediction, INPUT_STEP } from "../src/prediction.js";
import { createGuest, stepGuest } from "../src/open-world.js";
test("delayed snapshots replay unacknowledged inputs without pulling the local player backward", () => {
  const prediction = new LocalPrediction();
  let local = createGuest("local", "Sok"),
    server = structuredClone(local),
    ack = 0;
  const incoming = [];
  for (let frame = 0; frame < 120; frame++) {
    const keys = new Set(frame < 60 ? ["w"] : frame < 90 ? ["d"] : []);
    prediction.advance(local, keys, (command) => {
      incoming.push({ command, arrival: frame + 12 });
      return true;
    });
    while (incoming.length && incoming[0].arrival <= frame) {
      const { command } = incoming.shift();
      stepGuest(server, new Set(command.keys), INPUT_STEP);
      ack = command.sequence;
    }
    if (frame % 3 === 0) {
      const before = structuredClone(local);
      local = prediction.reconcile(server, ack);
      assert.ok(Math.hypot(before.x - local.x, before.z - local.z) < 1e-8);
      assert.equal(local.speed, before.speed);
    }
  }
  assert.equal(prediction.sequence, 120);
  assert.ok(prediction.pending.length <= 15);
});
test("congested sends do not advance simulation and prediction history is bounded", () => {
  const prediction = new LocalPrediction(),
    player = createGuest("local", "Sok"),
    before = structuredClone(player);
  assert.equal(
    prediction.advance(player, new Set(["w"]), () => false),
    false,
  );
  assert.deepEqual(player, before);
  assert.equal(prediction.sequence, 0);
  for (let i = 0; i < 90; i++)
    prediction.advance(player, new Set(), () => true);
  assert.equal(
    prediction.advance(player, new Set(), () => true),
    false,
  );
  assert.equal(prediction.pending.length, 90);
  prediction.reset();
  assert.equal(prediction.pending.length, 0);
  assert.equal(prediction.sequence, 90);
});
