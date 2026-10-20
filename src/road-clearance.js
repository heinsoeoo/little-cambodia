import { insidePolygon } from "./buildings.js";
function pointDistance(p, a, b) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    l = dx * dx + dz * dz;
  const t = l
    ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l))
    : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
}
function cross(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}
export function segmentDistance(a, b, c, d) {
  if (
    cross(a, b, c) * cross(a, b, d) < 0 &&
    cross(c, d, a) * cross(c, d, b) < 0
  )
    return 0;
  return Math.min(
    pointDistance(a, c, d),
    pointDistance(b, c, d),
    pointDistance(c, a, b),
    pointDistance(d, a, b),
  );
}
export function roadCorridorIndex(roads) {
  const grid = new Map(),
    size = 50;
  for (const road of roads)
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1],
        b = road.points[i],
        radius = road.width / 2 + 0.5;
      const segment = { a, b, radius, roadId: road.id };
      for (
        let x = Math.floor((Math.min(a[0], b[0]) - radius) / size);
        x <= Math.floor((Math.max(a[0], b[0]) + radius) / size);
        x++
      )
        for (
          let z = Math.floor((Math.min(a[1], b[1]) - radius) / size);
          z <= Math.floor((Math.max(a[1], b[1]) + radius) / size);
          z++
        ) {
          const key = `${x},${z}`;
          if (!grid.has(key)) grid.set(key, []);
          grid.get(key).push(segment);
        }
    }
  return function overlaps(points) {
    const xs = points.map((p) => p[0]),
      zs = points.map((p) => p[1]),
      candidates = new Set();
    for (
      let x = Math.floor(Math.min(...xs) / size);
      x <= Math.floor(Math.max(...xs) / size);
      x++
    )
      for (
        let z = Math.floor(Math.min(...zs) / size);
        z <= Math.floor(Math.max(...zs) / size);
        z++
      )
        for (const s of grid.get(`${x},${z}`) || []) candidates.add(s);
    for (const { a, b, radius } of candidates) {
      if (insidePolygon(...a, points) || insidePolygon(...b, points))
        return true;
      for (let i = 0; i < points.length; i++)
        if (
          segmentDistance(a, b, points[i], points[(i + 1) % points.length]) <
          radius
        )
          return true;
    }
    return false;
  };
}
// The source is retained intact. Only conflicting footprints are omitted from gameplay.
export function clearRoadBuildings(map) {
  const overlaps = roadCorridorIndex(map.roads),
    removed = [];
  const buildings = map.buildings.filter((b) => {
    if (overlaps(b.points)) {
      removed.push(b.id);
      return false;
    }
    return true;
  });
  return {
    ...map,
    buildings,
    roadClearance: {
      sourceBuildings: map.buildings.length,
      omittedBuildingIds: removed,
    },
  };
}
