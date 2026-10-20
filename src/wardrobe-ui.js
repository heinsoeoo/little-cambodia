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
  const fill = (id, items, placeholder) => {
    const select = $(id);
    if (placeholder) {
      const o = new Option(placeholder, "");
      select.add(o);
    }
    for (const item of items) select.add(new Option(item.name, item.id));
  };
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
  camera.position.set(7, 4.2, 10);
  camera.lookAt(0, 0.9, 0);
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
  character.group.position.x = -2;
  character.group.scale.setScalar(1.55);
  character.group.rotation.y = 0.35;
  scene.add(character.group);
  let vehicle,
    vehicleType,
    lastWidth = 0,
    lastHeight = 0;
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
  function update() {
    const profile = read();
    character.setAppearance(profile.appearance);
    if (profile.vehicleType !== vehicleType) {
      if (vehicle) {
        scene.remove(vehicle);
        disposeMeshes(vehicle);
      }
      vehicleType = profile.vehicleType;
      vehicle = vehicleModel(vehicleType);
      vehicle.position.set(1.25, 0, -0.2);
      vehicle.rotation.y = -0.4;
      scene.add(vehicle);
    }
    const look = profile.appearance;
    $("look-summary").textContent =
      `${style(look.top).name} top · ${style(look.bottom).name} bottom · ${style(look.hair).name} hair · ${style(look.shoes).name} shoes`;
    $("look-vehicle-name").textContent = vehicleSpec(profile.vehicleType).name;
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
    update();
  }
  $("look-preset").addEventListener("change", () => {
    if ($("look-preset").value === "mix") return;
    load(
      {
        ...read(),
        appearance: preset($("look-preset").value, read().appearance),
      },
      !$("look-gender").value,
    );
  });
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
  return {
    read,
    load,
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
      // A gentle turn makes the individual pieces readable before joining.
      character.group.rotation.y = 0.35 + Math.sin(time / 3000) * 0.2;
      renderer.render(scene, camera);
    },
  };
}
