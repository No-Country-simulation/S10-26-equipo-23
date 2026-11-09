# Endpoints del MVP

| #   | Método y ruta                          | Para qué                                          | Pantalla | Módulo      |
| --- | -------------------------------------- | ------------------------------------------------- | -------- | ----------- |
| 1   | `GET /api/paises`                      | Los 19 países, para el autocompletado             | 1        | `catalogos` |
| 2   | `GET /api/paises/:id/ciudades?nombre=` | Autocompletado de ciudades de un país             | 1        | `catalogos` |
| 3   | `POST /api/paises/:id/ciudades`        | Agregar una ciudad que no existe                  | 1        | `catalogos` |
| 4   | `POST /api/busquedas`                  | Crear una búsqueda                                | 1        | `busquedas` |
| 5   | `GET /api/busquedas`                   | Lista de búsquedas                                | 1        | `busquedas` |
| 6   | `GET /api/busquedas/:id`               | Detalle de una búsqueda                           | 2        | `busquedas` |
| 7   | `POST /api/busquedas/:id/cancelar`     | Cancelar una búsqueda                             | 1 y 2    | `scraper`   |
| 8   | `GET /api/busquedas/:id/progreso`      | Avance en vivo (SSE)                              | 1 y 2    | `scraper`   |
| 9   | `GET /api/busquedas/:id/negocios`      | Negocios de una búsqueda, con su lead y contactos | 2        | `negocios`  |
| 10  | `GET /api/negocios/:id`                | Detalle de un negocio                             | 3        | `negocios`  |
| 11  | `DELETE /api/busquedas/:id`            | Eliminar una búsqueda y todo lo que encontró      | 1        | `scraper`   |

Sin endpoint:

- Exportar a CSV: lo genera el frontend con las filas del endpoint 9 (guía-api, reglas 35–36).
- Cambiar el estado de una búsqueda: solo lo cambia `ScraperService` (guía-scraper, regla 20).
- Volver a ejecutar una búsqueda: el frontend rellena el formulario con los datos del endpoint 6 y llama al endpoint 4.
- Agregar países: no se puede. Los 19 son fijos, porque el scraper solo lee bien los teléfonos de los países de su `CODIGO_PAIS` (guía-datos, regla 25).
- IA (problema detectado, correo en frío): depende de cómo lo entregue el equipo de IA. Hasta entonces, `problema` vale `null` (endpoints 9 y 10).

## Reglas comunes

- Todo `:id` es un UUID validado con `z.uuid()`. Si no es un UUID, responde 400 `VALIDACION`.
- Todo error tiene la forma `{ status, code, message, fieldErrors? }` (guía-api, regla 18).
- Los campos sin valor van como `null`; nunca se omiten.
- Fechas: `DATE` → `"YYYY-MM-DD"`; `TIMESTAMPTZ` → ISO 8601 (`"2026-11-02T14:00:00.000Z"`). `NUMERIC` → `number`.
- Una lista vacía responde 200 con `[]`.

### Errores propios

| `code`                   | Estado | Cuándo                                                                             | Endpoints      |
| ------------------------ | ------ | ---------------------------------------------------------------------------------- | -------------- |
| `PAIS_NO_ENCONTRADO`     | 404    | El país no existe                                                                  | 2, 3           |
| `BUSQUEDA_NO_ENCONTRADA` | 404    | La búsqueda no existe                                                              | 6, 7, 8, 9, 11 |
| `NEGOCIO_NO_ENCONTRADO`  | 404    | El negocio no existe                                                               | 10             |
| `CIUDAD_EXISTENTE`       | 409    | Ya hay una ciudad con ese nombre en el país, aunque difiera en tildes o mayúsculas | 3              |
| `BUSQUEDA_EN_CURSO`      | 409    | Se intenta crear una búsqueda mientras otra está en curso                          | 4              |
| `BUSQUEDA_FINALIZADA`    | 409    | Se intenta cancelar una búsqueda en un estado final                                | 7              |

## Objetos que se repiten

Los nombres de las clases DTO son los que aparecen en el OpenAPI y en `api.gen.ts` del frontend.

**`PaisDto`**
| Campo | Tipo |
|---|---|
| `id` | uuid |
| `nombre` | string (con tildes, igual que `CODIGO_PAIS` del scraper) |

