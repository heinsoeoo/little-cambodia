# Phnom Penh place detail pass

Footprints, building IDs, names, and locations come from the retained OpenStreetMap extract in public/data/phnom-penh-expanded.osm.json. Rebuild the compact named-place list with `node scripts/build-places.mjs`. OSM attribution remains visible in the game.

Google Maps was consulted on 20 October 2026 as a visual/location reference for the Royal Palace and Titanic Restaurant. No Google map tiles, photographs, reviews, ratings, or hours are shipped in the game.

- https://www.google.com/maps/search/Royal+Palace+Phnom+Penh/
- https://www.google.com/maps/search/Bopha+Titanic+Phnom+Penh/
- Royal Palace background: https://tourismcambodia.org/provinces/search/detail/127/royal-palace-1548301051
- Central Market background: https://tourismcambodia.org/public/provinces/search/detail/1591/central-market

The architecture is an original, simplified cozy interpretation rather than a measured reconstruction. Palace buildings retain their original collision footprints. Market details decorate retained buildings within the mapped Central Market, Kandal Market, and Night Market sites. Restaurants missing from the road-cleared building set still have a nearby-place label but receive no replacement footprint. Names are from a retained map snapshot, not a live business directory.

All decorative details are static and material-batched. Restaurant signs use a shared canvas texture atlas. No new dynamic lights, shadow maps, or per-frame landmark animation are added.
