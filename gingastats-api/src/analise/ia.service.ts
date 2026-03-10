import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

const SYSTEM_INSTRUCTION = `Você é um analista quantitativo sênior de futebol especializado em mercados de apostas esportivas.

CÁLCULOS OBRIGATÓRIOS — execute antes de gerar qualquer mercado:
1. Índice de ataque casa = gols_marcados_em_casa / media_liga
2. Índice de defesa fora = gols_sofridos_fora / media_liga
3. Gols projetados mandante = índice_ataque_casa x índice_defesa_fora x media_liga
4. Gols projetados visitante = (gols_marcados_fora / media_liga) x (gols_sofridos_casa / media_liga) x media_liga
5. Taxa de conversão = gols_marcados / finalizacoes_no_alvo (para cada time)
6. Finalizações totais projetadas = fin_casa_em_casa + fin_fora_fora_de_casa
7. Escanteios projetados = esc_casa_em_casa + esc_fora_fora_de_casa
8. Cartões projetados = amar_casa_em_casa + amar_fora_fora_de_casa

PROFUNDIDADE DA ANÁLISE — para cada mercado:
- Cite os números calculados explicitamente na justificativa
- Cruze pelo menos 3 variáveis diferentes (ex: gols sofridos + xG + grandes chances)
- Considere o último jogo como contexto de forma recente
- Confiança "Alta" apenas quando múltiplas variáveis apontam na mesma direção

LÓGICA DE LINHA — REGRA CRÍTICA:
A linha sugerida deve ter margem de segurança real em relação à projeção. NUNCA sugira uma linha que seja quase igual ao valor projetado.
Aplique estas regras para definir a linha:
- Se projetado = P e você quer sugerir Over: escolha uma linha L onde L < P × 0.88 (pelo menos 12% abaixo do projetado)
- Se projetado = P e você quer sugerir Under: escolha uma linha L onde L > P × 1.12 (pelo menos 12% acima do projetado)
- Se a diferença entre projetado e qualquer linha razoável for menor que 10%, retorne confiança "Baixa" e explique que não há margem clara
- Exemplos corretos: projetado=26 → sugira Over 22.5 ou Over 23.5, NÃO Over 25.5; projetado=10 → sugira Over 8.5, NÃO Over 9.5
- Exemplos errados (PROIBIDO): projetado=26.1 → Over 25.5; projetado=4.4 → Under 4.5
O objetivo é encontrar linhas onde a projeção oferece vantagem clara, não apenas refletir a projeção.

ALERTA — sempre avalie:
- Amostras pequenas (menos de 5 jogos por local)
- Anomalias estatísticas (ex: cartões vermelhos absurdos, placar atípico no último jogo)
- Competições diferentes misturadas nas médias
Se houver qualquer inconsistência, descreva no campo "alerta". Se tudo parecer normal, retorne null.

LINGUAGEM:
- NUNCA use "lambda", "xG bruto" ou "Poisson"
- Use "gols projetados", "gols esperados", "eficiência ofensiva", "taxa de conversão"
- Justificativas diretas, matemáticas, citando números reais dos dados
- NUNCA exponha nomes de campos internos como "verm=12", "fin=", "amar=", "gols_sof=" ou qualquer chave no formato dos dados recebidos
- No campo "alerta" e em qualquer justificativa, escreva sempre em linguagem natural: em vez de "verm=12", escreva "12 cartões vermelhos registrados"; em vez de "xG=null", escreva "dado de gols esperados ausente para este jogo"
- O usuário final não deve ter nenhuma ideia de como os dados são estruturados internamente

SCHEMA DE RESPOSTA — JSON estrito, sem markdown, sem texto fora do JSON:
{
  "resumo": "4 a 6 linhas narrativas contextualizando o confronto com base nos números. Mencione o estilo de jogo de cada time, o equilíbrio/desequilíbrio ofensivo-defensivo e o que os dados indicam para esta partida.",
  "projecao_gols": {
    "gols_projetados_casa": <number calculado>,
    "gols_projetados_fora": <number calculado>,
    "total_projetado": <soma dos dois>,
    "interpretacao": "1 linha explicando o que o total projetado significa para o jogo"
  },
  "mercados": [
    {
      "mercado": "nome do mercado",
      "sugestao": "a aposta recomendada (ex: Over 2.5, Casa, Sim, Under 9.5)",
      "confianca": "Alta | Média | Baixa",
      "linha": <número da linha sugerida ou null se não aplicável>,
      "justificativa": "3 a 4 linhas citando os números que embasam a sugestão"
    }
  ],
  "alerta": "descrição da inconsistência ou null"
}

Os 6 mercados obrigatórios, nesta ordem:
1. "Resultado (1X2)"
2. "Gols Over/Under"
3. "Ambos Marcam"
4. "Finalizações Totais"
5. "Escanteios Over/Under"
6. "Cartões Over/Under"`;

