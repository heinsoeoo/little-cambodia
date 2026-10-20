import { createAudio } from "./audio.js";
import { createIntro } from "./intro.js";
import { createMobileHUD, mobileViewport } from "./mobile-hud.js";
import { createWardrobe } from "./wardrobe-ui.js";
import { createPlayerVisibility } from "./player-visibility.js";
import { VEHICLES, vehicleSpec, vehiclePhysics } from "./vehicle-catalog.js";
import * as T from "three";
import { city, phnomMap, spawn, promenade } from "./phnom-map.js";
import { makeWorld } from "./world.js";
import { palette } from "./pixel-art.js";
import { CityClock, activityAt } from "./schedule.js";
import { createStreetLife } from "./street-life.js";
import {
  bindHoldControls,
  bindViewportGestures,
  needsRotation,
} from "./mobile.js";
import { nearestRoad, project } from "./geo.js";
import { stepGuest, nickname } from "./open-world.js";
import { Multiplayer } from "./network.js";
import { createActor, playerColor } from "./actors.js";
const $ = (id) => document.getElementById(id),
  map = phnomMap,
  keys = new Set(),
  actors = new Map();
let viewportWidth = innerWidth,
  viewportHeight = innerHeight;
let self = null,
  joined = false,
  paused = false,
  portraitBlocked = false,
  highCamera = false,
  noticeUntil = 0,
  sendElapsed = 0,
  hud = 0;
const audio = createAudio();
bindViewportGestures(document);
const clock = new CityClock(),
  clearTouch = bindHoldControls(document, keys);
const notify = (text, seconds = 4) => {
  $("toast").textContent = text;
  $("toast").style.opacity = 1;
  noticeUntil = performance.now() + seconds * 1000;
};
const scene = new T.Scene(),
  renderer = new T.WebGLRenderer({ canvas: $("world"), antialias: true }),
  camera = new T.OrthographicCamera(-50, 50, 30, -30, 0.1, 2200);
renderer.setPixelRatio(1);
renderer.outputColorSpace = T.SRGBColorSpace;
const ambient = new T.HemisphereLight(0xf8f3d9, 0x45645b, 1.7),
  sun = new T.DirectionalLight(0xffe2ac, 1.1);
sun.position.set(-200, 300, -100);
scene.add(ambient, sun);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -150;
sun.shadow.camera.right = 150;
sun.shadow.camera.top = 180;
sun.shadow.camera.bottom = -180;
sun.shadow.bias = -0.001;
const playerVisibility = createPlayerVisibility();
const wardrobe = createWardrobe();
const world = makeWorld(scene, map, city, { visibility: playerVisibility }),
  streetLife = createStreetLife(scene, world.path, map);
