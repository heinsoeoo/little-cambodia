import { finishRenderer } from "./art-direction.js";
import { createDungeonUI } from "./dungeon-ui.js";
import { followCamera } from "./camera-follow.js";
import { createVoiceChat } from "./voice-chat.js";
import { BENCHES } from "./open-world.js";
import { nearestBench } from "./benches.js";
import { createPwa } from "./pwa.js";
import { createCameraZoom } from "./camera-zoom.js";
import { LocalPrediction, INPUT_STEP } from "./prediction.js";
import { createCityGuide } from "./city-guide.js";
import { createCityMap } from "./map-ui.js";
import { createActivities } from "./activities-ui.js";
import { createLanguage, translate } from "./i18n.js";
import { places, nearestPlace } from "./places.js";
import { createBrowserNotice } from "./browser-notice.js";
import { createAudio } from "./audio.js";
import { createIntroCouple } from "./intro-couple.js";
import { createIntro } from "./intro.js";
import { createMobileHUD, mobileViewport } from "./mobile-hud.js";
import { createWardrobe } from "./wardrobe-ui.js";
import { createPlayerVisibility } from "./player-visibility.js";
import {
  VEHICLES,
  vehicleSpec,
  vehiclePhysics,
  VEHICLE_PAINTS,
  vehiclePaint,
} from "./vehicle-catalog.js";
import * as T from "three";
import { city, phnomMap, spawn, promenade, bounds } from "./phnom-map.js";
import { makeWorld } from "./world.js";
import { palette } from "./pixel-art.js";
import { CityClock, activityAt, GAME_TIME_RATE } from "./schedule.js";
import { createStreetLife } from "./street-life.js";
import {
  bindHoldControls,
  bindWalkingJoystick,
  bindViewportGestures,
  needsRotation,
} from "./mobile.js";
import { nearestRoad } from "./geo.js";
import { nickname } from "./open-world.js";
import { Multiplayer } from "./network.js";
import { createActor } from "./actors.js";
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
  noticeUntil = 0,
  hud = 0;
const audio = createAudio();
const prediction = new LocalPrediction();
let graphicsMode = "standard";
try {
  graphicsMode =
    localStorage.getItem("little-cambodia-graphics") === "performance"
      ? "performance"
      : "standard";
} catch {}
$("graphics-quality").value = graphicsMode;
$("graphics-quality").onchange = () => {
  graphicsMode = $("graphics-quality").value;
  try {
    localStorage.setItem("little-cambodia-graphics", graphicsMode);
  } catch {}
  resize();
};
bindViewportGestures(document);
let joystickSprinting = false;
const clock = new CityClock(),
  clearTouch = bindHoldControls(document, keys),
  clearJoystick = bindWalkingJoystick($("walk-joystick"), keys, {
    onSprint: (value) => {
      joystickSprinting = value;
    },
  });
const notify = (text, seconds = 4) => {
  $("toast").textContent = text;
  $("toast").style.opacity = 1;
  noticeUntil = performance.now() + seconds * 1000;
};
const scene = new T.Scene(),
  renderer = new T.WebGLRenderer({ canvas: $("world"), antialias: true }),
  camera = new T.OrthographicCamera(-50, 50, 30, -30, 0.1, 2200);
const orbitOffset = new T.Vector3(40, 58, 90);
const cameraZoom = createCameraZoom({
  camera,
  canvas: $("world"),
  viewport: () => ({ width: viewportWidth, height: viewportHeight }),
});
renderer.setPixelRatio(1);
finishRenderer(renderer);
const ambient = new T.HemisphereLight(0xe9f2e4, 0xa5aa91, 1.65),
  sun = new T.DirectionalLight(0xffedcf, 2.1);
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
sun.shadow.normalBias = 0.15;
const playerVisibility = createPlayerVisibility();
const wardrobe = createWardrobe();
const introCouple = createIntroCouple($("intro-couple"));
const world = makeWorld(scene, map, city, { visibility: playerVisibility }),
  streetLife = createStreetLife(scene, world.path, map);
