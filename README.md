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
- R: return to the nearest road. C: chase/overhead camera. P: pause/resume.
- Camera button: switch view. Mobile steering, accelerator, reverse and brake buttons support simultaneous fingers; pickup/drop-off uses the mission button. Portrait phones show a rotate prompt and suspend driving.

Follow the lime route on the road and minimap. Navigation recalculates every second through connected OSM nodes and respects mapped one-way streets. Restricted and pedestrian-only roads are excluded. If a road connection cannot be found, the map clearly falls back to dotted direct guidance. Pause also activates when you switch away from the game. Each completed fare earns 6,000 fictional riel, saved locally in your browser. No login or backend is needed.

## What's included

961 drivable OSM road ways and 4,842 building footprints; a roughly 2.7 × 3.0 km district; arcade taxi handling; footprint collision checks; a stylized Independence Monument; procedural trees; six road-snapped fare locations; minimap; day/evening lighting. Counts reflect the bundled extract.

## Structure and extension

- `src/cities.js`: city-specific origin, data file, bounds, and fare landmarks.
- `src/geo.js`: coordinate projection, map parsing, road proximity.
- `src/navigation.js`: road graph, shortest-path routing, one-way constraints and opening spawn.
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
npm run format:check
npm run build
```

Serve `dist/` using any static HTTP server. Do not open index.html directly from the filesystem. Building from the lockfile with `npm ci` gives reproducible dependency versions. Runtime map data is local; optional Google Fonts fall back to installed fonts if unavailable.

## Prototype limits

Desktop browser smoke-tested; touch controls implemented but not verified on a physical phone. No traffic AI, walking, multiplayer, turn-by-turn navigation, sound or realistic suspension. Buildings use OSM footprints with mostly generated heights; this is stylized scenery, not an accurate architectural reconstruction. The expanded district includes the Tonlé Sap riverside and night-market access. The map edge is bounded; there is no city streaming. Collision uses a point plus 1.5 m footprint clearance, not rigid-body physics. Static geometry is merged by material into 29 mesh draws (excluding NPCs and stalls); actual frame-rate gains depend on the device. The chase camera rises above the taxi when its intended position intersects an obstacle. Broader camera handling and device performance profiling remain future work. Routing does not yet account for turn restrictions, road closures or traffic.

## Data and credits

© OpenStreetMap contributors, ODbL. Source and license: https://www.openstreetmap.org/copyright . The unmodified source extract is distributed in `public/data/phnom-penh.osm.json`. See `public/data/ATTRIBUTION.md` for query and retrieval details. Three.js is MIT licensed. See installed dependency licenses. No reference game assets or code are included.


## Git history

This folder is a Git repository on `main`. The original playable prototype is preserved in the first commit, followed by the navigation and rendering enhancement. Dependencies and generated builds are ignored. No remote is configured yet.


## City life (v0.3)

The city defaults to live **Asia/Phnom_Penh** time. The City time selector offers weekday-noon and weekend-market previews. Previews advance six game seconds per real second while playing; pause or portrait mode stops preview time. Live mode always reflects the current clock.

Weekend market activity runs Saturday/Sunday 18:00–23:00: 240 walking NPCs plus 22 vendors. Weekdays and daytime have smaller populations; carts close overnight. Except for the weekend hours, these are illustrative gameplay schedules and population counts, not a claim about each real seller. Use **Visit riverside**, park, then **Talk to vendor** or V for ambient dialogue. There is no purchase/inventory system yet. Road closures across the real walking-street area are not fully simulated.

The river polygon and footprints come from OSM. Building classification uses building/shop/tourism and land-use tags. Available height and level tags are honored; 4,680 buildings lack those tags and use explicitly estimated heights. Roofs, doors, windows, stall positions and NPCs are procedural representations, not street-view reconstructions. The shoreline promenade follows an offset of the mapped river bank. Whole-building geometry is supported; multipolygon courtyards and detailed roof forms remain simplified.

Additional modules: `buildings.js` and `facades.js` for building metadata and detail; `schedule.js` for clock/activity; `riverside.js` for shore geometry; `street-life.js` for vendors/crowds; `mobile.js` for input and rotation logic. `scripts/convert-osm.py` prepares the official map API XML response. See `SOURCES.md` for geographic and schedule references.
