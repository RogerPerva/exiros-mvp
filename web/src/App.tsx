import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ApiError,
  clearSession,
  fetchTrips,
  getStoredUser,
  type AuthUser,
  type Trip,
} from './api';
import Login from './Login';
import ReportsBar from './ReportsBar';
import TripsList from './TripsList';
import TripsMap from './TripsMap';
import './App.css';

// Intervalo de refresco (polling) configurable por env (`VITE_POLL_MS`). Producción: 15 min
// (doc §6). En pruebas se baja con `.env.local` (p.ej. 30000) para ver el camión moverse pronto.
const POLL_MS = Number(import.meta.env.VITE_POLL_MS) || 15 * 60 * 1000;

/** "cada 30 s" / "cada 15 min" según el intervalo. */
function formatInterval(ms: number): string {
  return ms < 60_000 ? `cada ${Math.round(ms / 1000)} s` : `cada ${Math.round(ms / 60_000)} min`;
}

// W1 — Mapa de tránsito (3.5): el portal re-consulta los viajes cada POLL_MS y el mapa
// mueve el camión a su último punto. El fetch vive aquí y se comparte con mapa + lista (DRY).
function App() {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser());
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setTrips(null);
  }, []);

  const load = useCallback(async () => {
    if (inFlight.current) return; // evita solapar peticiones
    inFlight.current = true;
    setRefreshing(true);
    try {
      const data = await fetchTrips();
      setTrips(data);
      setUpdatedAt(new Date());
      setError(null);
    } catch (e: unknown) {
      // Sesión caduca/ausente → de vuelta al login; otro fallo no borra el mapa ya pintado.
      if (e instanceof ApiError && e.status === 401) {
        logout();
      } else {
        setError(String(e));
      }
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, [logout]);

  useEffect(() => {
    if (!user) return; // sin sesión no se consulta nada
    // Fetch inicial + polling. El setState ocurre dentro de load() (async, tras el fetch);
    // la regla set-state-in-effect no aplica a una carga de datos al montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [load, user]);

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="portal-shell">
      <header className="portal-header">
        <h1>Exiros · Viajes</h1>
        <div className="portal-status">
          {updatedAt && (
            <span className="portal-updated">
              Actualizado {updatedAt.toLocaleTimeString()} · {formatInterval(POLL_MS)}
            </span>
          )}
          <button className="portal-refresh" onClick={() => void load()} disabled={refreshing}>
            {refreshing ? 'Actualizando…' : 'Actualizar'}
          </button>
          <span className="portal-user">{user.name}</span>
          <button className="portal-logout" onClick={logout}>
            Salir
          </button>
        </div>
      </header>
      <main className="portal-main">
        <ReportsBar />
        {error && (
          <p className="trips-state trips-state--error">
            No se pudieron cargar los viajes: {error}
          </p>
        )}
        {trips === null && !error && <p className="trips-state">Cargando viajes…</p>}
        {trips !== null && (
          <>
            <TripsMap trips={trips} />
            <TripsList trips={trips} onClosed={() => void load()} />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
