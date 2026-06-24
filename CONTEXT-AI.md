# Exiros On-Route Tracker — contexto para agentes

> Sigue la metodología global (`~/.agents/METODOLOGIA.md`). Si esta contradice un impulso, gana la metodología; si este archivo contradice a la metodología en algo específico del proyecto, gana este archivo.
> **Este es el archivo de contexto vivo entre sesiones.** Leer SIEMPRE al iniciar sesión, junto con `PLAN.md`. No re-explorar el repo si esto y el plan bastan.
> **Nombre:** este archivo es la instancia para este proyecto de lo que la metodología llama genéricamente "AGENTS.md". Renombrado a `CONTEXT-AI.md` por claridad. NO se auto-carga en Claude Code (busca `CLAUDE.md`); se lee manualmente al inicio de cada sesión.

---

## Qué es
Solución **independiente** de rastreo en ruta de camiones de chatarra (patio vendedor → patio comprador): app Android de acceso libre para operadores + portal web con login para monitoristas Exiros + backend/API único. Núcleo del producto: **rastreo en segundo plano con <10% batería/jornada** y **cierre automático por geocerca**.

## Documentos de verdad (orden de autoridad)
1. `~/.agents/METODOLOGIA.md` — cómo se trabaja (protocolo maestro).
2. `Exiros/CONTEXT-AI.md` — este archivo (contexto específico).
3. `Exiros/PLAN.md` — plan maestro + backlog de bloques + bitácora.
4. `Exiros/docs/technical-spec.md` — plano de arquitectura (capas, módulos, estructura, seguridad).
5. `Exiros/docs/fuente/2026 Exiros alcance MVP On-Route Tracker.md` — alcance/requisitos del cliente (fuente).
6. `Exiros/docs/fuente/IWA-Exiros - Estrategia Ágil-*.md` — reglas de la competencia interna.
7. `Exiros/docs/exiros-reference-image/` — capturas de referencia UI (android/ + webapp/) + `documentacion UX-UI.md`.

## Naturaleza del proyecto (gobierna prioridades)
- **Competencia interna iWA.** Equipo "Solo": **Rogelio con IA**. El equipo ganador continúa el proyecto.
- `main` será **auditado** (César/Emanuel, con rúbrica) y **probado por usuario** (Neto).
- **Calidad de repo + demo que no se rompe pesan tanto como las features.**
- **NO requerido:** despliegue en nube, CD, E2E. → Infra al mínimo demostrable.

## Ventana
- Desarrollo: **16–26 jun 2026**. Hoy de referencia del plan: **17 jun**. Presentación: **vie 26 jun**.
- Puntos con seniors: **19 jun** (dudas) y **23 jun** (arquitectura). Dudas funcionales: **Julio** (PM), cuando se necesiten.
- Sáb 20 / Dom 21 = buffer / ritmo ligero. Día 9 (jue 25) = congelación de `main`.

---

## Stack congelado (de PLAN §10 — no cambiar sin actualizar ADR)
- **Backend:** NestJS (TypeScript) ✅ ADR-002. **ORM:** Prisma 6.x ✅ ADR-006. **DB:** PostgreSQL ✅ ADR-005.
- **Web:** React + Vite + TypeScript ✅ ADR-003. **Mapa:** Leaflet + OpenStreetMap (gratis, sin API key).
- **Android:** Kotlin nativo + Jetpack Compose (FusedLocation + ActivityRecognition + Foreground Service + Room + WorkManager) ✅ ADR-004. Gradle 8.10.2 (wrapper) + AGP 8.7.2 + Kotlin 2.0.21 + Compose BOM 2024.10.01 + minSdk 26/compileSdk 34.
- **Auth web:** JWT ✅ implementado (Fase 6.1: `@nestjs/jwt`+`bcryptjs`, `JwtAuthGuard`+`AdminRolesGuard`, **2 roles ADMIN/MONITOR** — `SUPER_ADMIN` se eliminó 2026-06-23 por exceder la fuente, ver Pro-mejora I-03). **Ingesta:** **tripToken** (bearer por viaje+dispositivo) ✅ ADR-007, ya implementado.
- **Fotos:** disco/volumen local del backend (MVP).
- **Excel:** exceljs. **Validación:** class-validator + class-transformer. **Tests:** Jest (unit) + Supertest (e2e API).
- **Geocerca:** círculo (centro+radio) + **haversine** en el service. Sin PostGIS.

