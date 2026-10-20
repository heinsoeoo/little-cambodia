import * as T from "three";
import { riversidePath } from "./riverside.js";
import { blocked } from "./open-world.js";
export function makeCozyWorld(scene, map, city) {
  const materials = new Map();
  const mat = (color) => {
    if (!materials.has(color))
      materials.set(color, new T.MeshLambertMaterial({ color }));
    return materials.get(color);
  };
  const box = (w, h, d, x, y, z, color) => {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(color));
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  box(256, 0.4, 320, 0, -0.3, 0, 0x96ad7d);
  box(32, 0.15, 320, 112, -0.05, 0, 0x8bbbc3);
  box(6, 0.1, 320, 92, 0.01, 0, 0xe4d4b5);
  box(9, 0.08, 320, 83, 0.03, 0, 0xc5cba0);
  for (const road of map.roads)
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1],
        b = road.points[i];
      box(
        Math.abs(b[0] - a[0]) + road.width + 2,
        0.1,
        Math.abs(b[1] - a[1]) + road.width + 2,
        (a[0] + b[0]) / 2,
        0.01,
        (a[1] + b[1]) / 2,
        0xd9c4a5,
      );
    }
  for (const b of map.buildings) {
    const a = b.points[0],
      c = b.points[2],
      w = c[0] - a[0],
      d = c[1] - a[1],
      x = (a[0] + c[0]) / 2,
      z = (a[1] + c[1]) / 2,
      h = 5.8;
    box(w + 2, 0.15, d + 3, x, 0.05, z + 0.7, 0xb2ba8b);
    box(w, h, d, x, h / 2, z, [0xf0d9b6, 0xe5c6a7, 0xe9d9bd][b.id % 3]);
    const roof = new T.BufferGeometry(),
      v = [];
    const p = [
      [-w / 2 - 0.5, h, -d / 2 - 0.6],
      [w / 2 + 0.5, h, -d / 2 - 0.6],
      [-w / 2 - 0.5, h + 3, 0],
      [w / 2 + 0.5, h + 3, 0],
      [-w / 2 - 0.5, h, d / 2 + 0.6],
      [w / 2 + 0.5, h, d / 2 + 0.6],
    ];
    for (const tri of [
      [0, 2, 1],
      [1, 2, 3],
      [2, 4, 3],
      [3, 4, 5],
      [0, 4, 2],
      [1, 3, 5],
    ])
      for (const i of tri) v.push(...p[i]);
    roof.setAttribute("position", new T.Float32BufferAttribute(v, 3));
    roof.computeVertexNormals();
    const rm = new T.Mesh(
      roof,
      mat(
        b.kind === "shop" ? 0x7e9a95 : [0xc17e68, 0xcf9372, 0xaa827b][b.id % 3],
      ),
    );
    rm.position.set(x, 0, z);
    rm.castShadow = true;
    const trim = new T.LineSegments(
      new T.EdgesGeometry(roof, 25),
      new T.LineBasicMaterial({
        color: 0x8e6a60,
        transparent: true,
        opacity: 0.45,
      }),
    );
    rm.add(trim);
    scene.add(rm);
    box(1.5, 3, 0.16, x, 1.5, z + d / 2 + 0.1, 0x93705a);
    for (const dx of [-w * 0.3, w * 0.3]) {
      box(2.1, 2.3, 0.18, x + dx, 3.1, z + d / 2 + 0.1, 0xf8ead0);
      box(1.55, 1.8, 0.22, x + dx, 3.1, z + d / 2 + 0.15, 0x819c9e);
      box(0.1, 1.8, 0.25, x + dx, 3.1, z + d / 2 + 0.17, 0xe3d5ba);
    }
    for (const dz of [-d * 0.27, d * 0.27]) {
      box(0.18, 2.3, 2.1, x + w / 2 + 0.1, 3.1, z + dz, 0xf8ead0);
      box(0.22, 1.8, 1.55, x + w / 2 + 0.15, 3.1, z + dz, 0x819c9e);
    }
    for (const dx of [-w * 0.4, w * 0.4]) {
      const shrub = new T.Mesh(new T.SphereGeometry(1.1, 10, 7), mat(0x7e996c));
      shrub.scale.set(1, 0.7, 1);
      shrub.position.set(x + dx, 0.8, z + d / 2 + 1.5);
      scene.add(shrub);
    }
    box(2, 0.06, 4, x, 0.13, z + d / 2 + 2, 0xd7c6a9);
    box(0.7, 3, 0.7, x + w * 0.3, h + 1, z - 2, 0xc8ae93);
    if (b.kind === "shop")
      for (let i = 0; i < 6; i++)
        box(
          w / 6,
          0.18,
          2.3,
          x - w / 2 + (w * (i + 0.5)) / 6,
          3.8,
          z + d / 2 + 0.8,
          i % 2 ? 0xe5c38f : 0xd29b8b,
        );
  }
  function tree(x, z, seed) {
    box(0.55, 3.4, 0.6, x, 1.7, z, 0x9a8061);
    const crown = new T.Mesh(
      new T.SphereGeometry(1, 12, 9),
      mat([0x769465, 0x879c6d, 0x678a77][seed % 3]),
    );
    crown.scale.set(3.1, 4.7 + (seed % 3), 2.8);
    crown.position.set(x, 6, z);
    crown.castShadow = true;
    scene.add(crown);
  }
  for (let z = -145, i = 0; z < 150; z += 19, i++) {
    tree(-119, z, i);
    tree(82, z, i + 1);
  }
  for (const [x, z] of [
    [-19, 17],
    [16, 17],
    [-19, 47],
    [16, 47],
    [-12, -148],
    [12, 145],
  ])
    tree(x, z, Math.abs(x));
  box(42, 0.12, 38, 0, 0.04, -32, 0xddc9a9);
  box(42, 0.12, 38, 0, 0.04, 32, 0xabc28a);
  box(6, 0.08, 38, 0, 0.13, 32, 0xdcc9aa);
  box(42, 0.08, 5, 0, 0.14, 32, 0xdcc9aa);
  const basin = new T.Mesh(
    new T.CylinderGeometry(4.8, 5, 1, 20),
    mat(0xc7c9b8),
  );
  basin.position.set(0, 0.5, 32);
  scene.add(basin);
  const water = new T.Mesh(
    new T.CylinderGeometry(4.2, 4.2, 0.1, 20),
    mat(0x96c2c8),
  );
  water.position.set(0, 1.02, 32);
  scene.add(water);
  // Small riverside details make the walk feel inhabited without blocking it.
  for (let z = -138; z < 145; z += 24) {
    box(3, 0.3, 0.9, 90, 0.9, z, 0xb28a6e);
    box(3, 0.8, 0.18, 90, 1.35, z - 0.4, 0xb28a6e);
    for (const dx of [-1, 1]) box(0.18, 0.9, 0.5, 90 + dx, 0.45, z, 0x7e7c64);
    for (let i = 0; i < 5; i++) {
      const flower = new T.Mesh(
        new T.SphereGeometry(0.28, 6, 5),
        mat([0xe6be88, 0xd5958b, 0xf0ddba][i % 3]),
      );
      flower.position.set(79 + (i % 2) * 0.8, 0.5, z + 4 + i * 0.4);
      scene.add(flower);
    }
  }
  const lamps = [];
  for (let z = -120; z <= 120; z += 40) {
    box(0.18, 4, 0.18, 78, 2, z, 0x8d7864);
    const bulb = new T.Mesh(
      new T.SphereGeometry(0.35, 8, 6),
      new T.MeshBasicMaterial({ color: 0xffdfac }),
    );
    bulb.position.set(78, 4.2, z);
    scene.add(bulb);
    lamps.push(bulb);
  }
  const lights = [
    new T.PointLight(0xffcf94, 0, 32, 1.3),
    new T.PointLight(0xffcf94, 0, 32, 1.3),
  ];
  lights[0].position.set(78, 6, 0);
  lights[1].position.set(78, 6, 70);
  scene.add(...lights);
  return {
    path: riversidePath(map, city),
    facades: {
      setNight(night) {
        lamps.forEach((l) => (l.visible = night));
        lights.forEach((l) => (l.intensity = night ? 12 : 0));
      },
    },
    collides: (x, z) => blocked(x, z, "drive"),
  };
}