camera.position.set(spawn[0] + 40, 58, spawn[1] + 90);
for (const spec of VEHICLES) {
  const option = document.createElement("option");
  option.value = spec.id;
  option.textContent = spec.name;
  $("vehicle-type").append(option);
}
function vehicleStats() {
  const spec = vehiclePhysics($("vehicle-type").value);
  $("vehicle-stats").textContent =
    `${spec.power >= 11 ? "Lively" : spec.power >= 8 ? "Balanced" : "Gentle"} power · ${spec.braking >= 27 ? "Strong" : spec.braking >= 20 ? "Firm" : "Gentle"} brakes`;
}
$("vehicle-type").addEventListener("change", vehicleStats);
vehicleStats();
function resize() {
  const visual = window.visualViewport;
  viewportWidth = Math.round(
    visual && visual.scale <= 1.05 ? visual.width : innerWidth,
  );
  viewportHeight = Math.round(
    visual && visual.scale <= 1.05 ? visual.height : innerHeight,
  );
  document.documentElement.style.setProperty(
    "--game-width",
    `${viewportWidth}px`,
  );
  document.documentElement.style.setProperty(
    "--game-height",
    `${viewportHeight}px`,
  );
  const coarse =
    matchMedia("(pointer:coarse)").matches || navigator.maxTouchPoints > 0;
  mobileHUD.resize(
    mobileViewport({ width: viewportWidth, height: viewportHeight, coarse }),
  );
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(viewportWidth, viewportHeight, false);
  const half = highCamera ? 50 : 25;
  camera.left = (-half * viewportWidth) / viewportHeight;
  camera.right = (half * viewportWidth) / viewportHeight;
  camera.top = half;
  camera.bottom = -half;
  camera.updateProjectionMatrix();
  portraitBlocked = needsRotation({
    width: viewportWidth,
    height: viewportHeight,
    coarse:
      matchMedia("(pointer:coarse)").matches ||
      navigator.maxTouchPoints > 0 ||
      innerWidth <= 600,
  });
  $("rotate-overlay").hidden = !portraitBlocked;
  if (portraitBlocked) stopInput();
}
function stopInput() {
  keys.clear();
  clearTouch();
  network?.input(keys);
}
function pause() {
  if (!joined) return;
  mobileHUD.closeMenu();
  paused = !paused;
  stopInput();
  $("pause-overlay").hidden = !paused;
  $("pause").textContent = paused ? "Resume · P" : "Pause · P";
}
function zoom() {
  highCamera = !highCamera;
  resize();
}
function action(name) {
  if (!self || paused || portraitBlocked || !network.id) return;
  mobileHUD.closeMenu();
  stopInput();
  network.action(name, $("vehicle-type").value);
}
function enterExit() {
  action(self?.mode === "drive" ? "exit" : "enter");
}
function talk() {
  if (!self || paused || portraitBlocked) return;
  const vendor = streetLife.nearest(self);
  if (vendor && vendor.distance < 7 && Math.abs(self.speed) < 1.5) {
    audio.effect("talk");
    notify(`${vendor.food} vendor: “Fresh and ready! Enjoy the riverside.”`, 6);
  }
}
function syncRoster(players) {
  $("online").textContent = `${players.length} / 16 guests online`;
  $("roster").replaceChildren(
    ...players.map((p) => {
      const li = document.createElement("li");
      li.textContent = `${p.nickname}${p.id === network.id ? " (you)" : ""} · ${p.mode === "drive" ? "driving" : "walking"}`;
      return li;
    }),
  );
}
const network = new Multiplayer((event) => {
  if (event.type === "connection") {
    $("connection").textContent = event.status;
    if (!network.id) {
      self = null;
      joined = false;
      $("welcome").hidden = false;
      $("nickname").disabled = false;
      $("wardrobe").disabled = true;
      $("wardrobe-close").hidden = true;
      wardrobe.show("main");
      $("join-error").textContent = event.status;
      $("start").disabled = event.status === "Connecting…";
      $("start").textContent =
        event.status === "Connecting…" ? "Joining…" : "Start game ↗";
      syncRoster([]);
      for (const actor of actors.values()) actor.dispose();
      actors.clear();
    }
  }
  if (event.type === "customized") {
    self.appearance = event.player.appearance;
    self.preferredVehicle = event.player.preferredVehicle;
    $("vehicle-type").value = self.preferredVehicle;
    vehicleStats();
    const profile = {
      appearance: self.appearance,
      vehicleType: self.preferredVehicle,
    };
    wardrobe.save(profile);
    network.joinOptions = profile;
    $("welcome").hidden = true;
    paused = false;
    $("start").disabled = false;
    notify("Your new look is ready. Everyone in town can see it.");
  }
  if (event.type === "welcome") {
    self = structuredClone(event.player);
    joined = true;
    paused = false;
    $("welcome").hidden = true;
    $("pause-overlay").hidden = true;
    $("pause").disabled = $("leave").disabled = false;
    $("connection").textContent = "● Connected";
    $("player-name").textContent = self.nickname;
    $("wardrobe").disabled = false;
    $("vehicle-type").value =
      self.preferredVehicle || wardrobe.read().vehicleType;
    vehicleStats();
    $("join-error").textContent = "";
    camera.position.set(self.x + 40, 58, self.z + 90);
    try {
      localStorage.setItem("riverside-nickname", self.nickname);
    } catch {}
    notify(`Welcome, ${self.nickname}. The riverside is yours to explore.`);
  }
  if (event.type === "state") {
    const mine = event.players.find((p) => p.id === network.id);
    if (mine) {
      if (
        !self ||
        mine.mode !== self.mode ||
        Math.hypot(mine.x - self.x, mine.z - self.z) > 1.5
      )
        self = structuredClone(mine);
      else {
        self.appearance = structuredClone(mine.appearance);
        self.x += (mine.x - self.x) * 0.2;
        self.z += (mine.z - self.z) * 0.2;
        self.vehicle = structuredClone(mine.vehicle);
        if (self.mode === "drive" && self.vehicle) {
          self.vehicle.x = self.x;
          self.vehicle.z = self.z;
        }
      }
    }
    const ids = new Set(event.players.map((p) => p.id));
    for (const [id, actor] of actors)
      if (!ids.has(id)) {
        actor.dispose();
        actors.delete(id);
      }
    syncRoster(event.players);
  }
  if (event.type === "action") {
    self = structuredClone(event.player);
    audio.effect(event.action);
    notify(
      event.action === "summon"
        ? document.body.classList.contains("mobile-ui")
          ? "Your vehicle is nearby. Walk over and tap Enter vehicle."
          : "Your vehicle is parked nearby. Walk over and press E to enter."
        : event.action === "enter"
          ? document.body.classList.contains("mobile-ui")
            ? "Ready to drive. Tap Get out when parked."
            : "Ready to drive. Press E to get out."
          : "Back on foot. Explore anywhere on land.",
    );
  }
  if (event.type === "error") {
    notify(event.message);
    $("join-error").textContent = event.message;
    $("start").disabled = false;
    $("start").textContent = joined ? "Save look" : "Start game ↗";
  }
});
const mobileHUD = createMobileHUD({
  clearInput: stopInput,
  onTalk: talk,
  onPrimary: () => {
    if (!self) return;
    if (self.mode === "drive") action("exit");
    else if (
      self.vehicle &&
      Math.hypot(self.x - self.vehicle.x, self.z - self.vehicle.z) <= 4
    )
      action("enter");
    else action("summon");
  },
});
const intro = createIntro({
  onOpen: () => {
    stopInput();
    audio.setIntro(true);
  },
  onClose: () => audio.setIntro(false),
  onCard: (index) => audio.setIntroCard(index),
});
resize();
window.visualViewport?.addEventListener("resize", resize);
addEventListener("resize", resize);
addEventListener("orientationchange", resize);
$("guest-form").onsubmit = (event) => {
  event.preventDefault();
  const name = nickname($("nickname").value);
  if (name.length < 2) {
    wardrobe.show("main");
    $("join-error").textContent = "Please use 2–20 characters.";
    return;
  }
  if (!$("look-gender").value) {
    wardrobe.show("main");
    $("join-error").textContent = "Please choose your gender.";
    $("look-gender").focus();
    return;
  }
  $("start").disabled = true;
  $("start").textContent = joined ? "Saving…" : "Joining…";
  $("join-error").textContent = "";
  const profile = wardrobe.read();
  if (joined && self) {
    network.send({ type: "customize", ...profile });
  } else {
    wardrobe.save(profile);
    $("vehicle-type").value = profile.vehicleType;
    network.connect(name, profile);
  }
};
try {
  $("nickname").value = localStorage.getItem("riverside-nickname") || "";
} catch {}
$("wardrobe").onclick = () => {
  if (!self) return;
  mobileHUD.closeMenu();
  stopInput();
  paused = true;
  wardrobe.load({
    appearance: self.appearance,
    vehicleType: $("vehicle-type").value,
  });
  $("nickname").value = self.nickname;
  $("nickname").disabled = true;
  $("pause-overlay").hidden = true;
  $("pause").textContent = "Pause · P";
  $("join-error").textContent = "";
  wardrobe.show("outfit");
  $("start").textContent = "Save look";
  $("start").disabled = false;
  $("wardrobe-close").hidden = false;
  $("welcome").hidden = false;
};
$("wardrobe-close").onclick = () => {
  $("welcome").hidden = true;
  paused = false;
  $("join-error").textContent = "";
};
$("summon").onclick = () => action("summon");
$("interact").onclick = enterExit;
$("camera").onclick = zoom;
$("pause").onclick = $("resume").onclick = pause;
$("vendor").onclick = talk;
$("time-mode").onchange = () => clock.setMode($("time-mode").value);
$("leave").onclick = () => {
  network.disconnect();
  self = null;
  joined = false;
  paused = false;
  stopInput();
  for (const actor of actors.values()) actor.dispose();
  actors.clear();
  $("welcome").hidden = false;
  $("nickname").disabled = false;
  $("wardrobe").disabled = true;
  $("wardrobe-close").hidden = true;
  wardrobe.show("main");
  $("pause-overlay").hidden = true;
  $("pause").disabled = $("leave").disabled = true;
  $("connection").textContent = "Not connected";
  $("start").disabled = false;
  $("start").textContent = "Start game ↗";
  $("join-error").textContent = "";
  syncRoster([]);
};
addEventListener("keydown", (event) => {
  if (!$("welcome").hidden) return;
  if (["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName)) return;
  if (
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)
  )
    event.preventDefault();
  keys.add(event.key.toLowerCase());
  if (event.repeat) return;
  const key = event.key.toLowerCase();
  if (key === "e") enterExit();
  if (key === "f") action("summon");
  if (key === "p") pause();
  if (key === "c") zoom();
  if (key === "v") talk();
});
addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
addEventListener("blur", () => {
  stopInput();
  if (joined && !paused) pause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopInput();
    if (joined && !paused) pause();
  }
});
addEventListener("pagehide", () => network.disconnect());
const ctx = $("map").getContext("2d"),
  west = project(city.bounds[0], city.bounds[3], city.origin),
  east = project(city.bounds[2], city.bounds[1], city.origin),
  scale = 260 / Math.max(east[0] - west[0], east[1] - west[1]);
