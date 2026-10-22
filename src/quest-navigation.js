import { buildGraph, findRoute } from "./navigation.js";
import { nearestRoad } from "./geo.js";
export function createQuestNavigation(roads, path) {
  const walking = roads.map((road) => ({ ...road, oneway: 0 }));
  const graphs = { walk: buildGraph(walking), drive: buildGraph(roads) };
  let previous = null,
    route = null;
  return {
    update(player, target, time) {
      if (!player || !target) {
        previous = null;
        route = null;
        return null;
      }
      const from = [player.x, player.z],
        to = target.point;
      if (
        previous &&
        previous.target === target &&
        previous.mode === player.mode &&
        time - previous.time < 1500 &&
        Math.hypot(from[0] - previous.from[0], from[1] - previous.from[1]) < 20
      )
        return route;
      previous = { from, target, mode: player.mode, time };
      const start = nearestRoad(from, [{ points: path }]),
        end = nearestRoad(to, [{ points: path }]);
      if (player.mode === "walk" && start.distance < 12 && end.distance < 12) {
        let middle = path.slice(
          Math.min(start.segment, end.segment) + 1,
          Math.max(start.segment, end.segment) + 1,
        );
        if (start.segment > end.segment) middle.reverse();
        route = {
          points: [from, start.point, ...middle, end.point, to],
          kind: "route",
        };
      } else {
        const result = findRoute(
          from,
          to,
          player.mode === "drive" ? roads : walking,
          graphs[player.mode === "drive" ? "drive" : "walk"],
        );
        route = result
          ? { points: [from, ...result.points, to], kind: "route" }
          : { points: [from, to], kind: "direction" };
      }
      return route;
    },
  };
}
export function radarPoint(point, center, span, size = 280, inset = 16) {
  const x = size / 2 + ((point[0] - center[0]) * size) / span,
    y = size / 2 + ((point[1] - center[1]) * size) / span;
  const dx = x - size / 2,
    dy = y - size / 2,
    ratio = Math.max(
      1,
      Math.abs(dx) / (size / 2 - inset),
      Math.abs(dy) / (size / 2 - inset),
    );
  return {
    x: size / 2 + dx / ratio,
    y: size / 2 + dy / ratio,
    offscreen: ratio > 1,
    angle: Math.atan2(dx, -dy),
  };
}
