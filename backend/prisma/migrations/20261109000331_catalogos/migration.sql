CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE "paises" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL,

    CONSTRAINT "paises_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ciudades" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pais_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "ciudades_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "paises_nombre_key" ON "paises"("nombre");

CREATE INDEX "ciudades_pais_id_idx" ON "ciudades"("pais_id");

CREATE UNIQUE INDEX "ciudades_pais_id_nombre_key" ON "ciudades"("pais_id", "nombre");

ALTER TABLE "ciudades" ADD CONSTRAINT "ciudades_pais_id_fkey" FOREIGN KEY ("pais_id") REFERENCES "paises"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMENT ON TABLE "paises" IS 'Los 19 países que soporta el scraper (CODIGO_PAIS), precargados con su nombre exacto.';

COMMENT ON TABLE "ciudades" IS 'Ciudades de esos 19 países precargadas desde GeoNames (cities1000), una por nombre, más las que agregue el usuario.';
