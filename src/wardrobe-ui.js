import * as T from "three";
import {
  GENDERS,
  SKIN_TONES,
  STYLES,
  appearance,
  preset,
  style,
} from "./wardrobe.js";
import { VEHICLES, vehicleSpec } from "./vehicle-catalog.js";
import { createCharacter, disposeMeshes } from "./character.js";
import { vehicleModel } from "./vehicle-model.js";
export function createWardrobe() {
  const $ = (id) => document.getElementById(id);
  function fill(id, items, placeholder) {
    const select = $(id);
    if (placeholder) select.add(new Option(placeholder, ""));
    for (const item of items) select.add(new Option(item.name, item.id));
  }
  fill("look-gender", GENDERS, "Choose your gender");
  fill("look-skin", SKIN_TONES);
  fill("look-preset", [{ id: "mix", name: "My own mix" }, ...STYLES]);
  for (const part of ["hair", "top", "bottom", "shoes"])
    fill(
      `look-${part}`,
      STYLES.map((s) => ({
        id: s.id,
        name: `${s.name} · ${part === "hair" ? s.hairShape : part === "top" ? s.topShape : part === "bottom" ? s.bottomShape : s.shoeShape}`,
      })),
    );
  fill("look-vehicle", VEHICLES);
  const canvas = $("look-preview"),
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(34, 1, 0.1, 100);
  scene.add(new T.HemisphereLight(0xfff1dc, 0x7c8e82, 2));
  const sun = new T.DirectionalLight(0xffe1b8, 1.7);
  sun.position.set(-3, 8, 5);
  scene.add(sun);
  const stage = new T.Mesh(
    new T.CylinderGeometry(4.3, 4.5, 0.18, 48),
    new T.MeshLambertMaterial({ color: 0xd7c5a8 }),
  );
  stage.position.y = -0.16;
  scene.add(stage);
  const character = createCharacter();
  scene.add(character.group);
  let vehicle,
    vehicleType,
    lastWidth = 0,
    lastHeight = 0,
    mode = "main",
    custom = false;
  function read() {
    return {
      appearance: appearance(
        Object.fromEntries(
          ["gender", "skin", "hair", "top", "bottom", "shoes"].map((part) => [
            part,
            $(`look-${part}`).value,
          ]),
        ),
      ),
      vehicleType: $("look-vehicle").value,
    };
  }
  function editorTab(value) {
    custom = value;
    $("outfit-set-fields").hidden = custom;
    $("outfit-custom-fields").hidden = !custom;
    $("outfit-set-tab").setAttribute("aria-pressed", String(!custom));
    $("outfit-custom-tab").setAttribute("aria-pressed", String(custom));
  }
  function show(value = "main") {
    mode = value;
    const detail = mode === "outfit";
    $("welcome").classList.toggle("creator-detail", detail);
    $("setup-main").hidden = detail;
    $("outfit-editor").hidden = !detail;
    $("creator-back").hidden = !detail;
    $("creator-title").textContent = detail
      ? "Your outfit. Your way."
      : "Your city. Your style.";
    character.group.visible = true;
    if (vehicle) vehicle.visible = !detail;
    $("look-preview").setAttribute(
      "aria-label",
      detail ? "3D character preview" : "Your selected character and vehicle",
    );
    $("look-vehicle-name").hidden = detail;
    if (detail) {
      character.group.position.set(0, 0, 0);
      character.group.scale.setScalar(1.2);
      camera.position.set(2.9, 2.1, 4.8);
      camera.lookAt(0, 1.05, 0);
      stage.scale.set(0.34, 1, 0.34);
    } else {
      character.group.position.set(-2, 0, 0);
      character.group.scale.setScalar(1.55);
      camera.position.set(7, 4.2, 10);
      camera.lookAt(0, 0.9, 0);
      stage.scale.set(1, 1, 1);
    }
  }
  function update() {
    const profile = read(),
      look = profile.appearance;
    character.setAppearance(look);
    if (profile.vehicleType !== vehicleType) {
      if (vehicle) {
        scene.remove(vehicle);
        disposeMeshes(vehicle);
      }
      vehicleType = profile.vehicleType;
      vehicle = vehicleModel(vehicleType);
      vehicle.position.set(1.25, 0, -0.2);
      vehicle.rotation.y = -0.3;
      scene.add(vehicle);
      vehicle.visible = mode === "main";
    }
    $("look-summary").textContent =
      `${style(look.top).name} top · ${style(look.bottom).name} bottom · ${style(look.hair).name} hair · ${style(look.shoes).name} shoes`;
    $("look-vehicle-name").textContent = vehicleSpec(profile.vehicleType).name;
    $("outfit-open").textContent =
      ($("look-preset").value === "mix"
        ? "Custom outfit"
        : `${style(look.top).name} set`) + " · Choose outfit →";
  }
  function load(profile, requireGender = false) {
    const look = appearance(profile?.appearance);
    for (const [part, value] of Object.entries(look))
      $(`look-${part}`).value = value;
    if (requireGender) $("look-gender").value = "";
    $("look-vehicle").value = VEHICLES.some(
      (v) => v.id === profile?.vehicleType,
    )
      ? profile.vehicleType
      : "corolla";
    $("look-preset").value = ["top", "bottom", "hair", "shoes"].every(
      (part) => look[part] === look.top,
    )
      ? look.top
      : "mix";
    editorTab($("look-preset").value === "mix");
    update();
  }
  $("outfit-open").onclick = () => show("outfit");
  $("creator-back").onclick = () => show("main");
  $("outfit-set-tab").onclick = () => editorTab(false);
  $("outfit-custom-tab").onclick = () => editorTab(true);
  $("look-preset").onchange = () => {
    if ($("look-preset").value === "mix") {
      editorTab(true);
      return;
    }
    const missing = !$("look-gender").value;
    load(
      {
        ...read(),
        appearance: preset($("look-preset").value, read().appearance),
      },
      missing,
    );
  };
  for (const part of [
    "gender",
    "skin",
    "hair",
    "top",
    "bottom",
    "shoes",
    "vehicle",
  ])
    $(`look-${part}`).addEventListener("change", () => {
      if (["hair", "top", "bottom", "shoes"].includes(part))
        $("look-preset").value = "mix";
      update();
    });

  let saved;
  try {
    saved = JSON.parse(localStorage.getItem("phnom-profile"));
  } catch {}
  load(saved, !saved);
  show("main");
  return {
    read,
    load,
    show,
    save(profile = read()) {
      try {
        localStorage.setItem("phnom-profile", JSON.stringify(profile));
      } catch {}
    },
    render(time) {
      if ($("welcome").hidden) return;
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      if (width !== lastWidth || height !== lastHeight) {
        lastWidth = width;
        lastHeight = height;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
      character.group.rotation.y = 0.2 + Math.sin(time / 3000) * 0.35;
      renderer.render(scene, camera);
    },
  };
}
