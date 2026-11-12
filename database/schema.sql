-- RepuSense · Diseño de la base de datos (PostgreSQL)
-- La fuente de verdad es el modelo de Prisma (backend/prisma/schema.prisma). Este archivo fue el punto de partida
-- y, cuando exista la base, se regenera desde ella después de cada migración (decisión 2026-10-31).
--
-- Ideas clave:
--   * Todos los id son UUID generados por la base (gen_random_uuid()).
--   * 1 búsqueda = 1 rubro + N ciudades (de uno o varios países). Volver a buscar = nueva fila en busquedas.
--   * Un negocio se guarda una vez por cada búsqueda que lo encuentra.
--     google_place_id identifica al mismo negocio entre búsquedas (historial) y une los CSV del scraper.
--   * Los datos llegan de los CSV del scraper (scrapping/data/) mediante un importador.

-- Catálogos ------------------------------------------------------------------

CREATE TABLE paises (
    id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE
);
COMMENT ON TABLE paises IS 'Los 19 países que soporta el scraper (CODIGO_PAIS), precargados con su nombre exacto.';

CREATE TABLE ciudades (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pais_id UUID   NOT NULL REFERENCES paises (id),
    nombre  TEXT   NOT NULL,
    UNIQUE (pais_id, nombre)
);
COMMENT ON TABLE ciudades IS 'Ciudades de esos 19 países precargadas desde GeoNames (cities1000), una por nombre, más las que agregue el usuario.';

-- Búsquedas ------------------------------------------------------------------

CREATE TABLE busquedas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rubro               TEXT         NOT NULL,
    rating_minimo       NUMERIC(2,1),
    rating_maximo       NUMERIC(2,1),
    min_resenas         INTEGER,
    configuracion_extra TEXT,
    estado              TEXT         NOT NULL,
    creada_en           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    finalizada_en       TIMESTAMPTZ,
    error               TEXT
);
COMMENT ON TABLE busquedas IS 'Cada búsqueda lanzada desde la pantalla 1.';
COMMENT ON COLUMN busquedas.configuracion_extra IS 'Otros parámetros de entrada del scraper.';
COMMENT ON COLUMN busquedas.estado IS 'en_curso | completada | fallida | cancelada';

CREATE TABLE busqueda_resultados (
    id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    busqueda_id                UUID        NOT NULL UNIQUE REFERENCES busquedas (id) ON DELETE CASCADE,
    capturado_en               TIMESTAMPTZ NOT NULL DEFAULT now(),
    cantidad_negocios          INTEGER     NOT NULL DEFAULT 0,
    cantidad_leads             INTEGER     NOT NULL DEFAULT 0,
    cantidad_resenas           INTEGER     NOT NULL DEFAULT 0,
    cantidad_resenas_negativas INTEGER     NOT NULL DEFAULT 0
);
COMMENT ON TABLE busqueda_resultados IS 'Resumen de una búsqueda para la pantalla 2. El importador lo recalcula al cargar los CSV.';

CREATE TABLE busqueda_ubicaciones (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    busqueda_id UUID   NOT NULL REFERENCES busquedas (id) ON DELETE CASCADE,
    ciudad_id   UUID   NOT NULL REFERENCES ciudades (id)
);
COMMENT ON TABLE busqueda_ubicaciones IS 'Ciudades elegidas en cada búsqueda. Cada fila = una consulta a Google Maps ("rubro en ciudad, país").';

-- Negocios y lo que se extrae de ellos ---------------------------------------

