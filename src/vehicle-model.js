import * as T from "three";
import { vehicleSpec, paintColor } from "./vehicle-catalog.js";
// All models face local +Z, matching stepVehicle's forward movement.
export function vehicleModel(type, paint = "factory") {
  const spec = vehicleSpec(type),
    group = new T.Group();
  const material = (color) => new T.MeshLambertMaterial({ color });
  const body = material(paintColor(type, paint)),
    dark = material(0x42474c),
    glass = material(0x668e9b),
    cream = material(0xf1dfbc);
  const lamp = new T.MeshBasicMaterial({ color: 0xfff2b6 }),
    tail = new T.MeshBasicMaterial({ color: 0xe46159 });
  function box(w, h, d, x, y, z, mat) {
    let geometry = new T.BoxGeometry(w, h, d);
    if (mat === body && w > 1.4 && h > 0.4 && d > 2) {
      geometry.dispose();
      const shape = new T.Shape();
      shape.moveTo(-w / 2 + 0.06, -h / 2 + 0.06);
      shape.lineTo(w / 2 - 0.06, -h / 2 + 0.06);
      shape.lineTo(w / 2 - 0.06, h / 2 - 0.06);
      shape.lineTo(-w / 2 + 0.06, h / 2 - 0.06);
      shape.closePath();
      geometry = new T.ExtrudeGeometry(shape, {
        depth: d - 0.12,
        bevelEnabled: true,
        bevelSize: 0.06,
        bevelThickness: 0.06,
        bevelSegments: 1,
        steps: 1,
      });
      geometry.center();
    }
    const mesh = new T.Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  function wheel(x, z, r = 0.36) {
    const tire = new T.Mesh(new T.CylinderGeometry(r, r, 0.24, 12), dark);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(x, r, z);
    tire.castShadow = true;
    group.add(tire);
    const hub = new T.Mesh(
      new T.CylinderGeometry(r * 0.48, r * 0.48, 0.26, 10),
      cream,
    );
    hub.rotation.z = Math.PI / 2;
    hub.position.copy(tire.position);
    group.add(hub);
  }
  const car = ["sedan", "coupe", "hatch", "suv", "pickup"].includes(spec.kind),
    length = spec.length;
  if (spec.kind === "suv" || spec.kind === "pickup") {
    const pickup = spec.kind === "pickup",
      ride = 0.22;
    box(2.1, 0.75, length, 0, 1 + ride, 0, body);
    box(
      1.85,
      0.7,
      pickup ? 1.8 : 3,
      0,
      1.7 + ride,
      pickup ? 0.45 : -0.2,
      glass,
    );
    box(
      1.95,
      0.15,
      pickup ? 1.9 : 3.1,
      0,
      2.12 + ride,
      pickup ? 0.45 : -0.2,
      body,
    );
    if (pickup) {
      box(1.7, 0.05, 1.7, 0, 1.4, -1.5, dark);
      for (const x of [-0.95, 0.95]) box(0.18, 0.4, 1.8, x, 1.5, -1.5, body);
      box(1.9, 0.4, 0.14, 0, 1.5, -length / 2, body);
    } else
      for (const x of [-0.8, 0.8])
        box(0.09, 0.12, 2.8, x, 2.3 + ride, -0.2, dark);
    for (const x of [-0.74, 0.74]) {
      box(0.45, 0.28, 0.08, x, 1.25, length / 2 + 0.04, lamp);
      box(0.3, 0.45, 0.08, x, 1.2, -length / 2 - 0.04, tail);
    }
    box(0.9, 0.28, 0.08, 0, 1.18, length / 2 + 0.05, dark);
    for (const x of [-1.06, 1.06])
      for (const z of [-length * 0.31, length * 0.31]) wheel(x, z, 0.49);
    if (spec.spare) {
      const spare = new T.Mesh(
        new T.CylinderGeometry(0.46, 0.46, 0.25, 12),
        dark,
      );
      spare.rotation.x = Math.PI / 2;
      spare.position.set(0, 1.25, -length / 2 - 0.1);
      group.add(spare);
    }
  } else if (car) {
    const coupe = spec.kind === "coupe",
      hatch = spec.kind === "hatch";
    box(1.95, 0.65, length, 0, 0.83, 0, body);
    // Long hood at the front; cabin is offset toward the rear.
    box(1.72, 0.57, hatch ? 2.5 : 2, 0, 1.4, -0.35, glass);
    box(1.77, 0.12, hatch ? 1.9 : 1.4, 0, 1.75, coupe ? -0.45 : -0.35, body);
    box(1.83, 0.1, 0.9, 0, 1.18, length / 2 - 0.5, body);
    box(0.8, 0.22, 0.06, 0, 0.78, length / 2 + 0.04, dark);
    box(0.45, 0.16, 0.08, 0, 0.65, -length / 2 - 0.05, cream);
    for (const x of [-0.68, 0.68]) {
      box(0.43, 0.2, 0.08, x, 1, length / 2 + 0.05, lamp);
      if (spec.roundTail) {
        for (const dx of [-0.12, 0.12]) {
          const light = new T.Mesh(new T.SphereGeometry(0.12, 10, 8), tail);
          light.position.set(x + dx, 1, -length / 2 - 0.03);
          group.add(light);
        }
      } else box(0.5, 0.2, 0.08, x, 1, -length / 2 - 0.05, tail);
      box(0.12, 0.58, 1.8, x, 1.43, -0.35, body);
    }
    for (const x of [-1, 1])
      for (const z of [-length * 0.3, length * 0.3]) wheel(x, z);
    if (spec.spoiler) {
      for (const x of [-0.6, 0.6])
        box(0.1, 0.4, 0.12, x, 1.35, -length / 2 + 0.25, dark);
      box(1.95, 0.12, 0.38, 0, 1.6, -length / 2 + 0.25, body);
    }
  } else if (spec.scooter) {
    const classic = spec.scooter === "classic";
    wheel(0, -0.72, 0.31);
    wheel(0, 0.76, 0.31);
    box(0.64, 0.15, 1.25, 0, 0.47, 0, body);
    box(0.62, 0.22, 0.92, 0, 0.96, -0.34, dark);
    const rounded = (w, h, d, x, y, z, mat) => {
      const mesh = new T.Mesh(new T.SphereGeometry(1, 12, 8), mat);
      mesh.scale.set(w / 2, h / 2, d / 2);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      group.add(mesh);
    };
    rounded(classic ? 0.78 : 0.72, 0.72, 1.05, 0, 0.64, -0.49, body);
    rounded(classic ? 0.72 : 0.66, 0.92, 0.32, 0, 0.85, 0.5, body);
    box(0.12, 0.7, 0.12, 0, 1.05, 0.69, dark);
    box(0.96, 0.09, 0.12, 0, 1.34, 0.64, dark);
    rounded(0.34, 0.3, 0.18, 0, 1.32, 0.76, lamp);
    rounded(0.5, 0.22, 0.48, 0, 0.57, 0.76, body);
    box(0.3, 0.14, 0.08, 0, 0.77, -0.99, tail);
    box(0.28, 0.12, 0.06, 0, 0.58, -1, cream);
    if (classic)
      for (const x of [-0.36, 0.36])
        box(0.025, 0.055, 0.65, x, 0.68, -0.47, cream);
    else rounded(0.44, 0.55, 0.12, 0, 0.87, 0.68, cream);
    for (const x of [-0.47, 0.47]) {
      box(0.035, 0.3, 0.035, x, 1.48, 0.64, dark);
      rounded(0.18, 0.13, 0.06, x, 1.66, 0.66, cream);
    }
  } else {
    const rickshaw = spec.kind === "rickshaw",
      tuk = spec.kind === "tuktuk";
    if (tuk || rickshaw) {
      box(1.65, 0.35, 1.7, 0, 0.7, -0.75, body);
      box(1.5, 0.25, 1, 0, 1.05, -0.9, dark);
      box(1.5, 0.7, 0.18, 0, 1.35, -1.45, body);
      box(1.9, 0.16, 2, 0, 2.2, -0.65, rickshaw ? cream : body);
      for (const x of [-0.8, 0.8])
        for (const z of [-1.4, 0.1]) box(0.08, 1.3, 0.08, x, 1.5, z, cream);
      for (const x of [-0.92, 0.92]) wheel(x, -1, rickshaw ? 0.5 : 0.36);
      box(0.55, 0.2, 0.08, -0.5, 0.9, -1.64, tail);
      box(0.55, 0.2, 0.08, 0.5, 0.9, -1.64, tail);
    } else wheel(0, -0.8);
    const front = tuk || rickshaw ? 1.25 : 0.85;
    wheel(0, front, rickshaw ? 0.5 : 0.36);
    box(0.12, 0.9, 0.12, 0, 0.85, front, dark);
    box(0.95, 0.1, 0.13, 0, 1.3, front - 0.15, dark);
    box(0.5, 0.2, 0.65, 0, 1, rickshaw ? 0.3 : -0.15, dark);
    if (!rickshaw) box(0.55, 0.45, 0.65, 0, 0.85, 0.45, body);
    else {
      box(0.1, 0.1, 1.4, 0, 0.6, 0.45, body);
      box(0.65, 0.1, 0.12, 0, 0.5, 0.3, dark);
    }
    box(0.32, 0.25, 0.12, 0, 1.12, front + 0.1, lamp);
    if (!tuk && !rickshaw) box(0.32, 0.15, 0.1, 0, 0.85, -0.95, tail);
  }
  if (car) {
    const chrome = material(0xbac1bd);
    const tall = spec.kind === "suv" || spec.kind === "pickup";
    const sill = tall ? 1.44 : 1.12;
    // Sloping glass and body pillars give each cabin a readable front and rear.
    const windshield = box(
      tall ? 1.65 : 1.53,
      0.52,
      0.06,
      0,
      tall ? 1.94 : 1.43,
      tall ? 1.22 : 0.68,
      glass,
    );
    windshield.name = "sloped-windscreen";
    windshield.rotation.x = -0.32;
    for (const side of [-1, 1]) {
      box(0.18, 0.15, 0.34, side * 1.06, tall ? 1.83 : 1.4, 0.65, body).name =
        "side-mirror";
      box(
        0.025,
        0.035,
        length * 0.72,
        side * (tall ? 1.065 : 0.985),
        sill,
        -0.08,
        chrome,
      );
      for (const z of spec.kind === "coupe" ? [-0.25] : [-0.75, 0.4]) {
        box(
          0.035,
          0.055,
          0.22,
          side * (tall ? 1.065 : 0.985),
          sill - 0.16,
          z,
          chrome,
        );
      }
      box(
        0.08,
        0.52,
        0.09,
        side * (tall ? 0.92 : 0.85),
        tall ? 1.88 : 1.43,
        -0.35,
        body,
      );
    }
    box(1.5, 0.09, 0.1, 0, tall ? 0.84 : 0.55, length / 2 + 0.06, chrome);
    box(
      0.52,
      0.15,
      0.07,
      0,
      tall ? 1.05 : 0.72,
      length / 2 + 0.12,
      cream,
    ).name = "front-plate";
    box(0.13, 0.13, 0.3, 0.65, 0.45, -length / 2 - 0.1, dark);
    if (spec.kind === "coupe") {
      const hood = box(1.7, 0.08, 1.12, 0, 1.16, length / 2 - 0.65, body);
      hood.rotation.x = -0.06;
    }
  }
  if (spec.luxuryGrille) {
    const chrome = material(0xbfc4c3);
    box(1.13, 0.35, 0.07, 0, 0.91, length / 2 + 0.07, dark);
    for (const y of [0.79, 0.91, 1.03])
      box(1.1, 0.035, 0.08, 0, y, length / 2 + 0.11, chrome);
    const ring = new T.Mesh(new T.TorusGeometry(0.12, 0.02, 6, 16), chrome);
    ring.position.set(0, 0.91, length / 2 + 0.17);
    group.add(ring);
    for (let i = 0; i < 3; i++) {
      const spoke = box(0.025, 0.13, 0.025, 0, 0.91, length / 2 + 0.17, chrome);
      spoke.geometry.translate(0, 0.055, 0);
      spoke.rotation.z = (i * Math.PI * 2) / 3;
    }
    for (const x of [-0.99, 0.99])
      box(0.035, 0.045, length * 0.7, x, 1.15, 0, chrome);
  }
  group.userData.vehicleType = spec.id;
  group.userData.paintMaterial = body;
  return group;
}

export function repaintVehicle(model, paint) {
  model.userData.paintMaterial.color.setHex(
    paintColor(model.userData.vehicleType, paint),
  );
}
