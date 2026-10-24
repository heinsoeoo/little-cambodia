export const CLASSES = {
  fighter: {
    name: "Fighter",
    icon: "⚔",
    color: 0xd38b57,
    hp: 140,
    damage: 20,
    range: 3.5,
    cooldown: 650,
    skillCooldown: 6500,
    speed: 4.6,
    skill: "Sweeping slash",
    weapon: "Ember blade",
    description: "Balanced melee · wide sweeping attacks",
  },
  mage: {
    name: "Mage",
    icon: "✦",
    color: 0x9d88df,
    hp: 95,
    damage: 18,
    range: 15,
    cooldown: 800,
    skillCooldown: 7500,
    speed: 4.4,
    skill: "Arcane burst",
    weapon: "Moon staff",
    description: "Ranged magic · powerful area damage",
  },
  assassin: {
    name: "Assassin",
    icon: "⌁",
    color: 0xb46aa5,
    hp: 105,
    damage: 17,
    range: 3,
    cooldown: 420,
    skillCooldown: 6000,
    speed: 5.5,
    skill: "Dash strike",
    weapon: "Twin dusk daggers",
    description: "Fast melee · dash into burst damage",
  },
  marksman: {
    name: "Marksman",
    icon: "➶",
    color: 0x77b4bf,
    hp: 105,
    damage: 15,
    range: 20,
    cooldown: 500,
    skillCooldown: 6000,
    speed: 4.8,
    skill: "Piercing shot",
    weapon: "River bow",
    description: "Long range · steady damage and piercing shots",
  },
  support: {
    name: "Support",
    icon: "✚",
    color: 0xa8c986,
    hp: 115,
    damage: 17,
    range: 13,
    cooldown: 700,
    skillCooldown: 8000,
    speed: 4.6,
    skill: "Healing circle",
    weapon: "Lotus scepter",
    description: "Magic attacks · heal yourself and nearby allies",
  },
  tank: {
    name: "Tank",
    icon: "⬡",
    color: 0xc5ae70,
    hp: 190,
    damage: 16,
    range: 3.5,
    cooldown: 750,
    skillCooldown: 8000,
    speed: 4.1,
    skill: "Taunt and guard",
    weapon: "Guardian shield",
    description: "Durable melee · draw enemies and reduce damage",
  },
};
export const classId = (value) =>
  Object.hasOwn(CLASSES, value) ? value : "fighter";
export const DUNGEON_ROOMS = [
  { x: -12, z: -18, w: 24, h: 30, name: "Lantern hall" },
  { x: -12, z: -45, w: 24, h: 23, name: "Whisper gallery" },
  { x: -14, z: -78, w: 28, h: 28, name: "The Warden" },
];
export const DUNGEON_CORRIDORS = [
  { x: -3, z: -23, w: 6, h: 6 },
  { x: -3, z: -51, w: 6, h: 7 },
];
export function dungeonBlocked(x, z, stage = 0) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return true;
  if ((stage < 1 && z < -19) || (stage < 2 && z < -46)) return true;
  return ![...DUNGEON_ROOMS, ...DUNGEON_CORRIDORS].some(
    (r) =>
      x > r.x + 0.4 &&
      x < r.x + r.w - 0.4 &&
      z > r.z + 0.4 &&
      z < r.z + r.h - 0.4,
  );
}
