import { Module } from '@nestjs/common';
import { ImportadorRepository } from './importador.repository.js';
import { ImportadorService } from './importador.service.js';

@Module({
  providers: [ImportadorService, ImportadorRepository],
  exports: [ImportadorService],
})
export class ImportadorModule {}
