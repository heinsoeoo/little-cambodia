import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CityClock,
  sharedGameTime,
  gameCalendar,
  GAME_TIME_ANCHOR,
  GAME_CALENDAR_START,
  activityAt,
} from "../src/schedule.js";
test("one real minute is ten game minutes and a full day lasts 144 real minutes", () => {
  assert.equal(
    sharedGameTime(GAME_TIME_ANCHOR + 60000) - GAME_CALENDAR_START,
    600000,
  );
  assert.equal(
    sharedGameTime(GAME_TIME_ANCHOR + 144 * 60000) - GAME_CALENDAR_START,
    24 * 3600000,
  );
  assert.equal(sharedGameTime(GAME_TIME_ANCHOR - 1000), GAME_CALENDAR_START);
});
test("calendar rolls over midnight, month, leap day and weekends independent of phone timezone", () => {
  const clock = new CityClock();
  clock.sync(Date.parse("2028-02-28T23:59:00Z"));
  clock.tick(6);
  assert.equal(clock.read().date, 29);
  assert.equal(clock.read().month, 2);
  assert.equal(clock.read().timeLabel, "00:00");
  clock.sync(Date.parse("2026-10-23T23:59:00Z"));
  clock.tick(6);
  assert.equal(clock.read().day, 6);
  clock.tick(18 * 360);
  assert.ok(activityAt(clock.read()).market);
  assert.ok(
    gameCalendar(Date.parse("2026-12-31T23:59:00Z") + 60000).dateLabel.includes(
      "2027",
    ),
  );
});
test("local previews leave the shared timeline advancing and server sync corrects reconnects", () => {
  const a = new CityClock(),
    b = new CityClock();
  const server = sharedGameTime(GAME_TIME_ANCHOR + 3600000);
  a.sync(server);
  b.sync(server);
  assert.deepEqual(a.read(), b.read());
  a.setMode("market");
  a.tick(60);
  b.tick(60);
  a.setMode("now");
  assert.deepEqual(a.read(), b.read());
  a.sync(NaN);
  a.tick(-1);
  assert.deepEqual(a.read(), b.read());
  a.sync(sharedGameTime(GAME_TIME_ANCHOR + 7200000));
  assert.equal(a.read().hour, 4);
});
