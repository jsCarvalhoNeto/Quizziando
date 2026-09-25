import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Play, 
  ArrowLeft, 
  Volume2, 
  VolumeX, 
  Tv, 
  Trash, 
  QrCode, 
  Settings, 
  Lock, 
  Unlock, 
  RotateCw,
  Maximize2,
  Minimize2,
  User,
  Zap,
  LayoutGrid,
  X
} from 'lucide-react';
import { type GamePlayer } from '../../App';

interface CategoryItem {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

interface GameLobbyViewProps {
  role: 'operator' | 'player';
  roomCode: string;
  roomLink: string;
  spectatorLink?: string;
  linkCopied: boolean;
  onCopyLink: () => void;
  activePlayers: GamePlayer[];
  onlineCount?: number;
  onlinePlayerIds: string[];
  onRemovePlayer: (id: string) => void;
  onStartMatch: () => void;
  onBack: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  hybridMode?: boolean;
  gameRounds: number;
  selectedCategoryIds: string[];
  categories: CategoryItem[];
  maxPlayers: number;
  onMaxPlayersChange: (val: number) => void;
  joinLocked: boolean;
  onToggleJoinLocked: () => void;
  autoReveal: boolean;
  onToggleAutoReveal: () => void;
  nickname?: string;
  getAvatarUrl: (nickname: string) => string;
  quizFormat?: 'classic' | 'roulette' | 'blocks' | 'boss_raid';
  totalAnswered?: number;
}

export const GameLobbyView: React.FC<GameLobbyViewProps> = ({
  role,
  totalAnswered: _totalAnswered,
  roomCode,
  roomLink,
  spectatorLink,
  linkCopied,
  onCopyLink,
  activePlayers,
  onlineCount: _onlineCount,
  onlinePlayerIds,
  onRemovePlayer,
  onStartMatch,
  onBack,
  soundEnabled,
  onToggleSound,
  hybridMode: _hybridMode,
  gameRounds,
  selectedCategoryIds,
  categories,
  maxPlayers,
  onMaxPlayersChange,
  joinLocked,
  onToggleJoinLocked,
  autoReveal,
  onToggleAutoReveal,
  nickname,
  getAvatarUrl,
  quizFormat = 'classic'
}) => {
  const [codeCopied, setCodeCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const selectedCategories = categories.filter(c => selectedCategoryIds.includes(c.id));
  const currentHost = typeof window !== 'undefined' ? window.location.host : 'quizziando.vercel.app';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
    roomLink || (typeof window !== 'undefined' ? `${window.location.origin}?room=${roomCode}` : '')
  )}&color=46178F&bgcolor=FFFFFF&margin=2`;

  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        backgroundColor: '#2e0854',
        position: 'relative',
        overflowX: 'hidden'
      }}
    >
      {/* ─── 1. TOPBAR ESCURA (ESTILO KAHOOT! PURO) ─────────────────────────── */}
      <header
        style={{
          height: '56px',
          backgroundColor: '#1b0933',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          color: '#ffffff'
        }}
      >
        {/* Lado Esquerdo: Voltar / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              height: '34px',
              padding: '0 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Voltar ao Painel"
          >
            <ArrowLeft style={{ width: '14px', height: '14px' }} />
            <span className="hidden sm:inline">Sair</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span 
              style={{
                fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
                fontSize: '22px',
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: '-0.5px',
                textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Quizziando<span style={{ color: '#ec4899', fontSize: '24px' }}>!</span>
            </span>
            
            {/* Badge do Formato */}
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: quizFormat === 'boss_raid' ? 'rgba(225, 29, 72, 0.15)' : quizFormat === 'blocks' ? 'rgba(124, 58, 237, 0.2)' : quizFormat === 'classic' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                border: `1px solid ${quizFormat === 'boss_raid' ? 'rgba(225, 29, 72, 0.5)' : quizFormat === 'blocks' ? 'rgba(124, 58, 237, 0.5)' : quizFormat === 'classic' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(168, 85, 247, 0.4)'}`,
                color: quizFormat === 'boss_raid' ? '#fda4af' : quizFormat === 'blocks' ? '#a78bfa' : quizFormat === 'classic' ? '#34d399' : '#c084fc',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'none',
              }}
              className="md:inline-block"
            >
              {quizFormat === 'boss_raid' ? '⚔️ Batalha contra o Chefe' : quizFormat === 'blocks' ? '🧱 Modo Blocos' : quizFormat === 'classic' ? '⚡ Quiz Clássico' : '🎡 Roleta'}
            </span>
          </div>
        </div>

        {/* Lado Direito: Contador de Pessoas, Som, Configurações e Fullscreen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Contador de Participantes (Estilo Kahoot: 👤 X) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 900,
            }}
            title={`${activePlayers.length} competidores na sala`}
          >
            <User style={{ width: '16px', height: '16px', color: '#38bdf8' }} />
            <span>{activePlayers.length}</span>
          </div>

          {/* Botão de Som */}
          <button
            type="button"
            onClick={onToggleSound}
            style={{
              height: '36px',
              width: '36px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: soundEnabled ? '#ffffff' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title={soundEnabled ? 'Silenciar som do lobby' : 'Ativar som do lobby'}
          >
            {soundEnabled ? <Volume2 style={{ width: '18px', height: '18px' }} /> : <VolumeX style={{ width: '18px', height: '18px' }} />}
          </button>

          {/* Botão Configurações */}
          {role === 'operator' && (
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              style={{
                height: '36px',
                width: '36px',
                borderRadius: '8px',
                backgroundColor: showSettings ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                border: 'none',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Configurações da sala"
            >
              <Settings style={{ width: '18px', height: '18px' }} />
            </button>
          )}

          {/* Botão Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            style={{
              height: '36px',
              width: '36px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title={isFullscreen ? 'Sair da tela cheia' : 'Modo tela cheia (para projetor)'}
          >
            {isFullscreen ? <Minimize2 style={{ width: '18px', height: '18px' }} /> : <Maximize2 style={{ width: '18px', height: '18px' }} />}
          </button>
        </div>
      </header>

      {/* ─── 2. FAIXA BRANCA SUPERIOR EM DESTAQUE (REFERÊNCIA IMAGEM 2) ──────── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          color: '#1e1b4b',
          padding: '14px 24px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px 24px',
          textAlign: 'center',
          zIndex: 30,
        }}
      >
        {roomCode ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#334155' }}>
              Entre em <strong style={{ color: '#0f172a', fontWeight: 900 }}>{currentHost}</strong> com o PIN de jogo:
            </span>
            <span 
              style={{ 
                fontSize: '28px', 
                fontWeight: 900, 
                color: '#0f172a', 
                letterSpacing: '2px', 
                fontFamily: 'monospace',
                backgroundColor: '#f1f5f9',
                padding: '2px 14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                userSelect: 'all'
              }}
              onClick={handleCopyCode}
              title="Clique para copiar o PIN"
            >
              {roomCode}
            </span>

            {/* Ações Rápidas do PIN */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={handleCopyCode}
                style={{
                  height: '32px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  backgroundColor: codeCopied ? '#ecfdf5' : '#f8fafc',
                  border: `1px solid ${codeCopied ? '#a7f3d0' : '#cbd5e1'}`,
                  color: codeCopied ? '#059669' : '#475569',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {codeCopied ? <Check style={{ width: '13px', height: '13px' }} /> : <Copy style={{ width: '13px', height: '13px' }} />}
                <span>{codeCopied ? 'Copiado!' : 'Copiar PIN'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                style={{
                  height: '32px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1d4ed8',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Visualizar QR Code para entrada por câmera"
              >
                <QrCode style={{ width: '13px', height: '13px' }} />
                <span>QR Code</span>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#475569' }}>
              Carregando PIN do jogo...
            </span>
          </div>
        )}
      </div>

      {/* ─── 3. PALCO PRINCIPAL (FUNDO ROXO ESTILO SALA DE AULA KAHOOT) ─────── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          padding: '24px 20px 40px',
          background: 'radial-gradient(ellipse at 50% 30%, #581c87 0%, #3b0764 45%, #1e0738 100%)',
          minHeight: 'calc(100vh - 120px)',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        {/* Camada sutil de ambientação da sala de aula */}
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `radial-gradient(circle at 20% 20%, rgba(236, 72, 153, 0.12) 0%, transparent 40%), radial-gradient(circle at 80% 30%, rgba(56, 189, 248, 0.12) 0%, transparent 40%)`,
            pointerEvents: 'none',
          }}
        />

        {/* LINHA SUPERIOR DO PALCO: BOTÃO INICIAR E BOTÃO DE CADEADO (IMAGEM 2) */}
        <div 
          style={{ 
            width: '100%', 
            maxWidth: '1200px', 
            display: 'flex', 
            justifyContent: 'flex-end', 
            alignItems: 'center',
            gap: '10px',
            zIndex: 10,
          }}
        >
          {role === 'operator' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Botão de Cadeado (Trava da Sala) */}
              <button
                type="button"
                onClick={onToggleJoinLocked}
                style={{
                  height: '46px',
                  width: '46px',
                  borderRadius: '12px',
                  backgroundColor: joinLocked ? '#dc2626' : 'rgba(255, 255, 255, 0.15)',
                  border: '1.5px solid rgba(255, 255, 255, 0.25)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                }}
                title={joinLocked ? 'Entrada bloqueada (clique para desbloquear)' : 'Entrada liberada (clique para trancar sala)'}
              >
                {joinLocked ? <Lock style={{ width: '20px', height: '20px' }} /> : <Unlock style={{ width: '20px', height: '20px' }} />}
              </button>

              {/* Botão Iniciar (Estilo Botão Branco do Kahoot! da Imagem 2) */}
              <button
                type="button"
                onClick={onStartMatch}
                style={{
                  height: '46px',
                  padding: '0 28px',
                  borderRadius: '12px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  fontSize: '16px',
                  fontWeight: 900,
                  border: '2px solid rgba(0, 0, 0, 0.15)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                  letterSpacing: '0.3px',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.03)';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                <Play style={{ width: '16px', height: '16px', fill: '#0f172a' }} />
                <span>Iniciar</span>
              </button>
            </div>
          )}
        </div>

        {/* ÁREA CENTRAL: BANNER DE AGUARDANDO E JOGADORES (REFERÊNCIA IMAGENS 1 E 2) */}
        <div 
          style={{ 
            width: '100%', 
            maxWidth: '1000px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '24px', 
            margin: 'auto 0',
            zIndex: 10 
          }}
        >
          {/* Logo Kahoot/Quizziando Centralizado */}
          <div style={{ textAlign: 'center' }}>
            <h2
              style={{
                fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
                fontSize: '44px',
                fontWeight: 900,
                color: '#ffffff',
                margin: 0,
                letterSpacing: '-1px',
                textShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
              }}
            >
              Quizziando<span style={{ color: '#f43f5e' }}>!</span>
            </h2>
          </div>

          {/* Banner Roxo Escuro "Aguardando os participantes" (Idêntico à Imagem 2) */}
          <div
            style={{
              backgroundColor: '#3b126d',
              border: '2px solid #5b21b6',
              borderRadius: '16px',
              padding: '12px 32px',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: activePlayers.length > 0 ? '#10b981' : '#a855f7',
              }}
              className={activePlayers.length > 0 ? 'animate-ping' : ''}
            />
            <span
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '0.2px',
              }}
            >
              {activePlayers.length === 0 ? 'Aguardando os participantes' : `${activePlayers.length} participantes na sala`}
            </span>
          </div>

          {/* Identificação do Próprio Aluno se for jogador */}
          {role === 'player' && nickname && (
            <div
              style={{
                padding: '8px 18px',
                borderRadius: '999px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <img 
                src={getAvatarUrl(nickname)} 
                alt="" 
                style={{ width: '22px', height: '22px', borderRadius: '50%' }} 
              />
              <span>Conectado como: <strong>{nickname}</strong></span>
            </div>
          )}

          {/* GRID DE JOGADORES QUE ENTRARAM */}
          <div 
            style={{ 
              width: '100%', 
              display: 'flex', 
              flexWrap: 'wrap', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '12px',
              maxHeight: '320px',
              overflowY: 'auto',
              padding: '10px',
            }}
          >
            {activePlayers.length === 0 ? (
              <div 
                style={{ 
                  color: 'rgba(255, 255, 255, 0.65)', 
                  fontSize: '15px', 
                  fontStyle: 'italic', 
                  padding: '20px 0',
                  textAlign: 'center'
                }}
              >
                Aponte a câmera para o QR Code ou digite o PIN para entrar...
              </div>
            ) : (
              activePlayers.map((player) => {
                const isOnline = onlinePlayerIds.includes(player.id);
                return (
                  <div
                    key={player.id}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      color: '#0f172a',
                      borderRadius: '12px',
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                      animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      position: 'relative',
                    }}
                  >
                    <div style={{ position: 'relative', width: '26px', height: '26px' }}>
                      <img 
                        src={getAvatarUrl(player.nickname)} 
                        alt="" 
                        style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }} 
                      />
                      <span 
                        style={{
                          position: 'absolute',
                          bottom: '-1px',
                          right: '-1px',
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          backgroundColor: isOnline ? '#10b981' : '#94a3b8',
                          border: '1px solid #ffffff',
                        }}
                      />
                    </div>
                    
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#1e1b4b' }}>
                      {player.nickname}
                    </span>

                    {role === 'operator' && (
                      <button
                        type="button"
                        onClick={() => onRemovePlayer(player.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                        title="Remover jogador"
                      >
                        <Trash style={{ width: '13px', height: '13px' }} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─── 4. BARRA INFERIOR / FOOTER DO PALCO ────────────────────────────── */}
        <div
          style={{
            width: '100%',
            maxWidth: '1200px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 10,
          }}
        >
          {/* Lado Esquerdo: Formato do Jogo & Quizzes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: '#ffffff',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                padding: '4px 12px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {quizFormat === 'blocks' ? (
                <LayoutGrid style={{ width: '13px', height: '13px', color: '#a78bfa' }} />
              ) : quizFormat === 'classic' ? (
                <Zap style={{ width: '13px', height: '13px', color: '#34d399' }} />
              ) : (
                <RotateCw style={{ width: '13px', height: '13px', color: '#c084fc' }} />
              )}
              <span>{quizFormat === 'blocks' ? 'Modo Blocos (Kahoot)' : quizFormat === 'classic' ? 'Quiz Clássico (Sem Roleta)' : 'Quiz com Roleta'}</span>
            </span>

            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 600 }}>
              {gameRounds} {gameRounds === 1 ? 'Rodada' : 'Rodadas'}
            </span>

            {selectedCategories.length > 0 && (
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)' }} className="hidden sm:inline">
                · {selectedCategories.map(c => c.name).join(', ')}
              </span>
            )}
          </div>

          {/* Lado Direito: Projetar Telão / Link */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {role === 'operator' && spectatorLink && (
              <button
                type="button"
                onClick={() => window.open(spectatorLink, '_blank', 'noopener,noreferrer')}
                style={{
                  height: '36px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
                title="Abrir tela limpa sem botões para o projetor"
              >
                <Tv style={{ width: '14px', height: '14px' }} />
                <span>Projetar Telão</span>
              </button>
            )}

            <button
              type="button"
              onClick={onCopyLink}
              style={{
                height: '36px',
                padding: '0 14px',
                borderRadius: '8px',
                backgroundColor: linkCopied ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              {linkCopied ? <Check style={{ width: '14px', height: '14px' }} /> : <Copy style={{ width: '14px', height: '14px' }} />}
              <span>{linkCopied ? 'Link Copiado!' : 'Copiar Link'}</span>
            </button>
          </div>
        </div>
      </main>

      {/* ─── MODAL QR CODE AMPLIADO ─────────────────────────────────────────── */}
      {showQrModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowQrModal(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              maxWidth: '380px',
              width: '100%',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode style={{ width: '20px', height: '20px', color: '#46178f' }} />
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#1e1b4b' }}>
                  Escanear para Entrar
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <img src={qrCodeUrl} alt="QR Code da Sala" style={{ width: '240px', height: '240px', display: 'block' }} />
            </div>

            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Aponte a câmera do celular para entrar direto na sala com o PIN <strong style={{ color: '#1e1b4b' }}>{roomCode}</strong>.
            </div>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              style={{
                width: '100%',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#1368ce',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL DE CONFIGURAÇÕES AVANÇADAS DO HOST ──────────────────────── */}
      {showSettings && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSettings(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings style={{ width: '20px', height: '20px', color: '#46178f' }} />
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Configurações da Sala
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Limite de Jogadores */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', display: 'block' }}>Limite de Participantes</span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Capacidade máxima na sala</span>
                </div>
                <input 
                  type="number" 
                  min="1" 
                  max="500" 
                  value={maxPlayers}
                  onChange={e => onMaxPlayersChange(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                  style={{ width: '70px', height: '34px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '13px', fontWeight: 800, textAlign: 'center' }}
                />
              </div>

              {/* Trancar Entrada */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', display: 'block' }}>Bloquear Entrada</span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Impedir novos alunos de entrar</span>
                </div>
                <button
                  type="button"
                  onClick={onToggleJoinLocked}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    backgroundColor: joinLocked ? '#fee2e2' : '#f1f5f9',
                    border: `1px solid ${joinLocked ? '#fca5a5' : '#cbd5e1'}`,
                    color: joinLocked ? '#b91c1c' : '#475569',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {joinLocked ? 'Trancada' : 'Liberada'}
                </button>
              </div>

              {/* Revelar automático */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', display: 'block' }}>Avanço Automático</span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Revelar quando todos responderem</span>
                </div>
                <button
                  type="button"
                  onClick={onToggleAutoReveal}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    backgroundColor: autoReveal ? '#ecfdf5' : '#f1f5f9',
                    border: `1px solid ${autoReveal ? '#a7f3d0' : '#cbd5e1'}`,
                    color: autoReveal ? '#059669' : '#475569',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {autoReveal ? 'Ativado' : 'Manual'}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSettings(false)}
              style={{
                width: '100%',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#1e1b4b',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                marginTop: '8px',
              }}
            >
              Concluído
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameLobbyView;