**`CiudadDto`**
| Campo | Tipo |
|---|---|
| `id` | uuid |
| `pais_id` | uuid |
| `nombre` | string (con tildes) |

**`CiudadConPaisDto`**: `CiudadDto` sin `pais_id`, más `pais: PaisDto`.

**`ContactoDto`**
| Campo | Tipo | Valores |
|---|---|---|
| `id` | uuid | |
| `tipo` | enum `TipoContacto` | `telefono` \| `email` \| `web` \| `facebook` \| `instagram` \| `tiktok` \| `x` \| `youtube` \| `linkedin` |
| `subtipo` | string \| null | teléfono: `celular` \| `fijo` \| `celular_o_fijo`; web: `propia` \| `plataforma` \| `link_en_bio` \| `red_social` \| `whatsapp`; resto: `null`. Los celulares de la web llegan con `null` (pendiente) |
| `valor` | string | |
| `fuente` | enum `FuenteContacto` | `google_maps` \| `web_negocio` |

Orden: por `tipo` en el orden de la tabla y, dentro de cada tipo, primero `google_maps`. (O)

## 1. `GET /api/paises`

Lista de los 19 países. Son pocos: el frontend los carga una vez y filtra el autocompletado en el navegador.

- Parámetros: ninguno.
- Respuesta 200: `PaisDto[]`, ordenada por `nombre`.

```json
[
  { "id": "3f1c…", "nombre": "Argentina" },
  { "id": "8a2d…", "nombre": "Bolivia" }
]
```

## 2. `GET /api/paises/:id/ciudades?nombre=`

Autocompletado de ciudades de un país.

- Ruta: `id` = id del país.
- Query:
  | Parámetro | Tipo | Obligatorio | Regla |
  |---|---|---|---|
  | `nombre` | string | no | Se recorta (`trim`); hasta 100 caracteres (O: el máximo). Sin texto, devuelve las primeras ciudades del país, para poder elegir sin escribir |
- Búsqueda: empieza con el texto, ignorando tildes y mayúsculas (`unaccent(nombre) ILIKE unaccent(texto) || '%'`), con `%`, `_` y `\` escapados (guía-datos, reglas 30–32).
- Respuesta 200: `CiudadDto[]`, ordenada por `nombre`, como máximo 20 (O: el límite). Si nada coincide: `[]`.
- Errores: 400 si `nombre` supera el máximo; 404 `PAIS_NO_ENCONTRADO`.

```
GET /api/paises/<id de Colombia>/ciudades?nombre=bogo
→ 200 [{ "id": "b7e0…", "pais_id": "…", "nombre": "Bogotá" }]

GET /api/paises/<id de Colombia>/ciudades
→ 200 las primeras 20 ciudades de Colombia, por nombre
```

## 3. `POST /api/paises/:id/ciudades`

Agrega una ciudad que no está en la lista precargada.

- Ruta: `id` = id del país.
- Cuerpo (`createCiudadSchema`, `z.strictObject`):
  | Campo | Tipo | Obligatorio | Regla |
  |---|---|---|---|
  | `nombre` | string | sí | Se recorta y se normaliza a NFC; de 1 a 100 caracteres (O: el máximo) |
- Antes de insertar, el service busca en ese país una ciudad con el mismo nombre ignorando tildes y mayúsculas (`unaccent(lower(nombre)) = unaccent(lower(texto))`). Si existe, responde 409 y no inserta.
- Respuesta 201: `CiudadDto` creada.
- Errores:
  - 400 `VALIDACION` con `fieldErrors.nombre`;
  - 404 `PAIS_NO_ENCONTRADO`;
  - 409 `CIUDAD_EXISTENTE`, con el nombre existente en el `message`: "Ya existe la ciudad «Bogotá». Elígela de la lista." El cuerpo no lleva la ciudad: el formato de error no tiene ese campo (guía-api, regla 18).

```
POST /api/paises/<id de Colombia>/ciudades   { "nombre": "Villa de Leyva" }
→ 201 { "id": "c41a…", "pais_id": "…", "nombre": "Villa de Leyva" }

