import React from 'react';
import type { MercadoIa } from '../types/types';

const COR_CONFIANCA: Record<string, string> = {
  Alta: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Média: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Baixa: 'bg-red-500/20 text-red-400 border-red-500/30',
};

interface MercadoCardProps {
  mercado: MercadoIa;
}

const MercadoCard = React.memo(({ mercado: m }: MercadoCardProps) => (
  <div className="border border-white/10 rounded-xl p-5">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-base font-bold">{m.mercado}</span>
        {m.linha !== null && (
          <span className="text-sm bg-white/10 px-2 py-0.5 rounded font-mono">{m.linha}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-base font-black text-[#00e676]">{m.sugestao}</span>
        <span className={`text-sm px-2 py-0.5 rounded border font-semibold ${COR_CONFIANCA[m.confianca]}`}>
          {m.confianca}
        </span>
      </div>
    </div>
    <p className="text-sm text-white/50 leading-relaxed">{m.justificativa}</p>
  </div>
));

MercadoCard.displayName = 'MercadoCard';
export default MercadoCard;
