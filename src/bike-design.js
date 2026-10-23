import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export function buildSmallVehicle(
  group,
  spec,
  { body, dark, glass, cream, lamp, tail },
) {
  const chrome = new T.MeshLambertMaterial({ color: 0xaeb9b5 });
  const tire = new T.MeshLambertMaterial({ color: 0x242a2a });
  const saddle = new T.MeshLambertMaterial({
    color: spec.id === "vespa" ? 0x886047 : 0x383c3d,
  });
  function mesh(geometry, material, x, y, z, name = "") {
    const object = new T.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = object.receiveShadow = true;
    object.name = name;
    group.add(object);
    return object;
  }
  function box(w, h, d, x, y, z, material, name = "") {
    return mesh(new T.BoxGeometry(w, h, d), material, x, y, z, name);
  }
  function oval(w, h, d, x, y, z, material, name = "") {
    const object = mesh(
      new T.SphereGeometry(1, 16, 10),
      material,
      x,
      y,
      z,
      name,
    );
    object.scale.set(w / 2, h / 2, d / 2);
    return object;
  }
  function rod(a, b, r, material, name = "") {
    const start = new T.Vector3(...a),
      end = new T.Vector3(...b);
    const object = mesh(
      new T.CylinderGeometry(r, r, start.distanceTo(end), 8),
      material,
      0,
      0,
      0,
      name,
    );
    object.position.copy(start).add(end).multiplyScalar(0.5);
    object.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      end.sub(start).normalize(),
    );
    return object;
  }
  function wheel(x, z, r = 0.33, wide = 0.17, spokes = false, knobby = false) {
    const start = group.children.length;
    const object = mesh(
      new T.CylinderGeometry(r, r, wide, 16),
      tire,
      x,
      r,
      z,
      "tire",
    );
    object.rotation.z = Math.PI / 2;
    const rim = mesh(
      new T.CylinderGeometry(r * 0.69, r * 0.69, wide + 0.012, 12),
      chrome,
      x,
      r,
      z,
      "wheel-rim",
    );
    rim.rotation.z = Math.PI / 2;
    const hub = mesh(
      new T.CylinderGeometry(
        r * (spokes ? 0.14 : 0.32),
        r * (spokes ? 0.14 : 0.32),
        wide + 0.04,
        10,
      ),
      dark,
      x,
      r,
      z,
    );
    hub.rotation.z = Math.PI / 2;
    if (spokes)
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 8;
        rod(
          [x, r + Math.cos(a) * r * 0.63, z + Math.sin(a) * r * 0.63],
          [x, r - Math.cos(a) * r * 0.63, z - Math.sin(a) * r * 0.63],
          0.009,
          dark,
          "wheel-spoke",
        );
      }
    if (knobby) {
      const parts = [];
      for (let i = 0; i < 14; i++) {
        const a = (i * Math.PI * 2) / 14;
        const g = new T.BoxGeometry(wide + 0.025, 0.055, 0.085);
        g.rotateX(-a);
        g.translate(x, r + Math.cos(a) * r, z + Math.sin(a) * r);
        parts.push(g);
      }
      const g = mergeGeometries(parts);
      parts.forEach((part) => part.dispose());
      mesh(g, tire, 0, 0, 0, "knobby-tread");
    }
    for (const part of group.children.slice(start))
      part.userData.wheel = { x, z, r };
  }
  if (spec.kind === "tuktuk") {
    // Enclosed auto-rickshaw: motorised front cowl and curved black canopy.
    wheel(-0.79, -0.91, 0.34, 0.2);
    wheel(0.79, -0.91, 0.34, 0.2);
    wheel(0, 1.12, 0.36, 0.23);
    box(1.6, 0.22, 2.68, 0, 0.58, -0.12, body, "tuktuk-floor");
    box(1.57, 0.72, 0.14, 0, 1.02, -1.43, body, "rear-body");
    for (const side of [-1, 1]) {
      box(
        0.12,
        0.5,
        1.15,
        side * 0.75,
        0.92,
        -0.84,
        body,
        "passenger-side-panel",
      );
      rod(
        [side * 0.74, 0.78, -1.39],
        [side * 0.7, 2.01, -1.31],
        0.055,
        dark,
        "canopy-post",
      );
      rod([side * 0.7, 2.01, -1.31], [side * 0.7, 2.01, 0.63], 0.05, dark);
      rod(
        [side * 0.7, 2.01, 0.63],
        [side * 0.69, 1.38, 0.97],
        0.06,
        body,
        "windscreen-pillar",
      );
      rod([side * 0.69, 1.38, 0.97], [side * 0.76, 0.7, 0.93], 0.06, body);
      box(0.25, 0.035, 0.42, side * 0.92, 1.3, 0.85, dark, "mirror");
      box(0.08, 0.1, 0.17, side * 0.64, 1.25, 1.005, cream, "indicator");
      const lens = mesh(
        new T.CylinderGeometry(0.145, 0.145, 0.055, 16),
        lamp,
        side * 0.47,
        1.02,
        1.07,
        "round-headlamp",
      );
      lens.rotation.x = Math.PI / 2;
      box(0.22, 0.12, 0.08, side * 0.58, 0.88, -1.54, tail, "tail-lamp");
    }
    const roof = oval(
      1.77,
      0.45,
      2.33,
      0,
      2.04,
      -0.35,
      dark,
      "tuktuk-curved-canopy",
    );
    roof.scale.y *= 0.7;
    box(1.53, 0.16, 1.96, 0, 1.97, -0.4, dark);
    const screen = box(
      1.29,
      0.59,
      0.045,
      0,
      1.67,
      0.79,
      glass,
      "tuktuk-windscreen",
    );
    screen.rotation.x = 0.26;
    rod([0, 1.36, 0.99], [0.31, 1.66, 0.91], 0.015, dark, "windscreen-wiper");
    oval(1.48, 0.63, 0.42, 0, 1.06, 0.88, body, "enclosed-front-cowl");
    oval(0.66, 0.65, 0.18, 0, 0.96, 1.11, dark, "front-grille");
    box(0.44, 0.12, 0.055, 0, 1.3, 1.09, cream, "front-plate");
    oval(0.43, 0.3, 0.65, 0, 0.66, 1.12, body, "front-mudguard");
    box(1.3, 0.18, 0.66, 0, 0.95, -0.91, saddle, "passenger-seat");
    box(1.3, 0.45, 0.12, 0, 1.2, -1.25, saddle);
    box(0.58, 0.14, 0.48, 0, 1.02, 0.24, saddle, "driver-seat");
    rod([0, 0.91, 0.65], [0, 1.26, 0.57], 0.04, dark);
    rod([-0.35, 1.26, 0.57], [0.35, 1.26, 0.57], 0.035, dark);
    group.userData.silhouette = "enclosed-tuktuk";
    return;
  }
  if (spec.kind === "rickshaw") {
    // A pedal tricycle with open bicycle frame, thin spoked wheels and fabric shade.
    wheel(-0.82, -1, 0.5, 0.09, true);
    wheel(0.82, -1, 0.5, 0.09, true);
    wheel(0, 1.17, 0.5, 0.09, true);
    for (const side of [-1, 1]) {
      rod([side * 0.72, 0.55, -1.5], [side * 0.72, 0.55, -0.25], 0.035, body);
      rod([side * 0.72, 0.55, -1.5], [side * 0.72, 2.04, -1.45], 0.03, chrome);
      rod([side * 0.72, 2.04, -1.45], [side * 0.72, 2.04, -0.2], 0.025, chrome);
    }
    box(1.45, 0.12, 1.15, 0, 0.65, -0.95, body, "passenger-platform");
    box(1.29, 0.18, 0.63, 0, 0.92, -1.02, saddle);
    box(1.29, 0.5, 0.1, 0, 1.2, -1.42, saddle);
    box(1.6, 0.09, 1.5, 0, 2.08, -0.85, cream, "rickshaw-fabric-shade");
    for (const [a, b] of [
      [
        [0, 0.6, -0.3],
        [0, 0.95, 0.52],
      ],
      [
        [0, 0.95, 0.52],
        [0, 0.55, 0.15],
      ],
      [
        [0, 0.55, 0.15],
        [0, 0.6, -0.3],
      ],
      [
        [0, 0.95, 0.52],
        [0, 0.85, 1.17],
      ],
      [
        [0, 0.85, 1.17],
        [0, 0.55, 0.15],
      ],
    ])
      rod(a, b, 0.028, body, "bicycle-frame");
    rod([0, 0.5, 1.17], [0, 1.22, 1.02], 0.025, chrome, "bicycle-fork");
    rod(
      [-0.38, 1.22, 1.02],
      [0.38, 1.22, 1.02],
      0.022,
      chrome,
      "bicycle-handlebar",
    );
    box(0.3, 0.08, 0.36, 0, 1.04, 0.38, saddle, "bicycle-saddle");
    rod([0, 0.6, 0.15], [0, 1.02, 0.38], 0.025, body);
    rod([-0.24, 0.53, 0.13], [0.24, 0.53, 0.13], 0.02, chrome, "pedal-crank");
    for (const side of [-1, 1])
      box(0.14, 0.035, 0.14, side * 0.25, 0.53, 0.13, dark, "pedal");
    oval(0.15, 0.15, 0.1, 0, 1.1, 1.2, lamp);
    box(0.25, 0.09, 0.05, 0, 0.88, -1.52, tail);
    group.userData.silhouette = "open-pedal-rickshaw";
    return;
  }
  const classic = spec.id === "vespa",
    scoopy = spec.id === "scoopy";
  const offroad = spec.id === "offroad-moto",
    racing = spec.id === "racing-moto";
  const r = offroad ? 0.44 : classic || scoopy ? 0.31 : 0.36;
  const front = offroad ? 1.03 : racing ? 0.95 : 0.79,
    rear = offroad ? -0.92 : racing ? -0.9 : -0.73;
  wheel(0, rear, r, racing ? 0.29 : 0.18, offroad, offroad);
  wheel(0, front, r, racing ? 0.23 : 0.16, offroad, offroad);
  if (classic || scoopy) {
    box(0.55, 0.1, 1.15, 0, 0.43, -0.02, dark, "step-through-floor");
    if (classic) {
      oval(0.79, 0.65, 1.05, 0, 0.65, -0.5, body, "vespa-rear-haunch");
      oval(0.76, 0.98, 0.22, 0, 0.87, 0.4, body, "vespa-broad-leg-shield");
      oval(0.57, 0.19, 0.55, 0, 0.52, front, body, "vespa-rounded-fender");
      box(0.57, 0.17, 0.89, 0, 0.99, -0.28, saddle, "vespa-brown-bench-seat");
      for (const side of [-1, 1])
        for (const y of [0.63, 0.71])
          box(
            0.015,
            0.018,
            0.56,
            side * 0.38,
            y,
            -0.48,
            chrome,
            "vespa-chrome-side-trim",
          );
      rod([0, 0.7, 0.68], [0, 1.39, 0.61], 0.05, body);
      oval(0.4, 0.29, 0.22, 0, 1.4, 0.64, body, "vespa-handlebar-lamp-housing");
      oval(0.26, 0.24, 0.06, 0, 1.4, 0.77, lamp, "vespa-high-round-lamp");
      group.userData.silhouette = "classic-steel-scooter";
    } else {
      oval(0.7, 0.64, 1.06, 0, 0.7, -0.39, body, "scoopy-sculpted-tail");
      oval(0.56, 0.8, 0.36, 0, 0.81, 0.5, body, "scoopy-narrow-front-apron");
      oval(
        0.43,
        0.35,
        0.05,
        0,
        1.02,
        0.71,
        cream,
        "scoopy-low-oval-lamp-bezel",
      );
      oval(
        0.29,
        0.26,
        0.045,
        0,
        1.02,
        0.745,
        lamp,
        "scoopy-body-mounted-headlamp",
      );
      oval(0.51, 0.16, 0.56, 0, 0.49, front, body, "scoopy-short-fender");
      oval(0.57, 0.22, 1, 0, 1, -0.32, saddle, "scoopy-stepped-seat");
      oval(0.53, 0.13, 0.45, 0, 1.12, -0.6, saddle, "scoopy-raised-pillion");
      rod([0, 0.7, 0.57], [0, 1.31, 0.55], 0.04, body);
      oval(0.65, 0.19, 0.25, 0, 1.32, 0.52, body, "scoopy-handlebar-cover");
      group.userData.silhouette = "modern-step-through-scooter";
    }
    for (const side of [-1, 1]) {
      rod(
        [side * 0.08, 0.72, front],
        [side * 0.08, 0.35, front],
        0.025,
        chrome,
      );
      rod([side * 0.14, 1.36, 0.6], [side * 0.45, 1.36, 0.57], 0.025, dark);
      rod([side * 0.43, 1.36, 0.57], [side * 0.47, 1.62, 0.56], 0.015, chrome);
      oval(0.17, 0.12, 0.05, side * 0.47, 1.64, 0.56, chrome, "mirror");
    }
    box(0.26, 0.1, 0.06, 0, 0.77, -1, tail, "rear-lamp");
    box(0.23, 0.1, 0.035, 0, 0.58, -1.015, cream);
  } else {
    const seatY = offroad ? 1.2 : 1.04;
    rod([0, 0.55, rear], [0, 0.62, 0.32], 0.055, dark, "swing-arm");
    for (const side of [-1, 1]) {
      rod(
        [side * 0.08, 0.4, front],
        [side * 0.1, offroad ? 1.28 : 1.13, front - 0.18],
        0.035,
        chrome,
        "front-suspension",
      );
      rod(
        [side * 0.1, 0.55, -0.65],
        [side * 0.2, seatY, -0.28],
        0.035,
        offroad ? body : dark,
        "frame",
      );
    }
    oval(
      offroad ? 0.4 : racing ? 0.67 : 0.57,
      0.42,
      offroad ? 0.74 : 0.82,
      0,
      offroad ? 1.04 : 1,
      0.18,
      body,
      "fuel-tank",
    );
    box(
      offroad ? 0.34 : 0.48,
      0.12,
      offroad ? 1.05 : 0.76,
      0,
      seatY,
      -0.28,
      saddle,
      "rider-seat",
    );
    oval(0.42, 0.36, 0.55, 0, 0.63, 0, dark, "engine");
    if (offroad) {
      const fender = box(
        0.3,
        0.07,
        0.75,
        0,
        1.04,
        front,
        body,
        "high-offroad-fender",
      );
      fender.rotation.x = 0.09;
      box(0.32, 0.08, 0.5, 0, 1.2, -0.76, body, "offroad-tail-fender");
      box(0.4, 0.35, 0.065, 0, 1.23, 0.78, cream, "offroad-number-board");
      box(0.18, 0.09, 0.04, 0, 1.15, 0.825, lamp);
      for (const side of [-1, 1])
        box(0.1, 0.11, 0.24, side * 0.43, 1.39, 0.65, body, "hand-guard");
      group.userData.silhouette = "tall-knobby-offroad";
    } else if (racing) {
      oval(0.7, 0.79, 0.95, 0, 0.84, 0.55, body, "racing-full-fairing");
      const screen = oval(
        0.46,
        0.46,
        0.11,
        0,
        1.36,
        0.61,
        glass,
        "racing-windscreen",
      );
      screen.rotation.x = -0.45;
      for (const side of [-1, 1]) {
        const lens = box(
          0.22,
          0.07,
          0.045,
          side * 0.19,
          1.1,
          0.99,
          lamp,
          "racing-twin-headlamp",
        );
        lens.rotation.z = side * 0.19;
        box(0.025, 0.23, 0.42, side * 0.34, 0.82, 0.47, dark, "fairing-vent");
      }
      oval(0.4, 0.2, 0.62, 0, 1.17, -0.71, body, "raised-race-tail");
      group.userData.silhouette = "low-faired-sportbike";
    } else {
      oval(0.37, 0.2, 0.1, 0, 1.16, 0.91, lamp, "round-road-headlamp");
      oval(0.47, 0.14, 0.48, 0, 0.64, front, body, "front-fender");
      group.userData.silhouette = "standard-road-motorcycle";
    }
    rod(
      [-0.4, offroad ? 1.4 : 1.24, 0.65],
      [0.4, offroad ? 1.4 : 1.24, 0.65],
      0.028,
      dark,
      "handlebar",
    );
    const exhaust = mesh(
      new T.CylinderGeometry(0.07, 0.08, 0.57, 12),
      chrome,
      0.25,
      0.62,
      -0.6,
      "exhaust",
    );
    exhaust.rotation.x = Math.PI / 2;
    box(0.25, 0.09, 0.05, 0, seatY - 0.08, -1.04, tail, "rear-lamp");
  }
}
