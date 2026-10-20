import { test } from "node:test";
import assert from "node:assert/strict";
import { appearance, preset, STYLES } from "../src/wardrobe.js";
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
    const look = preset(collection.id, { gender: "nonbinary", skin: "deep" });
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
