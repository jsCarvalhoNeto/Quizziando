import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface KahootCountdownProps {
  /** Duração em segundos da contagem (padrão: 7) */
  seconds?: number;
  /** Chamado assim que a contagem chega ao fim */
  onComplete?: () => void;
  /** Se deve reproduzir bips sonoros a cada segundo */
  soundEnabled?: boolean;
  /** Texto ou elemento complementar opcional acima do contador */
  title?: string;
  /** Se deve cobrir a tela inteira com backdrop roxo suave como overlay */
  overlay?: boolean;
}

// Síntese de áudio Web Audio API (100% offline, sem latência)
class CountdownAudio {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playTick(number: number) {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    // Frequências crescentes conforme a contagem avança de 7 até 1 (estilo Kahoot)
    const freqs: Record<number, number> = {
      7: 330,    // E4
      6: 370,    // F#4
      5: 392,    // G4
      4: 415.3,  // G#4
      3: 440,    // A4
      2: 523.25, // C5
      1: 659.25, // E5
    };
    const freq = freqs[number] || 440;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.05, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.22);
  }

  playGo() {
    const ctx = this.getContext();
    if (!ctx) return;

    // Dois tons harmoniosos para o momento de liberação das alternativas
    [880, 1174.66].forEach((f) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, ctx.currentTime);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    });
  }
}

const countdownSfx = new CountdownAudio();

export const KahootCountdown: React.FC<KahootCountdownProps> = ({
  seconds = 7,
  onComplete,
  soundEnabled = true,
  title,
  overlay = false,
}) => {
  const [currentCount, setCurrentCount] = useState<number>(seconds);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setCurrentCount(seconds);
  }, [seconds]);

  useEffect(() => {
    if (soundEnabled && currentCount > 0) {
      countdownSfx.playTick(currentCount);
    }

    if (currentCount <= 0) {
      if (soundEnabled) {
        countdownSfx.playGo();
      }
      const timer = setTimeout(() => {
        onCompleteRef.current?.();
      }, 250);
      return () => clearTimeout(timer);
    }

    const interval = setTimeout(() => {
      setCurrentCount((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(interval);
  }, [currentCount, soundEnabled]);

  if (currentCount <= 0) return null;

  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        userSelect: 'none',
      }}
    >
      {title && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: 'clamp(18px, 2.5vw, 24px)',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            margin: 0,
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.6)',
          }}
        >
          {title}
        </motion.p>
      )}

      {/* Quadrado Roxo Estilo Kahoot */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={currentCount}
          initial={{ scale: 0.65, opacity: 0, rotate: -2 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 1.15, opacity: 0, filter: 'blur(4px)' }}
          transition={{
            type: 'spring',
            stiffness: 450,
            damping: 24,
          }}
          style={{
            width: 'clamp(170px, 22vw, 240px)',
            height: 'clamp(170px, 22vw, 240px)',
            backgroundColor: '#46178f', // Roxo Kahoot exato da imagem de referência
            borderRadius: '6px', // Cantos sutilmente suavizados, fiéis à referência
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(70, 23, 143, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative',
          }}
        >
          <span
            style={{
              color: '#ffffff',
              fontSize: 'clamp(85px, 12vw, 130px)',
              fontWeight: 900,
              fontFamily: "'Montserrat', 'Outfit', 'Inter', system-ui, sans-serif",
              lineHeight: 1,
              textShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
            }}
          >
            {currentCount}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );

  if (overlay) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(30, 10, 60, 0.55)', // Filtro arroxeado suave sobre o background como na foto
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}
      >
        {content}
      </div>
    );
  }

  return content;
};

export default KahootCountdown;
