-- CreateTable
CREATE TABLE "lead_correos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lead_id" UUID NOT NULL,
    "asunto" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "generado_en" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lead_correos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_correos_lead_id_key" ON "lead_correos"("lead_id");

-- AddForeignKey
ALTER TABLE "lead_correos" ADD CONSTRAINT "lead_correos_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

COMMENT ON TABLE lead_correos IS 'Correo de primer contacto que redacta Gemini (genera mails/GENERA_MAILS.py) para un lead, a partir de sus datos y sus problemas.';
COMMENT ON COLUMN lead_correos.cuerpo IS 'Ya incluye la firma y la línea para darse de baja.';
COMMENT ON TABLE negocio_problemas IS 'Problemas que detecta Gemini (detecta problemas/DETECTA_PROBLEMAS.py) en las reseñas negativas de un lead: hasta 3 categorías, o "Ninguno".';