## Estructura del repo (monorepo — ADR-001)
```
/exiros-mvp
  /backend   # NestJS + Prisma
  /web       # React + Vite
  /android   # Kotlin + Compose
  /docs      # specs + /fuente + /exiros-reference-image
  /infra     # docker-compose, .env.example
  /openapi   # contrato openapi.yaml
  /scripts   # seed destinos, simulador de ruta
  PLAN.md  CONTEXT-AI.md  README.md
```

## Gates de calidad (verde antes de cada commit)
- **Backend:** `cd backend && npm run lint && npm run build && npm test && npm run test:e2e` (12 unit + 14 e2e; **e2e exige Postgres arriba**).
- **Web:** `cd web && npm run lint && npm run build`.
- **Android:** `cd android && JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew lintDebug assembleDebug`.
- Para cambios visuales (UI): no basta compilar — hay que **verlo renderizado** (captura/teléfono).
- Marca final `✔ Confirmado` SOLO la pone el humano. El agente: `[x] (pendiente confirmar)`.

## Reglas duras propias
- App Android: **sin login**, abre directo en el formulario. Español.
- ⚠️ **SEGURIDAD CRÍTICA — endpoint de ingesta público:** la app no tiene login → `/api/mobile/*` es la **mayor superficie de ataque**. Defensa en capas (ADR-007) ya montada en 8.1: helmet + Guard tripToken + rate-limit + ValidationPipe estricto + tope de body + Exception Filter + log de rechazos. Tratar cada dato entrante como hostil hasta validarlo.
- **No** lógica de negocio en controllers. **No** endpoints sin validación. **No** subir secretos (`.env` fuera del repo, `.env.example` sí).
- No cambiar arquitectura sin actualizar ADR; no cambiar API sin actualizar API Spec.
- Reporte Excel: **exactamente 13 columnas** del doc §6, sin más ni menos.
- IA: spec antes que código; no aceptar código que no se entienda; no cambios masivos sin revisar.

## Convenciones
- **Bloques (tickets):** id `fase.bloque` (ej. `0.3`, `2.1`); cada uno con módulo, alcance in/out, checkboxes y "Hecho cuando:". Se ejecutan con `/bloque <id>`.
- **Módulos (etiquetas):** `BE` backend · `WEB` web · `AND` android · `INF` infra · `DOC` docs/specs.
- **Ramas:** `main` siempre verde + ramas `feat/slice-...` por bloque. Commits convencionales: `feat: fix: refactor: docs: test: chore:`.

---

