import { forwardRef, Module } from '@nestjs/common';
import { BusquedasModule } from '../busquedas/busquedas.module.js';
import { ImportadorModule } from '../importador/importador.module.js';
import { DetectorProblemasService } from './detector-problemas.service.js';
import { GeneradorCorreosService } from './generador-correos.service.js';
import { ImportacionesController } from './importaciones.controller.js';
import { ScraperController } from './scraper.controller.js';
import { ScraperService } from './scraper.service.js';
import { ScriptGeminiService } from './script-gemini.service.js';

@Module({
  imports: [forwardRef(() => BusquedasModule), ImportadorModule],
  controllers: [ScraperController, ImportacionesController],
  providers: [
    ScraperService,
    ScriptGeminiService,
    DetectorProblemasService,
    GeneradorCorreosService,
  ],
  exports: [ScraperService, GeneradorCorreosService],
})
export class ScraperModule {}
