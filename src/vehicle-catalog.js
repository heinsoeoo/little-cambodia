// Shared identifiers keep the picker, renderer and multiplayer validation aligned.
export const VEHICLES = [
  {
    id: "moto",
    name: "Motorcycle",
    kind: "bike",
    color: 0xd5ad62,
    length: 2.2,
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
