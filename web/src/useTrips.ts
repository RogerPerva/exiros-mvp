import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, fetchActiveTrips, type Trip } from './api';
import { useAuth } from './auth-context';

// Intervalo de refresco (polling) configurable por env (`VITE_POLL_MS`). Producción: 15 min
// (doc §6). En pruebas se baja con `.env.local` (p.ej. 30000) para ver el camión moverse pronto.
const POLL_MS = Number(import.meta.env.VITE_POLL_MS) || 15 * 60 * 1000;

interface UseTrips {
  trips: Trip[] | null;
  error: string | null;
  updatedAt: Date | null;
  refreshing: boolean;
  reload: () => void;
}

/** Carga + polling de viajes, compartido por Mapa y Viajes. 401 → logout. */
export function useTrips(): UseTrips {
  const { logout } = useAuth();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const data = await fetchActiveTrips();
      setTrips(data);
      setUpdatedAt(new Date());
      setError(null);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 401) logout();
      else setError(String(e));
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, [logout]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  return { trips, error, updatedAt, refreshing, reload: load };
}
