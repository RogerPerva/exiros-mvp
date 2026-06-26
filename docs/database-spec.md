# Database Spec — Exiros On-Route Tracker (MVP)

> **Bloque 0.4.** Deriva de la Functional Spec (`functional-spec.md`) y del doc de alcance §6 (13 columnas). Es la fuente de verdad del modelo de datos. El `schema.prisma` se genera 1:1 desde aquí (§10). Si una entidad cambia, se cambia **aquí primero**.
> ADRs que la gobiernan: 005 (PostgreSQL), 006 (Prisma), 007 (auth/tripToken), 012 (geocerca haversine).

---

## 1. Entidades (visión general)

Cuatro entidades. Volumen bajo (~200 usuarios, lotes de ~10 puntos cada 15–20 min) → **índices simples bastan** (H10).

```
   User ────< (createdBy) Destination ────< Trip >──── (closedBy) User
                                              │
                                              └────< Location

   Trip conserva `destinationId` como FK y además un snapshot inmutable
   (`destinationLat/Lng/Radius`) para validar la geocerca asignada.
```

| Entidad | Qué representa | Origen del dato |
| :-- | :-- | :-- |
| **User** | Monitorista o Admin del portal web | Alta por Admin |
| **Destination** | Destino del catálogo + su geocerca (centro+radio) | CRUD web (Admin) |
| **Trip** | Un viaje (las 13 columnas del reporte salen casi todas de aquí) | Creado por la app móvil |
| **Location** | Un punto GPS de la ruta de un viaje | Ingesta por lotes desde la app |

---

### 1.1 Relaciones y propiedad del dato

| Relación | Cardinalidad | Regla |
| :-- | :-- | :-- |
| `Destination` → `Trip` | 1:N | El ID enlaza catálogo y viajes. No se elimina físicamente un destino referenciado. |
| `Trip` → `Location` | 1:N | Cada punto pertenece exactamente a un viaje; no existe ubicación huérfana. |
| `User` → `Destination.createdBy` | 1:N | Auditoría de quién creó el destino; puede ser null sólo para seed/migración inicial. |
| `User` → `Trip.closedBy` | 1:N | Se llena únicamente en cierre web; auto/operador se distinguen por `closureType`. |

**Fuente de lectura:** el catálogo y formularios administrativos leen `Destination`. La operación de geocerca, detalle y reporte de un viaje leen el snapshot guardado en `Trip`. `Location` nunca decide a qué destino pertenece: llega ligada al `tripId` y el viaje aporta su geocerca.

---

## 2. User

| Campo | Tipo | Restricción | Nota |
| :-- | :-- | :-- | :-- |
| `id` | UUID | PK | |
| `email` | String | **Único**, no nulo | Identidad de login |
| `passwordHash` | String | No nulo | **Hash** (bcrypt/argon2), nunca texto plano |
| `name` | String | No nulo | |
| `role` | Enum `Role` | `ADMIN` \| `MONITOR`, default `MONITOR` | RN-08 |
| `isActive` | Boolean | default `true` | **Baja = soft delete** (no se borra físico) |
| `createdById` | UUID? | FK → User | Auditoría (quién lo dio de alta) |
| `createdAt` | DateTime | default now | Auditoría (insumo seniors) |
| `updatedAt` | DateTime | auto | Auditoría |

---

## 3. Destination

| Campo | Tipo | Restricción | Nota |
| :-- | :-- | :-- | :-- |
| `id` | UUID | PK | Lo referencia el dropdown del formulario (RN-09) |
| `name` | String | No nulo | Texto visible en el selector |
| `centerLat` | Float | No nulo | Centro de la geocerca |
| `centerLng` | Float | No nulo | |
| `radiusMeters` | Int | No nulo, 100–700 | Radio de llegada (editable, RN-03/RN-21) |
| `isActive` | Boolean | default `true` | Soft delete; un destino inactivo no aparece en el dropdown pero los viajes históricos lo conservan |
| `createdById` | UUID? | FK → User | Auditoría |
| `createdAt` / `updatedAt` | DateTime | | Auditoría |

> **Geocerca = haversine en el service** (ADR-012). La BD solo guarda centro+radio; **no** usa PostGIS.

---

## 4. Trip — corazón del modelo (mapea a las 13 columnas)

