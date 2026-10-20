# Phnom Drive — Little Riverside (v0.5)

A playable, handcrafted Cambodian town for the pixel-art driving game. This version replaces the default dense geographic city with a compact authored neighbourhood: small homes, shops, garden paths, a market square and a clean riverbank. It is inspired by Phnom Penh, not a street-for-street representation.

## Play

```sh
npm ci
npm run dev
```

Open the local Vite address and choose **Start your shift**. WASD/arrows drive, Space brakes, E picks up/drops off, R resets to the road, C changes zoom and P pauses. Mobile users get steering/accelerator/reverse/brake buttons and a portrait rotation prompt.

Follow the route and stop within 15 m to pick up or deliver. Completed fares earn 6,000 fictional riel, saved in the browser. No account is needed.

## New map direction

- 16 original house/shop sprites on an authored, connected neighbourhood street grid.
- Shingled roofs, short front walls, doors, windows and small garden paths.
- A market square and flower garden with a fountain.
- Tree-lined edges and a distinct grass/paving/sand/water riverbank.
- A flat painted tile-style world, viewed from above, replaces tall extruded buildings.
- Collisions use the same authored house footprints shown on the map.

`src/town-map.js` defines the layout and five taxi destinations. `src/town-world.js` paints the original pixel map and supplies collision rules. Both are separate from the shared vehicle, missions, navigation, clock and mobile systems.

## People and time

The clock defaults to Asia/Phnom_Penh. **City time** offers weekday-noon and weekend-market previews. The weekend market runs Saturday/Sunday 18:00–23:00 with 240 pedestrians and 22 vendors; other periods have fewer characters. Counts and daily seller schedules are illustrative gameplay choices. Previews advance six game seconds per real second while playing and freeze during pause or portrait protection.

**Visit riverside** moves the taxi to a nearby access road. Stop and use **Talk to vendor** or V for ambient dialogue. There is no purchase/inventory system yet.

## Verification / build

```sh
npm test
npm run format:check
npm run build
```

Serve `dist/` from a static HTTP server; opening index.html directly does not work. Dependencies and generated builds are excluded from Git.

## Geographic prototype retained

The prior OSM extracts, city configuration, geographic world builder and tests remain in the repository as reference material. They are no longer the default playable map. See `SOURCES.md` and `public/data/ATTRIBUTION.md` for OSM data provenance and ODbL attribution. The authored Little Riverside map is original artwork and geometry; it does not derive its street layout from OSM.

## Limits

A stylized small neighbourhood, not an entire city. No traffic AI, interiors, walking controls, multiplayer, turn restrictions or real-world street closures. Physical-phone performance and long sessions are not fully verified. The NPCs are simple animated sprites. No assets from Harvest Moon or Stardew Valley are included.

The local Git repository uses `main`; no remote is configured.
