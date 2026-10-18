export function project(lon, lat, origin) {
  return [
    (lon - origin[0]) * 111320 * Math.cos((origin[1] * Math.PI) / 180),
    -(lat - origin[1]) * 111320,
  ];
}
export function nearestRoad(point, roads) {
  let best = { distance: Infinity };
  for (const road of roads)
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1],
        b = road.points[i],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        l = dx * dx + dz * dz;
      if (!l) continue;
      const t = Math.max(
        0,
        Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / l),
      );
      const p = [a[0] + dx * t, a[1] + dz * t],
        distance = Math.hypot(point[0] - p[0], point[1] - p[1]);
      if (distance < best.distance)
        best = {
          point: p,
          distance,
          road,
          segment: i - 1,
          t,
          heading: Math.atan2(dx, dz),
        };
    }
  return best;
}
export function prepare(data, city) {
  const roads = [],
    buildings = [];
  for (const e of data.elements) {
    if (!e.geometry || e.geometry.length < 2) continue;
    const points = e.geometry.map((p) => project(p.lon, p.lat, city.origin));
    if (
      e.tags?.highway &&
      ![
        "pedestrian",
        "elevator",
        "footway",
        "steps",
        "path",
        "cycleway",
        "construction",
        "proposed",
      ].includes(e.tags.highway) &&
      !["no", "private"].includes(e.tags.access) &&
      e.tags.motor_vehicle !== "no"
    )
      roads.push({
        id: e.id,
        points,
        nodeIds: e.nodes,
        oneway:
          e.tags.oneway === "-1"
            ? -1
            : ["yes", "1", "true"].includes(e.tags.oneway) ||
                (e.tags.junction === "roundabout" && e.tags.oneway !== "no")
              ? 1
              : 0,
        name: e.tags.name || e.tags["name:en"] || "Local street",
        width: ["primary", "secondary", "trunk"].includes(e.tags.highway)
          ? 15
          : ["tertiary"].includes(e.tags.highway)
            ? 11
            : 8,
      });
    else if (e.tags?.building && points.length > 3)
      buildings.push({
        id: e.id,
        points,
        height: Math.min(
          70,
          parseFloat(e.tags.height) ||
            parseFloat(e.tags["building:levels"]) * 3.2 ||
            7 + (e.id % 5) * 3,
        ),
      });
  }
  if (!roads.length) throw new Error("Map contains no driveable roads");
  return { roads, buildings };
}
