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
- **Backend:** NestJS (TypeScript) ✅ ADR-002. **ORM:** Prisma ✅ ADR-006. **DB:** PostgreSQL ✅ ADR-005.
- **Web:** React + Vite + TypeScript ✅ ADR-003. **Mapa:** Leaflet + OpenStreetMap (gratis, sin API key).
- **Android:** Kotlin nativo (FusedLocation + ActivityRecognition + Foreground Service + Room + WorkManager) ✅ ADR-004. Plan B: plugin cross-platform en debug si la bala trazadora falla en 2º plano.
- **Auth web:** JWT. **Ingesta:** **tripToken** (bearer por viaje+dispositivo) — diseño definido, falta ADR-007.
- **Fotos:** disco/volumen local del backend (MVP).
- **Excel:** exceljs. **Validación:** class-validator + class-transformer. **Tests:** Jest (+ Supertest e2e API).
- **Geocerca:** círculo (centro+radio) + **haversine** en el service. Sin PostGIS.

## Estructura objetivo del repo (monorepo — ADR-001)
```
/exiros-on-route-tracker
  /backend   # NestJS + Prisma
  /web       # React + Vite
  /android   # Kotlin
  /docs      # specs + /adr
  /infra     # docker-compose, .env.example
  /scripts   # seed destinos, simulador de ruta
  PLAN.md  CONTEXT-AI.md  README.md
```

## Gates de calidad (verde antes de cada commit; el repo aún no existe)
- **Backend/Web:** `npm run typecheck && npm run lint && npm test` (definir comando exacto al hacer scaffolding).
- **Android:** `./gradlew lint testDebugUnitTest` (definir al crear el proyecto).
- Para cambios visuales (UI): no basta compilar — hay que **verlo renderizado** (captura/teléfono).
- Marca final `✔ Confirmado` SOLO la pone el humano. El agente: `[x] (pendiente confirmar)`.

## Reglas duras propias
- App Android: **sin login**, abre directo en el formulario. Español.
- ⚠️ **SEGURIDAD CRÍTICA — endpoint de ingesta público:** la app no tiene login → `/api/mobile/*` es la **mayor superficie de ataque**. NO basta el `tripToken`: hay que componer **defensa en capas** (HTTPS + Guard tripToken + rate-limit por token + ValidationPipe estricto + tope de body/GZIP + Exception Filter + log de rechazos). Detalle completo en **ADR-007 §"Defensa en capas"**. Tratar cada dato entrante como hostil hasta validarlo.
- **No** lógica de negocio en controllers. **No** endpoints sin validación. **No** subir secretos (`.env` fuera del repo, `.env.example` sí).
- No cambiar arquitectura sin actualizar ADR; no cambiar API sin actualizar API Spec.
- Reporte Excel: **exactamente 13 columnas** del doc §6, sin más ni menos.
- IA: spec antes que código; no aceptar código que no se entienda; no cambios masivos sin revisar.

## Convenciones
- **Bloques (tickets):** id `fase.bloque` (ej. `0.3`, `2.1`); cada uno con módulo, alcance in/out, checkboxes y "Hecho cuando:". Se ejecutan con `/bloque <id>`.
- **Módulos (etiquetas):** `BE` backend · `WEB` web · `AND` android · `INF` infra · `DOC` docs/specs.
- **Ramas:** `main` siempre verde + ramas `feat/slice-...` por bloque. Commits convencionales: `feat: fix: refactor: docs: test: chore:`.

---

