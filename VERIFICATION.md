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
