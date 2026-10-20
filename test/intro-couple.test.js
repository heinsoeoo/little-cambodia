import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIntroCouple } from "../src/intro-couple.js";
test("intro couple uses the game avatars, one watch and waves that stop for reduced motion", () => {
  const couple = buildIntroCouple();
  assert.equal(couple.hein.group.userData.appearance.gender, "male");
  assert.equal(couple.claraa.group.userData.appearance.gender, "female");
  assert.ok(couple.hein.group.getObjectByName("clothed-torso"));
  const watches = [];
  couple.root.traverse((o) => {
    if (o.name === "hein-single-watch") watches.push(o);
  });
  assert.equal(watches.length, 1);
  couple.update(0, true);
  const angle = couple.hein.arms[0].rotation.z;
  couple.update(0.3, true);
  assert.notEqual(couple.hein.arms[0].rotation.z, angle);
  couple.update(2, false);
  const frozen = couple.hein.arms[0].rotation.z;
  couple.update(20, false);
  assert.equal(couple.hein.arms[0].rotation.z, frozen);
  assert.equal(couple.hein.group.position.y, 0);
  couple.hein.dispose();
  couple.claraa.dispose();
});
