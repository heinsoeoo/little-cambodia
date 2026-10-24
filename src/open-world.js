import { CLASSES, classId, dungeonBlocked } from "./dungeon-rules.js";
import { riversideBenches, nearestBench } from "./benches.js";
import { appearance } from "./wardrobe.js";
import { phnomMap, bounds, spawn, promenade } from "./phnom-map.js";
import { insidePolygon } from "./buildings.js";
import { nearestRoad } from "./geo.js";
import { stepVehicle } from "./vehicle.js";
import { VEHICLE_TYPES, vehiclePaint } from "./vehicle-catalog.js";
export { VEHICLE_TYPES };
export const town = phnomMap;
const grid = new Map();
for (const b of town.buildings) {
  const xs = b.points.map((p) => p[0]),
    zs = b.points.map((p) => p[1]);
  for (
    let x = Math.floor((Math.min(...xs) - 2) / 40);
    x <= Math.floor((Math.max(...xs) + 2) / 40);
    x++
  )
    for (
      let z = Math.floor((Math.min(...zs) - 2) / 40);
      z <= Math.floor((Math.max(...zs) + 2) / 40);
      z++
    ) {
      const key = `${x},${z}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(b);
    }
}
export function nickname(value) {
  if (typeof value !== "string") return "";
  return [
    ...value
      .normalize("NFKC")
      .replace(/[\p{Cc}\p{Cf}<>]/gu, "")
      .trim()
      .replace(/\s+/g, " "),
  ]
    .slice(0, 20)
    .join("");
}
export function blocked(x, z, mode = "walk") {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(z) ||
    x < bounds.min[0] + 3 ||
    x > bounds.max[0] - 3 ||
    z < bounds.min[1] + 3 ||
    z > bounds.max[1] - 3
  )
    return true;
  if (town.water.some((w) => insidePolygon(x, z, w.points))) return true;
  if (
    mode === "drive" &&
    nearestRoad([x, z], [{ points: promenade }]).distance < 4.2
  )
    return true;
  const radius = mode === "drive" ? 1.1 : 0.35;
  return (grid.get(`${Math.floor(x / 40)},${Math.floor(z / 40)}`) || []).some(
    (b) => {
      if (insidePolygon(x, z, b.points)) return true;
      return b.points.some((a, i) => {
        const c = b.points[(i + 1) % b.points.length],
          dx = c[0] - a[0],
          dz = c[1] - a[1],
          t = Math.max(
            0,
            Math.min(
              1,
              ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1),
            ),
          );
        return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < radius;
      });
    },
  );
}
export const BENCHES = riversideBenches(promenade, blocked);
export function createGuest(id, name, index = 0, look) {
  return {
    id,
    nickname: name,
    appearance: appearance(look),
    x: spawn[0],
    z: spawn[1] + (index % 12) * 0.4,
    heading: Math.PI,
    mode: "walk",
    speed: 0,
    vehicle: null,
    combatClass: "fighter",
    dungeonId: null,
    riftCoins: 0,
    riftEquipment: [],
  };
}
export function stepGuest(player, keys, dt, cameraYaw = 0) {
  if (player.gestureSeconds > 0) {
    player.gestureSeconds = Math.max(0, player.gestureSeconds - dt);
    if (!player.gestureSeconds) player.gesture = null;
  }
  if (player.mode === "drive" && player.vehicle) {
    stepVehicle(player.vehicle, keys, dt, (x, z) => blocked(x, z, "drive"));
    Object.assign(player, {
      x: player.vehicle.x,
      z: player.vehicle.z,
      heading: player.vehicle.heading,
      speed: player.vehicle.speed,
    });
    return;
  }
  let dx =
    Number(keys.has("d") || keys.has("arrowright")) -
    Number(keys.has("a") || keys.has("arrowleft"));
  let dz =
    Number(keys.has("s") || keys.has("arrowdown")) -
    Number(keys.has("w") || keys.has("arrowup"));
  const angle = Number.isFinite(cameraYaw) ? cameraYaw : 0;
  [dx, dz] = [
    dx * Math.cos(angle) + dz * Math.sin(angle),
    dz * Math.cos(angle) - dx * Math.sin(angle),
  ];
  const length = Math.hypot(dx, dz);
  if (player.posture === "sit" && !length) {
    player.speed = 0;
    return;
  }
  if (length) {
    player.posture = null;
    player.benchId = null;
  }
  const pace = player.dungeonId
    ? CLASSES[classId(player.combatClass)].speed * (keys.has("shift") ? 1.4 : 1)
    : keys.has("shift")
      ? 7
      : 4.5;
  player.speed = length ? pace : 0;
  if (!length) return;
  dx = (dx / length) * pace * dt;
  dz = (dz / length) * pace * dt;
  const collision = player.dungeonId
    ? (x, z) => dungeonBlocked(x, z, player.dungeonStage)
    : blocked;
  if (!collision(player.x + dx, player.z)) player.x += dx;
  if (!collision(player.x, player.z + dz)) player.z += dz;
  player.heading = Math.atan2(dx, dz);
}
export function guestAction(
  player,
  action,
  type = "car",
  occupied = [],
  paint = player.preferredPaint,
) {
  if (player.dungeonId)
    return "Return to the city before using city activities.";
  if (action === "sit") {
    if (player.mode !== "walk") return "Get out of your vehicle to sit down.";
    if (player.posture === "sit") {
      player.posture = null;
      player.benchId = null;
      return null;
    }
    const bench = nearestBench(player, BENCHES);
    if (!bench || bench.distance > 3)
      return "Walk closer to a riverside bench.";
    if (occupied.some((other) => other.benchId === bench.id))
      return "This bench is occupied. Try another bench.";
    Object.assign(player, {
      x: bench.x,
      z: bench.z,
      heading: bench.heading,
      speed: 0,
      posture: "sit",
      benchId: bench.id,
    });
    return null;
  }
  if (action === "eat" || action === "wave") {
    if (player.mode !== "walk")
      return "Get out of your vehicle for a snack break.";
    player.gesture = action;
    player.gestureSeconds = action === "eat" ? 4.5 : 2;
    return null;
  }
  player.posture = null;
  player.benchId = null;
  if (action === "summon") {
    if (player.mode === "drive")
      return "Exit your vehicle before summoning another.";
    if (!VEHICLE_TYPES.includes(type)) return "Choose a valid vehicle.";
    const road = nearestRoad([player.x, player.z], town.roads);
    if (road.distance > 38) return "Walk closer to a road to summon a vehicle.";
    const candidates = [
      [0, 0],
      [0, 5],
      [0, -5],
      [3, 0],
      [-3, 0],
      [0, 9],
      [0, -9],
    ];
    for (const [dx, dz] of candidates) {
      const x = road.point[0] + dx,
        z = road.point[1] + dz;
      if (
        !blocked(x, z, "drive") &&
        occupied.every((v) => Math.hypot(v.x - x, v.z - z) > 4)
      ) {
        player.vehicle = {
          type,
          paint: vehiclePaint(paint),
          x,
          z,
          heading: road.heading + (road.t > 0.5 ? Math.PI : 0),
          speed: 0,
        };
        return null;
      }
    }
    return "This spot is busy. Walk a little further along the road.";
  }
  if (action === "enter") {
    if (player.mode === "drive") return null;
    if (
      !player.vehicle ||
      Math.hypot(player.x - player.vehicle.x, player.z - player.vehicle.z) > 4
    )
      return "Walk within 4 m of your vehicle to enter.";
    player.mode = "drive";
    Object.assign(player, {
      x: player.vehicle.x,
      z: player.vehicle.z,
      heading: player.vehicle.heading,
      speed: 0,
    });
    return null;
  }
  if (action === "exit") {
    if (player.mode !== "drive") return null;
    const v = player.vehicle;
    for (const [dx, dz] of [
      [3, 0],
      [-3, 0],
      [0, 3],
      [0, -3],
      [4, 4],
      [-4, -4],
    ])
      if (!blocked(v.x + dx, v.z + dz)) {
        player.mode = "walk";
        player.x = v.x + dx;
        player.z = v.z + dz;
        player.speed = 0;
        v.speed = v.vx = v.vz = 0;
        v.drifting = false;
        return null;
      }
    return "Park in an open spot before getting out.";
  }
  return "Unknown action.";
}
