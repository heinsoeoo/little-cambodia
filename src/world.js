import * as T from "three";
import { palette, tileTexture } from "./pixel-art.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { project, nearestRoad } from "./geo.js";
import { insidePolygon } from "./buildings.js";
import { addFacades } from "./facades.js";
import { riversidePath } from "./riverside.js";
export function makeWorld(scene, map, city, { visibility } = {}) {
  const textures =
    typeof document === "undefined" || map.style === "cozy"
      ? {}
      : {
          grass: tileTexture("grass"),
          road: tileTexture("road"),
          water: tileTexture("water"),
          wall: tileTexture("wall"),
        };
  if (textures.grass) textures.grass.repeat.set(200, 200);
  const path = riversidePath(map, city);
  const westNorth = project(city.bounds[0], city.bounds[3], city.origin),
    eastSouth = project(city.bounds[2], city.bounds[1], city.origin);
  const ground = new T.Mesh(
    new T.PlaneGeometry(
      eastSouth[0] - westNorth[0] + 1200,
      eastSouth[1] - westNorth[1] + 1200,
    ),
    new T.MeshLambertMaterial({
      color: textures.grass
        ? 0xffffff
        : map.style === "cozy"
          ? 0x96ad7d
          : palette.grass,
      map: textures.grass || null,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(
    (westNorth[0] + eastSouth[0]) / 2,
    -0.12,
    (westNorth[1] + eastSouth[1]) / 2,
  );
  scene.add(ground);
  const roadMaterial = new T.MeshLambertMaterial({
      color: textures.road
        ? 0xffffff
        : map.style === "cozy"
          ? 0xd9c4a5
          : palette.road,
      map: textures.road || null,
    }),
    curbMaterial = new T.MeshLambertMaterial({ color: palette.curb });
  const markingMaterial = new T.MeshBasicMaterial({ color: 0xe7dfb2 });
  const batches = new Map();
  const batch = (geometry, material) => {
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(geometry);
  };
  const waterMaterial = new T.MeshLambertMaterial({
    color: textures.water ? 0xffffff : palette.water,
    map: textures.water || null,
  });
  for (const water of map.water || []) {
    const shape = new T.Shape();
    water.points.forEach((p, i) =>
      i ? shape.lineTo(p[0], -p[1]) : shape.moveTo(p[0], -p[1]),
    );
    const geo = new T.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, -0.015, 0);
    batch(geo, waterMaterial);
  }
  if (path.length > 1) {
    const vertices = [];
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1],
        b = path[i];
      vertices.push(
        a[0] - 4,
        0.02,
        a[1],
        b[0] - 4,
        0.02,
        b[1],
        a[0] + 4,
        0.02,
        a[1],
        a[0] + 4,
        0.02,
        a[1],
        b[0] - 4,
        0.02,
        b[1],
        b[0] + 4,
        0.02,
        b[1],
      );
    }
    const geo = new T.BufferGeometry().setAttribute(
      "position",
      new T.Float32BufferAttribute(vertices, 3),
    );
    geo.computeVertexNormals();
    batch(
      geo,
      new T.MeshLambertMaterial({ color: 0xd5c6a2, side: T.DoubleSide }),
    );
  }
  const segment = (a, b, width, y, mat) => {
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz);
    if (len < 0.1) return;
    const mesh = new T.Mesh(new T.BoxGeometry(width, 0.08, len + 0.2), mat);
    mesh.position.set((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2);
    mesh.rotation.y = Math.atan2(dx, dz);
    mesh.updateMatrix();
    mesh.geometry.applyMatrix4(mesh.matrix);
    batch(mesh.geometry, mat);
  };
  for (const r of map.roads)
    for (let i = 1; i < r.points.length; i++)
      segment(r.points[i - 1], r.points[i], r.width + 3, 0, curbMaterial);
  for (const r of map.roads)
    for (let i = 1; i < r.points.length; i++) {
      const a = r.points[i - 1],
        b = r.points[i];
      segment(a, b, r.width, 0.08, roadMaterial);
      if (r.width > 10) {
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (let d = 4; d < l - 4; d += 12) {
          const t = d / l,
            u = Math.min(1, (d + 4) / l);
          segment(
            [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
            [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u],
            0.22,
            0.14,
            markingMaterial,
          );
        }
      }
    }
  // Rounded joins cover gaps at bends and intersections.
  const joins = map.roads.flatMap((r) =>
    r.points.map((p) => ({ p, width: r.width })),
  );
  for (const [extra, y, mat] of [
    [3, 0, curbMaterial],
    [0, 0.08, roadMaterial],
  ]) {
    const mesh = new T.InstancedMesh(
        new T.CylinderGeometry(1, 1, 0.08, 12),
        mat,
        joins.length,
      ),
      o = new T.Object3D();
    joins.forEach(({ p, width }, i) => {
      o.position.set(p[0], y, p[1]);
      o.scale.set((width + extra) / 2, 1, (width + extra) / 2);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    scene.add(mesh);
  }
  const obstacles = [];
  const colors = [0xf0d19b, 0xe9bd8a, 0xd4dfba, 0xcba382, 0xe9d7ac, 0xbdcbb0];
  const buildingMaterials = colors.map(
    (color) => new T.MeshLambertMaterial({ color, map: textures.wall || null }),
  );
  buildingMaterials.forEach((material) => visibility?.apply(material));
  for (const b of map.buildings) {
    const shape = new T.Shape();
    b.points.forEach((p, i) =>
      i ? shape.lineTo(p[0], -p[1]) : shape.moveTo(p[0], -p[1]),
    );
    const geo = new T.ExtrudeGeometry(shape, {
      depth: b.height,
      bevelEnabled: false,
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0.1, 0);
    batch(
      geo,
      buildingMaterials[
        map.style === "cozy"
          ? b.id % colors.length
          : b.kind === "home"
            ? b.id % 3
            : b.kind === "shop"
              ? 3
              : b.kind === "hotel"
                ? 4
                : 5
      ],
    );
    const xs = b.points.map((p) => p[0]),
      zs = b.points.map((p) => p[1]);
    obstacles.push({
      ...b,
      minX: Math.min(...xs) - 1.2,
      maxX: Math.max(...xs) + 1.2,
      minZ: Math.min(...zs) - 1.2,
      maxZ: Math.max(...zs) + 1.2,
    });
  }

  const facades = addFacades(
    scene,
    map.buildings,
    batch,
    map.style === "cozy",
    visibility,
  );

  // Merge static geometry by material instead of issuing one draw per building.
  for (const [material, geometries] of batches) {
    const merged = mergeGeometries(geometries);
    const mesh = new T.Mesh(merged, material);
    mesh.castShadow = map.style === "cozy";
    mesh.receiveShadow = true;
    scene.add(mesh);
    geometries.forEach((geometry) => geometry.dispose());
  }

  // Original stylized Independence Monument, placed at its geographic center.
  const monument = new T.Group(),
    [mx, mz] = project(104.9281, 11.5564, city.origin);
  monument.position.set(mx, 0, mz);
  const stone = new T.MeshLambertMaterial({ color: 0xb56d45 });
  for (let i = 0; i < 4; i++) {
    const m = new T.Mesh(
      new T.CylinderGeometry(9 - i * 1.2, 10 - i * 1.2, 1, 8),
      stone,
    );
    m.position.y = 0.5 + i;
    monument.add(m);
  }
  for (let i = 0; i < 5; i++) {
    const m = new T.Mesh(
      new T.CylinderGeometry(4 - i * 0.65, 5 - i * 0.65, 3, 4),
      stone,
    );
    m.position.y = 5.5 + i * 2.4;
    m.rotation.y = Math.PI / 4;
    monument.add(m);
  }
  scene.add(monument);
  // Instanced trees keep the district inexpensive to render.
  const trunk = new T.InstancedMesh(
    new T.CylinderGeometry(0.4, 0.55, 5, 5),
    new T.MeshLambertMaterial({ color: 0x7d7050 }),
    220,
  );
  const crown = new T.InstancedMesh(
    map.style === "cozy"
      ? new T.SphereGeometry(3.6, 12, 9)
      : new T.IcosahedronGeometry(3.6, 0),
    new T.MeshLambertMaterial({ color: 0x547d5a }),
    220,
  );
  const dummy = new T.Object3D();
  let count = 0;
  for (let i = 0; i < 900 && count < 160; i++) {
    const x = ((i * 137.51) % 1500) - 750,
      z = ((i * 249.17) % 1800) - 900;
    if (
      nearestRoad([x, z], map.roads).distance < 18 ||
      (map.water || []).some((w) => insidePolygon(x, z, w.points)) ||
      obstacles.some(
        (b) =>
          x > b.minX - 5 && x < b.maxX + 5 && z > b.minZ - 5 && z < b.maxZ + 5,
      ) ||
      Math.hypot(x - mx, z - mz) < 25
    )
      continue;
    dummy.position.set(x, 2.5, z);
    dummy.updateMatrix();
    trunk.setMatrixAt(count, dummy.matrix);
    dummy.position.y = 6.5;
    dummy.updateMatrix();
    crown.setMatrixAt(count++, dummy.matrix);
  }
  if (map.style === "cozy")
    for (let i = 0; i < path.length && count < 220; i += 2) {
      const [px, pz] = path[i],
        x = px - 13,
        z = pz;
      const road = nearestRoad([x, z], map.roads);
      if (
        road.distance < road.road.width / 2 + 2 ||
        obstacles.some((b) => insidePolygon(x, z, b.points))
      )
        continue;
      dummy.position.set(x, 2.5, z);
      dummy.updateMatrix();
      trunk.setMatrixAt(count, dummy.matrix);
      dummy.position.y = 6.5;
      dummy.updateMatrix();
      crown.setMatrixAt(count++, dummy.matrix);
    }
  trunk.count = crown.count = count;
  crown.castShadow = true;
  scene.add(trunk, crown);

  // Simple spatial hash keeps collision queries local even with thousands of footprints.
  const grid = new Map();
  for (const b of obstacles)
    for (let x = Math.floor(b.minX / 40); x <= Math.floor(b.maxX / 40); x++)
      for (let z = Math.floor(b.minZ / 40); z <= Math.floor(b.maxZ / 40); z++) {
        const key = `${x},${z}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(b);
      }
  function inside(x, z, pts) {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i],
        b = pts[j];
      if (
        a[1] > z != b[1] > z &&
        x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]
      )
        c = !c;
    }
    return c;
  }
  const [west, south, east, north] = city.bounds,
    min = project(west, north, city.origin),
    max = project(east, south, city.origin);
  return {
    path,
    facades,
    collides(x, z) {
      if ((map.water || []).some((w) => insidePolygon(x, z, w.points)))
        return true;
      if (path.length && nearestRoad([x, z], [{ points: path }]).distance < 4.2)
        return true;
      if (x < min[0] + 3 || x > max[0] - 3 || z < min[1] + 3 || z > max[1] - 3)
        return true;
      return (
        grid.get(`${Math.floor(x / 40)},${Math.floor(z / 40)}`) || []
      ).some(
        (b) =>
          x >= b.minX &&
          x <= b.maxX &&
          z >= b.minZ &&
          z <= b.maxZ &&
          (inside(x, z, b.points) ||
            b.points.some((a, i) => {
              const c = b.points[(i + 1) % b.points.length],
                dx = c[0] - a[0],
                dz = c[1] - a[1],
                t = Math.max(
                  0,
                  Math.min(
                    1,
                    ((x - a[0]) * dx + (z - a[1]) * dz) /
                      (dx * dx + dz * dz || 1),
                  ),
                );
              return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < 1.5;
            })),
      );
    },
  };
}
export function taxi() {
  const group = new T.Group();
  const box = (w, h, d, x, y, z, color) => {
    const m = new T.Mesh(
      new T.BoxGeometry(w, h, d),
      new T.MeshLambertMaterial({ color }),
    );
    m.position.set(x, y, z);
    group.add(m);
  };
  box(1.9, 0.7, 4, 0, 0.9, 0, 0xe6b84e);
  box(1.65, 0.75, 2, 0, 1.6, -0.2, 0x285054);
  box(1.7, 0.1, 2.05, 0, 2, -0.2, 0xe6b84e);
  box(0.8, 0.22, 0.45, 0, 2.2, -0.2, 0xf8f2cb);
  for (const x of [-0.97, 0.97])
    for (const z of [-1.25, 1.25]) {
      const w = new T.Mesh(
        new T.CylinderGeometry(0.4, 0.4, 0.22, 12),
        new T.MeshLambertMaterial({ color: 0x25312f }),
      );
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.45, z);
      group.add(w);
    }
  for (const x of [-0.65, 0.65]) {
    box(0.4, 0.23, 0.08, x, 0.95, 2.03, 0xffefb0);
    box(0.4, 0.2, 0.08, x, 0.95, -2.03, 0xd5533e);
  }
  return group;
}

export function routeRibbon(points) {
  const positions = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 0.01) continue;
    const x = (-(b[1] - a[1]) / length) * 0.45,
      z = ((b[0] - a[0]) / length) * 0.45;
    const leftA = [a[0] + x, 0.23, a[1] + z],
      rightA = [a[0] - x, 0.23, a[1] - z];
    const leftB = [b[0] + x, 0.23, b[1] + z],
      rightB = [b[0] - x, 0.23, b[1] - z];
    positions.push(
      ...leftA,
      ...leftB,
      ...rightA,
      ...rightA,
      ...leftB,
      ...rightB,
    );
  }
  return new T.BufferGeometry().setAttribute(
    "position",
    new T.Float32BufferAttribute(positions, 3),
  );
}
