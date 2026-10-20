# Phnom Drive — prototype plan

## Reference inspection
Inspected https://game.drnyeinchan.com/opentaxi/ on 18 October 2026. Its visible UI includes a taxi meter, city selector (Yangon/Mandalay), minimap, vehicle switching, flying, help and settings. Its page credits Three.js, OpenStreetMap and Firebase. Driving quality and network features were not verified. This project uses original code and procedural visuals; no reference game code or assets are reused.

## Achievable scope
Start with a roughly 1.4 × 1.8 km central Phnom Penh district, a single taxi, chase camera, keyboard/touch controls, solid buildings, bounded map, and repeatable fares paid in riel. Real OSM streets and footprints provide geographic structure; building heights and colors are stylized. This is a driving prototype, not a complete city simulation.

## Architecture
- City configuration: geographic origin, bounds, landmarks and dataset path.
- Offline data pipeline: Overpass highway/building ways with geometry, converted to local meters. Runtime never calls Overpass.
- World: road ribbons, extruded footprints, a stylized monument and procedural vegetation.
- Vehicle: fixed-step arcade model with acceleration, reverse, speed-dependent steering, drag, braking and collision rollback.
- Missions: road-snapped pickup/drop-off, proximity plus stopped-vehicle interaction, local earnings persistence.
- UI: minimap, speed, destination, distance, controls and day/night.

## Expansion
1. Road-graph route guidance, one-way routing, drivable-road filtering, pause/resume and static geometry batching implemented in v0.2. Validate steering, fares and frame rate with players; next improve traffic rules.
2. Add turn instructions, traffic agents, sound and tuned tuk-tuk model.
3. Stream larger city chunks and introduce authored landmark models and mobile quality tiers.
4. Add Siem Reap through a second city config + prepared OSM dataset + landmark pack. Keep simulation shared. Multiplayer, accounts and walking are deferred until single-player is stable.

OSM data is ODbL; show attribution and distribute the source extract. Production hosting must preserve attribution and review derivative database obligations: https://www.openstreetmap.org/copyright .

## v0.6 direction — guest multiplayer open world

The product is now Phnom Life, not a mandatory taxi simulator. Guest nickname entry leads to walking in the city and on the riverfront. Optional personal car, tuk-tuk and moto vehicles can be summoned, entered and parked. One Node/WebSocket server owns movement and guest sessions; the first town supports 16 guests.

The former taxi loop is inactive reference code. A future job system should attach an optional job state to a guest and use the existing vehicle type, rather than making vehicle ownership or taxi work a requirement to explore. Hosting the multiplayer server publicly, persistent accounts/world state and private rooms remain separate future work.
