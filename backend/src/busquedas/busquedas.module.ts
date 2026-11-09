import { forwardRef, Module } from '@nestjs/common';
import { ScraperModule } from '../scraper/scraper.module.js';
import { BusquedasController } from './busquedas.controller.js';
import { BusquedasRepository } from './busquedas.repository.js';
import { BusquedasService } from './busquedas.service.js';

@Module({
  imports: [forwardRef(() => ScraperModule)],
  controllers: [BusquedasController],
  providers: [BusquedasService, BusquedasRepository],
  exports: [BusquedasService, BusquedasRepository],
})
export class BusquedasModule {}