@Injectable()
export class IaService {
    private readonly ai: GoogleGenAI;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.getOrThrow<string>('GEMINI_API_KEY');
        this.ai = new GoogleGenAI({ apiKey });
    }

    async analisarConfrontoCompleto(dados: {
        partida: { time_casa: string; time_fora: string; competicao: string | null; data: string };
        time_casa: { medias_gerais: any; medias_em_casa: any; gols_sofridos_em_casa: number; ultimo_jogo: any };
        time_fora: { medias_gerais: any; medias_fora_casa: any; gols_sofridos_fora: number; ultimo_jogo: any };
        media_liga: number;
    }) {
        const { partida, time_casa: tc, time_fora: tf, media_liga } = dados;

        const prompt = `
CONFRONTO: ${partida.time_casa} x ${partida.time_fora} | ${partida.competicao ?? 'N/A'} | ${new Date(partida.data).toLocaleString('pt-BR')}
MÉDIA DE GOLS DA LIGA: ${media_liga}

${partida.time_casa.toUpperCase()} — MANDANTE
Geral(${tc.medias_gerais?.jogos_analisados}j): gols=${tc.medias_gerais?.gols} xG=${tc.medias_gerais?.gols_esperados} fin=${tc.medias_gerais?.finalizacoes} alvo=${tc.medias_gerais?.finalizacoes_no_gol} gc=${tc.medias_gerais?.grandes_chances} esc=${tc.medias_gerais?.escanteios} faltas=${tc.medias_gerais?.faltas_cometidas} amar=${tc.medias_gerais?.cartoes_amarelos} verm=${tc.medias_gerais?.cartoes_vermelhos}
Casa(${tc.medias_em_casa?.jogos_analisados}j): gols_marc=${tc.medias_em_casa?.gols} gols_sof=${tc.gols_sofridos_em_casa} xG=${tc.medias_em_casa?.gols_esperados} fin=${tc.medias_em_casa?.finalizacoes} alvo=${tc.medias_em_casa?.finalizacoes_no_gol} gc=${tc.medias_em_casa?.grandes_chances} esc=${tc.medias_em_casa?.escanteios} faltas=${tc.medias_em_casa?.faltas_cometidas} amar=${tc.medias_em_casa?.cartoes_amarelos}
UltimoJogo: ${tc.ultimo_jogo?.partidas?.time_casa?.nome} ${tc.ultimo_jogo?.partidas?.gols_casa}x${tc.ultimo_jogo?.partidas?.gols_fora} ${tc.ultimo_jogo?.partidas?.time_fora?.nome} (${tc.ultimo_jogo?.partidas?.competicao}) como_${tc.ultimo_jogo?.local}: xG=${tc.ultimo_jogo?.gols_esperados} fin=${tc.ultimo_jogo?.finalizacoes} alvo=${tc.ultimo_jogo?.finalizacoes_no_gol} esc=${tc.ultimo_jogo?.escanteios} amar=${tc.ultimo_jogo?.cartoes_amarelos} verm=${tc.ultimo_jogo?.cartoes_vermelhos ?? 0}

${partida.time_fora.toUpperCase()} — VISITANTE
Geral(${tf.medias_gerais?.jogos_analisados}j): gols=${tf.medias_gerais?.gols} xG=${tf.medias_gerais?.gols_esperados} fin=${tf.medias_gerais?.finalizacoes} alvo=${tf.medias_gerais?.finalizacoes_no_gol} gc=${tf.medias_gerais?.grandes_chances} esc=${tf.medias_gerais?.escanteios} faltas=${tf.medias_gerais?.faltas_cometidas} amar=${tf.medias_gerais?.cartoes_amarelos} verm=${tf.medias_gerais?.cartoes_vermelhos}
Fora(${tf.medias_fora_casa?.jogos_analisados}j): gols_marc=${tf.medias_fora_casa?.gols} gols_sof=${tf.gols_sofridos_fora} xG=${tf.medias_fora_casa?.gols_esperados} fin=${tf.medias_fora_casa?.finalizacoes} alvo=${tf.medias_fora_casa?.finalizacoes_no_gol} gc=${tf.medias_fora_casa?.grandes_chances} esc=${tf.medias_fora_casa?.escanteios} faltas=${tf.medias_fora_casa?.faltas_cometidas} amar=${tf.medias_fora_casa?.cartoes_amarelos}
UltimoJogo: ${tf.ultimo_jogo?.partidas?.time_casa?.nome} ${tf.ultimo_jogo?.partidas?.gols_casa}x${tf.ultimo_jogo?.partidas?.gols_fora} ${tf.ultimo_jogo?.partidas?.time_fora?.nome} (${tf.ultimo_jogo?.partidas?.competicao}) como_${tf.ultimo_jogo?.local}: xG=${tf.ultimo_jogo?.gols_esperados} fin=${tf.ultimo_jogo?.finalizacoes} alvo=${tf.ultimo_jogo?.finalizacoes_no_gol} esc=${tf.ultimo_jogo?.escanteios} amar=${tf.ultimo_jogo?.cartoes_amarelos} verm=${tf.ultimo_jogo?.cartoes_vermelhos ?? 0}
`.trim();

        const response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                temperature: 0.15,
                maxOutputTokens: 8192,
                responseMimeType: 'application/json',
            },
        });

        const texto = response.text ?? '';

        try {
            return JSON.parse(texto);
        } catch {
            return { erro: 'Falha ao parsear resposta da IA', bruto: texto };
        }
    }
}