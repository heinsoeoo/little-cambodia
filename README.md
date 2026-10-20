# Phnom Life — Central Phnom Penh (v0.11)

A guest-based multiplayer open world inspired by Phnom Penh. Enter a nickname, arrive on foot, explore the city and riverside, and summon a personal car, tuk-tuk or moto when you want to drive. Taxi missions and earnings are no longer part of the active game; jobs will be a separate later feature.

## Run locally

Requires Node.js 22+.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173/ . The setup screen shows Name, Gender, Outfit and Vehicle, with your chosen character and vehicle together on the right. Choose Male, Female or Prefer not to say. Choose an outfit collection directly on setup; Customize opens a character-only preview with Outfit set / Customize controls; Back returns to setup and Start game works from either screen. Open a second tab and join with another nickname to test multiplayer. Guests using the same running server share one town, with a limit of 16 connected players.

The development server includes the WebSocket backend through `vite.config.js`; restart Vite when first adding the backend to an already-running older build.

## Controls

- On foot: WASD/arrows move in screen directions; diagonal movement is normalized.
- F or **Summon vehicle**: select a car, tuk-tuk or moto and park it near your closest road. You must be reasonably near a road; busy spaces are avoided.
- Walk within 4 m and use E or **Enter vehicle** to drive.
- Driving: W/up accelerates, S/down brakes against forward motion then reverses, A/D steer, Space applies the regular brakes, and Shift holds the handbrake for car drifts. E or **Get out** returns you to a clear space on foot and parks your vehicle.
- **Wardrobe** opens the same creator after joining: change gender, skin tone, hair, top, bottom, shoes or preferred vehicle, preview, then save. **Back to city** cancels unsaved edits. The vehicle choice updates the summon picker; it does not replace an existing vehicle until summoned.
- C changes zoom. P pauses your controls; other guests and the shared world continue.
- V talks to a nearby vendor. There are no purchases or inventory yet.
- **Leave town** disconnects your guest and removes your presence and vehicle.

Mobile controls support simultaneous steering/movement and accelerator/reverse buttons, plus separate BRAKE and DRIFT buttons. Summon and enter/exit buttons remain in the guest panel. Portrait phones show a rotate prompt and stop sending movement.

## Multiplayer implementation

`server/multiplayer.js` runs a server-owned simulation at 30 Hz and sends snapshots at 15 Hz. Clients send movement keys and explicit vehicle actions; they cannot directly set coordinates or control another guest. The browser predicts its own movement and interpolates other guests. Nicknames and parked/driven vehicles are shared, along with an online roster and minimap markers.

The server validates nicknames, actions, collision boundaries, message sizes/rates and WebSocket origins. Guest IDs are random and scoped to the connection. Guests are not authenticated accounts; nicknames are not unique or verified. Reloads, reconnects and server restarts create fresh guests; the last nickname and saved appearance/preferred vehicle are saved locally on that browser. Vehicles disappear on disconnect. There is no chat, persistent world database, account system, private rooms or cross-server synchronization yet.

The current limit is 16 guests per server instance. Characters and vehicles can pass through other guests; this is a social exploration prototype, not competitive physics. NPC animation and scenery previews are cosmetic on each screen. The default is a shared fictional game calendar at 10× speed: one real minute advances ten game minutes, and a full day lasts 144 real minutes. Server snapshots synchronize all guests. A fixed epoch preserves the calendar across reconnects and deployments; it continues while guests pause, open menus or leave. Market schedules and lighting use game time. Local scenery previews remain explicitly marked and do not change the shared calendar.

## Production server / playing from other devices

```sh
npm run build
npm start
```

`npm start` serves `dist/` and the same WebSocket endpoint `/multiplayer`, using `127.0.0.1:5173` by default. The app requires this running backend; static file hosting alone cannot provide multiplayer. A second device needs a reachable shared server, not that device's own localhost.

`HOST` and `PORT` configure the listen address. For public hosting, deploy this Node process behind HTTPS with WebSocket upgrade forwarding and the original Host header preserved. One server instance is the current design. No public deployment has been created as part of this update.

## World and future jobs

