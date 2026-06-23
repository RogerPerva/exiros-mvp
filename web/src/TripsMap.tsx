import {
  Circle,
  CircleMarker,
  LayersControl,
  LayerGroup,
  MapContainer,
  Popup,
  TileLayer,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Trip } from './api';

/**
 * Mapa de tránsito W1 (10.2). Pinta el último punto de cada viaje EN_RUTA + la geocerca de
 * su destino, con control de capas (Mapa / Satélite / Geocercas). Clusters = diferido
 * (ver PLAN: optimización para alto volumen). Usa CircleMarker para evitar el problema de
 * los iconos PNG de Leaflet con bundlers (Vite).
 */
export default function TripsMap({ trips }: { trips: Trip[] }) {
  const active = trips.filter((t) => t.status === 'EN_RUTA');
  const withLocation = active.filter((t) => t.lastLocation !== null);
  const center: [number, number] = withLocation[0]?.lastLocation
    ? [withLocation[0].lastLocation.lat, withLocation[0].lastLocation.lng]
    : [25.6866, -100.3161];

  return (
    <MapContainer center={center} zoom={6} style={{ height: '100%', width: '100%' }}>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Mapa">
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satélite">
          <TileLayer
            attribution="&copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>

        <LayersControl.Overlay checked name="Geocercas">
          <LayerGroup>
            {active.map((t) =>
              t.destination ? (
                <Circle
                  key={`geo-${t.id}`}
                  center={[t.destination.centerLat, t.destination.centerLng]}
                  radius={300}
                  pathOptions={{ color: '#0D479C', fillOpacity: 0.08 }}
                />
              ) : null,
            )}
          </LayerGroup>
        </LayersControl.Overlay>
      </LayersControl>

      {active.map((t) =>
        t.lastLocation ? (
          <CircleMarker
            key={`loc-${t.id}`}
            center={[t.lastLocation.lat, t.lastLocation.lng]}
            radius={8}
            pathOptions={{ color: '#16A34A', fillColor: '#16A34A', fillOpacity: 0.9 }}
          >
            <Popup>
              <strong>{t.folio}</strong> · {t.frontPlate}
              <br />
              {t.providerName}
              <br />
              {t.destination?.name ?? '—'}
            </Popup>
          </CircleMarker>
        ) : null,
      )}
    </MapContainer>
  );
}
