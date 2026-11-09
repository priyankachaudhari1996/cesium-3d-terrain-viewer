# 3D Terrain Viewer (CesiumJS + React)

A 3D globe built with CesiumJS and React. It shows Cesium World Terrain, OpenStreetMap 3D buildings (3D Tiles), a GeoJSON landmark layer clamped to terrain, and a GeoServer WMS layer draped on the globe.

## Features
- Cesium World Terrain with lighting and depth testing against terrain
- OSM Buildings loaded as 3D Tiles
- GeoJSON overlay (`public/data/landmarks.geojson`) with click-to-pick attributes
- Fly-to camera navigation for each landmark
- GeoServer WMS imagery layer with transparency and a layer toggle

## Tech
CesiumJS 1.120, React 18, Vite 5

## Run locally
1. Create a free token at https://ion.cesium.com/tokens
2. `cp .env.example .env` and paste the token into `VITE_CESIUM_ION_TOKEN`
3. `npm install`
4. `npm run dev` and open http://localhost:5173

To use your own GeoServer, change `VITE_WMS_URL` and `VITE_WMS_LAYER` in `.env`.

## Deploy
`npm run build` creates `dist/`. Deploy on Vercel and add `VITE_CESIUM_ION_TOKEN` in the project's environment variables.
