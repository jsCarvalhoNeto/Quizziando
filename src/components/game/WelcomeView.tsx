import React, { useState } from 'react';
import { User, Crown, Play, ArrowRight, ShieldCheck, Gamepad2, Sparkles } from 'lucide-react';

interface WelcomeViewProps {
  role: 'player' | 'operator';
  onRoleChange: (role: 'player' | 'operator') => void;
  nickname: string;
  onNicknameChange: (nickname: string) => void;
  roomCode: string;
  onRoomCodeChange: (code: string) => void;
  teamName: string;
  onTeamNameChange: (team: string) => void;
  isTeamMode: boolean;
  authUser: { id?: string; email: string } | null;
  onStartGame: () => void;
  onOpenManagerLogin: () => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({
  role,
  onRoleChange,
  nickname,
  onNicknameChange,
  roomCode,
  onRoomCodeChange,
  teamName,
  onTeamNameChange,
  isTeamMode,
  authUser,
  onStartGame,
  onOpenManagerLogin,
}) => {
  const [avatarSeed, setAvatarSeed] = useState(nickname || 'Competidor');

  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
    avatarSeed || 'Competidor'
  )}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

  const handleNicknameInput = (val: string) => {
    onNicknameChange(val);
    if (val.trim()) {
      setAvatarSeed(val.trim());
    }
  };

  const handleRoomCodeInput = (val: string) => {
    onRoomCodeChange(val.toUpperCase().replace(/[^A-Z0-9]/g, ''));
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#ffffff',
          borderRadius: '28px',
          boxShadow: '0 20px 50px -10px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Banner de Topo com Cores do Quizziando */}
        <div
          style={{
            background: 'linear-gradient(135deg, #46178F 0%, #7C3AED 50%, #2563EB 100%)',
            padding: '36px 28px 30px',
            textAlign: 'center',
            position: 'relative',
            color: '#ffffff',
          }}
        >
          {/* Decoração sutil */}
          <div
            style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                background: 'rgba(255,255,255,0.18)',
                padding: '4px 12px',
                borderRadius: '999px',
                backdropFilter: 'blur(8px)',
              }}
            >
              🎮 Arena Interativa de Quizzes
            </span>
          </div>

          <h1
            style={{
              margin: '0 0 6px 0',
              fontSize: '32px',
              fontWeight: 900,
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: '-0.02em',
            }}
          >
            Quizziando
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.85)',
              fontWeight: 500,
            }}
          >
            Conecte-se para jogar com a turma ou gerencie suas salas de aula
          </p>
        </div>

        {/* Corpo do Cartão */}
        <div style={{ padding: '28px 28px 32px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Seletor de Perfil (Abas Aluno vs Professor) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '16px',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => onRoleChange('player')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 14px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '14px',
                transition: 'all 0.2s ease',
                background: role === 'player' ? '#ffffff' : 'transparent',
                color: role === 'player' ? '#46178F' : '#64748b',
                boxShadow: role === 'player' ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
              }}
            >
              <Gamepad2 style={{ width: '18px', height: '18px' }} />
              Sou Aluno
            </button>

            <button
              type="button"
              onClick={() => onRoleChange('operator')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 14px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '14px',
                transition: 'all 0.2s ease',
                background: role === 'operator' ? '#ffffff' : 'transparent',
                color: role === 'operator' ? '#7C3AED' : '#64748b',
                boxShadow: role === 'operator' ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
              }}
            >
              <Crown style={{ width: '18px', height: '18px' }} />
              Sou Professor
            </button>
          </div>

          {/* FLUXO DO ALUNO */}
          {role === 'player' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Preview Dinâmico de Avatar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: '2px solid #7C3AED',
                    boxShadow: '0 4px 10px rgba(124, 58, 237, 0.15)',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={avatarUrl}
                    alt="Avatar do Aluno"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Avatar Automático
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    {nickname.trim() || 'Digite seu Nickname'}
                  </div>
                </div>
              </div>

              {/* Campo Nickname */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#334155',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '6px',
                  }}
                >
                  Seu Nome ou Nickname
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => handleNicknameInput(e.target.value)}
                    placeholder="Ex: Carlos_Quiz"
                    maxLength={20}
                    style={{
                      width: '100%',
                      padding: '13px 16px 13px 40px',
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#0f172a',
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#7C3AED')}
                    onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                  />
                  <User
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '18px',
                      height: '18px',
                      color: '#94a3b8',
                    }}
                  />
                </div>
              </div>

              {/* Campo Código da Sala */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#334155',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '6px',
                  }}
                >
                  Código da Sala (PIN)
                </label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => handleRoomCodeInput(e.target.value)}
                  placeholder="Ex: DF5242"
                  maxLength={8}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: '20px',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    letterSpacing: '0.2em',
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    color: '#46178F',
                    background: '#f8fafc',
                    border: '2px dashed #cbd5e1',
                    borderRadius: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#7C3AED')}
                  onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                />
              </div>

              {/* Modo de Equipe Opcional */}
              {isTeamMode && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#334155',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '6px',
                    }}
                  >
                    Nome da Equipe (Opcional)
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => onTeamNameChange(e.target.value)}
                    placeholder="Ex: Equipe Alfa"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '14px',
                      color: '#0f172a',
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              {/* Botão Entrar no Jogo */}
              <button
                type="button"
                onClick={onStartGame}
                disabled={!nickname.trim()}
                style={{
                  marginTop: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '16px 24px',
                  fontSize: '16px',
                  fontWeight: 900,
                  color: '#ffffff',
                  background: nickname.trim()
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : '#cbd5e1',
                  border: 'none',
                  borderRadius: '16px',
                  cursor: nickname.trim() ? 'pointer' : 'not-allowed',
                  boxShadow: nickname.trim() ? '0 8px 20px -4px rgba(16, 185, 129, 0.45)' : 'none',
                  transition: 'all 0.2s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <Play style={{ width: '20px', height: '20px', fill: 'white' }} />
                Entrar na Partida
              </button>
            </div>
          )}

          {/* FLUXO DO PROFESSOR / OPERADOR */}
          {role === 'operator' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '18px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(124, 58, 237, 0.12)',
                      color: '#7C3AED',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Sparkles style={{ width: '20px', height: '20px' }} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                      Painel do Educador
                    </h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                      Crie quizzes, organize turmas e projete a roleta no telão.
                    </p>
                  </div>
                </div>

                {authUser ? (
                  <div
                    style={{
                      marginTop: '4px',
                      padding: '10px 14px',
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      color: '#065f46',
                      fontWeight: 600,
                    }}
                  >
                    <ShieldCheck style={{ width: '18px', height: '18px', color: '#10b981' }} />
                    Conectado como {authUser.email}
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#475569',
                      lineHeight: 1.5,
                      padding: '8px 0',
                    }}
                  >
                    Faça login com sua conta para acessar sua biblioteca de perguntas, pastas e histórico de salas.
                  </div>
                )}
              </div>

              {/* Botão de Acesso do Professor */}
              <button
                type="button"
                onClick={authUser ? onStartGame : onOpenManagerLogin}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '16px 24px',
                  fontSize: '15px',
                  fontWeight: 900,
                  color: '#ffffff',
                  background: 'linear-gradient(135deg, #46178F 0%, #7C3AED 100%)',
                  border: 'none',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px -4px rgba(124, 58, 237, 0.45)',
                  transition: 'all 0.2s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {authUser ? 'Acessar Meu Painel' : 'Fazer Login de Professor'}
                <ArrowRight style={{ width: '18px', height: '18px' }} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeView;
