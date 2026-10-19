import * as T from "three";

export function addFacades(scene, buildings, batch) {
  const roofMaterial = new T.MeshLambertMaterial({
      color: 0xb96343,
      side: T.DoubleSide,
    }),
    flatRoof = new T.MeshLambertMaterial({ color: 0xa9a69a });
  const glass = new T.MeshBasicMaterial({ color: 0x47616a }),
    frames = new T.MeshLambertMaterial({ color: 0xeee1c3 });
  const panes = [],
    doors = [];
  const object = new T.Object3D();
  for (const b of buildings) {
    const points = b.points,
      center = points.reduce(
        (a, p) => [a[0] + p[0] / points.length, a[1] + p[1] / points.length],
        [0, 0],
      );
    const pitched =
      ["gabled", "hipped", "pyramidal", "half-hipped"].includes(b.roof) &&
      b.height < 30;
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
      batch(triangles, flatRoof);
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
      const floors = Math.min(10, Math.max(1, Math.floor(b.height / 3.2)));
      for (let floor = 0; floor < floors; floor++)
        for (let col = 0; col < columns; col++) {
          if (panes.length >= 160000) break;
          const t = (col + 0.5) / columns;
          object.position.set(
            a[0] + dx * t + nx * 0.05,
            1.8 + floor * 3.2,
            a[1] + dz * t + nz * 0.05,
          );
          object.rotation.set(0, Math.atan2(nx, nz), 0);
          object.scale.set(b.kind === "shop" && floor === 0 ? 1.8 : 1, 1, 1);
          object.updateMatrix();
          panes.push(object.matrix.clone());
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
    new T.PlaneGeometry(1.1, 1.3),
    glass,
    panes.length,
  );
  glass.side = T.FrontSide;
  panes.forEach((matrix, i) => windows.setMatrixAt(i, matrix));
  scene.add(windows);
  const entrances = new T.InstancedMesh(
    new T.PlaneGeometry(1.1, 2.1),
    frames,
    doors.length,
  );
  frames.side = T.FrontSide;
  doors.forEach((matrix, i) => entrances.setMatrixAt(i, matrix));
  scene.add(entrances);
  return {
    setNight(night) {
      glass.color.setHex(night ? 0xffd58b : 0x47616a);
    },
    windows: panes.length,
  };
}
