# FAQ — Exiros On-Route Tracker

## ¿Qué pasa si el vehículo entra a la geocerca antes de que la webapp actualice su ubicación?

El viaje no se cierra por la webapp ni por la app Android directamente. El cierre automático lo decide el backend cuando recibe coordenadas nuevas.

Flujo real:

1. La app Android captura la ubicación en segundo plano.
2. Cada coordenada se guarda primero en la cola local de Room.
3. La app sincroniza esa cola con el backend por lotes.
4. Si Android detecta que un fix está cerca del destino, dispara una sincronización prioritaria sin esperar el lote normal.
5. El backend guarda los puntos recibidos y evalúa la geocerca con los puntos recientes y precisos.
6. Si un punto cae dentro del radio, el backend marca el viaje como `CONCLUIDO` con `AUTO_GEOFENCE`.
7. La respuesta incluye `stopTracking: true`, y entonces Android detiene el rastreo local.

Por seguridad, Android no cierra viajes por sí solo. Android puede anticipar el envío cuando llega cerca de la geocerca, pero la autoridad de cierre es el backend.

