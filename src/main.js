import * as T from "three";
import { cities } from "./cities.js";
import { project, prepare, nearestRoad } from "./geo.js";
import { buildGraph, findRoute, approachSpawn } from "./navigation.js";
import { Missions } from "./missions.js";
import { stepVehicle } from "./vehicle.js";
import { makeWorld, taxi, routeRibbon } from "./world.js";
const $ = (id) => document.getElementById(id),
  city = cities.phnomPenh,
  keys = new Set();
let started = false,
  paused = false,
  night = false,
  highCamera = false,
  noticeUntil = 0;
let graph,
  route = null,
  routeElapsed = 1;
const routeLine = new T.Mesh(
  new T.BufferGeometry(),
  new T.MeshBasicMaterial({
    color: 0xddec99,
    depthTest: true,
    side: T.DoubleSide,
    transparent: true,
    opacity: 0.8,
  }),
);
routeLine.renderOrder = 2;
const notify = (text, seconds = 4) => {
  $("toast").textContent = text;
  $("toast").style.opacity = 1;
  noticeUntil = performance.now() + seconds * 1000;
};
let renderer;
try {
  renderer = new T.WebGLRenderer({ canvas: $("world"), antialias: true });
} catch (e) {
  $("mission-description").textContent =
    "WebGL is unavailable. Enable hardware acceleration and reload.";
  $("toast").textContent = "Your browser could not start the 3D renderer.";
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.setClearColor(0xc7d6ca);
const scene = new T.Scene();
scene.fog = new T.Fog(0xc7d6ca, 160, 1100);
const camera = new T.PerspectiveCamera(55, innerWidth / innerHeight, 0.2, 2200);
const ambient = new T.HemisphereLight(0xf8f3d9, 0x45645b, 2.4);
scene.add(ambient, routeLine);
const sun = new T.DirectionalLight(0xffe2ac, 2.5);
sun.position.set(-200, 300, -100);
scene.add(sun);
addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});
addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key))
    e.preventDefault();
  keys.add(e.key.toLowerCase());
  if (!e.repeat) {
    if (e.key.toLowerCase() === "e") interact();
    if (e.key.toLowerCase() === "r") reset();
    if (e.key.toLowerCase() === "c") highCamera = !highCamera;
    if (e.key.toLowerCase() === "p") togglePause();
  }
});
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
addEventListener("blur", () => {
  keys.clear();
  if (started && !paused) togglePause();
});
document.addEventListener("visibilitychange", () => {
  keys.clear();
  if (document.hidden && started && !paused) togglePause();
});
for (const button of document.querySelectorAll("[data-key]")) {
  button.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    keys.add(button.dataset.key);
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    button.addEventListener(event, () => keys.delete(button.dataset.key));
}
$("time").onclick = () => {
  night = !night;
  const color = night ? 0x233c4c : 0xc7d6ca;
  renderer.setClearColor(color);
  scene.fog.color.setHex(color);
  ambient.intensity = night ? 0.65 : 2.4;
  sun.intensity = night ? 0.35 : 2.5;
  $("time").textContent = night ? "☾ Evening" : "☀ Daylight";
};
function togglePause() {
  if (!started) return;
  paused = !paused;
  keys.clear();
  $("pause-overlay").hidden = !paused;
  $("pause").textContent = paused ? "Resume · P" : "Pause · P";
}
$("pause").onclick = togglePause;
$("resume").onclick = togglePause;
let map,
  world,
  car,
  model,
  stops,
  mission,
  stage = "pickup",
  balance = 0,
  trips = 0,
  ready = false;
