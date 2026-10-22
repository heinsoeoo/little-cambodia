import { createQuestNavigation, radarPoint } from "./quest-navigation.js";
import { translate } from "./i18n.js";
export function createCityMap({ map, bounds, path, onOpen, canOpen }) {
  const $ = (id) => document.getElementById(id),
    canvas = $("map"),
    ctx = canvas.getContext("2d"),
    full = $("full-map"),
    navigation = createQuestNavigation(map.roads, path);
  const base = document.createElement("canvas");
  base.width = base.height = 2048;
  const baseContext = base.getContext("2d"),
    extent = Math.max(
      bounds.max[0] - bounds.min[0],
      bounds.max[1] - bounds.min[1],
    ),
    scale = 2048 / extent;
  const bx = (x) => (x - bounds.min[0]) * scale,
    bz = (z) => (z - bounds.min[1]) * scale;
  baseContext.fillStyle = "#d5c797";
  baseContext.fillRect(0, 0, 2048, 2048);
  const polygon = (points, color) => {
    baseContext.fillStyle = color;
    baseContext.beginPath();
    points.forEach((p, i) =>
      i
        ? baseContext.lineTo(bx(p[0]), bz(p[1]))
        : baseContext.moveTo(bx(p[0]), bz(p[1])),
    );
    baseContext.fill();
  };
  for (const area of map.water) polygon(area.points, "#6b9ba1");
  for (const road of map.roads) {
    baseContext.strokeStyle = "#8e8062";
    baseContext.lineWidth = Math.max(1, road.width * scale);
    baseContext.beginPath();
    road.points.forEach((p, i) =>
      i
        ? baseContext.lineTo(bx(p[0]), bz(p[1]))
        : baseContext.moveTo(bx(p[0]), bz(p[1])),
    );
    baseContext.stroke();
  }
  for (const building of map.buildings) polygon(building.points, "#b58a66");
  let player = null,
    target = null,
    players = [],
    route = null;
  const overlay = $("full-map-overlay");
  const cityCenter = [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
  ];
  let fullCenter = [...cityCenter],
    zoom = 1,
    drag = null;
  $("full-map-plus").onclick = () => {
    if (zoom === 1 && player) fullCenter = [player.x, player.z];
    zoom = Math.min(8, zoom * 1.6);
    drawFull();
  };
  $("full-map-minus").onclick = () => {
    zoom = Math.max(1, zoom / 1.6);
    drawFull();
  };
  $("full-map-overview").onclick = () => {
    zoom = 1;
    fullCenter = [...cityCenter];
    drawFull();
  };
  full.addEventListener("pointerdown", (event) => {
    if (drag) return;
    event.preventDefault();
    full.setPointerCapture(event.pointerId);
    drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      center: [...fullCenter],
    };
  });
  full.addEventListener("pointermove", (event) => {
    if (drag?.id !== event.pointerId) return;
    event.preventDefault();
    const rect = full.getBoundingClientRect(),
      units = (extent * 1.06) / zoom / Math.min(rect.width, rect.height);
    fullCenter = [
      drag.center[0] - (event.clientX - drag.x) * units,
      drag.center[1] - (event.clientY - drag.y) * units,
    ];
    drawFull();
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    full.addEventListener(type, (event) => {
      if (drag?.id === event.pointerId) drag = null;
    });
  function close() {
    overlay.hidden = true;
    canvas.parentElement.focus();
  }
  function open() {
    if (!canOpen()) return;
    onOpen();
    zoom = 1;
    fullCenter = [...cityCenter];
    overlay.hidden = false;
    $("full-map-close").focus();
    drawFull();
  }
  canvas.parentElement.onclick = open;
  canvas.parentElement.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  });
  $("full-map-close").onclick = close;
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
    if (event.key === "Tab") {
      event.preventDefault();
      const controls = [...overlay.querySelectorAll("button")].filter(
        (button) => !button.disabled,
      );
      const i = controls.indexOf(document.activeElement);
      controls[
        (i + (event.shiftKey ? -1 : 1) + controls.length) % controls.length
      ].focus();
    }
  });
  function paint(context, width, height, center, span, overview = false) {
    const factor = Math.min(width, height) / span;
    const px = (x) => width / 2 + (x - center[0]) * factor,
      pz = (z) => height / 2 + (z - center[1]) * factor;
    context.fillStyle = "#192522";
    context.fillRect(0, 0, width, height);
    context.drawImage(
      base,
      px(bounds.min[0]),
      pz(bounds.min[1]),
      extent * factor,
      extent * factor,
    );
    if (route && target) {
      context.save();
      context.lineJoin = context.lineCap = "round";
      for (const [color, lineWidth] of [
        ["#3b392b", overview ? 8 : 7],
        ["#ffce63", overview ? 4 : 4],
      ]) {
        context.strokeStyle = color;
        context.lineWidth = lineWidth;
        context.setLineDash(route.kind === "direction" ? [7, 6] : []);
        context.beginPath();
        route.points.forEach((p, i) =>
          i
            ? context.lineTo(px(p[0]), pz(p[1]))
            : context.moveTo(px(p[0]), pz(p[1])),
        );
        context.stroke();
      }
      context.restore();
      const marker = overview
        ? { x: px(target.point[0]), y: pz(target.point[1]), offscreen: false }
        : radarPoint(target.point, center, span, width, 18);
      context.save();
      context.translate(marker.x, marker.y);
      context.fillStyle = "#ffce63";
      context.strokeStyle = "#282b24";
      context.lineWidth = 2;
      if (marker.offscreen) {
        context.rotate(marker.angle);
        context.beginPath();
        context.moveTo(0, -9);
        context.lineTo(7, 7);
        context.lineTo(0, 3);
        context.lineTo(-7, 7);
        context.closePath();
      } else {
        context.beginPath();
        context.moveTo(0, -9);
        context.lineTo(8, 0);
        context.lineTo(0, 9);
        context.lineTo(-8, 0);
        context.closePath();
      }
      context.fill();
      context.stroke();
      context.restore();
    }
    if (player?.vehicle && player.mode === "walk") {
      context.fillStyle = "#8cc6bb";
      context.strokeStyle = "#253b35";
      context.lineWidth = 2;
      context.fillRect(
        px(player.vehicle.x) - 5,
        pz(player.vehicle.z) - 5,
        10,
        10,
      );
      context.strokeRect(
        px(player.vehicle.x) - 5,
        pz(player.vehicle.z) - 5,
        10,
        10,
      );
    }
    for (const guest of players) {
      if (guest.id === player?.id) continue;
      context.fillStyle = "#735d90";
      context.beginPath();
      context.arc(px(guest.x), pz(guest.z), 3, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = "#192522df";
    context.fillRect(width - 28, 4, 24, 23);
    context.fillStyle = "#fff2ca";
    context.font = "bold 14px system-ui";
    context.textAlign = "center";
    context.fillText("N", width - 16, 21);
    if (player) {
      context.save();
      context.translate(px(player.x), pz(player.z));
      context.rotate(Math.PI - player.heading);
      context.fillStyle = "#fff9df";
      context.strokeStyle = "#253b35";
      context.lineWidth = 2.5;
      context.beginPath();
      context.moveTo(0, -9);
      context.lineTo(7, 7);
      context.lineTo(0, 4);
      context.lineTo(-7, 7);
      context.closePath();
      context.fill();
      context.stroke();
      context.restore();
    }
  }
  function drawFull() {
    if (overlay.hidden) return;
    const rect = full.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width)),
      height = Math.max(1, Math.round(rect.height));
    if (full.width !== width || full.height !== height) {
      full.width = width;
      full.height = height;
    }
    paint(
      full.getContext("2d"),
      width,
      height,
      fullCenter,
      (extent * 1.06) / zoom,
      true,
    );
    $("full-map-minus").disabled = zoom <= 1;
    $("full-map-plus").disabled = zoom >= 8;
    document.querySelector(".full-map-legend").textContent = translate(
      route?.kind === "direction"
        ? "Dashed line · destination direction"
        : "▲ You · ◆ Destination · Gold route",
    );
    $("full-map-objective").textContent = target
      ? translate(target.label)
      : translate("Explore the city");
  }
  return {
    open,
    close,
    get isOpen() {
      return !overlay.hidden;
    },
    update(state, goal, guests, time) {
      player = state;
      target = goal;
      players = guests;
      route = navigation.update(state, goal, time);
      document.body.classList.toggle("quest-on-map", Boolean(state && goal));
      if (state)
        paint(
          ctx,
          280,
          280,
          [state.x, state.z],
          state.mode === "drive" ? 600 : 340,
        );
      else
        paint(
          ctx,
          280,
          280,
          [
            (bounds.min[0] + bounds.max[0]) / 2,
            (bounds.min[1] + bounds.max[1]) / 2,
          ],
          extent * 1.06,
        );
      $("map-navigation-hint").textContent = translate(
        goal
          ? route?.kind === "route"
            ? "Follow the gold route"
            : "Destination direction"
          : "Tap for city map",
      );
      drawFull();
    },
  };
}
