export function createGenderPicker(select) {
  const choices = [...select.options].filter((option) => option.value);
  const group = document.createElement("div");
  group.className = "gender-icons";
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-label", "Gender");
  const symbols = ["♂", "♀", "○"];
  const buttons = choices.map((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "radio");
    button.setAttribute("aria-label", option.textContent);
    button.title = option.textContent;
    button.dataset.gender = option.value;
    const icon = document.createElement("span");
    icon.textContent = symbols[index];
    icon.setAttribute("aria-hidden", "true");
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
