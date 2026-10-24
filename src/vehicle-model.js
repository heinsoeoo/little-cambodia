import * as T from "three";
import {
  createVehicle as lumaVehicle,
  round,
  sphere,
  rod,
} from "./luma-models.js";
import { isolateMaterials } from "./character.js";
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

// Use the reference meshes directly, mapping the existing catalog to Luma Bay's
// sedan, coupe, SUV, pickup, motorbike, scooter, tuk-tuk and bicycle designs.
export function vehicleModel(type, paint = "factory") {
  const spec = vehicleSpec(type),
    car = ["sedan", "coupe", "hatch", "suv", "pickup"].includes(spec.kind);
  const reference = car
    ? spec.kind === "hatch"
      ? "sedan"
      : spec.kind
    : spec.kind === "tuktuk"
      ? "tuktuk"
      : spec.kind === "rickshaw"
        ? "bicycle"
        : ["vespa", "scoopy"].includes(spec.id)
          ? "scooter"
          : "moto";
  const color = paintColor(type, paint),
    group = lumaVehicle({ id: reference, color });
  isolateMaterials(group);
  const meshes = [];
  group.traverse((o) => {
    if (o.isMesh) meshes.push(o);
  });
  const body = meshes.find(
    (o) => o.material.color?.getHex() === color && o.material.metalness === 0.3,
  ).material;
  const dark = new T.MeshStandardMaterial({
    color: 0x263738,
    roughness: 0.45,
    metalness: 0.12,
  });
  const cream = new T.MeshStandardMaterial({
    color: 0xeee9d8,
    roughness: 0.65,
  });
  const headlamp = new T.MeshBasicMaterial({ color: 0xfff0c2 }),
    tailLamp = new T.MeshBasicMaterial({ color: 0xac5146 });
  for (const m of meshes) {
    if (m.material.color?.getHex() === 0xfff0c2) m.material = headlamp;
    if (m.material.color?.getHex() === 0xac5146) m.material = tailLamp;
  }
  const wheels = group.userData.wheels;
  for (const wheel of wheels) {
    const tire = wheel.children.find(
      (o) => o.geometry?.type === "TorusGeometry",
    );
    const outer =
      tire.geometry.parameters.radius + tire.geometry.parameters.tube;
    wheel.position.y = Math.max(wheel.position.y, outer);
    wheel.userData.wheel = {
      x: wheel.position.x,
      z: wheel.position.z,
      r: wheel.position.y,
    };
    tire.userData.wheel = wheel.userData.wheel;
    tire.name = "tire";
  }
  if (car) {
    const length =
      reference === "pickup" ? 4.7 : reference === "coupe" ? 4.25 : 4.35;
    meshes[0].name = "sculpted-body";
    const cabin = meshes.find((o) => o.material.color?.getHex() === 0x40656e);
    cabin.name = "shaped-cabin-glass";
    group.userData.design = {
      roof: reference === "suv" ? 2.2 : 1.9,
      cabinFront: reference === "coupe" ? 0.9 : 1.1,
      front: length / 2,
      rear: -length / 2,
    };
    if (spec.roundTail)
      for (const side of [-1, 1])
        for (const dx of [-0.1, 0.1])
          sphere(
            group,
            side * 0.6 + dx,
            0.8,
            -length / 2 - 0.045,
            0.075,
            0.075,
            0.035,
            tailLamp,
          ).name = "round-tail-lamp";
    if (spec.spoiler)
      round(group, 1.65, 0.08, 0.28, 0, 1.18, -length / 2 + 0.2, body).name =
        "rear-spoiler";
  } else {
    // The source motorbike uses an ivory headlight. Give it its own material so
    // night lighting does not recolor seats/canopies that share source ivory.
    const lens = meshes.find(
      (o) => o.material.color?.getHex() === 0xeee9d8 && o.position.z > 0.6,
    );
    if (lens) lens.material = headlamp;
    round(group, 0.22, 0.1, 0.05, 0, 0.75, -0.93, tailLamp).name = "rear-lamp";
    if (spec.id === "vespa") {
      if (lens) {
        lens.position.y = 1.16;
        lens.name = "vespa-high-round-lamp";
      }
      group.userData.silhouette = "classic-steel-scooter";
    } else if (spec.id === "scoopy") {
      if (lens) {
        lens.position.set(0, 0.83, 0.56);
        lens.scale.set(0.15, 0.12, 0.06);
        lens.name = "scoopy-body-mounted-headlamp";
      }
      round(group, 0.4, 0.08, 0.25, 0, 1.1, -0.5, dark).name = "scoopy-pillion";
      group.userData.silhouette = "modern-step-through-scooter";
    } else if (spec.kind === "tuktuk") {
      const screen = meshes.find(
        (o) => o.material.color?.getHex() === 0x40656e,
      );
      screen.name = "tuktuk-windscreen";
      group.userData.silhouette = "luma-tuktuk";
    } else if (spec.kind === "rickshaw") {
      const rear = wheels.find((w) => w.position.z < 0);
      rear.position.x = -0.7;
      rear.userData.wheel.x = -0.7;
      const second = rear.clone();
      second.position.x = 0.7;
      second.userData.wheel = { ...rear.userData.wheel, x: 0.7 };
      group.add(second);
      wheels.push(second);
      round(group, 1.4, 0.18, 0.65, 0, 0.9, -0.72, dark).name =
        "passenger-seat";
      round(group, 1.4, 0.5, 0.12, 0, 1.12, -1.03, dark);
      round(group, 1.6, 0.1, 1.4, 0, 1.95, -0.75, cream).name =
        "rickshaw-fabric-shade";
      for (const x of [-0.68, 0.68])
        rod(group, [x, 0.6, -1.1], [x, 1.95, -1.1], 0.025, dark);
      rod(group, [-0.22, 0.5, 0.1], [0.22, 0.5, 0.1], 0.02, dark).name =
        "pedal-crank";
      group.userData.silhouette = "open-pedal-rickshaw";
    } else if (spec.id === "offroad-moto") {
      for (const wheel of wheels)
        for (let i = 0; i < 14; i++) {
          const a = (i * Math.PI * 2) / 14;
          const tread = round(
            wheel,
            0.15,
            0.065,
            0.08,
            0,
            Math.cos(a) * 0.34,
            Math.sin(a) * 0.34,
            dark,
          );
          tread.rotation.x = a;
          tread.name = "knobby-tread";
        }
      group.userData.silhouette = "tall-knobby-offroad";
    } else if (spec.id === "racing-moto") {
      round(group, 0.58, 0.4, 0.55, 0, 0.78, 0.35, body, 0.12).name =
        "racing-full-fairing";
      group.userData.silhouette = "low-faired-sportbike";
    }
  }
  group.add(contactShadow(car ? 2.8 : 1.8, spec.length * 1.18));
  for (const wheel of wheels) {
    if (spec.id === "offroad-moto")
      wheel.position.y = Math.max(wheel.position.y, 0.38);
    delete wheel.userData.wheel;
    wheel.traverse((o) => {
      if (o.geometry && o.name === "tire")
        o.userData.wheel = {
          x: wheel.position.x,
          z: wheel.position.z,
          r: wheel.position.y,
        };
    });
  }
  group.userData.nativeWheels = wheels;
  group.userData.artStyle = "luma-bay-source";
  group.userData.vehicleType = spec.id;
  group.userData.paintMaterial = body;
  addVehicleLighting(group, spec, headlamp, tailLamp);
  return group;
}
export function repaintVehicle(model, paint) {
  model.userData.paintMaterial.color.setHex(
    paintColor(model.userData.vehicleType, paint),
  );
}
