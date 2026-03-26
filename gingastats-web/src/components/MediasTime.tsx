import type { Medias, UltimoJogo } from '../types/types';

interface Props {
  nome: string;
  local: 'Mandante' | 'Visitante';
  medias: Medias | null;
  mediasPorLocal: Medias | null;
  golsSofridos: number;
  ultimoJogo: UltimoJogo | null;
}

function StatRow({ label, geral, porLocal }: {
  label: string;
  geral: number | null | undefined;
  porLocal: number | null | undefined;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-white/50">{label}</span>
      <div className="flex gap-6">
        <span className="text-sm text-white/35 w-10 text-right">{geral ?? '-'}</span>
        <span className="text-base font-bold text-white w-10 text-right">{porLocal ?? '-'}</span>
      </div>
    </div>
  );
}

function CardHeader({ titulo, subtitulo, badge }: { titulo: string; subtitulo?: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <p className="text-xs text-white/30 uppercase tracking-widest">{subtitulo}</p>
        <h4 className="text-base font-bold">{titulo}</h4>
      </div>
      {badge && (
        <span className="text-xs bg-white/10 px-2 py-1 rounded-lg text-white/50">{badge}</span>
      )}
    </div>
  );
}

export default function MediasTime({ nome, local, medias, mediasPorLocal, golsSofridos, ultimoJogo }: Props) {
  const labelLocal = local === 'Mandante' ? 'Casa' : 'Fora';

  // Placar correto vindo de partidas, não de estatisticas
  const placarCasa = ultimoJogo?.partidas?.gols_casa ?? '-';
  const placarFora = ultimoJogo?.partidas?.gols_fora ?? '-';
  const nomeCasaUJ = ultimoJogo?.partidas?.time_casa?.nome ?? '';
  const nomeForaUJ = ultimoJogo?.partidas?.time_fora?.nome ?? '';

  return (
    <div className="space-y-3">
      {/* Nome do time */}
      <div className="flex items-center gap-2">
        <div className="w-1 h-6 bg-[#00e676] rounded-full" />
        <div>
          <h3 className="font-bold">{nome}</h3>
          <p className="text-sm text-white/40">{local}</p>
        </div>
      </div>

      {/* Card 1 — Médias Gerais */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <CardHeader
          titulo="Médias Gerais"
          subtitulo="todos os jogos"
          badge={medias ? `${medias.jogos_analisados} jogos` : undefined}
        />
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/25 uppercase tracking-widest">Estatística</span>
          <span className="text-xs text-white/25 uppercase tracking-widest">Média</span>
        </div>
        {[
          { label: 'Gols marcados', valor: medias?.gols },
          { label: 'xG (gols esperados)', valor: medias?.gols_esperados },
          { label: 'Grandes chances', valor: medias?.grandes_chances },
          { label: 'Finalizações', valor: medias?.finalizacoes },
          { label: 'No alvo', valor: medias?.finalizacoes_no_gol },
          { label: 'Posse de bola %', valor: medias?.posse },
          { label: 'Escanteios', valor: medias?.escanteios },
          { label: 'Faltas cometidas', valor: medias?.faltas_cometidas },
          { label: 'Cartões amarelos', valor: medias?.cartoes_amarelos },
          { label: 'Cartões vermelhos', valor: medias?.cartoes_vermelhos },
        ].map(({ label, valor }) => (
          <div key={label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
            <span className="text-sm text-white/50">{label}</span>
            <span className="text-base font-bold text-white">{valor ?? '-'}</span>
          </div>
        ))}
      </div>

      {/* Card 2 — Médias por local */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <CardHeader
          titulo={`Médias ${labelLocal}`}
          subtitulo={`apenas jogos ${labelLocal.toLowerCase()}`}
          badge={mediasPorLocal ? `${mediasPorLocal.jogos_analisados} jogos` : undefined}
        />
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/25 uppercase tracking-widest">Estatística</span>
          <div className="flex gap-6">
            <span className="text-xs text-white/25 w-10 text-right uppercase tracking-widest">Geral</span>
            <span className="text-xs text-[#00e676]/60 w-10 text-right uppercase tracking-widest">{labelLocal}</span>
          </div>
        </div>
        <StatRow label="Gols marcados" geral={medias?.gols} porLocal={mediasPorLocal?.gols} />
        <StatRow label="Gols sofridos" geral={undefined} porLocal={golsSofridos} />
        <StatRow label="xG" geral={medias?.gols_esperados} porLocal={mediasPorLocal?.gols_esperados} />
        <StatRow label="Grandes chances" geral={medias?.grandes_chances} porLocal={mediasPorLocal?.grandes_chances} />
        <StatRow label="Finalizações" geral={medias?.finalizacoes} porLocal={mediasPorLocal?.finalizacoes} />
        <StatRow label="Posse %" geral={medias?.posse} porLocal={mediasPorLocal?.posse} />
        <StatRow label="Escanteios" geral={medias?.escanteios} porLocal={mediasPorLocal?.escanteios} />
        <StatRow label="Cartões amarelos" geral={medias?.cartoes_amarelos} porLocal={mediasPorLocal?.cartoes_amarelos} />
      </div>

      {/* Card 3 — Último jogo */}
      {ultimoJogo && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <CardHeader titulo="Último Jogo" subtitulo="resultado mais recente" />

          {/* Placar */}
          <div className="text-center bg-white/5 rounded-xl py-4 mb-4">
            <p className="text-xs text-white/40 mb-2">{ultimoJogo.partidas?.competicao}</p>
            <div className="flex items-center justify-center gap-3">
              <span className={`text-sm font-bold text-right ${ultimoJogo.local === 'casa' ? 'text-[#00e676]' : 'text-white'}`}>
                {nomeCasaUJ}
              </span>
              <span className="text-3xl font-black tabular-nums shrink-0">
                {placarCasa} <span className="text-white/30">×</span> {placarFora}
              </span>
              <span className={`text-sm font-bold ${ultimoJogo.local === 'fora' ? 'text-[#00e676]' : 'text-white'}`}>
                {nomeForaUJ}
              </span>
            </div>
            <p className="text-xs text-white/30 mt-2">
              {ultimoJogo.partidas?.terminou_em} · atuou como {ultimoJogo.local === 'casa' ? 'mandante' : 'visitante'}
            </p>
          </div>

          {/* Stats do último jogo */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'xG', valor: ultimoJogo.gols_esperados },
              { label: 'Finalizações', valor: ultimoJogo.finalizacoes },
              { label: 'No alvo', valor: ultimoJogo.finalizacoes_no_gol },
              { label: 'Escanteios', valor: ultimoJogo.escanteios },
              { label: 'Posse %', valor: ultimoJogo.posse },
              { label: 'Amarelos', valor: ultimoJogo.cartoes_amarelos },
            ].map(({ label, valor }) => (
              <div key={label} className="bg-white/5 rounded-lg px-3 py-2 flex justify-between items-center">
                <span className="text-sm text-white/40">{label}</span>
                <span className="text-sm font-bold">{valor ?? '-'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}