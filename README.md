# Phnom Drive

Playable Three.js taxi prototype for central Phnom Penh. Original procedural artwork and code, inspired by the accessible city-driving loop of OpenTaxi.

## Play locally

Requires Node.js 20.19+ or 22+.

```sh
npm install
npm run dev
```

Open the address printed by Vite (normally http://127.0.0.1:5173). Click **Start your shift**.

- WASD / arrow keys: accelerate, reverse and steer.
- Space: brake. E: pick up/drop off when stopped within 15 m.
- R: return to the nearest road. C: chase/overhead camera.
- Daylight button: toggle evening. Touch arrows appear on narrow screens.

Follow the lime beacon and minimap dot. The dotted line and distance indicate the destination directly, not a calculated driving route. Each completed fare earns 6,000 fictional riel, saved locally in your browser. No login or backend is needed.

## What's included

551 OSM road ways and 2,850 building footprints; a roughly 1.6 × 1.9 km district; arcade taxi handling; footprint collision checks; a stylized Independence Monument; procedural trees; five road-snapped fare locations; minimap; day/evening lighting. Counts reflect the bundled extract.

## Structure and extension

- `src/cities.js`: city-specific origin, data file, bounds, and fare landmarks.
- `src/geo.js`: coordinate projection, map parsing, road proximity.
- `src/world.js`: procedural environment, taxi model and spatial collision index.
- `src/vehicle.js`: fixed-step vehicle simulation.
- `src/missions.js`: pickup/drop-off rules, rewards and save state.
- `src/main.js`: renderer, camera, controls, UI and application lifecycle.
- `public/data/`: bundled OSM source extract and attribution.
- `PLAN.md`: inspection findings, scope and follow-up milestones.

To add Siem Reap, provide another city configuration and an OSM extract with the same schema, select that configuration in main, and supply local landmarks. Map and collision extents derive from city bounds; scenery population should be tuned per city. A city selection screen and city-specific storage keys are future work. The shared simulation and mission modules require no city-specific logic.

## Verify / distribute

```sh
npm test
npm run build
```

Serve `dist/` using any static HTTP server. Do not open index.html directly from the filesystem. Building from the lockfile with `npm ci` gives reproducible dependency versions. Runtime map data is local; optional Google Fonts fall back to installed fonts if unavailable.

## Prototype limits

Desktop browser smoke-tested; touch controls implemented but not verified on a physical phone. No traffic AI, walking, multiplayer, turn-by-turn navigation, sound or realistic suspension. Buildings use OSM footprints with mostly generated heights; this is stylized scenery, not an accurate architectural reconstruction. The riverfront lies mostly beyond this compact district. The map edge is bounded; there is no city streaming. Collision uses a point plus 1.5 m footprint clearance, not rigid-body physics. Camera obstruction avoidance and performance profiling remain future work.

## Data and credits

© OpenStreetMap contributors, ODbL. Source and license: https://www.openstreetmap.org/copyright . The unmodified source extract is distributed in `public/data/phnom-penh.osm.json`. See `public/data/ATTRIBUTION.md` for query and retrieval details. Three.js is MIT licensed. See installed dependency licenses. No reference game assets or code are included.
