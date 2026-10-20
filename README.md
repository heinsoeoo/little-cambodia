# Phnom Life — Little Riverside (v0.6)

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
- Driving: W/up accelerates, S/down reverses, A/D steer and Space brakes. E or **Get out** returns you to a clear space on foot and parks your vehicle.
- C changes zoom. P pauses your controls; other guests and the shared world continue.
- V talks to a nearby vendor. There are no purchases or inventory yet.
- **Leave town** disconnects your guest and removes your presence and vehicle.

Mobile controls support simultaneous steering/movement and accelerator/reverse buttons, plus a dedicated brake. Summon and enter/exit buttons remain in the guest panel. Portrait phones show a rotate prompt and stop sending movement.

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

The default map is the authored neighbourhood, now presented as a cozy 3D town: 16 homes/shops, connected streets, a garden, market square and riverfront. Guest walking can reach the promenade; vehicles remain on the landward side of the riverbank. Building and water boundaries are checked by the shared simulation.

The old `missions.js` taxi loop, geographic OSM extracts and legacy world builders remain as reference/future-job code, but are not imported by the active open-world client. A future jobs layer can use the existing car/tuk-tuk/moto vehicle type and shared player state without making every guest a taxi driver.

## Main modules

- `src/main.js`: open-world client, UI, camera, scenery and guest rendering.
- `src/network.js`: connection lifecycle, inputs, actions and reconnects.
- `src/open-world.js`: shared walking, collision and vehicle state transitions.
- `src/actors.js`: guest sprites, nickname labels and three personal vehicle models.
- `server/multiplayer.js`: guest sessions, authoritative simulation and snapshots.
- `server/index.js`: production HTTP + WebSocket server.
- `src/town-map.js`, `src/cozy-world.js`: authored map and cozy 3D houses, trees and riverside scenery.
- `src/street-life.js`, `src/schedule.js`: cosmetic NPCs, vendors and local time previews.

## Verify

```sh
npm test
npm run format:check
npm run build
```

Tests include real local WebSocket clients for presence, movement, summoned vehicles, disconnects and origin rejection, plus walking and vehicle state transitions. Network tests need permission to listen on loopback. See `VERIFICATION.md` for browser checks and remaining limits.

The local Git repository uses `main`; no remote is configured. The procedural 3D scenery is original. Player nicknames use a crisp screen-space text overlay. OSM data is retained with attribution in `SOURCES.md` and `public/data/ATTRIBUTION.md`; the active town street layout is authored rather than geographically exact.
