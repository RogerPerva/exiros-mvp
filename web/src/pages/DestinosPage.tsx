import { useCallback, useEffect, useState } from 'react';
import { MapPin, Map, Pencil, Ban, RotateCcw } from 'lucide-react';
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

/** W4 Destinos (10.5): tabla de geocercas + alta/edición (modal) + baja/restaurar. */
export default function DestinosPage() {
  const { logout } = useAuth();
  const [destinos, setDestinos] = useState<Destination[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; editing: Destination | null }>({
    open: false,
    editing: null,
  });

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

  async function toggleActive(d: Destination) {
    try {
      await setDestinationActive(d.id, !d.isActive);
      await load();
    } catch {
      alert('No se pudo cambiar el estado del destino.');
    }
  }

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
              {destinos.map((d) => (
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
                    <button
                      title={d.isActive ? 'Dar de baja' : 'Restaurar'}
                      onClick={() => void toggleActive(d)}
                    >
                      {d.isActive ? <Ban size={16} /> : <RotateCcw size={16} />}
                    </button>
                  </td>
                </tr>
              ))}
              {destinos.length === 0 && (
                <tr>
                  <td colSpan={6} className="viajes-empty">
                    No hay destinos. Crea el primero con "Nuevo destino".
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
    </section>
  );
}
