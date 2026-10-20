import { clearRoadBuildings } from "./road-clearance.js";
import data from "./phnom-map-data.json" with { type: "json" };
import { cities } from "./cities.js";
import { project, nearestRoad } from "./geo.js";
import { riversidePath } from "./riverside.js";
export const city = cities.phnomPenh;
export const phnomMap = { ...clearRoadBuildings(data), style: "cozy" };
export const bounds = {
  min: project(city.bounds[0], city.bounds[3], city.origin),
  max: project(city.bounds[2], city.bounds[1], city.origin),
};
export const promenade = riversidePath(phnomMap, city);
// Beside Sisowath Quay, near the night-market end of the promenade. The source footprint remains unchanged.
export const spawn = promenade[58];
export const parking = nearestRoad(spawn, phnomMap.roads);
