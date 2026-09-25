import React from 'react';

export interface AmbientBorderGlowProps {
  /** Se a iluminação está ativa (ex: rodada em andamento ou revelação) */
  active?: boolean;
  /** Segundos restantes no cronômetro */
  remainingSeconds: number;
  /** Tempo total da pergunta em segundos (padrão: 20) */
  totalSeconds?: number;
  /** Se a rodada foi pausada pelo professor */
  isPaused?: boolean;
  /** Se as respostas já foram reveladas */
  isAnswered?: boolean;
  /** Resultado individual ou coletivo (true: acerto, false: erro, null: neutro do telão) */
  isCorrect?: boolean | null;
  /** Nível de intensidade visual ('cinematic' para telão, 'subtle' para celular) */
  intensity?: 'cinematic' | 'compact' | 'subtle';
  /** Z-index da camada de luz (padrão: 35) */
  zIndex?: number;
}

export const AmbientBorderGlow: React.FC<AmbientBorderGlowProps> = ({
  active = true,
  remainingSeconds,
  totalSeconds = 20,
  isPaused = false,
  isAnswered = false,
  isCorrect = null,
  intensity = 'cinematic',
  zIndex = 35
}) => {
  if (!active) return null;

  const validTotal = Math.max(1, totalSeconds || 20);
  const ratio = Math.max(0, Math.min(1, remainingSeconds / validTotal));

  // Determina o estado da iluminação com base no tempo e estado da rodada
  let phase: 'safe' | 'warning' | 'danger' | 'paused' | 'celebration' | 'error' = 'safe';

  if (isPaused) {
    phase = 'paused';
  } else if (isAnswered) {
    if (isCorrect === true) {
      phase = 'safe';
    } else if (isCorrect === false) {
      phase = 'error';
    } else {
      phase = 'celebration';
    }
  } else {
    if (remainingSeconds <= 5 || ratio <= 0.25) {
      phase = 'danger';
    } else if (remainingSeconds <= 10 || ratio <= 0.5) {
      phase = 'warning';
    } else {
      phase = 'safe';
    }
  }

  // Configurações de cores e animações por fase
  const configs = {
    safe: {
      color: '#10b981',
      rgba: 'rgba(16, 185, 129,',
      animation: 'ambientPulseGreen 3s ease-in-out infinite',
      beamGradient: 'linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0.8) 50%, transparent 100%)',
      label: 'Tempo Confortável'
    },
    warning: {
      color: '#f59e0b',
      rgba: 'rgba(245, 158, 11,',
      animation: 'ambientPulseAmber 1.6s ease-in-out infinite',
      beamGradient: 'linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.85) 50%, transparent 100%)',
      label: 'Atenção ao Tempo'
    },
    danger: {
      color: '#ef4444',
      rgba: 'rgba(239, 68, 68,',
      animation: 'ambientPulseRedHeartbeat 0.75s ease-in-out infinite',
      beamGradient: 'linear-gradient(90deg, transparent 0%, rgba(239, 68, 68, 1) 50%, transparent 100%)',
      label: 'Contagem Regressiva Final'
    },
    paused: {
      color: '#eab308',
      rgba: 'rgba(234, 179, 8,',
      animation: 'ambientPulsePaused 2.5s ease-in-out infinite',
      beamGradient: 'linear-gradient(90deg, transparent 0%, rgba(234, 179, 8, 0.9) 50%, transparent 100%)',
      label: 'Tempo Congelado'
    },
    celebration: {
      color: '#8b5cf6',
      rgba: 'rgba(139, 92, 246,',
      animation: 'ambientPulseCelebration 2.2s ease-in-out infinite',
      beamGradient: 'linear-gradient(90deg, transparent 0%, rgba(139, 92, 246, 0.85) 50%, transparent 100%)',
      label: 'Respostas Reveladas'
    },
    error: {
      color: '#dc2626',
      rgba: 'rgba(220, 38, 38,',
      animation: 'ambientPulseRedHeartbeat 1.5s ease-in-out infinite',
      beamGradient: 'linear-gradient(90deg, transparent 0%, rgba(220, 38, 38, 0.8) 50%, transparent 100%)',
      label: 'Resposta Incorreta'
    }
  };

  const current = configs[phase];

  // Escala de espessura e difusão conforme intensidade (telão vs smartphone)
  const isCinematic = intensity === 'cinematic';
  const isCompact = intensity === 'compact';
  const beamThickness = isCinematic ? 4 : isCompact ? 3 : 2;
  const spreadDistance = isCinematic ? '90px' : isCompact ? '55px' : '30px';
  const innerDistance = isCinematic ? '30px' : isCompact ? '18px' : '10px';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex,
        overflow: 'hidden',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      aria-hidden="true"
    >
      {/* ─── 1. VINHETA PERIFÉRICA DINÂMICA (RADIAL / INSET SHADOW) ─── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          boxShadow: `inset 0 0 ${spreadDistance} ${current.rgba} 0.35), inset 0 0 ${innerDistance} ${current.rgba} 0.6)`,
          animation: current.animation,
          transition: 'box-shadow 0.4s ease-out'
        }}
      />

      {/* ─── 2. FEIXES NEON PERIMETRAIS DE ALTA LUMINOSIDADE (BORDAS DA TELA) ─── */}
      {/* Feixe Superior */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '5%',
          right: '5%',
          height: `${beamThickness}px`,
          background: current.beamGradient,
          boxShadow: `0 0 16px ${current.color}, 0 0 32px ${current.color}`,
          filter: isCinematic ? 'blur(1px)' : 'none',
          transition: 'background 0.4s ease-out, box-shadow 0.4s ease-out'
        }}
      />

      {/* Feixe Inferior */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '5%',
          right: '5%',
          height: `${beamThickness}px`,
          background: current.beamGradient,
          boxShadow: `0 0 16px ${current.color}, 0 0 32px ${current.color}`,
          filter: isCinematic ? 'blur(1px)' : 'none',
          transition: 'background 0.4s ease-out, box-shadow 0.4s ease-out'
        }}
      />

      {/* Feixe Lateral Esquerdo */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: '10%',
          bottom: '10%',
          width: `${beamThickness}px`,
          background: `linear-gradient(180deg, transparent 0%, ${current.color} 50%, transparent 100%)`,
          boxShadow: `0 0 16px ${current.color}, 0 0 28px ${current.color}`,
          filter: isCinematic ? 'blur(1px)' : 'none',
          transition: 'background 0.4s ease-out, box-shadow 0.4s ease-out'
        }}
      />

      {/* Feixe Lateral Direito */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: '10%',
          bottom: '10%',
          width: `${beamThickness}px`,
          background: `linear-gradient(180deg, transparent 0%, ${current.color} 50%, transparent 100%)`,
          boxShadow: `0 0 16px ${current.color}, 0 0 28px ${current.color}`,
          filter: isCinematic ? 'blur(1px)' : 'none',
          transition: 'background 0.4s ease-out, box-shadow 0.4s ease-out'
        }}
      />
    </div>
  );
};

export default AmbientBorderGlow;
