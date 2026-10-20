// Deliberately authored play space: Phnom Penh-inspired, not a geographic survey.
const origin = [104.9245, 11.5615],
  lon = (x) => origin[0] + x / (111320 * Math.cos((origin[1] * Math.PI) / 180)),
  lat = (z) => origin[1] - z / 111320;
export const townCity = {
  id: "pixelTown",
  name: "Phnom Penh · Little Riverside",
  layout: "town",
  origin,
  bounds: [lon(-128), lat(160), lon(128), lat(-160)],
  riverside: { riverWay: 90001, south: lat(140), north: lat(-140) },
  landmarks: [
    { name: "Palm Street homes", point: [-32, 96] },
    { name: "Lotus Café", point: [32, 0] },
    { name: "Little Market", point: [0, -64] },
    { name: "Monument Square", point: [-96, 0] },
    { name: "Riverside food carts", point: [72, -96] },
  ],
};
export function createTownMap() {
  const roads = [],
    buildings = [],
    xs = [-96, -32, 32, 72],
    zs = [-128, -64, 0, 64, 128];
  for (const z of zs)
    roads.push({
      id: `h${z}`,
      points: [[-116, z], ...xs.map((x) => [x, z])],
      width: 7,
      name: z === 0 ? "Lotus Lane" : "Palm Street",
    });
  for (const x of xs)
    roads.push({
      id: `v${x}`,
      points: zs.map((z) => [x, z]),
      width: x === 72 ? 8 : 7,
      name: x === 72 ? "Riverside Road" : "Neighbourhood Lane",
    });
  let id = 1;
  const house = (x, z, w, d, kind) =>
    buildings.push({
      id: id++,
      points: [
        [x - w / 2, z - d / 2],
        [x + w / 2, z - d / 2],
        [x + w / 2, z + d / 2],
        [x - w / 2, z + d / 2],
        [x - w / 2, z - d / 2],
      ],
      height: 5,
      levels: 1,
      heightSource: "authored",
      kind,
      roof: "gabled",
    });
  for (const x of [-64, 0, 52])
    for (const z of [-96, -32, 32, 96]) {
      if (x === 0 && (z === 32 || z === -32)) continue;
      if (x === 52) {
        house(x, z, 16, 18, z === -32 ? "shop" : "home");
      } else {
        house(x - 13, z - 6, 15, 16, "home");
        house(x + 12, z + 10, 14, 15, z === -96 ? "shop" : "home");
      }
    }
  return {
    layout: "town",
    roads,
    buildings,
    water: [
      {
        id: 90001,
        river: true,
        points: [
          [96, -180],
          [160, -180],
          [160, 180],
          [96, 180],
          [96, -180],
        ],
      },
    ],
    landuse: [],
    walkways: [],
  };
}
