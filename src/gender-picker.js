export function createGenderPicker(select) {
  const choices = [...select.options].filter((option) => option.value);
  const group = document.createElement("div");
  group.className = "gender-icons";
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-label", "Gender");
  const shapes = [
    [
      ["circle", { cx: 9, cy: 15, r: 5 }],
      ["path", { d: "m12.5 11.5 7-7M14 4.5h5.5V10" }],
    ],
    [
      ["circle", { cx: 12, cy: 8.5, r: 5 }],
      ["path", { d: "M12 13.5v7M8.5 17h7" }],
    ],
    [
      ["circle", { cx: 12, cy: 7.5, r: 3.5 }],
      ["path", { d: "M5 20v-2a7 6 0 0 1 14 0v2" }],
    ],
  ];
  const buttons = choices.map((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "radio");
    button.setAttribute("aria-label", option.textContent);
    button.title = option.textContent;
    button.dataset.gender = option.value;
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    for (const [name, value] of Object.entries({
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "1.8",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
    }))
      icon.setAttribute(name, value);
    for (const [tag, attributes] of shapes[index]) {
      const shape = document.createElementNS("http://www.w3.org/2000/svg", tag);
      for (const [name, value] of Object.entries(attributes))
        shape.setAttribute(name, String(value));
      icon.append(shape);
    }
    button.append(icon);
    button.onclick = () => {
      select.value = option.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      sync();
    };
    button.onkeydown = (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const next =
        (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) %
        buttons.length;
      buttons[next].focus();
      buttons[next].click();
    };
    group.append(button);
    return button;
  });
  let previous;
  function sync() {
    if (previous === select.value) return;
    previous = select.value;
    buttons.forEach((button, index) => {
      const active = button.dataset.gender === select.value;
      button.setAttribute("aria-checked", String(active));
      button.tabIndex = active || (!select.value && index === 0) ? 0 : -1;
    });
  }
  select.hidden = true;
  select.after(group);
  select.addEventListener("change", sync);
  sync();
  return { sync };
}