POST /api/paises/<id de Colombia>/ciudades   { "nombre": "bogota" }
→ 409 { "status": 409, "code": "CIUDAD_EXISTENTE", "message": "Ya existe la ciudad «Bogotá». Elígela de la lista." }
```

## 4. `POST /api/busquedas`

Crea una búsqueda y lanza el scraper. Queda `en_curso`. Solo puede haber una a la vez (guía-scraper, regla 14).

- Cuerpo (`createBusquedaSchema`, `z.strictObject`):
  | Campo | Tipo | Obligatorio | Regla |
  |---|---|---|---|
  | `rubro` | string | sí | Se recorta y se normaliza a NFC (guía-scraper, regla 10); de 1 a 100 caracteres (O: el máximo) |
  | `ubicaciones` | `{ ciudad_id: uuid }[]` | sí | Al menos 1; sin `ciudad_id` repetidos; sin máximo (guía-scraper, regla 17) |
  | `rating_minimo` | number \| null | no | De 1 a 5, con un decimal como máximo |
  | `rating_maximo` | number \| null | no | De 1 a 5, con un decimal como máximo |
  | `min_resenas` | integer \| null | no | ≥ 0. El scraper lo usa como "más de", no "como mínimo" |

  Cualquier otro campo (p. ej. `configuracion_extra` o `estado`) responde 400.

- Filtros vacíos: si un filtro se omite o es `null`, se guarda `NULL` y el scraper y el importador usan `FILTROS_POR_DEFECTO` (1,5 / 3,5 / 10; guía-scraper, regla 11).
- `rating_minimo` ≤ `rating_maximo` se comprueba con los valores efectivos, es decir, después de reemplazar los vacíos por los valores por defecto. Ejemplo: `rating_minimo: 4` sin `rating_maximo` falla, porque el máximo efectivo es 3,5. Error en `fieldErrors.rating_minimo`.
- El service comprueba que existan todas las ciudades. Si una no existe, responde 400 con `fieldErrors["ubicaciones.<índice>.ciudad_id"]`.
- Si ya hay una búsqueda `en_curso`, responde 409 y no guarda nada. El frontend también lo impide (deshabilita "Nueva búsqueda" y "Volver a ejecutar"), pero la regla la hace cumplir el backend.
- Guarda la búsqueda y sus ubicaciones en una transacción, con `estado = 'en_curso'`, y llama a `ScraperService.lanzar()`.
- Respuesta 201: `BusquedaDto` (endpoint 6), con `resultados: null`.
- Errores: 400 `VALIDACION`; 409 `BUSQUEDA_EN_CURSO`: "Ya hay una búsqueda en curso. Espera a que termine o cancélala."

```json
POST /api/busquedas
{
  "rubro": "hoteles",
  "ubicaciones": [{ "ciudad_id": "b7e0…" }, { "ciudad_id": "c41a…" }],
  "rating_minimo": 1.5,
  "rating_maximo": 3.5,
  "min_resenas": 10
}
```

## 5. `GET /api/busquedas`

Lista de todas las búsquedas para la pantalla 1. Se devuelve completa, sin paginar (guía-api, regla 24).

- Parámetros: ninguno.
- Respuesta 200: `BusquedaDto[]`, ordenada por `creada_en` descendente.

## 6. `GET /api/busquedas/:id`

Detalle de una búsqueda para la pantalla 2.

- Ruta: `id` = id de la búsqueda.
- Respuesta 200: `BusquedaDto`.
- Errores: 404 `BUSQUEDA_NO_ENCONTRADA`.

**`BusquedaDto`**
| Campo | Tipo | Nota |
|---|---|---|
| `id` | uuid | |
| `rubro` | string | |
| `rating_minimo` | number \| null | `null` = se usó el valor por defecto (1,5) |
| `rating_maximo` | number \| null | `null` = 3,5 |
| `min_resenas` | integer \| null | `null` = 10 |
| `estado` | enum `EstadoBusqueda` | `en_curso` \| `completada` \| `fallida` \| `cancelada` |
| `creada_en` | date-time | |
| `finalizada_en` | date-time \| null | Se llena al llegar a un estado final |
| `error` | string \| null | Motivo si está `fallida` |
| `ubicaciones` | `UbicacionDto[]` | Ordenadas por país y ciudad (O) |
| `resultados` | `ResultadosDto` \| null | `null` mientras no esté `completada` |

**`UbicacionDto`**: `id` (uuid, id de `busqueda_ubicaciones`) y `ciudad: CiudadConPaisDto`.

**`ResultadosDto`**: `cantidad_negocios`, `cantidad_leads`, `cantidad_resenas`, `cantidad_resenas_negativas` (integers) y `capturado_en` (date-time).

```json
{
  "id": "5d9e…",
  "rubro": "hoteles",
  "rating_minimo": 1.5,
  "rating_maximo": 3.5,
  "min_resenas": 10,
  "estado": "completada",
  "creada_en": "2026-11-02T14:00:00.000Z",
  "finalizada_en": "2026-11-02T19:30:00.000Z",
  "error": null,
  "ubicaciones": [
    {
      "id": "a1…",
      "ciudad": {
        "id": "b7e0…",
        "nombre": "Bogotá",
        "pais": { "id": "…", "nombre": "Colombia" }
      }
    }
  ],
  "resultados": {
    "cantidad_negocios": 112,
    "cantidad_leads": 37,
    "cantidad_resenas": 180,
    "cantidad_resenas_negativas": 64,
    "capturado_en": "2026-11-02T19:30:00.000Z"
  }
}
```

## 7. `POST /api/busquedas/:id/cancelar`

Definido en guía-scraper, regla 25.

- Ruta: `id` = id de la búsqueda. Sin cuerpo.
- Si está `en_curso`: detiene el scraper si está corriendo y la pasa a `cancelada`, sin importar nada.
- Respuesta 200: `BusquedaDto` con `estado: "cancelada"`.
- Errores: 404 `BUSQUEDA_NO_ENCONTRADA`; 409 `BUSQUEDA_FINALIZADA` si ya está `completada`, `fallida` o `cancelada`.

## 8. `GET /api/busquedas/:id/progreso` (SSE)

Definido en guía-scraper, reglas 26–28. SSE (Server-Sent Events): una conexión abierta por la que el backend envía mensajes al navegador cuando hay cambios.

- Ruta: `id` = id de la búsqueda.
- Respuesta: `text/event-stream`. Cada evento lleva en `data` un `ProgresoBusquedaEventoDto`:
  | Campo | Tipo | Nota |
  |---|---|---|
  | `estado` | enum `EstadoBusqueda` | |
  | `progreso` | `{ sesion: integer, fase: 1 \| 2, hechas: integer, total: integer }` \| null | `null` si está en estado final o si el backend se reinició |
- Primero envía el estado actual, luego un evento por cada cambio, y cierra al llegar a un estado final. Si la búsqueda ya terminó, envía un solo evento y cierra.
- Errores: 404 `BUSQUEDA_NO_ENCONTRADA`, antes de abrir la conexión.
- Frontend: `new EventSource('/api/busquedas/<id>/progreso')`. Llama a `close()` al recibir un estado final, porque `EventSource` se reconecta solo cuando el servidor cierra la conexión.

```
data: {"estado":"en_curso","progreso":{"sesion":1,"fase":1,"hechas":3,"total":8}}
data: {"estado":"en_curso","progreso":{"sesion":1,"fase":2,"hechas":12,"total":40}}
data: {"estado":"completada","progreso":null}
```

## 9. `GET /api/busquedas/:id/negocios`

Todos los negocios de una búsqueda (cumplan o no los filtros) para la tabla de la pantalla 2. Los que cumplen tienen `lead`; la pestaña de leads filtra `lead !== null`. El frontend filtra, ordena, pagina y exporta a CSV (guía-api, reglas 24 y 35).

- Ruta: `id` = id de la búsqueda.
- Respuesta 200: `NegocioFilaDto[]`, ordenada por `rating` ascendente y luego por `nombre` (O). Si la búsqueda no está `completada`: `[]`.
- Errores: 404 `BUSQUEDA_NO_ENCONTRADA`.

**`NegocioFilaDto`**
| Campo | Tipo |
|---|---|
| `id` | uuid |
| `nombre` | string |
| `direccion` | string \| null |
| `rating` | number \| null |
| `n_resenas` | integer \| null |
| `pct_negativas` | number \| null (0,41 = 41 %) |
| `url_google_maps` | string \| null |
| `fecha_extraccion` | date \| null |
| `ciudad` | `CiudadConPaisDto` |
| `lead` | `LeadFilaDto` \| null |
| `contactos` | `ContactoDto[]` |

**`LeadFilaDto`**
| Campo | Tipo | Valores |
|---|---|---|
| `id` | uuid | |
| `prioridad` | enum `PrioridadLead` \| null | `Alta` \| `Media` |
| `motivo_prioridad` | string \| null | |
| `percentil` | number \| null | 0,03 = entre el 3 % peor de su rubro y ciudad |
| `tendencia` | enum `TendenciaLead` \| null | `empeora` \| `estable` \| `mejora` \| `sin historial` |
| `variacion_rating` | number \| null | |
| `problema` | string \| null | El de `negocio_problemas` más reciente (`generado_en`). Hasta que lo defina el equipo de IA, siempre `null` |

```json
[
  {
    "id": "e2f4…",
    "nombre": "Hotel Central",
    "direccion": "Cra. 7 #12-30, Bogotá",
    "rating": 2.4,
    "n_resenas": 87,
    "pct_negativas": 0.41,
    "url_google_maps": "https://www.google.com/maps/place/…",
    "fecha_extraccion": "2026-11-02",
    "ciudad": {
      "id": "b7e0…",
      "nombre": "Bogotá",
      "pais": { "id": "…", "nombre": "Colombia" }
    },
    "lead": {
      "id": "9c1b…",
      "prioridad": "Alta",
      "motivo_prioridad": "…",
      "percentil": 0.03,
      "tendencia": "empeora",
      "variacion_rating": -0.3,
      "problema": null
    },
    "contactos": [
      {
        "id": "…",
        "tipo": "telefono",
        "subtipo": "fijo",
        "valor": "+57 601 555 1234",
        "fuente": "google_maps"
      },
      {
        "id": "…",
        "tipo": "email",
        "subtipo": null,
        "valor": "reservas@hotelcentral.co",
        "fuente": "web_negocio"
      }
    ]
  }
]
```

## 10. `GET /api/negocios/:id`

Detalle de un negocio para la pantalla 3.

- Ruta: `id` = id del negocio (`negocios.id`; un mismo negocio de Google tiene un id distinto en cada búsqueda).
- Respuesta 200: `NegocioDetalleDto`.
- Errores: 404 `NEGOCIO_NO_ENCONTRADO`.

**`NegocioDetalleDto`**: los campos de `NegocioFilaDto` sin `lead`, más:
| Campo | Tipo | Nota |
|---|---|---|
| `google_place_id` | string | |
| `hist_5` … `hist_1` | integer \| null | Cantidad de reseñas de 5 … 1 estrellas |
| `temas` | string \| null | Tal cual lo da Google: `"ruido: 3; chinches: 2"`. El frontend lo separa si lo necesita (O) |
| `primer_avistamiento` | date \| null | |
| `busqueda` | `{ id: uuid, rubro: string }` | Para volver a la pantalla 2 |
| `resenas` | `ResenaDto[]` | Ordenadas por `fecha_aprox` descendente, `null` al final (O) |
| `lead` | `LeadDetalleDto` \| null | |

**`ResenaDto`**: `id` (uuid), `autor` (string \| null), `rating` (integer \| null), `fuente` (string \| null), `texto` (string \| null), `respondida` (boolean \| null), `meses_atras` (integer \| null), `fecha_aprox` (date \| null), `fecha_extraccion` (date \| null).

**`LeadDetalleDto`**: `LeadFilaDto` sin `problema`, más `problemas: ProblemaDto[]`, ordenados por `generado_en` descendente. Hasta que lo defina el equipo de IA, `[]`.

**`ProblemaDto`** (pendiente con el equipo de IA): `id` (uuid), `problema` (string \| null), `justificacion` (string \| null), `generado_en` (date-time \| null).

## 11. `DELETE /api/busquedas/:id`

Elimina una búsqueda en cualquier estado (guía-scraper, regla 25).

- Ruta: `id` = id de la búsqueda. Sin cuerpo.
- Si está `en_curso`, primero detiene el scraper, como al cancelar (guía-scraper, regla 23).
- Borra la fila de `busquedas`. Por los `ON DELETE CASCADE` de `database/schema.sql`, se borran también sus ubicaciones, su resumen, sus negocios, reseñas, contactos, leads y problemas de la IA. No se puede deshacer.
- Los CSV de `scrapping/data/` no se tocan.
- Respuesta 204 sin cuerpo (guía-api, regla 6).
- Errores: 404 `BUSQUEDA_NO_ENCONTRADA`.