try {
  const saved = JSON.parse(localStorage.getItem("phnom-drive") || "{}");
  balance = Number(saved.balance) || 0;
  trips = Number(saved.trips) || 0;
} catch {}
const marker = new T.Group();
const ring = new T.Mesh(
  new T.TorusGeometry(7, 0.4, 8, 40),
  new T.MeshBasicMaterial({ color: 0xe4f1a2 }),
);
ring.rotation.x = Math.PI / 2;
marker.add(ring);
const beam = new T.Mesh(
  new T.CylinderGeometry(0.25, 0.25, 30, 8),
  new T.MeshBasicMaterial({ color: 0xe4f1a2, transparent: true, opacity: 0.5 }),
);
beam.position.y = 15;
marker.add(beam);
scene.add(marker);
function target() {
  return mission.target;
}
function updateMission() {
  const t = target();
  $("mission-title").textContent =
    (stage === "pickup" ? "Pick up at " : "Take your passenger to ") + t.name;
  $("mission-description").textContent =
    stage === "pickup"
      ? "Follow the lime road route. Stop within 15 m and press E to pick up your passenger."
      : "Enjoy the drive. Stop by the destination marker and press E to complete the fare.";
  marker.position.set(t.point[0], 0.6, t.point[1]);
  routeElapsed = 1;
  $("earnings").textContent = balance.toLocaleString();
  $("trips").textContent = `${trips} trips completed`;
  $("gear").nextElementSibling.textContent =
    stage === "pickup" ? "TAXI / FOR HIRE" : "TAXI / ON TRIP";
}
function interact() {
  if (!ready || !started || paused) return;
  const result = mission.interact(car);
  if (!result) return;
  stage = mission.stage;
  balance = mission.balance;
  trips = mission.trips;
  if (result === "pickup") notify("Passenger aboard. Let’s go!");
  else {
    try {
      localStorage.setItem("phnom-drive", JSON.stringify(mission.save()));
    } catch {}
    notify("Fare complete · +៛ 6,000");
  }
  updateMission();
}
function reset() {
  if (!ready) return;
  const n = nearestRoad([car.x, car.z], map.roads);
  car.x = n.point[0];
  car.z = n.point[1];
  car.heading = n.heading;
  car.speed = 0;
  routeElapsed = 1;
  notify("Back on the road");
}
$("reset").onclick = reset;
$("interact").onclick = interact;
$("start").disabled = true;
$("start").onclick = () => {
  started = true;
  $("pause").disabled = false;
  $("welcome").hidden = true;
  notify("Your shift has started. Follow the lime marker.");
};
const ctx = $("map").getContext("2d");
const mapWest = project(city.bounds[0], city.bounds[3], city.origin),
  mapEast = project(city.bounds[2], city.bounds[1], city.origin),
  mapScale = 260 / Math.max(mapEast[0] - mapWest[0], mapEast[1] - mapWest[1]),
  mapCenter = [(mapWest[0] + mapEast[0]) / 2, (mapWest[1] + mapEast[1]) / 2];
