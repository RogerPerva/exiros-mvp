# Technical Spec — Exiros On-Route Tracker (MVP)

> **Plano de arquitectura.** Consolida lo decidido en `PLAN.md §8–13` y los ADRs en un solo documento que guía el scaffolding (Bloque 1.1) y el trabajo en capas. **No duplica** contratos ni esquema: para endpoints ver [`api-spec.md`](api-spec.md), para entidades ver [`database-spec.md`](database-spec.md), para reglas ver [`functional-spec.md`](functional-spec.md).
> Regla dura: **no cambiar arquitectura sin actualizar el ADR correspondiente** ni este documento.

---

## 1. Arquitectura general

**Monolito modular** organizado por *features*, con capas internas por módulo, y **una sola API** que sirve a web y Android (ADR-001 monorepo, ADR-002 backend).

- **Por qué no más** (microservicios, hexagonal pura, event-driven): sobreingeniería para un dev en una ventana corta; añade infra y ceremonia sin pagar valor.
- **Por qué no menos** (script sin capas): reprobaría la auditoría de código y sería difícil de extender (el equipo ganador continúa el proyecto).

```
[App Android] --POST /api/mobile/trips, /locations [GZIP]--> ┐
                                                              ├─> [API NestJS] ─> [PostgreSQL]
[Portal Web]  --REST + JWT (/api/web/*)--------------------> ┘        │
                                                            [Storage fotos: disco/volumen]
```

**Dos espacios de rutas sobre una sola API** (ADR-007):
- `/api/web/*` → monitorista/admin, autenticado con **JWT**.
- `/api/mobile/*` → app sin login, autenticado con **tripToken** (bearer por viaje+dispositivo) o bootstrap con `X-App-Key`.

---

## 2. Estructura del monorepo (ADR-001 / PLAN §13)

```
/exiros-mvp
  /backend      # NestJS + Prisma  — la API
  /web          # React + Vite + TS — portal monitorista
  /android      # Kotlin nativo     — app del operador
  /infra        # docker-compose.yml (Postgres), .env.example
  /scripts      # seed de destinos, simulador de ruta (GPX) para demo
  /docs         # specs + /adr + /fuente
  PLAN.md  CONTEXT-AI.md  README.md
```

**Split-ready:** cada carpeta de código es autónoma (su propio `package.json`/proyecto Gradle); si algún día se separan en repos distintos, el corte es limpio. No hay build tool de monorepo (Nx/Turborepo) — innecesario para este tamaño.

---

## 3. Backend — módulos y capas

### 3.1 Módulos (features)
`trips` · `locations` (ingesta) · `destinations` (geocercas) · `users`/`auth` · `reports`. Más un módulo transversal `common` (guards, pipes, filters, interceptors compartidos) y `config` (variables de entorno tipadas).

### 3.2 Capas dentro de cada módulo
Flujo de una petición: **Controller → Service → Repository → Prisma → DB**, con DTOs en los bordes.

| Capa | Responsabilidad | Prohibido |
| :-- | :-- | :-- |
| **Controller** | Entrada HTTP, valida la *forma* del request (DTO + ValidationPipe), delega al service | **Lógica de negocio** |
| **Service** | Reglas de negocio: validaciones de dominio, detección de geocerca (haversine), cierre de viaje, idempotencia | Acceso HTTP; SQL crudo |
| **Repository** | Acceso a datos vía Prisma (incl. `createMany` para lotes) | Reglas de negocio |
| **DTO + Mapper** | Contrato de entrada/salida; traduce entidad↔DTO para no exponer el modelo de persistencia | Duplicar lógica del service |
| **Prisma schema** | Esquema de persistencia (de `database-spec.md §10`) | — |

> Regla anti-duplicación (api-spec §2.1): web y móvil comparten **un solo Service** por dominio; lo que cambia es el guard/espacio de ruta, no la lógica.

### 3.3 Estructura de carpetas de un módulo (ejemplo `trips`)
```
/backend/src/trips
  trips.controller.ts        # @Controller('api/web/trips') y/o mobile
  trips.service.ts           # reglas: crear viaje, emitir tripToken, cerrar
  trips.repository.ts        # Prisma queries
  dto/create-trip.dto.ts     # class-validator + class-transformer
  dto/trip-response.dto.ts
  trips.mapper.ts
  trips.module.ts
```

---

## 4. Seguridad transversal (ADR-007 · "defensa en capas")

⚠️ La app móvil **no tiene login** → `/api/mobile/*` es la **mayor superficie de ataque**. NestJS **no tiene AOP** (eso es Spring/AspectJ); el equivalente nativo es **componer Guards + Pipes + Interceptors + Filters** globalmente. El `tripToken` por sí solo NO basta — se apila:

| Capa NestJS | Qué hace | Dónde |
| :-- | :-- | :-- |
| HTTPS / túnel | Cifrado en tránsito | Infra |
| **Guard** (`JwtGuard` / `TripTokenGuard`) | Autentica por espacio de ruta | global por controller |
| **Rate-limit** (por token/IP) | Frena abuso de ingesta | interceptor/middleware |
| **ValidationPipe** (whitelist + forbidNonWhitelisted) | Rechaza campos extra y tipos inválidos | global |
| Tope de body / GZIP | Limita `413` payloads enormes | config |
| **Exception Filter** | Formato de error único, no fuga de stack traces | global |
| Log de rechazos | Auditoría de intentos | interceptor |

**Validaciones de ingesta** (functional/api spec): lat/lng en rango, timestamp **no futuro**, bbox MX de cordura, `batchId` idempotente. **NO** se rechazan coords "fuera de geocerca" (toda la ruta está fuera; la geocerca es solo el destino).

