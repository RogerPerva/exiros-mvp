import { useState, type FormEvent } from 'react';
import { login, type AuthUser } from './api';
import hero from './assets/hero.png';
import './Login.css';

/** W0 — Login del staff (Fase 6.1/6.3). Al autenticar, eleva el usuario al App. */
export default function Login({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login(email.trim(), password);
      onLogin(user);
    } catch {
      // Mensaje genérico (el backend no filtra si el email existe).
      setError('Correo o contraseña incorrectos.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          exiros<span>·On-Route Tracker</span>
        </div>
        <h1>Iniciar sesión</h1>
        <p className="login-sub">Ingresa tus credenciales para acceder al sistema</p>

        <form className="login-form" onSubmit={(e) => void onSubmit(e)}>
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@exiros.com"
            required
          />

          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && <p className="login-error">{error}</p>}

          <button type="submit" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <footer className="login-foot">© 2026 Exiros · Todos los derechos reservados</footer>
      </section>

      <aside className="login-hero" style={{ backgroundImage: `url(${hero})` }}>
        <div className="login-hero-overlay">
          <h2>Exiros On-Route Tracker</h2>
          <p>Monitorea en tiempo real tus viajes para una logística más eficiente.</p>
        </div>
      </aside>
    </div>
  );
}
