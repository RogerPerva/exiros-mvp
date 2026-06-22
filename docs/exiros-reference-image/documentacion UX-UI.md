# Exiros On-Route Tracker — Documentación de UI/UX

**Versión:** MVP · **Fecha:** Junio 2026
**Entregables:** App móvil Android (operadores) + Portal web (monitoristas / administradores)
**Idioma de interfaz:** Español

---

## 1. Resumen del sistema

Exiros On-Route Tracker es un sistema de rastreo de viajes de transporte compuesto por dos aplicaciones que comparten un mismo lenguaje visual:

| Aplicación | Usuario | Propósito |
|---|---|---|
| **App móvil Android** | Operador de camión | Registrar el inicio de un viaje, mantener el rastreo activo en segundo plano y cerrar el viaje. Interacción mínima, uso con prisa y a la intemperie. |
| **Portal web** | Monitorista / Administrador | Supervisar viajes en tiempo real sobre un mapa, consultar el historial, gestionar destinos/geocercas y administrar usuarios. |

**Principio de diseño rector:** sobrio, funcional, corporativo y operativo. Alto contraste, legibilidad, áreas táctiles grandes en móvil, formularios simples y cero adornos decorativos. No se siente como app de consumo ni como dashboard analítico.

---

## 2. Identidad visual

### 2.1 Paleta de colores

| Rol | Color | HEX |
|---|---|---|
| Azul primario Exiros | 🔵 | `#0D479C` |
| Azul marino (sidebar / superficies oscuras) | 🔵 | `#0B1F3D` |
| Gris grafito | ⬛ | `#464747` |
| Azul claro secundario | 🔵 | `#94ACD1` |
| Gris claro / bordes | ⬜ | `#D4D8E0` |
| Fondo general | ⬜ | `#F8FAFC` |
| Superficies (tarjetas, tablas) | ⬜ | `#FFFFFF` |
| Texto principal | ⬛ | `#111827` |
| Texto secundario | ⬛ | `#7A828F` |
| Éxito | 🟢 | `#16A34A` |
| Advertencia | 🟠 | `#D97706` |
| Error | 🔴 | `#DC2626` |

### 2.2 Colores semánticos de estado (monitoreo)

| Estado del viaje | Color | HEX |
|---|---|---|
| En ruta | 🟢 | `#16A34A` |
| Detenido | 🟠 | `#D97706` |
| Sin actualización (desconectado +1 h) | 🔴 | `#DC2626` |
| Cerca de destino | 🔵 | `#0D479C` |
| Contingencia | 🔴 oscuro | `#7F1D1D` |

### 2.3 Tipografía

| Plataforma | Fuente | Uso |
|---|---|---|
| App móvil (Android) | **Roboto** (400 / 500 / 700) | Toda la interfaz |
| Portal web | **Inter** (400 / 500 / 600 / 700) | Toda la interfaz |
| Datos técnicos (placas, folios, coordenadas) | **JetBrains Mono / Roboto Mono** | Valores monoespaciados para lectura rápida |

### 2.4 Estilo de componentes

- **Esquinas suaves:** radios de 9–14 px en botones y tarjetas; 10–12 px en inputs.
- **Botones:** primario azul sólido (`#0D479C`); secundario con borde; destructivo en rojo (`#DC2626`). En móvil, altura 56–58 px (área táctil amplia).
- **Badges de estado:** pastilla redondeada con punto de color + etiqueta.
- **Sombras:** sutiles y solo en elementos flotantes (tarjetas sobre mapa, modales, paneles laterales).
- **Iconografía:** Material Symbols Outlined, peso regular.
- **Sin** ilustraciones decorativas, gradientes llamativos, emojis ni modo oscuro.

---

## 3. App móvil Android (Operador)

Abre directo en el flujo de viaje. **Sin login, sin menú, sin navegación compleja.** El operador registra el viaje y se olvida. Validación inline en español. Estados transversales: carga, vacío, sin red.

Presentada dentro de un marco de teléfono Android con barra de estado simulada.

### M1 · Permisos
- **Objetivo:** solicitar permisos en runtime antes de usar la app.
- **Permisos explicados:** ubicación precisa, ubicación en segundo plano, notificaciones (Android 13+) y actividad física.
- Cada permiso muestra ícono + nombre + breve justificación de por qué se necesita.
- Mensaje de tranquilidad sobre el consumo de batería.
- **Acciones:** botón primario "Permitir y continuar" + opción secundaria "Ahora no".
- **Estado de error:** contemplado para permiso denegado.

### M2 · Formulario de inicio de viaje (pantalla principal)
- La app **abre directo aquí**.
- Encabezado con marca Exiros + "Iniciar viaje".
- **Campos, en orden:**
    1. Núm. de Proveedor
    2. Nombre de Proveedor
    3. Folio / Remito
    4. Placa Delantera
    5. Placa Trasera *(opcional)*
    6. Foto de la Carga *(obligatoria)* — muestra confirmación visual al adjuntar
    7. Destino *(dropdown)*
