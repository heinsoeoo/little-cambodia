import { createCharacter } from "./character.js";
import { vehicleModel, repaintVehicle } from "./vehicle-model.js";
import * as T from "three";
import { updateVehicleLighting } from "./vehicle-lighting.js";
export function playerColor(id) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return [0xf1c67b, 0xa7d9ba, 0xcdb4e1, 0xeeb4aa, 0xa9cde4][hash % 5];
}
export function createActor(scene, player) {
  const group = new T.Group();
  const character = createCharacter(player.appearance);
  const avatar = character.group;
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
    update(state, dt, local = false, night = false) {
      const distance = Math.hypot(
        group.position.x - state.x,
        group.position.z - state.z,
      );
      const factor = distance > 15 ? 1 : 1 - Math.exp(-dt * (local ? 24 : 10));
      group.position.x += (state.x - group.position.x) * factor;
      group.position.z += (state.z - group.position.z) * factor;
      character.setAppearance(state.appearance);
      character.pose(state);
      if ((state.vehicle?.type || null) !== type) {
        if (vehicle) {
          scene.remove(vehicle);
          vehicle.traverse((o) => {
            o.geometry?.dispose();
            if (o.material) o.material.dispose();
          });
        }
        type = state.vehicle?.type || null;
        vehicle = type ? vehicleModel(type, state.vehicle.paint) : null;
        if (vehicle) scene.add(vehicle);
      }
      if (vehicle) {
        repaintVehicle(vehicle, state.vehicle.paint);
        updateVehicleLighting(vehicle, {
          night,
          driving: state.mode === "drive",
          braking: state.vehicle.braking,
        });
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
      character.dispose();
      label.remove();
    },
  };
}
