import { createLumaCrowd } from "./luma-crowd.js";
import { softMaterial, roundedGeometry } from "./art-direction.js";
import * as T from "three";
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
      roundedGeometry(...size, 0.06),
      new T.MeshStandardMaterial({ roughness: 0.85, color }),
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
  const crowd = createLumaCrowd(group);
  const walkingSeeds = Array.from({ length: 240 }, (_, k) => {
    const sample = samplePath(path, (k * 0.61803398875) % 1);
    return {
      point: place(sample, (k % 6) * 8 + Math.sin(k * 7)),
      heading: sample.heading,
    };
  });
  function update(dt, time, focus = null, radius = Infinity) {
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
    let rendered = 0;
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
      if (focus && Math.hypot(point[0] - focus.x, point[1] - focus.z) > radius)
        continue;
      crowd.pose(rendered++, point, heading, elapsed, i >= activity.vendors, i);
    }
    crowd.flush(rendered);
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
