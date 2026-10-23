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

// A captured pointer keeps the walking wheel responsive outside its rim.
export function bindWalkingJoystick(
  element,
  keys,
  { onSprint = () => {}, onLock = () => {} } = {},
) {
  let pointer = null,
    locked = false,
    sprinting = false;
  const directions = ["arrowleft", "arrowright", "arrowup", "arrowdown"];
  function sprint(value) {
    if (sprinting !== value) {
      sprinting = value;
      onSprint(value);
    }
    element.classList[value ? "add" : "remove"]("sprinting");
  }
  function lock(value) {
    locked = value;
    onLock(value);
    element.classList[value ? "add" : "remove"]("sprint-locked");
  }
  const clear = () => {
    pointer = null;
    directions.forEach((key) => keys.delete(key));
    element.style.setProperty("--stick-x", "0px");
    element.style.setProperty("--stick-y", "0px");
    element.classList.remove("active");
    sprint(false);
    lock(false);
  };
  const move = (event) => {
    if (event.pointerId !== pointer) return;
    event.preventDefault();
    const rect = element.getBoundingClientRect(),
      radius = rect.width * 0.32;
    let x = event.clientX - rect.left - rect.width / 2,
      y = event.clientY - rect.top - rect.height / 2;
    const length = Math.hypot(x, y);
    const locking = y < -radius * 1.8 && Math.abs(x) < radius;
    if (length > radius) {
      x *= radius / length;
      y *= radius / length;
    }
    directions.forEach((key) => keys.delete(key));
    if (Math.hypot(x, y) > radius * 0.22) {
      if (x < -radius * 0.3) keys.add("arrowleft");
      if (x > radius * 0.3) keys.add("arrowright");
      if (y < -radius * 0.3) keys.add("arrowup");
      if (y > radius * 0.3) keys.add("arrowdown");
    }
    if (locking) lock(true);
    sprint(locked || length >= radius * 0.88);
    element.style.setProperty("--stick-x", `${x}px`);
    element.style.setProperty("--stick-y", `${y}px`);
  };
  element.addEventListener("pointerdown", (event) => {
    if (pointer !== null) return;
    lock(false);
    pointer = event.pointerId;
    element.setPointerCapture(pointer);
    element.classList.add("active");
    move(event);
  });
  element.addEventListener("pointermove", move);
  element.addEventListener("pointerup", (event) => {
    if (event.pointerId !== pointer) return;
    if (locked) {
      pointer = null;
      directions.forEach((key) => keys.delete(key));
      keys.add("arrowup");
      sprint(true);
    } else clear();
  });
  for (const type of ["pointercancel", "lostpointercapture"])
    element.addEventListener(type, (event) => {
      if (event.pointerId === pointer) clear();
    });
  element.addEventListener("contextmenu", (event) => event.preventDefault());
  clear.setLocked = (value) => {
    if (!value) {
      clear();
      return;
    }
    lock(true);
    directions.forEach((key) => keys.delete(key));
    keys.add("arrowup");
    sprint(true);
    element.style.setProperty("--stick-y", "-32px");
  };
  Object.defineProperty(clear, "locked", { get: () => locked });
  return clear;
}
