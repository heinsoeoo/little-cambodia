import { roundedGeometry } from "./art-direction.js";
import * as T from "three";

// Soft modern volumes preserve each vehicle's silhouette and signature details.
// +Z is the nose. Heights and widths are deliberately readable at town scale.
export function buildCarDesign(group, spec, materials) {
  const { body, dark, glass, cream, lamp, tail } = materials;
  const chrome = new T.MeshStandardMaterial({
    roughness: 0.55,
    metalness: 0.12,
    color: 0xb1bab9,
  });
  const rubber = new T.MeshStandardMaterial({
    roughness: 0.55,
    metalness: 0.12,
    color: 0x242a2d,
  });
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
  const roof = tall ? 2.32 : coupe ? 1.76 : hatch ? 1.95 : modern ? 1.82 : 1.88;
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
    const object = mesh(roundedGeometry(w, h, d, 0.08), material, name);
    object.position.set(x, y, z);
    return object;
  }
  // Rounded toy-like volumes match the Luma Bay reference. Individual cabin
  // lengths, roof heights, lights and trim still identify the existing cars.
  const bodyHeight = belt - sill + 0.12;
  const shell = mesh(
    roundedGeometry(width, bodyHeight, length, boxy ? 0.15 : 0.23),
    body,
    "sculpted-body",
  );
  shell.position.set(0, (belt + sill) / 2, 0);
  box(
    width * 0.97,
    0.13,
    length * 0.94,
    0,
    sill - 0.025,
    0,
    dark,
    "lower-sill",
  );
  const cabinRear = pickup ? -0.22 : hatch || suv ? rear + 0.28 : rear + 0.95;
  const cabinFront = pickup ? 1.22 : modern ? 1.08 : 0.92;
  const roofRear = cabinRear + 0.13,
    roofFront = cabinFront - 0.13;
  const cabinLength = cabinFront - cabinRear;
  const cabin = mesh(
    roundedGeometry(width * 0.85, roof - belt + 0.1, cabinLength, 0.21),
    glass,
    "shaped-cabin-glass",
  );
  cabin.position.set(0, (belt + roof) / 2 - 0.02, (cabinFront + cabinRear) / 2);
  const roofPanel = mesh(
    roundedGeometry(width * 0.83, 0.14, cabinLength * 0.92, 0.09),
    body,
    "shaped-roof",
  );
  roofPanel.position.set(0, roof + 0.025, (cabinFront + cabinRear) / 2);
  const hoodLength = Math.max(0.4, front - cabinFront - 0.07);
  box(
    width * 0.9,
    0.14,
    hoodLength,
    0,
    belt + 0.015,
    cabinFront + hoodLength / 2,
    body,
    "rounded-bonnet",
  );
  if (!pickup && !hatch && !suv)
    box(
      width * 0.88,
      0.1,
      Math.max(0.25, cabinRear - rear - 0.1),
      0,
      belt + 0.01,
      (rear + cabinRear) / 2,
      body,
      "rounded-boot",
    );
  // Interior silhouettes show through the softly tinted windows.
  glass.transparent = true;
  glass.opacity = 0.92;
  glass.depthWrite = false;
  for (const x of [-width * 0.22, width * 0.22]) {
    box(0.43, 0.38, 0.16, x, belt + 0.12, cabinRear + 0.5, dark, "seat-back");
    box(0.22, 0.17, 0.12, x, belt + 0.4, cabinRear + 0.5, cream, "headrest");
  }
  const steering = mesh(
    new T.TorusGeometry(0.13, 0.025, 6, 20),
    dark,
    "steering-wheel",
  );
  steering.position.set(-width * 0.23, belt + 0.12, cabinFront - 0.26);
  steering.rotation.x = -0.55;
  function pillar(a, b, thickness = 0.065) {
    const start = new T.Vector3(...a),
      end = new T.Vector3(...b);
    const object = mesh(
      new T.CylinderGeometry(thickness, thickness, start.distanceTo(end), 10),
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
      [side * width * 0.425, belt, cabinFront],
      [side * width * 0.425, roof - 0.03, roofFront],
    );
    pillar(
      [side * width * 0.425, belt, cabinRear],
      [side * width * 0.4255, roof - 0.03, roofRear],
      0.085,
    );
    pillar(
      [side * width * 0.425, belt, -0.25],
      [side * width * 0.425, roof - 0.04, -0.25],
      0.04,
    );
    box(
      0.26,
      0.17,
      0.32,
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
      body,
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
        new T.TorusGeometry(wheelRadius - 0.075, 0.075, 10, 28),
        rubber,
        "tire",
      );
      tire.rotation.y = Math.PI / 2;
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
