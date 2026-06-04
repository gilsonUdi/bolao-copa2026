'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

// Silhueta SVG de jogador chutando
function PlayerSilhouette({ kicking }: { kicking: boolean }) {
  return (
    <svg
      width="80"
      height="100"
      viewBox="0 0 80 100"
      fill="rgba(244,168,29,0.85)"
      style={{
        transition: 'transform 0.15s ease',
        transform: kicking ? 'scaleX(-1)' : 'none',
        filter: 'drop-shadow(0 0 8px rgba(244,168,29,0.5))',
      }}
    >
      {/* Cabeça */}
      <circle cx="42" cy="12" r="9" />

      {/* Corpo */}
      <path d="M42 21 Q38 40 36 55 Q44 58 52 54 Q50 40 42 21Z" />

      {/* Braço esq (levantado) */}
      <line x1="40" y1="32" x2="22" y2="22" stroke="rgba(244,168,29,0.85)" strokeWidth="5" strokeLinecap="round" />

      {/* Braço dir */}
      <line x1="44" y1="32" x2="58" y2="40" stroke="rgba(244,168,29,0.85)" strokeWidth="5" strokeLinecap="round" />

      {/* Perna de apoio */}
      <line x1="38" y1="55" x2="34" y2="78" stroke="rgba(244,168,29,0.85)" strokeWidth="6" strokeLinecap="round" />
      <line x1="34" y1="78" x2="30" y2="95" stroke="rgba(244,168,29,0.85)" strokeWidth="6" strokeLinecap="round" />

      {/* Perna de chute - usa transform SVG nativo com ponto de rotação fixo */}
      <g transform={kicking ? 'rotate(-55, 48, 55)' : 'rotate(20, 48, 55)'}
        style={{ transition: 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        <line x1="48" y1="55" x2="62" y2="74" stroke="rgba(244,168,29,0.85)" strokeWidth="6" strokeLinecap="round" />
        <line x1="62" y1="74" x2="72" y2="88" stroke="rgba(244,168,29,0.85)" strokeWidth="6" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// Confete ao marcar gol
function Confete() {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: 45 + Math.cos((i / 18) * Math.PI * 2) * (20 + Math.random() * 40),
    y: 50 + Math.sin((i / 18) * Math.PI * 2) * (20 + Math.random() * 40),
    color: ['#F4A81D', '#009A44', '#C8102E', '#ffffff', '#1B3A6B'][i % 5],
    size: 6 + Math.random() * 8,
  }));

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ animation: 'confeteExplode 0.6s ease-out forwards' }}
    >
      {particles.map((p) => (
        <circle key={p.id} cx={`${p.x}%`} cy={`${p.y}%`} r={p.size} fill={p.color} opacity="0.9" />
      ))}
    </svg>
  );
}

