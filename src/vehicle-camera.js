// Only resolve blocked views; steering alone never changes the camera angle.
export function createVehicleCamera(buildings) {
  const grid = new Map();
  for (const b of buildings) {
    for (let x = Math.floor(b.minX / 80); x <= Math.floor(b.maxX / 80); x++)
      for (let z = Math.floor(b.minZ / 80); z <= Math.floor(b.maxZ / 80); z++) {
        const key = `${x},${z}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(b);
      }
  }
  let elapsed = 0,
    blockedFor = 0;
  function blocked(focus, offset) {
    const nearby = new Set();
    for (
      let x = Math.floor((focus.x - 120) / 80);
      x <= Math.floor((focus.x + 120) / 80);
      x++
    )
      for (
        let z = Math.floor((focus.z - 120) / 80);
        z <= Math.floor((focus.z + 120) / 80);
        z++
      )
        for (const b of grid.get(`${x},${z}`) || []) nearby.add(b);
    return [...nearby].some((b) => {
      let near = 0.025,
        far = 1;
      for (const [origin, direction, min, max] of [
        [focus.x, offset.x, b.minX, b.maxX],
        [focus.z, offset.z, b.minZ, b.maxZ],
        [1.5, offset.y - 1.5, 0, b.height || 8],
      ]) {
        if (Math.abs(direction) < 1e-6) {
          if (origin < min || origin > max) return false;
        } else {
          const a = (min - origin) / direction,
            c = (max - origin) / direction;
          near = Math.max(near, Math.min(a, c));
          far = Math.min(far, Math.max(a, c));
          if (near > far) return false;
        }
      }
      return true;
    });
  }
  return {
    blocked,
    update(dt, focus, orbit, driving, manual) {
      elapsed += dt;
      if (!driving || manual) {
        blockedFor = 0;
        return;
      }
      if (elapsed < 0.25) return;
      const step = elapsed;
      elapsed = 0;
      const current = orbit.offset();
      if (!blocked(focus, current)) {
        blockedFor = 0;
        return;
      }
      blockedFor += step;
      if (blockedFor < 0.6) return;
      const yaw = orbit.yaw();
      for (const angle of [
        Math.PI / 6,
        -Math.PI / 6,
        Math.PI / 3,
        -Math.PI / 3,
        Math.PI / 2,
        -Math.PI / 2,
        Math.PI,
      ]) {
        const c = Math.cos(angle),
          s = Math.sin(angle);
        const candidate = {
          x: current.x * c + current.z * s,
          y: current.y,
          z: current.z * c - current.x * s,
        };
        if (!blocked(focus, candidate)) {
          orbit.setYaw(yaw + angle);
          blockedFor = 0;
          return;
        }
      }
    },
  };
}