## Decisiones cerradas (no reabrir sin motivo)
- **ADRs Aceptadas (TODAS — Bloque 0.5 completo):** 001 monorepo split-ready · 002 monolito modular + NestJS · 003 React+Vite+Leaflet · **004 Kotlin nativo (+ Plan B plugin debug)** · 005 PostgreSQL · 006 Prisma · **007 JWT web + tripToken móvil** · **008 Docker solo PG local** · **009 deploy túnel+Railway (pend. confirmar Julio)** · **010 Jest unit + Supertest e2e (manuales en emulador)** · 012 geocerca haversine.
- **ADR-011 eliminada** (uso de IA = metodología, no entregable del proyecto).
- **Functional Spec (Bloque 0.2):** máquina de estados de 2 estados (En ruta → Concluido); S-01..S-07 resueltos (S-03 foto bloqueante cámara/galería).
- **Database Spec (Bloque 0.4):** 4 entidades (User, Destination, Trip, Location) en `docs/database-spec.md` + borrador `schema.prisma`. `providerNumber`/`folio` = String; coords = Float; Duración NO se almacena (se deriva); soft-delete User/Destination, Trip inmutable; RN-11 = índice único parcial `deviceId WHERE status=EN_RUTA`; no se guarda identidad del chofer (solo `deviceId`). `Trip` mantiene `destinationId` y snapshot inmutable sólo de centro/radio para validar con la geocerca asignada sin reconfigurar viajes activos.
- **API Spec (Bloque 0.3):** `docs/api-spec.md`. `/api/web/*` (JWT) + `/api/mobile/*`. Bootstrap móvil (leer destinos + crear viaje) ocurre **antes** del tripToken → protegido con `X-App-Key` estática (debilidad documentada) + rate-limit; tripToken protege ingesta. Crear viaje usa `clientRequestId` y token derivable por HMAC para sobrevivir respuesta perdida. Ingesta = GZIP + `batchId` (idempotencia) + respuesta `stopTracking`. Android anticipa geocerca y hace sync prioritario **sin detener GPS**; sólo backend transiciona: automático exige haversine dentro, manual permite forzar con observaciones. Roles: ADMIN superset de MONITOR (matriz §2.2). Dos espacios, un solo Service (regla anti-duplicación §2.1).
- **UI/UX Spec (Bloque 0.6):** `docs/uiux-spec.md`, brief con límites duros + lista "🚫 NO diseñar" para alimentar a Claude Design. 5 pantallas móvil (M1–M5) + 6 web (W0–W5). **Cierre por operador = solo texto, NO foto** (confirmado en doc fuente líneas 119/195). Para diseñar, pasar a la IA: `uiux-spec.md` + `functional-spec.md`. Web y móvil = sesiones de diseño separadas (distinta plataforma; no comparten componentes).
- **FASE 0 COMPLETA (2026-06-18):** 4 specs (Functional/API/DB/UI-UX) + 12 ADRs + backlog de implementación (Fases 1–9 en PLAN §21). Rogelio diseña UX/UI en paralelo. **Siguiente del lado código: Bloque 1.1 (scaffolding monorepo + git init + docker-compose Postgres).** Avanzar backend/bala trazadora (independiente del diseño).
- **▶️ CHECKPOINT 2026-06-22 #2 (LEER ESTO PRIMERO — supera a todo lo anterior en código):**
  **Sesión Android (Opus). 🎉 FASE 1+2 COMPLETA: cerrados 1.4 + 2.3 + 1.5 (los 3 bloques Android pendientes).**
  - **1.4 `[AND]` HECHO** (commit `ebbe8a7`): proyecto Kotlin+Compose que compila y abre pantalla en emulador. Stack Android congelado: **Gradle 8.10.2 (wrapper) + AGP 8.7.2 + Kotlin 2.0.21 + Compose BOM 2024.10.01 + minSdk 26/compileSdk 34**. `BuildConfig.API_BASE_URL=http://10.0.2.2:3000` y `APP_KEY` de dev.
  - **2.3 `[AND]` HECHO** (commit `734d700`): pantalla M2 (`MainActivity.kt`, Compose). Form 7 campos + dropdown destinos (desde `GET /api/mobile/destinations`) + foto vía `PickVisualMedia`. `data/Api.kt` (OkHttp: fetchDestinations/createTrip multipart/sendLocation), `data/DeviceId.kt` (UUID persistido en SharedPreferences = RN-11). `clientRequestId` UUID que se renueva tras éxito. **En debug** el form se siembra (datos ejemplo + foto `res/raw/sample_truck.jpg` + 1er destino) para verificación de un tap; **en release arranca vacío**. Verificado: viaje EN_RUTA creado desde emulador → BD con 7 campos+foto+deviceId.
  - **1.5 `[AND+BE+WEB]` HECHO** (commit `1637836`): bala trazadora E2E. **BE:** `common/trip-token.guard.ts` (Bearer, hash SHA256, solo EN_RUTA) + `mobile/locations.{controller,service}.ts` `POST /api/mobile/trips/:id/locations` (1 punto; **batchId generado server-side — los lotes GZIP idempotentes son 3.4**); `web-trips.service.ts` ahora devuelve `lastLocation` + centro de geocerca del destino. **AND:** botón "Enviar ubicación de prueba" manda 1 coord hardcodeada (25.6700,-100.3000) con el tripToken. **WEB:** `TripsMap.tsx` (Leaflet, **CircleMarker** para evitar el bug de iconos PNG con Vite) bajo el shell del portal; fetch elevado a `App.tsx` y compartido con `TripsList` (ahora recibe `trips` por props). Verificado: tap emulador → fila en `Location` → **punto rojo en el mapa web**.
  - **ESTADO Fases 1+2: TODO ✅** (1.1–1.5, 2.1–2.4). **Falta SOLO la confirmación humana (✔) de Rogelio.**
  - **Gates verdes:** Android `./gradlew lintDebug assembleDebug` (`JAVA_HOME=$(/usr/libexec/java_home -v 21)`); backend `npm run lint && npm run build && npm test`; web `npm run lint && npm run build`.
  - **NOTAS DE ENTORNO ANDROID (caras de averiguar, no re-investigar):** (1) sin `gradle`/Studio en PATH → wrapper se generó corriendo el gradle 9.4.1 **cacheado** (`~/.gradle/wrapper/dists/gradle-9.4.1-bin/.../bin/gradle`) sobre un `settings.gradle.kts` vacío en `/tmp` (Gradle 9 EXIGE settings file para la task `wrapper`); el wrapper del repo apunta a 8.10.2. (2) **KDoc con `/api/mobile/*` ROMPE el compilador Kotlin**: la secuencia `/*` se interpreta como comentario de bloque anidado → "Unclosed comment". No usar `/*` dentro de comentarios. (3) Emulador: `~/Library/Android/sdk/emulator/emulator -avd Pixel_3a_API_34_extension_level_7_arm64-v8a -no-snapshot-save` (ya booteado = `adb devices` → `emulator-5554`). (4) `10.0.2.2` = host de la Mac visto desde el emulador. (5) `usesCleartextTraffic=true` en manifest (HTTP a dev). (6) Para probar: backend en :3000 (ya hay uno o `node backend/dist/main.js`), Postgres `docker compose -f infra/docker-compose.yml up -d`, web `npm run dev` (:5173), destino sembrado con UUID v4.
  - **EXTRA mismo día (tokens de sobra):** (a) **M2 pulida al diseño** (commit `0db7f6c`): `ui/ExirosTheme.kt` con paleta del doc UX/UI; M2 == `docs/exiros-reference-image/android/formulario-android.png` (wordmark, labels arriba, placas en fila, caja foto verde, botón azul). (b) **Subset de tests 8.2** (commit `cd57e34`): 11 tests unitarios reales (Prisma mockeado) de `TripsService`/`TripTokenGuard`/`LocationsService` → **12/12 verdes, H1 parcialmente cerrado** (falta e2e Supertest + `WebTripsService`/`AppKeyGuard` para 8.2 completo).
  - **REFERENCIAS DE DISEÑO (nuevas, de Rogelio):** `docs/exiros-reference-image/` (carpetas `android/` y `webapp/`) + `documentacion UX-UI.md` (paleta, tipografía Roboto móvil/Inter web, 5 pantallas móvil M1–M5, 6 web W0–W5, reglas de negocio §6). Es **referencia visual, no contrato**: si choca con una regla dura (ej. cierre = solo texto, sin foto) o con el alcance del bloque, se señala antes de copiar.
  - **⚠️ DIVERGENCIA WEB conocida (anotada, NO ejecutada):** el portal del diseño = **shell con sidebar** (Mapa·Viajes·Destinos·Usuarios) + **W2 tabla** (no tarjetas) + W1 mapa con KPIs/clusters/filtros. Lo construido (lista de tarjetas + mapa simple en 1.5/2.4) **no coincide** con esa IA → alinear en bloques WEB futuros (sidebar/routing ~Fase 6.x; KPIs/clusters/polling 3.5+). No rebuildear el web fuera de su bloque.
  - **EXTRA #2 mismo día — 8.1 + 8.2 COMPLETOS (H1/H2/H3 cerrados):** (a) **Seguridad 8.1** (commit `cd5a2d2`): `helmet` (CORP cross-origin para no romper fotos), `@nestjs/throttler` global 100/min IP (429, env `THROTTLE_TTL_MS`/`THROTTLE_LIMIT`), body JSON 256kb (413; multipart 5MB intacto), `AllExceptionsFilter` global (`common/all-exceptions.filter.ts`) = formato único `{error,message,details?}` + log + borra huérfanos uploads/ (H3). `setupApp()` en `main.ts` compartido bootstrap+e2e; bootstrap sólo si `require.main===module`. (b) **Tests 8.2** (commits `cd57e34`+`8808e72`): 12 unit + **14 e2e** (`test/mobile.e2e-spec.ts`, Supertest contra app endurecida + Postgres real, cubre AppKeyGuard/trips/idempotencia/RN-11/WebTrips/ingesta tripToken). **Gates: lint+build+`npm test`(12)+`npm run test:e2e`(14) verdes.** ⚠️ e2e necesita Postgres arriba (`docker compose -f infra/docker-compose.yml up -d`) y siembra/limpia su propio destino+deviceId.
  - **ESTADO HUECOS tras esta sesión:** H1 ✅ (tests reales), H2 ✅ (defensa en capas; queda constant-time del AppKey = mejora menor), H3 ✅ (huérfanos). **Siguen:** H4 (`/api/web/*` sin JWT = Fase 6.1), H5 (shell/sidebar + W2 tabla + mapa W1 = bloques WEB), H6 (`/health` = Fase 9), D-A (docs api-spec vs openapi).
  - **PENDIENTE de tu decisión (Rogelio):** Fase 1+2 + M2 diseño + 8.1 + 8.2 hechos → arrancar **Fase 3** (rastreo por lotes: 3.1 Room/captura, 3.2 Foreground Service, 3.3 WorkManager GZIP, 3.4 ingesta real que endurece el seam de 1.5, 3.5 mapa con polling) o seguir cerrando huecos (H4 JWT web / H5 shell web). El endpoint de ingesta de 1.5 es el seam que 3.4 endurece.