function minimap() {
  const px = (x) => 10 + (x - west[0]) * scale,
    pz = (z) => 10 + (z - west[1]) * scale;
  ctx.fillStyle = "#d3c294";
  ctx.fillRect(0, 0, 280, 280);
  ctx.fillStyle = "#75a5ae";
  for (const water of map.water) {
    ctx.beginPath();
    water.points.forEach((p, i) =>
      i ? ctx.lineTo(px(p[0]), pz(p[1])) : ctx.moveTo(px(p[0]), pz(p[1])),
    );
    ctx.fill();
  }
  for (const road of map.roads) {
    ctx.strokeStyle = "#8d7656";
    ctx.lineWidth = Math.max(1, road.width * scale);
    ctx.beginPath();
    road.points.forEach((p, i) =>
      i ? ctx.lineTo(px(p[0]), pz(p[1])) : ctx.moveTo(px(p[0]), pz(p[1])),
    );
    ctx.stroke();
  }
  ctx.fillStyle = "#b77955";
  for (const b of map.buildings) {
    ctx.beginPath();
    b.points.forEach((p, i) =>
      i ? ctx.lineTo(px(p[0]), pz(p[1])) : ctx.moveTo(px(p[0]), pz(p[1])),
    );
    ctx.fill();
  }
  for (const p of network.players) {
    const actual = p.id === network.id && self ? self : p;
    if (p.vehicle) {
      ctx.fillStyle = "#7a5962";
      ctx.fillRect(px(p.vehicle.x) - 2, pz(p.vehicle.z) - 2, 4, 4);
    }
    ctx.fillStyle =
      p.id === network.id ? "#fff8d0" : `#${playerColor(p.id).toString(16)}`;
    ctx.beginPath();
    ctx.arc(
      px(actual.x),
      pz(actual.z),
      p.id === network.id ? 4 : 3,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}
let previous = performance.now(),
  accumulator = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - previous) / 1000, 0.1);
  previous = now;
  const ready = Boolean(joined && network.id && !paused && !portraitBlocked);
  const active = ready && !mobileHUD.isOpen && !intro.active;
  audio.update(dt, self, keys, active);
  accumulator += dt;
  while (accumulator >= 1 / 60) {
    if (active && self) stepGuest(self, keys, 1 / 60);
    accumulator -= 1 / 60;
  }
  sendElapsed += dt;
  if (sendElapsed >= 0.05) {
    sendElapsed = 0;
    if (network.id) network.input(active ? keys : new Set());
  }
  clock.tick(active ? dt : 0);
  const time = clock.read(),
    activity = activityAt(time);
  streetLife.update(dt, time);
  world.facades.setNight(activity.night);
  renderer.setClearColor(activity.night ? palette.night : palette.sky);
  for (const player of network.players) {
    let actor = actors.get(player.id);
    if (!actor) {
      actor = createActor(scene, player);
      actors.set(player.id, actor);
    }
    actor.update(
      player.id === network.id && self ? self : player,
      dt,
      player.id === network.id,
    );
  }
  const focus = self || { x: spawn[0], z: spawn[1] };
  camera.position.lerp(
    new T.Vector3(focus.x + 40, 58, focus.z + 90),
    1 - Math.exp(-dt * 7),
  );
  camera.lookAt(camera.position.x - 40, 0, camera.position.z - 90);
  hud += dt;
  if (hud > 0.15) {
    hud = 0;
    $("clock").textContent =
      `${time.label} · Phnom Penh${clock.mode === "now" ? "" : " · local preview"}`;
    $("activity").textContent = `${activity.label} · ${activity.people} locals`;
    $("player-mode").textContent = self
      ? self.mode === "walk"
        ? "On foot · wander the streets, gardens and promenade."
        : "Driving · park anywhere clear and get out to explore."
      : "Join the town to explore on foot.";
    const can = Boolean(ready && self),
      distance = self?.vehicle
        ? Math.hypot(self.x - self.vehicle.x, self.z - self.vehicle.z)
        : null;
    $("summon").disabled = !can || self.mode === "drive";
    $("interact").disabled =
      !can || (self.mode === "walk" && (distance === null || distance > 4));
    $("interact").textContent =
      self?.mode === "drive" ? "Get out · E" : "Enter vehicle · E";
    $("vehicle-distance").textContent =
      distance === null
        ? "No vehicle summoned. Walking is the default."
        : self.mode === "drive"
          ? "Your personal vehicle · not a taxi"
          : `Your ${vehicleSpec(self.vehicle.type).name} · ${Math.round(distance)} m away`;
    const vendor = self ? streetLife.nearest(self) : null;
    $("vendor").disabled =
      !can || !vendor || vendor.distance >= 7 || Math.abs(self.speed) >= 1.5;
    $("vendor").textContent =
      vendor && vendor.distance < 7
        ? `Talk · ${vendor.food}`
        : "Talk to vendor · V";
    $("speed").textContent = String(
      Math.round(Math.abs(self?.speed || 0) * 3.6),
    ).padStart(2, "0");
    $("gear").textContent =
      self?.mode === "drive"
        ? self.speed < -0.2
          ? "R"
          : self.vehicle?.drifting
            ? "DRIFT"
            : "DRIVE"
        : "ON FOOT";
    $("touch-up").textContent = self?.mode === "drive" ? "GO ↑" : "↑";
    $("touch-down").textContent = self?.mode === "drive" ? "R ↓" : "↓";
    $("road-name").textContent =
      self &&
      nearestRoad([self.x, self.z], [{ points: promenade }]).distance < 10
        ? "Riverside promenade"
        : nearestRoad([focus.x, focus.z], map.roads).road.name;
    mobileHUD.update(self, can, !$("welcome").hidden, vendor);
    minimap();
  }
  if (now > noticeUntil) $("toast").style.opacity = 0;
  sun.position.set(focus.x - 120, 180, focus.z - 80);
  sun.target.position.set(focus.x, 0, focus.z);
  sun.target.updateMatrixWorld();
  camera.updateMatrixWorld();
  for (const actor of actors.values())
    actor.projectLabel(camera, viewportWidth, viewportHeight);
  playerVisibility.update(
    camera,
    self,
    viewportWidth,
    viewportHeight,
    renderer.getPixelRatio(),
    Boolean(joined && self),
  );
  renderer.render(scene, camera);
  wardrobe.render(now);
}
requestAnimationFrame(frame);
