import { VEHICLES, vehicleSpec } from "./vehicle-catalog.js";
import * as T from "three";
import { townCity, createTownMap } from "./town-map.js";
import { makeCozyWorld } from "./cozy-world.js";
import { palette } from "./pixel-art.js";
import { CityClock, activityAt } from "./schedule.js";
import { createStreetLife } from "./street-life.js";
import { bindHoldControls, needsRotation } from "./mobile.js";
import { nearestRoad, project } from "./geo.js";
import { stepGuest, nickname } from "./open-world.js";
import { Multiplayer } from "./network.js";
import { createActor, playerColor } from "./actors.js";
const $ = (id) => document.getElementById(id),
  city = townCity,
  map = { ...createTownMap(), style: "cozy" },
  keys = new Set(),
  actors = new Map();
let self = null,
  joined = false,
  paused = false,
  portraitBlocked = false,
  highCamera = false,
  noticeUntil = 0,
  sendElapsed = 0,
  hud = 0;
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
const world = makeCozyWorld(scene, map, city),
  streetLife = createStreetLife(scene, world.path, map);
camera.position.set(128, 58, 102);
for (const spec of VEHICLES) {
  const option = document.createElement("option");
  option.value = spec.id;
  option.textContent = spec.name;
  $("vehicle-type").append(option);
}
function resize() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight, false);
  const half = highCamera ? 50 : 25;
  camera.left = (-half * innerWidth) / innerHeight;
  camera.right = (half * innerWidth) / innerHeight;
  camera.top = half;
  camera.bottom = -half;
  camera.updateProjectionMatrix();
  portraitBlocked = needsRotation({
    width: innerWidth,
    height: innerHeight,
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
  stopInput();
  network.action(name, $("vehicle-type").value);
}
function enterExit() {
  action(self?.mode === "drive" ? "exit" : "enter");
}
function talk() {
  if (!self || paused || portraitBlocked) return;
  const vendor = streetLife.nearest(self);
  if (vendor && vendor.distance < 7 && Math.abs(self.speed) < 1.5)
    notify(`${vendor.food} vendor: “Fresh and ready! Enjoy the riverside.”`, 6);
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
      $("join-error").textContent = event.status;
      $("start").disabled = false;
      $("start").textContent = "Join as guest ↗";
      syncRoster([]);
      for (const actor of actors.values()) actor.dispose();
      actors.clear();
    }
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
    notify(
      event.action === "summon"
        ? "Your vehicle is parked nearby. Walk over and press E to enter."
        : event.action === "enter"
          ? "Ready to drive. Press E to get out."
          : "Back on foot. Explore anywhere on land.",
    );
  }
  if (event.type === "error") {
    notify(event.message);
    $("join-error").textContent = event.message;
    $("start").disabled = false;
    $("start").textContent = "Join as guest ↗";
  }
});
resize();
addEventListener("resize", resize);
addEventListener("orientationchange", resize);
$("guest-form").onsubmit = (event) => {
  event.preventDefault();
  const name = nickname($("nickname").value);
  if (name.length < 2) {
    $("join-error").textContent = "Please use 2–20 characters.";
    return;
  }
  $("start").disabled = true;
  $("start").textContent = "Joining…";
  $("join-error").textContent = "";
  network.connect(name);
};
try {
  $("nickname").value = localStorage.getItem("riverside-nickname") || "";
} catch {}
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
  $("pause-overlay").hidden = true;
  $("pause").disabled = $("leave").disabled = true;
  $("connection").textContent = "Not connected";
  $("start").disabled = false;
  $("start").textContent = "Join as guest ↗";
  $("join-error").textContent = "";
  syncRoster([]);
};
addEventListener("keydown", (event) => {
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
  const px = (x) => 140 + x * scale,
    pz = (z) => 140 + z * scale;
  ctx.fillStyle = "#d3c294";
  ctx.fillRect(0, 0, 280, 280);
  ctx.fillStyle = "#75a5ae";
  ctx.fillRect(px(96), 0, 280 - px(96), 280);
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
  const active = joined && network.id && !paused && !portraitBlocked;
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
  const focus = self || { x: 88, z: 12 };
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
    const can = Boolean(active && self),
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
      self?.mode === "drive" ? (self.speed < -0.2 ? "R" : "DRIVE") : "ON FOOT";
    $("touch-up").textContent = self?.mode === "drive" ? "GO ↑" : "↑";
    $("touch-down").textContent = self?.mode === "drive" ? "R ↓" : "↓";
    $("road-name").textContent =
      self && self.x > 79
        ? "Riverside promenade"
        : nearestRoad([focus.x, focus.z], map.roads).road.name;
    minimap();
  }
  if (now > noticeUntil) $("toast").style.opacity = 0;
  camera.updateMatrixWorld();
  for (const actor of actors.values())
    actor.projectLabel(camera, innerWidth, innerHeight);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
