import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isFacebookBrowser,
  needsBrowserNotice,
} from "../src/browser-notice.js";
test("Facebook in-app browsers receive the tip once per session without changing regular Safari and Chrome", () => {
  for (const ua of [
    "Mozilla/5.0 [FBAN/FBIOS;FBAV/480.0]",
    "Android; FB_IAB/FB4A;FBAV/1.0",
    "Mozilla FBAN:FB4A",
  ])
    assert.ok(isFacebookBrowser(ua));
  for (const ua of [
    "Mozilla/5.0 iPhone Version/18 Safari/605",
    "Mozilla/5.0 Android Chrome/130",
    "facebook.com",
  ])
    assert.equal(isFacebookBrowser(ua), false);
  assert.ok(needsBrowserNotice("FBAV/1", { getItem: () => null }));
  assert.equal(needsBrowserNotice("FBAV/1", { getItem: () => "1" }), false);
  assert.ok(
    needsBrowserNotice("FBAV/1", {
      getItem() {
        throw Error("blocked");
      },
    }),
  );
});
