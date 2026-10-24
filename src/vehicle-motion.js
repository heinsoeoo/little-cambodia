import * as T from "three";
import { vehicleSpec } from "./vehicle-catalog.js";
export const roadHeight = (type) => (type === "offroad-moto" ? 0.17 : 0.125);
export function bikeLean(speed, turnRate) {
  if (
    !Number.isFinite(speed) ||
    !Number.isFinite(turnRate) ||
    !speed ||
    !turnRate
  )
    return 0;
  return Math.max(
    -0.48,
    Math.min(0.48, -Math.atan((speed * turnRate) / 9.81) * 0.72),
  );
}
export function prepareVehicleMotion(model) {
  if (model.userData.nativeWheels) {
    model.userData.wheelPivots = model.userData.nativeWheels;
    for (const wheel of model.userData.wheelPivots) {
      wheel.name = "rolling-wheel";
      wheel.userData.radius = wheel.position.y;
      wheel.userData.front = wheel.position.z > 0;
    }
    model.rotation.order = "YXZ";
    return;
  }
  const grouped = new Map();
  for (const object of [...model.children]) {
    const wheel = object.userData.wheel;
    if (!wheel) continue;
    const key = `${wheel.x}:${wheel.z}`;
    let pivot = grouped.get(key);
    if (!pivot) {
      pivot = new T.Group();
      pivot.name = "rolling-wheel";
      pivot.position.set(wheel.x, wheel.r, wheel.z);
      pivot.userData.radius = wheel.r;
      pivot.userData.front = wheel.z > 0;
      model.add(pivot);
      grouped.set(key, pivot);
    }
    object.position.sub(pivot.position);
    pivot.add(object);
  }
  model.userData.wheelPivots = [...grouped.values()];
  model.rotation.order = "YXZ";
}
export function animateVehicle(model, state, dt, driving) {
  const speed = driving && Number.isFinite(state.speed) ? state.speed : 0;
  for (const wheel of model.userData.wheelPivots || []) {
    wheel.userData.spin =
      ((wheel.userData.spin || 0) + (speed * dt) / wheel.userData.radius) %
      (Math.PI * 2);
    wheel.rotation.order = "YXZ";
    wheel.rotation.set(
      wheel.userData.spin,
      wheel.userData.front && driving ? (state.steering || 0) * 0.28 : 0,
      0,
      "YXZ",
    );
  }
  const desired =
    driving && vehicleSpec(state.type).kind === "bike"
      ? bikeLean(speed, state.turnRate || 0)
      : 0;
  model.rotation.z += (desired - model.rotation.z) * (1 - Math.exp(-dt * 9));
  return model.rotation.z;
}
