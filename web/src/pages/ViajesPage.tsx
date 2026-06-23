import ReportsBar from '../ReportsBar';
import TripsList from '../TripsList';
import { useTrips } from '../useTrips';
import './page.css';

/** W2 Viajes (shell 10.1: lista + export movido AQUÍ; tabla/filtros/paginación = 10.3). */
export default function ViajesPage() {
  const { trips, error, refreshing, reload } = useTrips();

  return (
    <section>
      <div className="page-head">
        <div>
          <h1 className="page-title">Viajes</h1>
          <p className="page-sub">Historial y seguimiento de todos los viajes registrados.</p>
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={reload} disabled={refreshing}>
            {refreshing ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      <ReportsBar />
      {error && <p className="page-error">No se pudieron cargar los viajes: {error}</p>}
      {trips === null && !error && <p className="page-state">Cargando viajes…</p>}
      {trips !== null && <TripsList trips={trips} onClosed={reload} />}
    </section>
  );
}
