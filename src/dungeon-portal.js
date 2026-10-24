import { spawn, phnomMap } from "./phnom-map.js";
import { places } from "./places.js";
import { nearestRoad } from "./geo.js";
import { blocked } from "./open-world.js";
export const PORTAL = {
  x: spawn[0],
  z: spawn[1] + 5,
  name: "Lantern Rift",
  siteId: "riverside",
  district: "Riverside",
};
export const PORTAL_ENTRY_RANGE = 4;
export const PORTAL_LIFETIME = 5 * 60 * 1000;
function siteFor(place) {
  const road = nearestRoad(place.center, phnomMap.roads);
  const distance = road.road.width / 2 + 2.5;
  const candidates = [1, -1].map((sign) => ({
    x: road.point[0] + Math.cos(road.heading) * distance * sign,
    z: road.point[1] - Math.sin(road.heading) * distance * sign,
  }));
  const point = candidates.find((p) =>
    [
      [0, 0],
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
    ].every(([x, z]) => !blocked(p.x + x, p.z + z)),
  );
  return point
    ? {
        ...point,
        name: "Lantern Rift",
        siteId: String(place.id),
        district: place.name,
      }
    : null;
}
export const PORTAL_SITES = [
  PORTAL,
  ...places
    .filter((p) =>
      /Night Market|Moonlight|Kandal Market|Central Market|Malis|Brown Sothearos/.test(
        p.name,
      ),
    )
    .map(siteFor)
    .filter(Boolean),
];
