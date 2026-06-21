import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

// Bloque 1.3: mapa OSM vacío a pantalla completa (base del portal de monitoristas).
// Centro provisional en el norte de México (zona de patios de chatarra).
const INITIAL_CENTER: [number, number] = [25.6866, -100.3161]; // Monterrey
const INITIAL_ZOOM = 6;

function App() {
  return (
    <div className="map-shell">
      <MapContainer
        center={INITIAL_CENTER}
        zoom={INITIAL_ZOOM}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </MapContainer>
    </div>
  );
}

export default App;
