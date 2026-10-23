import * as T from "three";

// Cross-sections describe bodywork and glass as continuous sculpted surfaces.
// +Z is the nose. Heights and widths are deliberately readable at town scale.
export function buildCarDesign(group, spec, materials) {
  const { body, dark, glass, cream, lamp, tail } = materials;
  const chrome = new T.MeshLambertMaterial({ color: 0xb1bab9 });
  const rubber = new T.MeshLambertMaterial({ color: 0x242a2d });
  const { length: length, kind, id } = spec;
  const suv = kind === "suv",
    pickup = kind === "pickup",
    tall = suv || pickup;
  const coupe = kind === "coupe",
    hatch = kind === "hatch";
  const modern = id === "mercedes-c300";
  const boxy = ["cedric", "skyline-r34", "pajero"].includes(id);
  const width = tall ? 2.06 : modern ? 1.94 : coupe ? 1.89 : 1.84;
  const sill = tall ? 0.69 : 0.46,
    belt = tall ? 1.48 : 1.12;
  const roof = tall ? 2.18 : coupe ? 1.59 : hatch ? 1.79 : modern ? 1.57 : 1.68;
  const front = length / 2,
    rear = -front;
  function mesh(geometry, material, name) {
    const object = new T.Mesh(geometry, material);
    object.name = name;
    object.castShadow = object.receiveShadow = true;
    group.add(object);
    return object;
  }
  function box(w, h, d, x, y, z, material, name = "trim") {
    const object = mesh(new T.BoxGeometry(w, h, d), material, name);
    object.position.set(x, y, z);
    return object;
  }
  function sectionHull(rings, material, name) {
    const vertices = [],
      indices = [];
    for (const { z, w, bottom, top, bevel = 0.07 } of rings) {
      const x = w / 2;
      for (const [px, py] of [
        [-x + bevel, bottom],
        [x - bevel, bottom],
        [x, bottom + bevel],
        [x, top - bevel],
        [x - bevel, top],
        [-x + bevel, top],
        [-x, top - bevel],
        [-x, bottom + bevel],
      ])
        vertices.push(px, py, z);
    }
    for (let ring = 0; ring < rings.length - 1; ring++)
      for (let j = 0; j < 8; j++) {
        const a = ring * 8 + j,
          b = ring * 8 + ((j + 1) % 8),
          c = b + 8,
          d = a + 8;
        indices.push(a, b, d, b, c, d);
      }
    for (let j = 1; j < 7; j++) {
      indices.push(0, j + 1, j);
      const end = (rings.length - 1) * 8;
      indices.push(end, end + j, end + j + 1);
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(vertices, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return mesh(geometry, material, name);
  }
  sectionHull(
    [
      { z: rear, w: width * 0.88, bottom: sill + 0.04, top: belt - 0.12 },
      { z: rear + 0.28, w: width, bottom: sill, top: belt },
      { z: -0.4, w: width, bottom: sill, top: belt + 0.03 },
      {
        z: front - 0.55,
        w: width * 0.97,
        bottom: sill,
        top: belt - (modern ? 0.03 : 0.01),
      },
      {
        z: front,
        w: width * (boxy ? 0.94 : 0.86),
        bottom: sill + 0.05,
        top: belt - 0.14,
      },
    ],
    body,
    "sculpted-body",
  );
  const cabinRear = pickup ? -0.22 : hatch || suv ? rear + 0.28 : rear + 0.95;
  const roofRear = pickup ? -0.13 : hatch || suv ? rear + 0.5 : rear + 1.35;
  const roofFront = pickup ? 0.8 : coupe ? 0.15 : 0.34;
  const cabinFront = pickup ? 1.22 : modern ? 1.08 : 0.92;
  sectionHull(
    [
      {
        z: cabinRear,
        w: width * 0.91,
        bottom: belt - 0.02,
        top: belt + 0.02,
        bevel: 0.015,
      },
      { z: roofRear, w: width * 0.77, bottom: belt, top: roof - 0.07 },
      { z: roofFront, w: width * 0.76, bottom: belt, top: roof - 0.07 },
      {
        z: cabinFront,
        w: width * 0.89,
        bottom: belt - 0.02,
        top: belt + 0.02,
        bevel: 0.015,
      },
    ],
    glass,
    "shaped-cabin-glass",
  );
  sectionHull(
    [
      {
        z: roofRear - 0.04,
        w: width * 0.77,
        bottom: roof - 0.08,
        top: roof,
        bevel: 0.025,
      },
      {
        z: roofFront + 0.04,
        w: width * 0.76,
        bottom: roof - 0.08,
        top: roof,
        bevel: 0.025,
      },
    ],
    body,
    "shaped-roof",
  );
  function pillar(a, b, thickness = 0.065) {
    const start = new T.Vector3(...a),
      end = new T.Vector3(...b);
    const object = mesh(
      new T.CylinderGeometry(thickness, thickness, start.distanceTo(end), 4),
      body,
      "window-pillar",
    );
    object.position.copy(start).add(end).multiplyScalar(0.5);
    object.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      end.sub(start).normalize(),
    );
  }
  for (const side of [-1, 1]) {
    pillar(
      [side * width * 0.445, belt, cabinFront],
      [side * width * 0.38, roof - 0.03, roofFront],
    );
    pillar(
      [side * width * 0.455, belt, cabinRear],
      [side * width * 0.385, roof - 0.03, roofRear],
      0.085,
    );
    pillar(
      [side * width * 0.45, belt, -0.25],
      [side * width * 0.38, roof - 0.04, -0.25],
      0.04,
    );
    box(
      0.2,
      0.13,
      0.28,
      side * (width / 2 + 0.08),
      belt + 0.16,
      cabinFront - 0.18,
      body,
      "side-mirror",
    );
    box(
      0.025,
      0.035,
      length * 0.72,
      side * (width / 2 + 0.005),
      belt - 0.08,
      -0.05,
      modern ? chrome : dark,
    );
    for (const z of coupe || pickup ? [0.0] : [-0.7, 0.38]) {
      box(
        0.025,
        0.045,
        0.17,
        side * (width / 2 + 0.018),
        belt - 0.2,
        z,
        chrome,
        "door-handle",
      );
      box(
        0.012,
        (belt - sill) * 0.63,
        0.014,
        side * (width / 2 + 0.012),
        (sill + belt) / 2,
        z - 0.43,
        dark,
        "door-seam",
      );
    }
  }
  if (pickup) {
    box(
      width * 0.82,
      0.04,
      1.7,
      0,
      belt + 0.03,
      rear + 0.95,
      dark,
      "open-pickup-bed",
    );
    for (const side of [-1, 1])
      box(0.13, 0.28, 1.8, side * width * 0.46, belt + 0.12, rear + 0.95, body);
    box(width * 0.94, 0.28, 0.11, 0, belt + 0.12, rear + 0.08, body);
  }
  if (suv)
    for (const side of [-1, 1])
      box(
        0.055,
        0.07,
        roofFront - roofRear,
        side * width * 0.31,
        roof + 0.05,
        (roofFront + roofRear) / 2,
        dark,
        "roof-rail",
      );
  const wheelRadius = tall ? 0.45 : 0.35;
  for (const side of [-1, 1])
    for (const z of [-length * 0.31, length * 0.3]) {
      const start = group.children.length;
      const x = side * width * 0.49;
      const tire = mesh(
        new T.CylinderGeometry(wheelRadius, wheelRadius, 0.25, 16),
        rubber,
        "tire",
      );
      tire.rotation.z = Math.PI / 2;
      tire.position.set(x, wheelRadius, z);
      const rim = mesh(
        new T.CylinderGeometry(
          wheelRadius * 0.68,
          wheelRadius * 0.68,
          0.27,
          12,
        ),
        chrome,
        "alloy-rim",
      );
      rim.rotation.z = Math.PI / 2;
      rim.position.copy(tire.position);
      for (let spoke = 0; spoke < 5; spoke++) {
        const angle = (spoke * Math.PI * 2) / 5;
        const detail = box(
          0.015,
          0.04,
          wheelRadius * 0.95,
          x + side * 0.145,
          wheelRadius,
          z,
          dark,
          "wheel-spoke",
        );
        detail.rotation.x = angle;
      }
      for (const part of group.children.slice(start))
        part.userData.wheel = { x, z, r: wheelRadius };
      const arch = mesh(
        new T.TorusGeometry(wheelRadius + 0.045, 0.045, 4, 12, Math.PI),
        tall ? dark : body,
        "wheel-arch",
      );
      arch.rotation.y = Math.PI / 2;
      arch.position.set(x + side * 0.13, wheelRadius, z);
    }
  box(
    width * 0.88,
    0.11,
    0.12,
    0,
    sill + 0.1,
    front + 0.035,
    dark,
    "front-bumper",
  );
  box(
    width * 0.86,
    0.1,
    0.12,
    0,
    sill + 0.1,
    rear - 0.035,
    dark,
    "rear-bumper",
  );
  box(width * 0.42, 0.2, 0.065, 0, belt - 0.32, front + 0.045, dark, "grille");
  box(0.4, 0.12, 0.03, 0, sill + 0.19, front + 0.1, cream, "front-plate");
  box(0.4, 0.12, 0.03, 0, sill + 0.19, rear - 0.1, cream, "rear-plate");
  const lampY = belt - 0.22;
  for (const side of [-1, 1]) {
    box(
      modern ? 0.44 : 0.4,
      modern ? 0.12 : 0.16,
      0.065,
      side * width * 0.33,
      lampY,
      front + 0.025,
      lamp,
      "headlamp",
    );
    if (spec.roundTail)
      for (const dx of [-0.105, 0.105]) {
        const lens = mesh(
          new T.CylinderGeometry(0.095, 0.095, 0.045, 12),
          tail,
          "round-tail-lamp",
        );
        lens.rotation.x = Math.PI / 2;
        lens.position.set(side * width * 0.33 + dx, lampY, rear - 0.04);
      }
    else
      box(
        modern ? 0.44 : 0.4,
        0.13,
        0.06,
        side * width * 0.33,
        lampY,
        rear - 0.025,
        tail,
        "tail-lamp",
      );
  }
  if (spec.spoiler) {
    for (const side of [-1, 1])
      box(0.07, 0.21, 0.12, side * 0.58, belt + 0.05, rear + 0.2, dark);
    box(
      width * 0.96,
      0.065,
      0.27,
      0,
      belt + 0.19,
      rear + 0.2,
      body,
      "rear-spoiler",
    );
  }
  if (spec.spare) {
    const spare = mesh(
      new T.CylinderGeometry(0.42, 0.42, 0.24, 14),
      rubber,
      "spare-wheel",
    );
    spare.rotation.x = Math.PI / 2;
    spare.position.set(0, belt + 0.08, rear - 0.12);
  }
  group.userData.design = { width, roof, cabinFront, cabinRear, front, rear };
}
