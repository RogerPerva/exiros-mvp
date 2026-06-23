import { useState } from 'react';
import { exportReport, type ReportFilters, type TripStatus } from './api';
import './ReportsBar.css';

/** W2 — filtros + botón de exportar a Excel (7.2). Llama a GET /api/web/reports/export. */
export default function ReportsBar() {
  const [status, setStatus] = useState<'' | TripStatus>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onExport() {
    setBusy(true);
    setError(null);
    try {
      const filters: ReportFilters = {};
      if (status) filters.status = status;
      if (from) filters.from = `${from}T00:00:00`;
      if (to) filters.to = `${to}T23:59:59`;
      await exportReport(filters);
    } catch {
      setError('No se pudo generar el reporte.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="reports-bar">
      <span className="reports-bar-title">Reporte de viajes</span>

      <label>
        Estatus
        <select value={status} onChange={(e) => setStatus(e.target.value as '' | TripStatus)}>
          <option value="">Todos</option>
          <option value="EN_RUTA">En ruta</option>
          <option value="CONCLUIDO">Concluido</option>
        </select>
      </label>

      <label>
        Desde
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </label>

      <label>
        Hasta
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </label>

      <button className="reports-bar-export" onClick={() => void onExport()} disabled={busy}>
        {busy ? 'Generando…' : 'Exportar a Excel'}
      </button>

      {error && <span className="reports-bar-error">{error}</span>}
    </div>
  );
}
