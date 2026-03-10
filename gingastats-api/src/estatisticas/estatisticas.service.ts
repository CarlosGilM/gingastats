import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class EstatisticasService {
    constructor(private supabase: SupabaseService) { }

    async getMedias(timeId: number, ultimos = 10) {
        const { data: partidas, error: errPartidas } = await this.supabase
            .getClient()
            .from('estatisticas')
            .select('partida_id, partidas!inner(data, status)')
            .eq('time_id', timeId)
            .eq('partidas.status', 'finalizado')
            .order('partidas(data)', { ascending: false })
            .limit(ultimos);

        if (errPartidas) throw new Error(errPartidas.message);
        if (!partidas?.length) return null;

        const partidaIds = partidas.map((p) => p.partida_id);

        const { data, error } = await this.supabase
            .getClient()
            .from('estatisticas')
            .select(`
        local, gols, gols_esperados, grandes_chances,
        finalizacoes, finalizacoes_no_gol, posse, escanteios,
        faltas_cometidas, desarmes, impedimentos,
        cartoes_amarelos, cartoes_vermelhos
      `)
            .eq('time_id', timeId)
            .in('partida_id', partidaIds);

        if (error) throw new Error(error.message);
        if (!data?.length) return null;

        return this.calcularMedias(data, ultimos);
    }

    async getUltimoJogo(timeId: number) {
        const { data, error } = await this.supabase
            .getClient()
            .from('estatisticas')
            .select(`
        local, gols, gols_esperados, grandes_chances,
        finalizacoes, finalizacoes_no_gol, posse, escanteios,
        faltas_cometidas, desarmes, impedimentos,
        cartoes_amarelos, cartoes_vermelhos,
        partidas!inner (
          data, competicao, status,
          gols_casa, gols_fora, terminou_em,
          time_casa:times!partidas_time_casa_id_fkey (nome),
          time_fora:times!partidas_time_fora_id_fkey (nome)
        )
      `)
            .eq('time_id', timeId)
            .eq('partidas.status', 'finalizado')
            .order('partidas(data)', { ascending: false })
            .limit(1)
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async getMediasPorLocal(timeId: number, local: 'casa' | 'fora', ultimos = 5) {
        const { data: partidas, error: errPartidas } = await this.supabase
            .getClient()
            .from('estatisticas')
            .select('partida_id, partidas!inner(data, status)')
            .eq('time_id', timeId)
            .eq('local', local)
            .eq('partidas.status', 'finalizado')
            .order('partidas(data)', { ascending: false })
            .limit(ultimos);

        if (errPartidas) throw new Error(errPartidas.message);
        if (!partidas?.length) return null;

        const partidaIds = partidas.map((p) => p.partida_id);

        const { data, error } = await this.supabase
            .getClient()
            .from('estatisticas')
            .select(`
        local, gols, gols_esperados, grandes_chances,
        finalizacoes, finalizacoes_no_gol, posse, escanteios,
        faltas_cometidas, desarmes, impedimentos,
        cartoes_amarelos, cartoes_vermelhos
      `)
            .eq('time_id', timeId)
            .eq('local', local)
            .in('partida_id', partidaIds);

        if (error) throw new Error(error.message);
        if (!data?.length) return null;

        return this.calcularMedias(data, ultimos);
    }

    async getMediaLiga(ultimos = 10) {
        const { data, error } = await this.supabase
            .getClient()
            .from('estatisticas')
            .select('gols, partidas!inner(status)')
            .eq('partidas.status', 'finalizado')
            .not('gols', 'is', null)
            .limit(ultimos * 20);

        if (error) throw new Error(error.message);
        if (!data?.length) return { gols: 1.3 };

        const totalGols = data.reduce((acc, row) => acc + (row.gols ?? 0), 0);
        return { gols: Math.round((totalGols / data.length) * 100) / 100 };
    }

    // ─────────────────────────────────────────────────────────
    // Média de gols SOFRIDOS por um time
    // Busca as partidas do time e pega os gols do adversário
    // ─────────────────────────────────────────────────────────
    async getMediaGolsSofridos(timeId: number, local: 'casa' | 'fora' | 'geral', ultimos = 10) {
        let query = this.supabase
            .getClient()
            .from('partidas')
            .select('gols_casa, gols_fora, time_casa_id, time_fora_id')
            .eq('status', 'finalizado')
            .not('gols_casa', 'is', null)
            .not('gols_fora', 'is', null)
            .order('data', { ascending: false })
            .limit(ultimos);

        if (local === 'casa') {
            query = query.eq('time_casa_id', timeId);
        } else if (local === 'fora') {
            query = query.eq('time_fora_id', timeId);
        } else {
            query = query.or(`time_casa_id.eq.${timeId},time_fora_id.eq.${timeId}`);
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        if (!data?.length) return 1.0;

        const totalSofridos = data.reduce((acc, partida) => {
            const sofridos = partida.time_casa_id === timeId
                ? (partida.gols_fora ?? 0)
                : (partida.gols_casa ?? 0);
            return acc + sofridos;
        }, 0);

        return Math.round((totalSofridos / data.length) * 100) / 100;
    }

    private calcularMedias(rows: any[], totalJogos: number) {
        const soma = rows.reduce(
            (acc, row) => ({
                gols: acc.gols + (row.gols ?? 0),
                gols_esperados: acc.gols_esperados + (row.gols_esperados ?? 0),
                grandes_chances: acc.grandes_chances + (row.grandes_chances ?? 0),
                finalizacoes: acc.finalizacoes + (row.finalizacoes ?? 0),
                finalizacoes_no_gol: acc.finalizacoes_no_gol + (row.finalizacoes_no_gol ?? 0),
                posse: acc.posse + (row.posse ?? 0),
                escanteios: acc.escanteios + (row.escanteios ?? 0),
                faltas_cometidas: acc.faltas_cometidas + (row.faltas_cometidas ?? 0),
                desarmes: acc.desarmes + (row.desarmes ?? 0),
                impedimentos: acc.impedimentos + (row.impedimentos ?? 0),
                cartoes_amarelos: acc.cartoes_amarelos + (row.cartoes_amarelos ?? 0),
                cartoes_vermelhos: acc.cartoes_vermelhos + (row.cartoes_vermelhos ?? 0),
            }),
            {
                gols: 0, gols_esperados: 0, grandes_chances: 0,
                finalizacoes: 0, finalizacoes_no_gol: 0, posse: 0,
                escanteios: 0, faltas_cometidas: 0, desarmes: 0,
                impedimentos: 0, cartoes_amarelos: 0, cartoes_vermelhos: 0,
            },
        );

        const n = rows.length;
        const arred = (v: number, casas = 1) => Math.round(v * 10 ** casas) / 10 ** casas;

        return {
            jogos_analisados: n,
            gols: arred(soma.gols / n),
            gols_esperados: arred(soma.gols_esperados / n, 2),
            grandes_chances: arred(soma.grandes_chances / n),
            finalizacoes: arred(soma.finalizacoes / n),
            finalizacoes_no_gol: arred(soma.finalizacoes_no_gol / n),
            posse: arred(soma.posse / n),
            escanteios: arred(soma.escanteios / n),
            faltas_cometidas: arred(soma.faltas_cometidas / n),
            desarmes: arred(soma.desarmes / n),
            impedimentos: arred(soma.impedimentos / n),
            cartoes_amarelos: arred(soma.cartoes_amarelos / n),
            cartoes_vermelhos: arred(soma.cartoes_vermelhos / n),
        };
    }
}