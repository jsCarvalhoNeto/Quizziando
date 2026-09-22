import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Plus, Minus, ArrowRight } from 'lucide-react';
import { type QuizBlockItem, getGridColumns } from '../../lib/blocks';
import { getAvatarUrl } from '../../lib/avatars';

export interface TeamScoreInfo {
  id: string;
  name: string;
  score: number;
  avatarUrl?: string;
}

interface BlocksBoardViewProps {
  blocks: QuizBlockItem[];
  currentRound?: number;
  totalRounds?: number;
  activeTeamIndex?: number;
  teams?: TeamScoreInfo[];
  isIndividual?: boolean;
  onSelectBlock: (block: QuizBlockItem) => void;
  onFinishGame?: () => void;
  soundEnabled?: boolean;
}

export const BlocksBoardView: React.FC<BlocksBoardViewProps> = ({
  blocks,
  activeTeamIndex = 0,
  teams = [],
  isIndividual = false,
  onSelectBlock,
  onFinishGame,
  soundEnabled: _soundEnabled = true,
}) => {
  const columns = getGridColumns(blocks.length);

  const revealedCount = blocks.filter(b => b.status === 'correct' || b.status === 'wrong').length;
  const isAllRevealed = blocks.length > 0 && revealedCount === blocks.length;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        padding: '16px',
        userSelect: 'none',
      }}
    >
      {/* ─── HEADER: EQUIPES OU STATUS INDIVIDUAL (ESTILO KAHOOT BLOCKS) ─── */}
      {!isIndividual && teams.length > 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            width: '100%',
          }}
        >
          {teams.map((team, idx) => {
            const isActive = idx === activeTeamIndex;
            const avatar = team.avatarUrl || getAvatarUrl(team.name);

            return (
              <motion.div
                key={team.id || team.name}
                initial={false}
                animate={{
                  scale: isActive ? 1.05 : 0.98,
                  borderColor: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.15)',
                  boxShadow: isActive
                    ? '0 0 24px rgba(255, 255, 255, 0.45), 0 8px 24px rgba(0, 0, 0, 0.4)'
                    : '0 4px 12px rgba(0, 0, 0, 0.2)',
                }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '10px 22px',
                  borderRadius: '24px',
                  backgroundColor: isActive
                    ? 'rgba(76, 29, 149, 0.88)'
                    : 'rgba(59, 7, 100, 0.55)',
                  backdropFilter: 'blur(10px)',
                  border: isActive ? '2.5px solid #ffffff' : '1.5px solid rgba(255, 255, 255, 0.15)',
                  position: 'relative',
                  cursor: 'default',
                  transition: 'background-color 0.2s',
                }}
              >
                {/* Avatar da Equipe com Mascote */}
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: '1.5px solid rgba(255, 255, 255, 0.25)',
                  }}
                >
                  <img
                    src={avatar}
                    alt={team.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>

                {/* Nome e Placar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        color: '#ffffff',
                        fontSize: '18px',
                        fontWeight: 900,
                        fontFamily: "'Outfit', sans-serif",
                        letterSpacing: '0.2px',
                      }}
                    >
                      {team.name}
                    </span>
                    {isActive && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          backgroundColor: '#10b981',
                          color: '#ffffff',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        Sua Vez
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: 'rgba(255, 255, 255, 0.9)',
                    }}
                  >
                    <Trophy style={{ width: '16px', height: '16px', color: '#facc15' }} />
                    <span
                      style={{
                        fontSize: '17px',
                        fontWeight: 900,
                        color: '#ffffff',
                        fontFamily: "'Outfit', sans-serif",
                      }}
                    >
                      {team.score}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            width: '100%',
            maxWidth: '800px',
            backgroundColor: 'rgba(76, 29, 149, 0.75)',
            border: '2px solid rgba(255, 255, 255, 0.25)',
            borderRadius: '20px',
            padding: '12px 24px',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Trophy style={{ width: '20px', height: '20px' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                Medição de Conhecimento em Blocos
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                Escolha qualquer bloco aberto para responder
              </p>
            </div>
          </div>

          <div
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 800,
            }}
          >
            {revealedCount} de {blocks.length} blocos abertos
          </div>
        </div>
      )}

      {/* ─── TABULEIRO: GRADE DE BLOCOS NUMERADOS (ESTILO KAHOOT) ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: '16px',
          width: '100%',
          maxWidth: '1100px',
          margin: '0 auto',
        }}
      >
        {blocks.map((block) => {
          const isRevealed = block.status === 'correct' || block.status === 'wrong';
          const isCorrect = block.status === 'correct';
          const isWrong = block.status === 'wrong';

          // Cores por estado
          let bgColor = 'linear-gradient(180deg, #4c1d95 0%, #3b0764 100%)';
          let borderColor = 'rgba(255, 255, 255, 0.12)';
          let shadow = '0 8px 0 #2e1065, 0 12px 24px rgba(0, 0, 0, 0.45)';

          if (isCorrect) {
            bgColor = 'linear-gradient(180deg, #059669 0%, #047857 100%)';
            borderColor = '#34d399';
            shadow = '0 8px 0 #065f46, 0 12px 24px rgba(5, 150, 105, 0.45)';
          } else if (isWrong) {
            bgColor = 'linear-gradient(180deg, #dc2626 0%, #b91c1c 100%)';
            borderColor = '#f87171';
            shadow = '0 8px 0 #991b1b, 0 12px 24px rgba(220, 38, 38, 0.45)';
          }

          return (
            <motion.button
              key={block.id || block.number}
              type="button"
              disabled={isRevealed}
              onClick={() => {
                if (!isRevealed) {
                  onSelectBlock(block);
                }
              }}
              whileHover={
                !isRevealed
                  ? {
                      scale: 1.03,
                      y: -4,
                      boxShadow: '0 12px 0 #2e1065, 0 20px 32px rgba(124, 58, 237, 0.45)',
                      borderColor: 'rgba(255, 255, 255, 0.4)',
                    }
                  : {}
              }
              whileTap={!isRevealed ? { scale: 0.98, y: 4, boxShadow: '0 2px 0 #2e1065' } : {}}
              style={{
                position: 'relative',
                height: '140px',
                borderRadius: '24px',
                background: bgColor,
                border: `3px solid ${borderColor}`,
                boxShadow: shadow,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isRevealed ? 'default' : 'pointer',
                outline: 'none',
                padding: '12px',
                transition: 'border-color 0.15s ease, background 0.3s ease',
              }}
              title={
                isRevealed
                  ? isCorrect
                    ? `Bloco ${block.number}: Acerto (+)`
                    : `Bloco ${block.number}: Erro (-)`
                  : `Escolher Bloco ${block.number}`
              }
            >
              {/* Efeito de Reflexo / Brilho Suave Superior */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '40%',
                  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 100%)',
                  borderRadius: '20px 20px 0 0',
                  pointerEvents: 'none',
                }}
              />

              {/* CONTEÚDO DO BLOCO */}
              <AnimatePresence mode="wait">
                {isRevealed ? (
                  <motion.div
                    key={`revealed-${block.number}`}
                    initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    {/* SINAL DE ACERTO (+) OU ERRO (-) */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                      }}
                    >
                      {isCorrect ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <Plus
                            style={{
                              width: '64px',
                              height: '64px',
                              strokeWidth: 4.5,
                              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))',
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <Minus
                            style={{
                              width: '64px',
                              height: '64px',
                              strokeWidth: 5,
                              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))',
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Tag da equipe que respondeu (se houver) */}
                    {block.answeredByTeamName && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: '#ffffff',
                          backgroundColor: 'rgba(0, 0, 0, 0.3)',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                          maxWidth: '120px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {block.answeredByTeamName}
                      </span>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key={`unrevealed-${block.number}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {/* NÚMERO DO BLOCO ESTILO KAHOOT */}
                    <span
                      style={{
                        fontSize: blocks.length > 12 ? '44px' : '56px',
                        fontWeight: 900,
                        color: '#ffffff',
                        fontFamily: "'Outfit', 'Montserrat', sans-serif",
                        lineHeight: 1,
                        filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.4))',
                        letterSpacing: '-1px',
                      }}
                    >
                      {block.number}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* ─── RODAPÉ DO TABULEIRO: AÇÕES OU STATUS FINAL ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '1100px',
          padding: '8px 4px',
        }}
      >
        <span
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'rgba(255, 255, 255, 0.75)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            padding: '6px 14px',
            borderRadius: '999px',
          }}
        >
          {revealedCount} de {blocks.length} blocos jogados ({blocks.length - revealedCount} restantes)
        </span>

        {onFinishGame && (
          <button
            type="button"
            onClick={onFinishGame}
            style={{
              padding: '8px 18px',
              borderRadius: '12px',
              backgroundColor: isAllRevealed ? '#10b981' : 'rgba(255, 255, 255, 0.15)',
              border: isAllRevealed ? 'none' : '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              boxShadow: isAllRevealed ? '0 4px 14px rgba(16, 185, 129, 0.4)' : 'none',
            }}
          >
            <span>{isAllRevealed ? 'Ver Resultado Final' : 'Finalizar Partida'}</span>
            <ArrowRight style={{ width: '16px', height: '16px' }} />
          </button>
        )}
      </div>
    </div>
  );
};
