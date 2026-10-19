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
export class CityClock {
  mode = "now";
  elapsed = 0;
  setMode(mode) {
    this.mode = mode;
    this.elapsed = 0;
  }
  tick(dt) {
    if (this.mode !== "now") this.elapsed += dt;
  }
  read(now = new Date()) {
    if (this.mode === "now") return phnomPenhTime(now);
    const base =
      this.mode === "market"
        ? new Date("2026-10-17T12:30:00Z")
        : new Date("2026-10-19T05:00:00Z");
    return phnomPenhTime(new Date(base.getTime() + this.elapsed * 6000));
  }
}