| Campo | Tipo | Restricción | Col. reporte |
| :-- | :-- | :-- | :-- |
| `id` | UUID | PK | **1. ID de Viaje** |
| `providerNumber` | **String** | No nulo, `^[0-9]+$` | **2. Núm. de Proveedor** |
| `providerName` | String | No nulo | **3. Nombre de Proveedor** |
| `folio` | **String** | No nulo, `^[0-9]+$` | **4. Folio/Remito** |
| `frontPlate` | String | No nulo, regex placa MX | **5. Placa Delantera** |
| `rearPlate` | String? | Opcional, regex placa MX si viene | **6. Placa Trasera** |
| `destinationId` | UUID | FK → Destination | Relación con el catálogo y filtro estable |
| `destinationLat` | Float | Snapshot inmutable al iniciar | Centro usado por app y backend para este viaje |
| `destinationLng` | Float | Snapshot inmutable al iniciar | Centro usado por app y backend para este viaje |
| `destinationRadiusMeters` | Int | Snapshot inmutable al iniciar, 100–700 | Radio usado para el cierre de este viaje |
| `startedAt` | DateTime | default now | **8. Fecha/Hora Inicio** |
| `endedAt` | DateTime? | Se llena 1 sola vez al cerrar | **9. Fecha/Hora Fin** |
| *(calculado)* | — | `endedAt − startedAt` formato HH:MM | **10. Duración Total** — **NO se almacena**, se deriva (RN-05) |
| `status` | Enum `TripStatus` | `EN_RUTA` \| `CONCLUIDO`, default `EN_RUTA` | **11. Estatus** |
| `closureType` | Enum `ClosureType`? | null mientras En ruta | **12. Tipo de Cierre** |
| `observations` | String? (text) | Obligatorio **solo si** cierre manual (regla en service) | **13. Observaciones** |
| `endLat` / `endLng` | Float? | Snapshot del último punto guardado al cerrar (manual operador/admin o automático por geocerca); null solo si el viaje nunca reportó un punto | "Punto de cierre" del viaje (auditoría) |
| `photoPath` | String | No nulo | Foto de carga (ruta del archivo en disco; el binario NO va en BD) |
| `closedById` | UUID? | FK → User | Quién forzó el cierre (null en auto y en cierre por operador) |
| `closeRequestId` | UUID? | Único | Idempotencia del cierre manual móvil; null para auto/admin |
| `deviceId` | String | No nulo | Identidad del dispositivo (RN-11, S-05) |
| `clientRequestId` | UUID | **Único**, no nulo | Idempotencia del inicio (RN-15); permite recuperar la misma respuesta lógica |
| `tripTokenHash` | String | **Único** | **Hash** del tripToken (ADR-007 #8); lookup de ingesta por aquí |
| `lastLocationAt` | DateTime? | | Para rate-limit de ingesta (insumo seniors) |
| `createdAt` / `updatedAt` | DateTime | | Auditoría |

> **Decisión `providerNumber`/`folio` como String, no Int:** son **identificadores**, no cantidades (no se suman ni promedian) y pueden traer **ceros a la izquierda** que un entero perdería. La validación "solo dígitos" vive en el DTO, no en el tipo de columna.
> **`closedById` solo en cierre admin:** en cierre automático no hay actor humano; en cierre por operador el actor es el dispositivo (no un User) → queda null y el `closureType` indica el origen.
> **ID vs snapshot:** `destinationId` responde “qué destino del catálogo se eligió” y permite leer su nombre actual; el snapshot responde “qué geocerca gobernaba cuando arrancó este viaje”. Sólo se duplican centro/radio, porque son necesarios para validar el cierre sin reconfigurar viajes activos.

---

## 5. Location — puntos de la ruta

| Campo | Tipo | Restricción | Nota |
| :-- | :-- | :-- | :-- |
| `id` | Int | PK autoincrement | Volumen bajo → Int basta (evita el dolor de serializar BigInt en JSON) |
| `tripId` | UUID | FK → Trip, **onDelete: Cascade** | |
| `lat` | Float | Validado en rango + bbox MX | No se rechaza por "fuera de geocerca" (la ruta vive fuera) |
| `lng` | Float | idem | |
| `recordedAt` | DateTime | **No futuro** (validación) | Timestamp de captura en el dispositivo |
| `accuracyMeters` | Float | > 0 | Precisión reportada por Android; determina elegibilidad para geocerca |
| `receivedAt` | DateTime | default now | Timestamp de recepción en el server |
| `batchId` | UUID | | **Idempotencia de lote** (ADR-007 #9): si ya hay puntos con este `(tripId, batchId)`, el lote se ignora |
| `createdAt` | DateTime | default now | |

---

## 6. Enums

```
Role        = { ADMIN, MONITOR }
TripStatus  = { EN_RUTA, CONCLUIDO }
ClosureType = { AUTO_GEOFENCE, MANUAL_OPERATOR, MANUAL_ADMIN }
```

> Los valores de `Estatus` y `Tipo de Cierre` del reporte (texto en español del doc §6) se **mapean desde estos enums en el exportador**, no se guardan como texto libre (RN-06).

---

## 7. Índices (y por qué)

| Tabla | Índice | Para qué |
| :-- | :-- | :-- |
| User | `email` único | Login |
| Destination | `isActive` | Listar activos para el dropdown |
| Trip | `status` | Consulta de viajes activos (mapa) |
| Trip | `destinationId` | Joins del reporte / por destino |
| Trip | `tripTokenHash` único | Lookup O(1) en cada lote de ingesta |
| Trip | `clientRequestId` único | Reintento seguro de creación y recuperación de la misma credencial derivada |
| Trip | `closeRequestId` único (nullable) | Reintento idempotente del cierre manual offline |
| Trip | **único parcial** `deviceId WHERE status='EN_RUTA'` | **RN-11 a nivel BD**: imposible tener 2 viajes activos por dispositivo |
| Location | `(tripId, recordedAt)` | Pintar la ruta ordenada en el mapa |
| Location | **único** `(tripId, batchId, recordedAt)` | Evita duplicar puntos al repetir/concurrir el mismo lote |

> **Índice único parcial:** Prisma no lo expresa en el schema → se crea con **SQL en la migración**:
> `CREATE UNIQUE INDEX uniq_active_trip_per_device ON "Trip"("deviceId") WHERE status = 'EN_RUTA';`
> Es defensa en profundidad: aunque el service falle, la BD garantiza la invariante.
>
> **Constraint de radio:** añadir en migración `CHECK ("radiusMeters" BETWEEN 100 AND 700)`; DTO/OpenAPI/UI aplican el mismo rango.

---

## 8. Datos sensibles y seguridad en reposo

- **`passwordHash`** y **`tripTokenHash`** → siempre **hasheados**, jamás texto plano. El token móvil en claro solo existe en tránsito (HTTPS) y en el dispositivo.
- **`Location`** = datos de **geolocalización** (sensibles). Mitigación de privacidad: el sistema **NO guarda identidad personal del chofer** (sin login, sin teléfono, sin nombre del operador) → los puntos se ligan a un `deviceId` anónimo y a un viaje, no a una persona.
- **`photoPath`**: el binario vive en **disco/volumen** del backend (MVP), no en la BD. Validar tipo/tamaño al subir (jpg/png, 1 archivo).
- Secreto JWT y cadena de conexión → `.env` **fuera del repo**.

---

## 9. Borrado y retención

| Entidad | Política | Razón |
| :-- | :-- | :-- |
| User | **Soft delete** (`isActive=false`) | Los viajes referencian al que los cerró → no romper histórico/auditoría |
| Destination | **Soft delete** (`isActive=false`) | Los viajes históricos conservan su `destinationId` |
| Trip | **Nunca se borra** | Es el registro auditable del flete |
| Location | Cascade al borrar su Trip (no ocurre en MVP) | Poda de puntos antiguos = post-MVP |

---

## 10. Borrador de `schema.prisma` (se genera desde §2–§7)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role        { ADMIN  MONITOR }
enum TripStatus  { EN_RUTA  CONCLUIDO }
enum ClosureType { AUTO_GEOFENCE  MANUAL_OPERATOR  MANUAL_ADMIN }

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String
  role         Role     @default(MONITOR)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  createdById  String?
  createdBy    User?    @relation("UserCreatedBy", fields: [createdById], references: [id])
  createdUsers User[]   @relation("UserCreatedBy")

  closedTrips         Trip[]        @relation("TripClosedBy")
  createdDestinations Destination[] @relation("DestinationCreatedBy")
}

model Destination {
  id           String   @id @default(uuid())
  name         String
  centerLat    Float
  centerLng    Float
  radiusMeters Int
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  createdById  String?
  createdBy    User?    @relation("DestinationCreatedBy", fields: [createdById], references: [id])

  trips        Trip[]

  @@index([isActive])
}

model Trip {
  id             String       @id @default(uuid())
  providerNumber String
  providerName   String
  folio          String
  frontPlate     String
  rearPlate      String?
  destinationId  String
  destination    Destination  @relation(fields: [destinationId], references: [id])
  destinationLat          Float
  destinationLng          Float
  destinationRadiusMeters Int
  photoPath      String

  status         TripStatus   @default(EN_RUTA)
  startedAt      DateTime     @default(now())
  endedAt        DateTime?
  closureType    ClosureType?
  observations   String?

  closedById     String?
  closedBy       User?        @relation("TripClosedBy", fields: [closedById], references: [id])
  closeRequestId String?      @unique

  deviceId       String
  clientRequestId String      @unique
  tripTokenHash  String       @unique
  lastLocationAt DateTime?

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  locations      Location[]

  @@index([status])
  @@index([destinationId])
  // Índice único parcial RN-11 → en migración SQL manual (Prisma no lo expresa):
  // CREATE UNIQUE INDEX uniq_active_trip_per_device ON "Trip"("deviceId") WHERE status = 'EN_RUTA';
}

model Location {
  id         Int      @id @default(autoincrement())
  tripId     String
  trip       Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  lat        Float
  lng        Float
  accuracyMeters Float
  recordedAt DateTime
  receivedAt DateTime @default(now())
  batchId    String
  createdAt  DateTime @default(now())

  @@index([tripId, recordedAt])
  @@unique([tripId, batchId, recordedAt])
}
```

---

## 11. Puntos abiertos / a confirmar
- **H2 (externo):** los destinos reales (nombre, coords, radio) los da Julio (tope D3). Hasta entonces, **seed provisional**.
- **Coords como Float vs Decimal:** se usa **Float** (double precision) — la haversine opera en float y ~15 dígitos significativos sobran para precisión sub-métrica. Si la auditoría exige exactitud decimal fija, migrar a `Decimal(10,7)` es trivial.
- **Reabrir viaje cerrado:** fuera de alcance (estado terminal). El estado `En incidencia` (v2.0) añadiría una tabla de transiciones, no rompe este esquema.