function drawMap() {
  const c = ctx,
    s = mapScale,
    px = (x) => 140 + (x - mapCenter[0]) * s,
    pz = (z) => 140 + (z - mapCenter[1]) * s;
  c.fillStyle = "#1e443c";
  c.fillRect(0, 0, 280, 280);
  c.lineCap = "round";
  for (const r of map.roads) {
    c.strokeStyle = "#7c9680";
    c.lineWidth = Math.max(1, r.width * s);
    c.beginPath();
    r.points.forEach((p, i) =>
      i ? c.lineTo(px(p[0]), pz(p[1])) : c.moveTo(px(p[0]), pz(p[1])),
    );
    c.stroke();
  }
  const t = target();
  c.strokeStyle = "#e2efa7";
  c.lineWidth = 2;
  c.setLineDash(route ? [] : [3, 5]);
  c.beginPath();
  const routePoints = route?.points || [[car.x, car.z], t.point];
  routePoints.forEach((p, i) =>
    i ? c.lineTo(px(p[0]), pz(p[1])) : c.moveTo(px(p[0]), pz(p[1])),
  );
  c.stroke();
  c.setLineDash([]);
  c.fillStyle = "#e4f1a4";
  c.beginPath();
  c.arc(px(t.point[0]), pz(t.point[1]), 5, 0, Math.PI * 2);
  c.fill();
  c.save();
  c.translate(px(car.x), pz(car.z));
  c.rotate(-car.heading);
  c.fillStyle = "white";
  c.beginPath();
  c.moveTo(0, 7);
  c.lineTo(-4, -5);
  c.lineTo(4, -5);
  c.closePath();
  c.fill();
  c.restore();
}
async function loadCity() {
  try {
    const response = await fetch(city.data);
    if (!response.ok) throw new Error(`Map load failed (${response.status})`);
    map = prepare(await response.json(), city);
    world = makeWorld(scene, map, city);
    graph = buildGraph(map.roads);
    stops = city.landmarks.map((l) => ({
      ...l,
      ...nearestRoad(project(l.lon, l.lat, city.origin), map.roads),
    }));
    mission = new Missions(stops, { balance, trips });
    const spawn = approachSpawn(stops[0]);
    car = {
      x: spawn.point[0],
      z: spawn.point[1],
      heading: spawn.heading,
      speed: 0,
    };
    model = taxi();
    scene.add(model);
    ready = true;
    updateMission();
    $("start").disabled = false;
    notify(
      `City ready · ${map.roads.length} roads · ${map.buildings.length} buildings`,
      5,
    );
    camera.position.set(car.x + 60, 90, car.z + 100);
  } catch (e) {
    $("mission-description").textContent = e.message;
    $("start").textContent = "City unavailable — reload to retry";
    notify("Could not load the bundled city. Check the local server.", 3600);
    console.error(e);
  }
}
loadCity();
let previous = performance.now(),
  accumulator = 0,
  hud = 0;
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - previous) / 1000, 0.1);
  previous = now;
  if (!ready) {
    renderer.render(scene, camera);
    return;
  }
  accumulator += dt;
  while (accumulator >= 1 / 60) {
    if (started && !paused) stepVehicle(car, keys, 1 / 60, world.collides);
    accumulator -= 1 / 60;
  }
  model.position.set(car.x, 0, car.z);
  model.rotation.y = car.heading;
  const offset = started
    ? highCamera
      ? new T.Vector3(0, 65, -25)
      : new T.Vector3(
          -Math.sin(car.heading) * 15,
          9,
          -Math.cos(car.heading) * 15,
        )
    : new T.Vector3(65, 90, 95);
  const desired = new T.Vector3(car.x, 0, car.z).add(offset);
  camera.position.lerp(desired, 1 - Math.exp(-dt * 4));
  camera.lookAt(car.x, 1.4, car.z);
  ring.rotation.z += dt * 0.2;
  if (!paused) {
    routeElapsed += dt;
    if (routeElapsed >= 1) {
      routeElapsed = 0;
      route = findRoute([car.x, car.z], target().point, map.roads, graph);
      const geometry = routeRibbon(route?.points || []);
      routeLine.geometry.dispose();
      routeLine.geometry = geometry;
      routeLine.visible = started && Boolean(route);
    }
  }
  hud += dt;
  if (hud > 0.1) {
    hud = 0;
    $("speed").textContent = String(
      Math.round(Math.abs(car.speed) * 3.6),
    ).padStart(2, "0");
    $("gear").textContent =
      car.speed < -0.2 ? "R" : car.speed > 0.2 ? "D" : "N";
    const distance = Math.hypot(
      car.x - target().point[0],
      car.z - target().point[1],
    );
    $("distance").textContent =
      `${Math.round(route?.distance ?? distance)} m · ${route ? "by road" : "direct / no route"}`;
    $("interact").disabled =
      !started || paused || distance > 15 || Math.abs(car.speed) > 1.5;
    $("interact").textContent =
      distance > 15
        ? "Drive to the marker"
        : Math.abs(car.speed) > 1.5
          ? "Stop to interact"
          : stage === "pickup"
            ? "Pick up passenger · E"
            : "Complete fare · E";
    $("road-name").textContent = nearestRoad(
      [car.x, car.z],
      map.roads,
    ).road.name;
    drawMap();
  }
  if (now > noticeUntil) $("toast").style.opacity = 0;
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
