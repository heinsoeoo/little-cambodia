// Every piece is available to every gender; presets are optional starting points.
export const GENDERS = [
  { id: "male", name: "Male" },
  { id: "female", name: "Female" },
  { id: "unspecified", name: "Prefer not to say" },
];
export const OUTFIT_CUTS = [
  { id: "auto", name: "Match gender" },
  { id: "male", name: "Male" },
  { id: "female", name: "Female" },
  { id: "unisex", name: "Unisex" },
];
export function outfitCut(look) {
  return look.cut && look.cut !== "auto"
    ? look.cut
    : look.gender === "male"
      ? "male"
      : look.gender === "female"
        ? "female"
        : "unisex";
}
export const SKIN_TONES = [
  { id: "warm", name: "Warm", color: 0xd6ae8b },
  { id: "light", name: "Light", color: 0xf0cdb0 },
  { id: "tan", name: "Tan", color: 0xb7835e },
  { id: "deep", name: "Deep", color: 0x79513d },
];
export const STYLES = [
  {
    id: "casual",
    name: "Casual",
    top: 0xa7bba1,
    bottom: 0x71869c,
    shoe: 0xf0e6d2,
    hair: 0x614d40,
    hairShape: "short",
    topShape: "tee",
    bottomShape: "straight",
    shoeShape: "sneakers",
  },
  {
    id: "luxury",
    name: "Luxury",
    top: 0xd7c5a4,
    bottom: 0x645b67,
    shoe: 0x4e4440,
    hair: 0x3a302b,
    hairShape: "bob",
    topShape: "jacket",
    bottomShape: "tailored",
    shoeShape: "dress",
  },
  {
    id: "street",
    name: "Street",
    top: 0x8b9cba,
    bottom: 0x576254,
    shoe: 0xe9d2b4,
    hair: 0x45382f,
    hairShape: "curls",
    topShape: "hoodie",
    bottomShape: "cargo",
    shoeShape: "sneakers",
  },
  {
    id: "old-money",
    name: "Old money",
    top: 0xe8ddc5,
    bottom: 0x988570,
    shoe: 0x71513c,
    hair: 0x795e42,
    hairShape: "sidepart",
    topShape: "polo",
    bottomShape: "tailored",
    shoeShape: "loafers",
  },
  {
    id: "rapper",
    name: "Rapper",
    top: 0x7c667e,
    bottom: 0x46596c,
    shoe: 0xf1e6d6,
    hair: 0x302c2c,
    hairShape: "braids",
    topShape: "oversized",
    bottomShape: "wide",
    shoeShape: "high-tops",
  },
  {
    id: "punk",
    name: "Punk",
    top: 0x47474e,
    bottom: 0x725765,
    shoe: 0x3b3b43,
    hair: 0xaa697d,
    hairShape: "mohawk",
    topShape: "vest",
    bottomShape: "cargo",
    shoeShape: "boots",
  },
  {
    id: "sporty",
    name: "Sporty",
    top: 0xc98d76,
    bottom: 0x535a6a,
    shoe: 0xf1c87e,
    hair: 0x624b3d,
    hairShape: "ponytail",
    topShape: "jersey",
    bottomShape: "shorts",
    shoeShape: "sneakers",
  },
  {
    id: "bohemian",
    name: "Bohemian",
    top: 0xc88e83,
    bottom: 0xe7d8bb,
    shoe: 0x957553,
    hair: 0x795b42,
    hairShape: "long",
    topShape: "blouse",
    bottomShape: "skirt",
    shoeShape: "sandals",
  },
  {
    id: "workwear",
    name: "Workwear",
    top: 0xb2966f,
    bottom: 0x66746d,
    shoe: 0x785d42,
    hair: 0x463b34,
    hairShape: "cropped",
    topShape: "jacket",
    bottomShape: "cargo",
    shoeShape: "boots",
  },
  {
    id: "riverside",
    name: "Riverside linen",
    top: 0xe3ccb8,
    bottom: 0x8a9e9c,
    shoe: 0xab8b67,
    hair: 0x47362c,
    hairShape: "bun",
    topShape: "blouse",
    bottomShape: "wide",
    shoeShape: "sandals",
  },
];
export function style(id) {
  return STYLES.find((s) => s.id === id) || STYLES[0];
}
export function appearance(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) value = {};
  const allowed = (list, id, fallback) =>
    list.some((v) => v.id === id) ? id : fallback;
  return {
    gender: allowed(GENDERS, value.gender, "unspecified"),
    cut: allowed(OUTFIT_CUTS, value.cut, "auto"),
    skin: allowed(SKIN_TONES, value.skin, "warm"),
    hair: style(value.hair).id,
    top: style(value.top).id,
    bottom: style(value.bottom).id,
    shoes: style(value.shoes).id,
  };
}
export function preset(id, base = {}) {
  return appearance({ ...base, hair: id, top: id, bottom: id, shoes: id });
}

const genderHair = {
  male: [
    ["Textured crop", "short"],
    ["Slicked back", "sidepart"],
    ["Curly fade", "fade"],
    ["Classic side part", "sidepart"],
    ["Cornrows", "braids"],
    ["Mohawk", "mohawk"],
    ["Crew cut", "cropped"],
    ["Loose quiff", "quiff"],
    ["Short fade", "fade"],
    ["Swept fringe", "short"],
  ],
  female: [
    ["Soft bob", "bob"],
    ["Long waves", "waves"],
    ["Curly bob", "curls"],
    ["Side-swept waves", "waves"],
    ["Long braids", "braids"],
    ["Pixie cut", "pixie"],
    ["High ponytail", "ponytail"],
    ["Long flowing hair", "long"],
    ["Low bun", "bun"],
    ["Messy bun", "bun"],
  ],
};
export function hairstyle(id, gender) {
  const source = style(id),
    index = STYLES.indexOf(source),
    variant = genderHair[gender]?.[index];
  return {
    ...source,
    name: variant?.[0] || source.hairShape.replaceAll("-", " "),
    hairShape: variant?.[1] || source.hairShape,
  };
}
