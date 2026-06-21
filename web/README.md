# web — Portal de monitoristas (React + Vite + TS)

Portal con login para monitoristas Exiros (ADR-003). Mapa con **Leaflet + react-leaflet**
sobre OpenStreetMap (gratis, sin API key).

## Comandos
```bash
npm install      # dependencias
npm run dev      # http://localhost:5173
npm run build    # typecheck + build a dist/
```

## Estado (Bloque 1.3)
`App.tsx` monta un mapa OSM a pantalla completa centrado en el norte de México
(base para las pantallas W1 mapa/tránsito). Aún sin login ni rutas — eso llega en fases
posteriores (W0/W1…). Stack: React 19, react-leaflet 5, leaflet 1.9.
