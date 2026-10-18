export function stepVehicle(car, input, dt, collides) {
  const old = { x: car.x, z: car.z };
  const throttle =
    Number(input.has("w") || input.has("arrowup")) -
    Number(input.has("s") || input.has("arrowdown"));
  const brake = input.has(" ");
  car.speed += throttle * 11 * dt;
  car.speed *= Math.exp(-(brake ? 5 : throttle ? 0.14 : 0.8) * dt);
  car.speed = Math.max(-9, Math.min(27, car.speed));
  if (Math.abs(car.speed) < 0.025) car.speed = 0;
  const steer =
    Number(input.has("a") || input.has("arrowleft")) -
    Number(input.has("d") || input.has("arrowright"));
  car.heading += ((steer * car.speed) / (5 + Math.abs(car.speed) * 0.35)) * dt;
  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;
  if (collides(car.x, car.z)) {
    car.x = old.x;
    car.z = old.z;
    car.speed *= -0.15;
    return true;
  }
  return false;
}