CREATE TABLE negocios (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    busqueda_ubicacion_id UUID   NOT NULL REFERENCES busqueda_ubicaciones (id) ON DELETE CASCADE,
    google_place_id       TEXT   NOT NULL,
    nombre                TEXT   NOT NULL,
    direccion             TEXT,
    rating                NUMERIC(2,1),
    n_resenas             INTEGER,
    hist_5                INTEGER,
    hist_4                INTEGER,
    hist_3                INTEGER,
    hist_2                INTEGER,
    hist_1                INTEGER,
    pct_negativas         NUMERIC(4,3),
    primer_avistamiento   DATE,
    url_google_maps       TEXT,
    fecha_extraccion      DATE
);
COMMENT ON TABLE negocios IS 'Negocios encontrados en una búsqueda y ciudad. Se guardan todos, cumplan o no los filtros.';
COMMENT ON COLUMN negocios.google_place_id IS 'ID de Google. Mismo valor en distintas búsquedas = mismo negocio.';
COMMENT ON COLUMN negocios.hist_5 IS 'Cantidad de reseñas de 5 estrellas (hist_4 … hist_1 análogos).';
COMMENT ON COLUMN negocios.pct_negativas IS '(hist_1 + hist_2) / total de reseñas.';

CREATE TABLE resenas (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id       UUID     NOT NULL REFERENCES negocios (id) ON DELETE CASCADE,
    autor            TEXT,
    rating           SMALLINT,
    fuente           TEXT,
    texto            TEXT,
    respondida       BOOLEAN,
    meses_atras      INTEGER,
    fecha_aprox      DATE,
    fecha_extraccion DATE
);
COMMENT ON TABLE resenas IS 'Reseñas visibles de cada negocio (unas 5 sin iniciar sesión). Insumo de la IA.';
COMMENT ON COLUMN resenas.fuente IS 'Sitio donde se publicó: Google, Tripadvisor, Booking…';
COMMENT ON COLUMN resenas.fecha_aprox IS 'fecha_extraccion menos meses_atras meses. La calcula el importador.';

CREATE TABLE negocio_contactos (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID   NOT NULL REFERENCES negocios (id) ON DELETE CASCADE,
    tipo       TEXT   NOT NULL,
    subtipo    TEXT,
    valor      TEXT   NOT NULL,
    fuente     TEXT   NOT NULL
);
COMMENT ON TABLE negocio_contactos IS 'Todas las formas de contacto de un negocio, una por fila.';
COMMENT ON COLUMN negocio_contactos.tipo IS 'telefono | email | web | facebook | instagram | tiktok | x | youtube | linkedin';
COMMENT ON COLUMN negocio_contactos.subtipo IS 'telefono: celular | fijo | celular_o_fijo. web: propia | plataforma | link_en_bio | red_social | whatsapp. Resto: NULL.';
COMMENT ON COLUMN negocio_contactos.fuente IS 'google_maps | web_negocio';

-- Leads ----------------------------------------------------------------------

CREATE TABLE leads (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id       UUID   NOT NULL UNIQUE REFERENCES negocios (id) ON DELETE CASCADE,
    prioridad        TEXT,
    percentil        NUMERIC(4,3),
    tendencia        TEXT,
    variacion_rating NUMERIC(3,1)
);
COMMENT ON TABLE leads IS 'Negocios que cumplen los filtros de su búsqueda.';
COMMENT ON COLUMN leads.prioridad IS 'Alta | Media';
COMMENT ON COLUMN leads.percentil IS 'Posición frente a la competencia (mismo rubro y ciudad). 0.03 = entre el 3 % peor.';
COMMENT ON COLUMN leads.tendencia IS 'empeora | estable | mejora | sin historial';

-- PENDIENTE: estructura a definir con el equipo de IA.
CREATE TABLE negocio_problemas (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id       UUID   NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
    problema      TEXT,
    justificacion TEXT,
    generado_en   TIMESTAMPTZ
);
COMMENT ON TABLE negocio_problemas IS 'PENDIENTE. Problema principal detectado por la IA en las reseñas de un lead.';

-- Índices (PostgreSQL no indexa las FK automáticamente) ----------------------

CREATE INDEX ON ciudades (pais_id);
CREATE INDEX ON busqueda_ubicaciones (busqueda_id);
CREATE INDEX ON busqueda_ubicaciones (ciudad_id);
CREATE INDEX ON negocios (busqueda_ubicacion_id);
CREATE INDEX ON negocios (google_place_id);
CREATE INDEX ON resenas (negocio_id);
CREATE INDEX ON negocio_contactos (negocio_id);
CREATE INDEX ON negocio_problemas (lead_id);