- **▶️ CHECKPOINT 2026-06-22 #1 (histórico; superado por #2 arriba):**
  **Sesión corta (Opus). Cerrado el frente web del Bloque 2.4 + diagnóstico de huecos. SIN tocar Android, SIN refactors.**
  - **2.4-web `[WEB]` HECHO** (commit `75c6be7`): el portal lista viajes consumiendo `GET /api/web/trips`. `app.enableCors()` en `main.ts` (origin por `WEB_ORIGIN`, default abierto en dev). Nuevos `web/src/api.ts` (`fetchTrips`/`photoUrl`, base por `VITE_API_URL`) + `TripsList.tsx`/`.css` (tarjetas: badge En ruta/Concluido, foto desde `/uploads`, folio/placa/destino/inicio, estados loading/error/vacío). `App.tsx` = shell del portal (header + lista). **Verificado Playwright** (viaje "En ruta" con foto). **El mapa de 1.3 quedó desplazado** (vive en git) → reintegrar bajo el shell del portal en bloque WEB futuro.
  - **DIAGNÓSTICO DE HUECOS Fase 1+2** (en `PLAN.md` bitácora 2026-06-22, leerlo): el código está cuidado y el plan ya anticipó lo grande en Fase 8. Lo más urgente para la **auditoría con rúbrica**: **H1 (ALTO)** NO hay tests reales (solo el scaffold "Hello World"; `npm test`=1/1 engaña) → adelantar subset de 8.2 antes de Fase 3; **H2 (ALTO/seg)** defensa en capas incompleta (falta helmet, throttler/rate-limit [no instalado], body-limit, exception filter global, log de rechazos) = Bloque 8.1; **H4** `/api/web/*` sin JWT (cualquiera lista viajes) = 6.1. Detalle H1–H7 + docs redundantes (D-A: `api-spec.md` vs `openapi.yaml`) en la bitácora.
  - **ESTADO Fases 1+2:** 1.1/1.2/1.3 ✅ · 1.4/1.5 ❌ (Android) · 2.1/2.2 ✅ · 2.3 ❌ (Android) · 2.4 ✅ (BE+WEB). **Falta SOLO Android para cerrar Fase 1+2.**
  - **SIGUIENTE (sesión fresca):** **sesión Android dedicada 1.4→1.5→2.3** (es lo caro; presupuesto fresco). Emulador: `~/Library/Android/sdk/emulator/emulator -avd Pixel_3a_API_34_extension_level_7_arm64-v8a`. Sin `gradle` en PATH ni Studio → wrapper `./gradlew` (descarga 1ª vez). 1.5 = bala trazadora (1 coord hardcodeada emulador→backend→punto en mapa web). **Para probar el backend ya hecho:** `docker compose -f infra/docker-compose.yml up -d` · `cd backend && npx prisma migrate deploy && node dist/main.js` · sembrar destino con **UUID v4 válido** (psql user `exiros`) · mobile con header `x-app-key: dev-app-key-cambia-en-prod` · web `cd web && npm run dev` (:5173). Gates backend: `cd backend && npm run lint && npm run build && npm test`.
  - **PENDIENTE de tu decisión (Rogelio):** ¿adelantar tests (8.2 subset) y/o endurecer seguridad (8.1) ANTES de Android, o cerrar Android primero? (Lo recomendado por riesgo de auditoría es adelantar tests, pero Android es lo que falta para "Fase 1+2 completa".)
