"""Convert the official OSM map XML response into the game's geometry schema.
Usage: python3 scripts/convert-osm.py work/phnom-penh-map.osm public/data/phnom-penh-expanded.osm.json
The public map extract has original footprints/tags; no geometry is invented here.
"""
import json, sys, xml.etree.ElementTree as ET
root = ET.parse(sys.argv[1]).getroot()
nodes = {int(n.attrib['id']): {'lat':float(n.attrib['lat']),'lon':float(n.attrib['lon'])} for n in root.findall('node')}
elements=[]
for way in root.findall('way'):
    tags={t.attrib['k']:t.attrib['v'] for t in way.findall('tag')}
    if not any(k in tags for k in ('highway','building','landuse')) and tags.get('natural')!='water': continue
    refs=[int(n.attrib['ref']) for n in way.findall('nd')]
    if not all(n in nodes for n in refs): continue
    elements.append({'type':'way','id':int(way.attrib['id']),'nodes':refs,'tags':tags,'geometry':[nodes[n] for n in refs]})
with open(sys.argv[2],'w') as out: json.dump({'version':.6,'generator':'Official OSM map API; converted by scripts/convert-osm.py','source':'https://api.openstreetmap.org/api/0.6/map?bbox=104.917,11.553,104.942,11.580','retrieved':'2026-10-18','elements':elements},out,separators=(',',':'),ensure_ascii=False)
print(f'Saved {len(elements)} OSM ways')
