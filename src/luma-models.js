// Ported directly from the user-owned Luma Bay prototype. Geometry and proportions
// are preserved; adapters in character.js and vehicle-model.js connect game state.
import * as T from "three";
const cache = new Map();
export function mat(color, metal = 0, rough = 0.65) {
  let key = color + "|" + metal + "|" + rough;
  if (!cache.has(key))
    cache.set(
      key,
      new T.MeshStandardMaterial({ color, metalness: metal, roughness: rough }),
    );
  return cache.get(key);
}
export function mesh(g, material, x = 0, y = 0, z = 0, parent) {
  let o = new T.Mesh(
    g,
    typeof material === "number" || typeof material === "string"
      ? mat(material)
      : material,
  );
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  parent?.add(o);
  return o;
}
export function box(parent, w, h, d, x, y, z, color) {
  return mesh(new T.BoxGeometry(w, h, d), color, x, y, z, parent);
}
export function round(parent, w, h, d, x, y, z, color, r = 0.08) {
  r = Math.min(r, w / 3, h / 3, d / 3);
  let s = new T.Shape(),
    a = -w / 2,
    b = -h / 2;
  s.moveTo(a + r, b);
  s.lineTo(a + w - r, b);
  s.quadraticCurveTo(a + w, b, a + w, b + r);
  s.lineTo(a + w, b + h - r);
  s.quadraticCurveTo(a + w, b + h, a + w - r, b + h);
  s.lineTo(a + r, b + h);
  s.quadraticCurveTo(a, b + h, a, b + h - r);
  s.lineTo(a, b + r);
  s.quadraticCurveTo(a, b, a + r, b);
  let g = new T.ExtrudeGeometry(s, {
    depth: d - r * 2,
    bevelEnabled: true,
    bevelSize: r * 0.45,
    bevelThickness: r,
    bevelSegments: 3,
    steps: 1,
    curveSegments: 5,
  });
  g.center();
  return mesh(g, color, x, y, z, parent);
}
export function sphere(parent, x, y, z, sx, sy, sz, color) {
  let o = mesh(new T.SphereGeometry(1, 20, 14), color, x, y, z, parent);
  o.scale.set(sx, sy, sz);
  return o;
}
export function cylinder(parent, r1, r2, h, x, y, z, color, segments = 20) {
  return mesh(
    new T.CylinderGeometry(r1, r2, h, segments),
    color,
    x,
    y,
    z,
    parent,
  );
}
export function rod(parent, a, b, r, color) {
  let av = new T.Vector3(...a),
    bv = new T.Vector3(...b),
    o = cylinder(parent, r, r, av.distanceTo(bv), 0, 0, 0, color, 12);
  o.position.copy(av).add(bv).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(
    new T.Vector3(0, 1, 0),
    bv.sub(av).normalize(),
  );
  return o;
}
export function textSign(
  parent,
  text,
  w,
  h,
  x,
  y,
  z,
  bg = "#f4e8d0",
  fg = "#324b44",
) {
  if (typeof document === "undefined")
    return mesh(new T.PlaneGeometry(w, h), mat(bg), x, y, z, parent);
  let c = document.createElement("canvas");
  if (!c.getContext)
    return mesh(new T.PlaneGeometry(w, h), mat(bg), x, y, z, parent);
  c.width = 512;
  c.height = 128;
  let cx = c.getContext("2d");
  cx.fillStyle = bg;
  cx.fillRect(0, 0, 512, 128);
  cx.font = "600 48px sans-serif";
  cx.textAlign = "center";
  cx.textBaseline = "middle";
  cx.fillStyle = fg;
  cx.fillText(text, 256, 67, 475);
  let tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  tex.userData.lumaOwned = true;
  return mesh(
    new T.PlaneGeometry(w, h),
    new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide }),
    x,
    y,
    z,
    parent,
  );
}
export const VEHICLES = [
  {
    id: "sedan",
    name: "Solstice Sedan",
    kind: "CITY CLASSIC",
    icon: "🚘",
    color: "#ca714f",
    speed: 25,
  },
  {
    id: "coupe",
    name: "Comet GT",
    kind: "SPORT COUPE",
    icon: "🏎",
    color: "#d4ab56",
    speed: 36,
  },
  {
    id: "suv",
    name: "Terrain Explorer",
    kind: "EVERYDAY SUV",
    icon: "🚙",
    color: "#647a66",
    speed: 23,
  },
  {
    id: "pickup",
    name: "Ranger Pickup",
    kind: "UTILITY",
    icon: "🛻",
    color: "#d4c8a6",
    speed: 24,
  },
  {
    id: "moto",
    name: "Nomad 400",
    kind: "MOTORCYCLE",
    icon: "🏍",
    color: "#354f58",
    speed: 31,
  },
  {
    id: "scooter",
    name: "Sunday Scooter",
    kind: "SCOOTER",
    icon: "🛵",
    color: "#8db7a2",
    speed: 18,
  },
  {
    id: "tuktuk",
    name: "Breezy Tuk-tuk",
    kind: "THREE WHEELER",
    icon: "🛺",
    color: "#d19354",
    speed: 19,
  },
  {
    id: "bicycle",
    name: "Coastline Cycle",
    kind: "BICYCLE",
    icon: "🚲",
    color: "#b27b61",
    speed: 11,
  },
  {
    id: "bus",
    name: "Bayline Shuttle",
    kind: "CITY BUS",
    icon: "🚌",
    color: "#c6b36e",
    speed: 20,
  },
];
export function createVehicle(spec) {
  let root = new T.Group(),
    wheels = [],
    paint = mat(spec.color, 0.3, 0.3),
    dark = mat("#263738", 0.12, 0.45),
    glass = mat("#40656e", 0.5, 0.15),
    chrome = mat("#cfdbd0", 0.75, 0.25),
    rubber = mat("#303a36", 0, 0.9),
    ivory = mat("#eee9d8");
  root.userData.spec = spec;
  let bike = ["moto", "scooter", "bicycle"].includes(spec.id);
  const wheel = (x, y, z, r = 0.36, wide = 0.22) => {
    let group = new T.Group();
    group.position.set(x, y, z);
    root.add(group);
    let tire = mesh(new T.TorusGeometry(r - 0.065, 0.08, 10, 28), rubber);
    tire.rotation.y = Math.PI / 2;
    group.add(tire);
    let rim = cylinder(group, r * 0.67, r * 0.67, wide, 0, 0, 0, chrome);
    rim.rotation.z = Math.PI / 2;
    if (bike) {
      rim.visible = false;
      for (let a = 0; a < 8; a++) {
        let angle = (a * Math.PI) / 4;
        rod(
          group,
          [0, 0, 0],
          [0, Math.cos(angle) * r * 0.8, Math.sin(angle) * r * 0.8],
          0.012,
          chrome,
        );
      }
    } else {
      let hub = cylinder(group, 0.12, 0.12, wide + 0.04, 0, 0, 0, dark);
      hub.rotation.z = Math.PI / 2;
      for (let a = 0; a < 5; a++) {
        let angle = a * Math.PI * 0.4;
        rod(
          group,
          [wide / 2 + 0.02, 0, 0],
          [
            wide / 2 + 0.02,
            Math.cos(angle) * r * 0.55,
            Math.sin(angle) * r * 0.55,
          ],
          0.025,
          dark,
        );
      }
    }
    wheels.push(group);
    return group;
  };
  if (bike) {
    let r = spec.id === "bicycle" ? 0.38 : 0.32;
    wheel(0, r, 0.75, r, 0.11);
    wheel(0, r, -0.75, r, 0.11);
    rod(root, [0, 0.4, -0.75], [0, 0.65, 0], 0.055, paint);
    rod(root, [0, 0.65, 0], [0, 0.45, 0.75], 0.055, paint);
    rod(root, [0, 0.45, 0.75], [0, 1.05, 0.53], 0.055, chrome);
    rod(root, [-0.28, 1.08, 0.55], [0.28, 1.08, 0.55], 0.035, dark);
    rod(root, [0, 0.67, 0], [0, 1, -0.3], 0.045, paint);
    round(root, 0.4, 0.12, 0.55, 0, 1.03, -0.3, dark);
    if (spec.id !== "bicycle") {
      sphere(root, 0, 0.83, 0.04, 0.28, 0.23, 0.43, paint);
      round(root, 0.35, 0.28, 0.45, 0, 0.48, -0.1, dark);
      sphere(root, 0, 1.05, 0.64, 0.13, 0.13, 0.08, ivory);
      rod(root, [0.2, 0.35, -0.25], [0.2, 0.35, -0.85], 0.07, chrome);
    }
    if (spec.id === "scooter") {
      round(root, 0.55, 0.7, 0.2, 0, 0.72, 0.4, paint, 0.15);
      round(root, 0.55, 0.15, 1, 0, 0.4, 0, paint);
      sphere(root, 0, 0.65, -0.55, 0.33, 0.23, 0.4, paint);
    }
    root.userData.seat = { x: 0, y: 0.53, z: -0.22 };
  } else if (spec.id === "tuktuk") {
    wheel(0, 0.32, 1.1, 0.32);
    wheel(-0.69, 0.32, -0.85, 0.32);
    wheel(0.69, 0.32, -0.85, 0.32);
    round(root, 1.5, 0.35, 2.5, 0, 0.52, -0.1, paint);
    round(root, 1.45, 0.7, 0.65, 0, 0.9, -0.7, dark);
    round(root, 1.55, 0.15, 1.8, 0, 1.8, -0.3, ivory);
    for (let x of [-0.68, 0.68])
      for (let z of [-1.05, 0.45])
        rod(root, [x, 0.65, z], [x, 1.8, z], 0.035, chrome);
    round(root, 1.1, 0.55, 0.18, 0, 1.15, 0.8, paint);
    box(root, 0.9, 0.4, 0.04, 0, 1.6, 0.48, glass);
    round(root, 0.5, 0.15, 0.5, 0, 0.87, 0.35, dark);
    sphere(root, 0, 1.05, 0.94, 0.16, 0.12, 0.06, ivory);
    root.userData.seat = { x: 0, y: 0.05, z: 0.32 };
  } else {
    let bus = spec.id === "bus",
      suv = spec.id === "suv",
      pickup = spec.id === "pickup",
      coupe = spec.id === "coupe",
      length = bus ? 7 : pickup ? 4.7 : coupe ? 4.25 : 4.35,
      width = bus ? 2.25 : 1.85,
      height = suv ? 1.05 : 0.74;
    round(root, width, 0.6, length, 0, 0.65, 0, paint, 0.17);
    round(root, width + 0.02, 0.18, length - 0.15, 0, 0.4, 0, dark);
    if (bus) {
      round(root, 2.13, 1.8, 6.7, 0, 1.72, -0.06, paint, 0.15);
      round(root, 2, 0.66, 0.07, 0, 2.03, 3.32, glass);
      for (let side of [-1, 1])
        for (let i = 0; i < 6; i++) {
          box(
            root,
            0.035,
            0.66,
            0.71,
            side * 1.075,
            2.05,
            2.4 - i * 0.93,
            glass,
          );
          box(
            root,
            0.045,
            0.045,
            0.78,
            side * 1.1,
            1.6,
            2.4 - i * 0.93,
            chrome,
          );
        }
      round(root, 2.15, 0.12, 6.6, 0, 2.67, 0, ivory);
      textSign(
        root,
        "BAYLINE  •  01",
        1.7,
        0.25,
        0,
        2.52,
        3.36,
        "#283d3c",
        "#f0dba3",
      );
    } else {
      let cabinZ = pickup ? 0.53 : -0.15,
        cabinLength = pickup ? 1.85 : 2.45;
      round(
        root,
        width - 0.3,
        height,
        cabinLength,
        0,
        1.12 + height * 0.25,
        cabinZ,
        glass,
        0.22,
      );
      round(
        root,
        width - 0.34,
        0.12,
        cabinLength - 0.4,
        0,
        1.15 + height * 0.75,
        cabinZ - 0.05,
        paint,
        0.13,
      );
      box(root, 0.08, height - 0.08, 0.1, 0, 1.3, cabinZ + 0.95, paint);
      for (let side of [-1, 1]) {
        box(
          root,
          0.06,
          height * 0.65,
          0.1,
          side * (width / 2 - 0.12),
          1.3,
          cabinZ - 0.2,
          paint,
        );
        round(
          root,
          0.17,
          0.13,
          0.28,
          side * (width / 2 + 0.03),
          1.1,
          0.7,
          paint,
        );
        box(
          root,
          0.05,
          0.045,
          0.22,
          side * (width / 2 + 0.025),
          0.92,
          -0.3,
          chrome,
        );
        box(
          root,
          0.035,
          0.025,
          2.7,
          side * (width / 2 + 0.015),
          0.67,
          0,
          chrome,
        );
      }
      if (pickup) {
        box(root, 1.48, 0.12, 1.5, 0, 0.99, -1.4, dark);
        for (let side of [-1, 1])
          box(root, 0.15, 0.34, 1.55, side * 0.8, 1.08, -1.4, paint);
        box(root, 1.65, 0.3, 0.14, 0, 1.07, -2.14, paint);
      } else round(root, width - 0.14, 0.1, 0.9, 0, 1, 1.38, paint);
    }
    for (let side of [-1, 1])
      for (let z of [length * 0.32, -length * 0.32])
        wheel(side * width * 0.49, 0.39, z, bus ? 0.47 : 0.36, 0.24);
    round(root, width * 0.65, 0.19, 0.06, 0, 0.63, length / 2 + 0.04, dark);
    for (let i = 0; i < 5; i++)
      box(
        root,
        0.04,
        0.15,
        0.07,
        -0.25 + i * 0.125,
        0.64,
        length / 2 + 0.08,
        chrome,
      );
    for (let side of [-1, 1]) {
      round(
        root,
        0.48,
        0.14,
        0.07,
        side * (width * 0.33),
        0.82,
        length / 2 + 0.025,
        mat("#fff0c2", 0.1, 0.25),
        0.04,
      );
      round(
        root,
        0.44,
        0.13,
        0.05,
        side * width * 0.34,
        0.8,
        -length / 2 - 0.025,
        mat("#ac5146"),
        0.04,
      );
    }
    textSign(
      root,
      "PP",
      0.4,
      0.12,
      0,
      0.47,
      length / 2 + 0.085,
      "#eee9da",
      "#354d44",
    );
    root.userData.seat = { x: 0, y: 0, z: 0 };
  }
  root.userData.wheels = wheels;
  root.userData.bike = bike;
  return root;
}
export function createCharacter(
  color = "#d88558",
  skin = "#c98f6a",
  custom = {},
) {
  let g = new T.Group(),
    jacket = mat(color),
    skinMat = mat(skin),
    hair = mat(custom.hair ?? "#343b35"),
    pants = mat(custom.bottom ?? "#3e5960"),
    shoe = mat(custom.shoes ?? "#f4eee1"),
    dark = mat("#293a37");
  let torso = new T.Group();
  g.add(torso);
  round(torso, 0.5, 0.58, 0.3, 0, 1.05, 0, jacket, 0.12);
  round(torso, 0.22, 0.45, 0.315, 0, 1.06, 0.015, mat("#ece3d0"), 0.04);
  for (let side of [-1, 1]) {
    round(torso, 0.16, 0.47, 0.33, side * 0.2, 1.09, 0, jacket);
    round(torso, 0.12, 0.19, 0.07, side * 0.19, 1.04, 0.19, jacket);
    sphere(torso, side * 0.11, 1.36, 0.07, 0.09, 0.07, 0.1, jacket);
  }
  cylinder(torso, 0.09, 0.1, 0.16, 0, 1.43, 0, skinMat);
  let head = new T.Group();
  head.name = "illustrated-head";
  head.position.y = 1.7;
  torso.add(head);
  const faceStart = torso.children.length;
  sphere(torso, 0, 1.7, 0, 0.27, 0.32, 0.26, skinMat);
  sphere(torso, 0, 1.88, -0.035, 0.29, 0.21, 0.27, hair);
  for (let i = 0; i < 5; i++) {
    let h = sphere(
      torso,
      -0.22 + i * 0.1,
      1.91 + Math.sin(i) * 0.02,
      0.1,
      0.09,
      0.17,
      0.14,
      hair,
    );
    h.rotation.z = -0.45;
  }
  for (let side of [-1, 1]) {
    sphere(torso, side * 0.269, 1.69, 0, 0.06, 0.09, 0.06, skinMat);
    sphere(torso, side * 0.105, 1.73, 0.245, 0.035, 0.042, 0.017, dark);
    sphere(torso, side * 0.096, 1.743, 0.26, 0.009, 0.012, 0.008, shoe);
    rod(
      torso,
      [side * 0.06, 1.8, 0.24],
      [side * 0.15, 1.81, 0.23],
      0.014,
      hair,
    );
  }
  sphere(torso, 0, 1.65, 0.263, 0.035, 0.045, 0.037, skinMat);
  round(torso, 0.08, 0.012, 0.02, 0, 1.58, 0.25, mat("#9e5f4b"), 0.002);
  for (const part of [...torso.children].slice(faceStart)) {
    part.position.y -= 1.7;
    head.add(part);
  }
  let legs = [],
    arms = [];
  for (let side of [-1, 1]) {
    let leg = new T.Group();
    leg.position.set(side * 0.145, 0.79, 0);
    g.add(leg);
    round(leg, 0.21, 0.5, 0.23, 0, -0.25, 0, pants);
    round(leg, 0.23, 0.12, 0.36, 0, -0.58, 0.065, shoe);
    box(leg, 0.24, 0.04, 0.37, 0, -0.64, 0.06, dark);
    legs.push(leg);
    let arm = new T.Group();
    arm.position.set(side * 0.33, 1.28, 0);
    torso.add(arm);
    round(arm, 0.18, 0.39, 0.2, 0, -0.15, 0, jacket);
    sphere(arm, 0, -0.4, 0.015, 0.085, 0.1, 0.085, skinMat);
    arms.push(arm);
  }
  round(torso, 0.34, 0.43, 0.2, 0, 1.13, -0.24, mat("#4f6758"));
  round(torso, 0.24, 0.17, 0.06, 0, 1.03, -0.36, mat("#73927d"));
  g.userData = {
    legs,
    arms,
    torso,
    head,
    jacket,
    skinMat,
    hair,
    pants,
    shoe,
    dark,
  };
  return g;
}
export function animateCharacter(g, t, speed, riding = false) {
  let u = g.userData;
  u.torso.position.y = riding
    ? -0.25
    : Math.sin(t * 10) * Math.min(speed, 1) * 0.025;
  u.legs.forEach((l, i) => {
    l.rotation.x = riding
      ? -1.3
      : Math.sin(t * 10 + i * Math.PI) * Math.min(speed, 1) * 0.6;
  });
  u.arms.forEach((a, i) => {
    a.rotation.x = riding
      ? -1.1
      : -Math.sin(t * 10 + i * Math.PI) * Math.min(speed, 1) * 0.45;
  });
}