**Principio:** todo dato entrante es hostil hasta validarlo.

---

## 5. Manejo de errores

Formato único en toda la API (PLAN §8):
```json
{ "error": "BadRequest", "message": "Texto en español para humanos", "details": { "campo": "motivo" } }
```
Centralizado en un **Exception Filter** global. Códigos: `200/201/400/401/403/404/409/413/429` (tabla completa en `api-spec.md §1`).

---

## 6. Acceso a datos (ADR-006 Prisma)

- Modelo declarativo + migraciones versionadas + cliente type-safe.
- **Ingesta:** `createMany` para insertar el lote de ~10 puntos de una vez (no inserts uno a uno).
- **Índices** (volumen bajo, ~200 usuarios): `tripId`, `recordedAt`, `trip.status`. **RN-11:** índice único parcial `deviceId WHERE status = EN_RUTA` (impide dos viajes activos por dispositivo).
- Motor intercambiable: cambiar `provider` + regenerar migraciones (Postgres↔MySQL). Sin PostGIS — geocerca = **haversine en el service** (ADR-012).

---

## 7. Patrones (PLAN §9)

**Sí:** Repository, Service Layer, DTO+Mapper, Dependency Injection (nativa Nest), Strategy para el tipo de cierre (auto / manual-operador / manual-admin), batch insert.

**No (para este MVP):** Observer/Event-driven, CQRS, Saga (la geocerca se resuelve síncrona en el service de ingesta), Factory/Builder (objetos simples), Facade (no hay subsistemas que ocultar).

---

## 8. Frontend web (ADR-003)

React + Vite + TypeScript; mapa **Leaflet + OpenStreetMap** (gratis, sin API key).

**Capas:**
- `pages/` — vistas W0–W5 (login, mapa de tránsito, detalle de viaje, destinos, usuarios).
- `components/` — UI reutilizable.
- `services/api/` — cliente HTTP (axios/fetch) con el JWT en `Authorization`.
- `hooks/` — estado y polling (mapa de tránsito refresca cada 15–20 min).
- `types/` — tipos del contrato (idealmente generados del OpenAPI que NestJS autogenera).

Sin SSR (Next.js descartado), sin estado global pesado salvo que se justifique.

---

## 9. Android (ADR-004)

Kotlin nativo. Componentes clave: `FusedLocationProvider` (fusiona GPS+WiFi+celular), `ActivityRecognition` (EN_VEHÍCULO/A_PIE/QUIETO para hibernar), **Foreground Service** (sobrevive en 2º plano), **Room** (cola local con `syncState` PENDING/SENT/FAILED), **WorkManager** (envío por lotes GZIP cada 15–20 min con reintentos).

**Capas:** UI (pantallas M1–M5) → ViewModel → repositorio local (Room) + repositorio remoto (Retrofit/OkHttp) → servicio de ubicación en background.

> KPI "<10% batería/jornada" = objetivo de diseño **no verificable en emulador**; nunca reportar como cumplido sin teléfono físico (H6).

---

## 10. Configuración, entornos y despliegue

- **Config tipada:** módulo `config` lee `.env` (nunca versionado; `.env.example` sí).
- **Docker (ADR-008):** `infra/docker-compose.yml` solo para **Postgres local** (`docker compose up` → DB en un comando). El backend puede correr en host o contenedor.
- **Entornos:** solo **local** y **demo** (no hay staging). Una URL de API por entorno.
- **Despliegue (ADR-009, pend. Julio):** dev = backend local + túnel (cloudflared) para el teléfono; demo = Railway/Render gratis. Web = build estático servido por el backend o Vercel/Netlify.
- **Fotos:** disco/volumen local (MVP); S3/R2 es post-MVP.

---

## 11. Testing (ADR-010)

- **Jest** unit para reglas de negocio (haversine/geocerca, validaciones, máquina de estados).
- **Supertest** e2e para contratos de la API.
- Android: pruebas manuales en emulador (ruta GPS simulada por GPX).
- **No** E2E de UI (Cypress/Playwright), **no** pruebas de carga — el proyecto los marca como no requeridos.

---

## 12. Gates de calidad y convenciones

- **Verde antes de cada commit** — Backend/Web: `npm run typecheck && npm run lint && npm test` (comando exacto se fija en el scaffolding). Android: `./gradlew lint testDebugUnitTest`.
- Cambios visuales: no basta compilar, hay que **verlo renderizado** (captura/emulador).
- **Commits convencionales** (`feat: fix: refactor: docs: test: chore:`); **un bloque = un commit limpio** mínimo.
- `main` siempre verde (auditada); ramas `feat/slice-...` por bloque.

---

## 13. Trazabilidad (decisión → respaldo)

| Decisión | Respaldo |
| :-- | :-- |
| Monorepo split-ready | ADR-001 |
| Monolito modular + NestJS | ADR-002 |
| React+Vite+Leaflet | ADR-003 |
| Kotlin nativo + Plan B | ADR-004 |
| PostgreSQL | ADR-005 |
| Prisma | ADR-006 |
| JWT web + tripToken móvil + defensa en capas | ADR-007 |
| Docker solo Postgres | ADR-008 |
| Túnel + Railway | ADR-009 |
| Jest + Supertest | ADR-010 |
| Geocerca haversine sin PostGIS | ADR-012 |
| Entidades / índices / RN-11 | `database-spec.md` |
| Endpoints / auth por espacio | `api-spec.md` |
| Reglas / máquina de estados | `functional-spec.md` |
| Pantallas / estados UI | `uiux-spec.md` |
