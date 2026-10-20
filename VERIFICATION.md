# Verification — v0.3 / 20 October 2026

- Automated suite: 18 tests covering the existing driving, fare and routing behavior plus Phnom Penh timezone conversion, opening/closing schedule boundaries, clock previews, building metadata precedence, portrait detection, multi-touch cancellation and riverside vendor schedules.
- Expanded dataset: 961 drivable roads, 4,842 footprints and 30 water ways. Static city: 29 mesh draws excluding stalls, NPCs, taxi and route overlay; 160,000 instanced window panes. This is a structure measurement, not an FPS benchmark.
- Browser checks across this update: live/day/weekend clock states, weekend population (240 pedestrians, 22 vendors), riverside shortcut, vendor dialogue, portrait 390×844 rotation prompt and landscape 844×390 controls. Portrait blocks driving and preview time. Previously verified pause/resume and the original taxi pickup behavior.
- Limitations: physical phones, long sessions, full manual delivery across the expanded city and broad GPU/browser performance remain unverified. NPCs are simple animated figures; vendor dialogue is ambient. No purchases, dynamic street closure routing, turn restrictions or interior building simulation.
- Scenery: exact OSM way footprints with available mapped heights/levels; most heights and all facade details are estimates. The promenade and market layout are stylized.


## v0.4 pixel-town pass — 20 October 2026

- Existing 18 simulation/routing/city-life tests pass; production build passes.
- Browser verified the orthographic pixel view, generated terrain/roof/water textures, rendered character sprites, day and market previews, and no captured browser errors.
- Mobile controls and portrait protection remain in place. This is an art-direction update; no new fare or collision rules.

## v0.5 Little Riverside — 20 October 2026

- Default world is an authored tile-style neighbourhood, not the dense OSM city.
- All 20 tests pass, including two new tests checking the authored taxi circuit, legal spawn, house collisions and river boundary. Legacy OSM tests remain intact.
- Production build passes; source formatted with Prettier.
- Browser checked new map rendering and initial 45 m pickup route. Existing shared mission, time and mobile behavior is retained.
- Browser smoke test additionally drove to the first pickup, stopped within 2 m, picked up the passenger and confirmed the Lotus Café destination. Wide zoom and the house markers on the minimap render correctly; no captured browser errors.

## v0.6 guest multiplayer open world — 20 October 2026

- All 26 tests passed. New tests cover nickname normalization, walking direction/diagonal speed, water/home boundaries, summon/enter/drive/exit, occupied parking, two real WebSocket guests, shared movement/vehicle state, disconnect removal and origin rejection.
- Production build passes. Both Vite integration and a standalone HTTP/WebSocket server are included.
- Browser: two named guests joined the same town, roster showed both, and avatars/parked vehicles rendered without captured errors. Walked from the riverside to a summoned car, entered, drove, braked, exited and returned to walking. Taxi meters, fares, jobs and mandatory driving were removed from the active UI.
- Multiplayer is a running-server prototype, not an Internet deployment. Physical-device networking, broad latency/load conditions, persistent accounts and multi-instance hosting have not been verified. Scenery/NPC animation is cosmetic per client; only players and personal vehicle state are synchronized.
- Standalone production smoke test served the built HTML and completed an actual WebSocket guest join on a temporary loopback port. Phone-sized 844×390 controls were checked with two connected guests; portrait rotation protection remains active.
- Browser logout was verified: the leaving guest returned to nickname entry, the other client dropped from two guests to one, and the parked vehicle/presence disappeared. Both test guests were disconnected after verification.


## v0.7 central Phnom Penh and driving — 20 October 2026

- Expanded the active shared map to 961 road ways / 4,842 building footprints from the retained OSM extract, approximately 2.7 × 3 km. River collision, the mapped promenade exclusion for cars, district bounds and a spatial building index run on both server and client. All 16 spawn slots were checked clear; a guest can summon, enter and drive away from arrival.
- Added Cedric, Land Cruiser, Pajero and Hilux with original simplified models. Per-vehicle arcade power, top speed, grip and braking differ modestly. Space is the regular brake; Shift is the car handbrake. Drift carries lateral velocity, grip returns when released, and collision substeps prevent tunnelling. Motorcycles and three-wheel vehicles retain stable handling.
- All 32 tests passed, including new acceleration/brake comparisons, full stopping under throttle, lateral handbrake slip/grip recovery, collision velocity reset and expanded-map arrival checks. Formatting and production build pass. Production HTTP and WebSocket guest join smoke test passed.
- Browser: joined the geographic map, walked to Cedric and Land Cruiser, entered, drove, applied the brake/handbrake controls and confirmed stopped state. A second connected guest appeared in the roster. Landscape 844×390 displays separate DRIFT/BRAKE controls; portrait 390×844 displays rotation protection. This checks phone-sized layout, not physical phone GPU performance.
- The district is geographically based, not an exact architectural reconstruction or all of greater Phnom Penh. Most heights and all facades, colors and vegetation are illustrative. NPC schedules remain cosmetic local previews. The larger map increases the client bundle (about 472 kB gzip); broad mobile performance and latency/load testing remain future work.


## Road clearance and building occlusion fix — 20 October 2026

- Road-corridor intersection tests omit conflicting footprints from the active map; all 4,006 remaining buildings are tested clear of widened drivable lanes. Geometry, facade rendering, minimap and server collision use the same result. Raw/derived OSM source data is retained untouched.
- Local-player visibility applies a depth-aware screen-space opening to batched walls and facade/roof materials. It follows the actual projected player, accounts for device pixel ratio, uses a larger opening while driving, and disables after leaving. It leaves opaque depth and shadow behavior intact outside the opening.
- All 36 tests pass; production build passes. New tests cover enclosed/crossing/diagonal road conflicts, all active buildings, high-DPI projection, driving/walking radii and material shader integration.
- Live browser verification could not be completed this turn: the browser URL security policy rejected reopening the preview. No browser workaround was attempted. Visual appearance of the new cutaway still needs an in-game check.