const activities = createActivities({
  scene,
  camera,
  path: world.path,
  roads: map.roads,
  spawn,
  nearbyVendor: () => nearestVendor(),
  onOpen: () => {
    mobileHUD.closeMenu();
    stopInput();
  },
  onGesture: (name) => action(name),
  onReward: (text) => {
    audio.effect("talk");
    notify(text, 5);
  },
  canUse: () => Boolean(joined && !paused && !portraitBlocked && !intro.active),
});
const cityMap = createCityMap({
  map,
  bounds,
  path: world.path,
  onOpen: () => {
    mobileHUD.closeMenu();
    stopInput();
  },
  canOpen: () => Boolean(joined && !intro.active),
});
camera.position.set(spawn[0] + 40, 58, spawn[1] + 90);
for (const spec of VEHICLES) {
  const option = document.createElement("option");
  option.value = spec.id;
  option.textContent = spec.name;
  $("vehicle-type").append(option);
}
wardrobe.mountGarage();
for (const paint of VEHICLE_PAINTS)
  $("vehicle-paint").add(new Option(paint.name, paint.id));
wardrobe.mountGaragePaint();
$("vehicle-paint").addEventListener("change", () => {
  if (self && network.id)
    network.send({ type: "paint", vehiclePaint: $("vehicle-paint").value });
});
function vehicleStats() {
  wardrobe.syncShowcases();
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
  // Touch screens render at native CSS resolution and avoid a second shadow pass.
  renderer.setPixelRatio(
    Math.min(
      devicePixelRatio,
      graphicsMode === "performance" ? 0.8 : coarse ? 1 : 1.5,
    ),
  );
  renderer.shadowMap.enabled = !coarse && graphicsMode !== "performance";
  sun.castShadow = !coarse && graphicsMode !== "performance";
  renderer.setSize(viewportWidth, viewportHeight, false);
  cameraZoom.resize();
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
  clearJoystick();
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
  cameraZoom.cycle();
}
function action(name) {
  if (!self || paused || portraitBlocked || !network.id) return;
  mobileHUD.closeMenu();
  stopInput();
  network.action(name, $("vehicle-type").value, $("vehicle-paint").value);
}
$("run-toggle").onclick = () => {
  const running = $("run-toggle").getAttribute("aria-pressed") !== "true";
  $("run-toggle").setAttribute("aria-pressed", String(running));
  $("run-toggle").textContent = running ? "Walk" : "Run";
};
$("sit-action").onclick = () => action("sit");
function enterExit() {
  action(self?.mode === "drive" ? "exit" : "enter");
}
function nearestVendor() {
  return (
    [self ? streetLife.nearest(self) : null, activities.nearestVendor(self)]
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance)[0] || null
  );
}
function talk() {
  if (!self || paused || portraitBlocked) return;
  const vendor = nearestVendor();
  if (vendor && vendor.distance < 7 && Math.abs(self.speed) < 1.5) {
    audio.effect("talk");
    activities.openShop(vendor);
  }
}
function syncRoster(players, total = players.length) {
  $("online").textContent = `${total} / 16 guests online`;
  $("roster").replaceChildren(
    ...players.map((p) => {
      const li = document.createElement("li");
      li.textContent = `${p.nickname}${p.id === network.id ? translate(" (you)") : ""} · ${translate(p.mode === "drive" ? "driving" : "walking")}`;
      return li;
    }),
  );
}
let voice, dungeonUI;
const network = new Multiplayer((event) => {
  voice?.event(event);
  dungeonUI?.receive(event);
  if (event.type === "dungeon-player") {
    prediction.reset();
    self = structuredClone(event.player);
    stopInput();
    if (event.result) {
      voice?.stop();
      cityMap.close();
      activities.hide();
      mobileHUD.closeMenu();
      notify(event.result, 5);
    }
  }
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
  if (event.type === "painted") {
    self.preferredPaint = event.player.preferredPaint;
    if (self.vehicle) self.vehicle.paint = event.player.vehicle?.paint;
    const profile = {
      appearance: self.appearance,
      vehicleType: $("vehicle-type").value,
      vehiclePaint: self.preferredPaint,
    };
    wardrobe.save(profile);
    network.joinOptions = profile;
    $("vehicle-paint").value = self.preferredPaint;
    wardrobe.syncShowcases();
  }
  if (event.type === "customized") {
    prediction.reset();
    self.appearance = event.player.appearance;
    self.preferredVehicle = event.player.preferredVehicle;
    self.preferredPaint = event.player.preferredPaint;
    if (self.vehicle) self.vehicle.paint = event.player.vehicle?.paint;
    $("vehicle-paint").value = self.preferredPaint;
    wardrobe.syncShowcases();
    $("vehicle-type").value = self.preferredVehicle;
    vehicleStats();
    const profile = {
      appearance: self.appearance,
      vehicleType: self.preferredVehicle,
      vehiclePaint: self.preferredPaint,
    };
    wardrobe.save(profile);
    network.joinOptions = profile;
    $("welcome").hidden = true;
    paused = false;
    $("start").disabled = false;
    notify("Your new look is ready. Everyone in town can see it.");
  }
  if (event.type === "welcome") {
    prediction.reset();
    prediction.sequence = 0;
    clock.sync(event.gameTime);
    self = structuredClone(event.player);
    $("vehicle-paint").value = vehiclePaint(self.preferredPaint);
    wardrobe.syncShowcases();
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
    clock.sync(event.gameTime);
    const mine = event.players.find((p) => p.id === network.id);
    if (mine) self = prediction.reconcile(mine, event.acknowledged);
    const ids = new Set(event.players.map((p) => p.id));
    for (const [id, actor] of actors)
      if (!ids.has(id)) {
        actor.dispose();
        actors.delete(id);
      }
    syncRoster(event.players, event.onlineCount);
  }
  if (event.type === "action") {
    prediction.reset();
    self = structuredClone(event.player);
    $("vehicle-paint").value = vehiclePaint(self.preferredPaint);
    wardrobe.syncShowcases();
    audio.effect(event.action);
    if (["sit", "eat", "wave"].includes(event.action)) {
      notify(
        event.action === "sit"
          ? self.posture === "sit"
            ? "Enjoy the riverside view. Move or tap Stand up to get up."
            : "Back on your feet."
          : event.action === "eat"
            ? "A little snack break. Delicious!"
            : "Thanks for the snack!",
      );
      return;
    }
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
voice = createVoiceChat({ network, button: $("voice-toggle"), notify });
dungeonUI = createDungeonUI({
  scene,
  network,
  getSelf: () => self,
  clearInput: stopInput,
  notify,
  onMap: () => cityMap.open(),
});

const mobileHUD = createMobileHUD({
  clearInput: stopInput,
  onTalk: talk,
  onMap: () => cityMap.open(),
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
const guide = createCityGuide({
  onMap: () => {
    mobileHUD.closeMenu();
    cityMap.open();
  },
});
const pwa = createPwa({
  onOpen: () => {
    mobileHUD.closeMenu();
    stopInput();
  },
});
const intro = createIntro({
  autoplay: false,
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
  if (!navigator.onLine) {
    $("join-error").textContent = "You’re offline. Reconnect to join the city.";
    return;
  }
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
    $("vehicle-paint").value = profile.vehiclePaint;
    wardrobe.syncShowcases();
    try {
      profile.combatClass =
        localStorage.getItem("little-cambodia-class") || "fighter";
    } catch {}
    network.connect(name, profile);
  }
};
createLanguage({
  onReady: () => {
    const notice = createBrowserNotice({ onContinue: () => intro.play() });
    if (!notice.visible) intro.play();
  },
});
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
    vehiclePaint: $("vehicle-paint").value,
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
  cityMap.close();
  activities.hide();
  voice.stop();
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
  if (!$("welcome").hidden || activities.open || cityMap.isOpen || pwa.open)
    return;
  if (dungeonUI.open) return;
  if (["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName)) return;
  if (
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)
  )
    event.preventDefault();
  keys.add(event.key.toLowerCase());
  if (event.repeat) return;
  const key = event.key.toLowerCase();
  if (self?.dungeonId) {
    if (key === "p") pause();
    return;
  }
  if (key === "e") enterExit();
  if (key === "f") action("summon");
  if (key === "p") pause();
  if (key === "c") zoom();
  if (key === "v") talk();
  if (key === "q") activities.interact();
  if (key === "x") action("sit");
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
addEventListener("pagehide", () => {
  voice.stop();
  network.disconnect();
});
let previous = performance.now(),
  accumulator = 0,
  streetElapsed = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - previous) / 1000, 0.1);
  previous = now;
  cameraZoom.tick(dt);
  if (intro.active) {
    audio.update(dt, self, keys, false);
    clock.tick(dt);
    introCouple.render(now, intro.card === 0, intro.animated);
    return;
  }
  introCouple.render(now, false, false);
  const ready = Boolean(joined && network.id && !paused && !portraitBlocked);
  document.body.classList.toggle(
    "dialog-open",
    activities.open || cityMap.isOpen || pwa.open,
  );
  const active =
    ready &&
    !network.stale &&
    !network.congested &&
    !mobileHUD.isOpen &&
    !intro.active &&
    !activities.open &&
    !cityMap.isOpen &&
    !pwa.open &&
    !dungeonUI.open;
  voice.update(self, network.players, Boolean(network.id && !network.stale));
  if (!self?.dungeonId) activities.update(self, active, now, clock.read().hour);
  const riverDistance = self
    ? nearestRoad([self.x, self.z], [{ points: world.path }]).distance
    : Infinity;
  audio.update(dt, self, keys, active, Math.max(0, 1 - riverDistance / 110));
  accumulator += dt;
  const movementKeys = new Set(active ? keys : []);
  if (
    active &&
    self?.mode === "walk" &&
    ($("run-toggle").getAttribute("aria-pressed") === "true" ||
      joystickSprinting)
  )
    movementKeys.add("shift");
  while (accumulator >= INPUT_STEP) {
    if (self && network.id && !network.stale)
      prediction.advance(
        self,
        movementKeys,
        (command) => network.command(command),
        cameraZoom.yaw(),
      );
    accumulator -= INPUT_STEP;
  }
  $("network-status").hidden =
    !joined || (!network.stale && !network.congested && network.latency < 350);
  const connectionMessage = network.stale
    ? "Connection interrupted · waiting for the city…"
    : "Slow connection · smoothing movement";
  if ($("network-status").textContent !== connectionMessage)
    $("network-status").textContent = connectionMessage;
  clock.tick(dt);
  dungeonUI.update(self, network.players, dt, now, keys, active);
  camera.zoom = self?.dungeonId ? 2.4 : 1;
  camera.updateProjectionMatrix();
  if (self?.dungeonId) {
    mobileHUD.update(self, ready, false, null);
    dungeonUI.render(
      renderer,
      camera,
      self,
      network.players,
      dt,
      now,
      cameraZoom.offset(),
      orbitOffset,
    );
    if (now > noticeUntil) $("toast").style.opacity = 0;
    return;
  }
  const time = clock.read(),
    activity = activityAt(time);
  ambient.intensity = activity.night ? 0.85 : 1.65;
  ambient.color.setHex(activity.night ? 0xa5c4e1 : 0xe9f2e4);
  sun.intensity = activity.night ? 0.25 : 2.1;
  world.riverLife.update(dt, activity.night);
  world.landmarkScenes.update(activity.night);
  streetElapsed += dt;
  if (
    streetElapsed >=
    (document.body.classList.contains("mobile-ui") ? 1 / 15 : 1 / 30)
  ) {
    streetLife.update(streetElapsed, time);
    streetElapsed = 0;
  }
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
      activity.night,
    );
  }
  const focus = actors.get(network.id)?.position ||
    self || { x: spawn[0], z: spawn[1] };
  followCamera(camera, focus, cameraZoom.offset(), orbitOffset, dt);

  hud += dt;
  if (hud > 0.15) {
    hud = 0;
    $("clock").textContent =
      `${time.label} · ${clock.mode === "now" ? "Game time · 10×" : "local preview"}`;
    $("game-calendar").textContent =
      `${document.body.classList.contains("mobile-ui") ? `${time.date}/${time.month}/${time.year}` : time.dateLabel} · ${time.timeLabel} · ${clock.mode === "now" ? `${GAME_TIME_RATE}×` : "Preview"}`;
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
    const vendor = nearestVendor();
    $("vendor").disabled =
      !can || !vendor || vendor.distance >= 7 || Math.abs(self.speed) >= 1.5;
    $("vendor").textContent =
      vendor && vendor.distance < 7
        ? `Shop · ${vendor.food}`
        : "Shop street stall · V";
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
        : self?.posture === "sit"
          ? "SITTING"
          : self?.speed > 4.6
            ? "RUNNING"
            : "ON FOOT";
    $("touch-drift").hidden =
      self?.mode !== "drive" ||
      ["bike", "rickshaw", "tuktuk"].includes(
        vehicleSpec(self?.vehicle?.type).kind,
      );
    $("run-toggle").hidden = !can || self?.mode !== "walk";
    const seat = nearestBench(self, BENCHES);
    $("sit-action").hidden =
      !can ||
      self?.mode !== "walk" ||
      (self?.posture !== "sit" && (!seat || seat.distance > 3));
    $("sit-action").textContent =
      self?.posture === "sit" ? "Stand up" : "Sit down";
    const place = self ? nearestPlace(self.x, self.z) : null;
    $("place-label").textContent = place?.name || "";
    $("place-label").hidden = !place || !joined;

    $("road-name").textContent =
      self &&
      nearestRoad([self.x, self.z], [{ points: promenade }]).distance < 10
        ? "Riverside promenade"
        : nearestRoad([focus.x, focus.z], map.roads).road.name;
    mobileHUD.update(self, can, !$("welcome").hidden, vendor);
    guide.update(self, activities.game);
    cityMap.update(
      self,
      activities.game.target || dungeonUI.goal,
      network.players,
      now,
      dungeonUI.portal,
    );
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
