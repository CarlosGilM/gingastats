import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { PartidasModule } from './partidas/partidas.module';
import { EstatisticasModule } from './estatisticas/estatisticas.module';
import { AnaliseModule } from './analise/analise.module';
import { RedisCacheModule } from './cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    PartidasModule,
    EstatisticasModule,
    AnaliseModule,
    RedisCacheModule,
  ],
})
export class AppModule { }