# Phnom Life — Central Phnom Penh (v0.7)

A guest-based multiplayer open world inspired by Phnom Penh. Enter a nickname, arrive on foot, explore the city and riverside, and summon a personal car, tuk-tuk or moto when you want to drive. Taxi missions and earnings are no longer part of the active game; jobs will be a separate later feature.

## Run locally

Requires Node.js 22+.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173/ . Join with a nickname of 2–20 characters. Open a second tab and join with another nickname to test multiplayer. Guests using the same running server share one town, with a limit of 16 connected players.

The development server includes the WebSocket backend through `vite.config.js`; restart Vite when first adding the backend to an already-running older build.

## Controls

- On foot: WASD/arrows move in screen directions; diagonal movement is normalized.
- F or **Summon vehicle**: select a car, tuk-tuk or moto and park it near your closest road. You must be reasonably near a road; busy spaces are avoided.
- Walk within 4 m and use E or **Enter vehicle** to drive.
- Driving: W/up accelerates, S/down brakes against forward motion then reverses, A/D steer, Space applies the regular brakes, and Shift holds the handbrake for car drifts. E or **Get out** returns you to a clear space on foot and parks your vehicle.
- C changes zoom. P pauses your controls; other guests and the shared world continue.
- V talks to a nearby vendor. There are no purchases or inventory yet.
- **Leave town** disconnects your guest and removes your presence and vehicle.

Mobile controls support simultaneous steering/movement and accelerator/reverse buttons, plus separate BRAKE and DRIFT buttons. Summon and enter/exit buttons remain in the guest panel. Portrait phones show a rotate prompt and stop sending movement.

## Multiplayer implementation

`server/multiplayer.js` runs a server-owned simulation at 30 Hz and sends snapshots at 15 Hz. Clients send movement keys and explicit vehicle actions; they cannot directly set coordinates or control another guest. The browser predicts its own movement and interpolates other guests. Nicknames and parked/driven vehicles are shared, along with an online roster and minimap markers.

The server validates nicknames, actions, collision boundaries, message sizes/rates and WebSocket origins. Guest IDs are random and scoped to the connection. Guests are not authenticated accounts; nicknames are not unique or verified. Reloads, reconnects and server restarts create fresh guests; only the last nickname is saved locally. Vehicles disappear on disconnect. There is no chat, persistent world database, account system, private rooms or cross-server synchronization yet.

The current limit is 16 guests per server instance. Characters and vehicles can pass through other guests; this is a social exploration prototype, not competitive physics. NPC animation and scenery previews are cosmetic on each screen. Live Phnom Penh time is the default; the preview selector explicitly changes only your local scenery.

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
- `src/street-life.js`, `src/schedule.js`: cosmetic NPCs, vendors and local time previews.

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
