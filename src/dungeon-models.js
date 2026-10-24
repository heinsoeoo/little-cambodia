import { createCharacter } from "./character.js";
import { softMaterial } from "./art-direction.js";
import * as T from "three";
import { CLASSES, classId } from "./dungeon-rules.js";
import { appearance } from "./wardrobe.js";
export function createHunter(look, role = "fighter", enemy = false) {
  const spec = CLASSES[classId(role)],
    value = appearance(look);
  const avatar = createCharacter(value),
    group = avatar.group,
    rig = group.children[0].userData;
  const material = (color) => softMaterial(color);
  const cloth = rig.jacket,
    dark = rig.dark,
    gold = material(0xe4c480);
  cloth.color.setHex(enemy ? 0x34324c : spec.color);
  if (enemy) {
    rig.skinMat.color.setHex(0x716c8f);
    rig.hair.color.setHex(0x282332);
  }
  const body = rig.torso,
    arms = rig.arms,
    legs = rig.legs;
  const mesh = (geo, mat, x, y, z, parent = group) => {
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const weapon = new T.Group();
  arms[1].add(weapon);
  weapon.position.set(0, -0.4, 0.12);
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
      body.position.y = state.speed
        ? Math.abs(Math.sin(gait)) * 0.06
        : Math.sin(time * 0.003) * 0.015;
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
