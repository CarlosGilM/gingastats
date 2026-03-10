export interface Time {
  id: number;
  nome: string;
  slug: string;
  sofascore_id: number;
}

export interface Partida {
  id: number;
  sofascore_id: number;
  data: string;
  competicao: string;
  status: string;
  time_casa: Time;
  time_fora: Time;
}

export interface Medias {
  jogos_analisados: number;
  gols: number;
  gols_esperados: number;
  grandes_chances: number;
  finalizacoes: number;
  finalizacoes_no_gol: number;
  posse: number;
  escanteios: number;
  faltas_cometidas: number;
  desarmes: number;
  impedimentos: number;
  cartoes_amarelos: number;
  cartoes_vermelhos: number;
}

export interface UltimoJogo {
  local: 'casa' | 'fora';
  gols: number | null;
  gols_esperados: number | null;
  escanteios: number | null;
  finalizacoes: number | null;
  finalizacoes_no_gol: number | null;
  posse: number | null;
  cartoes_amarelos: number | null;
  cartoes_vermelhos: number | null;
  partidas: {
    data: string;
    competicao: string;
    gols_casa: number;
    gols_fora: number;
    terminou_em: string;
    time_casa: { nome: string };
    time_fora: { nome: string };
  };
}

export interface MercadoInsight {
  linha_sugerida: number;
  tendencia: 'over' | 'under';
  confianca: 'alta' | 'media' | 'baixa';
  media_casa: number;
  media_fora: number;
  media_total: number;
}

export interface Insight {
  disponivel: boolean;
  projecao: {
    lambda_casa: number;
    lambda_fora: number;
    lambda_total: number;
    media_liga_usada: number;
    gols_sofridos_casa_em_casa: number;
    gols_sofridos_fora_fora_de_casa: number;
  };
  probabilidades: {
    resultado: { casa: number; empate: number; fora: number };
    gols: { over_1_5: number; over_2_5: number; over_3_5: number; under_2_5: number };
    ambos_marcam: number;
  };
  placares_mais_provaveis: { placar: string; probabilidade: number }[];
  escanteios: MercadoInsight;
  cartoes: MercadoInsight;
  forca_relativa: {
    ataque_casa: number; defesa_casa: number;
    ataque_fora: number; defesa_fora: number;
  };
  comparativo: {
    posse: { vantagem: string; diferenca: number; percentual_diferenca: number } | null;
    finalizacoes: { vantagem: string; diferenca: number; percentual_diferenca: number } | null;
    grandes_chances: { vantagem: string; diferenca: number; percentual_diferenca: number } | null;
    xg: { vantagem: string; diferenca: number; percentual_diferenca: number } | null;
  };
  confianca_geral: 'alta' | 'media' | 'baixa';
}

export interface ConfrontoCompleto {
  partida: Partida;
  jogos_analisados: number;
  time_casa: {
    medias_gerais: Medias;
    medias_em_casa: Medias;
    ultimo_jogo: UltimoJogo;
  };
  time_fora: {
    medias_gerais: Medias;
    medias_fora_casa: Medias;
    ultimo_jogo: UltimoJogo;
  };
  insight: Insight;
}

export interface MercadoIa {
  mercado: string;
  sugestao: string;
  confianca: 'Alta' | 'Média' | 'Baixa';
  linha: number | null;
  justificativa: string;
}

export interface AnaliseIa {
  resumo: string;
  projecao_ia: {
    lambda_casa: number;
    lambda_fora: number;
    lambda_total: number;
    interpretacao: string;
  };
  mercados: MercadoIa[];
  alerta: string | null;
}
