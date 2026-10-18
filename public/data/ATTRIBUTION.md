# OpenStreetMap extract

© OpenStreetMap contributors. Data available under the Open Database License (ODbL): https://www.openstreetmap.org/copyright

Retrieved 18 October 2026 from https://overpass.kumi.systems/api/interpreter . OSM metadata in the JSON records the database timestamp. Original source is retained alongside the game. Derived local coordinates exist only in memory.

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
