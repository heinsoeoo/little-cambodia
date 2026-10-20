import riverWater from "./river-data.json" with { type: "json" };
import { clearRoadBuildings } from "./road-clearance.js";
import data from "./phnom-map-data.json" with { type: "json" };
import { cities } from "./cities.js";
import { project, nearestRoad } from "./geo.js";
import { riversidePath } from "./riverside.js";
export const city = cities.phnomPenh;
const cleared = clearRoadBuildings(data);
export const phnomMap = {
  ...cleared,
  water: [...cleared.water, ...riverWater],
  style: "cozy",
  buildings: cleared.buildings.map((b) =>
    b.id === 222235120 ? { ...b, height: 6.4, roof: "gabled" } : b,
  ),
};
export const bounds = {
  min: project(city.bounds[0], city.bounds[3], city.origin),
  max: project(city.bounds[2], city.bounds[1], city.origin),
};
export const promenade = riversidePath(phnomMap, city);
// Beside Sisowath Quay, near the night-market end of the promenade. The source footprint remains unchanged.
export const spawn = riversidePath(phnomMap, {
  ...city,
  riverside: { ...city.riverside, south: 11.5668 },
})[58];
export const parking = nearestRoad(spawn, phnomMap.roads);
