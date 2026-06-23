import TripsMap from '../TripsMap';
import { useTrips } from '../useTrips';
import './page.css';

/** W1 Mapa (shell 10.1: base; KPIs/capas/clusters llegan en 10.2). SIN export. */
export default function MapaPage() {
  const { trips, error, updatedAt, refreshing, reload } = useTrips();

  return (
    <section>
      <div className="page-head">
        <div>
          <h1 className="page-title">Monitoreo en tiempo real</h1>
          <p className="page-sub">Ubicación de los viajes en curso.</p>
        </div>
        <div className="page-actions">
          {updatedAt && (
            <span className="page-updated">Actualizado {updatedAt.toLocaleTimeString()}</span>
          )}
          <button className="btn-secondary" onClick={reload} disabled={refreshing}>
            {refreshing ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {error && <p className="page-error">No se pudieron cargar los viajes: {error}</p>}
      {trips === null && !error && <p className="page-state">Cargando viajes…</p>}
      {trips !== null && <TripsMap trips={trips} />}
    </section>
  );
}
