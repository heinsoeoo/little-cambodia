import fs from "node:fs/promises";
import { format } from "prettier";
import { project } from "../src/geo.js";
import { cities } from "../src/cities.js";
const city = cities.phnomPenh;
const source = JSON.parse(await fs.readFile(`public${city.data}`, "utf8"));
const special = new Map([
  [172268264, ["Royal Palace · Moonlight Pavilion", "palace"]],
  [172268276, ["Royal Palace · Throne Hall", "palace"]],
  [172268274, ["Phochani Pavilion", "palace"]],
  [905238235, ["Khemarin Palace", "palace"]],
  [377373297, ["Central Market · Phsar Thmei", "central-market"]],
  [187624612, ["Kandal Market", "market"]],
  [62219866, ["Phnom Penh Night Market", "night-market"]],
]);
const places = source.elements
  .filter(
    (e) =>
      e.geometry?.length > 2 &&
      (special.has(e.id) || ["restaurant", "cafe"].includes(e.tags?.amenity)),
  )
  .map((e) => {
    const [name, kind] = special.get(e.id) || [
      e.tags["name:en"] || e.tags.name,
      e.tags.amenity,
    ];
    const points = e.geometry.map((p) =>
      project(p.lon, p.lat, city.origin).map((n) => Math.round(n * 100) / 100),
    );
    return { id: e.id, name, kind, points };
  })
  .filter((e) => e.name);
await fs.writeFile(
  "src/places-data.json",
  await format(JSON.stringify(places), { parser: "json" }),
);
console.log(
  `Retained ${places.length} named places from the local OSM extract.`,
);
