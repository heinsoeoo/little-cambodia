export function insidePolygon(x, z, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i],
      b = points[j];
    if (
      a[1] > z != b[1] > z &&
      x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}
export function footprintArea(points) {
  return Math.abs(
    points.reduce((area, p, i) => {
      const q = points[(i + 1) % points.length];
      return area + p[0] * q[1] - q[0] * p[1];
    }, 0) / 2,
  );
}
export function describeBuilding(tags, points, id, landuse) {
  const type = tags.building,
    area = footprintArea(points);
  const kind = [
    "house",
    "detached",
    "terrace",
    "bungalow",
    "residential",
  ].includes(type)
    ? "home"
    : type === "apartments"
      ? "apartments"
      : tags.shop || ["retail", "commercial", "restaurant"].includes(type)
        ? "shop"
        : type === "hotel" || tags.tourism === "hotel"
          ? "hotel"
          : ["school", "hospital", "public", "pagoda", "shrine"].includes(type)
            ? "civic"
            : landuse === "residential"
              ? "home"
              : landuse === "retail"
                ? "shop"
                : "urban";
  const heightMeters = parseFloat(tags.height),
    feet = /ft|feet/.test(tags.height || "");
  const levels = parseFloat(tags["building:levels"]);
  const fallback =
    kind === "home"
      ? 2
      : kind === "hotel" || kind === "apartments"
        ? 5
        : kind === "civic"
          ? 3
          : area > 900
            ? 4
            : 2 + (id % 2);
  const height = Math.max(
    2,
    Math.min(
      220,
      Number.isFinite(heightMeters) && heightMeters > 0
        ? heightMeters * (feet ? 0.3048 : 1)
        : Number.isFinite(levels) && levels > 0
          ? levels * 3.2
          : fallback * 3.2,
    ),
  );
  return {
    kind,
    height,
    levels: Math.max(1, Math.round(levels || height / 3.2)),
    heightSource:
      heightMeters > 0 ? "height" : levels > 0 ? "levels" : "estimated",
    roof: tags["roof:shape"] || (kind === "home" ? "pyramidal" : "flat"),
    name: tags["name:en"] || tags.name || "",
    color: tags["building:colour"],
    roofColor: tags["roof:colour"],
  };
}
