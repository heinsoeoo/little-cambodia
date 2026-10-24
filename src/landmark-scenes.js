import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { project, nearestRoad } from "./geo.js";
import { insidePolygon } from "./buildings.js";
import { places, detailFootprint } from "./places.js";

// Shared static batches keep lamps and architectural detail inexpensive on phones.
export function addLandmarkScenes(scene, map, city, path) {
  const stone = new T.MeshStandardMaterial({
    roughness: 0.85,
    color: 0x9e6046,
  });
  const cream = new T.MeshStandardMaterial({
    roughness: 0.85,
    color: 0xf3dfb0,
    side: T.DoubleSide,
  });
  const gold = new T.MeshStandardMaterial({ roughness: 0.85, color: 0xd8aa51 });
  const roof = new T.MeshStandardMaterial({ roughness: 0.85, color: 0xb26948 });
  const glow = new T.MeshBasicMaterial({ color: 0xffd58c });
  const batches = new Map(),
    groups = [];
  const add = (geo, material) => {
    if (!batches.has(material)) batches.set(material, []);
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!g.attributes.uv)
      g.setAttribute(
        "uv",
        new T.Float32BufferAttribute(
          new Float32Array(g.attributes.position.count * 2),
          2,
        ),
      );
    batches.get(material).push(g);
  };
  const box = (w, h, d, x, y, z, m) => {
    const g = new T.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    add(g, m);
  };
  const cone = (r, h, x, y, z, m, n = 8) => {
    const g = new T.ConeGeometry(r, h, n);
    g.translate(x, y, z);
    add(g, m);
  };
  const [mx, mz] = project(104.9281927, 11.5564435, city.origin);
  // Four open piers support the lotus-like tower instead of a solid stacked block.
  for (let i = 0; i < 5; i++) {
    const g = new T.CylinderGeometry(10 - i * 0.6, 10.5 - i * 0.6, 0.5, 8);
    g.translate(mx, 0.25 + i * 0.5, mz);
    add(g, stone);
  }
  for (const x of [-3.8, 3.8])
    for (const z of [-3.8, 3.8]) {
      box(2.3, 8, 2.3, mx + x, 6.5, mz + z, stone);
      box(2.9, 0.6, 2.9, mx + x, 10.4, mz + z, gold);
    }
  for (let tier = 0; tier < 5; tier++) {
    const r = 6 - tier * 0.85,
      y = 11 + tier * 2.25;
    const g = new T.CylinderGeometry(r * 0.76, r, 1.7, 4);
    g.rotateY(Math.PI / 4);
    g.translate(mx, y, mz);
    add(g, stone);
    box(r * 1.45, 0.35, r * 1.45, mx, y - 0.8, mz, gold);
    for (const x of [-1, 1])
      for (const z of [-1, 1])
        cone(0.35, 1.5, mx + x * r * 0.64, y + 1, mz + z * r * 0.64, stone, 5);
    box(r * 0.8, 0.24, 0.12, mx, y - 0.4, mz + r * 0.72, glow);
  }
  cone(0.7, 3, mx, 22.7, mz, gold);
  // Roof-edge finials and segmented spires echo the supplied palace photographs.
  for (const b of map.buildings.filter((b) =>
    [172268264, 172268276, 172268274, 905238235].includes(b.id),
  )) {
    const f = detailFootprint(b.points);
    if (!f) continue;
    const convert = (a, c) => [
      f.x + a * Math.cos(f.angle) - c * Math.sin(f.angle),
      f.z + a * Math.sin(f.angle) + c * Math.cos(f.angle),
    ];
    for (const side of [-1, 1])
      for (const end of [-1, 1]) {
        const p = convert(side * f.w * 0.47, end * f.d * 0.45);
        cone(0.38, 2.7, p[0], b.height + 2, p[1], gold, 5);
      }
    for (let tier = 0; tier < 6; tier++) {
      const g = new T.CylinderGeometry(
        Math.max(0.16, 1.8 - tier * 0.26) * 0.6,
        Math.max(0.2, 2 - tier * 0.28),
        0.8,
        6,
      );
      g.translate(f.x, b.height + 6 + tier * 0.8, f.z);
      add(g, gold);
    }
  }
  const nightMarket = places.find((p) => p.kind === "night-market"),
    fit = nightMarket && detailFootprint(nightMarket.points),
    stalls = [];
  if (fit) {
    const local = (a, c) => [
      fit.x + a * Math.cos(fit.angle) - c * Math.sin(fit.angle),
      fit.z + a * Math.sin(fit.angle) + c * Math.cos(fit.angle),
    ];
    for (const side of [-1, 1])
      for (let row = 0; row < 8; row++) {
        const p = local(
            side * fit.w * 0.3,
            -fit.d * 0.38 + (row * fit.d * 0.76) / 7,
          ),
          road = nearestRoad(p, map.roads);
        if (
          ![
            [-2, -2.5],
            [-2, 2.5],
            [2, -2.5],
            [2, 2.5],
          ].every(([dx, dz]) =>
            insidePolygon(p[0] + dx, p[1] + dz, nightMarket.points),
          ) ||
          road.distance < road.road.width / 2 + 5 ||
          map.buildings.some((b) => insidePolygon(...p, b.points))
        )
          continue;
        stalls.push(p);
        // Open canopies leave the center aisle clear; counters sit toward the outside.
        const canopy = new T.CylinderGeometry(
          2.1,
          2.1,
          5,
          12,
          1,
          true,
          Math.PI / 2,
          Math.PI,
        );
        canopy.rotateX(Math.PI / 2);
        canopy.scale(1, 0.45, 1);
        canopy.translate(p[0], 2.8, p[1]);
        add(canopy, cream);
        for (const dx of [-1.8, 1.8])
          for (const dz of [-2.2, 2.2])
            box(0.08, 2.8, 0.08, p[0] + dx, 1.4, p[1] + dz, gold);
        box(2.4, 0.8, 0.7, p[0] + side * 0.5, 0.4, p[1] + 1.8, roof);
        for (const dx of [-1.4, 0, 1.4]) {
          const g = new T.SphereGeometry(0.23, 6, 4);
          g.translate(p[0] + dx, 2.65, p[1] - 2.2);
          add(g, glow);
        }
      }
  }
  // Promenade lamps and strings use emissive-looking meshes, never dozens of real lights.
  path.forEach((p, i) => {
    if (i % 3) return;
    const x = p[0] - 5,
      z = p[1];
    box(0.13, 4, 0.13, x, 2, z, stone);
    const g = new T.SphereGeometry(0.35, 6, 4);
    g.translate(x, 4.1, z);
    add(g, glow);
    if (i + 3 < path.length)
      for (let j = 1; j < 7; j++) {
        const q = path[i + 3],
          t = j / 7;
        const bulb = new T.SphereGeometry(0.11, 5, 3);
        bulb.translate(
          x + (q[0] - p[0]) * t,
          4.3 - Math.sin(t * Math.PI) * 0.45,
          z + (q[1] - p[1]) * t,
        );
        add(bulb, glow);
      }
  });
  for (const [material, geos] of batches) {
    const mesh = new T.Mesh(mergeGeometries(geos), material);
    scene.add(mesh);
    groups.push(mesh);
    geos.forEach((g) => g.dispose());
  }
  return {
    stalls,
    update(night) {
      glow.color.setHex(night ? 0xffd58c : 0xe7d8b1);

      stone.emissive.setHex(night ? 0x1c0b03 : 0);
      gold.emissive.setHex(night ? 0x392608 : 0);
      cream.emissive.setHex(night ? 0x56401d : 0);
    },
  };
}
