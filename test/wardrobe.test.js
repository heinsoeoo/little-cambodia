import { test } from "node:test";
import assert from "node:assert/strict";
import { appearance, preset, STYLES, GENDERS } from "../src/wardrobe.js";
import { createCharacter } from "../src/character.js";
test("wardrobe keeps pieces independent and bounds every client-controlled field", () => {
  const mixed = {
    gender: "female",
    skin: "tan",
    top: "casual",
    bottom: "street",
    hair: "punk",
    shoes: "old-money",
  };
  assert.deepEqual(appearance(mixed), mixed);
  assert.equal(STYLES.length, 10);
  assert.deepEqual(
    appearance({
      gender: "<script>",
      skin: [],
      top: "__proto__",
      hair: {},
      shoes: "unknown",
      bottom: null,
      extra: "ignored",
    }),
    appearance(),
  );
  assert.deepEqual(appearance(null), appearance());
  assert.equal(preset("luxury", mixed).gender, "female");
  assert.equal(preset("luxury", mixed).skin, "tan");
  assert.equal(preset("luxury", mixed).bottom, "luxury");
});
test("preview and world character can switch every collection and mixed pieces without losing rider pose", () => {
  const character = createCharacter();
  for (const collection of STYLES) {
    const look = preset(collection.id, { gender: "unspecified", skin: "deep" });
    character.setAppearance(look);
    assert.deepEqual(character.group.userData.appearance, look);
    character.pose({
      mode: "drive",
      speed: 5,
      heading: 1,
      vehicle: { type: "moto", heading: 1 },
    });
    assert.equal(character.group.visible, true);
    assert.equal(character.group.position.y, 0.52);
  }
  const look = appearance({
    top: "casual",
    bottom: "street",
    hair: "punk",
    shoes: "old-money",
  });
  character.setAppearance(look);
  character.pose({ mode: "walk", speed: 1, heading: 0 });
  assert.deepEqual(character.group.userData.appearance, look);
  assert.equal(character.group.position.y, 0);
  character.dispose();
});

test("three gender choices keep garments independent while giving male and female distinct silhouettes", () => {
  assert.deepEqual(
    GENDERS.map((g) => g.name),
    ["Male", "Female", "Prefer not to say"],
  );
  const character = createCharacter({
    gender: "male",
    top: "casual",
    hair: "punk",
    bottom: "street",
    shoes: "luxury",
  });
  const maleShape = [
    ...character.group.getObjectByName("clothed-torso").geometry.attributes
      .position.array,
  ];
  character.setAppearance({
    gender: "female",
    top: "casual",
    hair: "punk",
    bottom: "street",
    shoes: "luxury",
  });
  const femaleShape = [
    ...character.group.getObjectByName("clothed-torso").geometry.attributes
      .position.array,
  ];
  assert.notDeepEqual(maleShape, femaleShape);
  assert.equal(character.group.userData.appearance.hair, "punk");
  assert.equal(character.group.userData.appearance.bottom, "street");
  assert.equal(appearance({ gender: "nonbinary" }).gender, "unspecified");
  character.dispose();
});
