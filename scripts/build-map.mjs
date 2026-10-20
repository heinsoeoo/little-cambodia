import fs from "node:fs/promises";
import { format } from "prettier";
import { prepare } from "../src/geo.js";
import { cities } from "../src/cities.js";
const city = cities.phnomPenh;
const source = JSON.parse(
  await fs.readFile(new URL(`../public${city.data}`, import.meta.url), "utf8"),
);
const map = prepare(source, city);
const json = JSON.stringify(map, (key, value) =>
  typeof value === "number" ? Math.round(value * 100) / 100 : value,
);
await fs.writeFile(
  new URL("../src/phnom-map-data.json", import.meta.url),
  await format(json, { parser: "json" }),
);
console.log(
  `Built ${map.roads.length} roads and ${map.buildings.length} building footprints from retained OSM data.`,
);
