import { vehiclePhysics } from "./vehicle-catalog.js";
export function stepVehicle(car, input, dt, collides) {
  const tune = vehiclePhysics(car.type),
    old = { x: car.x, z: car.z };
  const throttle =
    Number(input.has("w") || input.has("arrowup")) -
    Number(input.has("s") || input.has("arrowdown"));
  const brake = input.has(" ") || input.has("b");
  const handbrake =
    input.has("shift") &&
    !["moto", "vespa", "scoopy", "rickshaw", "tuktuk"].includes(car.type);
  car.vx ??= Math.sin(car.heading) * car.speed;
  car.vz ??= Math.cos(car.heading) * car.speed;
  const opposite =
    throttle &&
    Math.sign(throttle) !== Math.sign(car.speed) &&
    Math.abs(car.speed) > 0.1;
  if (brake || opposite) {
    const speed = Math.hypot(car.vx, car.vz),
      remaining = Math.max(0, speed - tune.braking * dt);
    car.vx *= speed ? remaining / speed : 0;
    car.vz *= speed ? remaining / speed : 0;
  } else if (throttle && !handbrake) {
    car.vx += Math.sin(car.heading) * throttle * tune.power * dt;
    car.vz += Math.cos(car.heading) * throttle * tune.power * dt;
  }
  const drag = Math.exp(-(handbrake ? 1.15 : throttle ? 0.12 : 0.65) * dt);
  car.vx *= drag;
  car.vz *= drag;
  const steer =
    Number(input.has("a") || input.has("arrowleft")) -
    Number(input.has("d") || input.has("arrowright"));
  car.heading +=
    ((steer * car.speed) / (5 + Math.abs(car.speed) * 0.35)) *
    dt *
    (handbrake ? 1.4 : 1);
  const forward =
    car.vx * Math.sin(car.heading) + car.vz * Math.cos(car.heading);
  let lateral = car.vx * Math.cos(car.heading) - car.vz * Math.sin(car.heading);
  lateral *= Math.exp(-(handbrake ? 1.25 : tune.grip) * dt);
  const along = Math.max(-6, Math.min(tune.maxSpeed, forward));
  car.vx = Math.sin(car.heading) * along + Math.cos(car.heading) * lateral;
  car.vz = Math.cos(car.heading) * along - Math.sin(car.heading) * lateral;
  if ((brake || !throttle) && Math.hypot(car.vx, car.vz) < 0.08)
    car.vx = car.vz = 0;
  car.speed = Math.sign(along || 1) * Math.hypot(car.vx, car.vz);
  car.drifting = handbrake && Math.abs(lateral) > 1;
  // Substeps prevent fast vehicles from tunnelling through small footprints.
  const steps = Math.max(1, Math.ceil((Math.hypot(car.vx, car.vz) * dt) / 0.5));
  for (let i = 0; i < steps; i++) {
    const x = car.x + (car.vx * dt) / steps,
      z = car.z + (car.vz * dt) / steps;
    if (collides(x, z)) {
      car.x = old.x;
      car.z = old.z;
      car.speed = car.vx = car.vz = 0;
      car.drifting = false;
      return true;
    }
    car.x = x;
    car.z = z;
  }
  return false;
}
