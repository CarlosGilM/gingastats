import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MediasTime from '../components/MediasTime';
import AnaliseIaSection from '../components/AnaliseIaSection';
import EscudoTime from '../components/EscudoTime';
import logoFull from '../assets/logo-full.png';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchConfrontoCompleto } from '../store/confronto/confrontoThunks';

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
      }} />
      <style>{`@keyframes orbPulse { 0%,100%{opacity:.6;transform:translateX(-50%) scale(1)} 50%{opacity:1;transform:translateX(-50%) scale(1.15)} }`}</style>
    </div>
  );
}

export default function Confronto() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch     = useAppDispatch();
  const dados        = useAppSelector((s) => s.confronto.dados);
  const statusDados  = useAppSelector((s) => s.confronto.statusDados);
  const loadingDados = statusDados === 'loading' || statusDados === 'idle';

  useEffect(() => {
    injectFonts();
    if (!id) return;
    dispatch(fetchConfrontoCompleto({ id: Number(id) }));
  }, [dispatch, id]);

  if (loadingDados) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#04070a' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#00e676] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>
            CARREGANDO ANÁLISE...
          </p>
        </div>
      </div>
    );
  }

  if (!dados) return null;

  const { partida } = dados;
  const tc = partida.time_casa;
  const tf = partida.time_fora;

  const dataFormatada = new Date(partida.data).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="min-h-screen text-white relative" style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '16px' }}>
      <PitchBackground />

      <div className="relative" style={{ zIndex: 1 }}>
        {/* ── Header ── */}
        <header style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', backgroundColor: 'rgba(4,7,10,0.97)', zIndex: 50 }}
          className="sticky top-0 px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center gap-3">
            <button onClick={() => navigate('/')}
              className="flex items-center gap-2 group transition-all"
              style={{ fontFamily: 'DM Mono', fontSize: 13, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>
              <span className="group-hover:-translate-x-1 transition-transform">←</span>
              <span className="group-hover:text-white transition-colors">VOLTAR</span>
            </button>
            <div className="w-px h-4 bg-white/10" />
            <img src={logoFull} alt="GingaStats" style={{ height: 32, objectFit: 'contain' }} />
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

          {/* ── Hero do confronto ── */}
          <div style={{
            animation: 'fadeUp 0.5s ease forwards', opacity: 0,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20, padding: '32px 24px',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* faixa verde de fundo */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: 'linear-gradient(90deg, transparent, #00e676, transparent)',
            }} />

            {/* competição + data */}
            <div className="text-center mb-8">
              <span style={{
                fontFamily: 'DM Mono', fontSize: 12, color: '#00e676',
                letterSpacing: '0.12em', background: 'rgba(0,230,118,0.08)',
                border: '1px solid rgba(0,230,118,0.2)', padding: '3px 10px', borderRadius: 4,
              }}>
                {partida.competicao}
              </span>
              <p style={{ fontFamily: 'DM Mono', fontSize: 13, color: 'rgba(255,255,255,0.25)', marginTop: 10, letterSpacing: '0.06em' }}>
                {dataFormatada}
              </p>
            </div>

            {/* times */}
            <div className="flex items-center justify-center gap-8 sm:gap-16">
              <div className="flex flex-col items-center gap-4">
                <div style={{ filter: 'drop-shadow(0 0 20px rgba(0,230,118,0.15))' }}>
                  <EscudoTime sofascoreId={tc.sofascore_id} nome={tc.nome} size={72} />
                </div>
                <div className="text-center">
                  <p style={{ fontWeight: 900, fontSize: 'clamp(22px, 3vw, 30px)', letterSpacing: '0.02em', lineHeight: 1 }}>
                    {tc.nome}
                  </p>
                  <p style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginTop: 4 }}>
                    MANDANTE
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <span style={{ fontWeight: 900, fontSize: 40, color: 'rgba(255,255,255,0.1)', lineHeight: 1 }}>×</span>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div style={{ filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.08))' }}>
                  <EscudoTime sofascoreId={tf.sofascore_id} nome={tf.nome} size={72} />
                </div>
                <div className="text-center">
                  <p style={{ fontWeight: 900, fontSize: 'clamp(22px, 3vw, 30px)', letterSpacing: '0.02em', lineHeight: 1 }}>
                    {tf.nome}
                  </p>
                  <p style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginTop: 4 }}>
                    VISITANTE
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Estatísticas ── */}
          <div style={{ animation: 'fadeUp 0.5s ease 0.1s forwards', opacity: 0 }}>
            <div className="flex items-center gap-3 mb-4">
              <div style={{ width: 3, height: 14, background: '#00e676', borderRadius: 2 }} />
              <span style={{ fontFamily: 'DM Mono', fontSize: 12, color: '#00e676', letterSpacing: '0.12em' }}>
                ESTATÍSTICAS
              </span>
              <div className="flex-1 h-px" style={{ background: 'rgba(0,230,118,0.12)' }} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <MediasTime
                nome={tc.nome}
                local="Mandante"
                medias={dados.time_casa.medias_gerais}
                mediasPorLocal={dados.time_casa.medias_em_casa}
                golsSofridos={dados.time_casa.gols_sofridos_em_casa}
                ultimoJogo={dados.time_casa.ultimo_jogo}
              />
              <MediasTime
                nome={tf.nome}
                local="Visitante"
                medias={dados.time_fora.medias_gerais}
                mediasPorLocal={dados.time_fora.medias_fora_casa}
                golsSofridos={dados.time_fora.gols_sofridos_fora}
                ultimoJogo={dados.time_fora.ultimo_jogo}
              />
            </div>
          </div>

          {/* ── Análise IA ── */}
          <div style={{ animation: 'fadeUp 0.5s ease 0.2s forwards', opacity: 0 }}>
            <div className="flex items-center gap-3 mb-4">
              <div style={{ width: 3, height: 14, background: '#00e676', borderRadius: 2 }} />
              <span style={{ fontFamily: 'DM Mono', fontSize: 12, color: '#00e676', letterSpacing: '0.12em' }}>
                ANÁLISE INTELIGENTE
              </span>
              <div className="flex-1 h-px" style={{ background: 'rgba(0,230,118,0.12)' }} />
            </div>
            <AnaliseIaSection partidaId={Number(id)} />
          </div>

        </main>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}