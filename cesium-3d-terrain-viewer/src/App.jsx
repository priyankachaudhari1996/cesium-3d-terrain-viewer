import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN || "";

const WMS_URL = import.meta.env.VITE_WMS_URL || "https://ahocevar.com/geoserver/wms";
const WMS_LAYER = import.meta.env.VITE_WMS_LAYER || "topp:states";

export default function App() {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const layersRef = useRef({});
  const [landmarks, setLandmarks] = useState([]);
  const [picked, setPicked] = useState(null);
  const [show, setShow] = useState({ buildings: true, landmarks: true, wms: false });
  const [error, setError] = useState("");

  useEffect(() => {
    let destroyed = false;

    async function init() {
      const viewer = new Cesium.Viewer(containerRef.current, {
        terrain: Cesium.Terrain.fromWorldTerrain({ requestVertexNormals: true }),
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        geocoder: false,
        sceneModePicker: true,
        navigationHelpButton: false,
        infoBox: false,
      });
      viewerRef.current = viewer;
      viewer.scene.globe.enableLighting = true;
      viewer.scene.globe.depthTestAgainstTerrain = true;

      // 3D Tiles: OpenStreetMap buildings
      try {
        const buildings = await Cesium.createOsmBuildingsAsync();
        if (destroyed) return;
        viewer.scene.primitives.add(buildings);
        layersRef.current.buildings = buildings;
      } catch (e) {
        setError("3D buildings could not load. Check VITE_CESIUM_ION_TOKEN in .env.");
      }

      // GeoJSON overlay, clamped to terrain
      const source = await Cesium.GeoJsonDataSource.load("/data/landmarks.geojson", {
        clampToGround: true,
        markerColor: Cesium.Color.fromCssColorString("#0f766e"),
        markerSize: 40,
      });
      if (destroyed) return;
      viewer.dataSources.add(source);
      layersRef.current.landmarks = source;
      setLandmarks(source.entities.values.map((e) => ({ id: e.id, name: e.name })));

      // GeoServer WMS layer draped on the globe
      const wms = viewer.imageryLayers.addImageryProvider(
        new Cesium.WebMapServiceImageryProvider({
          url: WMS_URL,
          layers: WMS_LAYER,
          parameters: { transparent: true, format: "image/png" },
        })
      );
      wms.alpha = 0.6;
      wms.show = false;
      layersRef.current.wms = wms;

      // Entity picking
      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((click) => {
        const hit = viewer.scene.pick(click.position);
        if (Cesium.defined(hit) && hit.id instanceof Cesium.Entity) {
          const props = hit.id.properties?.getValue(Cesium.JulianDate.now()) || {};
          setPicked({ name: hit.id.name, ...props });
        } else {
          setPicked(null);
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      flyTo(Cesium.Cartesian3.fromDegrees(77.0266, 28.4595, 4000), -35);
    }

    init();
    return () => {
      destroyed = true;
      viewerRef.current?.destroy();
    };
  }, []);

  function flyTo(destination, pitchDeg = -30) {
    viewerRef.current?.camera.flyTo({
      destination,
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(pitchDeg), roll: 0 },
      duration: 2.5,
    });
  }

  function flyToLandmark(id) {
    const entity = layersRef.current.landmarks?.entities.getById(id);
    if (!entity) return;
    const pos = Cesium.Cartographic.fromCartesian(entity.position.getValue(Cesium.JulianDate.now()));
    flyTo(Cesium.Cartesian3.fromRadians(pos.longitude, pos.latitude - 0.06, 9000), -25);
    setPicked({ name: entity.name, ...entity.properties.getValue(Cesium.JulianDate.now()) });
  }

  function toggle(key) {
    const next = { ...show, [key]: !show[key] };
    setShow(next);
    const layer = layersRef.current[key];
    if (layer) layer.show = next[key];
  }

  return (
    <div className="app">
      <aside className="panel">
        <h1>3D Terrain Viewer</h1>
        <p className="lead">World terrain, 3D buildings, GeoJSON and a GeoServer WMS layer on one globe.</p>

        <h2>Layers</h2>
        <label><input type="checkbox" checked={show.buildings} onChange={() => toggle("buildings")} /> 3D buildings (OSM 3D Tiles)</label>
        <label><input type="checkbox" checked={show.landmarks} onChange={() => toggle("landmarks")} /> Landmarks (GeoJSON)</label>
        <label><input type="checkbox" checked={show.wms} onChange={() => toggle("wms")} /> WMS: {WMS_LAYER}</label>

        <h2>Fly to</h2>
        <ul className="places">
          {landmarks.map((l) => (
            <li key={l.id}><button onClick={() => flyToLandmark(l.id)}>{l.name}</button></li>
          ))}
        </ul>

        {picked && (
          <div className="picked">
            <h2>{picked.name}</h2>
            {picked.elevation_m !== undefined && <p>Elevation: {picked.elevation_m} m</p>}
            {picked.country && <p>Country: {picked.country}</p>}
          </div>
        )}
        {error && <p className="error">{error}</p>}
      </aside>
      <div ref={containerRef} className="globe" />
    </div>
  );
}
