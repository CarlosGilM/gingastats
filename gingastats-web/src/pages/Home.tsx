import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPartidas } from '../api/api';
import type { Partida } from '../types/types';
import EscudoTime from '../components/EscudoTime';
import logoFull from '../assets/logo-full.png';

const injectFonts = () => {
  if (document.getElementById('ginga-fonts')) return;
  const link = document.createElement('link');
  link.id = 'ginga-fonts';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=DM+Mono:wght@400;500&display=swap';
  document.head.appendChild(link);
};

function PitchBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #0d1f14 0%, #080c10 60%, #04070a 100%)'
      }} />
      <div style={{
        position: 'absolute', width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,230,118,0.04) 0%, transparent 70%)',
        top: '-100px', left: '50%', transform: 'translateX(-50%)',
        animation: 'orbPulse 8s ease-in-out infinite',
      }} />
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full opacity-[0.04]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="120" y="60" width="1200" height="780" rx="4" stroke="#00e676" strokeWidth="2" />
        <line x1="720" y1="60" x2="720" y2="840" stroke="#00e676" strokeWidth="1.5" />
        <circle cx="720" cy="450" r="120" stroke="#00e676" strokeWidth="1.5" />
        <circle cx="720" cy="450" r="4" fill="#00e676" />
        <rect x="120" y="270" width="195" height="360" stroke="#00e676" strokeWidth="1.5" />
        <rect x="120" y="360" width="75" height="180" stroke="#00e676" strokeWidth="1.5" />
        <rect x="1125" y="270" width="195" height="360" stroke="#00e676" strokeWidth="1.5" />
        <rect x="1245" y="360" width="75" height="180" stroke="#00e676" strokeWidth="1.5" />
        <circle cx="270" cy="450" r="4" fill="#00e676" />
        <circle cx="1170" cy="450" r="4" fill="#00e676" />
        <path d="M 315 330 A 120 120 0 0 1 315 570" stroke="#00e676" strokeWidth="1.5" fill="none" />
        <path d="M 1125 330 A 120 120 0 0 0 1125 570" stroke="#00e676" strokeWidth="1.5" fill="none" />
        <path d="M 120 90 A 24 24 0 0 1 144 60" stroke="#00e676" strokeWidth="1.5" />
        <path d="M 1296 60 A 24 24 0 0 1 1320 90" stroke="#00e676" strokeWidth="1.5" />
        <path d="M 120 810 A 24 24 0 0 0 144 840" stroke="#00e676" strokeWidth="1.5" />
        <path d="M 1296 840 A 24 24 0 0 0 1320 810" stroke="#00e676" strokeWidth="1.5" />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
        pointerEvents: 'none',
      }} />
      <style>{`
        @keyframes orbPulse {
          0%, 100% { opacity: 0.6; transform: translateX(-50%) scale(1); }
          50% { opacity: 1; transform: translateX(-50%) scale(1.15); }
        }
      `}</style>
    </div>
  );
}

