import './page.css';

/** Placeholder de secciones aún por construir (Destinos 10.5, Usuarios 10.6). */
export default function PlaceholderPage({ title, sub }: { title: string; sub: string }) {
  return (
    <section>
      <div className="page-head">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-sub">{sub}</p>
        </div>
      </div>
      <p className="page-state">Sección en construcción.</p>
    </section>
  );
}
