import type { Role } from './api';

/** Centro por defecto del mapa (Veracruz, zona portuaria) cuando no hay puntos ni destino. */
export const DEFAULT_CENTER: [number, number] = [19.1738, -96.1342];

/** Etiqueta legible de cada rol (sidebar + tabla de usuarios). */
export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrador',
  MONITOR: 'Monitorista',
};
