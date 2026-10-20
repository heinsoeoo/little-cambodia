# OpenStreetMap extract

© OpenStreetMap contributors. Data available under the Open Database License (ODbL): https://www.openstreetmap.org/copyright

Retrieved 18 October 2026 from https://overpass.kumi.systems/api/interpreter . OSM metadata in the JSON records the database timestamp. Original source is retained alongside the game. The active derived local-coordinate database is distributed as `src/phnom-map-data.json` and bundled into the client. It is available under the same ODbL terms.

Query:

```overpass
[out:json][timeout:40];
(
 way[highway][highway!~"footway|path|steps|cycleway|construction|proposed"](11.553,104.917,11.570,104.932);
 way[building](11.553,104.917,11.570,104.932);
);
out geom;
```

Road widths, most heights, colors and the landmark sculpture are illustrative. Fare labels refer to nearby road access points.

## Expanded riverside district (active again in v0.7)

`phnom-penh-expanded.osm.json` was retrieved from the official OSM map API on 18 October 2026 with bbox `104.917,11.553,104.942,11.580`, after Overpass returned errors. `scripts/convert-osm.py` preserves selected way IDs, node IDs, original tags and geographic geometry in the game's existing JSON schema. It includes road/pedestrian ways, buildings, land use and closed water ways; no generated building geometry is stored in the source data.

The active runtime includes 961 drivable road ways and 4,842 building footprints. 13 buildings have height tags, 149 use levels, and 4,680 need estimated heights. The older extract is retained for the original district's provenance. The expanded source and all source attribution are distributed in `dist/data` during a build.