- **▶️ CHECKPOINT 2026-06-21 (histórico; superado por 06-22 en lo que toca a código):**
  **Sesión autónoma "Opus a cargo" (semáforo de tokens, paré en ámbar 75%).** Hechos y verificados 4 bloques, commit local por bloque (sin push, por ahorro):
  - **1.1** `[INF]` scaffolding: `/backend /web /android /scripts` + `infra/docker-compose.yml` (Postgres 16, healthy) + `.env.example`. Comando: `docker compose -f infra/docker-compose.yml up -d`.
  - **1.2** `[BE]` NestJS + **Prisma fijado a 6.x** (v7 rompe — ver Notas) + `schema.prisma` (de `database-spec.md §10`) + migración `init` (4 tablas) + **índice parcial RN-11** (SQL crudo en la migración). API arranca y conecta.
  - **1.3** `[WEB]` Vite React-TS + Leaflet, mapa OSM full-screen. Verificado con screenshot Playwright.
  - **2.1** `[BE]` `GET /api/mobile/destinations` + `POST /api/mobile/trips` (AppKeyGuard X-App-Key, tripToken HMAC+hash, idempotencia, RN-11, snapshot geocerca, ValidationPipe global, prefijo `/api`). Verificado con curl (201/idempotente/409/400/401).
  - **2.2** `[BE]` foto multipart en `POST /trips` (`FileInterceptor`+`diskStorage`→`uploads/`, `ParseFilePipe` ≤5MB+jpeg/png, `ServeStaticModule` en `/uploads`). Verificado curl. **Limitación:** huérfanos en `uploads/` cuando ValidationPipe/ParseFilePipe rechaza (limpiar en 8.1 con exception filter global).
  **DECISIÓN clave de secuencia:** Android (1.4 Kotlin emulador, 1.5 bala trazadora, 2.3 pantalla M2) **diferido a sesión dedicada** — el tooling existe (`~/Library/Android/sdk`, AVD `Pixel_3a_API_34...` ya creado, sin Studio ni `gradle` en PATH → usar wrapper) pero el primer build Gradle + boot de emulador es caro en tokens. Se priorizó backend (independiente, alto valor).
  - **2.4-backend** `[BE]` `GET /api/web/trips` (commit `20f1ddd`): `WebModule` cableado en `AppModule`, lista viajes (activos primero) con destino/foto/status. **Verificado curl 200.** ⚠️ SIN Guard JWT aún (espacio `/api/web/*` se protege en Fase 6.1) — hay TODO en `web-trips.controller.ts`.
  **ESTADO:** Fase 1 = 1.1/1.2/1.3 ✅ (1.4/1.5 ❌ Android). Fase 2 = 2.1/2.2 ✅, 2.4 a medias (backend ✅, falta UI React) (2.3 ❌ Android). **6/9 bloques** de Fase 1+2.
  **SIGUIENTE (orden para sesión nueva — arranca leyendo SOLO este checkpoint):**
  1. **2.4-web** `[WEB]`: en `/web`, una vista de lista/tarjetas que consuma `GET http://localhost:3000/api/web/trips` (CORS: habilitar en `backend/src/main.ts` con `app.enableCors()` — aún NO está). Mostrar `providerName/folio/frontPlate/status/photoPath` (la foto se sirve en `/uploads`). Verificar con Playwright. **Hecho cuando:** el viaje se ve "En ruta" en web con su foto.
  2. **Sesión Android dedicada** para **1.4→1.5→2.3** (es lo más caro; hacerlo con presupuesto fresco). Emulador: `~/Library/Android/sdk/emulator/emulator -avd Pixel_3a_API_34_extension_level_7_arm64-v8a`. Sin `gradle` en PATH ni Android Studio → generar proyecto Kotlin con wrapper (`./gradlew`, descarga la 1ª vez). 1.5 = bala trazadora (1 coord hardcodeada emulador→backend→punto en mapa web).
  3. **Fase 3+** (rastreo por lotes, ingesta `POST /trips/:id/locations`, cierre por geocerca).
  **Cómo levantar todo para probar:** `docker compose -f infra/docker-compose.yml up -d` · `cd backend && npx prisma migrate deploy && node dist/main.js` (o `npm run start:dev`) · sembrar destino con UUID **v4 válido** · mobile usa header `x-app-key: dev-app-key-cambia-en-prod`. Gates backend: `npm run lint && npm run build && npm test`. Para probar el backend ya hecho: levantar Postgres + `node backend/dist/main.js`, sembrar un destino con UUID **v4 válido** (¡no `1111...`! la validación `@IsUUID` lo rechaza), y curl con header `x-app-key: dev-app-key-cambia-en-prod`.
  **Gates backend:** `cd backend && npm run lint && npm run build && npm test` (todo verde al cerrar). Tip de ahorro: ver sección "Conservación de tokens/sesión" arriba.
