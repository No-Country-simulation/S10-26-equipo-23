import { Module } from '@nestjs/common';
import { BusquedasModule } from '../busquedas/busquedas.module.js';
import { ScraperModule } from '../scraper/scraper.module.js';
import { NegociosController } from './negocios.controller.js';
import { NegociosRepository } from './negocios.repository.js';
import { NegociosService } from './negocios.service.js';

@Module({
  imports: [BusquedasModule, ScraperModule],
  controllers: [NegociosController],
  providers: [NegociosService, NegociosRepository],
})
export class NegociosModule {}
