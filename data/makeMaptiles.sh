#!/bin/sh

### Shell script to prepare Mapbox tiles from data

### First, add an "id" as a top level property for each feature
### Second, convert the geojson with the ids into a mbtiles set that can be uploaded to Mapbox (https://studio.mapbox.com/tilesets/)

### This process is repeated for both parlamentary constituencies (PCs) and regions

### Library requirements:
### ndjson-cli
### tippecanoe


### PUMA data:

# remove all line breaks from the geojson so we can use ndjson-split and add id as a top level property
cat pumas_4326.geojson | tr '\n' ' ' > pumas_no_linebreaks.geojson

# turn the geojson into a newline-delimited json
ndjson-split 'd.features' < pumas_no_linebreaks.geojson > pumas.ndjson

# add id to each feature from its properties
ndjson-map 'd.id = +d.properties.id, d' \
  < pumas.ndjson \
  > pumas-id.ndjson

# convert back to geojson
ndjson-reduce \
  < pumas-id.ndjson \
  | ndjson-map '{type: "FeatureCollection", features: d}' \
  > pumas-id.json

# convert geojson into mbtiles using tippecanoe for mapbox
# see here for running tippecanoe on Windows: https://gist.github.com/ryanbaumann/e5c7d76f6eeb8598e66c5785b677726e
# make sure to first run: cd ../../mnt/c to put you in the C:/ drive
tippecanoe -pk -pn -f -ps -o pumas_id.mbtiles -Z3 -z12 pumas-id.json

# upload to mapbox tileset: pumas_4326-7fnh3l


### City data:

# remove all line breaks from the geojson so we can use ndjson-split and add id as a top level property
cat cities_4326.geojson | tr '\n' ' ' > cities_no_linebreaks.geojson

# turn the geojson into a newline-delimited json
ndjson-split 'd.features' < cities_no_linebreaks.geojson > cities.ndjson

# add id to each feature from its properties
ndjson-map 'd.id = +d.properties.id, d' \
  < cities.ndjson \
  > cities-id.ndjson

# convert back to geojson
ndjson-reduce \
  < cities-id.ndjson \
  | ndjson-map '{type: "FeatureCollection", features: d}' \
  > cities-id.json

# convert geojson into mbtiles using tippecanoe for mapbox
tippecanoe -pk -pn -f -ps -o cities_id.mbtiles -Z3 -z12 cities-id.json

# upload to mapbox tileset: cities_4326-5qoyol
