export function needsRotation({ width, height, coarse }) {
  return coarse && height > width;
}
// Track pointers independently so releasing one finger cannot clear another.
export function bindHoldControls(root, keys) {
  const held = new Map();
  const sync = (key) => {
    if ([...held.values()].includes(key)) keys.add(key);
    else keys.delete(key);
  };
  for (const button of root.querySelectorAll("[data-key]")) {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      held.set(event.pointerId, button.dataset.key);
      sync(button.dataset.key);
      button.classList.add("pressed");
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      button.addEventListener(type, (event) => {
        const key = held.get(event.pointerId);
        held.delete(event.pointerId);
        if (key) sync(key);
        if (![...held.values()].includes(button.dataset.key))
          button.classList.remove("pressed");
      });
    button.addEventListener("contextmenu", (event) => event.preventDefault());
  }
  return () => {
    held.clear();
    root.querySelectorAll("[data-key]").forEach((b) => {
      keys.delete(b.dataset.key);
      b.classList.remove("pressed");
    });
  };
}

// Safari can recognize a browser pinch independently of pointer-based game controls.
// Cancel zoom gestures only; one-finger scrolling and pointer lifecycles stay intact.
export function bindViewportGestures(root) {
  let lastTap = null;
  const preventDoubleTap = (event) => {
    if (
      !event.cancelable ||
      event.touches.length ||
      event.changedTouches.length !== 1
    )
      return;
    if (event.target.closest?.("input, select, textarea, [contenteditable]"))
      return;
    if (!event.target.closest?.("#world, button, .touch, .mobile-context"))
      return;
    const touch = event.changedTouches[0];
    if (
      lastTap &&
      event.timeStamp - lastTap.time < 330 &&
      Math.hypot(touch.clientX - lastTap.x, touch.clientY - lastTap.y) < 30
    ) {
      event.preventDefault();
      lastTap = null;
    } else
      lastTap = { time: event.timeStamp, x: touch.clientX, y: touch.clientY };
  };
  const preventPinch = (event) => {
    if (event.cancelable && event.touches.length > 1) event.preventDefault();
  };
  const preventGesture = (event) => {
    if (event.cancelable) event.preventDefault();
  };
  const preventWorldDoubleClick = (event) => {
    if (
      event.cancelable &&
      event.target.closest?.("#world, .touch, [data-key], .mobile-context")
    )
      event.preventDefault();
  };
  const bindings = [
    ["touchstart", preventPinch],
    ["touchmove", preventPinch],
    ["touchend", preventDoubleTap],
    ["gesturestart", preventGesture],
    ["gesturechange", preventGesture],
    ["dblclick", preventWorldDoubleClick],
  ];
  for (const [type, handler] of bindings)
    root.addEventListener(type, handler, { passive: false });
  return () => {
    for (const [type, handler] of bindings)
      root.removeEventListener(type, handler);
  };
}