- **▶️ CHECKPOINT 2026-06-19 (LEER ESTO PRIMERO la próxima sesión, luego PLAN §21):**
  **Hecho esta sesión:** repo `git init -b main` (3+ commits) → empaquetado para GitHub privado `exiros-mvp` (push **pendiente**: `gh` 2.95.0 instalado pero `gh auth status` = NO autenticado; tras autenticar → `gh repo create exiros-mvp --private --source . --push`). Creado **`docs/technical-spec.md`** (plano de arquitectura en capas). Creado contrato **`openapi/openapi.yaml`** (OpenAPI 3.0.3, válido con @redocly, 18 operaciones con operationId) — vive en carpeta propia `/openapi`. Docs fuente movidos a `docs/fuente/`. Checkboxes de PLAN §21 reconciliados. Ideas I-01/I-02 en PLAN §5.4.
  **Decisiones tomadas con Rogelio:** Technical Spec primero (hecho) → Bloque 1.1 scaffolding **opción A** (monorepo + docker-compose Postgres). NO consolidar la duplicación de docs (aceptada conscientemente). Identidad git = `rogerpervaz` (su cuenta GitHub).
  **Diseño web descargado de Claude Design:** carpeta **`Exiros On-Route Tracker/`** (UNTRACKED, en la raíz). Es un prototipo `.dc.html` de alta fidelidad (NO una app): cubre TODAS las pantallas — web Login/Mapa/Viajes/Detalle/Destinos/Usuarios+2 modales (W0–W5), móvil Permisos/Formulario/En curso/Concluido/Finalizar (M1–M5). Reutilizable = markup+CSS inline + Leaflet (mismo stack) como **referencia visual**. Descartable = `support.js` (runtime del editor) y bindings `{{}}`/`<sc-if>`. Hay que **reconstruir en React** (el HTML depende de support.js, no corre como app).
  **PENDIENTE de decidir (no ejecutado):** (1) mover ese diseño a `docs/design/` SIN las imágenes pesadas (`oficina-exiros.jpg` = 6.8 MB duplicado en `assets/` y `uploads/`; `uploads/` trae copia vieja de `uiux-spec.md`) — quedarse solo con los 2 `.dc.html` + `assets/exiros-logo.png`. (2) si Rogelio quiere, armar el **mapa de integración** (pantalla diseño → componente React → operationId del OpenAPI → estados) antes de codear.
  **SIGUIENTE ACCIÓN:** ejecutar **Bloque 1.1 opción A** (scaffolding `/backend /web /android /scripts` + docker-compose Postgres + .env.example + git). Luego portar el diseño a React en `/web` y cablear al `openapi/openapi.yaml`. Entorno OK (Node 22, Docker 27, Java 21). NO re-explorar el repo: este checkpoint + PLAN §21 bastan.
