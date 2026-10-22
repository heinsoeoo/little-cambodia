import { createCharacter } from "./character.js";
import * as T from "three";
import { Activities, activityCatalog } from "./activities.js";
import { translate } from "./i18n.js";
const STORAGE = "little-cambodia-activities-v1";
export function createActivities({
  scene,
  camera,
  path,
  roads,
  spawn,
  onOpen,
  onReward,
  canUse,
}) {
  const $ = (id) => document.getElementById(id);
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE)) || {};
  } catch {
    saved = {};
  }
  const game = new Activities(activityCatalog(path, roads, spawn), saved);
  const marker = new T.Group();
  const ring = new T.Mesh(
    new T.TorusGeometry(3.5, 0.18, 6, 40),
    new T.MeshBasicMaterial({
      color: 0xffda81,
      depthTest: false,
      transparent: true,
      opacity: 0.8,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.3;
  const gem = new T.Mesh(
    new T.OctahedronGeometry(0.7),
    new T.MeshBasicMaterial({ color: 0xffe3a4, depthTest: false }),
  );
  gem.position.y = 4;
  marker.add(ring, gem);
  marker.visible = false;
  scene.add(marker);
  const neighbour = createCharacter({
    gender: "female",
    top: "riverside",
    bottom: "casual",
    hair: "riverside",
    shoes: "casual",
  });
  neighbour.group.position.set(4.5, 0, 0);
  marker.add(neighbour.group);
  const basket = new T.Mesh(
    new T.BoxGeometry(1, 0.6, 0.65),
    new T.MeshLambertMaterial({ color: 0xb98a56 }),
  );
  basket.position.set(4.5, 0.5, 0.8);
  marker.add(basket);
  let player = null,
    usable = false,
    lastRender = -Infinity;
  function persist() {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(game.save()));
    } catch {}
  }
  function drawBoard() {
    $("activity-rewards").textContent =
      `${game.stamps} ${translate("kindness stamps")}`;
    $("activity-cards").replaceChildren(
      ...game.catalog.map((item) => {
        const card = document.createElement("article"),
          title = document.createElement("h3"),
          description = document.createElement("p"),
          meta = document.createElement("small"),
          button = document.createElement("button");
        title.textContent = translate(item.title);
        description.textContent = translate(item.description);
        meta.textContent = `${translate(item.mode === "walk" ? "On foot" : "Driving")} · +${item.reward} ${translate("stamps")} · ${game.completed[item.id]} ${translate("completed")}`;
        button.textContent = translate(
          game.current?.id === item.id ? "Restart activity" : "Start activity",
        );
        button.onclick = () => {
          game.start(item.id);
          persist();
          close();
          render();
        };
        card.append(title, description, meta, button);
        return card;
      }),
    );
    $("activity-cancel").hidden = !game.current;
    $("postcard-collection").hidden = !game.completed.postcards;
  }
  function close() {
    $("activities-overlay").hidden = true;
    $("activities-open").focus();
  }
  $("activities-open").onclick = () => {
    if (!canUse()) return;
    onOpen();
    drawBoard();
    $("activities-overlay").hidden = false;
    $("activities-close").focus();
  };
  $("activities-close").onclick = close;
  $("activity-cancel").onclick = () => {
    game.cancel();
    persist();
    close();
    render();
  };
  $("activities-overlay").addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
    if (event.key === "Tab") {
      const controls = [
        ...$("activities-overlay").querySelectorAll("button"),
      ].filter((e) => !e.hidden);
      const i = controls.indexOf(document.activeElement);
      event.preventDefault();
      controls[
        (i + (event.shiftKey ? -1 : 1) + controls.length) % controls.length
      ].focus();
    }
  });
  function interact() {
    if (!usable || !canUse()) return;
    const result = game.interact(player);
    if (!result) return;
    persist();
    if (result.type === "complete") {
      persist();
      onReward(
        `${translate("Activity complete")} · +${result.reward} ${translate("kindness stamps")}`,
      );
    } else
      onReward(
        translate("Lovely! Follow the golden marker to your next stop."),
      );
    render();
  }
  $("activity-action").onclick = interact;
  function render() {
    const target = game.target;
    const visible = Boolean(player && target);
    $("activity-tracker").hidden = !visible;
    marker.visible = visible;
    if (!visible) return;
    marker.position.set(target.point[0], 0, target.point[1]);
    neighbour.group.visible = game.current.id === "delivery";
    basket.visible = game.current.id === "delivery" && game.index === 0;
    $("activity-title").textContent =
      `${translate(game.current.title)} · ${game.index + 1}/${game.current.stops.length}`;
    $("activity-objective").textContent = translate(target.label);
    const distance = Math.round(game.distance(player));
    const screenTarget = new T.Vector3(
      target.point[0],
      0,
      target.point[1],
    ).project(camera);
    const screenPlayer = new T.Vector3(player.x, 0, player.z).project(camera);
    const bearing = Math.atan2(
      (screenTarget.x - screenPlayer.x) * innerWidth,
      (screenTarget.y - screenPlayer.y) * innerHeight,
    );
    $("activity-compass").style.transform = `rotate(${bearing}rad)`;
    $("activity-distance").textContent = `${distance} m`;
    const wrongMode = player.mode !== game.current.mode;
    $("activity-action").disabled = !usable || !game.canInteract(player);
    $("activity-action").textContent = translate(
      wrongMode
        ? game.current.mode === "walk"
          ? "Get out to continue"
          : "Enter a vehicle to continue"
        : Math.abs(player.speed || 0) >= 1.5
          ? "Slow down to interact"
          : distance > 10
            ? "Follow the golden marker"
            : target.action,
    );
  }
  return {
    game,
    interact,
    get open() {
      return !$("activities-overlay").hidden;
    },
    update(state, active, time) {
      player = state;
      usable = active;
      $("activities-open").disabled = !state;
      if (time - lastRender > 150) {
        render();
        lastRender = time;
      }
      gem.rotation.y = time / 900;
      gem.position.y = 4 + Math.sin(time / 600) * 0.35;
    },
    hide() {
      close();
      player = null;
      render();
    },
  };
}