- **Botón primario grande:** "Iniciar viaje".
- **Validación inline** en español.
- **Estados contemplados:** vacío (sin destinos), sin red, carga al enviar.

### M3 · Viaje en curso
- Confirma que el viaje está **activo y rastreando** (pastilla verde "En ruta · rastreando").
- **Información mínima:** destino, hora de inicio, estado de sincronización.
- Aviso de modo ahorro de batería.
- **Botón secundario:** "Finalizar viaje".
- **Estado sin red** persistente contemplado.

### M4 · Finalizar viaje (hoja inferior / bottom sheet)
- Se abre sobre la pantalla de viaje en curso.
- **Campo obligatorio:** Observaciones (textarea).
- **Botones:** "Confirmar cierre" y "Cancelar".
- **Regla:** "Confirmar cierre" permanece **deshabilitado** (gris) hasta que haya texto en Observaciones; al escribir, se activa en rojo.
- **Sin foto** en el cierre.

### M5 · Viaje concluido
- Mensaje de confirmación con check grande.
- Indica si el cierre fue **automático por geocerca** o **manual por operador**.
- Resumen: tipo de cierre, observaciones, duración.
- **Botón:** "Iniciar nuevo viaje" (regresa a M2).

---

## 4. Portal web (Monitorista / Administrador)

Layout con **sidebar** azul marino fijo + header con nombre y rol del usuario. Navegación entre secciones sin recargar. Estilo desktop limpio y corporativo.

**Sidebar:** Mapa · Viajes · Destinos · Usuarios · Cerrar sesión.
*(El item "Usuarios" es exclusivo de Administrador.)*

### W0 · Login
- Pantalla completa dividida: formulario a la izquierda, panel de marca con fotografía corporativa a la derecha.
- **Campos:** correo electrónico y contraseña (con íconos).
- **Botón:** "Entrar".
- Enlace "¿Olvidaste tu contraseña?" → abre **modal pequeño**: "Contacta con tu administrador para restablecer tu contraseña".
- Manejo de error genérico contemplado.

### W1 · Mapa de tránsito (Monitoreo en tiempo real) — pantalla inicial
Pantalla principal tras login. Rediseñada para escalar a ~200 transportistas en 4 estados sin saturarse.

- **Mapa Leaflet + OpenStreetMap** (capa adicional satélite Esri).
- **Agrupamiento en clusters:** al abrir, el mapa muestra el país con burbujas agrupadas por zona, no 200 puntos sueltos. El color del cluster refleja el **peor estado** que contiene:
    - 🟢 Verde: todos en ruta.
    - 🟠 Amarillo: algún vehículo detenido.
    - 🔴 Rojo: algún vehículo sin reportar por más de 1 hora.
- Al hacer **zoom**, los clusters se separan en chips individuales (ícono de camión + ID), coloreados por estado.
- **Carga por viewport:** la lista y tabla solo consideran los vehículos dentro del área visible (rendimiento).
- **Tarjetas KPI** (clicables): En ruta · Detenidos · Sin actualización · Cerca de destino · Concluidos hoy. Al hacer clic, despliegan la lista de vehículos de ese estado, cada uno con botón **"Mostrar en mapa"**.
- **Barra de filtros:** búsqueda (placa / folio / proveedor), estado, destino, proveedor + botón **"Limpiar filtros"**. Los filtros se **guardan en el navegador (localStorage)** para no reconfigurarlos cada sesión.
- **Leyenda** flotante con los 5 estados.
- **Control de capas:** Mapa / Satélite / Geocercas / Clusters.
- **Tarjeta de detalle** al hacer clic en un camión: datos del viaje + botones "Ver detalle del viaje" y "Forzar cierre manual".
- **Tabla "Viajes visibles en el mapa":** sincronizada con filtros y área visible (muestra X de N, paginada por rendimiento).
- "Última actualización" con hora; botón de refrescar.
- **Estados contemplados:** vacío ("Sin viajes en el área visible") y error con reintento.

### W2 · Lista de viajes + exportación
- **Tabla** con columnas: Folio, Proveedor, Destino, Placa, Estado, Inicio, acción de ver detalle.
- **Filtros:** búsqueda, estado, rango de fechas, destino.
- **Botón "Exportar a Excel".**
- **Paginación** inferior.
- Badges de estado con color (En ruta / Concluido / Retrasado).
- **Estado vacío** contemplado.

### W3 · Detalle de viaje
- Migas de pan (Viajes › Folio).
- **Todos los campos del viaje:** núm. y nombre de proveedor, folio/remito, destino, placa delantera y trasera.
- **Bloque de cierre:** tipo de cierre (geocerca / manual), fin y duración.
- **Observaciones** del cierre.
- **Foto de la carga.**
- **Ruta dibujada en el mapa** como polilínea, con marcadores de inicio (verde) y destino (rojo).
- Si el viaje está **en ruta**, se muestra botón **"Forzar cierre"** → abre **modal con observaciones obligatorias**.
- Si está **concluido**, muestra tipo de cierre, fin y duración.