- **ADR-004 Android = Kotlin nativo** (Flutter/RN descartado: núcleo no sería código propio + licencia release; Java descartado: Kotlin > Java; plugins gratis descartados: poco fiables en 2º plano).
- **H7** refresco 15–20 min (configurable; límite batería+datos). **H10** volumen bajo (~200 usuarios, usuario nunca toca la BD → índices simples).
- **Cierre/geocerca refinado (2026-06-19):** lote completo se guarda para ruta; cierre automático evalúa sólo hasta los 2 puntos válidos más recientes por `recordedAt` y elegibles por `accuracyMeters` (inicial 50 m, pendiente tabla). Si cualquiera está dentro → backend cierra; manual fuerza con observaciones. Radio 100–700 m. Cierre móvil offline se encola con `closeRequestId/requestedAt`; Room restaura viaje tras reinicio; transición de cierre atómica y segundo actor recibe `TRIP_ALREADY_CONCLUDED`.
- **H2 RESUELTO:** catálogo de destinos lo crea el Admin desde el CRUD web (datos de **runtime, no build-time**) → no bloquea código; datos reales solo para demo creíble. **RN-13** interacción mínima en app (solo consume opciones, no crea nada). **RN-14** catálogo vacío → app bloquea inicio con estado vacío.

## Pendientes externos (NO bloquean código — esperan a terceros; seguimos con default)
| # | Tema | Default asumido | Resolver |
| :-- | :-- | :-- | :-- |
| D2 / ADR-009 | Deploy gratis vs solo túnel | Túnel en dev + Railway/Render en demo | Confirmar con Julio que deploy gratis no choca con "cloud no requerido" |
| H11 | iOS fuera de alcance | Sí, fuera | Confirmar con Julio |
| H6 | Teléfono físico para batería/OEM | Emulador (batería NO verificable) | Conseguir dispositivo "más adelante" |

