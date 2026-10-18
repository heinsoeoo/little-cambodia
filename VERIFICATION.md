# Verification — 18 October 2026

- Production build: passed (`npm run build`). Three.js results in a ~523 kB JavaScript bundle before gzip; Vite reports a non-blocking bundle-size advisory.
- Automated tests: 5 passed. Covers real OSM data parsing, geographic projection and road snapping, acceleration/braking/reverse, collision rollback, accessible landmark stops/spawn, stopped-proximity pickup, fare completion, rewards and save restoration.
- Browser: city loads with 551 road ways and 2,850 building footprints. Started shift, accelerated toward pickup, braked to a stop, observed enabled pickup, clicked pickup and confirmed the Royal Palace destination and ON TRIP state. Browser error log empty at inspection.
- Screenshot: `preview.jpg` shows the tested passenger-on-board state.
- Not verified: complete manually driven drop-off journey, physical mobile device performance, cross-browser coverage, long-session stability or production hosting. Drop-off and reward transitions are covered by automated tests.
