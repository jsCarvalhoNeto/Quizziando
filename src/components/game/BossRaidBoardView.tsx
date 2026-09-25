// src/components/game/BossRaidBoardView.tsx
// Componente de Telão para a Batalha contra o Chefe (Boss Raid Coletivo)

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Swords, 
  Trophy, 
  Sparkles 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { type BossDef, RAID_BOSSES } from '../../lib/bossRaid';

interface DamagePopup {
  id: number;
  amount: number;
  isCritical: boolean;
  dealer?: string;
}

interface BossRaidBoardViewProps {
  boss?: BossDef;
  bossHp: number;
  bossMaxHp: number;
  teamShieldHp: number;
  teamShieldMaxHp: number;
  currentRound: number;
  totalRounds: number;
  lastDamageTaken?: number | null;
  lastDamageDealer?: string | null;
  isCritical?: boolean;
  onFinishBattle?: () => void;
  onSelectAnotherBoss?: (boss: BossDef) => void;
  onStartRound?: () => void;
  canStartRound?: boolean;
  soundEnabled?: boolean;
}

export const BossRaidBoardView: React.FC<BossRaidBoardViewProps> = ({
  boss = RAID_BOSSES[0],
  bossHp,
  bossMaxHp,
  teamShieldHp,
  teamShieldMaxHp,
  currentRound,
  totalRounds,
  lastDamageTaken,
  lastDamageDealer,
  isCritical = false,
  onFinishBattle,
  onSelectAnotherBoss: _onSelectAnotherBoss,
  onStartRound,
  canStartRound = true,
  soundEnabled: _soundEnabled = true,
}) => {
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const [bossShake, setBossShake] = useState(false);
  const [bossQuote, setBossQuote] = useState<string>('');

  const hpPercent = Math.max(0, Math.min(100, Math.round((bossHp / bossMaxHp) * 100)));
  const shieldPercent = Math.max(0, Math.min(100, Math.round((teamShieldHp / teamShieldMaxHp) * 100)));

  const isEnraged = hpPercent <= 40 && hpPercent > 0;
  const isDefeated = bossHp <= 0;

  // Disparo de danos e efeitos ao receber ataque
  useEffect(() => {
    if (lastDamageTaken && lastDamageTaken > 0) {
      const newPopup: DamagePopup = {
        id: Date.now() + Math.random(),
        amount: lastDamageTaken,
        isCritical,
        dealer: lastDamageDealer || undefined,
      };

      setDamagePopups(prev => [...prev.slice(-3), newPopup]);
      setBossShake(true);

      const timer = setTimeout(() => setBossShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [lastDamageTaken, isCritical, lastDamageDealer]);

  // Efeito de vitória quando o chefe é derrotado
  useEffect(() => {
    if (isDefeated) {
      try {
        confetti({
          particleCount: 120,
          spread: 90,
          origin: { y: 0.5 }
        });
      } catch {}
      const victoryQuote = boss.victoryQuotes[Math.floor(Math.random() * boss.victoryQuotes.length)];
      setBossQuote(victoryQuote);
    }
  }, [isDefeated, boss]);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1240px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        padding: '16px',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {/* ─── 1. BARRA SUPERIOR DO CHEFE (BOSS HUD) ─── */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          width: '100%',
          background: 'rgba(15, 23, 42, 0.85)',
          border: `1.5px solid ${isEnraged ? '#EF4444' : 'rgba(255, 255, 255, 0.12)'}`,
          backdropFilter: 'blur(16px)',
          borderRadius: '24px',
          padding: '18px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: isEnraged 
            ? '0 0 35px rgba(239, 68, 68, 0.4), 0 10px 30px rgba(0,0,0,0.6)'
            : '0 10px 30px rgba(0,0,0,0.4)',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Identificação e Fase */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: boss.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 16px ${boss.accentColor}66`
            }}>
              <Swords style={{ width: 22, height: 22, color: 'white' }} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 900, color: 'white', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                  {boss.name}
                </h2>
                {isEnraged && (
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 999,
                    backgroundColor: '#EF4444',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 900,
                    letterSpacing: '0.05em',
                    animation: 'pulse 1s infinite'
                  }}>
                    MODO FÚRIA 🔥
                  </span>
                )}
                {isDefeated && (
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 999,
                    backgroundColor: '#10B981',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 900,
                    letterSpacing: '0.05em'
                  }}>
                    DERROTADO 👑
                  </span>
                )}
              </div>
              <p style={{ margin: 0, color: '#94A3B8', fontSize: '12px', fontWeight: 600 }}>
                {boss.title}
              </p>
            </div>
          </div>

          {/* Indicador de Rodada e HP Numérico */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Vida do Chefe
              </span>
              <p style={{ margin: 0, color: isEnraged ? '#FCA5A5' : 'white', fontSize: '18px', fontWeight: 900, fontFamily: 'Outfit, monospace' }}>
                {bossHp.toLocaleString('pt-BR')} <span style={{ fontSize: 13, color: '#94A3B8' }}>/ {bossMaxHp.toLocaleString('pt-BR')} ({hpPercent}%)</span>
              </p>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.06)',
              padding: '6px 14px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: '13px',
              fontWeight: 800,
              color: '#C4B5FD'
            }}>
              Rodada {currentRound} / {totalRounds}
            </div>
          </div>
        </div>

        {/* Barra de Vida Fluida do Chefe */}
        <div style={{
          width: '100%',
          height: '20px',
          borderRadius: '999px',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)'
        }}>
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: `${hpPercent}%` }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            style={{
              height: '100%',
              background: isEnraged 
                ? 'linear-gradient(90deg, #DC2626 0%, #EF4444 50%, #F59E0B 100%)'
                : boss.gradient,
              borderRadius: '999px',
              boxShadow: `0 0 20px ${boss.accentColor}`,
            }}
          />
        </div>
      </motion.div>

      {/* ─── 2. ARENA CENTRAL: O CHEFE EM BATALHA ─── */}
      <div style={{
        position: 'relative',
        width: '100%',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Imagem do Chefe com Efeito de Flutuação e Reação a Danos */}
        <motion.div
          animate={bossShake 
            ? { x: [-10, 10, -8, 8, -4, 4, 0], scale: [1, 0.96, 1.02, 1] } 
            : isDefeated 
              ? { scale: 0.9, opacity: 0.6, filter: 'grayscale(0.8)' }
              : { y: [0, -12, 0], scale: isEnraged ? [1, 1.03, 1] : 1 }
          }
          transition={bossShake 
            ? { duration: 0.45 } 
            : { repeat: Infinity, duration: isEnraged ? 2 : 4, ease: 'easeInOut' }
          }
          style={{
            position: 'relative',
            width: 'clamp(260px, 35vw, 380px)',
            height: 'clamp(260px, 35vw, 380px)',
            borderRadius: '32px',
            overflow: 'hidden',
            boxShadow: isEnraged 
              ? '0 0 50px rgba(239, 68, 68, 0.6), 0 20px 50px rgba(0,0,0,0.8)'
              : `0 0 40px ${boss.accentColor}66, 0 20px 50px rgba(0,0,0,0.7)`,
            border: `3px solid ${isEnraged ? '#EF4444' : boss.accentColor}`,
          }}
        >
          <img
            src={boss.image}
            alt={boss.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: bossShake ? 'brightness(1.6) contrast(1.2)' : 'none',
              transition: 'filter 0.15s ease'
            }}
          />

          {/* Overlay de Efeito de Fúria */}
          {isEnraged && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at center, transparent 40%, rgba(239, 68, 68, 0.35) 100%)',
              pointerEvents: 'none'
            }} />
          )}
        </motion.div>

        {/* 💥 POP-UPS DE DANO FLUTUANTES (RPG STYLE) */}
        <div style={{ position: 'absolute', top: '25%', pointerEvents: 'none' }}>
          <AnimatePresence>
            {damagePopups.map((popup) => (
              <motion.div
                key={popup.id}
                initial={{ opacity: 1, scale: 0.6, y: 0 }}
                animate={{ opacity: 0, scale: popup.isCritical ? 1.4 : 1.1, y: -90 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                  fontWeight: 900,
                  fontSize: popup.isCritical ? '36px' : '26px',
                  color: popup.isCritical ? '#FDE047' : '#F87171',
                  textShadow: popup.isCritical 
                    ? '0 0 16px rgba(253, 224, 71, 0.8), 0 4px 8px rgba(0,0,0,0.9)'
                    : '0 0 12px rgba(239, 68, 68, 0.8), 0 4px 8px rgba(0,0,0,0.9)',
                  fontFamily: "'Outfit', sans-serif",
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <span>-{popup.amount}</span>
                {popup.isCritical && (
                  <span style={{ fontSize: '13px', color: '#FCD34D', letterSpacing: '0.1em' }}>
                    💥 DANO CRÍTICO!
                  </span>
                )}
                {popup.dealer && (
                  <span style={{ fontSize: '11px', color: '#FFFFFF', opacity: 0.9 }}>
                    por {popup.dealer}
                  </span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Falas do Chefe ou Provocações */}
        {bossQuote && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              borderRadius: '16px',
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              border: `1.5px solid ${boss.accentColor}`,
              color: 'white',
              fontSize: '14px',
              fontWeight: 700,
              fontStyle: 'italic',
              maxWidth: '500px',
              textAlign: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
            }}
          >
            "{bossQuote}"
          </motion.div>
        )}
      </div>

      {/* ─── 3. RODAPÉ DA TURMA: ESCUDO COLETIVO E AÇÕES ─── */}
      <div style={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 1.2fr) minmax(280px, 1fr)',
        gap: '16px',
        alignItems: 'center',
      }}>
        {/* Escudo de Proteção da Turma */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield style={{ width: 18, height: 18, color: '#38BDF8' }} />
              <span style={{ color: 'white', fontWeight: 800, fontSize: '13px' }}>
                Escudo Coletivo da Turma
              </span>
            </div>
            <span style={{ color: '#38BDF8', fontWeight: 900, fontSize: '13px', fontFamily: 'monospace' }}>
              {teamShieldHp} / {teamShieldMaxHp} ({shieldPercent}%)
            </span>
          </div>

          <div style={{
            width: '100%',
            height: '10px',
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: '999px',
            overflow: 'hidden'
          }}>
            <motion.div
              animate={{ width: `${shieldPercent}%` }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #0284C7 0%, #38BDF8 100%)',
                borderRadius: '999px',
                boxShadow: '0 0 10px rgba(56, 189, 248, 0.5)'
              }}
            />
          </div>
        </div>

        {/* Status de Cooperação e Vitória */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isDefeated ? (
              <>
                <Trophy style={{ width: 28, height: 28, color: '#FBBF24' }} />
                <div>
                  <h4 style={{ margin: 0, color: '#FBBF24', fontSize: '14px', fontWeight: 900 }}>
                    VITÓRIA COLETIVA!
                  </h4>
                  <p style={{ margin: 0, color: '#94A3B8', fontSize: '12px' }}>
                    A turma triunfou com conhecimento!
                  </p>
                </div>
              </>
            ) : (
              <>
                <Sparkles style={{ width: 22, height: 22, color: '#A78BFA' }} />
                <div>
                  <h4 style={{ margin: 0, color: 'white', fontSize: '13px', fontWeight: 800 }}>
                    Trabalho em Equipe
                  </h4>
                  <p style={{ margin: 0, color: '#94A3B8', fontSize: '11px' }}>
                    Cada acerto rápido desfere Dano Crítico!
                  </p>
                </div>
              </>
            )}
          </div>

          {onStartRound && !isDefeated && (
            <motion.button
              whileHover={canStartRound ? { scale: 1.04 } : {}}
              whileTap={canStartRound ? { scale: 0.96 } : {}}
              disabled={!canStartRound}
              onClick={onStartRound}
              style={{
                padding: '12px 28px',
                borderRadius: '16px',
                background: canStartRound
                  ? 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)'
                  : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: canStartRound ? '2px solid rgba(253, 164, 175, 0.5)' : 'none',
                fontWeight: 900,
                fontSize: '15px',
                cursor: canStartRound ? 'pointer' : 'not-allowed',
                boxShadow: canStartRound ? '0 6px 20px rgba(225, 29, 72, 0.5)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.2s ease',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}
            >
              <Swords style={{ width: 18, height: 18 }} />
              <span>ATACAR CHEFE (RODADA {currentRound})</span>
            </motion.button>
          )}

          {onFinishBattle && isDefeated && (
            <button
              onClick={onFinishBattle}
              style={{
                padding: '12px 24px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                fontWeight: 900,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)'
              }}
            >
              Comemorar Vitória da Turma 👑
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
