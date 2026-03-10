import { useState } from 'react';
import type { AnaliseIa, MercadoIa } from '../types/types';
import { getAnaliseIa } from '../api/api';

const COR_CONFIANCA: Record<string, string> = {
  Alta: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Média: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Baixa: 'bg-red-500/20 text-red-400 border-red-500/30',
};

interface Props {
  partidaId: number;
  jogos?: number;
}

export default function AnaliseIaSection({ partidaId, jogos = 10 }: Props) {
  const [analise, setAnalise] = useState<AnaliseIa | null>(null);
  const [loading, setLoading] = useState(false);
  const [solicitado, setSolicitado] = useState(false);

  const solicitar = async () => {
    setSolicitado(true);
    setLoading(true);
    try {
      const r = await getAnaliseIa(partidaId, jogos);
      setAnalise(r.analise_ia);
    } finally {
      setLoading(false);
    }
  };

  if (!solicitado) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 bg-gradient-to-br from-[#00e676]/20 to-[#00bcd4]/20 border border-[#00e676]/30 rounded-xl flex items-center justify-center mx-auto mb-4">
          <span className="text-[#00e676] text-xl">✦</span>
        </div>
        <h3 className="font-bold text-lg mb-2">Análise Inteligente</h3>
        <p className="text-base text-white/40 mb-6 max-w-sm mx-auto leading-relaxed">
          Gera uma análise aprofundada dos principais mercados com base nas estatísticas deste confronto.
        </p>
        <button
          onClick={solicitar}
          className="bg-[#00e676] hover:bg-[#00e676]/90 text-black font-bold text-base px-8 py-3 rounded-xl transition-all active:scale-95"
        >
          Gerar análise
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-[#00e676]">✦</span>
          <h3 className="text-base font-bold text-white/60 uppercase tracking-widest">Análise Inteligente</h3>
          <div className="w-4 h-4 border border-[#00e676] border-t-transparent rounded-full animate-spin ml-auto" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-white/10 rounded animate-pulse" style={{ width: `${90 - i * 8}%` }} />
          ))}
        </div>
        <p className="text-sm text-white/30 mt-4 text-center">Analisando estatísticas...</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-[#00e676]">✦</span>
        <h3 className="text-base font-bold text-white/60 uppercase tracking-widest">Análise Inteligente</h3>
      </div>

      {analise && (
        <div className="space-y-6">
          {/* Resumo */}
          <p className="text-base text-white/70 leading-relaxed">{analise.resumo}</p>

          {/* Projeção de gols */}
          {analise.projecao_ia && (
            <div className="bg-white/5 rounded-xl p-5">
              <p className="text-sm text-white/40 uppercase tracking-widest mb-4">Projeção de gols</p>
              <div className="flex gap-8 mb-3">
                <div className="text-center">
                  <p className="text-sm text-white/40 mb-1">Gols esperados — Casa</p>
                  <p className="text-2xl font-black text-[#00e676]">{analise.projecao_ia.lambda_casa}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-white/40 mb-1">Gols esperados — Fora</p>
                  <p className="text-2xl font-black text-[#00e676]">{analise.projecao_ia.lambda_fora}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-white/40 mb-1">Total esperado</p>
                  <p className="text-2xl font-black text-white">{analise.projecao_ia.lambda_total}</p>
                </div>
              </div>
              <p className="text-sm text-white/50 italic">{analise.projecao_ia.interpretacao}</p>
            </div>
          )}

          {/* Mercados */}
          <div className="space-y-3">
            {analise.mercados.map((m: MercadoIa) => (
              <div key={m.mercado} className="border border-white/10 rounded-xl p-5">
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
            ))}
          </div>

          {/* Alerta */}
          {analise.alerta && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 flex gap-2">
              <span className="text-yellow-400 text-base">⚠</span>
              <p className="text-sm text-yellow-400/80 leading-relaxed">{analise.alerta}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}