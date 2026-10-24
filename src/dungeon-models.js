import { softMaterial } from "./art-direction.js";
import * as T from "three";
import { CLASSES, classId } from "./dungeon-rules.js";
import { SKIN_TONES, appearance, hairstyle } from "./wardrobe.js";
export function createHunter(look, role = "fighter", enemy = false) {
  const group = new T.Group(),
    spec = CLASSES[classId(role)],
    value = appearance(look);
  const material = (color) => softMaterial(color);
  const cloth = material(enemy ? 0x34324c : spec.color),
    dark = material(0x252435),
    gold = material(0xe4c480);
  const skin = material(
    enemy ? 0x716c8f : SKIN_TONES.find((s) => s.id === value.skin).color,
  );
  const hair = material(
    enemy ? 0x282332 : hairstyle(value.hair, value.gender).hair,
  );
  const mesh = (geo, mat, x, y, z, parent = group) => {
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const oval = (w, h, d, mat, x, y, z, parent = group) => {
    const m = mesh(new T.SphereGeometry(1, 16, 12), mat, x, y, z, parent);
    m.scale.set(w, h, d);
    return m;
  };
  function outline(m) {
    const edge = new T.Mesh(
      m.geometry,
      new T.MeshBasicMaterial({ color: 0x201c30, side: T.BackSide }),
    );
    edge.scale.setScalar(1.04);
    m.add(edge);
  }
  const body = oval(0.46, 0.5, 0.28, cloth, 0, 1.05, 0);
  outline(body);
  const head = oval(0.64, 0.62, 0.52, skin, 0, 1.98, 0);
  outline(head);
  oval(0.66, 0.39, 0.54, hair, 0, 2.23, -0.04);
  for (let i = 0; i < 5; i++) {
    const tuft = mesh(
      new T.ConeGeometry(0.19, 0.38, 4),
      hair,
      (i - 2) * 0.22,
      2.48,
      0.12,
    );
    tuft.rotation.z = (i - 2) * -0.16;
  }
  if (value.gender === "female") {
    oval(0.22, 0.52, 0.3, hair, -0.5, 1.85, -0.18);
    oval(0.22, 0.52, 0.3, hair, 0.5, 1.85, -0.18);
  }
  for (const x of [-0.22, 0.22]) {
    oval(0.09, 0.125, 0.045, dark, x, 2.01, 0.48);
    oval(0.025, 0.035, 0.015, material(0xfff8e9), x - 0.02, 2.05, 0.52);
  }
  const smile = mesh(
    new T.TorusGeometry(0.1, 0.017, 4, 12, Math.PI),
    dark,
    0,
    1.76,
    0.5,
  );
  smile.rotation.z = Math.PI;
  oval(0.09, 0.07, 0.045, skin, -0.35, 1.83, 0.44);
  oval(0.09, 0.07, 0.045, skin, 0.35, 1.83, 0.44);
  mesh(new T.BoxGeometry(0.82, 0.12, 0.62), gold, 0, 0.82, 0);
  const arms = [],
    legs = [];
  for (const sign of [-1, 1]) {
    const arm = new T.Group();
    arm.position.set(sign * 0.5, 1.35, 0);
    group.add(arm);
    arms.push(arm);
    oval(0.15, 0.3, 0.16, cloth, 0, -0.18, 0, arm);
    oval(0.15, 0.16, 0.15, skin, 0, -0.48, 0.04, arm);
    const leg = new T.Group();
    leg.position.set(sign * 0.22, 0.72, 0);
    group.add(leg);
    legs.push(leg);
    mesh(new T.CylinderGeometry(0.13, 0.15, 0.45, 8), dark, 0, -0.19, 0, leg);
    oval(0.19, 0.13, 0.28, dark, 0, -0.45, 0.09, leg);
  }
  const weapon = new T.Group();
  arms[1].add(weapon);
  weapon.position.set(0, -0.48, 0.12);
  const steel = material(0xe2e5ee),
    glow = new T.MeshBasicMaterial({ color: spec.color });
  if (role === "mage" || role === "support") {
    mesh(
      new T.CylinderGeometry(0.045, 0.045, 1.35, 8),
      gold,
      0,
      0.25,
      0.15,
      weapon,
    );
    const gem = mesh(new T.OctahedronGeometry(0.23), glow, 0, 1, 0.15, weapon);
    gem.rotation.z = Math.PI / 4;
  } else if (role === "marksman") {
    const bow = mesh(
      new T.TorusGeometry(0.5, 0.055, 6, 16, Math.PI),
      gold,
      0,
      0.2,
      0.1,
      weapon,
    );
    bow.rotation.z = -Math.PI / 2;
    mesh(
      new T.CylinderGeometry(0.014, 0.014, 1, 5),
      steel,
      0,
      0.2,
      0.1,
      weapon,
    );
  } else {
    const length = role === "assassin" ? 0.48 : role === "tank" ? 0.65 : 1;
    mesh(
      new T.BoxGeometry(0.13, length, 0.08),
      steel,
      0,
      length / 2,
      0.16,
      weapon,
    );
    mesh(new T.BoxGeometry(0.4, 0.08, 0.15), gold, 0, 0, 0.16, weapon);
    if (role === "tank") {
      const shield = mesh(
        new T.CylinderGeometry(0.48, 0.4, 0.13, 6),
        cloth,
        0,
        -0.35,
        0.28,
        arms[0],
      );
      shield.rotation.x = Math.PI / 2;
      mesh(new T.BoxGeometry(0.1, 0.55, 0.1), gold, 0, -0.35, 0.4, arms[0]);
    }
    if (role === "assassin")
      mesh(new T.BoxGeometry(0.12, 0.48, 0.08), steel, 0, -0.2, 0.2, arms[0]);
  }
  const shadow = mesh(
    new T.CircleGeometry(0.65, 20),
    new T.MeshBasicMaterial({
      color: 0x0d0c19,
      transparent: true,
      opacity: 0.35,
    }),
    0,
    0.02,
    0,
  );
  shadow.rotation.x = -Math.PI / 2;
  let gait = 0;
  return {
    group,
    update(state, dt, time) {
      gait += Math.abs(state.speed || 0) * dt * 2.5;
      const swing = state.speed ? Math.sin(gait) * 0.65 : 0;
      legs[0].rotation.x = swing;
      legs[1].rotation.x = -swing;
      arms[0].rotation.x = -swing * 0.7;
      arms[1].rotation.x = swing * 0.7;
      arms.forEach((arm) => {
        arm.rotation.y = 0;
        arm.rotation.z = 0;
      });
      body.rotation.y = 0;
      group.rotation.x = 0;
      group.rotation.z = 0;
      const age = time - (state.combat?.lastAttackAt || 0),
        skill = state.combat?.lastAction === "skill",
        duration = skill ? 520 : 360;
      if (age >= 0 && age < duration) {
        const phase = age / duration,
          pulse = Math.sin(phase * Math.PI);
        if (state.combat?.lastAction === "dodge") {
          group.rotation.x = -pulse * 0.5;
          arms[0].rotation.x = -0.8;
          arms[1].rotation.x = -0.8;
        } else if (role === "mage" || role === "support") {
          arms[1].rotation.x = -1.5 * pulse;
          arms[0].rotation.x = -1.1 * pulse;
          arms[0].rotation.z = -0.5 * pulse;
          body.rotation.y = 0.2 * pulse;
        } else if (role === "marksman") {
          arms[1].rotation.x = -1.4;
          arms[1].rotation.z = 0.35;
          arms[0].rotation.x = -1.2;
          arms[0].rotation.y = 0.8 * (1 - phase);
          body.rotation.y = 0.35;
        } else if (role === "assassin") {
          arms[1].rotation.x = -1.8 * pulse;
          arms[0].rotation.x =
            -1.8 * Math.sin(Math.min(1, phase + 0.2) * Math.PI);
          body.rotation.y = Math.sin(phase * Math.PI * 2) * 0.35;
          group.rotation.x = pulse * 0.2;
        } else {
          arms[1].rotation.x = -0.9;
          arms[1].rotation.z = (phase - 0.5) * 2.8;
          body.rotation.y = (phase - 0.5) * 0.7;
          arms[0].rotation.x = role === "tank" ? -1.1 : -pulse * 0.3;
        }
      }
      if (role === "tank" && state.combat?.guardUntil > time) {
        arms[0].rotation.x = -1.3;
        arms[0].rotation.z = -0.35;
      }
      group.rotation.y = state.heading || 0;
      body.position.y =
        1.05 +
        (state.speed
          ? Math.abs(Math.sin(gait)) * 0.06
          : Math.sin(time * 0.003) * 0.015);
    },
  };
}
export function createRiftEnemy(type) {
  if (type === "shade") return createHunter(null, "fighter", true).group;
  const group = new T.Group(),
    boss = type === "boss";
  const body = new T.Mesh(
    new T.IcosahedronGeometry(boss ? 1.5 : 0.65, 1),
    new T.MeshToonMaterial({
      color: boss ? 0x463b67 : 0x9b83d1,
      emissive: boss ? 0x120b25 : 0x251443,
    }),
  );
  body.position.y = boss ? 1.6 : 1.3;
  group.add(body);
  for (const sign of [-1, 1]) {
    const eye = new T.Mesh(
      new T.SphereGeometry(boss ? 0.16 : 0.1, 8, 6),
      new T.MeshBasicMaterial({ color: 0xf4d186 }),
    );
    eye.position.set(
      sign * (boss ? 0.5 : 0.23),
      boss ? 1.9 : 1.4,
      boss ? 1.25 : 0.53,
    );
    group.add(eye);
    if (boss) {
      const horn = new T.Mesh(
        new T.ConeGeometry(0.3, 1.4, 5),
        new T.MeshToonMaterial({ color: 0xbbaa88 }),
      );
      horn.position.set(sign * 0.95, 3, 0);
      horn.rotation.z = sign * -0.4;
      group.add(horn);
    }
  }
  return group;
}
export function disposeRiftObject(root) {
  root.traverse((o) => {
    o.geometry?.dispose();
    if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
    else o.material?.dispose();
  });
}
