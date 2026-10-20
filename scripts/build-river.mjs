import fs from "node:fs/promises";
import { format } from "prettier";
import { project } from "../src/geo.js";
import { cities } from "../src/cities.js";
const source = JSON.parse(
  await fs.readFile("public/data/phnom-penh-river.osm.json", "utf8"),
);
const nodes = new Map(
  source.elements
    .filter((e) => e.type === "node")
    .map((e) => [e.id, [e.lon, e.lat]]),
);
const ways = new Map(
  source.elements.filter((e) => e.type === "way").map((e) => [e.id, e.nodes]),
);
const relation = source.elements.find(
  (e) => e.type === "relation" && e.id === 2270448,
);
const pending = relation.members
    .filter((m) => m.type === "way" && m.role === "outer")
    .map((m) => [...ways.get(m.ref)]),
  rings = [];
while (pending.length) {
  let ring = pending.pop();
  while (ring.at(-1) !== ring[0]) {
    const i = pending.findIndex(
      (p) => p[0] === ring.at(-1) || p.at(-1) === ring.at(-1),
    );
    if (i < 0) throw Error("Incomplete river ring");
    let next = pending.splice(i, 1)[0];
    if (next[0] !== ring.at(-1)) next.reverse();
    ring.push(...next.slice(1));
  }
  rings.push(ring.slice(0, -1).map((n) => nodes.get(n)));
}
function clip(points, axis, bound, greater) {
  const result = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length],
      ain = greater ? a[axis] >= bound : a[axis] <= bound,
      bin = greater ? b[axis] >= bound : b[axis] <= bound;
    if (ain) result.push(a);
    if (ain !== bin) {
      const t = (bound - a[axis]) / (b[axis] - a[axis]);
      result.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return result;
}
const city = cities.phnomPenh;
const water = rings
  .map((ring, i) => {
    let p = ring;
    for (const [axis, bound, greater] of [
      [0, 104.915, true],
      [0, 104.95, false],
      [1, 11.55, true],
      [1, 11.585, false],
    ])
      p = clip(p, axis, bound, greater);
    const points = p.map((p) =>
      project(...p, city.origin).map((n) => Math.round(n * 100) / 100),
    );
    if (points.length) points.push(points[0]);
    return { id: `mekong-${i}`, river: true, points };
  })
  .filter((w) => w.points.length > 3);
await fs.writeFile(
  "src/river-data.json",
  await format(JSON.stringify(water), { parser: "json" }),
);
console.log(`Clipped ${water.length} river polygons to the playable city.`);
