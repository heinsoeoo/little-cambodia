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


## v0.8 character creator and mixed wardrobe — 20 October 2026

- Ten collections support independent hair, tops, bottoms and shoes, with gender and skin tone choices. Presets are optional and do not restrict combinations by gender. The 3D preview and actual guest use the same character builder and motorcycle riding pose.
- The guest screen collects nickname and gender alongside wardrobe/vehicle previews. Saved selections are remembered locally. In-town Wardrobe previews and saves new pieces/gender/vehicle preference without reconnecting; cancel returns without saving. Vehicle selection remains a preference until summoning.
- All 39 tests pass, including appearance whitelist validation, collection/preset independence, rebuilding every collection while maintaining riding poses, and two real WebSocket guests sharing a mixed join outfit and subsequent wardrobe changes without coordinate changes.
- Browser verified a mixed casual/street/punk/old-money look with Celica before joining, joined with that selected vehicle in the summon picker, and saved a luxury top / Pajero preference through the in-town wardrobe without rejoining. The same preview shows the newly selected outfit and vehicle. Landscape 844×390 creator scrolls to the join action; desktop 1280×720 fits the full creator. Production build and production HTTP/WebSocket smoke check pass.
- Earlier browser URL-policy rejection applied to an unavailable prior tab. A new authorized local preview was opened successfully for this feature. Broad physical-device performance/latency testing remains unverified.


## v0.9 simplified setup, gender silhouettes and Wi-Fi testing — 20 October 2026

- Main setup now has only Name, Gender, Outfit and Vehicle, alongside the currently selected character and vehicle. Outfit opens a separate editor with Outfit set / Customize choices and character-only preview; Back preserves choices on the main screen, and Start game can be used from either screen. Missing identity fields return to the main screen with a message.
- Gender choices are exactly Male, Female and Prefer not to say. Male characters use an athletic shoulder/waist profile; female characters use softer fitted waist/hip geometry and facial details. All remain clothed, with every garment and hair choice available independently of gender. Legacy unsupported gender IDs normalize to the neutral choice.
- All 40 tests passed, including the three-choice whitelist, different male/female geometry, independent outfit pieces, seated motorcycle poses and shared multiplayer customization. Formatting and production build pass.
- `npm run start:lan` selects a private LAN IPv4 address (prefers en0), binds that interface only, and defaults to port 5175. Started successfully at the current Wi-Fi address, served the actual production build in the browser, and completed a guest WebSocket join directly from the outfit editor over that LAN URL. The existing loopback development server remains separate. No public hosting or router/firewall changes were made.
- Browser verified main → outfit sets → Back → gender change → Customize → Start game, with chosen appearance retained. Desktop and landscape 844×390 were visually checked; all four main fields, current character/vehicle preview and Start game fit on the phone-sized setup, and the editor fits its controls with Back / Start game. This is viewport/LAN verification from the Mac, not a physical-phone network or GPU test.


## v0.10 mobile HUD and gender-aware clothing — 20 October 2026

- Replaced overlapping phone panels with a compact safe-area HUD: directional pad/context action while walking, steering/pedals and compact speed while driving, optional minimap and a separate scrolling Menu. Vehicle selection and settings remain available in Menu; primary vehicle interactions remain at thumb reach in the world. Profile/wardrobe screens hide the HUD and touch controls.
- Visual viewport resize handling updates camera/rendering, nameplate projection and CSS height as Safari browser bars change. Mobile fields use 16px type to avoid Safari input auto-zoom. Desktop panels and header actions restore when switching back to a desktop viewport.
- Added automatic gender-aware tailoring and explicit Male/Female/Unisex Outfit cut override in Customize. Cuts affect top profiles/details, trousers/shorts, skirt shape and footwear proportions while retaining selected garments, gender, skin and hair. Server whitelist/snapshots persist the cut.
- All 42 tests pass, including wider landscape touch detection, outfit cut defaults/overrides and real WebSocket persistence of a Unisex cut on a female character. Production build and formatting pass.
- Browser at 1024×348 and 932×300: joined over the Wi-Fi URL, used held directional-pad buttons to reach a summoned car, entered using the contextual action, checked separate driving controls/speed, opened the map without covering the exit/pedals, opened Menu and saved a Unisex fit via Wardrobe. The cut persisted after reload. Saved mobile HUD screenshot documents the 932×300 driving state. The restarted Wi-Fi server remains available at the same local URL.
- These are viewport and browser checks on the Mac; actual iPhone Safari browser chrome, safe-area values, physical multi-touch and GPU performance still need a device check.

## v0.11 cinematic and setup

Production build passes. Existing 42 tests pass; the added gender-specific hairstyle construction test also passes (43 total tests). Browser checked opening couple art and manual reduced-motion transitions through dedication, love note and credit; replay returns to portrait and Continue returns to setup. Confirmed black C 300 selected for the migrated saved profile, main outfit selector and Customize entry. Couple portrait framing checked at 1280×720 and 1024×348. Browser has reduced motion enabled, so timed fades/push-in are implemented but were not visually exercised in this browser. LAN server restarted with updated vehicle catalog.

## Reload/audio/favicon update

44 tests pass, including the new regression test for reload/replay and timer cleanup. Production build passes. Browser verified a reload during the text scene returns to the couple portrait, and Play sound changes to the active Mute sound state. The browser automation does not provide audible monitoring, so perceived volume/tone still needs a phone listening check. Angkor Wat SVG favicon included locally.

## Intro motion override

Build and intro regression test pass. Tested reduced-motion default, animation opt-in, saved preference on reload, and switching back with timers cancelled. Browser confirmed Animate intro anyway becomes Use reduced motion and Continue becomes Skip intro; preference survives reload while macOS reduced motion remains enabled.

## Vultr launch, 20 October 2026

Public HTTPS game at https://little-cambodia.hexdock.dev. HTTP redirects to HTTPS. Certificate renewal timer enabled. App runs as unprivileged systemd service. Production health check, secure WebSocket guest join and Mercedes summoning pass. Browser joined as Launch check. 44 local tests pass. Repository created private at heinsoeoo/little-cambodia and all commits pushed. CI tests/format/build ran; deployment awaits repository DEPLOY_SSH_KEY approval/configuration.

Restricted CI receiver was tested with its dedicated SSH key; a group-permission failure triggered rollback, was corrected with chgrp, and the fresh release then passed. Arbitrary shell command rejected. Server idle process memory approximately 43 MB; no concurrent-player load test performed.

## Cozy mobile setup redesign

Warm cream/sage welcome with clearer field hierarchy, full-width vehicle selection, shorter preview summary, landscape-specific canvas framing, and a footer with sound/dedication controls. Sound moves into the in-game menu/header after joining. Corrected intrinsic canvas flex growth that pushed the primary action off screen. Short landscape controls and independently scrolling outfit choices preserve navigation access. Verified browser layouts at 1024×420, 1024×348, and 932×300; main setup at 1024×348 has equal scroll/client height. Physical iPhone not available in automation. Build and all 44 tests pass.

## Bilingual intro soundtrack

User MP3 copied unchanged (50.8s, stereo 44.1kHz). Seven cards total 50s; Khmer story receives 12s. New audio regression test verifies portrait silence, first-text start, continuous music across language changes, mute, finish and replay reset. Intro test verifies all seven scheduled boundaries. Local browser verified manual English-to-Khmer progression and Khmer glyphs/line spacing at 1024×348. Audio perception requires listening on the actual device; browser automation has no audible monitoring.
