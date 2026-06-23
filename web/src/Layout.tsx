import { NavLink, Outlet } from 'react-router-dom';
import { Map, Truck, MapPin, Users, LogOut } from 'lucide-react';
import { useAuth } from './auth-context';
import './Layout.css';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  MONITOR: 'Monitorista',
};

/** Shell del portal (10.1): sidebar navy + header con usuario + <Outlet> de la sección. */
export default function Layout() {
  const { user, logout } = useAuth();
  // Destinos y Usuarios solo para Admin (el backend también lo valida — no basta ocultar).
  const isAdmin = user?.role === 'ADMIN';
  const initials = (user?.name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="shell">
      <aside className="shell-sidebar">
        <div className="shell-logo">
          ex<span>iros</span>
        </div>
        <nav className="shell-nav">
          <NavLink to="/mapa" className="shell-navitem">
            <Map className="shell-navicon" size={18} /> Mapa
          </NavLink>
          <NavLink to="/viajes" className="shell-navitem">
            <Truck className="shell-navicon" size={18} /> Viajes
          </NavLink>
          {isAdmin && (
            <NavLink to="/destinos" className="shell-navitem">
              <MapPin className="shell-navicon" size={18} /> Destinos
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/usuarios" className="shell-navitem">
              <Users className="shell-navicon" size={18} /> Usuarios
            </NavLink>
          )}
        </nav>
        <button className="shell-logout" onClick={logout}>
          <LogOut size={16} /> Cerrar sesión
        </button>
      </aside>

      <div className="shell-body">
        <header className="shell-header">
          <div className="shell-user">
            <span className="shell-avatar">{initials}</span>
            <span className="shell-userinfo">
              <strong>{user?.name}</strong>
              <small>{ROLE_LABEL[user?.role ?? ''] ?? user?.role}</small>
            </span>
          </div>
        </header>
        <main className="shell-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
