import * as T from "three";
import { nearestRoad } from "./geo.js";
import { buildingPlace, detailFootprint } from "./places.js";

// Detail geometry joins the existing material batches, with no per-frame animation.
export function addPlaceDetails(buildings, batch, visibility, roads = []) {
  const colors = {
    gold: 0xd8ae56,
    cream: 0xf6e6b9,
    roof: 0xb16d50,
    green: 0x678779,
    ochre: 0xe4bd69,
    dark: 0x52665f,
  };
  const materials = Object.fromEntries(
    Object.entries(colors).map(([name, color]) => [
      name,
      new T.MeshLambertMaterial({ color }),
    ]),
  );
  Object.values(materials).forEach((m) => visibility?.apply(m));
  const marketBuildings = buildings.filter(
    (b) => buildingPlace(b)?.kind === "central-market",
  );
  const marketDistance = (b) => {
    const p = buildingPlace(b),
      f = detailFootprint(b.points);
    return f ? Math.hypot(f.x - p.center[0], f.z - p.center[1]) : Infinity;
  };
  const domedMarket = marketBuildings.sort(
    (a, b) => marketDistance(a) - marketDistance(b),
  )[0]?.id;
  const foodBuildings = buildings.filter((b) =>
    ["restaurant", "cafe"].includes(buildingPlace(b)?.kind),
  );
  let signMaterial;
  if (typeof document !== "undefined" && foodBuildings.length) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = foodBuildings.length * 64;
    const ctx = canvas.getContext("2d");
    foodBuildings.forEach((b, i) => {
      ctx.fillStyle = "#f2e5c7";
      ctx.fillRect(0, i * 64, 512, 64);
      ctx.fillStyle = "#4e6658";
      ctx.font = "600 26px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(buildingPlace(b).name, 256, i * 64 + 32, 490);
    });
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    signMaterial = new T.MeshBasicMaterial({
      map: texture,
      side: T.DoubleSide,
    });
    visibility?.apply(signMaterial);
  }
  let count = 0,
    placement = null;
  const emit = (geometry, material) => {
    if (placement) {
      geometry.translate(-placement.x, 0, -placement.z);
      geometry.rotateY(-placement.angle);
      geometry.translate(placement.x, 0, placement.z);
    }
    batch(geometry, material);
  };
  const box = (w, h, d, x, y, z, material) => {
    const geometry = new T.BoxGeometry(w, h, d).toNonIndexed();
    geometry.translate(x, y, z);
    emit(geometry, materials[material]);
  };
  const roof = (w, d, x, y, z, h, material) => {
    const vertices = [];
    const a = [x - w / 2, y, z - d / 2],
      b = [x + w / 2, y, z - d / 2],
      c = [x + w / 2, y, z + d / 2],
      e = [x - w / 2, y, z + d / 2],
      r = [x, y + h, z - d / 2],
      s = [x, y + h, z + d / 2];
    for (const tri of [
      [a, b, r],
      [e, s, c],
      [a, r, s],
      [a, s, e],
      [b, c, s],
      [b, s, r],
    ])
      vertices.push(...tri.reverse().flat());
    const geo = new T.BufferGeometry().setAttribute(
      "position",
      new T.Float32BufferAttribute(vertices, 3),
    );
    geo.setAttribute(
      "uv",
      new T.Float32BufferAttribute(
        new Float32Array((vertices.length / 3) * 2),
        2,
      ),
    );
    geo.computeVertexNormals();
    emit(geo, materials[material]);
  };
  for (const b of buildings) {
    const place = buildingPlace(b);
    if (!place) continue;
    const f = detailFootprint(b.points);
    if (!f) continue;
    placement = f;
    const { x, z, w, d } = f,
      y = b.height + 0.3;
    if (place.kind === "palace") {
      for (let tier = 0; tier < 3; tier++) {
        const scale = 1 - tier * 0.22,
          level = y + tier * 2.3;
        roof(w * scale, d * scale, x, level, z, 2.8, "gold");
        roof(
          w * scale * 0.91,
          d * scale * 0.94,
          x,
          level + 0.18,
          z,
          2.8,
          "roof",
        );
      }
      const spire = new T.ConeGeometry(
        Math.min(w, d) * 0.07,
        12,
        8,
      ).toNonIndexed();
      spire.translate(x, y + 11, z);
      emit(spire, materials.gold);
      for (let i = 0; i < 7; i++) {
        const px = x - w * 0.42 + i * w * 0.14;
        for (const side of [-1, 1]) {
          box(
            0.6,
            Math.min(6, b.height * 0.45),
            0.6,
            px,
            b.height - 3,
            z + side * d * 0.43,
            "cream",
          );
          box(
            w * 0.13,
            0.5,
            0.7,
            px,
            b.height + 0.05,
            z + side * d * 0.43,
            "gold",
          );
        }
      }
    } else if (place.kind === "central-market") {
      box(w, 0.7, d, x, y, z, "ochre");
      roof(w * 0.94, d * 0.94, x, y + 0.4, z, 3, "ochre");
      for (let i = 0; i < 8; i++)
        box(
          Math.max(0.5, w * 0.055),
          1.2,
          0.5,
          x - w * 0.4 + i * w * 0.11,
          y + 1,
          z - d * 0.43,
          "cream",
        );
      if (b.id === domedMarket) {
        const dome = new T.SphereGeometry(
          Math.min(w, d) * 0.24,
          12,
          6,
          0,
          Math.PI * 2,
          0,
          Math.PI / 2,
        ).toNonIndexed();
        dome.translate(x, y + 2, z);
        emit(dome, materials.ochre);
      }
    } else if (place.kind.includes("market")) {
      const rows = Math.min(6, Math.max(2, Math.floor(d / 10)));
      for (let i = 0; i < rows; i++)
        roof(
          w * 0.9,
          (d / rows) * 0.7,
          x,
          y + 0.2,
          z - d * 0.4 + (i * d * 0.8) / (rows - 1),
          1.5,
          i % 2 ? "green" : "roof",
        );
    } else {
      if (signMaterial) {
        const index = foodBuildings.indexOf(b);
        const edges = b.points.slice(1).map((c, i) => ({ a: b.points[i], c }));
        const edge = roads.length
          ? edges.sort(
              (u, v) =>
                nearestRoad(
                  [(u.a[0] + u.c[0]) / 2, (u.a[1] + u.c[1]) / 2],
                  roads,
                ).distance -
                nearestRoad(
                  [(v.a[0] + v.c[0]) / 2, (v.a[1] + v.c[1]) / 2],
                  roads,
                ).distance,
            )[0]
          : edges[0];
        const { a, c } = edge;
        const length = Math.hypot(c[0] - a[0], c[1] - a[1]);
        if (length > 3) {
          const plane = new T.PlaneGeometry(
            Math.min(length * 0.8, 12),
            1.5,
          ).toNonIndexed();
          const uv = plane.attributes.uv;
          for (let i = 0; i < uv.count; i++)
            uv.setY(
              i,
              (foodBuildings.length - index - 1 + uv.getY(i)) /
                foodBuildings.length,
            );
          plane.rotateY(-Math.atan2(c[1] - a[1], c[0] - a[0]));
          plane.translate(
            (a[0] + c[0]) / 2,
            Math.min(b.height - 0.8, 4.8),
            (a[1] + c[1]) / 2,
          );
          // A tiny wall offset avoids z-fighting without extending onto a road.
          const normal = new T.Vector3().fromBufferAttribute(
            plane.attributes.normal,
            0,
          );
          plane.translate(normal.x * 0.12, 0, normal.z * 0.12);
          batch(plane, signMaterial);
          const wallX = (a[0] + c[0]) / 2,
            wallZ = (a[1] + c[1]) / 2;
          const outward =
            (wallX - f.x) * normal.x + (wallZ - f.z) * normal.z >= 0 ? 1 : -1;
          const road = roads.length ? nearestRoad([wallX, wallZ], roads) : null;
          if (!road || road.distance > road.road.width / 2 + 2) {
            for (let stripe = 0; stripe < 8; stripe++) {
              const width = Math.min(length * 0.8, 12),
                offset = -width / 2 + ((stripe + 0.5) * width) / 8;
              const canopy = new T.BoxGeometry(
                width / 8,
                0.22,
                1.6,
              ).toNonIndexed();
              canopy.translate(offset, 0, outward * 0.65);
              canopy.rotateY(-Math.atan2(c[1] - a[1], c[0] - a[0]));
              canopy.translate(wallX, 3.5, wallZ);
              batch(canopy, materials[stripe % 2 ? "cream" : "green"]);
            }
          }
        }
      }
      // Striped canopy and timber slats remain inside the checked footprint.
      const depth = Math.min(3, d * 0.3),
        width = Math.min(w * 0.9, 18);
      for (let i = 0; i < 8; i++)
        box(
          width / 8,
          0.25,
          depth,
          x - width / 2 + ((i + 0.5) * width) / 8,
          y,
          z - d * 0.3,
          i % 2 ? "cream" : "green",
        );
      for (let i = 0; i < 4; i++)
        box(
          0.22,
          1.2,
          depth,
          x - width * 0.4 + i * width * 0.27,
          y + 0.5,
          z - d * 0.3,
          "dark",
        );
      box(width * 0.7, 1.1, 0.35, x, y + 1, z - d * 0.3, "roof");
    }
    count++;
  }
  return count;
}
