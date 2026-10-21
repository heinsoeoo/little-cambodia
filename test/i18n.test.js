import { test } from "node:test";
import assert from "node:assert/strict";
import { savedLanguage, translate, LANGUAGE_KEY } from "../src/i18n.js";
test("language persistence accepts only supported choices and tolerates unavailable storage", () => {
  assert.equal(
    savedLanguage({ getItem: (key) => (key === LANGUAGE_KEY ? "km" : null) }),
    "km",
  );
  assert.equal(savedLanguage({ getItem: () => "en" }), "en");
  assert.equal(savedLanguage({ getItem: () => "fr" }), null);
  assert.equal(
    savedLanguage({
      getItem: () => {
        throw Error();
      },
    }),
    null,
  );
  assert.equal(savedLanguage(undefined), null);
});
test("Khmer game messages preserve player names, distances and time", () => {
  assert.equal(translate("Start game ↗", "km"), "ចូលលេង ↗");
  assert.equal(
    translate("Welcome, Claraa. The riverside is yours to explore.", "km"),
    "សូមស្វាគមន៍ Claraa។ សូមរីករាយរុករកមាត់ទន្លេ។",
  );
  assert.equal(
    translate("Your Mercedes C 300 · 12 m away", "km"),
    "Mercedes C 300 របស់អ្នក · ចម្ងាយ 12 ម៉ែត្រ",
  );
  assert.match(
    translate("Tue, 20 Oct 2026 · 08:07 · Game time · 10×", "km"),
    /តុលា 2026 · 08:07 · ម៉ោងហ្គេម · 10×/,
  );
  assert.equal(translate("Mercedes C 300", "km"), "Mercedes C 300");
  assert.equal(translate("3 / 16 guests online", "km"), "3 / 16 នាក់កំពុងលេង");
  assert.equal(translate("Start game ↗", "en"), "Start game ↗");
});
