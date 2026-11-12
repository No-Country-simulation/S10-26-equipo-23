import { forwardRef, Module } from '@nestjs/common';
import { BusquedasModule } from '../busquedas/busquedas.module.js';
import { ImportadorModule } from '../importador/importador.module.js';
import { DetectorProblemasService } from './detector-problemas.service.js';
import { ImportacionesController } from './importaciones.controller.js';
import { ScraperController } from './scraper.controller.js';
import { ScraperService } from './scraper.service.js';

@Module({
  imports: [forwardRef(() => BusquedasModule), ImportadorModule],
  controllers: [ScraperController, ImportacionesController],
  providers: [ScraperService, DetectorProblemasService],
  exports: [ScraperService],
})
export class ScraperModule {}
