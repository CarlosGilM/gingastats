import { Module } from '@nestjs/common';
import { AnaliseService } from './analise.service';
import { AnaliseController } from './analise.controller';
import { EstatisticasModule } from '../estatisticas/estatisticas.module';
import { PartidasModule } from '../partidas/partidas.module';
import { IaService } from './ia.service';

@Module({
  imports: [EstatisticasModule, PartidasModule],
  controllers: [AnaliseController],
  providers: [AnaliseService, IaService],
})
export class AnaliseModule { }