import { useMemo, useState } from 'react';
import TripsMap from '../TripsMap';
import { useTrips } from '../useTrips';
import type { Trip, TripStatus } from '../api';
import './page.css';
import './mapa.css';

/** W1 Mapa "Monitoreo en tiempo real" (10.2). KPIs En ruta/Concluidos + filtros + capas.
 *  Estados derivados (Detenido/Sin actualización/Cerca de destino) = diferidos (ver PLAN). */
export default function MapaPage() {
  const { trips, error, updatedAt, refreshing, reload } = useTrips();
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState<'' | TripStatus>('');
  const [destino, setDestino] = useState('');
  const [proveedor, setProveedor] = useState('');

  const all = useMemo(() => trips ?? [], [trips]);
  const enRuta = all.filter((t) => t.status === 'EN_RUTA').length;
  const concluidos = all.filter((t) => t.status === 'CONCLUIDO').length;

  const destinos = useMemo(
    () => [...new Set(all.map((t) => t.destination?.name).filter(Boolean))] as string[],
    [all],
  );
  const proveedores = useMemo(
    () => [...new Set(all.map((t) => t.providerName))],
    [all],
  );

  const filtered = all.filter((t) => matches(t, { search, estado, destino, proveedor }));
  const hasFilters = search || estado || destino || proveedor;
  const clearFilters = () => {
    setSearch('');
    setEstado('');
    setDestino('');
    setProveedor('');
  };

  return (
    <section>
      <div className="page-head">
        <div>
          <h1 className="page-title">Monitoreo en tiempo real</h1>
          <p className="page-sub">Ubicación de los viajes en curso. Los reportes son en vivo.</p>
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

      <div className="kpi-row">
        <button
          className={`kpi kpi--enruta ${estado === 'EN_RUTA' ? 'kpi--on' : ''}`}
          onClick={() => setEstado(estado === 'EN_RUTA' ? '' : 'EN_RUTA')}
        >
          <span className="kpi-num">{enRuta}</span>
          <span className="kpi-label">En ruta</span>
        </button>
        <button
          className={`kpi kpi--concluido ${estado === 'CONCLUIDO' ? 'kpi--on' : ''}`}
          onClick={() => setEstado(estado === 'CONCLUIDO' ? '' : 'CONCLUIDO')}
        >
          <span className="kpi-num">{concluidos}</span>
          <span className="kpi-label">Concluidos</span>
        </button>
      </div>

      <div className="map-filters">
        <input
          className="map-search"
          placeholder="Buscar placa, folio o proveedor"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={estado} onChange={(e) => setEstado(e.target.value as '' | TripStatus)}>
          <option value="">Todos los estados</option>
          <option value="EN_RUTA">En ruta</option>
          <option value="CONCLUIDO">Concluido</option>
        </select>
        <select value={destino} onChange={(e) => setDestino(e.target.value)}>
          <option value="">Todos los destinos</option>
          {destinos.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select value={proveedor} onChange={(e) => setProveedor(e.target.value)}>
          <option value="">Todos los proveedores</option>
          {proveedores.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button className="map-clear" onClick={clearFilters}>
            Limpiar filtros
          </button>
        )}
      </div>

      {error && <p className="page-error">No se pudieron cargar los viajes: {error}</p>}
      {trips === null && !error && <p className="page-state">Cargando viajes…</p>}
      {trips !== null && (
        <div className="map-wrap">
          <TripsMap trips={filtered} />
          <div className="map-legend">
            <span className="map-legend-title">Estado del viaje</span>
            <span className="map-legend-row">
              <i style={{ background: '#16A34A' }} /> En ruta
            </span>
            <span className="map-legend-row">
              <i style={{ background: '#64748B' }} /> Concluido
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

function matches(
  t: Trip,
  f: { search: string; estado: '' | TripStatus; destino: string; proveedor: string },
): boolean {
  if (f.estado && t.status !== f.estado) return false;
  if (f.destino && t.destination?.name !== f.destino) return false;
  if (f.proveedor && t.providerName !== f.proveedor) return false;
  if (f.search) {
    const q = f.search.toLowerCase();
    const hay = `${t.frontPlate} ${t.folio} ${t.providerName}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}
