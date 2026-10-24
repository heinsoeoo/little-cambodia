import { softMaterial, roundedGeometry } from "./art-direction.js";
import * as T from "three";
import { buildSmallVehicle } from "./bike-design.js";
import { buildCarDesign } from "./car-design.js";
import { addVehicleLighting } from "./vehicle-lighting.js";
import { vehicleSpec, paintColor } from "./vehicle-catalog.js";
let contactTexture;
function contactShadow(width, length) {
  if (!contactTexture) {
    const size = 32,
      pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4,
          radius = Math.hypot((x - 15.5) / 15.5, (y - 15.5) / 15.5);
        pixels[i] = 33;
        pixels[i + 1] = 52;
        pixels[i + 2] = 43;
        pixels[i + 3] = Math.round(Math.max(0, 1 - radius) ** 2 * 85);
      }
    contactTexture = new T.DataTexture(pixels, size, size);
    contactTexture.needsUpdate = true;
  }
  const mesh = new T.Mesh(
    new T.PlaneGeometry(width, length),
    new T.MeshBasicMaterial({
      map: contactTexture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
  );
  mesh.name = "soft-contact-shadow";
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.015;
  return mesh;
}
// All models face local +Z, matching stepVehicle's forward movement.
export function vehicleModel(type, paint = "factory") {
  const spec = vehicleSpec(type),
    group = new T.Group();
  const material = (color) =>
    new T.MeshStandardMaterial({ roughness: 0.55, metalness: 0.12, color });
  const body = softMaterial(paintColor(type, paint), {
      roughness: 0.32,
      metalness: 0.12,
    }),
    dark = material(0x42474c),
    glass = softMaterial(0x36565b, { roughness: 0.18, metalness: 0.35 }),
    cream = material(0xf1dfbc);
  const lamp = new T.MeshBasicMaterial({ color: 0xfff2b6 }),
    tail = new T.MeshBasicMaterial({ color: 0xe46159 });
  function box(w, h, d, x, y, z, mat) {
    let geometry = roundedGeometry(w, h, d, 0.08);
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
  const car = ["sedan", "coupe", "hatch", "suv", "pickup"].includes(spec.kind),
    length = spec.length;
  if (car) {
    buildCarDesign(group, spec, { body, dark, glass, cream, lamp, tail });
  } else {
    buildSmallVehicle(group, spec, { body, dark, glass, cream, lamp, tail });
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
  group.add(
    contactShadow(
      car ? 2.8 : spec.kind === "bike" ? 1.5 : 2.4,
      spec.length * 1.18,
    ),
  );
  group.userData.artStyle = "soft-modern";
  addVehicleLighting(group, spec, lamp, tail);
  group.userData.vehicleType = spec.id;
  group.userData.paintMaterial = body;
  return group;
}

export function repaintVehicle(model, paint) {
  model.userData.paintMaterial.color.setHex(
    paintColor(model.userData.vehicleType, paint),
  );
}
