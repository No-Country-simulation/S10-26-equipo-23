import { forwardRef, Module } from '@nestjs/common';
import { BusquedasModule } from '../busquedas/busquedas.module.js';
import { ImportadorModule } from '../importador/importador.module.js';
import { ScraperController } from './scraper.controller.js';
import { ScraperService } from './scraper.service.js';

@Module({
  imports: [forwardRef(() => BusquedasModule), ImportadorModule],
  controllers: [ScraperController],
  providers: [ScraperService],
  exports: [ScraperService],
})
export class ScraperModule {}
