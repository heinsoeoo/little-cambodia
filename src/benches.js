import { samplePath } from "./riverside.js";
export function riversideBenches(path, blocked) {
  const seats = [];
  for (let i = 0; i < 24; i++) {
    const sample = samplePath(path, (i + 0.5) / 24);
    if (!sample) continue;
    const x = sample.point[0] - 1.5,
      z = sample.point[1];
    if (
      [
        [-1.5, -1.8],
        [-1.5, 1.8],
        [1.5, -1.8],
        [1.5, 1.8],
        [0, 0],
      ].every(([dx, dz]) => !blocked(x + dx, z + dz))
    )
      seats.push({ id: `river-bench-${i}`, x, z, heading: Math.PI / 2 });
  }
  return seats;
}
export function nearestBench(player, benches) {
  if (!player || player.mode !== "walk") return null;
  let nearest = null;
  for (const bench of benches) {
    const distance = Math.hypot(player.x - bench.x, player.z - bench.z);
    if (!nearest || distance < nearest.distance)
      nearest = { ...bench, distance };
  }
  return nearest;
}
