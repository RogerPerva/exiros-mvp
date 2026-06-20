# ADR-012 — Detección de geocerca

- **Estado:** ✅ Aceptado (pendiente confirmar) (2026-06-17)
- **Decide:** cómo se determina que un punto llegó al destino (cierre automático).
- **Origen:** los seniors pidieron evaluar **tipos de dato espaciales** (Spatial Data Types / PostGIS).

## Contexto
La geocerca de destino es un **círculo**: centro (lat/lng) + radio en metros. Detectar la llegada = "¿el punto está dentro del radio?". Hay pocos destinos (XX) y volumen bajo. El stack usa **Prisma** (type-safe).

## Decisión
**Calcular la distancia con haversine usando la misma fórmula y el mismo snapshot de geocerca en backend y Android.** Sin PostGIS para el MVP.
`dentro = haversine(punto, centro) <= radio`. Android puede anticipar la llegada para enviar el punto de inmediato, pero continúa rastreando; el Service de ingesta vuelve a verificarlo y es la única autoridad que persiste `CONCLUIDO` y devuelve `stopTracking:true` (RN-04/RN-17). Un punto fuera mantiene `EN_RUTA`.

Todos los puntos válidos del lote se almacenan para la ruta. Para decidir cierre se toman hasta los **dos puntos elegibles más recientes del viaje por `recordedAt`**; basta que uno esté dentro. Elegible significa, además, cumplir el umbral configurable de `accuracyMeters` (valor inicial 50 m, pendiente contrastar con la tabla operativa). Radios permitidos: 100–700 m.

Al crear el viaje se copian sólo centro y radio desde `Destination` hacia `Trip`; el nombre permanece normalizado mediante `destinationId`. Esto evita que editar la geocerca del catálogo reconfigure un viaje activo.

## Alternativas consideradas — Spatial Data Types / PostGIS
Tipos geográficos (`POINT`, `POLYGON`, `GEOGRAPHY`) con índices espaciales (GiST) y funciones `ST_DWithin`/`ST_Contains`.
- **A favor:** índices espaciales rapidísimos con **miles** de geocercas; soporta **polígonos** (no solo círculos); distancia geodésica exacta.
- **En contra (para este MVP):** es una **extensión** que hay que habilitar (no todos los hosts gestionados la traen); **no encaja con Prisma** → obliga a SQL crudo (`$queryRaw`), perdiendo la type-safety que motivó elegir Prisma; curva extra; **overkill** para círculos y volumen bajo. Los propios seniors notan que "no se necesitan grandes operaciones".

## Cuándo reconsiderar (upgrade path)
Migrar a PostGIS si: las geocercas pasan a ser **polígonos**, hay que evaluar **miles** de geocercas por punto, o aparecen consultas espaciales complejas. Como elegimos **PostgreSQL** (ADR-005), ese salto es posible **sin cambiar de motor**.

## Consecuencias
**Positivas:** lógica visible, auditable y testeable; cero infra extra; conserva type-safety de Prisma.
**Negativas:** una geometría de círculo hecha "a mano" (aceptable: es trivial y está cubierta por tests).

## Riesgos
Haversine divergente entre Kotlin y TypeScript (radio terrestre/unidades/borde) → mitigación: **vectores de prueba compartidos** con los mismos casos y resultados esperados en ambos proyectos (centro, justo en el borde, fuera).
