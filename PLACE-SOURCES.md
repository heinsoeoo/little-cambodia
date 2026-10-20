# Phnom Penh place detail pass

Footprints, building IDs, names, and locations come from the retained OpenStreetMap extract in public/data/phnom-penh-expanded.osm.json. Rebuild the compact named-place list with `node scripts/build-places.mjs`. OSM attribution remains visible in the game.

Google Maps was consulted on 20 October 2026 as a visual/location reference for the Royal Palace and Titanic Restaurant. No Google map tiles, photographs, reviews, ratings, or hours are shipped in the game.

- https://www.google.com/maps/search/Royal+Palace+Phnom+Penh/
- https://www.google.com/maps/search/Bopha+Titanic+Phnom+Penh/
- Royal Palace background: https://tourismcambodia.org/provinces/search/detail/127/royal-palace-1548301051
- Central Market background: https://tourismcambodia.org/public/provinces/search/detail/1591/central-market

The architecture is an original, simplified cozy interpretation rather than a measured reconstruction. Palace buildings retain their original collision footprints. Market details decorate retained buildings within the mapped Central Market, Kandal Market, and Night Market sites. Restaurants missing from the road-cleared building set still have a nearby-place label but receive no replacement footprint. Names are from a retained map snapshot, not a live business directory.

All decorative details are static and material-batched. Restaurant signs use a shared canvas texture atlas. No new dynamic lights, shadow maps, or per-frame landmark animation are added.

## River and photo reference update — 20 October 2026

The user supplied seven reference views of the Royal Palace / Moonlight Pavilion, Independence Monument, riverside walking street, cruise boats, and Phnom Penh Night Market. These inform original stylized models; the reference photographs are not redistributed.

The missing adjoining river is sourced from OSM relation 2270448, retrieved through https://api.openstreetmap.org/api/0.6/relation/2270448/full.json. The compact source snapshot is retained in public/data/phnom-penh-river.osm.json. `node scripts/build-river.mjs` assembles the complete outer ring and clips it outside the playable city boundary. No inner island rings intersect that playable rectangle. Rendering, walking collisions, the minimap and boat routes share the combined water geometry. Boat routes are decorative, not player-controlled ferries.

River ripples use a small procedural shader; boat lighting and light trails use meshes rather than extra real-time lights. Wind and water ambience are generated locally with filtered noise, respect the sound toggle, and fade while paused or away from the river.