The active world follows the bundled OpenStreetMap extract of central Phnom Penh: roughly 2.7 × 3 km, 961 road ways and 4,842 building footprints, including Sisowath Quay, the Royal Palace/National Museum district, and Independence Monument. Roads and footprints use geographic coordinates; colors, most building heights, roofs, trees and the monument model are illustrative. Guest walking can reach the promenade; vehicles remain on the landward side of the riverbank. Building and water boundaries are checked by the shared simulation.

The old `missions.js` taxi loop and authored Little Riverside map remain as reference/future-job code. A future jobs layer can use the existing car/tuk-tuk/moto vehicle type and shared player state without making every guest a taxi driver.

## Main modules

- `src/main.js`: open-world client, UI, camera, scenery and guest rendering.
- `src/network.js`: connection lifecycle, inputs, actions and reconnects.
- `src/open-world.js`: shared walking, collision and vehicle state transitions.
- `src/actors.js`: 3D guest poses and nickname labels.
- `server/multiplayer.js`: guest sessions, authoritative simulation and snapshots.
- `server/index.js`: production HTTP + WebSocket server.
- `src/phnom-map.js`, `src/phnom-map-data.json`, `src/world.js`: shared geographic map, collision bounds and batched cozy 3D scenery.
- `src/vehicle-catalog.js`, `src/vehicle-model.js`, `src/vehicle.js`: vehicle list, models and shared arcade driving physics.
- `src/street-life.js`, `src/schedule.js`: cosmetic NPCs, vendors, shared game calendar and local scenery previews.

## Verify

```sh
npm test
npm run format:check
npm run build
```

Tests include real local WebSocket clients for presence, movement, summoned vehicles, disconnects and origin rejection, plus walking and vehicle state transitions. Network tests need permission to listen on loopback. See `VERIFICATION.md` for browser checks and remaining limits.

The local Git repository uses `main`; no remote is configured. The procedural 3D scenery is original. Player nicknames use a crisp screen-space text overlay. OSM data is retained with attribution in `SOURCES.md` and `public/data/ATTRIBUTION.md`; the active street layout and footprints come from the bundled OSM extract.

### Vehicle garage

The shared vehicle catalog includes Nissan Cedric, Land Cruiser, Pajero, Hilux pickup, Motorcycle, Tuk-tuk, Cycle rickshaw, Corolla, Celica, Prius, Skyline R34 and Mark II (1999). These are simplified original models inspired by the listed vehicles. Cream headlights mark the front (+Z); red tail lights mark the rear. The old `car` identifier remains supported for compatibility. All guests see the selected model through multiplayer.

Motorcycle drivers remain visible in a seated riding pose with hands on the handlebars and bent legs beside the bike. Dismounting restores the walking pose.

### Driving tuning and map source

Vehicle power, maximum speed, braking and grip are modest arcade values, not real manufacturer specs. Regular brakes reduce velocity to zero without reversing or creeping under throttle. The car handbrake reduces lateral grip, lets momentum slide through a turn and regains grip when released. Two/three-wheel vehicles keep stable handling. Shared velocity state is authoritative on the multiplayer server. Collision substeps prevent high-speed tunnelling.

Run `npm run map:build` to regenerate `src/phnom-map-data.json` from the retained OSM extract. Coordinates are rounded to centimetres. The source extract and derivative are distributed under ODbL with attribution.

### Road clearance and player visibility

The runtime omits 836 source footprints that intersect the widened driveable road corridors, leaving 4,006 buildings. Rendering, minimap and multiplayer collisions share this filtered map. Original OSM records and generated source coordinates remain intact; these omissions are a gameplay adjustment, not an assertion about real buildings.

A feathered screen-space cutaway opens through walls, roofs, windows and doors directly between the camera and your character/vehicle. The center is clear so the player stays visible; the edge softens the opening. Buildings outside that area keep their usual appearance and shadows. It follows the local player while walking or driving and switches off when you leave.

### Mix-and-match wardrobe

Ten optional collections supply independent hair, top, bottom and shoe choices: Casual, Luxury, Street, Old money, Rapper, Punk, Sporty, Bohemian, Workwear and Riverside linen. Any garment can be combined with any other collection and any gender. Choosing a preset changes all four pieces, while changing one piece leaves the others intact. Gender and skin tone remain independent of presets.

