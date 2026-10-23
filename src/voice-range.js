export const VOICE_RANGE = 40;
export function voiceVolume(distance) {
  if (!Number.isFinite(distance) || distance >= VOICE_RANGE) return 0;
  const fade = Math.max(0, (distance - 5) / (VOICE_RANGE - 5));
  return (1 - fade) ** 2;
}
export function withinVoiceRange(a, b) {
  return Boolean(a && b && Math.hypot(a.x - b.x, a.z - b.z) < VOICE_RANGE);
}
