import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// Luma Bay-inspired materials, shared by the city, garage, wardrobe and intro.
export const ART = Object.freeze({
  grass: 0xa6bd91,
  road: 0x758583,
  pavement: 0xe8dfca,
  water: 0x83b9ba,
  sky: 0xd9e6dc,
  night: 0x263e51,
  walls: [0xe7c8b4, 0xddd7bc, 0xb8cec1, 0xd6c4ce, 0xecd9b9, 0xc1d0d5],
  trim: 0xf7edda,
  glass: 0x789caa,
  foliage: 0x81a67d,
});
export function softMaterial(color, options = {}) {
  return new T.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0,
    ...options,
  });
}
export function roundedGeometry(w, h, d, radius = 0.08) {
  const r = Math.max(0.001, Math.min(radius, w * 0.45, h * 0.45, d * 0.45));
  // Major volumes get smooth rounded corners; thin trim keeps a smaller mesh.
  return new RoundedBoxGeometry(w, h, d, Math.min(w, h, d) > 0.2 ? 2 : 1, r);
}
export function finishRenderer(renderer) {
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
}
