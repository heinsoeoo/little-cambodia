import data from "./places-data.json" with { type: "json" };
import { insidePolygon } from "./buildings.js";

export const places = data.map((place) => {
  const points = place.points.slice(0, -1);
  const center = points.reduce(
    (sum, p) => [sum[0] + p[0] / points.length, sum[1] + p[1] / points.length],
    [0, 0],
  );
  return { ...place, center };
});
export function buildingPlace(building) {
  const exact = places.find((place) => place.id === building.id);
  if (exact) return exact;
  const p = building.points[0];
  return places.find(
    (place) =>
      place.kind.includes("market") && insidePolygon(...p, place.points),
  );
}
// Fit details inside a footprint; concave and rotated buildings need more than a bounding box.
export function detailFootprint(points) {
  let longest = 0,
    angle = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0],
      dz = points[i][1] - points[i - 1][1];
    if (dx * dx + dz * dz > longest) {
      longest = dx * dx + dz * dz;
      angle = Math.atan2(dz, dx);
    }
  }
  const cos = Math.cos(angle),
    sin = Math.sin(angle);
  const oriented = points.map(([x, z]) => [
    x * cos + z * sin,
    -x * sin + z * cos,
  ]);
  const fit = fitRectangle(oriented);
  return fit
    ? {
        ...fit,
        w: fit.w * 0.98,
        d: fit.d * 0.98,
        x: fit.x * cos - fit.z * sin,
        z: fit.x * sin + fit.z * cos,
        angle,
      }
    : null;
}
function fitRectangle(points) {
  const xs = points.map((p) => p[0]),
    zs = points.map((p) => p[1]);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minZ = Math.min(...zs),
    maxZ = Math.max(...zs);
  let best = null;
  for (let ix = 1; ix < 10; ix++)
    for (let iz = 1; iz < 10; iz++) {
      const x = minX + ((maxX - minX) * ix) / 10,
        z = minZ + ((maxZ - minZ) * iz) / 10;
      for (let scale = 0.8; scale >= 0.1; scale -= 0.1) {
        const w = (maxX - minX) * scale,
          d = (maxZ - minZ) * scale;
        const corners = [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
          [0, -1],
          [0, 1],
          [-1, 0],
          [1, 0],
        ].map(([a, b]) => [x + (a * w) / 2, z + (b * d) / 2]);
        if (corners.every((p) => insidePolygon(...p, points))) {
          if (!best || w * d > best.w * best.d) best = { x, z, w, d };
          break;
        }
      }
    }
  return best;
}
export function nearestPlace(x, z, radius = 110) {
  return places
    .map((p) => ({
      ...p,
      distance: Math.hypot(x - p.center[0], z - p.center[1]),
    }))
    .filter((p) => p.distance < radius)
    .sort((a, b) => a.distance - b.distance)[0];
}
