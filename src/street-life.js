import * as T from "three";
import { personTexture } from "./pixel-art.js";
import { samplePath } from "./riverside.js";
import { activityAt } from "./schedule.js";
import { nearestRoad } from "./geo.js";
import { insidePolygon } from "./buildings.js";

const foods = [
  "Grilled skewers",
  "Fresh coconut",
  "Sugarcane juice",
  "Nom krok",
  "Fruit cart",
  "Noodle cart",
];
export function createStreetLife(scene, path, map) {
  function place(sample, offset) {
    let point = [sample.point[0] - offset, sample.point[1]];
    if (map) {
      const road = nearestRoad(point, map.roads);
      if (
        road.distance < road.road.width / 2 + 3 ||
        map.buildings.some((b) => insidePolygon(...point, b.points))
      )
        point = [sample.point[0], sample.point[1]];
    }
    return point;
  }
  const group = new T.Group();
  scene.add(group);
  let activity = activityAt({ day: 1, hour: 12 }),
    elapsed = 0;
  const vendors = [];
  const box = (parent, size, position, color) => {
    const mesh = new T.Mesh(
      new T.BoxGeometry(...size),
      new T.MeshLambertMaterial({ color }),
    );
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  };
  for (let i = 0; i < 22; i++) {
    const sample = samplePath(path, (i + 0.5) / 22);
    if (!sample) continue;
    const stall = new T.Group();
    const position = place(sample, i % 2 ? 28 : 1);
    stall.position.set(position[0], 0, position[1]);
    stall.rotation.y = sample.heading;
    box(stall, [2.8, 1, 1.5], [0, 0.7, 0], 0x9d664b);
    box(
      stall,
      [3.2, 0.18, 2],
      [0, 2.7, 0],
      [0xdcb269, 0xbc6d55, 0x648c7c][i % 3],
    );
    for (const x of [-1.3, 1.3])
      box(stall, [0.08, 2, 0.08], [x, 1.8, 0], 0xddd0a6);
    for (let j = 0; j < 5; j++)
      box(
        stall,
        [0.3, 0.16, 0.3],
        [-0.9 + j * 0.44, 1.28, 0],
        i % 2 ? 0xa5bb58 : 0xd9994e,
      );
    const bulb = new T.Mesh(
      new T.SphereGeometry(0.16, 6, 4),
      new T.MeshBasicMaterial({ color: 0xffdf9b }),
    );
    bulb.position.set(0, 2.4, 0);
    stall.add(bulb);
    group.add(stall);
    vendors.push({
      id: i,
      group: stall,
      point: position,
      food: foods[i % foods.length],
      bulb,
    });
  }
  const bodies = new T.InstancedMesh(
    new T.LatheGeometry(
      [
        [0.2, -0.31],
        [0.18, -0.08],
        [0.23, 0.24],
        [0.2, 0.32],
      ].map(([x, y]) => new T.Vector2(x, y)),
      10,
    ).scale(1, 1, 0.7),
    new T.MeshLambertMaterial({ color: 0xffffff }),
    262,
  );
  const heads = new T.InstancedMesh(
    new T.SphereGeometry(1, 10, 7).scale(0.145, 0.18, 0.135),
    new T.MeshLambertMaterial({ color: 0xbb8b67 }),
    262,
  );
  const legs = new T.InstancedMesh(
    new T.CylinderGeometry(0.08, 0.065, 0.8, 6),
    new T.MeshLambertMaterial({ color: 0x3b4d53 }),
    524,
  );
  const hair = new T.InstancedMesh(
    new T.SphereGeometry(0.155, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5).scale(
      1,
      1,
      0.9,
    ),
    new T.MeshLambertMaterial({ color: 0x342f2a }),
    262,
  );
  const arms = new T.InstancedMesh(
    new T.CylinderGeometry(0.065, 0.045, 0.57, 6),
    new T.MeshLambertMaterial({ color: 0xffffff }),
    524,
  );
  group.add(bodies, heads, legs, hair, arms);
  const spriteMap =
    typeof document === "undefined" || map?.style === "cozy"
      ? null
      : personTexture();
  const pixelPeople = spriteMap
    ? new T.InstancedMesh(
        new T.PlaneGeometry(1.9, 2.85),
        new T.MeshBasicMaterial({
          map: spriteMap,
          alphaTest: 0.5,
          side: T.DoubleSide,
        }),
        262,
      )
    : null;
  if (pixelPeople) {
    group.add(pixelPeople);
    bodies.visible =
      heads.visible =
      legs.visible =
      hair.visible =
      arms.visible =
        false;
    pixelPeople.instanceMatrix.setUsage(T.DynamicDrawUsage);
  }

  bodies.instanceMatrix.setUsage(T.DynamicDrawUsage);
  heads.instanceMatrix.setUsage(T.DynamicDrawUsage);
  legs.instanceMatrix.setUsage(T.DynamicDrawUsage);
  const dummy = new T.Object3D(),
    color = new T.Color();
  for (let i = 0; i < 262; i++) {
    color.setHex(
      [0xe1b36b, 0x719caa, 0xd97869, 0x8ba77b, 0xf0d6a8, 0x927aa4][i % 6],
    );
    bodies.setColorAt(i, color);
    arms.setColorAt(i * 2, color);
    arms.setColorAt(i * 2 + 1, color);
    if (pixelPeople)
      pixelPeople.setColorAt(
        i,
        new T.Color([0xffffff, 0xffe1b3, 0xd2e8da, 0xe1d5ee][i % 4]),
      );
  }
  const walkingSeeds = Array.from({ length: 240 }, (_, k) => {
    const sample = samplePath(path, (k * 0.61803398875) % 1);
    return {
      point: place(sample, (k % 6) * 8 + Math.sin(k * 7)),
      heading: sample.heading,
    };
  });
  function update(dt, time) {
    activity = activityAt(time);
    elapsed += dt;
    const activeVendors = Array.from(
      { length: activity.vendors },
      (_, i) =>
        vendors[
          Math.round(
            (i * (vendors.length - 1)) / Math.max(1, activity.vendors - 1),
          )
        ],
    );
    vendors.forEach((v, i) => {
      v.group.visible = activeVendors.includes(v);
      v.bulb.visible = activity.night;
    });
    const count = activity.people + activity.vendors;
    for (let i = 0; i < count; i++) {
      let point, heading;
      if (i < activity.vendors) {
        point = [activeVendors[i].point[0] - 1, activeVendors[i].point[1]];
        heading = Math.PI / 2;
      } else {
        const k = i - activity.vendors,
          seed = walkingSeeds[k];
        // Small back-and-forth strolls stay within each checked promenade cell.
        const stroll = Math.sin(elapsed * 0.25 + k) * 1.2;
        point = [
          seed.point[0] + Math.sin(seed.heading) * stroll,
          seed.point[1] + Math.cos(seed.heading) * stroll,
        ];
        heading =
          seed.heading + (Math.cos(elapsed * 0.25 + k) > 0 ? 0 : Math.PI);
      }
      dummy.rotation.set(0, heading, 0);
      dummy.scale.set(1, 1, 1);
      dummy.position.set(point[0], 1.22, point[1]);
      dummy.updateMatrix();
      bodies.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 1.81;
      dummy.updateMatrix();
      heads.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 1.86;
      dummy.updateMatrix();
      hair.setMatrixAt(i, dummy.matrix);
      for (let side = 0; side < 2; side++) {
        dummy.position.set(point[0] + (side ? 1 : -1) * 0.11, 0.5, point[1]);
        dummy.rotation.x =
          i < activity.vendors
            ? 0
            : Math.sin(elapsed * 5 + i + side * Math.PI) * 0.3;
        dummy.updateMatrix();
        legs.setMatrixAt(i * 2 + side, dummy.matrix);
        dummy.position.set(
          point[0] + Math.cos(heading) * (side ? 1 : -1) * 0.27,
          1.18,
          point[1] - Math.sin(heading) * (side ? 1 : -1) * 0.27,
        );
        dummy.rotation.x *= -0.65;
        dummy.updateMatrix();
        arms.setMatrixAt(i * 2 + side, dummy.matrix);
      }
      if (pixelPeople) {
        dummy.position.set(point[0], 1.43, point[1]);
        dummy.rotation.set(
          0,
          map?.layout === "town" ? 0 : Math.atan2(36, 48),
          0,
        );
        dummy.updateMatrix();
        pixelPeople.setMatrixAt(i, dummy.matrix);
      }
    }
    if (pixelPeople) {
      pixelPeople.count = count;
      pixelPeople.instanceMatrix.needsUpdate = true;
      pixelPeople.computeBoundingSphere();
      spriteMap.offset.x = (Math.floor(elapsed * 3) % 2) * 0.5;
    }
    bodies.count = heads.count = hair.count = count;
    arms.count = count * 2;
    legs.count = count * 2;
    for (const mesh of [bodies, heads, legs, hair, arms]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }
  return {
    access(roads) {
      return vendors
        .filter((v) => v.group.visible)
        .map((v) => nearestRoad(v.point, roads))
        .sort((a, b) => a.distance - b.distance)[0];
    },
    update,
    get activity() {
      return activity;
    },
    nearest(car) {
      return vendors
        .filter((v) => v.group.visible)
        .map((v) => ({
          ...v,
          distance: Math.hypot(car.x - v.point[0], car.z - v.point[1]),
        }))
        .sort((a, b) => a.distance - b.distance)[0];
    },
    collides(x, z) {
      return vendors.some(
        (v) =>
          v.group.visible && Math.hypot(x - v.point[0], z - v.point[1]) < 2.4,
      );
    },
  };
}