### W4 · Destinos / Geocercas (CRUD)
- **Solo Administrador** puede crear / editar / dar de baja. *(El monitorista solo consulta — validación en backend; ver §6.)*
- **Tabla** con columnas: Nombre, Centro (coordenadas), Radio, **Ubicación (enlace a Google Maps)**, Estado, Acciones (editar / dar de baja / reactivar).
- El enlace de **Maps** abre la ubicación del destino en una pestaña nueva.
- **Botón "Nuevo destino"** → abre **panel lateral** con:
    - Nombre.
    - **Centro en el mapa interactivo:** se fija haciendo clic en el mapa **o arrastrando el pin**; las coordenadas se actualizan en vivo.
    - **Radio de la geocerca:** valor **entero, máximo 700 m**. Validación inline (campo rojo + mensaje de error + botón Guardar deshabilitado si está fuera de rango).
    - El círculo azul muestra en vivo el área de cierre automático.
- **Estado vacío** contemplado.

### W5 · Gestión de usuarios
- **Solo Administrador.** El monitorista no ve esta sección.
- **Tabla** con columnas: Nombre, Correo, Rol, Estado, Acciones.
- **Roles:** Super administrador, Administrador, Monitorista (badges diferenciados).
- **Botón "Nuevo usuario"** → abre **panel lateral** con: nombre completo, correo, rol y contraseña inicial.
- **Dar de baja** (soft delete) → abre **modal de confirmación** ("¿Estás seguro de eliminar a [nombre]?").
- **Super administrador protegido:** no puede darse de baja (acción mostrada como candado deshabilitado). Siempre debe existir al menos uno.
- **Editar** disponible por fila.

---

## 5. Estados transversales

Contemplados por pantalla según aplique:

| Estado | Dónde aplica |
|---|---|
| **Carga** | Envío de formularios (móvil), carga de mapa y tablas (web) |
| **Vacío** | Sin destinos (móvil), sin viajes en área/lista, sin destinos (web) |
| **Error** | Mapa con reintento, login genérico, permisos denegados |
| **Sin red** | App móvil (formulario y viaje en curso, persistente) |
| **Validación inline** | Todos los formularios, en español (radio de geocerca, observaciones obligatorias, etc.) |

---

## 6. Reglas de negocio y notas para desarrollo (backend)

Estas reglas se definieron durante el diseño y **deben validarse del lado del servidor**, no solo en la interfaz:

1. **Acceso a "Usuarios" y "Destinos":** exclusivo de rol Administrador. No basta con ocultar el item del sidebar — validar el permiso en el backend.
2. **Super administrador:** debe existir siempre al menos uno. No puede ser dado de baja ni cambiar de rol; el backend debe bloquear y devolver error si se intenta.
3. **Baja de usuarios y destinos:** soft delete (no se elimina físicamente).
4. **Cálculo de estados de viaje** (recomendación de telemetría, pendiente de afinar con pruebas de campo):
    - Definir umbrales: ¿cuántos minutos sin avanzar = "Detenido"? ¿+1 h sin reporte = "Sin actualización / desconectado"?
    - **Detección de permanencia (dwell) + actividad:** usar un radio de permanencia (mini-geocerca dinámica de ~50–80 m) combinado con la *Activity Recognition API* de Android (en vehículo / a pie / quieto) para no registrar como "avance del camión" cuando el operador se baja a pie (tienda, baño). Evita ruido en la ruta y ahorra batería.
    - Considerar el "salto" del GPS urbano (20–50 m) al definir el radio, y una regla de "última ubicación válida" en zonas sin señal (túneles, estacionamientos techados).
5. **Geocerca de destino:** radio entero entre 1 y 700 m.
6. **Cierre de viaje:** puede ser automático (al entrar a la geocerca del destino) o manual (por operador en la app, o forzado por monitorista/admin desde el portal con observaciones obligatorias).
7. **Tiles de mapa:** el servidor público de OpenStreetMap sirve para MVP/demo, pero **producción requiere un proveedor de tiles** (MapTiler, Mapbox, Stadia, etc.) por la política de uso justo.

---

## 7. Alcance del MVP

**Incluido:** lo descrito en este documento.

**Explícitamente fuera de alcance** (no diseñado): login/registro/perfil en móvil, menús o navegación compleja en móvil, onboarding/tutoriales/splash animados, modo oscuro/temas, notificaciones push o centro de notificaciones, dashboards analíticos/gráficas/KPIs decorativos/mapas de calor, chat/mensajería, configuraciones avanzadas, pantallas iOS, foto al cierre del viaje.

---

## 8. Naturaleza de los entregables

Los archivos `.dc.html` son **prototipos de alta fidelidad funcionales**: se abren en cualquier navegador, son navegables e interactivos (mapas, filtros, modales, validaciones) y sirven como **especificación visual e interactiva** para el equipo de desarrollo. Los datos mostrados (camiones, usuarios, viajes) son **simulados** para demostrar comportamiento y densidad; en producción provienen del backend. No constituyen el código de producción final.
