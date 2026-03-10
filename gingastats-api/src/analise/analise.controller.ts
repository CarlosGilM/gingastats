import {
    Controller, Get, Param,
    Query, ParseIntPipe, DefaultValuePipe, Logger,
} from '@nestjs/common';
import { AnaliseService } from './analise.service';
import { IaService } from './ia.service';
import { CacheService, TTL } from '../cache/cache.service';
import { ConfrontoResult } from '../types/types';

@Controller('analise')
export class AnaliseController {
    private readonly logger = new Logger(AnaliseController.name);

    constructor(
        private readonly analiseService: AnaliseService,
        private readonly iaService: IaService,
        private readonly cache: CacheService,
    ) { }

    // GET /analise/confronto/202
    @Get('confronto/:partidaId')
    getConfrontoCompleto(
        @Param('partidaId', ParseIntPipe) partidaId: number,
        @Query('jogos', new DefaultValuePipe(10), ParseIntPipe) jogosParam: number,
    ) {
        const jogos = Math.min(Math.max(jogosParam, 3), 20);
        return this.analiseService.getConfrontoCompleto(partidaId, jogos);
    }

    // GET /analise/confronto/202/ia
    @Get('confronto/:partidaId/ia')
    async getAnaliseIa(
        @Param('partidaId', ParseIntPipe) partidaId: number,
        @Query('jogos', new DefaultValuePipe(10), ParseIntPipe) jogosParam: number,
    ) {
        const jogos = Math.min(Math.max(jogosParam, 3), 20);
        const key = this.cache.keyAnaliseIa(partidaId, jogos);

        const cached = await this.cache.get<{ analise_ia: unknown }>(key);
        if (cached) return cached;

        this.logger.log(`🤖 Gerando análise IA via Gemini → partida #${partidaId}`);
        const start = Date.now();

        const dados: ConfrontoResult = await this.analiseService.getConfrontoCompleto(partidaId, jogos);

        const analiseIa = await this.iaService.analisarConfrontoCompleto({
            partida: {
                time_casa: dados.partida.time_casa.nome,
                time_fora: dados.partida.time_fora.nome,
                competicao: dados.partida.competicao,
                data: dados.partida.data,
            },
            time_casa: {
                medias_gerais: dados.time_casa.medias_gerais,
                medias_em_casa: dados.time_casa.medias_em_casa,
                gols_sofridos_em_casa: dados.time_casa.gols_sofridos_em_casa,
                ultimo_jogo: dados.time_casa.ultimo_jogo,
            },
            time_fora: {
                medias_gerais: dados.time_fora.medias_gerais,
                medias_fora_casa: dados.time_fora.medias_fora_casa,
                gols_sofridos_fora: dados.time_fora.gols_sofridos_fora,
                ultimo_jogo: dados.time_fora.ultimo_jogo,
            },
            media_liga: 1.3,
        });

        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        this.logger.log(`✅ IA concluída em ${elapsed}s → partida #${partidaId} | armazenando por 72h`);

        const result = { analise_ia: analiseIa };
        await this.cache.set(key, result, TTL.ANALISE_IA);
        return result;
    }
}