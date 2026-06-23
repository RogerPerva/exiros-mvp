import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import RouteMap from '../RouteMap';
import {
  ApiError,
  closeTripAdmin,
  fetchTripDetail,
  photoUrl,
  type ClosureType,
  type TripDetail,
} from '../api';
import { useAuth } from '../auth-context';
import './page.css';
import './detalle.css';

const CLOSURE_LABEL: Record<ClosureType, string> = {
  AUTO_GEOFENCE: 'Automático por geocerca',
  MANUAL_OPERATOR: 'Manual por Operador',
  MANUAL_ADMIN: 'Manual por Administrador',
};

/** W3 Viaje seleccionado (10.4): datos + cierre + foto + ruta. Admin puede forzar cierre. */
export default function ViajeDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setTrip(await fetchTripDetail(id));
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) logout();
      else if (e instanceof ApiError && e.status === 404) setError('El viaje no existe.');
      else setError(String(e));
    }
  }, [id, logout]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function onForceClose() {
    const observations = window.prompt('Observación del cierre (obligatoria):')?.trim();
    if (!observations) return;
    setClosing(true);
    try {
      await closeTripAdmin(id!, observations);
      await load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No se pudo cerrar el viaje.');
    } finally {
      setClosing(false);
    }
  }

  if (error) {
    return (
      <section>
        <Link className="detalle-back" to="/viajes">
          ‹ Volver a Viajes
        </Link>
        <p className="page-error">{error}</p>
      </section>
    );
  }
  if (!trip) return <p className="page-state">Cargando viaje…</p>;

  return (
    <section>
      <nav className="detalle-crumbs">
        <Link to="/viajes">Viajes</Link>
        <span>›</span>
        <span>Folio {trip.folio}</span>
        <span>›</span>
        <span className={`badge badge--${trip.status.toLowerCase()}`}>
          {trip.status === 'EN_RUTA' ? 'En ruta' : 'Concluido'}
        </span>
      </nav>

      <div className="page-head">
        <h1 className="page-title">Viaje #{trip.folio}</h1>
        {isAdmin && trip.status === 'EN_RUTA' && (
          <button className="btn-danger" onClick={() => void onForceClose()} disabled={closing}>
            {closing ? 'Cerrando…' : 'Forzar cierre'}
          </button>
        )}
      </div>

      <div className="detalle-grid">
        <div className="detalle-col">
          <div className="card">
            <h2 className="card-title">Datos del viaje</h2>
            <Field label="Proveedor" value={`${trip.providerName} (${trip.providerNumber})`} />
            <Field label="Folio" value={trip.folio} />
            <Field label="Placa delantera" value={trip.frontPlate} />
            <Field label="Placa trasera" value={trip.rearPlate ?? '—'} />
            <Field label="Destino" value={trip.destination?.name ?? '—'} />
            <Field label="Inicio" value={fmt(trip.startedAt)} />
          </div>

          <div className="card">
            <h2 className="card-title">Cierre</h2>
            {trip.status === 'EN_RUTA' ? (
              <p className="card-empty">El viaje sigue en ruta.</p>
            ) : (
              <>
                <Field
                  label="Tipo de cierre"
                  value={trip.closureType ? CLOSURE_LABEL[trip.closureType] : '—'}
                />
                <Field label="Fin" value={trip.endedAt ? fmt(trip.endedAt) : '—'} />
                <Field label="Duración" value={fmtDuration(trip.durationMinutes)} />
                <Field label="Observaciones" value={trip.observations ?? '—'} />
              </>
            )}
          </div>

          <div className="card">
            <h2 className="card-title">Foto de la carga</h2>
            {trip.photoPath ? (
              <img className="detalle-photo" src={photoUrl(trip.photoPath)} alt="Carga" />
            ) : (
              <p className="card-empty">Sin foto.</p>
            )}
          </div>
        </div>

        <div className="card detalle-mapcard">
          <h2 className="card-title">Ruta recorrida</h2>
          <div className="detalle-map">
            {trip.route.length > 0 ? (
              <RouteMap trip={trip} />
            ) : (
              <p className="card-empty">Sin puntos de ruta registrados.</p>
            )}
          </div>
        </div>
      </div>

      <button className="detalle-back" onClick={() => navigate('/viajes')}>
        ‹ Volver a Viajes
      </button>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <span className="field-value">{value}</span>
    </div>
  );
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDuration(minutes: number | null): string {
  if (minutes === null) return '—';
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
