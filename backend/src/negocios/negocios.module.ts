import { Module } from '@nestjs/common';
import { BusquedasModule } from '../busquedas/busquedas.module.js';
import { NegociosController } from './negocios.controller.js';
import { NegociosRepository } from './negocios.repository.js';
import { NegociosService } from './negocios.service.js';

@Module({
  imports: [BusquedasModule],
  controllers: [NegociosController],
  providers: [NegociosService, NegociosRepository],
})
export class NegociosModule {}