function MatchCard({ partida, index, onClick }: { partida: Partida; index: number; onClick: () => void }) {
  const hora = new Date(partida.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <button
      onClick={onClick}
      className="w-full group relative text-left"
      style={{ animation: `slideIn 0.4s ease forwards`, animationDelay: `${index * 60}ms`, opacity: 0 }}
    >
      <div className="absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'linear-gradient(135deg, rgba(0,230,118,0.15), transparent 60%)' }} />

      <div className="relative flex items-center gap-3 px-5 py-4 rounded-xl border border-white/8 bg-white/[0.03] group-hover:bg-white/[0.06] group-hover:border-[#00e676]/25 transition-all duration-300">

        {/* hora */}
        <div className="flex-shrink-0 w-12 text-center">
          <span style={{ fontFamily: 'DM Mono', fontSize: 15, color: '#00e676', fontWeight: 500 }}>{hora}</span>
        </div>

        <div className="w-px h-8 bg-white/10 flex-shrink-0" />

        {/* time casa — metade esquerda */}
        <div className="flex items-center justify-end gap-2 overflow-hidden" style={{ flex: '1 1 0', minWidth: 0 }}>
          <span style={{
            fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 18,
            letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {partida.time_casa.nome}
          </span>
          <div className="flex-shrink-0">
            <EscudoTime sofascoreId={partida.time_casa.sofascore_id} nome={partida.time_casa.nome} size={30} />
          </div>
        </div>

        {/* VS — centro fixo */}
        <div className="flex-shrink-0 w-10 text-center">
          <span style={{ fontFamily: 'Barlow Condensed', fontWeight: 900, fontSize: 13, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.2)' }}>VS</span>
        </div>

        {/* time fora — metade direita */}
        <div className="flex items-center gap-2 overflow-hidden" style={{ flex: '1 1 0', minWidth: 0 }}>
          <div className="flex-shrink-0">
            <EscudoTime sofascoreId={partida.time_fora.sofascore_id} nome={partida.time_fora.nome} size={30} />
          </div>
          <span style={{
            fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 18,
            letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {partida.time_fora.nome}
          </span>
        </div>

        {/* competição + seta */}
        <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
          <span style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'rgba(255,255,255,0.25)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {partida.competicao}
          </span>
          <span className="text-white/20 group-hover:text-[#00e676] group-hover:translate-x-1 transition-all duration-200 text-sm">→</span>
        </div>
      </div>
    </button>
  );
}

export default function Home() {
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    injectFonts();
    getPartidas()
      .then(setPartidas)
      .finally(() => setLoading(false));
  }, []);

  const porData = partidas.reduce<Record<string, Partida[]>>((acc, p) => {
    const dia = new Date(p.data).toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long',
    }).toUpperCase();
    acc[dia] = [...(acc[dia] ?? []), p];
    return acc;
  }, {});

  return (
    <div className="min-h-screen text-white relative" style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '16px' }}>
      <PitchBackground />

      <div className="relative" style={{ zIndex: 1 }}>
        <header
          className="sticky top-0 px-6 py-4"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
            backgroundColor: 'rgba(4,7,10,0.97)',
            zIndex: 50,
          }}
        >
          <div className="max-w-3xl mx-auto flex items-center">
            <img src={logoFull} alt="GingaStats" style={{ height: 32, objectFit: 'contain' }} />
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-6 pt-12 pb-8">
          <div style={{ animation: 'fadeUp 0.6s ease forwards', opacity: 0 }}>
            <h1 style={{ fontWeight: 900, fontSize: 'clamp(36px, 6vw, 56px)', lineHeight: 0.95, letterSpacing: '-0.01em' }}>
              ANALISE E<br />
              <span style={{ color: '#00e676' }}>DECIDA.</span>
            </h1>
            <p style={{ fontFamily: 'DM Mono', fontSize: 14, color: 'rgba(255,255,255,0.35)', marginTop: 16, letterSpacing: '0.04em' }}>
              Selecione um confronto para ver a análise estatística completa
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 pb-16">
          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-[60px] rounded-xl animate-pulse"
                  style={{ background: 'rgba(255,255,255,0.04)', animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(porData).map(([dia, jogos], groupIndex) => {
                let cardIndex = 0;
                for (let i = 0; i < groupIndex; i++) {
                  cardIndex += Object.values(porData)[i].length;
                }
                return (
                  <div key={dia}>
                    <div className="flex items-center gap-3 mb-3">
                      <div style={{ width: 3, height: 14, background: '#00e676', borderRadius: 2 }} />
                      <span style={{ fontFamily: 'DM Mono', fontSize: 12, color: '#00e676', letterSpacing: '0.12em' }}>{dia}</span>
                      <div className="flex-1 h-px" style={{ background: 'rgba(0,230,118,0.12)' }} />
                      <span style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em' }}>
                        {jogos.length} {jogos.length === 1 ? 'JOGO' : 'JOGOS'}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {jogos.map((p, i) => (
                        <MatchCard key={p.id} partida={p} index={cardIndex + i} onClick={() => navigate(`/confronto/${p.id}`)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}