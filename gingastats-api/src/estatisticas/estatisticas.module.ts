import { Module } from '@nestjs/common';
import { EstatisticasService } from './estatisticas.service';

@Module({
  providers: [EstatisticasService],
  exports: [EstatisticasService], // exporta para o módulo de análise
})
export class EstatisticasModule {}