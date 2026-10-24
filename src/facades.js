import { roundedGeometry } from "./art-direction.js";
import * as T from "three";
import { buildingPlace } from "./places.js";
import { tileTexture } from "./pixel-art.js";

export function addFacades(scene, buildings, batch, cozy = false, visibility) {
  const roofMaterial = new T.MeshStandardMaterial({
      roughness: 0.85,
      color: 0xb96343,
      map:
        !cozy && typeof document !== "undefined" ? tileTexture("roof") : null,
      side: T.DoubleSide,
    }),
    flatRoof = new T.MeshStandardMaterial({
      roughness: 0.85,
      color: 0xd5c5b1,
      map:
        !cozy && typeof document !== "undefined" ? tileTexture("roof") : null,
    });
  const cozyRoofs = cozy
    ? [0xc3947b, 0xad8b7e, 0x829e98, 0xc5af8d].map(
        (color) => new T.MeshStandardMaterial({ roughness: 0.85, color }),
      )
    : [];
  const glass = new T.MeshBasicMaterial({ color: 0x789caa }),
    frames = new T.MeshStandardMaterial({ roughness: 0.85, color: 0xf7edda });
  [roofMaterial, flatRoof, glass, frames, ...cozyRoofs].forEach((material) =>
    visibility?.apply(material),
  );
  const panes = [],
    doors = [];
  const awnings = cozy ? cozyRoofs : [roofMaterial];
  awnings.forEach((m) => visibility?.apply(m));
  let dressed = 0;
  const object = new T.Object3D();
  for (const b of buildings) {
    const placeKind = buildingPlace(b)?.kind;
    const palace = placeKind === "palace";
    const points = b.points,
      center = points.reduce(
        (a, p) => [a[0] + p[0] / points.length, a[1] + p[1] / points.length],
        [0, 0],
      );
    const pitched =
      palace ||
      (["gabled", "hipped", "pyramidal", "half-hipped"].includes(b.roof) &&
        b.height < 30);
    if (pitched) {
      const vertices = [];
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1],
          c = points[i];
        vertices.push(
          a[0],
          b.height + 0.12,
          a[1],
          c[0],
          b.height + 0.12,
          c[1],
          center[0],
          b.height + 2.2,
          center[1],
        );
      }
      const geometry = new T.BufferGeometry().setAttribute(
        "position",
        new T.Float32BufferAttribute(vertices, 3),
      );
      geometry.computeVertexNormals();
      batch(geometry, roofMaterial);
    } else {
      const shape = new T.Shape();
      points.forEach((p, i) =>
        i ? shape.lineTo(p[0], -p[1]) : shape.moveTo(p[0], -p[1]),
      );
      const roof = new T.ShapeGeometry(shape);
      roof.rotateX(-Math.PI / 2);
      roof.translate(0, b.height + 0.13, 0);
      const triangles = roof.index ? roof.toNonIndexed() : roof;
      batch(
        triangles,
        placeKind?.includes("market")
          ? flatRoof
          : cozy
            ? cozyRoofs[b.id % cozyRoofs.length]
            : flatRoof,
      );
      if (triangles !== roof) roof.dispose();
    }
    const winding =
      points.reduce((sum, p, i) => {
        const q = points[(i + 1) % points.length];
        return sum + p[0] * q[1] - q[0] * p[1];
      }, 0) > 0
        ? 1
        : -1;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        c = points[i],
        dx = c[0] - a[0],
        dz = c[1] - a[1],
        length = Math.hypot(dx, dz);
      if (length < 3) continue;
      const nx = (dz / length) * winding,
        nz = (-dx / length) * winding,
        columns = Math.min(6, Math.floor(length / 3));
      const floors = palace
        ? 1
        : Math.min(10, Math.max(1, Math.floor(b.height / 3.2)));
      if (palace) {
        for (let col = 0; col < Math.min(14, Math.floor(length / 4)); col++) {
          const n = Math.min(14, Math.floor(length / 4)),
            t = (col + 0.5) / n;
          const column = new T.BoxGeometry(
            0.8,
            b.height * 0.58,
            0.8,
          ).toNonIndexed();
          column.translate(
            a[0] + dx * t + nx * 0.25,
            b.height * 0.4,
            a[1] + dz * t + nz * 0.25,
          );
          batch(column, frames);
        }
      }
      for (let floor = 0; floor < floors; floor++)
        for (let col = 0; col < columns; col++) {
          if (panes.length >= 160000) break;
          const t = (col + 0.5) / columns;
          object.position.set(
            a[0] + dx * t + nx * 0.05,
            palace ? b.height * 0.6 : 1.8 + floor * 3.2,
            a[1] + dz * t + nz * 0.05,
          );
          object.rotation.set(0, Math.atan2(nx, nz), 0);
          object.scale.set(b.kind === "shop" && floor === 0 ? 1.8 : 1, 1, 1);
          object.updateMatrix();
          panes.push(object.matrix.clone());
        }
      if (
        i === 1 &&
        !palace &&
        b.height < 35 &&
        length > 4 &&
        dressed++ < 700
      ) {
        // Shallow canopies, sills and door pulls keep the map footprint intact.
        const local = (w, h, d, x, y, z, material) => {
          const geo = roundedGeometry(w, h, d, 0.05);
          const transform = new T.Matrix4().compose(
            new T.Vector3((a[0] + c[0]) / 2, y, (a[1] + c[1]) / 2),
            new T.Quaternion().setFromAxisAngle(
              new T.Vector3(0, 1, 0),
              Math.atan2(nx, nz),
            ),
            new T.Vector3(1, 1, 1),
          );
          geo.translate(x, 0, z);
          geo.applyMatrix4(transform);
          batch(geo, material);
        };
        local(
          Math.min(length * 0.8, 8),
          0.16,
          0.85,
          0,
          2.9,
          0.4,
          awnings[b.id % awnings.length],
        );
        local(1.32, 0.12, 0.2, 0, 0.12, 0.15, frames);
        local(0.045, 0.42, 0.08, 0.37, 1.05, 0.14, frames);
      }
      if (i === 1) {
        object.position.set(
          (a[0] + c[0]) / 2 + nx * 0.07,
          1.05,
          (a[1] + c[1]) / 2 + nz * 0.07,
        );
        object.rotation.set(0, Math.atan2(nx, nz), 0);
        object.scale.set(1, 1, 1);
        object.updateMatrix();
        doors.push(object.matrix.clone());
      }
    }
  }
  const windows = new T.InstancedMesh(
    roundedGeometry(1.1, 1.3, 0.08, 0.04),
    glass,
    panes.length,
  );
  glass.side = T.FrontSide;
  panes.forEach((matrix, i) => windows.setMatrixAt(i, matrix));
  scene.add(windows);
  const entrances = new T.InstancedMesh(
    new T.BoxGeometry(1, 1, 0.08),
    frames,
    doors.length + panes.length,
  );
  const doorScale = new T.Matrix4().makeScale(1.1, 2.1, 1);
  doors.forEach((matrix, i) =>
    entrances.setMatrixAt(i, matrix.clone().multiply(doorScale)),
  );
  const inset = new T.Matrix4()
    .makeTranslation(0, 0, -0.055)
    .multiply(new T.Matrix4().makeScale(1.32, 1.5, 1));
  panes.forEach((matrix, i) =>
    entrances.setMatrixAt(doors.length + i, matrix.clone().multiply(inset)),
  );
  scene.add(entrances);
  return {
    setNight(night) {
      glass.color.setHex(night ? 0xffd58b : 0x789caa);
    },
    windows: panes.length,
  };
}
