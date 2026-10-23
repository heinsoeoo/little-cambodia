// Follow the rendered actor, smoothing only orbit changes. Smoothing a moving
// camera position separately from its look target makes vehicles shimmer at speed.
export function followCamera(camera, focus, desiredOffset, offset, dt) {
  const blend = 1 - Math.exp(-dt * 7);
  for (const axis of ["x", "y", "z"])
    offset[axis] += (desiredOffset[axis] - offset[axis]) * blend;
  camera.position.set(focus.x + offset.x, offset.y, focus.z + offset.z);
  camera.lookAt(focus.x, 0, focus.z);
}
