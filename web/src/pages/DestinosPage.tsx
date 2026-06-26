import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin, Map, Pencil, Trash2, RotateCcw } from 'lucide-react';
import {
  fetchDestinations,
  setDestinationActive,
  ApiError,
  type Destination,
} from '../api';
import { useAuth } from '../auth-context';
import DestinoModal from './DestinoModal';
import './page.css';
import './destinos.css';
import './usuarios.css';

/** W4 Destinos (10.5): tabla de geocercas + alta/edición (modal) + baja/restaurar. */
export default function DestinosPage() {
  const { logout } = useAuth();
  const [destinos, setDestinos] = useState<Destination[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; editing: Destination | null }>({
    open: false,
    editing: null,
  });
  const [confirmBaja, setConfirmBaja] = useState<Destination | null>(null);
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState<'' | 'activo' | 'baja'>('');

  const load = useCallback(async () => {
    try {
      setDestinos(await fetchDestinations());
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) logout();
      else setError(String(e));
    }
  }, [logout]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function setActive(d: Destination, active: boolean) {
    try {
      await setDestinationActive(d.id, active);
      await load();
    } catch {
      alert('No se pudo cambiar el estado del destino.');
    }
  }

  async function doBaja() {
    if (!confirmBaja) return;
    await setActive(confirmBaja, false);
    setConfirmBaja(null);
  }

  const filtered = useMemo(() => {
    const all = destinos ?? [];
    return all.filter((d) => {
      if (estado === 'activo' && !d.isActive) return false;
      if (estado === 'baja' && d.isActive) return false;
      if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [destinos, search, estado]);

  const hasFilters = search || estado;
  const clearFilters = () => {
    setSearch('');
    setEstado('');
  };

  return (
    <section>
      <div className="page-head">
        <div>
          <h1 className="page-title">Destinos</h1>
          <p className="page-sub">Geocercas para el cierre automático de viajes.</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setModal({ open: true, editing: null })}
        >
          + Nuevo destino
        </button>
      </div>

      <div className="viajes-filters">
        <input
          className="viajes-search"
          placeholder="Buscar destino por nombre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={estado} onChange={(e) => setEstado(e.target.value as '' | 'activo' | 'baja')}>
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="baja">Baja</option>
        </select>
        {hasFilters && (
          <button className="viajes-clear" onClick={clearFilters}>
            Limpiar filtros
          </button>
        )}
      </div>

      {error && <p className="page-error">{error}</p>}
      {destinos === null && !error && <p className="page-state">Cargando destinos…</p>}

      {destinos && (
        <div className="viajes-table-wrap">
          <table className="viajes-table">
            <thead>
              <tr>
                <th>NOMBRE</th>
                <th>CENTRO</th>
                <th>RADIO</th>
                <th>UBICACIÓN</th>
                <th>ESTADO</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className={d.isActive ? '' : 'row-inactive'}>
                  <td className="viajes-folio">
                    <MapPin size={15} className="inline-icon" /> {d.name}
                  </td>
                  <td className="mono">
                    {d.centerLat.toFixed(3)}, {d.centerLng.toFixed(3)}
                  </td>
                  <td>{d.radiusMeters} m</td>
                  <td>
                    <a
                      className="dest-maps"
                      href={`https://www.google.com/maps?q=${d.centerLat},${d.centerLng}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Map size={14} className="inline-icon" /> Maps
                    </a>
                  </td>
                  <td>
                    <span className={`badge ${d.isActive ? 'badge--en_ruta' : 'badge--baja'}`}>
                      {d.isActive ? 'Activo' : 'Baja'}
                    </span>
                  </td>
                  <td className="dest-actions">
                    <button
                      title="Editar"
                      onClick={() => setModal({ open: true, editing: d })}
                    >
                      <Pencil size={16} />
                    </button>
                    {d.isActive ? (
                      <button title="Dar de baja" onClick={() => setConfirmBaja(d)}>
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <button title="Restaurar" onClick={() => void setActive(d, true)}>
                        <RotateCcw size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="viajes-empty">
                    {hasFilters
                      ? 'No hay destinos que coincidan con los filtros.'
                      : 'No hay destinos. Crea el primero con "Nuevo destino".'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <DestinoModal
          destino={modal.editing}
          onClose={() => setModal({ open: false, editing: null })}
          onSaved={() => {
            setModal({ open: false, editing: null });
            void load();
          }}
        />
      )}

      {confirmBaja && (
        <div className="modal-overlay" onClick={() => setConfirmBaja(null)}>
          <div className="confirm" onClick={(e) => e.stopPropagation()}>
            <h3>Dar de baja destino</h3>
            <p>
              ¿Estás seguro de dar de baja <strong>{confirmBaja.name}</strong>? Dejará de estar
              disponible para nuevos viajes.
            </p>
            <div className="panel-actions">
              <button className="btn-ghost" onClick={() => setConfirmBaja(null)}>
                Cancelar
              </button>
              <button className="btn-danger" onClick={() => void doBaja()}>
                <Trash2 size={15} /> Sí, dar de baja
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
