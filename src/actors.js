import { vehicleModel } from "./vehicle-model.js";
import * as T from "three";
export function playerColor(id) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return [0xf1c67b, 0xa7d9ba, 0xcdb4e1, 0xeeb4aa, 0xa9cde4][hash % 5];
}
export function createActor(scene, player) {
  const group = new T.Group();
  const avatar = new T.Group();
  const coat = new T.Mesh(
    new T.CylinderGeometry(0.25, 0.36, 0.85, 10),
    new T.MeshLambertMaterial({ color: playerColor(player.id) }),
  );
  coat.position.y = 1;
  avatar.add(coat);
  const head = new T.Mesh(
    new T.SphereGeometry(0.25, 12, 10),
    new T.MeshLambertMaterial({ color: 0xd6ae8b }),
  );
  head.position.y = 1.62;
  avatar.add(head);
  const hair = new T.Mesh(
    new T.SphereGeometry(0.26, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.53),
    new T.MeshLambertMaterial({ color: 0x65534b }),
  );
  hair.position.y = 1.67;
  avatar.add(hair);
  const legs = [];
  for (const x of [-0.15, 0.15]) {
    const leg = new T.Mesh(
      new T.CylinderGeometry(0.09, 0.1, 0.65, 8),
      new T.MeshLambertMaterial({ color: 0x626b70 }),
    );
    leg.position.set(x, 0.35, 0);
    legs.push(leg);
    avatar.add(leg);
  }
  const ridingLimbs = new T.Group(),
    walkingArms = new T.Group();
  const sleeve = new T.MeshLambertMaterial({ color: playerColor(player.id) });
  const trousers = legs[0].material;
  const skin = head.material;
  function limb(parent, from, to, radius, material) {
    const a = new T.Vector3(...from),
      b = new T.Vector3(...to);
    const mesh = new T.Mesh(
      new T.CylinderGeometry(radius, radius, a.distanceTo(b), 8),
      material,
    );
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      b.sub(a).normalize(),
    );
    parent.add(mesh);
  }
  for (const side of [-1, 1]) {
    limb(
      walkingArms,
      [side * 0.28, 1.3, 0],
      [side * 0.36, 0.65, 0],
      0.09,
      sleeve,
    );
    limb(
      ridingLimbs,
      [side * 0.24, 1.3, 0.04],
      [side * 0.38, 1, 0.35],
      0.1,
      sleeve,
    );
    limb(
      ridingLimbs,
      [side * 0.38, 1, 0.35],
      [side * 0.4, 0.78, 0.85],
      0.075,
      skin,
    );
    limb(
      ridingLimbs,
      [side * 0.22, 0.62, 0],
      [side * 0.43, 0.3, 0.38],
      0.11,
      trousers,
    );
    limb(
      ridingLimbs,
      [side * 0.43, 0.3, 0.38],
      [side * 0.43, 0.02, 0.15],
      0.09,
      trousers,
    );
    limb(
      ridingLimbs,
      [side * 0.43, 0.02, 0.15],
      [side * 0.43, 0.02, 0.4],
      0.11,
      trousers,
    );
  }
  ridingLimbs.visible = false;
  avatar.add(ridingLimbs, walkingArms);
  avatar.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  group.add(avatar);
  const label = document.createElement("div");
  label.className = "player-nameplate";
  label.textContent = player.nickname;
  document.body.append(label);
  const projected = new T.Vector3();
  scene.add(group);
  let vehicle = null,
    type = null;
  group.position.set(player.x, 0, player.z);
  return {
    update(state, dt, local = false) {
      const distance = Math.hypot(
        group.position.x - state.x,
        group.position.z - state.z,
      );
      const factor = local || distance > 15 ? 1 : 1 - Math.exp(-dt * 12);
      group.position.x += (state.x - group.position.x) * factor;
      group.position.z += (state.z - group.position.z) * factor;
      const riding = state.mode === "drive" && state.vehicle?.type === "moto";
      avatar.visible = state.mode === "walk" || riding;
      avatar.position.set(
        riding ? -Math.sin(state.vehicle.heading) * 0.15 : 0,
        riding ? 0.52 : 0,
        riding ? -Math.cos(state.vehicle.heading) * 0.15 : 0,
      );
      avatar.rotation.y = riding ? state.vehicle.heading : state.heading;
      ridingLimbs.visible = riding;
      walkingArms.visible = !riding;
      legs.forEach((leg) => (leg.visible = !riding));
      legs.forEach(
        (leg, i) =>
          (leg.rotation.x =
            state.mode === "walk" && state.speed > 0.1
              ? Math.sin(performance.now() / 130 + i * Math.PI) * 0.35
              : 0),
      );
      if ((state.vehicle?.type || null) !== type) {
        if (vehicle) {
          scene.remove(vehicle);
          vehicle.traverse((o) => {
            o.geometry?.dispose();
            if (o.material) o.material.dispose();
          });
        }
        type = state.vehicle?.type || null;
        vehicle = type ? vehicleModel(type) : null;
        if (vehicle) scene.add(vehicle);
      }
      if (vehicle) {
        vehicle.position.set(
          state.mode === "drive" ? group.position.x : state.vehicle.x,
          0,
          state.mode === "drive" ? group.position.z : state.vehicle.z,
        );
        vehicle.rotation.y = state.vehicle.heading;
      }
    },
    projectLabel(camera, width, height) {
      projected.set(group.position.x, 3.1, group.position.z).project(camera);
      label.hidden =
        projected.z < -1 ||
        projected.z > 1 ||
        Math.abs(projected.x) > 1.1 ||
        Math.abs(projected.y) > 1.1;
      label.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
      label.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
    },
    dispose() {
      scene.remove(group);
      if (vehicle) {
        scene.remove(vehicle);
        vehicle.traverse((o) => {
          o.geometry?.dispose();
          o.material?.dispose();
        });
      }
      avatar.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
      label.remove();
    },
  };
}
