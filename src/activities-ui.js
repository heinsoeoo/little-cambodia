import { cityErrands, SNACKS } from "./city-errands.js";
import { places } from "./places.js";
import { blocked } from "./open-world.js";
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
  nearbyVendor,
}) {
  const $ = (id) => document.getElementById(id);
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE)) || {};
  } catch {
    saved = {};
  }
  const game = new Activities(
    [
      ...activityCatalog(path, roads, spawn),
      ...cityErrands(roads, places, spawn, blocked),
    ],
    saved,
  );
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
  const cityShops = [
    {
      point: game.catalog.find((item) => item.id === "parcel").stops[1].point,
      food: "Nom krok",
    },
    {
      point: game.catalog.find((item) => item.id === "parcel").stops[2].point,
      food: "Sugarcane juice",
    },
  ].map((shop) => {
    const group = new T.Group();
    group.position.set(shop.point[0], 0, shop.point[1]);
    const box = (size, position, color) => {
      const mesh = new T.Mesh(
        new T.BoxGeometry(...size),
        new T.MeshLambertMaterial({ color }),
      );
      mesh.position.set(...position);
      group.add(mesh);
    };
    box([2.6, 1.1, 1.4], [0, 0.55, 0], 0xb68e67);
    box([3.2, 0.2, 2], [0, 2.5, 0], 0x8caa83);
    for (const x of [-1.2, 1.2]) box([0.09, 2, 0.09], [x, 1.5, 0], 0xded0b1);
    for (let i = 0; i < 4; i++)
      box([0.35, 0.2, 0.35], [-0.8 + i * 0.5, 1.2, 0], 0xe5b76b);
    const seller = createCharacter({
      gender: "unspecified",
      top: "workwear",
      bottom: "casual",
      hair: "casual",
      shoes: "workwear",
    });
    seller.group.position.set(0, 0, -1.1);
    group.add(seller.group);
    scene.add(group);
    return { ...shop, group };
  });
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
    if (result.dialog) {
      onOpen();
      $("errand-dialog-text").textContent = translate(result.dialog);
      $("errand-dialog").hidden = false;
      $("errand-dialog-close").focus();
    }
    if (result.type === "complete") {
      persist();
      onReward(
        `${translate("Activity complete")} · +${result.reward} ${translate("kindness stamps")}`,
      );
    } else if (!result.dialog)
      onReward(translate("Lovely! Follow the map to your next stop."));
    render();
  }
  $("activity-action").onclick = interact;
  function render() {
    const target = game.target;
    const visible = Boolean(player && target);
    $("activity-tracker").hidden = !visible;
    marker.visible = visible;
    $("activity-action").hidden = !visible;
    $("hud-wallet").hidden = !player;
    $("hud-wallet").textContent = `✧ ${game.stamps}`;
    if (!visible) return;
    marker.position.set(target.point[0], 0, target.point[1]);
    neighbour.group.visible =
      game.current.id === "delivery" || Boolean(target.npc);
    basket.visible = game.current.id === "delivery" && game.index === 0;
    $("activity-title").textContent =
      `${translate(game.current.title)} · ${game.index + 1}/${game.current.stops.length}`;
    $("activity-objective").textContent =
      (target.npc ? target.npc + " · " : "") + translate(target.label);
    const distance = Math.round(game.distance(player));
    $("activity-distance").textContent = `${distance} m`;
    const wrongMode = player.mode !== game.current.mode;
    $("activity-action").disabled = !usable || !game.canInteract(player);
    const actionLabel = translate(
      wrongMode
        ? game.current.mode === "walk"
          ? "Get out to continue"
          : "Enter a vehicle to continue"
        : Math.abs(player.speed || 0) >= 1.5
          ? "Slow down to interact"
          : distance > 10
            ? "Follow the gold route"
            : target.action,
    );
    $("activity-action").setAttribute("aria-label", actionLabel);
    $("activity-action").textContent =
      document.body.classList.contains("mobile-ui") && !game.canInteract(player)
        ? translate("Quest")
        : actionLabel;
    $("activity-action").classList.toggle(
      "quest-ready",
      game.canInteract(player),
    );
  }
  function closeDialogue() {
    $("errand-dialog").hidden = true;
    $("activity-action").focus();
  }
  $("errand-dialog-close").onclick = closeDialogue;
  $("errand-dialog").addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDialogue();
    if (event.key === "Tab") {
      event.preventDefault();
      $("errand-dialog-close").focus();
    }
  });
  let shopVendor = null;
  function closeShop() {
    $("snack-overlay").hidden = true;
    $("snacks-open").focus();
  }
  function drawShop() {
    $("snack-wallet").textContent =
      `${game.stamps} ${translate("kindness stamps")}`;
    $("snack-shop-title").textContent = translate(
      shopVendor ? "Street snack stall" : "Your snack bag",
    );
    $("snack-menu").replaceChildren();
    if (shopVendor) {
      const snack = SNACKS.find((item) => item.name === shopVendor.food);
      if (snack) {
        const offer = document.createElement("div"),
          name = document.createElement("strong"),
          buy = document.createElement("button");
        name.textContent = translate(snack.name);
        buy.textContent = `${translate("Buy snack")} · ${snack.cost} ${translate("stamps")}`;
        buy.disabled = game.stamps < snack.cost || game.snacks[snack.id] >= 99;
        buy.onclick = () => {
          const vendor = nearbyVendor();
          if (
            !canUse() ||
            !vendor ||
            vendor.distance >= 7 ||
            vendor.food !== shopVendor.food ||
            player?.mode !== "walk"
          ) {
            closeShop();
            return;
          }
          if (game.buy(snack.id, vendor.food)) {
            persist();
            drawShop();
            onReward(translate("Snack packed! Enjoy it from your snack bag."));
          }
        };
        offer.append(name, buy);
        $("snack-menu").append(offer);
      }
    }
    const owned = SNACKS.filter((item) => game.snacks[item.id] > 0);
    $("snack-empty").hidden = owned.length > 0;
    $("snack-inventory").replaceChildren(
      ...owned.map((item) => {
        const row = document.createElement("div"),
          name = document.createElement("span"),
          eat = document.createElement("button");
        name.textContent = `${translate(item.name)} × ${game.snacks[item.id]}`;
        eat.textContent = translate("Enjoy snack");
        eat.onclick = () => {
          if (!canUse() || !game.eat(item.id)) return;
          persist();
          drawShop();
          onReward(translate("A little snack break. Delicious!"));
        };
        row.append(name, eat);
        return row;
      }),
    );
    $("snack-tasted").textContent =
      `${Object.values(game.tasted).filter((n) => n > 0).length} / ${SNACKS.length} ${translate("local flavours tried")}`;
  }
  function openShop(vendor = null) {
    if (!canUse() || !player || player.mode !== "walk") {
      onReward(translate("Get out of your vehicle for a snack break."));
      return;
    }
    if (vendor && vendor.distance >= 7) return;
    shopVendor = vendor;
    onOpen();
    drawShop();
    $("snack-overlay").hidden = false;
    $("snack-close").focus();
  }
  $("snacks-open").onclick = () => openShop();
  $("snack-close").onclick = closeShop;
  $("snack-overlay").addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeShop();
    if (e.key === "Tab") {
      e.preventDefault();
      const buttons = [...$("snack-overlay").querySelectorAll("button")].filter(
        (b) => !b.disabled,
      );
      const i = buttons.indexOf(document.activeElement);
      buttons[
        (i + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length
      ]?.focus();
    }
  });
  return {
    game,
    interact,
    openShop,
    nearestVendor(state) {
      return state
        ? cityShops
            .filter((shop) => shop.group.visible)
            .map((shop) => ({
              ...shop,
              distance: Math.hypot(
                state.x - shop.point[0],
                state.z - shop.point[1],
              ),
            }))
            .sort((a, b) => a.distance - b.distance)[0]
        : null;
    },
    get open() {
      return (
        !$("activities-overlay").hidden ||
        !$("snack-overlay").hidden ||
        !$("errand-dialog").hidden
      );
    },
    update(state, active, time, hour) {
      for (const shop of cityShops) shop.group.visible = hour >= 7 && hour < 23;
      player = state;
      usable = active;
      $("activities-open").disabled = !state;
      $("snacks-open").disabled = !state;
      if (time - lastRender > 150) {
        render();
        lastRender = time;
      }
      gem.rotation.y = time / 900;
      gem.position.y = 4 + Math.sin(time / 600) * 0.35;
    },
    hide() {
      closeShop();
      closeDialogue();
      close();
      player = null;
      render();
    },
  };
}
