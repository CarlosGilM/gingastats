import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CacheService, TTL } from '../cache/cache.service';
import { PartidaComTimes } from '../types/types';

@Injectable()
export class PartidasService {
    private readonly logger = new Logger(PartidasService.name);

    constructor(
        private supabase: SupabaseService,
        private cache: CacheService,
    ) { }

    async getAgendadas(): Promise<PartidaComTimes[]> {
        const key = this.cache.keyPartidas();

        const cached = await this.cache.get<PartidaComTimes[]>(key);
        if (cached) return cached;

        this.logger.log('🗄️  Buscando partidas agendadas no banco');
        const { data, error } = await this.supabase
            .getClient()
            .from('partidas')
            .select(`
        id, sofascore_id, data, competicao, status,
        time_casa:times!partidas_time_casa_id_fkey (id, nome, slug, sofascore_id),
        time_fora:times!partidas_time_fora_id_fkey (id, nome, slug, sofascore_id)
      `)
            .eq('status', 'agendado')
            .order('data', { ascending: true });

        if (error) throw new Error(error.message);
        const result = data as unknown as PartidaComTimes[];

        this.logger.log(`✅ ${result.length} partidas encontradas → cacheando por 15min`);
        await this.cache.set(key, result, TTL.PARTIDAS_LIST);
        return result;
    }

    async getById(id: number): Promise<PartidaComTimes> {
        const { data, error } = await this.supabase
            .getClient()
            .from('partidas')
            .select(`
        id, sofascore_id, data, competicao, status,
        gols_casa, gols_fora, terminou_em, pen_casa, pen_fora,
        time_casa:times!partidas_time_casa_id_fkey (id, nome, slug, sofascore_id),
        time_fora:times!partidas_time_fora_id_fkey (id, nome, slug, sofascore_id)
      `)
            .eq('id', id)
            .single();

        if (error) throw new Error(error.message);
        return data as unknown as PartidaComTimes;
    }
}