> **Todas las ADRs están cerradas.** Lo que sigue NO es diseño de decisiones, es **specs que alimentan código**: 0.4 (DB→Prisma), 0.3 (API→contratos), luego scaffolding + bala trazadora.

## Conservación de tokens/sesión (leer si el gasto preocupa)
> Diagnóstico 2026-06-21: el gasto por turno lo domina el **costo fijo del system prompt** (cache-read/write de 150k+ tokens), NO el trabajo de código. Palancas, de mayor a menor:
- **Desactivar servidores MCP que no se usan** (Canva ~55 tools, Google Drive, Playwright hasta que exista `/web`). Es el ahorro grande: inflan el prompt cada turno aunque estén "diferidos".
- **Cerrar sesión / `/clear` = mejor reset de caché.** Al volver: sesión nueva + leer SOLO este `CONTEXT-AI.md` (checkpoint) en vez de re-explorar el repo.
- **Commit por bloque** = el seguro real contra perder trabajo (ya es el protocolo).
- No re-leer archivos enteros: usar `grep` + lectura por rangos. `token-check.sh` mide la ventana de contexto; `/usage` mide la cuota dura (5h/semana) — son cosas distintas.

## Notas acumuladas (descubrimientos no-obvios; una línea c/u)
- 2026-06-21: **Prisma fijado a 6.x** (no 7). Prisma 7.8 rompe: `url=env()` ya NO va en el schema (se mueve a `prisma.config.ts`) y `PrismaClient` exige driver adapter (`@prisma/adapter-pg`). Para Nest + demo estable se eligió v6 (combo probado, `.env` auto-cargado por el CLI). Si se sube a v7, hay que reescribir datasource + adapter del cliente.
- 2026-06-21: **Enums Prisma = un valor por línea.** El borrador de `database-spec.md §10` tenía `enum Role { ADMIN MONITOR }` en una línea = inválido (`This line is not an enum value definition`). En el `schema.prisma` real van multi-línea.
- 2026-06-21: **Índice parcial RN-11** no se expresa en `schema.prisma` (Prisma no soporta `WHERE` en índices) → vive como `CREATE UNIQUE INDEX ... WHERE status='EN_RUTA'` dentro de la migración inicial. Si se regenera la migración desde cero, re-añadir ese SQL a mano.
- 2026-06-17: El "AI" del doc de batería = Fused Location nativo, **no IA propia** en el producto. No confundir alcance.
- 2026-06-17: El doc menciona iOS (CoreMotion/CoreLocation) pero el alcance es **solo Android** → ruido a ignorar.
- 2026-06-17: La línea de AWS en el alcance está **tachada** en el doc fuente → cloud no es requisito.
- 2026-06-17: **tripToken** = credencial bearer ligada a UN viaje + dispositivo, emitida en `POST /trips`, enviada en cada lote, invalidada al cerrar. Resuelve ingesta sin login (H5) y "no aceptar coords de viaje terminado / otro dispositivo". → ADR-007.
- 2026-06-17: **Geocerca = haversine en el service**, NO PostGIS (overkill para círculos + volumen bajo). PostGIS es upgrade path si hay polígonos/miles de geocercas; Postgres lo soporta sin cambiar de motor. → ADR-012.
- 2026-06-17: **NO validar coords "dentro de geocerca"** como filtro de ingesta — toda la ruta está fuera de las geocercas (la geocerca es solo el destino). Sí validar: lat/lng en rango, timestamp no futuro, bbox MX de cordura.
- 2026-06-17: Seguridad móvil con NestJS = **Guards/Interceptors**, no AOP de Spring. Una sola API, rutas `/api/web/*` (Guard JWT) y `/api/mobile/*` (Guard tripToken).
- 2026-06-18: **AOP NO existe en NestJS** (es paradigma Spring/AspectJ). La "capa de seguridad transversal" que se quiere = componer **Guards + Interceptors + Pipes + Filters** globalmente. Mismo objetivo que AOP, mecanismo nativo. No perseguir AOP en Nest.
- 2026-06-17: **ORM y motor son decisiones separadas.** Prisma soporta Postgres y MySQL por igual → el motor queda intercambiable (cambiar `provider` + regenerar migraciones). Por eso ADR-005 es de bajo riesgo.
- 2026-06-17: Postgres se eligió por DX/estrictez/hosting-gratis, **NO por escala** (a ~200 usuarios da igual). Si la duda vuelve: MySQL sería idéntico en calidad de producto.
- 2026-06-17: **No tengo memoria persistente entre sesiones.** METODOLOGIA se auto-carga vía `@import` del CLAUDE.md global; `PLAN.md` y `CONTEXT-AI.md` NO → leerlos manualmente al inicio. Estos archivos SON la memoria.
- 2026-06-18: **GPS/energía/permisos = APIs de Android**, Kotlin es solo el lenguaje. `FusedLocationProvider` fusiona GPS+WiFi+celular (menos batería). Permisos runtime A13/14: ubicación precisa + **ubicación en 2º plano** (clave) + activity recognition + foreground service + notificaciones + cámara/galería.
- 2026-06-19: **Ideas en evaluación de Rogelio (PLAN §5.4, sin decidir):** **I-01** filtro "operador a pie" (mini-geocerca dinámica ~50–80 m + ActivityRecognition/velocidad → reenviar misma ubicación cuando el operador camina; viable y barato, ya en stack ADR-004). **I-02** botón "Actualizar ubicación" on-demand desde la web → choca con diseño *pull*: requiere push (FCM/WebSocket) = Post-MVP; alternativa MVP = flag `pendingRefresh` que la app aplica en su siguiente latido.
- 2026-06-18: **Sin teléfono físico → emulador.** El emulador SÍ: UI, flujo de permisos, **ruta GPS simulada (GPX)** → demo de cierre por geocerca viable (cubre también H3). El emulador NO: batería real ni battery-killers OEM (es Android puro). → KPI "<10% batería" = objetivo de diseño NO verificado hasta dispositivo real; nunca reportarlo como cumplido sin teléfono.

