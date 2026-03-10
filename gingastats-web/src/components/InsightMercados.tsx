import type { Insight } from '../types/types';

const COR_TENDENCIA: Record<'over' | 'under', string> = {
  over: 'text-emerald-400',
  under: 'text-red-400',
};

const COR_CONFIANCA: Record<string, string> = {
  alta: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  media: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  baixa: 'bg-red-500/20 text-red-400 border-red-500/30',
};

interface Props {
  insight: Insight;
  timeCasa: string;
  timeFora: string;
}

function MercadoCard({ titulo, mercado }: { titulo: string; mercado: any }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest">{titulo}</h3>
        <span className={`text-xs px-2 py-1 rounded-lg border font-semibold ${COR_CONFIANCA[mercado.confianca]}`}>
          {mercado.confianca}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4 text-center">
        <div>
          <p className="text-xs text-white/40 mb-1">Mandante</p>
          <p className="text-xl font-black">{mercado.media_casa}</p>
        </div>
        <div>
          <p className="text-xs text-white/40 mb-1">Total</p>
          <p className="text-xl font-black text-white">{mercado.media_total}</p>
        </div>
        <div>
          <p className="text-xs text-white/40 mb-1">Visitante</p>
          <p className="text-xl font-black">{mercado.media_fora}</p>
        </div>
      </div>
      <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
        <div>
          <p className="text-xs text-white/40">Linha sugerida</p>
          <p className="text-lg font-black">{mercado.linha_sugerida}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/40">Tendência</p>
          <p className={`text-lg font-black uppercase ${COR_TENDENCIA[mercado.tendencia as 'over' | 'under']}`}>
            {mercado.tendencia}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function InsightMercados({ insight }: Props) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <MercadoCard titulo="Escanteios" mercado={insight.escanteios} />
      <MercadoCard titulo="Cartões" mercado={insight.cartoes} />
    </div>
  );
}
