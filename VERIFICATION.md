# Verification — v0.2 / 18 October 2026

- Production build and source formatting check pass.
- Automated tests: 11 passed. Covers OSM parsing, projection, road snapping, acceleration/braking/reverse, collision rollback, fare accessibility, pickup/reward/save transitions, connected shortest paths, one-way direction, disconnected crossings, all five real mission routes, legal opening spawn and geometry batching.
- Static city mesh draws: 23, including all buildings, roads, trees and monument. This is a scene-structure measurement, not a frame-rate benchmark.
- Active roads: 439 after excluding pedestrian/elevator paths and restricted access. All 2,850 building footprints remain included. The source extract is unchanged.
- Browser: verified city loading, a 45 m opening road route, driving and braking with route recalculation, pause overlay, frozen speed/destination while accelerating during pause, and resume. No captured browser errors.
- Original v0.1 browser verification also covered successful passenger pickup and transition to Royal Palace; fare state logic remains covered by tests.
- Screenshot: `preview.jpg` shows the enhanced game.
- Not verified: complete manually driven delivery in v0.2, physical mobile devices, full traffic-law routing (turn restrictions are not implemented), cross-browser performance, long sessions or production hosting.