`src/wardrobe.js` is the shared catalog and strict whitelist validator. `src/character.js` builds the same 3D character for previews and live guests, including the seated motorcycle pose. `src/wardrobe-ui.js` owns the pre-join/in-town creator: the main screen shows the current character and vehicle together, while the outfit editor previews the character alone. The server accepts validated appearance fields at join and on explicit customization messages, then shares them in normal snapshots. Unsupported IDs and extra fields cannot inject arbitrary content or move the player.

### Test on a phone over local Wi-Fi

```sh
npm run build
npm run start:lan
```

The LAN launcher selects the Mac's private IPv4 address (preferring the Wi-Fi adapter), binds only that interface and prints a phone-ready URL on port 5175. Connect the phone to the same Wi-Fi, open that URL, and rotate to landscape. Use the same URL on the computer to share the same multiplayer server with the phone. Keep the process running while testing. This is local network access; no public deployment, port forwarding or firewall changes are made. The usual development server on 127.0.0.1:5173 remains separate.

Male characters have lean athletic shoulders and a tapered waist; female characters have a softly fitted waist and hips. Prefer not to say uses a neutral silhouette. All are fully clothed stylized characters; every collection and hairstyle remains available to every choice.

### Phone HUD and outfit cuts

On touch devices (including wider landscape phones), walking shows a circular joystick and contextual Summon/Enter/Get out action. Driving shows steering and pedals plus a compact speed badge. Map is optional; Menu contains vehicle selection, guest/time settings, camera, wardrobe, pause and leave actions. Menu content scrolls when needed, and movement input clears while it is open. Touch controls are hidden while choosing an outfit. The layout respects device safe areas and the visual viewport as Safari's bars change height; mobile form fields use 16px text to avoid automatic input zoom.

Outfit cut defaults to **Match gender**: Male has athletic/tapered tailoring, Female has fitted waist/hem and tapered trouser/shoe proportions, and Prefer not to say uses a relaxed Unisex fit. Customize can explicitly choose Male, Female or Unisex without changing gender, collection or independently selected pieces. Clothing cuts are validated and shared by the multiplayer server.

## Personal opening (v0.11)

The cinematic begins with a photo-inspired cozy illustration of Hein and Claraa, a gentle fade and camera-like push-in, then the dedication, love note and creator credit. Skip is always available; Watch dedication replays it. Reduced-motion devices get a static opening with Continue. The original private photo is not bundled. The generated illustration is in `public/art/hein-claraa-couple.png`; the generation prompt is saved alongside it.

Gender-specific hair labels and shapes preserve existing saved hair IDs. The black Mercedes C 300 is the initial default, with a one-time migration for older saved profiles; later vehicle choices remain saved.

## Intro playback and sound

The intro now restarts on every reload and every replay. Use Play sound to enable the user-provided intro song; browsers need a user gesture to start audio. A persistent sound toggle controls music and game effects, and remembers mute preference. Game sounds include footsteps, speed-responsive engine hum, braking, summon chimes, entering/exiting, and vendor interaction. Audio pauses when the page is hidden; tap again when returning if the browser requires it. The intro song is the user-provided MP3 in public/audio; game effects remain synthesized. The tab icon is an original Angkor Wat silhouette.

With macOS Reduce Motion enabled, choose **Animate intro anyway** in the upper-right corner to enable the cinematic fades, portrait zoom and automatic transitions. The choice is saved locally. Choose **Use reduced motion** to return to manual Continue screens. This preference applies only to the game intro.

## Live deployment

Play at https://little-cambodia.hexdock.dev. See deploy/README.md for server operation and GitHub Actions deployment.

## English and Khmer cinematic

The opening lasts 50 seconds with paired English/Khmer story, love-note and credit slides. Reading times are 5s portrait, 9s English story, 12s Khmer story, 6s English love note, 7s Khmer love note, 5s English credit and 6s Khmer credit. The user-provided song starts at the portrait-to-first-text transition, from the beginning of the song. Audio still requires a tap to unlock in browsers. Skip/finish stops it; replay resets it; mute pauses/resumes it. Reduced-motion mode uses Continue on the same slides.
