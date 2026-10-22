import { nearestRoad } from "./geo.js";
export function cityErrands(roads, places, spawn, blocked) {
  function pavement(point) {
    const near = nearestRoad(point, roads),
      angle = near.heading;
    for (const offset of [
      near.road.width / 2 + 1,
      -near.road.width / 2 - 1,
      0,
      3,
      -3,
    ]) {
      const p = [
        near.point[0] + Math.cos(angle) * offset,
        near.point[1] - Math.sin(angle) * offset,
      ];
      if (!blocked(...p)) return p;
    }
    return near.point;
  }
  const location = (kind) =>
    pavement(places.find((p) => p.kind === kind).center);
  const home = pavement(spawn),
    market = location("market"),
    central = location("central-market"),
    palace = location("palace");
  const stop = (point, label, action, npc, dialog) => ({
    point,
    label,
    action,
    npc,
    dialog,
  });
  return [
    {
      id: "parcel",
      title: "Dara’s little parcel",
      description:
        "Help Dara take a fabric parcel from Kandal Market to a friend near Central Market. You can drive between stops; get out to talk.",
      mode: "walk",
      reward: 60,
      stops: [
        stop(
          home,
          "Meet Dara near the riverside",
          "Talk to Dara",
          "Dara",
          "Dara: Could you collect my fabric parcel at Kandal Market? My friend near Central Market is waiting. Thank you!",
        ),
        stop(
          market,
          "Collect the fabric parcel at Kandal Market",
          "Collect parcel",
          "Sophea",
          "Sophea: Here is Dara’s parcel. Please take it to Vanna near Central Market.",
        ),
        stop(
          central,
          "Deliver the parcel near Central Market",
          "Hand over parcel",
          "Vanna",
          "Vanna: You brought it! This will help me finish today’s sewing. Thank you so much.",
        ),
      ],
    },
    {
      id: "scarf",
      title: "The missing scarf",
      description:
        "Sophea left a scarf near the Royal Palace. Find it and bring it back to Kandal Market.",
      mode: "walk",
      reward: 70,
      stops: [
        stop(
          market,
          "Ask Sophea about her scarf",
          "Talk to Sophea",
          "Sophea",
          "Sophea: I left my favourite scarf near the palace. Could you bring it back?",
        ),
        stop(
          palace,
          "Find the scarf by the palace pavement",
          "Pick up scarf",
          null,
          "A soft scarf is folded beside the bench. This must be Sophea’s.",
        ),
        stop(
          market,
          "Return to Sophea at Kandal Market",
          "Return scarf",
          "Sophea",
          "Sophea: My scarf! You made my day. Please take these stamps for a treat.",
        ),
      ],
    },
    {
      id: "flowers",
      title: "Flowers for a friend",
      description:
        "Pick up a little bouquet near Central Market and bring it to Lina by the palace.",
      mode: "walk",
      reward: 55,
      stops: [
        stop(
          central,
          "Meet Vanna near Central Market",
          "Collect flowers",
          "Vanna",
          "Vanna: Please bring this little bouquet to Lina by the palace. It is her birthday!",
        ),
        stop(
          palace,
          "Find Lina by the palace pavement",
          "Give flowers",
          "Lina",
          "Lina: For me? What a lovely surprise. Thank you for coming all this way!",
        ),
      ],
    },
  ];
}
export const SNACKS = [
  { id: "skewers", name: "Grilled skewers", cost: 10 },
  { id: "coconut", name: "Fresh coconut", cost: 8 },
  { id: "sugarcane", name: "Sugarcane juice", cost: 6 },
  { id: "nom-krok", name: "Nom krok", cost: 8 },
  { id: "fruit", name: "Fruit cart", cost: 5 },
  { id: "noodles", name: "Noodle cart", cost: 12 },
];
