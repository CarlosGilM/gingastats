import { Database } from './database.types';

// Tipos base gerados pelo Supabase
export type TimeRow = Database['public']['Tables']['times']['Row'];
export type PartidaRow = Database['public']['Tables']['partidas']['Row'];
export type EstatRow = Database['public']['Tables']['estatisticas']['Row'];

// Tipo Time simplificado (só o que usamos nos joins)
export type TimeResumo = Pick<TimeRow, 'id' | 'nome' | 'slug' | 'sofascore_id'>;

// Partida com os times já resolvidos (resultado do join)
export type PartidaComTimes = Omit<PartidaRow, 'time_casa_id' | 'time_fora_id'> & {
  time_casa: TimeResumo;
  time_fora: TimeResumo;
};

// Estatísticas com dados da partida (resultado do join no getUltimoJogo)
export type EstatComPartida = EstatRow & {
  partidas: PartidaRow & {
    time_casa: Pick<TimeRow, 'nome'>;
    time_fora: Pick<TimeRow, 'nome'>;
  };
};

// Médias calculadas de um time em N jogos
export interface Medias {
  jogos_analisados: number;
  gols: number;
  gols_esperados: number | null;
  grandes_chances: number | null;
  finalizacoes: number | null;
  finalizacoes_no_gol: number | null;
  posse: number | null;
  escanteios: number | null;
  faltas_cometidas: number | null;
  desarmes: number | null;
  impedimentos: number | null;
  cartoes_amarelos: number | null;
  cartoes_vermelhos: number | null;
}

// Último jogo de um time com estatísticas e dados da partida
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
  // Supabase retorna joins como array — usamos [0] no frontend
  partidas: {
    data: string | null;
    competicao: string | null;
    gols_casa: number | null;
    gols_fora: number | null;
    terminou_em: string | null;
    time_casa: { nome: string }[];
    time_fora: { nome: string }[];
  }[];
}

// Retorno de getConfrontoCompleto — usado para tipar controller e cache
export interface ConfrontoResult {
  partida: {
    id: number;
    data: string;
    competicao: string | null;
    time_casa: TimeResumo;
    time_fora: TimeResumo;
  };
  jogos_analisados: number;
  time_casa: {
    medias_gerais: Medias | null;
    medias_em_casa: Medias | null;
    gols_sofridos_em_casa: number;
    ultimo_jogo: UltimoJogo | null;
  };
  time_fora: {
    medias_gerais: Medias | null;
    medias_fora_casa: Medias | null;
    gols_sofridos_fora: number;
    ultimo_jogo: UltimoJogo | null;
  };
}