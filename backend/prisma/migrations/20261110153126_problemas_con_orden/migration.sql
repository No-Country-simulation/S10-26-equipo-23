/*
  Warnings:

  - You are about to drop the column `justificacion` on the `negocio_problemas` table. All the data in the column will be lost.
  - Added the required column `orden` to the `negocio_problemas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "negocio_problemas" DROP COLUMN "justificacion",
ADD COLUMN     "orden" SMALLINT NOT NULL;

COMMENT ON TABLE negocio_problemas IS 'Problemas que detecta Gemini (scrapping/DETECTA_PROBLEMAS.py) en las reseñas negativas de un lead: hasta 3 categorías, o "Ninguno".';
COMMENT ON COLUMN negocio_problemas.orden IS 'Posición del problema según Gemini: 1 es el principal.';
