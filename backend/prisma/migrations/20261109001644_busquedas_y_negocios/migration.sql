CREATE TABLE "busquedas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rubro" TEXT NOT NULL,
    "rating_minimo" DECIMAL(2,1),
    "rating_maximo" DECIMAL(2,1),
    "min_resenas" INTEGER,
    "configuracion_extra" TEXT,
    "estado" TEXT NOT NULL,
    "creada_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizada_en" TIMESTAMPTZ(6),
    "error" TEXT,

    CONSTRAINT "busquedas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "busqueda_resultados" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "busqueda_id" UUID NOT NULL,
    "capturado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cantidad_negocios" INTEGER NOT NULL DEFAULT 0,
    "cantidad_leads" INTEGER NOT NULL DEFAULT 0,
    "cantidad_resenas" INTEGER NOT NULL DEFAULT 0,
    "cantidad_resenas_negativas" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "busqueda_resultados_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "busqueda_ubicaciones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "busqueda_id" UUID NOT NULL,
    "ciudad_id" UUID NOT NULL,

    CONSTRAINT "busqueda_ubicaciones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "negocios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "busqueda_ubicacion_id" UUID NOT NULL,
    "google_place_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "rating" DECIMAL(2,1),
    "n_resenas" INTEGER,
    "hist_5" INTEGER,
    "hist_4" INTEGER,
    "hist_3" INTEGER,
    "hist_2" INTEGER,
    "hist_1" INTEGER,
    "pct_negativas" DECIMAL(4,3),
    "primer_avistamiento" DATE,
    "url_google_maps" TEXT,
    "fecha_extraccion" DATE,

    CONSTRAINT "negocios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resenas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "negocio_id" UUID NOT NULL,
    "autor" TEXT,
    "rating" SMALLINT,
    "fuente" TEXT,
    "texto" TEXT,
    "respondida" BOOLEAN,
    "meses_atras" INTEGER,
    "fecha_aprox" DATE,
    "fecha_extraccion" DATE,

    CONSTRAINT "resenas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "negocio_contactos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "negocio_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "subtipo" TEXT,
    "valor" TEXT NOT NULL,
    "fuente" TEXT NOT NULL,

    CONSTRAINT "negocio_contactos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "negocio_id" UUID NOT NULL,
    "prioridad" TEXT,
    "percentil" DECIMAL(4,3),
    "tendencia" TEXT,
    "variacion_rating" DECIMAL(3,1),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "negocio_problemas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lead_id" UUID NOT NULL,
    "problema" TEXT,
    "justificacion" TEXT,
    "generado_en" TIMESTAMPTZ(6),

    CONSTRAINT "negocio_problemas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "busqueda_resultados_busqueda_id_key" ON "busqueda_resultados"("busqueda_id");

CREATE INDEX "busqueda_ubicaciones_busqueda_id_idx" ON "busqueda_ubicaciones"("busqueda_id");

CREATE INDEX "busqueda_ubicaciones_ciudad_id_idx" ON "busqueda_ubicaciones"("ciudad_id");

CREATE INDEX "negocios_busqueda_ubicacion_id_idx" ON "negocios"("busqueda_ubicacion_id");

CREATE INDEX "negocios_google_place_id_idx" ON "negocios"("google_place_id");

CREATE INDEX "resenas_negocio_id_idx" ON "resenas"("negocio_id");

CREATE INDEX "negocio_contactos_negocio_id_idx" ON "negocio_contactos"("negocio_id");

CREATE UNIQUE INDEX "leads_negocio_id_key" ON "leads"("negocio_id");

CREATE INDEX "negocio_problemas_lead_id_idx" ON "negocio_problemas"("lead_id");

ALTER TABLE "busqueda_resultados" ADD CONSTRAINT "busqueda_resultados_busqueda_id_fkey" FOREIGN KEY ("busqueda_id") REFERENCES "busquedas"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "busqueda_ubicaciones" ADD CONSTRAINT "busqueda_ubicaciones_busqueda_id_fkey" FOREIGN KEY ("busqueda_id") REFERENCES "busquedas"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "busqueda_ubicaciones" ADD CONSTRAINT "busqueda_ubicaciones_ciudad_id_fkey" FOREIGN KEY ("ciudad_id") REFERENCES "ciudades"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "negocios" ADD CONSTRAINT "negocios_busqueda_ubicacion_id_fkey" FOREIGN KEY ("busqueda_ubicacion_id") REFERENCES "busqueda_ubicaciones"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "resenas" ADD CONSTRAINT "resenas_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "negocios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "negocio_contactos" ADD CONSTRAINT "negocio_contactos_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "negocios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "leads" ADD CONSTRAINT "leads_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "negocios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "negocio_problemas" ADD CONSTRAINT "negocio_problemas_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

COMMENT ON TABLE busquedas IS 'Cada búsqueda lanzada desde la pantalla 1.';

COMMENT ON COLUMN busquedas.configuracion_extra IS 'Otros parámetros de entrada del scraper.';

COMMENT ON COLUMN busquedas.estado IS 'en_curso | completada | fallida | cancelada';

COMMENT ON TABLE busqueda_resultados IS 'Resumen de una búsqueda para la pantalla 2. El importador lo recalcula al cargar los CSV.';

COMMENT ON TABLE busqueda_ubicaciones IS 'Ciudades elegidas en cada búsqueda. Cada fila = una consulta a Google Maps ("rubro en ciudad, país").';

COMMENT ON TABLE negocios IS 'Negocios encontrados en una búsqueda y ciudad. Se guardan todos, cumplan o no los filtros.';

COMMENT ON COLUMN negocios.google_place_id IS 'ID de Google. Mismo valor en distintas búsquedas = mismo negocio.';

COMMENT ON COLUMN negocios.hist_5 IS 'Cantidad de reseñas de 5 estrellas (hist_4 … hist_1 análogos).';

COMMENT ON COLUMN negocios.pct_negativas IS '(hist_1 + hist_2) / total de reseñas.';

COMMENT ON TABLE resenas IS 'Reseñas visibles de cada negocio (unas 5 sin iniciar sesión). Insumo de la IA.';

COMMENT ON COLUMN resenas.fuente IS 'Sitio donde se publicó: Google, Tripadvisor, Booking…';

COMMENT ON COLUMN resenas.fecha_aprox IS 'fecha_extraccion menos meses_atras meses. La calcula el importador.';

COMMENT ON TABLE negocio_contactos IS 'Todas las formas de contacto de un negocio, una por fila.';

COMMENT ON COLUMN negocio_contactos.tipo IS 'telefono | email | web | facebook | instagram | tiktok | x | youtube | linkedin';

COMMENT ON COLUMN negocio_contactos.subtipo IS 'telefono: celular | fijo | celular_o_fijo. web: propia | plataforma | link_en_bio | red_social | whatsapp. Resto: NULL.';

COMMENT ON COLUMN negocio_contactos.fuente IS 'google_maps | web_negocio';

COMMENT ON TABLE leads IS 'Negocios que cumplen los filtros de su búsqueda.';

COMMENT ON COLUMN leads.prioridad IS 'Alta | Media';

COMMENT ON COLUMN leads.percentil IS 'Posición frente a la competencia (mismo rubro y ciudad). 0.03 = entre el 3 % peor.';

COMMENT ON COLUMN leads.tendencia IS 'empeora | estable | mejora | sin historial';

COMMENT ON TABLE negocio_problemas IS 'PENDIENTE. Problema principal detectado por la IA en las reseñas de un lead.';
