import * as T from "three";
export function playerColor(id) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return [0xf1c67b, 0xa7d9ba, 0xcdb4e1, 0xeeb4aa, 0xa9cde4][hash % 5];
}
function vehicleModel(type) {
  const group = new T.Group(),
    body = new T.MeshLambertMaterial({
      color:
        type === "car" ? 0xaec7ba : type === "tuktuk" ? 0xc76f58 : 0xd7b969,
    }),
    dark = new T.MeshLambertMaterial({ color: 0x42474c }),
    glass = new T.MeshLambertMaterial({ color: 0x6e9197 });
  const box = (w, h, d, x, y, z, material) => {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    group.add(mesh);
  };
  if (type === "car") {
    box(1.9, 0.7, 3.7, 0, 0.8, 0, body);
    box(1.6, 0.65, 1.8, 0, 1.4, -0.1, glass);
    box(1.7, 0.12, 1.9, 0, 1.75, -0.1, body);
  } else if (type === "tuktuk") {
    box(1.6, 0.6, 2.4, 0, 0.8, -0.4, body);
    box(1.8, 0.15, 2.2, 0, 2, -0.5, body);
    for (const x of [-0.7, 0.7]) box(0.1, 1, 0.1, x, 1.4, -1.3, dark);
    box(0.5, 0.5, 1, 0, 0.7, 1, body);
  } else {
    box(0.6, 0.5, 1.7, 0, 0.7, 0, body);
    box(0.5, 0.2, 0.8, 0, 1, -0.2, dark);
    box(1, 0.1, 0.1, 0, 1.2, 0.65, dark);
  }
  const wheelPositions =
    type === "car"
      ? [
          [-1, -1.1],
          [1, -1.1],
          [-1, 1.1],
          [1, 1.1],
        ]
      : type === "tuktuk"
        ? [
            [-0.85, -1],
            [0.85, -1],
            [0, 1.2],
          ]
        : [
            [0, -0.75],
            [0, 0.75],
          ];
  for (const [x, z] of wheelPositions) {
    const wheel = new T.Mesh(
      new T.BoxGeometry(type === "moto" ? 0.23 : 0.25, 0.55, 0.6),
      dark,
    );
    wheel.position.set(x, 0.3, z);
    group.add(wheel);
  }
  return group;
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
      avatar.visible = state.mode === "walk";
      avatar.rotation.y = state.heading;
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
