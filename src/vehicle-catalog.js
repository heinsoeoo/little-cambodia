// Shared identifiers keep the picker, renderer and multiplayer validation aligned.
export const DEFAULT_VEHICLE = "mercedes-c300";
export const VEHICLES = [
  {
    id: DEFAULT_VEHICLE,
    name: "Mercedes C 300",
    kind: "sedan",
    color: 0x20242b,
    length: 4.7,
    luxuryGrille: true,
  },
  {
    id: "cedric",
    name: "Nissan Cedric",
    kind: "sedan",
    color: 0x8c9d99,
    length: 4.8,
  },
  {
    id: "land-cruiser",
    name: "Land Cruiser",
    kind: "suv",
    color: 0xc9baa0,
    length: 4.8,
  },
  {
    id: "pajero",
    name: "Pajero",
    kind: "suv",
    color: 0x9cae91,
    length: 4.5,
    spare: true,
  },
  {
    id: "hilux",
    name: "Hilux pickup",
    kind: "pickup",
    color: 0xc49b7a,
    length: 5,
  },
  {
    id: "moto",
    name: "Motorcycle",
    kind: "bike",
    color: 0xd5ad62,
    length: 2.2,
  },
  {
    id: "vespa",
    name: "Vespa",
    kind: "bike",
    scooter: "classic",
    color: 0x8daea1,
    length: 2.1,
  },
  {
    id: "scoopy",
    name: "Scoopy",
    kind: "bike",
    scooter: "rounded",
    color: 0xf1dfbc,
    length: 2,
  },
  {
    id: "tuktuk",
    name: "Tuk-tuk",
    kind: "tuktuk",
    color: 0xc87660,
    length: 3.3,
  },
  {
    id: "rickshaw",
    name: "Cycle rickshaw",
    kind: "rickshaw",
    color: 0x83aa94,
    length: 3.4,
  },
  {
    id: "corolla",
    name: "Corolla",
    kind: "sedan",
    color: 0xe3d3b4,
    length: 4.2,
  },
  {
    id: "celica",
    name: "Celica",
    kind: "coupe",
    color: 0xd19a83,
    length: 4.1,
    spoiler: true,
  },
  { id: "prius", name: "Prius", kind: "hatch", color: 0xb6c6bd, length: 4.3 },
  {
    id: "skyline-r34",
    name: "Skyline R34",
    kind: "coupe",
    color: 0x829fb8,
    length: 4.5,
    spoiler: true,
    roundTail: true,
  },
  {
    id: "mark-ii-1999",
    name: "Mark II · 1999",
    kind: "sedan",
    color: 0xaba2b6,
    length: 4.7,
  },
];
export function vehicleSpec(id) {
  return (
    VEHICLES.find((v) => v.id === id) ||
    VEHICLES.find((v) => v.id === "corolla")
  );
}
export const VEHICLE_TYPES = ["car", ...VEHICLES.map((v) => v.id)];

// Arcade tuning, not manufacturer specifications. Modest differences stay easy to drive.
const tuning = {
  "mercedes-c300": [11, 30, 28, 12],
  moto: [10, 26, 22, 13],
  vespa: [7.5, 22, 24, 13],
  scoopy: [7, 21, 25, 14],
  tuktuk: [6, 18, 18, 10],
  rickshaw: [2.2, 7, 12, 12],
  corolla: [9, 27, 24, 12],
  celica: [11.5, 30, 28, 11],
  prius: [8.5, 25, 27, 13],
  "skyline-r34": [13, 33, 30, 10],
  "mark-ii-1999": [10.5, 29, 23, 11],
  cedric: [9.5, 28, 22, 12],
  "land-cruiser": [9, 26, 21, 13],
  pajero: [8.5, 25, 22, 13],
  hilux: [8, 25, 21, 12],
};
export function vehiclePhysics(id) {
  const [power, maxSpeed, braking, grip] = tuning[id] || tuning.corolla;
  return { power, maxSpeed, braking, grip };
}

export const VEHICLE_PAINTS = [
  { id: "factory", name: "Original paint" },
  { id: "black", name: "Midnight black", color: 0x20242b },
  { id: "ivory", name: "Pearl ivory", color: 0xeee4ce },
  { id: "silver", name: "Soft silver", color: 0xaeb9bc },
  { id: "red", name: "Terracotta red", color: 0xbc6459 },
  { id: "blue", name: "River blue", color: 0x7097b0 },
  { id: "green", name: "Sage green", color: 0x8eaa8c },
  { id: "yellow", name: "Butter yellow", color: 0xe4bf74 },
  { id: "pink", name: "Dusty rose", color: 0xd6a1ac },
];
export function vehiclePaint(id) {
  return VEHICLE_PAINTS.find((p) => p.id === id)?.id || "factory";
}
export function paintColor(type, id) {
  return (
    VEHICLE_PAINTS.find((p) => p.id === vehiclePaint(id))?.color ??
    vehicleSpec(type).color
  );
}