## ▶️ CHECKPOINT VIGENTE — 2026-06-23 (LEER ESTO PRIMERO; único checkpoint activo)
**TODAS LAS FASES 1–10 COMPLETAS (incl. Fase 9 deploy+demo). MVP funcional e2e verificado en emulador real. Todo verde. Todo `[x]` pendiente de validación/`✔ Confirmado` humano. Falta solo: validación de Rogelio + KPI batería (no medible sin teléfono).**
- **CIERRE SESIÓN 2026-06-24 (madrugada — hardening + refactor + UX, tras auditoría de Rogelio):** Ronda grande de mejoras "casi producción". **Seguridad/spec (commit `b2373ae`):** #1 anti-lockout de usuarios (no auto-baja/auto-degradación/último admin), #3 fail-fast de secretos (`validateEnv` + `getOrThrow`), #7-mapa radio de geocerca real, #9 cierre forzado solo ADMIN (`AdminRolesGuard`), #11 gate de lint **puro** (`lint` sin `--fix`, `lint:fix` aparte), #4 cadencia GPS a la fuente (2min/300m) + quitado el debug-sync. **Refactor (`3190c43`):** `backend/src/web/` plano → subcarpetas por feature (`trips/users/destinations/reports/`), solo `git mv`, sin tocar lógica/rutas. **Limpieza (`6ce4ddf`):** modal en blanco por `color-scheme: light dark` → forzado `light`; eliminado scaffold muerto (app.controller/service + tests), assets Vite y `App.css` huérfanos. **Tests+orden (`c4813e5`):** 5 unit de invariantes de usuarios (#2) + orden de ruta determinístico `recordedAt+id` (#3, backend+Room). **UX sidebar (`24d1443`,`5cd6e87`):** colapsable → **rail de iconos** (72px) con toggle dentro de la barra. **Más hallazgos (`e1af323`):** #5 export por destino (listado expone `destination.id`), #7 cierre admin con **modal** (no `window.prompt`), #6 guard que falla el release Android con placeholders dev. **Gates verdes en las 3 capas** (BE unit 25/e2e 46, Android assembleDebug + guard release, web lint+build); verificado en navegador (modal, sidebar, export) y Android (debug compila, release falla con placeholders). **DIFERIDO por decisión:** #4-idempotencia (mismo-timestamp → requiere migración Prisma + `clientPointId`; raro con cadencia 2 min y el #3 ya hace selección estable). **Documentación (`e934497`):** README reescrito **ejecutable multiplataforma** (npm install + `cp .env.example` + comandos separados backend/web/móvil, debug+release Android con `-P`, nota lint puro); `api-spec.md`+`openapi.yaml` actualizados a cierre web **solo ADMIN** (#9). **TODO PUSHEADO a `origin/main`** (tip `e934497`, árbol limpio).
- **CIERRE SESIÓN 2026-06-23 (noche — pulido Mapa W1):** A pedido de Rogelio se completó el Mapa al mockup `mapa-webapp.png`, **levantando el diferido de 10.2**. Decisión clave: **solo 3 estados** (En ruta / **Detenido** / Concluido); Sin actualización/Cerca de destino/Contingencia del Figma **NO se usan** (decisión de Rogelio). `Detenido` = viaje EN_RUTA sin lectura GPS **>30 min**, derivado en el portal (`web/src/tripState.ts`, **sin tocar backend**; encaja con la hibernación por acelerómetro). Añadido: capa **Clusters** (`leaflet.markercluster` vanilla, esquiva el riesgo de `react-leaflet-cluster`+React19), **leyenda 3 colores** y **tabla "Viajes visibles en el mapa"** (fila→centra mapa, ojo→detalle). **Revisión de código:** 🔒 corregido **XSS almacenado** en popup de Clusters (la app móvil es de acceso libre → campos iban en HTML interpolado; ahora nodos DOM con `textContent`); 🔁 DRY `MAP_STATES`. Gates verdes + verificado Playwright (2 viajes sembrados, consola limpia). Commit `f782da2`. **Sembrados de prueba:** `DEMO-ENRUTA`/`DEMO-DETEN` en BD dev (borrar antes de la demo).
- **CIERRE SESIÓN 2026-06-23 (tarde):** Fase 9 cerrada — **9.1** túnel cloudflared (`scripts/tunnel.sh`, solo túnel; deploy cloud pospuesto/D2), **9.2** simulador de ruta (`scripts/route-sim.sh` vía `adb emu geo fix`), **9.3** README reescrito + **ensayo e2e 2 corridas seguidas OK** (viaje→sim→cierre AUTO_GEOFENCE). Mejoras de diseño web pedidas por Rogelio: **emojis→iconos lucide-react** (sidebar+tablas), **modal de confirmación + icono basura** en baja de Destinos/Usuarios, **fix edición usuario** (rol precargado no reseteable + no pide contraseña). Mejora móvil: **M5 muestra el motivo de cierre** (Cierre automático por geocerca / manual por operador / por administrador) — backend devuelve `closureType` en la respuesta de ingesta; Room v2→v3. Commits `14c9f4e`..`e5033b2`. **Verificado en emulador real:** demo e2e cierra por geocerca y M5 pinta "Cierre automático por geocerca".

