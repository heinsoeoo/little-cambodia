import { nearestRoad } from "./geo.js";

const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const nodeKey = (road, i) =>
  road.nodeIds?.[i] !== undefined
    ? `osm:${road.nodeIds[i]}`
    : `xy:${road.points[i][0].toFixed(2)},${road.points[i][1].toFixed(2)}`;

// Shared OSM nodes connect streets. Geometric crossings without a shared node
// stay disconnected, so bridges do not create imaginary intersections.
export function buildGraph(roads) {
  const graph = new Map();
  function node(key, point) {
    if (!graph.has(key)) graph.set(key, { point, edges: [] });
    return graph.get(key);
  }
  for (const road of roads) {
    road.points.forEach((point, i) => node(nodeKey(road, i), point));
    for (let i = 1; i < road.points.length; i++) {
      const a = nodeKey(road, i - 1),
        b = nodeKey(road, i);
      const weight = distance(road.points[i - 1], road.points[i]);
      if (road.oneway !== -1) graph.get(a).edges.push({ to: b, weight });
      if (road.oneway !== 1) graph.get(b).edges.push({ to: a, weight });
    }
  }
  return graph;
}

// Small binary heap keeps rerouting inexpensive on a district-sized network.
class Queue {
  items = [];
  push(key, cost) {
    const entry = { key, cost };
    let i = this.items.length;
    this.items.push(entry);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].cost <= cost) break;
      this.items[i] = this.items[parent];
      i = parent;
    }
    this.items[i] = entry;
  }
  pop() {
    const first = this.items[0],
      last = this.items.pop();
    if (this.items.length) {
      let i = 0;
      while (i * 2 + 1 < this.items.length) {
        let child = i * 2 + 1;
        if (
          child + 1 < this.items.length &&
          this.items[child + 1].cost < this.items[child].cost
        )
          child++;
        if (this.items[child].cost >= last.cost) break;
        this.items[i] = this.items[child];
        i = child;
      }
      this.items[i] = last;
    }
    return first;
  }
}

export function findRoute(from, to, roads, graph = buildGraph(roads)) {
  const start = nearestRoad(from, roads),
    end = nearestRoad(to, roads);
  if (!start.point || !end.point) return null;
  const extras = new Map([
    ["start", { point: start.point, edges: [] }],
    ["end", { point: end.point, edges: [] }],
  ]);
  const endpoint = (snap, i) => nodeKey(snap.road, snap.segment + i);
  const add = (a, b, weight) => {
    if (!extras.has(a))
      extras.set(a, {
        point: graph.get(a).point,
        edges: [...graph.get(a).edges],
      });
    extras.get(a).edges.push({ to: b, weight });
  };
  for (const i of [0, 1]) {
    if (
      distance(start.point, start.road.points[start.segment + i]) < 0.001 ||
      (i === 0 && start.road.oneway !== 1) ||
      (i === 1 && start.road.oneway !== -1)
    )
      add(
        "start",
        endpoint(start, i),
        distance(start.point, start.road.points[start.segment + i]),
      );
    if (
      distance(end.point, end.road.points[end.segment + i]) < 0.001 ||
      (i === 0 && end.road.oneway !== -1) ||
      (i === 1 && end.road.oneway !== 1)
    )
      add(
        endpoint(end, i),
        "end",
        distance(end.point, end.road.points[end.segment + i]),
      );
  }
  if (
    start.road === end.road &&
    start.segment === end.segment &&
    (!start.road.oneway || (end.t - start.t) * start.road.oneway >= 0)
  )
    add("start", "end", distance(start.point, end.point));
  const get = (key) => extras.get(key) || graph.get(key);
  const queue = new Queue(),
    costs = new Map([["start", 0]]),
    previous = new Map();
  queue.push("start", 0);
  while (queue.items.length) {
    const current = queue.pop();
    if (current.cost !== costs.get(current.key)) continue;
    if (current.key === "end") {
      const points = [];
      for (let key = "end"; key; key = previous.get(key))
        points.push(get(key).point);
      return {
        points: points.reverse(),
        distance: current.cost + start.distance + end.distance,
      };
    }
    for (const edge of get(current.key).edges) {
      const next = current.cost + edge.weight;
      if (next >= (costs.get(edge.to) ?? Infinity)) continue;
      costs.set(edge.to, next);
      previous.set(edge.to, current.key);
      queue.push(edge.to, next);
    }
  }
  return null;
}

// Spawn upstream of the first pickup so the opening route is short and legal.
export function approachSpawn(snap, meters = 45) {
  const direction = snap.road.oneway === -1 ? -1 : 1;
  let cursor = snap.point;
  let i = direction === 1 ? snap.segment : snap.segment + 1;
  while (i >= 0 && i < snap.road.points.length) {
    const previous = snap.road.points[i],
      length = distance(cursor, previous);
    if (length >= meters && length > 0) {
      const t = meters / length;
      return {
        point: [
          cursor[0] + (previous[0] - cursor[0]) * t,
          cursor[1] + (previous[1] - cursor[1]) * t,
        ],
        heading: Math.atan2(cursor[0] - previous[0], cursor[1] - previous[1]),
      };
    }
    meters -= length;
    cursor = previous;
    i -= direction;
  }
  return {
    point: cursor,
    heading: snap.heading + (direction === -1 ? Math.PI : 0),
  };
}
