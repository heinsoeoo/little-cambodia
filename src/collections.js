const cuteOutfits = new Set(["casual", "bohemian", "riverside"]);
const coolOutfits = new Set(["street", "rapper", "punk", "sporty"]);
const cuteVehicles = new Set([
  "vespa",
  "scoopy",
  "prius",
  "corolla",
  "rickshaw",
  "tuktuk",
]);
const coolVehicles = new Set([
  "mercedes-c300",
  "skyline-r34",
  "celica",
  "moto",
  "offroad-moto",
  "racing-moto",
  "mark-ii-1999",
]);
export function collectionFor(type, id) {
  const cute = type === "vehicle" ? cuteVehicles : cuteOutfits;
  const cool = type === "vehicle" ? coolVehicles : coolOutfits;
  return cute.has(id) ? "Cute" : cool.has(id) ? "Cool" : "Classic";
}
