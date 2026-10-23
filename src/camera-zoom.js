export const clampZoom = (value) =>
  Math.min(
    60,
    Math.max(7, Number.isFinite(Number(value)) ? Number(value) : 25),
  );
export function createCameraZoom({ camera, canvas, viewport }) {
  const $ = (id) => document.getElementById(id);
  let stored;
  try {
    stored = localStorage.getItem("little-cambodia-camera-distance");
  } catch {}
  let target = stored === null || stored === undefined ? 25 : clampZoom(stored),
    current = target;
  function apply() {
    const { width, height } = viewport();
    camera.left = (-current * width) / height;
    camera.right = (current * width) / height;
    camera.top = current;
    camera.bottom = -current;
    camera.updateProjectionMatrix();
  }
  function set(value) {
    target = clampZoom(value);
    $("camera-distance").value = target;
    try {
      localStorage.setItem("little-cambodia-camera-distance", String(target));
    } catch {}
  }
  $("camera-distance").oninput = () => set($("camera-distance").value);
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      set(target * Math.exp(event.deltaY * 0.0015));
    },
    { passive: false },
  );
  const pointers = new Map();
  let pinch = null;
  canvas.addEventListener("pointerdown", (event) => {
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
    canvas.setPointerCapture(event.pointerId);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { distance: Math.hypot(a[0] - b[0], a[1] - b[1]), zoom: target };
    }
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
    if (pointers.size === 2 && pinch) {
      event.preventDefault();
      const [a, b] = [...pointers.values()],
        distance = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (distance > 10) set((pinch.zoom * pinch.distance) / distance);
    }
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    canvas.addEventListener(type, (event) => {
      pointers.delete(event.pointerId);
      pinch = null;
    });
  addEventListener("blur", () => {
    pointers.clear();
    pinch = null;
  });
  set(target);
  apply();
  return {
    resize: apply,
    tick(dt, speed = 0) {
      const desired = target * (1 + Math.min(Math.abs(speed) / 30, 1) * 0.12);
      if (Math.abs(current - desired) < 0.001) return;
      current += (desired - current) * (1 - Math.exp(-dt * 6));
      apply();
    },
    cycle() {
      set(target < 18 ? 25 : target < 35 ? 48 : 12);
    },
  };
}
