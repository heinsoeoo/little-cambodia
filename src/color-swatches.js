import { VEHICLE_PAINTS, paintColor } from "./vehicle-catalog.js";

export function createColorSwatches(select, vehicleType) {
  const group = document.createElement("div");
  group.className = "paint-picker";
  const choices = document.createElement("div");
  choices.className = "paint-swatches";
  choices.setAttribute("role", "radiogroup");
  choices.setAttribute("aria-label", "Vehicle color");
  const caption = document.createElement("span");
  caption.className = "paint-caption";
  caption.setAttribute("aria-live", "polite");
  const buttons = VEHICLE_PAINTS.map((paint, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "paint-swatch";
    button.setAttribute("role", "radio");
    button.setAttribute("aria-label", paint.name);
    button.title = paint.name;
    button.dataset.paint = paint.id;
    const check = document.createElement("span");
    check.className = "paint-check";
    check.textContent = "✓";
    check.setAttribute("aria-hidden", "true");
    button.append(check);
    if (paint.id === "factory") {
      const mark = document.createElement("span");
      mark.className = "paint-original";
      mark.textContent = "↺";
      mark.setAttribute("aria-hidden", "true");
      button.append(mark);
    }
    const choose = () => {
      select.value = paint.id;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      sync();
    };
    button.onclick = choose;
    button.onkeydown = (event) => {
      if (
        ![
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Home",
          "End",
        ].includes(event.key)
      )
        return;
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? buttons.length - 1
            : (index +
                (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1) +
                buttons.length) %
              buttons.length;
      buttons[next].focus();
      buttons[next].click();
    };
    choices.append(button);
    return button;
  });
  let previous = "";
  function sync() {
    const key = `${select.value}:${vehicleType()}`;
    if (key === previous) return;
    previous = key;
    buttons.forEach((button, index) => {
      const paint = VEHICLE_PAINTS[index],
        selected = paint.id === select.value;
      button.style.setProperty(
        "--paint-color",
        `#${paintColor(vehicleType(), paint.id).toString(16).padStart(6, "0")}`,
      );
      button.setAttribute("aria-checked", String(selected));
      button.tabIndex = selected ? 0 : -1;
      button.querySelector(".paint-check").hidden = !selected;
      if (selected) caption.textContent = paint.name;
    });
  }
  select.hidden = true;
  select.insertAdjacentElement("afterend", group);
  group.append(choices, caption);
  select.addEventListener("change", sync);
  sync();
  return { sync };
}