export default function BallKickEffect() {
  const [phase, setPhase] = useState<'idle' | 'kick' | 'flying' | 'goal'>('idle');
  const cooldown = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => timers.current.forEach(clearTimeout);

  const triggerKick = useCallback(() => {
    if (cooldown.current) return;
    cooldown.current = true;
    clearTimers();

    setPhase('kick');

    const t1 = setTimeout(() => setPhase('flying'), 250);
    const t2 = setTimeout(() => setPhase('goal'), 1400);
    const t3 = setTimeout(() => {
      setPhase('idle');
      cooldown.current = false;
    }, 3600);

    timers.current = [t1, t2, t3];
  }, []);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 20) triggerKick();
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      clearTimers();
    };
  }, [triggerKick]);

  return (
    <>
      {/* Jogador fixo no canto inferior esquerdo */}
      <div
        className="fixed bottom-4 left-4 z-40 pointer-events-none select-none"
        style={{ transform: 'translateZ(0)' }}
      >
        <PlayerSilhouette kicking={phase === 'kick' || phase === 'flying' || phase === 'goal'} />

        {/* Bola parada no pé do jogador */}
        {phase === 'idle' && (
          <div
            style={{
              position: 'absolute',
              bottom: 4,
              right: -4,
              fontSize: 22,
              animation: 'bolaFlutua 2s ease-in-out infinite',
            }}
          >
            ⚽
          </div>
        )}
      </div>

      {/* Bola voando em arco */}
      {(phase === 'flying' || phase === 'goal') && (
        <div
          style={{
            position: 'fixed',
            bottom: 40,
            left: 80,
            fontSize: 30,
            pointerEvents: 'none',
            zIndex: 50,
            animation: 'bolaChute 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
            transformOrigin: 'center',
          }}
        >
          ⚽
        </div>
      )}

      {/* Trave / gol — canto direito meio-superior */}
      <div
        className="fixed right-4 z-40 pointer-events-none"
        style={{
          top: '18%',
          opacity: phase === 'idle' ? 0.15 : 0.6,
          transition: 'opacity 0.3s',
        }}
      >
        <svg width="60" height="50" viewBox="0 0 60 50" fill="none">
          {/* Trave superior */}
          <rect x="2" y="4" width="56" height="4" rx="2" fill="#F4A81D" />
          {/* Poste esq */}
          <rect x="2" y="4" width="4" height="44" rx="2" fill="#F4A81D" />
          {/* Poste dir */}
          <rect x="54" y="4" width="4" height="44" rx="2" fill="#F4A81D" />
          {/* Rede (linhas) */}
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={14 + i * 12} y1="8" x2={14 + i * 12} y2="48" stroke="#F4A81D" strokeWidth="1" strokeOpacity="0.4" />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1="6" y1={16 + i * 10} x2="54" y2={16 + i * 10} stroke="#F4A81D" strokeWidth="1" strokeOpacity="0.4" />
          ))}
        </svg>
      </div>

      {/* GOOOOOL + explosão */}
      {phase === 'goal' && (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none z-50"
          style={{ animation: 'goalFadeIn 0.4s ease-out forwards' }}
        >
          <Confete />

          {/* Glow radial */}
          <div
            style={{
              position: 'absolute',
              width: 300,
              height: 300,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(244,168,29,0.35) 0%, transparent 70%)',
              animation: 'goalGlow 0.5s ease-out forwards',
            }}
          />

          <div
            style={{
              fontSize: 'clamp(2.5rem, 8vw, 5rem)',
              fontWeight: 900,
              color: '#F4A81D',
              textShadow: '0 0 40px #F4A81D, 0 0 80px rgba(244,168,29,0.5)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              animation: 'goalText 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              transform: 'scale(0)',
            }}
          >
            GOOOOOL! 🎉
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 'clamp(1rem, 3vw, 1.5rem)',
              color: 'rgba(255,255,255,0.7)',
              animation: 'goalText 0.5s 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              transform: 'scale(0)',
            }}
          >
            🏆 Copa do Mundo 2026
          </div>
        </div>
      )}

      {/* Estilos das animações */}
      <style>{`
        @keyframes bolaFlutua {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(15deg); }
        }

        @keyframes bolaChute {
          0% {
            transform: translate(0, 0) rotate(0deg) scale(1);
            opacity: 1;
          }
          20% {
            transform: translate(18vw, -30vh) rotate(270deg) scale(1.15);
            opacity: 1;
          }
          50% {
            transform: translate(48vw, -62vh) rotate(630deg) scale(1.2);
            opacity: 1;
          }
          80% {
            transform: translate(76vw, -52vh) rotate(900deg) scale(1.0);
            opacity: 1;
          }
          95% {
            transform: translate(83vw, -57vh) rotate(1080deg) scale(0.7);
            opacity: 0.9;
          }
          100% {
            transform: translate(84vw, -58vh) rotate(1080deg) scale(0.15);
            opacity: 0;
          }
        }

        @keyframes goalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes goalText {
          from { transform: scale(0) rotate(-10deg); opacity: 0; }
          to { transform: scale(1) rotate(0deg); opacity: 1; }
        }

        @keyframes goalGlow {
          from { transform: scale(0.3); opacity: 0; }
          to { transform: scale(2.5); opacity: 1; }
        }

        @keyframes confeteExplode {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}
