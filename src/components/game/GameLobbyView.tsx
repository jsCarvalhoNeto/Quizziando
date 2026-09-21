import React, { useState } from 'react';
import { 
  Users, 
  Copy, 
  Check, 
  Play, 
  ArrowLeft, 
  Volume2, 
  VolumeX, 
  Tv, 
  ExternalLink, 
  Trash, 
  QrCode, 
  Smartphone, 
  Settings, 
  Lock, 
  Unlock, 
  Eye, 
  RotateCw,
  Sparkles
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
  spectatorLink: string;
  linkCopied: boolean;
  onCopyLink: () => void;
  activePlayers: GamePlayer[];
  onlineCount: number;
  onlinePlayerIds: string[];
  totalAnswered: number;
  onRemovePlayer: (id: string) => void;
  onStartMatch: () => void;
  onBack: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  hybridMode: boolean;
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
}

export const GameLobbyView: React.FC<GameLobbyViewProps> = ({
  role,
  roomCode,
  roomLink,
  spectatorLink,
  linkCopied,
  onCopyLink,
  activePlayers,
  onlineCount,
  onlinePlayerIds,
  onRemovePlayer,
  onStartMatch,
  onBack,
  soundEnabled,
  onToggleSound,
  hybridMode,
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
  getAvatarUrl
}) => {
  const [codeCopied, setCodeCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  const selectedCategories = categories.filter(c => selectedCategoryIds.includes(c.id));
  const currentHost = typeof window !== 'undefined' ? window.location.host : 'quizziando.vercel.app';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      
      {/* ─── 1. TOPBAR DO LOBBY (Estilo Kahoot! / Educador Premium) ───────────── */}
      <header
        style={{
          height: '64px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        }}
      >
        {/* Lado Esquerdo: Logo & Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src="/logo.png" 
              alt="Quizziando Logo" 
              style={{ height: '36px', width: 'auto', objectFit: 'contain' }} 
            />
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 900, color: '#1e1b4b', margin: 0, lineHeight: 1.1 }}>
                Quizziando
              </h1>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                Arena Ao Vivo
              </span>
            </div>
          </div>

          <div style={{ height: '24px', width: '1px', backgroundColor: '#e2e8f0', margin: '0 4px' }} />

          {/* Badge do Formato */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 800,
              backgroundColor: hybridMode ? '#fdf2f8' : '#f5f3ff',
              border: `1px solid ${hybridMode ? '#fbcfe8' : '#ddd6fe'}`,
              color: hybridMode ? '#be185d' : '#6d28d9',
            }}
          >
            {hybridMode ? <Smartphone style={{ width: '13px', height: '13px' }} /> : <Tv style={{ width: '13px', height: '13px' }} />}
            <span>{hybridMode ? 'Presencial com Celulares' : 'Modo Online'}</span>
          </div>

          {/* Badge de Quizzes na Roleta */}
          {selectedCategoryIds.length > 0 && (
            <div
              style={{
                display: 'none',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8',
              }}
              className="sm:flex"
            >
              <RotateCw style={{ width: '13px', height: '13px' }} />
              <span>{selectedCategoryIds.length} Quizzes na Roleta</span>
            </div>
          )}

          {/* Badge de Rodadas */}
          <div
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              color: '#475569',
            }}
            className="md:flex"
          >
            <span>{gameRounds} Rodadas</span>
          </div>
        </div>

        {/* Lado Direito: Ações Rápidas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Som */}
          <button
            type="button"
            onClick={onToggleSound}
            style={{
              height: '38px',
              width: '38px',
              borderRadius: '10px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: soundEnabled ? '#1368ce' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title={soundEnabled ? 'Silenciar música' : 'Ativar música do lobby'}
          >
            {soundEnabled ? <Volume2 style={{ width: '18px', height: '18px' }} /> : <VolumeX style={{ width: '18px', height: '18px' }} />}
          </button>

          {/* Abrir Telão do Público */}
          {role === 'operator' && spectatorLink && (
            <button
              type="button"
              onClick={() => window.open(spectatorLink, '_blank', 'noopener,noreferrer')}
              style={{
                height: '38px',
                padding: '0 14px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1368ce',
                fontSize: '12px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Abrir a tela limpa de apresentação em outra janela ou projetor"
            >
              <ExternalLink style={{ width: '14px', height: '14px' }} />
              <span className="hidden sm:inline">Projetar Telão</span>
            </button>
          )}

          {/* Voltar / Sair */}
          <button
            type="button"
            onClick={onBack}
            style={{
              height: '38px',
              padding: '0 14px',
              borderRadius: '10px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#475569',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Voltar ao Painel do Educador"
          >
            <ArrowLeft style={{ width: '14px', height: '14px' }} />
            <span>Sair da Sala</span>
          </button>
        </div>
      </header>

      {/* ─── 2. ÁREA PRINCIPAL DO LOBBY ────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '24px', maxWidth: '1280px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* ─── BANNER HERO: CÓDIGO DO JOGO (PIN) EM DESTAQUE KAHOOT! ─────────── */}
        <div
          style={{
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #46178f 0%, #1368ce 100%)',
            padding: '24px 32px',
            color: '#ffffff',
            boxShadow: '0 10px 25px -5px rgba(70, 23, 143, 0.3)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Efeito visual de iluminação */}
          <div
            style={{
              position: 'absolute',
              top: '-40px',
              right: '-40px',
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Instrução para os alunos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#e9d5ff' }}>
              Acesse no seu celular ou computador:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px' }}>
                {currentHost}
              </span>
            </div>
            <span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 500 }}>
              Digite o código abaixo ou escaneie o QR Code para entrar na partida
            </span>
          </div>

          {/* O PIN DO JOGO EM DESTAQUE GIGANTE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '18px',
                padding: '10px 28px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
              }}
            >
              <span style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
                PIN DA SALA
              </span>
              <span style={{ fontSize: '46px', fontWeight: 900, color: '#1e1b4b', letterSpacing: '4px', lineHeight: 1.1, fontFamily: 'monospace' }}>
                {roomCode}
              </span>
            </div>

            {/* Botão Copiar PIN */}
            <button
              type="button"
              onClick={handleCopyCode}
              style={{
                height: '52px',
                padding: '0 16px',
                borderRadius: '14px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                border: '1.5px solid rgba(255, 255, 255, 0.3)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Copiar código da sala"
            >
              {codeCopied ? <Check style={{ width: '18px', height: '18px', color: '#4ade80' }} /> : <Copy style={{ width: '18px', height: '18px' }} />}
              <span>{codeCopied ? 'PIN Copiado!' : 'Copiar PIN'}</span>
            </button>
          </div>
        </div>
        {/* Pílulas de Quizzes selecionados para a Roleta */}
        {selectedCategories.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              padding: '10px 18px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Quizzes nesta Partida:
            </span>
            {selectedCategories.map(cat => (
              <span
                key={cat.id}
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '999px',
                  backgroundColor: cat.color ? `${cat.color}15` : '#f1f5f9',
                  color: cat.color || '#334155',
                  border: `1px solid ${cat.color ? `${cat.color}35` : '#e2e8f0'}`,
                }}
              >
                {cat.name}
              </span>
            ))}
          </div>
        )}

        {/* ─── GRID CENTRAL: QR CODE & COMPARTILHAMENTO vs ARENA DE JOGADORES ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', alignItems: 'start' }}>
          
          {/* COLUNA ESQUERDA: QR CODE & LINKS DE ACESSO */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  color: '#1368ce',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <QrCode style={{ width: '20px', height: '20px' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                  Entrada Rápida via QR Code
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                  Aponte a câmera do celular para entrar direto
                </p>
              </div>
            </div>

            {/* Imagem do QR Code */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '16px',
                border: '1.5px dashed #cbd5e1',
              }}
            >
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  border: '1px solid #e2e8f0',
                }}
              >
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(roomLink)}&color=46178f&bgcolor=ffffff`}
                  alt="QR Code da Sala"
                  style={{ width: '160px', height: '160px', display: 'block', borderRadius: '8px' }}
                />
              </div>
            </div>

            {/* Link dos Jogadores */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                Link Direto para os Alunos
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  readOnly 
                  value={roomLink} 
                  onClick={e => (e.target as any).select()}
                  style={{
                    flex: 1,
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    fontSize: '12px',
                    color: '#1e293b',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={onCopyLink}
                  style={{
                    height: '38px',
                    padding: '0 14px',
                    borderRadius: '8px',
                    backgroundColor: linkCopied ? '#10b981' : '#1368ce',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {linkCopied ? <Check style={{ width: '14px', height: '14px' }} /> : <Copy style={{ width: '14px', height: '14px' }} />}
                  <span>{linkCopied ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            {/* Botão para abrir Telão de Apresentação */}
            {role === 'operator' && spectatorLink && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#166534', display: 'block' }}>
                    Telão para o Público
                  </span>
                  <span style={{ fontSize: '11px', color: '#15803d' }}>
                    Tela limpa sem botões do host para projetar
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => window.open(spectatorLink, '_blank', 'noopener,noreferrer')}
                  style={{
                    height: '32px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ExternalLink style={{ width: '12px', height: '12px' }} />
                  <span>Abrir</span>
                </button>
              </div>
            )}
          </div>

          {/* COLUNA DIREITA: ARENA DE JOGADORES CONECTADOS */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              minHeight: '380px',
            }}
          >
            {/* Cabeçalho da Lista */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: '#f3e8ff',
                    color: '#46178f',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Users style={{ width: '20px', height: '20px' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                    Jogadores Conectados
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                    Entrando em tempo real na arena
                  </p>
                </div>
              </div>

              {/* Contador em destaque estilo Kahoot! */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  backgroundColor: activePlayers.length > 0 ? '#ecfdf5' : '#f1f5f9',
                  border: `1px solid ${activePlayers.length > 0 ? '#a7f3d0' : '#e2e8f0'}`,
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: activePlayers.length > 0 ? '#10b981' : '#94a3b8',
                  }}
                  className={activePlayers.length > 0 ? 'animate-pulse' : ''}
                />
                <span style={{ fontSize: '13px', fontWeight: 800, color: activePlayers.length > 0 ? '#065f46' : '#475569' }}>
                  {activePlayers.length} {activePlayers.length === 1 ? 'competidor' : 'competidores'} · {onlineCount} online
                </span>
              </div>
            </div>

            {/* Identificação do Jogador Conectado */}
            {role === 'player' && nickname && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img 
                    src={getAvatarUrl(nickname)} 
                    alt="" 
                    style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} 
                  />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e40af' }}>Você: {nickname}</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8', backgroundColor: '#dbeafe', padding: '2px 8px', borderRadius: '999px' }}>
                  Pronto para jogar
                </span>
              </div>
            )}

            {/* Grid dos Competidores */}
            {activePlayers.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '36px 16px',
                  borderRadius: '16px',
                  backgroundColor: '#f8fafc',
                  border: '1.5px dashed #cbd5e1',
                  textAlign: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: '#eff6ff',
                    color: '#1368ce',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  className="animate-pulse"
                >
                  <Users style={{ width: '28px', height: '28px' }} />
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                    Aguardando os primeiros participantes...
                  </h4>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0', maxWidth: '320px', lineHeight: 1.5 }}>
                    Peça para os alunos apontarem a câmera do celular para o QR Code ao lado ou digitarem o PIN <strong style={{ color: '#46178f' }}>{roomCode}</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '10px',
                  maxHeight: '340px',
                  overflowY: 'auto',
                  paddingRight: '4px',
                }}
              >
                {activePlayers.map((player) => {
                  const isOnline = onlinePlayerIds.includes(player.id);
                  return (
                    <div
                      key={player.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '12px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <div style={{ position: 'relative', width: '28px', height: '28px', flexShrink: 0 }}>
                          <img 
                            src={getAvatarUrl(player.nickname)} 
                            alt="" 
                            style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', backgroundColor: '#e2e8f0' }} 
                          />
                          <span 
                            style={{
                              position: 'absolute',
                              bottom: '-1px',
                              right: '-1px',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: isOnline ? '#10b981' : '#94a3b8',
                              border: '1.5px solid #ffffff',
                            }}
                            title={isOnline ? 'Online' : 'Desconectado'}
                          />
                        </div>
                        <span 
                          style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={player.nickname}
                        >
                          {player.nickname}
                        </span>
                      </div>

                    {role === 'operator' && (
                      <button
                        type="button"
                        onClick={() => onRemovePlayer(player.id)}
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        title="Remover jogador"
                        onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <Trash style={{ width: '13px', height: '13px' }} />
                      </button>
                    )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Opções Avançadas da Sala (Retrátil) */}
            {role === 'operator' && (
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: 0,
                  }}
                >
                  <Settings style={{ width: '14px', height: '14px' }} />
                  <span>{showSettings ? 'Ocultar Opções da Sala' : 'Configurações Avançadas da Sala'}</span>
                </button>

                {showSettings && (
                  <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '10px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Limite:</span>
                      <input 
                        type="number" 
                        min="1" 
                        max="500" 
                        value={maxPlayers}
                        onChange={e => onMaxPlayersChange(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                        style={{ width: '60px', height: '28px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 6px', fontSize: '11px', fontWeight: 700, textAlign: 'center' }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={onToggleJoinLocked}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: joinLocked ? '#fef2f2' : '#ffffff',
                        border: `1px solid ${joinLocked ? '#fecaca' : '#cbd5e1'}`,
                        color: joinLocked ? '#dc2626' : '#475569',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {joinLocked ? <Lock style={{ width: '12px', height: '12px' }} /> : <Unlock style={{ width: '12px', height: '12px' }} />}
                      <span>{joinLocked ? 'Entradas Bloqueadas' : 'Liberar Entradas'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={onToggleAutoReveal}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: autoReveal ? '#eff6ff' : '#ffffff',
                        border: `1px solid ${autoReveal ? '#bfdbfe' : '#cbd5e1'}`,
                        color: autoReveal ? '#1368ce' : '#475569',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Eye style={{ width: '12px', height: '12px' }} />
                      <span>{autoReveal ? 'Revelar Automático' : 'Revelar Manual'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── BARRA DE RODAPÉ / AÇÃO INICIAR PARTIDA ESTILO KAHOOT! ──────────── */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '16px 24px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          {/* Lado Esquerdo: Resumo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
              }}
            >
              <Sparkles style={{ width: '16px', height: '16px', color: '#1368ce' }} />
            </div>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', display: 'block' }}>
                Pronto para o Sorteio
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {selectedCategoryIds.length > 0 ? `${selectedCategoryIds.length} quizzes preparados para girar na Roleta` : 'Categorias configuradas'}
              </span>
            </div>
          </div>

          {/* Lado Direito: Botão Iniciar Partida */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={onBack}
              style={{
                height: '46px',
                padding: '0 20px',
                borderRadius: '12px',
                backgroundColor: '#f1f5f9',
                border: 'none',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            {role === 'operator' ? (
              <button
                type="button"
                onClick={onStartMatch}
                style={{
                  height: '48px',
                  padding: '0 32px',
                  borderRadius: '12px',
                  backgroundColor: '#1368ce',
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: 900,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(19, 104, 206, 0.35)',
                  transition: 'all 0.15s ease',
                  letterSpacing: '0.3px',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#0f54a8'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#1368ce'; e.currentTarget.style.transform = 'none'; }}
              >
                <Play style={{ width: '18px', height: '18px', fill: 'currentColor' }} />
                <span>INICIAR PARTIDA</span>
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#1368ce' }} className="animate-ping" />
                <span>Aguardando o professor iniciar a partida...</span>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
};

export default GameLobbyView;
