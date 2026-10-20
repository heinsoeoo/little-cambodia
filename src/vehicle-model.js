import * as T from "three";
import { vehicleSpec } from "./vehicle-catalog.js";
// All models face local +Z, matching stepVehicle's forward movement.
export function vehicleModel(type) {
  const spec = vehicleSpec(type),
    group = new T.Group();
  const material = (color) => new T.MeshLambertMaterial({ color });
  const body = material(spec.color),
    dark = material(0x42474c),
    glass = material(0x668e9b),
    cream = material(0xf1dfbc);
  const lamp = new T.MeshBasicMaterial({ color: 0xfff2b6 }),
    tail = new T.MeshBasicMaterial({ color: 0xe46159 });
  function box(w, h, d, x, y, z, mat) {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
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
  const car = ["sedan", "coupe", "hatch"].includes(spec.kind),
    length = spec.length;
  if (car) {
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
  group.userData.vehicleType = spec.id;
  return group;
}
