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
