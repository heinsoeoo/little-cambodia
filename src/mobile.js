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
