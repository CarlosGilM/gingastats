import React from 'react';
import type { Partida } from '../types/types';
import EscudoTime from './EscudoTime';

interface MatchCardProps {
  partida: Partida;
  index: number;
  onClick: (partida: Partida) => void;
}

const MatchCard = React.memo(({ partida, index, onClick }: MatchCardProps) => {
  const hora = new Date(partida.data).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <button
      onClick={() => onClick(partida)}
      className="w-full group relative text-left"
      style={{ animation: `slideIn 0.4s ease forwards`, animationDelay: `${index * 60}ms`, opacity: 0 }}
    >
      <div
        className="absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'linear-gradient(135deg, rgba(0,230,118,0.15), transparent 60%)' }}
      />

      <div className="relative flex items-center gap-3 px-5 py-4 rounded-xl border border-white/8 bg-white/3 group-hover:bg-white/6 group-hover:border-[#00e676]/25 transition-all duration-300">
        <div className="shrink-0 w-12 text-center">
          <span style={{ fontFamily: 'DM Mono', fontSize: 15, color: '#00e676', fontWeight: 500 }}>{hora}</span>
        </div>

        <div className="w-px h-8 bg-white/10 shrink-0" />

        <div className="flex items-center justify-end gap-2 overflow-hidden" style={{ flex: '1 1 0', minWidth: 0 }}>
          <span style={{
            fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 18,
            letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {partida.time_casa.nome}
          </span>
          <div className="shrink-0">
            <EscudoTime sofascoreId={partida.time_casa.sofascore_id} nome={partida.time_casa.nome} size={30} />
          </div>
        </div>

        <div className="shrink-0 w-10 text-center">
          <span style={{ fontFamily: 'Barlow Condensed', fontWeight: 900, fontSize: 13, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.2)' }}>VS</span>
        </div>

        <div className="flex items-center gap-2 overflow-hidden" style={{ flex: '1 1 0', minWidth: 0 }}>
          <div className="shrink-0">
            <EscudoTime sofascoreId={partida.time_fora.sofascore_id} nome={partida.time_fora.nome} size={30} />
          </div>
          <span style={{
            fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 18,
            letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {partida.time_fora.nome}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <span style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'rgba(255,255,255,0.25)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {partida.competicao}
          </span>
          <span className="text-white/20 group-hover:text-[#00e676] group-hover:translate-x-1 transition-all duration-200 text-sm">→</span>
        </div>
      </div>
    </button>
  );
});

MatchCard.displayName = 'MatchCard';
export default MatchCard;
