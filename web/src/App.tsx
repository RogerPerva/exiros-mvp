import TripsList from './TripsList';
import './App.css';

// Bloque 2.4 [WEB]: el portal arranca mostrando la lista de viajes (W2 mínimo).
// El mapa de 1.3 se reintegrará bajo el shell del portal (sidebar Mapa·Viajes·…)
// en un bloque WEB posterior; su código sigue en el historial (commit 1.3).
function App() {
  return (
    <div className="portal-shell">
      <header className="portal-header">
        <h1>Exiros · Viajes</h1>
      </header>
      <main className="portal-main">
        <TripsList />
      </main>
    </div>
  );
}

export default App;
