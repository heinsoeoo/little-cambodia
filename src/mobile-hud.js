import { translate } from "./i18n.js";
export function mobileViewport({ width, height, coarse }) {
  return coarse || width <= 900 || (height <= 500 && width <= 1200);
}
export function createMobileHUD({ clearInput, onPrimary, onTalk }) {
  const $ = (id) => document.getElementById(id),
    header = document.querySelector("header");
  const actions = [
    "activities-open",
    "snacks-open",
    "camera",
    "pause",
    "wardrobe",
    "leave",
    "feedback",
  ].map($);
  function placeSound(creating) {
    const sound = $("game-sound");
    const target = creating
      ? $("creator-utilities")
      : mobile
        ? $("mobile-menu-actions")
        : header;
    if (sound && target && sound.parentElement !== target) target.append(sound);
  }
  function controlSize(value) {
    const size = value === "extra" ? "extra" : "large";
    document.body.dataset.controlSize = size;
    $("control-size").value = size;
    try {
      localStorage.setItem("little-cambodia-control-size", size);
    } catch {}
  }
  let savedSize;
  try {
    savedSize = localStorage.getItem("little-cambodia-control-size");
  } catch {}
  controlSize(savedSize);
  $("control-size").onchange = () => controlSize($("control-size").value);
  let mobile = false,
    menuOpen = false;
  function closeMenu() {
    if (menuOpen) clearInput();
    menuOpen = false;
    document.body.classList.remove("mobile-menu-open");
    $("mobile-menu-toggle").setAttribute("aria-expanded", "false");
  }
  function setMenu(open) {
    clearInput();
    menuOpen = open;
    document.body.classList.toggle("mobile-menu-open", open);
    $("mobile-menu-toggle").setAttribute("aria-expanded", String(open));
  }
  $("mobile-menu-toggle").onclick = () => setMenu(!menuOpen);
  $("mobile-menu-close").onclick = () => {
    setMenu(false);
    $("mobile-menu-toggle").focus();
  };
  $("mobile-map-toggle").onclick = () => {
    closeMenu();
    const open = document.body.classList.toggle("mobile-map-open");
    $("mobile-map-toggle").setAttribute("aria-pressed", String(open));
  };
  $("mobile-primary").onclick = () => {
    clearInput();
    onPrimary();
  };
  $("mobile-talk").onclick = onTalk;
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
  document.body.classList.toggle("ui-creating", !$("welcome").hidden);
  placeSound(!$("welcome").hidden);
  return {
    get isOpen() {
      return mobile && menuOpen;
    },
    closeMenu,
    resize(value) {
      if (value === mobile) return;
      mobile = value;
      const questAction = $("activity-action");
      if (mobile)
        document.querySelector(".mobile-context").prepend(questAction);
      else $("activity-action-home").append(questAction);
      placeSound(!$("welcome").hidden);
      document.body.classList.toggle("mobile-ui", mobile);
      closeMenu();
      if (!mobile) {
        $("camera").textContent = "Zoom · C";
        $("pause").textContent = !$("pause-overlay").hidden
          ? "Resume · P"
          : "Pause · P";
      }
      for (const button of actions)
        if (mobile) $("mobile-menu-actions").append(button);
        else header.insertBefore(button, $("mobile-map-toggle"));
    },
    update(state, can, creating, vendor) {
      placeSound(creating);
      document.body.classList.toggle("in-town", Boolean(state));
      document.body.classList.toggle("ui-creating", creating);
      document.body.dataset.playMode = state?.mode || "walk";
      if (creating) closeMenu();
      $("camera").textContent = mobile ? "Zoom" : "Zoom · C";
      $("pause").textContent = !$("pause-overlay").hidden
        ? mobile
          ? "Resume"
          : "Resume · P"
        : mobile
          ? "Pause"
          : "Pause · P";
      $("summon").textContent = mobile
        ? "Summon vehicle"
        : "Summon vehicle · F";
      if (mobile)
        for (const id of ["interact", "vendor"]) {
          const element = $(id);
          element.textContent = element.textContent.replace(/ · [A-Z]$/, "");
        }
      $("mobile-status").textContent = state
        ? `${state.nickname} · ${translate(state.mode === "drive" ? "Driving" : "On foot")}`
        : "";
      const distance = state?.vehicle
        ? Math.hypot(state.x - state.vehicle.x, state.z - state.vehicle.z)
        : Infinity;
      $("mobile-primary").disabled = !can;
      $("mobile-primary").textContent =
        state?.mode === "drive"
          ? "Get out"
          : !state?.vehicle
            ? "Summon vehicle"
            : distance <= 4
              ? "Enter vehicle"
              : "Bring vehicle here";
      $("mobile-talk").hidden =
        !can || !vendor || vendor.distance >= 7 || Math.abs(state.speed) >= 1.5;
      $("mobile-talk").textContent = "Shop";
      $("mobile-talk").setAttribute(
        "aria-label",
        vendor ? `Shop · ${vendor.food}` : "Shop",
      );
      $("mobile-primary").setAttribute(
        "aria-label",
        $("mobile-primary").textContent,
      );
    },
  };
}
