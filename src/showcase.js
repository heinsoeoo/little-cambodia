import { finishRenderer } from "./art-direction.js";
import { collectionFor } from "./collections.js";
import * as T from "three";
import { createCharacter, disposeMeshes } from "./character.js";
import { vehicleModel } from "./vehicle-model.js";
import { preset } from "./wardrobe.js";

// One shared renderer makes still portraits; cards never run animation loops.
export function createShowcases(readAppearance) {
  let renderer;
  const jobs = new WeakMap();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        if (entry.isIntersecting) {
          const job = jobs.get(entry.target);
          if (job) {
            job();
            jobs.delete(entry.target);
          }
          observer.unobserve(entry.target);
        }
    },
    { rootMargin: "80px" },
  );
  function portrait(image, type, value) {
    try {
      renderer ||= new T.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(240, 180);
      finishRenderer(renderer);
      const scene = new T.Scene();
      scene.add(new T.HemisphereLight(0xfff3df, 0x718c80, 2.3));
      const light = new T.DirectionalLight(0xffffff, 2);
      light.position.set(4, 8, 6);
      scene.add(light);
      const vehicle = type === "vehicle";
      let model;
      if (vehicle) model = vehicleModel(value);
      else {
        const look = readAppearance();
        const next =
          type === "outfit" ? preset(value, look) : { ...look, [type]: value };
        model = createCharacter(next).group;
      }
      scene.add(model);
      const camera = new T.PerspectiveCamera(32, 4 / 3, 0.1, 50);
      camera.position.set(
        vehicle ? 6 : 2.3,
        vehicle ? 3.6 : 1.8,
        vehicle ? 7 : 3.7,
      );
      camera.lookAt(0, vehicle ? 0.9 : 1, 0);
      if (type === "hair") {
        camera.position.set(0.55, 1.92, 1.2);
        camera.lookAt(0, 1.8, 0);
      }
      if (type === "shoes") {
        camera.position.set(0.8, 0.65, 1.6);
        camera.lookAt(0, 0.15, 0);
      }
      if (type === "top") {
        camera.position.set(1.2, 1.65, 2.1);
        camera.lookAt(0, 1.1, 0);
      }
      if (type === "bottom") {
        camera.position.set(1.1, 1, 2);
        camera.lookAt(0, 0.5, 0);
      }
      renderer.render(scene, camera);
      image.src = renderer.domElement.toDataURL("image/png");
      disposeMeshes(model);
    } catch {
      image.alt = "Preview unavailable";
    }
  }
  function attach(select, type) {
    if (!select || select.dataset.showcase) return;
    select.dataset.showcase = "true";
    const rail = document.createElement("div");
    rail.className = "showcase-rail";
    rail.setAttribute("role", "group");
    rail.setAttribute(
      "aria-label",
      `${select.labels?.[0]?.textContent || "Choose"} showcase`,
    );
    for (const option of select.options) {
      if (!option.value || option.value === "mix") continue;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "showcase-card";
      card.dataset.value = option.value;
      const image = document.createElement("img");
      image.alt = "";
      image.width = 160;
      image.height = 120;
      const label = document.createElement("span");
      label.textContent = option.textContent.split(" · ")[0];
      card.append(image, label);
      card.onclick = () => {
        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      };
      rail.append(card);
      jobs.set(card, () => portrait(image, type, option.value));
      observer.observe(card);
    }
    function sync() {
      for (const card of rail.children)
        card.setAttribute(
          "aria-pressed",
          String(card.dataset.value === select.value),
        );
    }
    select.addEventListener("change", sync);
    select.insertAdjacentElement("afterend", rail);
    if (["outfit", "vehicle"].includes(type)) {
      const filters = document.createElement("div");
      filters.className = "showcase-filters";
      filters.setAttribute("aria-label", "Style collections");
      for (const name of ["All", "Cute", "Cool", "Classic"]) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = name;
        button.setAttribute("aria-pressed", String(name === "All"));
        button.onclick = () => {
          for (const other of filters.children)
            other.setAttribute("aria-pressed", String(other === button));
          for (const card of rail.children)
            card.hidden =
              name !== "All" &&
              collectionFor(type, card.dataset.value) !== name;
          rail.scrollTo({ left: 0, behavior: "smooth" });
        };
        filters.append(button);
      }
      rail.before(filters);
    }
    select.classList.add("showcase-select");
    sync();
    return {
      sync,
      refresh() {
        for (const card of rail.children) {
          const option = [...select.options].find(
            (item) => item.value === card.dataset.value,
          );
          if (option)
            card.querySelector("span").textContent =
              option.textContent.split(" · ")[0];
          jobs.set(card, () =>
            portrait(card.querySelector("img"), type, card.dataset.value),
          );
          observer.observe(card);
        }
        sync();
      },
    };
  }
  return { attach };
}
