import { project } from "./geo.js";
export function riversidePath(map, city) {
  const river = map.water.find((w) => w.id === city.riverside?.riverWay);
  if (!river) return [];
  const points = [];
  for (
    let lat = city.riverside.south;
    lat <= city.riverside.north;
    lat += 0.00015
  ) {
    const z = project(city.origin[0], lat, city.origin)[1],
      crossings = [];
    for (let i = 1; i < river.points.length; i++) {
      const a = river.points[i - 1],
        b = river.points[i];
      if (a[1] > z != b[1] > z)
        crossings.push(a[0] + ((z - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    if (crossings.length) points.push([Math.min(...crossings) - 7, z]);
  }
  return points;
}
export function samplePath(points, t) {
  if (points.length < 2) return null;
  const lengths = points
      .slice(1)
      .map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1])),
    total = lengths.reduce((a, b) => a + b, 0);
  let remaining = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const a = points[i],
        b = points[i + 1],
        u = lengths[i] ? remaining / lengths[i] : 0;
      return {
        point: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u],
        heading: Math.atan2(b[0] - a[0], b[1] - a[1]),
      };
    }
    remaining -= lengths[i];
  }
}
