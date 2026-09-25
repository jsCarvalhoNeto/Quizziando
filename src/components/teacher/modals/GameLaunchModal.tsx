// GameLaunchModal.tsx — Modal para escolher formato e modo de inicialização do jogo
import React from 'react';
import {
  X,
  Zap,
  LayoutGrid,
  RotateCw,
  Wifi,
  Users,
  Hand,
  Smartphone,
  ChevronRight,
} from 'lucide-react';

interface GameLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  playSessionType: 'classic' | 'roulette' | 'blocks';
  setPlaySessionType: (type: 'classic' | 'roulette' | 'blocks') => void;
  selectedQuizIds: string[];
  blocksCount: number;
  setBlocksCount: (count: number) => void;
  onStartOnline: () => void;
  onStartLocalTeams: () => void;
  onStartLocalIndividual: () => void;
  onStartHybrid: () => void;
}

export const GameLaunchModal: React.FC<GameLaunchModalProps> = ({
  isOpen,
  onClose,
  playSessionType,
  setPlaySessionType,
  selectedQuizIds,
  blocksCount,
  setBlocksCount,
  onStartOnline,
  onStartLocalTeams,
  onStartLocalIndividual,
  onStartHybrid,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          maxWidth: '640px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          border: '1px solid #e2e8f0',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Cabeçalho do Modal */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: playSessionType === 'classic' ? '#ecfdf5' : playSessionType === 'blocks' ? '#f3e8ff' : '#eff6ff',
                border: playSessionType === 'classic' ? '1.5px solid #a7f3d0' : playSessionType === 'blocks' ? '1.5px solid #ddd6fe' : '1.5px solid #dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: playSessionType === 'classic' ? '#059669' : playSessionType === 'blocks' ? '#7c3aed' : '#1368ce',
                flexShrink: 0,
              }}
            >
              {playSessionType === 'classic' ? (
                <Zap style={{ width: '24px', height: '24px', fill: 'currentColor' }} />
              ) : playSessionType === 'blocks' ? (
                <LayoutGrid style={{ width: '24px', height: '24px' }} />
              ) : (
                <RotateCw style={{ width: '24px', height: '24px' }} />
              )}
            </div>
            <div>
              <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {playSessionType === 'classic'
                  ? 'Iniciar Partida - Quiz Clássico'
                  : playSessionType === 'blocks'
                  ? 'Iniciar Partida - Modo Blocos'
                  : 'Como deseja jogar com a Roleta?'}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0', fontWeight: 500 }}>
                <strong style={{ color: playSessionType === 'classic' ? '#059669' : playSessionType === 'blocks' ? '#7c3aed' : '#1368ce' }}>
                  {selectedQuizIds.length} {selectedQuizIds.length === 1 ? 'quiz selecionado' : 'quizzes selecionados'}
                </strong>
                {playSessionType === 'classic'
                  ? ' no formato sequencial estilo Kahoot (perguntas diretas, sem sorteio de roleta).'
                  : playSessionType === 'blocks'
                  ? ' no formato Blocos (perguntas viradas com pontuação de acerto + e erro -).'
                  : ' selecionados para o sorteio na Roleta.'} Escolha o formato da partida:
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
            title="Fechar"
          >
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* Alternador de Formato Sem Roleta: Clássico vs Blocos */}
        {playSessionType !== 'roulette' && (
          <div
            style={{
              display: 'flex',
              gap: '6px',
              padding: '4px',
              backgroundColor: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '14px',
            }}
          >
            <button
              type="button"
              onClick={() => setPlaySessionType('classic')}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: playSessionType === 'classic' ? '#ffffff' : 'transparent',
                color: playSessionType === 'classic' ? '#059669' : '#64748b',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: playSessionType === 'classic' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                transition: 'all 0.15s ease',
              }}
            >
              <Zap style={{ width: '15px', height: '15px', fill: playSessionType === 'classic' ? 'currentColor' : 'none' }} />
              <span>Modo Clássico (Sequencial)</span>
            </button>
            <button
              type="button"
              onClick={() => setPlaySessionType('blocks')}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: playSessionType === 'blocks' ? '#ffffff' : 'transparent',
                color: playSessionType === 'blocks' ? '#7c3aed' : '#64748b',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: playSessionType === 'blocks' ? '0 2px 8px rgba(124, 58, 237, 0.12)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                transition: 'all 0.15s ease',
              }}
            >
              <LayoutGrid style={{ width: '15px', height: '15px' }} />
              <span>Modo Blocos (Kahoot Blocks)</span>
            </button>
          </div>
        )}

        {/* Configuração da Quantidade Pré-definida de Blocos */}
        {playSessionType === 'blocks' && (
          <div
            style={{
              backgroundColor: '#faf5ff',
              border: '1.5px solid #e9d5ff',
              borderRadius: '14px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#4c1d95', display: 'block' }}>
                Quantidade de Blocos no Tabuleiro:
              </span>
              <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 500 }}>
                Defina quantos blocos numerados virados serão exibidos na tela
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[6, 8, 9, 12, 16, 20].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setBlocksCount(num)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    border: blocksCount === num ? '2px solid #7c3aed' : '1px solid #d8b4fe',
                    backgroundColor: blocksCount === num ? '#7c3aed' : '#ffffff',
                    color: blocksCount === num ? '#ffffff' : '#6b21a8',
                    transition: 'all 0.15s ease',
                    boxShadow: blocksCount === num ? '0 2px 6px rgba(124, 58, 237, 0.3)' : 'none',
                  }}
                >
                  {num} Blocos
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lista dos 4 Modos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Opção 1: Modo Online */}
          <button
            type="button"
            onClick={onStartOnline}
            style={{
              padding: '18px',
              borderRadius: '14px',
              border: '1.5px solid #e2e8f0',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#7c3aed';
              e.currentTarget.style.backgroundColor = '#faf5ff';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(124, 58, 237, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
                color: '#ffffff',
              }}
            >
              <Wifi style={{ width: '24px', height: '24px' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#1e1b4b' }}>
                  Modo Online
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    backgroundColor: '#ede9fe',
                    color: '#6d28d9',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Multiplayer Remoto
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                {playSessionType === 'blocks'
                  ? 'Partida multiplayer com PIN da sala. Os participantes usam o celular e as perguntas abrem no tabuleiro de blocos virados.'
                  : playSessionType === 'classic'
                  ? 'Partida multiplayer com PIN da sala. Os participantes usam o celular e as perguntas seguem em sequência sem roleta.'
                  : 'Jogue em tempo real com jogadores na internet. Crie salas, use o celular como controle e a Roleta sorteia as perguntas ao vivo.'}
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {['Sala ao vivo', 'Multiplayer', 'Supabase Realtime'].map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#7c3aed',
                      backgroundColor: '#f5f3ff',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: '1px solid #ddd6fe',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <ChevronRight style={{ width: '20px', height: '20px', color: '#94a3b8', flexShrink: 0 }} />
          </button>

          {/* Opção 2: Modo Local por Equipes */}
          <button
            type="button"
            onClick={onStartLocalTeams}
            style={{
              padding: '18px',
              borderRadius: '14px',
              border: '1.5px solid #e2e8f0',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#059669';
              e.currentTarget.style.backgroundColor = '#ecfdf5';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(5, 150, 105, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #059669, #047857)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                color: '#ffffff',
              }}
            >
              <Users style={{ width: '24px', height: '24px' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#064e3b' }}>
                  Modo Local por Equipes
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    backgroundColor: '#d1fae5',
                    color: '#065f46',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  100% Offline
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                {playSessionType === 'blocks'
                  ? 'Disputa entre equipes sem internet. Os times escolhem os blocos numerados, respondem oralmente e gravam acertos (+) e erros (-).'
                  : playSessionType === 'classic'
                  ? 'Disputa entre 2 times sem internet. O time da vez responde em voz alta e o apresentador confirma os pontos.'
                  : 'Disputa entre 2 times sem internet. Os participantes falam a resposta e o apresentador gira a Roleta e confirma acerto ou erro.'}
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {['Sem internet', 'Equipes', 'Resposta oral', 'Blocos + / -'].map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#059669',
                      backgroundColor: '#ecfdf5',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: '1px solid #a7f3d0',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <ChevronRight style={{ width: '20px', height: '20px', color: '#94a3b8', flexShrink: 0 }} />
          </button>

          {/* Opção 3: Modo Local Individual */}
          <button
            type="button"
            onClick={onStartLocalIndividual}
            style={{
              padding: '18px',
              borderRadius: '14px',
              border: '1.5px solid #e2e8f0',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0284c7';
              e.currentTarget.style.backgroundColor = '#f0f9ff';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(2, 132, 199, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                color: '#ffffff',
              }}
            >
              <Hand style={{ width: '24px', height: '24px' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#0c4a6e' }}>
                  Modo Local Individual
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Medição de Conhecimento
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                {playSessionType === 'blocks'
                  ? 'Sem competição. O aluno escolhe livremente os blocos numerados virados, responde e confere se acertou (+) ou errou (-).'
                  : playSessionType === 'classic'
                  ? 'Sem competição ou pontos. O aluno responde, confere a resposta correta na hora e segue para a próxima pergunta.'
                  : 'Sem competição ou pontos. A roleta sorteia o tema, o aluno responde, confere a resposta correta na hora e avança.'}
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {['Sem pontos', 'Sem ranking', 'Feedback imediato', '100% Offline'].map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#0284c7',
                      backgroundColor: '#f0f9ff',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: '1px solid #bae6fd',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <ChevronRight style={{ width: '20px', height: '20px', color: '#94a3b8', flexShrink: 0 }} />
          </button>

          {/* Opção 4: Presencial com Celulares */}
          <button
            type="button"
            onClick={onStartHybrid}
            style={{
              padding: '18px',
              borderRadius: '14px',
              border: '1.5px solid #e2e8f0',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#db2777';
              e.currentTarget.style.backgroundColor = '#fdf2f8';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(219, 39, 119, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #db2777, #be185d)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(219, 39, 119, 0.3)',
                color: '#ffffff',
              }}
            >
              <Smartphone style={{ width: '24px', height: '24px' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#831843' }}>
                  Presencial com Celulares (Kahoot)
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    backgroundColor: '#fce7f3',
                    color: '#be185d',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Telão + Celulares
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                {playSessionType === 'blocks'
                  ? 'Projete o tabuleiro de blocos no telão. Os alunos escolhem blocos e respondem ao vivo com os 4 botões geométricos do celular.'
                  : playSessionType === 'classic'
                  ? 'Projete a partida no telão ou projetor da sala. Os alunos respondem ao vivo com os 4 botões geométricos do celular.'
                  : 'Projete a Roleta e perguntas no telão da sala. Os alunos respondem ao vivo com os 4 botões geométricos do celular.'}
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {['Telão / Projetor', 'Controle por celular', 'Modo Híbrido'].map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#db2777',
                      backgroundColor: '#fdf2f8',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: '1px solid #fbcfe8',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <ChevronRight style={{ width: '20px', height: '20px', color: '#94a3b8', flexShrink: 0 }} />
          </button>
        </div>

        {/* Rodapé do Modal */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: '38px',
              padding: '0 20px',
              borderRadius: '8px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
