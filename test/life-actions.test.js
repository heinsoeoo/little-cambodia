import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGuest,
  stepGuest,
  guestAction,
  BENCHES,
  blocked,
} from "../src/open-world.js";
import { createCharacter } from "../src/character.js";
import { collectionFor } from "../src/collections.js";

test("walking, running and seated rest use validated riverside benches", () => {
  assert.ok(BENCHES.length > 10);
  const bench = BENCHES[0];
  assert.equal(blocked(bench.x, bench.z), false);
  const guest = createGuest("guest", "Sok");
  Object.assign(guest, { x: bench.x, z: bench.z });
  const walking = structuredClone(guest),
    running = structuredClone(guest);
  stepGuest(walking, new Set(["w"]), 1 / 30);
  stepGuest(running, new Set(["w", "shift"]), 1 / 30);
  assert.ok(running.speed > walking.speed);
  assert.equal(guestAction(guest, "sit"), null);
  assert.equal(guest.posture, "sit");
  assert.equal(guest.benchId, bench.id);
  const position = [guest.x, guest.z];
  stepGuest(guest, new Set(), 1 / 30);
  assert.deepEqual([guest.x, guest.z], position);
  const other = createGuest("other", "Dara");
  Object.assign(other, { x: bench.x, z: bench.z });
  assert.match(guestAction(other, "sit", "car", [guest]), /occupied/);
  stepGuest(guest, new Set(["w"]), 1 / 30);
  assert.equal(guest.posture, null);
  Object.assign(guest, { x: bench.x, z: bench.z });
  assert.equal(guestAction(guest, "sit"), null);
  assert.equal(guestAction(guest, "sit"), null);
  assert.equal(guest.posture, null);
  Object.assign(other, { x: bench.x + 20, z: bench.z });
  assert.match(guestAction(other, "sit"), /closer/);
});
test("snack gestures expire and the avatar restores its walking pose", () => {
  const guest = createGuest("guest", "Sok");
  assert.equal(guestAction(guest, "eat"), null);
  const avatar = createCharacter();
  avatar.pose(guest);
  const snacks = [];
  avatar.group.traverse((object) => {
    if (object.name === "held-snack") snacks.push(object);
  });
  assert.equal(snacks.filter((object) => object.visible).length, 1);
  for (let i = 0; i < 150; i++) stepGuest(guest, new Set(), 1 / 30);
  assert.equal(guest.gesture, null);
  avatar.pose(guest);
  assert.equal(
    snacks.some((object) => object.visible),
    false,
  );
  guest.posture = "sit";
  avatar.pose(guest);
  assert.equal(avatar.group.getObjectByName("bench-seated-rig").visible, true);
  guest.posture = null;
  avatar.pose(guest);
  assert.equal(avatar.group.getObjectByName("bench-seated-rig").visible, false);
  avatar.dispose();
});
test("cute and cool collections keep both outfit and vehicle choices", () => {
  assert.equal(collectionFor("vehicle", "vespa"), "Cute");
  assert.equal(collectionFor("vehicle", "skyline-r34"), "Cool");
  assert.equal(collectionFor("outfit", "bohemian"), "Cute");
  assert.equal(collectionFor("outfit", "punk"), "Cool");
  assert.equal(collectionFor("outfit", "old-money"), "Classic");
});