- **DÓNDE ESTÁ:** Producto casi completo. (1) **Móvil** (Fase 1–4): crear viaje → rastrear en 2º plano (FGS+Room+WorkManager GZIP) → cerrar (geocerca auto / operador M4 / admin web) → GPS off. (2) **Portal web** (Fase 10, fiel a `docs/exiros-reference-image/webapp/`): shell+sidebar + W0 login + W1 Mapa (KPIs/filtros/capas) + W2 Viajes (tabla/filtros/export Excel) + W3 detalle (datos/cierre/foto/ruta) + W4 Destinos (CRUD+mapa) + W5 Usuarios (CRUD, 2 roles ADMIN/MONITOR). (3) **Backend** completo: auth JWT + tripToken, `AdminRolesGuard`, reportes Excel 13 columnas, defensa en capas. **Fase 1+2 ✔ confirmadas por Rogelio; el resto = código 100%, pendiente ✔ humano.**
- **COMMITS CLAVE (detalle por bloque en bitácora `PLAN.md`):** Fase 9 + pulido (2026-06-23 tarde): `6aa877d` 9.1 túnel · `29f40ba` 9.2 simulador · `80357ff` M5 motivo de cierre · `e5033b2` 9.3 README+demo · `14c9f4e`/`8fd76e5`/`2ae1107` diseño web. Fase 10 (2026-06-23): `12b6d64` 10.1 · `b40dea2` 10.2 · `5ffd7d6` 10.3 · `33ebc8f` 10.4 · `fff6243` 10.5 · `b5be4c8` 10.6. Fase 6.1/7 (2026-06-22): `29c82c2` JWT · `97b7fd2` Excel · `65d6ffc` export web. **Todo pusheado a `origin/main` (working tree limpio).**
- **CÓMO LEVANTAR (orden):** (1) `docker compose -f infra/docker-compose.yml up -d`. (2) `cd backend && npx prisma migrate deploy && npx prisma db seed && npm run build && node dist/main.js` (:3000). **Login web:** `admin@exiros.com` / `admin1234` (lo crea el seed como ADMIN; idempotente). ⚠️ **Si el portal da 500 / login falla:** casi siempre el contenedor de Postgres se cayó (la máquina durmió → `Exited`); revisa `docker ps` y re-corre `docker compose -f infra/docker-compose.yml up -d`, luego reinicia `node dist/main.js`. (3) `cd web && npm run dev` (:5173). (4) emulador `~/Library/Android/sdk/emulator/emulator -avd Pixel_3a_API_34_extension_level_7_arm64-v8a -no-snapshot-save`; `cd android && JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew assembleDebug && ~/Library/Android/sdk/platform-tools/adb install -r app/build/outputs/apk/debug/app-debug.apk`. Ver BD: `cd backend && npx prisma studio`. ⚠️ **Tras tocar el backend, RECONSTRUIR+REINICIAR `node dist/main.js`** (el endpoint nuevo da 404 si corres el dist viejo — pasó con /close). Header móvil `x-app-key: dev-app-key-cambia-en-prod`; `10.0.2.2` = host desde emulador. Mover camión en pruebas: `adb emu geo fix <lng> <lat>` (el Extended Controls "Set Location" está roto en este emulador ARM). Pruebas: web refresca 30s (`web/.env.local`) y app sube 30s (debug).
- **⚠️ FOOTGUN DE PRUEBAS (RN-11):** `pm clear` / "Olvidar viaje (debug)" borran el viaje **local** pero NO el del backend → deviceId con EN_RUTA colgado bloquea crear otro (409). **Reset:** `docker exec exiros-postgres psql -U exiros -d exiros -c "update \"Trip\" set status='CONCLUIDO' where status='EN_RUTA';"`. Tras `pm clear`, esperar a que carguen los destinos antes de "Iniciar viaje".
- **HUECOS CERRADOS:** **H4** (`/api/web/*` con Guard JWT; cierre admin registra `closedById`) y **H5** (web alineada al diseño, Fase 10) — RESUELTOS. **RESTANTES (no bloquean; ninguno es un bloque del plan):** **H6** `/health` — DIFERIDO, NO se hizo en Fase 9 (la demo no lo necesita; útil para auditor/deploy). ~~Diferidos~~ **RESUELTOS 2026-06-23 noche:** estado **Detenido** (derivado >30 min, `tripState.ts`) + capa **Clusters** (markercluster vanilla) + leyenda 3 colores + tabla de viajes visibles. Por decisión de Rogelio NO se implementan Sin actualización/Cerca de destino/Contingencia (solo 3 estados). Menores conocidos (restantes): constant-time en `AppKeyGuard`; ingesta no exactamente-once entre reintentos (#4 idempotencia mismo-timestamp, **diferido**); `fallbackToDestructiveMigration` en Room; release Android sin URL prod real (hay guard que falla si quedan placeholders, #6). **Resueltos 2026-06-24:** cierre admin con `window.prompt`→modal (#7), export de Viajes sin filtro Destino (#5), gate de lint impuro (#11), radio de geocerca falso en mapa (#7-mapa), orden de ruta no determinístico (#3).
- **▶️ PRÓXIMOS PASOS (sesión de cierre del proyecto):** No quedan bloques de feature; el MVP está completo y verde. La próxima sesión es de **cierre/entrega**. En orden:
  1. **Validación humana de Rogelio** (lo único que bloquea el `✔ Confirmado`): recorrer portal (Mapa con los 3 estados nuevos + capas + tabla, Viajes, detalle, Destinos, Usuarios), exportar Excel, correr la demo e2e (`./scripts/route-sim.sh`). Marcar `✔ Confirmado` lo aprobado en `PLAN.md`.
  2. **Smoke en vivo de cierres NO probados en vivo:** operador (M4) y admin (forzar cierre web). El de geocerca ya está verificado e2e.
  3. **Limpiar BD dev** para la demo: borrar sembrados de prueba (`DEMO-ENRUTA`, `DEMO-DETEN`, viajes 100294 de "Transporte del Norte", usuario "María Pérez").
  4. **Opcional pre-entrega (código, lo puede hacer el agente):** endpoint `/health` (H6, útil al auditor/deploy); constant-time en `AppKeyGuard`. *(El export por destino #5 ya quedó hecho.)*
  5. **Post-MVP (no para la demo):** deploy cloud real (D2 con Julio, hoy solo túnel cloudflared); KPI batería <10% (no medible sin teléfono físico — deuda honesta en ADR-004).
- **⚠️ PARA ROGELIO (lo que TÚ debes resolver/validar — el agente no puede):**
  1. **VALIDAR** los bloques `[x] (pendiente confirmar)`: levanta el sistema, entra al portal (admin@exiros.com/admin1234), recorre Mapa/Viajes/detalle/Destinos/Usuarios, exporta el Excel, y corre la demo (`./scripts/route-sim.sh`). Marca `✔ Confirmado` lo que apruebes.
  2. ~~Decisiones diferidas~~ **RESUELTO 2026-06-23 noche:** Mapa ahora tiene **Detenido** (>30 min) + **Clusters** + leyenda + tabla de viajes visibles. Por decisión tuya quedaron fuera Sin actualización/Cerca de destino/Contingencia (solo 3 estados). Nada pendiente aquí salvo tu validación visual.
  3. **Cierre por operador y por admin probados solo por lógica/tests**, no en vivo: el cierre por **geocerca** SÍ se verificó e2e en emulador (demo 2 corridas + M5 muestra el motivo). Conviene un smoke en vivo de operador (M4) y admin (forzar cierre web) antes de la presentación.
  4. **Datos de prueba en la BD dev** acumulados al verificar: viajes CONCLUIDO de "Transporte del Norte SA de CV" (folio 100294), los 2 viajes activos del Mapa **`DEMO-ENRUTA`/`DEMO-DETEN`** (proveedor "Fletes del Centro"), destinos "Patio Comprador Monterrey"/"Patio Vendedor Saltillo", usuario "María Pérez" — bórralos si molestan para la demo.
  5. ~~Export de Viajes sin filtro Destino~~ **RESUELTO 2026-06-24 (#5):** el listado expone `destination.id` y el export aplica `destinationId`.
- **Decisiones cerradas:** **2 roles ADMIN/MONITOR** (la **fuente** `docs/fuente/...alcance MVP...md` es la ÚNICA verdad: solo define monitorista+administrador; `SUPER_ADMIN` del Figma se eliminó → I-03); export vive en **Viajes** no en Mapa; **Mapa = 3 estados** (En ruta/Detenido/Concluido; `Detenido` derivado >30 min) — Sin actualización/Cerca/Contingencia descartados por Rogelio; **9.1 = SOLO túnel cloudflared** (gratis, para teléfono físico), deploy cloud real pospuesto (D2 con Julio); iOS fuera. Prototipo Claude Design (`.dc.html`) eliminado por ruido (assets reales en `web/src/assets/`). ⚠️ batería/hibernación NO verificables sin teléfono. ⚠️ H4/H5 cerrados.
- **AVISO al abrir sesión nueva:** este checkpoint + `PLAN.md` bastan; NO re-explorar el repo. `git status` limpio antes de tomar bloque. Los ✔ de Fase 3+4 siguen "pendiente confirmar humano" hasta que Rogelio los valide.

## Historial de sesiones (resumen; detalle por bloque en la bitácora de `PLAN.md`)
- **2026-06-24 (madrugada — hardening + refactor + UX):** Auditoría de Rogelio → mejoras casi-producción: seguridad de usuarios (#1), fail-fast de secretos (#3), gate de lint puro (#11), cadencia GPS a la fuente (#4), cierre admin-only (#9), refactor `web/` a feature-folders, limpieza de código muerto + fix de modal oscuro, tests de invariantes (#2) + orden de ruta estable (#3), sidebar rail de iconos, export por destino (#5), modal de cierre (#7), guard de release Android (#6). #4-idempotencia diferido. Gates verdes 3 capas. Commits `b2373ae`→`e1af323`. → checkpoint vigente arriba.
- **2026-06-23 (noche — pulido Mapa W1 + revisión):** Levantado el diferido de 10.2: Mapa con 3 estados (Detenido derivado >30 min en `tripState.ts`, sin tocar backend), capa Clusters (markercluster vanilla), leyenda 3 colores y tabla "Viajes visibles en el mapa". Revisión de buenas prácticas: corregido XSS en popup de Clusters + DRY `MAP_STATES`. Gates verdes, Playwright OK. Commit `f782da2`. → checkpoint vigente arriba.
- **2026-06-23 (sesión Fase 9 + pulido — cierra el MVP):** **Fase 9 completa:** 9.1 túnel cloudflared (`scripts/tunnel.sh`, solo túnel), 9.2 simulador de ruta (`scripts/route-sim.sh`), 9.3 README reescrito + ensayo e2e **2 corridas seguidas OK** (viaje→sim→cierre AUTO_GEOFENCE). **Correcciones de diseño web pedidas por Rogelio:** emojis→iconos lucide-react, modal de confirmación + icono basura en baja Destinos/Usuarios, fix edición usuario (rol precargado, sin pedir contraseña). **Mejora móvil:** M5 muestra el motivo de cierre (`closureType` en respuesta de ingesta; Room v2→v3). Verificado en emulador real. Todo pusheado. → checkpoint vigente arriba.
- **2026-06-23 (sesión Fase 10 — portal web al diseño):** corrección de Rogelio (export va en Viajes, no en Mapa; replicar capturas exactas). Shell+sidebar+routing (10.1) + Mapa (10.2) + Viajes tabla/filtros/export (10.3) + detalle BE+FE (10.4) + Destinos CRUD BE+modal-mapa (10.5/Fase 5) + Usuarios CRUD+roles (10.6/Fase 6.2/6.3). Assets reales (logo+foto oficina). e2e 14→46. Cada pantalla verificada con Playwright. **Cierre de sesión:** se eliminó el rol SUPER_ADMIN (vuelta a 2 roles, fiel a la fuente) y el prototipo Claude Design (ruido). → checkpoint vigente arriba.
- **2026-06-22 (sesión Fase 6.1 + Fase 7):** auth JWT del staff (6.1, cierra H4) + reporte Excel 13 columnas (7.1) + botón/filtros export en la web (7.2) + login/sesión del portal (6.3 parcial, enabler). Verificado: backend unit 21 + e2e 32, smoke curl, y navegador real (Playwright) login→portal→export. → checkpoint vigente arriba.
- **2026-06-22 (sesión Fase 3+4):** Fase 3 completa (rastreo por lotes GZIP + cierre auto por geocerca) + Fase 4 completa (cierres operador/admin, M4/M5, stop GPS, forzar cierre web) + alineación al spec + Fase 1 y 2 confirmadas por Rogelio. → checkpoint vigente arriba.
- **2026-06-22 (sesión larga previa):** Fase 1+2 completa (Android 1.4/2.3/1.5) + M2 al diseño + 8.1 seguridad + 8.2 tests (12 unit + 14 e2e).
- **2026-06-22 (corta):** 2.4-web (portal lista viajes desde `GET /api/web/trips` + CORS) + diagnóstico de huecos H1–H7.
- **2026-06-21 (autónoma):** scaffolding 1.1 · NestJS+Prisma 1.2 · mapa Vite/Leaflet 1.3 · backend móvil 2.1 (`POST /trips` + AppKeyGuard + tripToken + RN-11 + snapshot geocerca) · foto multipart 2.2 · `GET /api/web/trips` 2.4-backend.
- **2026-06-19:** `git init`, `docs/technical-spec.md`, contrato `openapi/openapi.yaml` (18 ops); docs fuente → `docs/fuente/`. Decisión: scaffolding opción A (monorepo + docker PG); duplicación de docs aceptada conscientemente; identidad git `rogerpervaz`.
- **2026-06-18:** FASE 0 completa (4 specs + 12 ADRs + backlog Fases 1–9 en PLAN §21).

## Decisiones cerradas (no reabrir sin motivo)
- **ADRs Aceptadas (TODAS — Bloque 0.5 completo):** 001 monorepo split-ready · 002 monolito modular + NestJS · 003 React+Vite+Leaflet · **004 Kotlin nativo (+ Plan B plugin debug)** · 005 PostgreSQL · 006 Prisma · **007 JWT web + tripToken móvil** · **008 Docker solo PG local** · **009 deploy túnel+Railway (pend. confirmar Julio)** · **010 Jest unit + Supertest e2e (manuales en emulador)** · 012 geocerca haversine. **ADR-011 eliminada** (uso de IA = metodología, no entregable).
- **Functional Spec (0.2):** máquina de estados de 2 estados (En ruta → Concluido); S-01..S-07 resueltos (S-03 foto bloqueante cámara/galería).
- **Database Spec (0.4):** 4 entidades (User, Destination, Trip, Location) en `docs/database-spec.md`. `providerNumber`/`folio` = String; coords = Float; Duración NO se almacena (se deriva); soft-delete User/Destination, Trip inmutable; RN-11 = índice único parcial `deviceId WHERE status=EN_RUTA`; no se guarda identidad del chofer (solo `deviceId`). `Trip` lleva `destinationId` + snapshot inmutable de centro/radio (validar geocerca sin reconfigurar viajes activos).
- **API Spec (0.3):** `docs/api-spec.md`. `/api/web/*` (JWT) + `/api/mobile/*`. Bootstrap móvil (leer destinos + crear viaje) ocurre **antes** del tripToken → protegido con `X-App-Key` estática (debilidad documentada) + rate-limit; tripToken protege ingesta. Crear viaje usa `clientRequestId` + token HMAC derivable (sobrevive respuesta perdida). Ingesta = GZIP + `batchId` (idempotencia) + respuesta `stopTracking`. Sólo backend transiciona estado. Roles: ADMIN superset de MONITOR. Formato de error único: `{ error, message, details? }`.
- **UI/UX Spec (0.6) + referencias:** `docs/uiux-spec.md` + `docs/exiros-reference-image/` (capturas reales + `documentacion UX-UI.md`: paleta azul `#0D479C`/navy/`#F8FAFC`, Roboto móvil / Inter web, 5 pantallas móvil M1–M5 + 6 web W0–W5, reglas de negocio §6). **Es referencia visual, no contrato:** si choca con una regla dura (ej. cierre por operador = solo texto, sin foto) o con el alcance del bloque, se señala antes de copiar. Web y móvil = diseño separado.
- **Cierre/geocerca (2026-06-19, IMPLEMENTADO en Fase 4):** lote completo se guarda para ruta; cierre automático evalúa sólo los 2 puntos válidos más recientes por `recordedAt` y elegibles por `accuracyMeters` (50 m). Si cualquiera está dentro → backend cierra (AUTO_GEOFENCE). Manual fuerza con observaciones (operador MANUAL_OPERATOR / admin MANUAL_ADMIN). Cierre móvil offline se encola con `closeRequestId/requestedAt` (idempotente vía `SyncWorker`); transición de cierre atómica (`updateMany WHERE EN_RUTA`), segundo actor recibe `TRIP_ALREADY_CONCLUDED`. Al concluir, la app detiene el GPS (M5).
- **H2 RESUELTO:** catálogo de destinos lo crea el Admin desde el CRUD web (runtime, no build-time) → no bloquea código. **RN-13** interacción mínima en app (solo consume opciones). **RN-14** catálogo vacío → app bloquea inicio con estado vacío.
- **H7** refresco 15–20 min (configurable). **H10** volumen bajo (~200 usuarios → índices simples).

## Pendientes externos (NO bloquean código — esperan a terceros; seguimos con default)
| # | Tema | Default asumido | Resolver |
| :-- | :-- | :-- | :-- |
| D2 / ADR-009 | Deploy gratis vs solo túnel | Túnel en dev + Railway/Render en demo | Confirmar con Julio que deploy gratis no choca con "cloud no requerido" |
| H11 | iOS fuera de alcance | Sí, fuera | Confirmar con Julio |
| H6-disp | Teléfono físico para batería/OEM | Emulador (batería NO verificable) | Conseguir dispositivo "más adelante" |

## Conservación de tokens/sesión
- **Desactivar servidores MCP que no se usan** (Canva, Google Drive, Playwright hasta que se use) — inflan el system prompt cada turno aunque estén "diferidos".
- **`/clear` o sesión nueva = reset de caché.** Al volver: leer SOLO este `CONTEXT-AI.md` (checkpoint vigente) + `PLAN.md`, no re-explorar el repo.
- **Commit por bloque** = el seguro real contra perder trabajo.
- No re-leer archivos enteros: `grep` + lectura por rangos.

## Notas acumuladas (gotchas no-obvios, agrupados)
- **Backend dev:** tras tocar el backend, **reconstruir + reiniciar `node dist/main.js`** (un endpoint nuevo da 404 si corre el dist viejo — pasó con `/close`). **Auth web:** login `POST /api/web/auth/login` → `{accessToken,user}`; pasar `Authorization: Bearer <jwt>` a todo `/api/web/*`. Admin de dev = `admin@exiros.com / admin1234` (sembrar con `npx prisma db seed`; idempotente). **Gotcha build:** un `.ts` fuera de `src/` (ej. `prisma/seed.ts`) hace que `nest build` emita en `dist/src/main.js` y rompa `node dist/main.js` → mantener `prisma` en el `exclude` de `tsconfig.build.json` (el seed corre por ts-node, no necesita compilarse). `setupApp()` en `main.ts` = config endurecida compartida con e2e; `bootstrap()` sólo si `require.main===module`. No validar "dentro de geocerca" como filtro de ingesta (toda la ruta está fuera del destino); sí lat/lng rango + timestamp no futuro + bbox MX.
- **e2e (`npm run test:e2e`):** exige Postgres arriba; siembra/limpia su propio destino. **Flake posible** si el worker del emulador sincroniza contra el MISMO Postgres durante el test (contención) — no es bug, reintentar.
- **Emulador:** mover camión = `adb emu geo fix <lng> <lat>` (**lng primero**); el Extended Controls "Set Location" está **roto** en este AVD ARM. Boot: `emulator -avd Pixel_3a_API_34_extension_level_7_arm64-v8a -no-snapshot-save`. `10.0.2.2` = host desde el emulador; `usesCleartextTraffic=true` para HTTP dev. **Sin teléfono físico:** batería e hibernación (ActivityRecognition reporta STILL fijo) NO verificables → nunca reportarlas cumplidas.
- **⚠️ Footgun RN-11 en pruebas:** `pm clear` / "Olvidar viaje (debug)" borran el viaje local pero NO el del backend → deviceId con EN_RUTA colgado bloquea crear otro (409). Reset: `update "Trip" set status='CONCLUIDO' where status='EN_RUTA'`. Tras `pm clear`, esperar a que carguen los destinos antes de "Iniciar viaje".
- **Android build/runtime:** SIEMPRE `JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew ...` (sin gradle/Studio en PATH). FGS de ubicación (Android 14): `startForeground()` con `FOREGROUND_SERVICE_TYPE_LOCATION` en los primeros segundos ANTES de cualquier `await` (si no, crash) → notif genérica y luego actualízala. Lint `MissingPermission` exige `@SuppressLint` aunque envuelvas en `runCatching`. KDoc con `/*` (ej. ruta `/api/mobile/*`) rompe el compilador Kotlin.
- **Room:** `fallbackToDestructiveMigration` (caché local; se recrea en upgrade de esquema, el viaje vive también en backend). String-template `${X}` no vale en `@Query` → literal.
- **Prisma:** fijado a **6.x** (v7 rompe: `url=env()` fuera del schema + driver adapter obligatorio). Enums = un valor por línea. Índice parcial RN-11 (`WHERE status='EN_RUTA'`) vive como SQL crudo en la migración (Prisma no soporta `WHERE`). Nombres: `AAAA_MM_DD_NNN_desc` (`migrate dev` genera timestamp pegado → renombrar carpeta + `UPDATE "_prisma_migrations".migration_name` antes de commitear).
- **Arquitectura:** AOP NO existe en Nest (capa transversal = Guards+Interceptors+Pipes+Filters globales). ORM ≠ motor: Prisma soporta PG y MySQL (PG por DX/hosting, no escala) → un cliente MySQL (Workbench) NO conecta a Postgres; usar pgAdmin/DBeaver o **Prisma Studio** (`npx prisma studio`).
- **Meta:** sin memoria persistente entre sesiones → `PLAN.md` + `CONTEXT-AI.md` SON la memoria (leerlos al inicio; METODOLOGIA se auto-carga vía CLAUDE.md global).
- **Ideas Post-MVP (PLAN §5.4):** I-01 filtro "operador a pie" (mini-geocerca + ActivityRecognition); I-02 "actualizar ubicación" on-demand desde web (requiere push FCM/WS) — alternativa MVP = flag `pendingRefresh`.
