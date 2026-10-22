import { nearestRoad } from "./geo.js";

function along(points, distance) {
  let remaining = Math.max(0, distance);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (remaining <= length) {
      const t = length ? remaining / length : 0;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    remaining -= length;
  }
  return [...points.at(-1)];
}
function length(points) {
  return points
    .slice(1)
    .reduce(
      (sum, p, i) => sum + Math.hypot(p[0] - points[i][0], p[1] - points[i][1]),
      0,
    );
}
// All walking stops stay on the authored promenade; the drive follows one
// continuous mapped road, so checkpoints never require crossing a building.
export function activityCatalog(path, roads, spawn) {
  const nearest = nearestRoad(spawn, [{ points: path }]);
  const before =
    length(path.slice(0, nearest.segment + 1)) +
    Math.hypot(
      nearest.point[0] - path[nearest.segment][0],
      nearest.point[1] - path[nearest.segment][1],
    );
  const direction = before + 210 < length(path) ? 1 : -1;
  const walk = (offset) => along(path, before + offset * direction);
  const scenicRoads = roads.filter((road) => length(road.points) >= 250);
  const road = nearestRoad(
    spawn,
    scenicRoads.length ? scenicRoads : roads,
  ).road;
  const roadLength = length(road.points);
  const drive = [0.15, 0.5, 0.85].map((t) =>
    along(road.points, roadLength * t),
  );
  const stop = (point, label, action) => ({ point, label, action });
  return [
    {
      id: "delivery",
      title: "A little kindness",
      description:
        "Pick up a picnic basket and deliver it to two riverside neighbours.",
      mode: "walk",
      reward: 30,
      stops: [
        stop(walk(12), "Collect the picnic basket", "Pick up basket"),
        stop(
          walk(65),
          "Bring a snack to the garden neighbour",
          "Deliver snack",
        ),
        stop(walk(125), "Share the last snack by the water", "Deliver snack"),
      ],
    },
    {
      id: "postcards",
      title: "Riverside postcard walk",
      description:
        "Find three quiet viewpoints and collect illustrated postcards for your journal.",
      mode: "walk",
      reward: 40,
      stops: [
        stop(walk(35), "Postcard · River breeze", "Collect postcard"),
        stop(walk(110), "Postcard · Passing boats", "Collect postcard"),
        stop(
          walk(200),
          "Postcard · A little closer to home",
          "Collect postcard",
        ),
      ],
    },
    {
      id: "drive",
      title: "Sunday little drive",
      description:
        "Summon any vehicle and cruise through three checkpoints. No rush, just enjoy the city.",
      mode: "drive",
      reward: 35,
      stops: drive.map((point, i) =>
        stop(
          point,
          [
            "Reach the first checkpoint",
            "Cruise to the next checkpoint",
            "Park at the final checkpoint",
          ][i],
          "Stamp checkpoint",
        ),
      ),
    },
  ];
}
export class Activities {
  constructor(catalog, saved = {}) {
    this.catalog = catalog;
    this.completed = Object.fromEntries(
      catalog.map((item) => [
        item.id,
        Number.isSafeInteger(saved.completed?.[item.id])
          ? Math.min(9999, Math.max(0, saved.completed[item.id]))
          : 0,
      ]),
    );
    this.stamps = Number.isSafeInteger(saved.stamps)
      ? Math.min(999999, Math.max(0, saved.stamps))
      : 0;
    this.current = null;
    this.index = 0;
    const active = catalog.find((item) => item.id === saved.active?.id);
    if (
      active &&
      Number.isInteger(saved.active.index) &&
      saved.active.index >= 0 &&
      saved.active.index < active.stops.length
    ) {
      this.current = active;
      this.index = saved.active.index;
    }
  }
  get target() {
    return this.current?.stops[this.index] || null;
  }
  start(id) {
    const found = this.catalog.find((item) => item.id === id);
    if (!found) return false;
    this.current = found;
    this.index = 0;
    return true;
  }
  cancel() {
    this.current = null;
    this.index = 0;
  }
  distance(player) {
    return player && this.target
      ? Math.hypot(
          player.x - this.target.point[0],
          player.z - this.target.point[1],
        )
      : Infinity;
  }
  canInteract(player) {
    return Boolean(
      player &&
        this.current &&
        player.mode === this.current.mode &&
        Math.abs(player.speed || 0) < 1.5 &&
        this.distance(player) <= 10,
    );
  }
  interact(player) {
    if (!this.canInteract(player)) return null;
    const activity = this.current,
      stop = this.target;
    this.index++;
    if (this.index < activity.stops.length)
      return { type: "step", label: stop.label };
    this.completed[activity.id] = Math.min(
      9999,
      this.completed[activity.id] + 1,
    );
    this.stamps = Math.min(999999, this.stamps + activity.reward);
    this.cancel();
    return { type: "complete", title: activity.title, reward: activity.reward };
  }
  save() {
    return {
      stamps: this.stamps,
      completed: { ...this.completed },
      active: this.current ? { id: this.current.id, index: this.index } : null,
    };
  }
}
