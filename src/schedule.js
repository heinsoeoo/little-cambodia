const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Phnom_Penh",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
export function phnomPenhTime(date = new Date()) {
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return {
    day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
      parts.weekday,
    ),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    label: `${parts.weekday} ${parts.hour}:${parts.minute}`,
  };
}
export function activityAt({ day, hour, minute = 0 }) {
  const time = hour + minute / 60,
    market = [0, 6].includes(day) && time >= 18 && time < 23;
  const night = time < 6 || time >= 18,
    vendors = time >= 7 && time < 23;
  return {
    market,
    night,
    vendors: market ? 22 : vendors ? (night ? 8 : 4) : 0,
    people: market ? 240 : vendors ? (night ? 60 : 36) : 10,
    label: market
      ? "Weekend riverside market"
      : vendors
        ? night
          ? "Evening food carts"
          : "Daytime riverside"
        : "Quiet riverside",
  };
}

// A stable anchor keeps the shared calendar across reloads and deployments.
// Calendar timestamps represent fictional local game time, formatted in UTC to
// keep phone time zones from shifting the city's date or opening hours.
export const GAME_TIME_RATE = 10;
export const GAME_TIME_ANCHOR = Date.parse("2026-10-20T08:36:44Z");
export const GAME_CALENDAR_START = Date.parse("2026-10-20T08:00:00Z");
export function sharedGameTime(realTime = Date.now()) {
  return (
    GAME_CALENDAR_START +
    Math.max(0, realTime - GAME_TIME_ANCHOR) * GAME_TIME_RATE
  );
}
const calendarFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
});
export function gameCalendar(timestamp) {
  const date = new Date(timestamp),
    timeLabel = `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
  const dateLabel = calendarFormatter.format(date);
  return {
    day: date.getUTCDay(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    date: date.getUTCDate(),
    dateLabel,
    timeLabel,
    label: `${dateLabel} · ${timeLabel}`,
  };
}
export class CityClock {
  mode = "now";
  elapsed = 0;
  current = GAME_CALENDAR_START;
  sync(timestamp) {
    if (
      Number.isFinite(timestamp) &&
      timestamp >= GAME_CALENDAR_START &&
      timestamp <= 8.64e15
    )
      this.current = timestamp;
  }
  setMode(mode) {
    this.mode = ["now", "day", "market"].includes(mode) ? mode : "now";
    this.elapsed = 0;
  }
  tick(dt) {
    if (!Number.isFinite(dt) || dt < 0) return;
    this.current += dt * 1000 * GAME_TIME_RATE;
    if (this.mode !== "now") this.elapsed += dt;
  }
  read() {
    if (this.mode === "now") return gameCalendar(this.current);
    const base =
      this.mode === "market"
        ? Date.parse("2026-10-24T19:30:00Z")
        : Date.parse("2026-10-20T12:00:00Z");
    return gameCalendar(base + this.elapsed * 1000 * GAME_TIME_RATE);
  }
}
