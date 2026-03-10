import { Injectable, Logger } from '@nestjs/common';
import { PartidasService } from '../partidas/partidas.service';
import { EstatisticasService } from '../estatisticas/estatisticas.service';
import { CacheService, TTL } from '../cache/cache.service';
import { TimeResumo, ConfrontoResult } from '../types/types';

@Injectable()
export class AnaliseService {
    private readonly logger = new Logger(AnaliseService.name);

    constructor(
        private readonly partidasService: PartidasService,
        private readonly estatisticasService: EstatisticasService,
        private readonly cache: CacheService,
    ) { }

    async getConfrontoCompleto(partidaId: number, jogos: number): Promise<ConfrontoResult> {
        const key = this.cache.keyConfronto(partidaId, jogos);

        const cached = await this.cache.get<ConfrontoResult>(key);
        if (cached) return cached;

        this.logger.log(`🗄️  Buscando confronto no banco → partida #${partidaId} (${jogos} jogos)`);
        const result = await this._buildConfronto(partidaId, jogos);
        await this.cache.set(key, result, TTL.CONFRONTO);
        return result;
    }

    private async _buildConfronto(partidaId: number, jogos: number) {
        const partida = await this.partidasService.getById(partidaId);
        if (!partida) throw new Error('Partida não encontrada');

        const timeCasa = partida.time_casa as unknown as TimeResumo;
        const timeFora = partida.time_fora as unknown as TimeResumo;

        const [
            mediasCasa,
            mediasFora,
            mediasEmCasa,
            mediasForaDeCasa,
            ultimoJogoCasa,
            ultimoJogoFora,
            golsSofridosCasaEmCasa,
            golsSofridosForaForaDeCasa,
        ] = await Promise.all([
            this.estatisticasService.getMedias(timeCasa.id, jogos),
            this.estatisticasService.getMedias(timeFora.id, jogos),
            this.estatisticasService.getMediasPorLocal(timeCasa.id, 'casa', jogos),
            this.estatisticasService.getMediasPorLocal(timeFora.id, 'fora', jogos),
            this.estatisticasService.getUltimoJogo(timeCasa.id),
            this.estatisticasService.getUltimoJogo(timeFora.id),
            this.estatisticasService.getMediaGolsSofridos(timeCasa.id, 'casa', jogos),
            this.estatisticasService.getMediaGolsSofridos(timeFora.id, 'fora', jogos),
        ]);

        return {
            partida: {
                id: partida.id,
                data: partida.data,
                competicao: partida.competicao,
                time_casa: timeCasa,
                time_fora: timeFora,
            },
            jogos_analisados: jogos,
            time_casa: {
                medias_gerais: mediasCasa,
                medias_em_casa: mediasEmCasa,
                gols_sofridos_em_casa: golsSofridosCasaEmCasa,
                ultimo_jogo: ultimoJogoCasa,
            },
            time_fora: {
                medias_gerais: mediasFora,
                medias_fora_casa: mediasForaDeCasa,
                gols_sofridos_fora: golsSofridosForaForaDeCasa,
                ultimo_jogo: ultimoJogoFora,
            },
        };
    }
}