import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Eye, Trophy, ArrowRight, RotateCw, 
  Lock, Unlock, Users, CheckCircle2, AlertCircle, Smartphone, 
  HelpCircle, ChevronDown, ChevronUp, Sparkles, LogOut, Plus
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { remainingSeconds } from '../../lib/gameRules';
import { type OnlineRoom, gameRpc } from '../../lib/onlineGame';
import { triggerHaptic } from '../../PlayerView';

interface TeacherRemoteViewProps {
  roomCode: string;
  initialToken?: string;
  onExit?: () => void;
}

interface RoomPlayer {
  id: string;
  nickname: string;
  score: number;
  team_name?: string | null;
}

export const TeacherRemoteView: React.FC<TeacherRemoteViewProps> = ({
  roomCode,
  initialToken = '',
  onExit
}) => {
  const [room, setRoom] = useState<OnlineRoom | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [pairedToken, setPairedToken] = useState<string>(() => {
    return initialToken || sessionStorage.getItem(`quiz_remote_token_${roomCode}`) || '';
  });
  const [inputToken, setInputToken] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [activeTab, setActiveTab] = useState<'control' | 'players'>('control');
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Canal Broadcast do Supabase
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // 1. Inicializa canal de controle remoto Realtime
  useEffect(() => {
    if (!roomCode) return;

    const channelName = `host-remote-${roomCode.toUpperCase()}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    });

    channel
      .on('broadcast', { event: 'host-auth-response' }, ({ payload }) => {
        if (payload?.success) {
          setIsAuthorized(true);
          setAuthChecking(false);
          setAuthError('');
          if (payload.token) {
            setPairedToken(payload.token);
            sessionStorage.setItem(`quiz_remote_token_${roomCode}`, payload.token);
          }
        } else {
          setIsAuthorized(false);
          setAuthChecking(false);
          setAuthError(payload?.message || 'Código de pareamento incorreto.');
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Se já tem token da URL ou da sessão, tenta validar automaticamente
          const tokenToTest = initialToken || pairedToken;
          if (tokenToTest) {
            channel.send({
              type: 'broadcast',
              event: 'host-auth-request',
              payload: { token: tokenToTest }
            });
          } else {
            // Verifica se o usuário atual já está logado como Host no Supabase
            checkIfAlreadyHost();
          }
        }
      });

    broadcastChannelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomCode, initialToken]);

  // Checa se o usuário no navegador mobile é o próprio criador da sala no Supabase
  const checkIfAlreadyHost = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAuthChecking(false);
        return;
      }

      const { data: roomData } = await supabase
        .from('game_rooms')
        .select('host_id')
        .eq('code', roomCode.toUpperCase())
        .maybeSingle();

      if (roomData && roomData.host_id === user.id) {
        setIsAuthorized(true);
        setAuthChecking(false);
      } else {
        setAuthChecking(false);
      }
    } catch {
      setAuthChecking(false);
    }
  };

  // 2. Sincroniza dados da sala e jogadores periodicamente
  useEffect(() => {
    let stopped = false;

    const fetchRoom = async () => {
      try {
        const [{ data: rData }, { data: pData }] = await Promise.all([
          supabase
            .from('game_rooms')
            .select('*')
            .eq('code', roomCode.toUpperCase())
            .maybeSingle(),
          supabase
            .from('room_players')
            .select('id,nickname,score,team_name')
            .eq('room_code', roomCode.toUpperCase())
            .order('score', { ascending: false })
        ]);

        if (stopped) return;

        if (rData) {
          setRoom(rData as OnlineRoom);
        }
        if (pData) {
          setPlayers(pData);
        }
      } catch (err) {
        console.warn('Erro ao atualizar sala no controle remoto:', err);
      }
    };

    fetchRoom();
    const interval = window.setInterval(fetchRoom, 1500);

    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [roomCode]);

  // 3. Atualiza relógio do cronômetro da pergunta
  useEffect(() => {
    if (!room || room.round_state !== 'question') {
      setTimeLeft(0);
      return;
    }

    const tick = () => {
      if (room.paused_remaining_ms != null) {
        setTimeLeft(Math.ceil(room.paused_remaining_ms / 1000));
      } else {
        setTimeLeft(remainingSeconds(room.question_deadline));
      }
    };

    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [room?.question_deadline, room?.paused_remaining_ms, room?.round_state]);

  // 4. Envia comando do controle para o host no computador
  const sendCommand = async (action: string, extra: Record<string, unknown> = {}) => {
    triggerHaptic(30);
    setActionLoading(true);

    try {
      if (broadcastChannelRef.current) {
        await broadcastChannelRef.current.send({
          type: 'broadcast',
          event: 'remote-action',
          payload: {
            action,
            token: pairedToken,
            ...extra
          }
        });
      }

      // Fallback: se o professor estiver com autenticação ativa do Supabase no celular
      if (action === 'TOGGLE_PAUSE' && room) {
        try {
          await gameRpc('quiz_host_update', {
            p_code: room.code,
            p_expected_round: room.current_round,
            p_update: { paused: room.paused_remaining_ms == null }
          });
        } catch {
          // Se o broadcast já foi enviado, o host no PC executará
        }
      }
    } catch (err) {
      console.error('Falha ao enviar comando remoto:', err);
    } finally {
      setTimeout(() => setActionLoading(false), 300);
    }
  };

  // Validar PIN digitado manualmente
  const handleValidateManualPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputToken.trim()) return;

    setAuthChecking(true);
    setAuthError('');
    triggerHaptic(25);

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.send({
        type: 'broadcast',
        event: 'host-auth-request',
        payload: { token: inputToken.trim() }
      });
    }

    // Timeout de segurança caso o host não responda em 4 segundos
    setTimeout(() => {
      setAuthChecking((prev) => {
        if (prev) {
          setAuthError('O computador do professor não respondeu. Certifique-se de que a tela da sala está aberta no PC.');
          return false;
        }
        return prev;
      });
    }, 4000);
  };

  // Se não estiver autorizado, exibe tela de pareamento com PIN
  if (!isAuthorized) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif"
        }}
      >
        <div
          style={{
            maxWidth: '400px',
            width: '100%',
            backgroundColor: '#1e293b',
            borderRadius: '24px',
            padding: '32px 24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 8px 24px rgba(124, 58, 237, 0.4)'
            }}
          >
            <Smartphone style={{ width: '32px', height: '32px', color: '#ffffff' }} />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 900, margin: '0 0 6px', color: '#ffffff' }}>
            Controle do Professor
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 24px', lineHeight: 1.5 }}>
            Conecte este smartphone para comandar o telão da sala <strong>{roomCode}</strong> em tempo real.
          </p>

          {authChecking ? (
            <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  border: '3px solid rgba(124, 58, 237, 0.2)',
                  borderTopColor: '#a855f7',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}
              />
              <span style={{ fontSize: '13px', color: '#cbd5e1' }}>Sincronizando com o telão...</span>
            </div>
          ) : (
            <form onSubmit={handleValidateManualPin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {authError && (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#fca5a5',
                    fontSize: '12px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    textAlign: 'left'
                  }}
                >
                  <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                  <span>{authError}</span>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', textAlign: 'left' }}>
                  PIN de Pareamento do Host (4 dígitos)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 4819"
                  style={{
                    width: '100%',
                    height: '52px',
                    backgroundColor: '#0f172a',
                    border: '2px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '14px',
                    color: '#ffffff',
                    fontSize: '24px',
                    fontWeight: 900,
                    letterSpacing: '6px',
                    textAlign: 'center',
                    outline: 'none'
                  }}
                  autoFocus
                />
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginTop: '6px', textAlign: 'left' }}>
                  O código aparece no modal &quot;📱 Controle Remoto&quot; no seu computador.
                </span>
              </div>

              <button
                type="submit"
                disabled={!inputToken.trim()}
                style={{
                  height: '48px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  opacity: !inputToken.trim() ? 0.5 : 1,
                  boxShadow: '0 4px 16px rgba(124, 58, 237, 0.4)'
                }}
              >
                Conectar Controle
              </button>
            </form>
          )}

          {onExit && (
            <button
              type="button"
              onClick={onExit}
              style={{
                marginTop: '20px',
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Voltar ao início
            </button>
          )}
        </div>
      </div>
    );
  }

  // Se a sala não for encontrada
  if (!room) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>Carregando dados da sala {roomCode}...</p>
        </div>
      </div>
    );
  }

  const isLobby = room.status === 'lobby';
  const isPlaying = room.status === 'playing';
  const isQuestion = room.round_state === 'question';
  const isAnswered = room.round_state === 'answered';
  const isRanking = room.round_state === 'ranking';
  const isFinished = room.status === 'finished';
  const isPaused = room.paused_remaining_ms != null;

  const totalPlayersCount = players.length;
  const answeredPercentage = totalPlayersCount > 0 ? Math.round((room.answered_count / totalPlayersCount) * 100) : 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0b0f19',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
        userSelect: 'none'
      }}
    >
      {/* ─── 1. TOPBAR DO SMARTPHONE (COMPACTA E ERGONÔMICA) ─── */}
      <header
        style={{
          height: '60px',
          backgroundColor: '#111827',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: '8px',
              backgroundColor: 'rgba(124, 58, 237, 0.2)',
              border: '1px solid rgba(124, 58, 237, 0.4)',
              color: '#c4b5fd',
              fontSize: '12px',
              fontWeight: 900,
              letterSpacing: '1px'
            }}
          >
            {room.code}
          </div>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#e2e8f0' }}>
            {isLobby ? 'Lobby' : `Rodada ${room.current_round}/${room.rounds}`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Alternador de Abas */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              setActiveTab(activeTab === 'control' ? 'players' : 'control');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '999px',
              backgroundColor: activeTab === 'players' ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            <Users style={{ width: '14px', height: '14px' }} />
            <span>{players.length}</span>
          </button>

          {/* Sair do Controle */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Desconectar o controle remoto do smartphone?')) {
                sessionStorage.removeItem(`quiz_remote_token_${roomCode}`);
                setIsAuthorized(false);
                onExit?.();
              }
            }}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Desconectar do Telão"
          >
            <LogOut style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      </header>

      {/* ─── 2. CONTEÚDO PRINCIPAL: CONTROLE OU LISTA DE ALUNOS ─── */}
      <main style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px', width: '100%', margin: '0 auto' }}>
        {activeTab === 'players' ? (
          /* ABA: LISTA DE ALUNOS E PLACAR */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                Alunos Conectados ({players.length})
              </h3>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Ordenados por pontos</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {players.map((p, idx) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    backgroundColor: idx === 0 ? 'rgba(234, 179, 8, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                    border: idx === 0 ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 900, color: idx === 0 ? '#eab308' : '#64748b', width: '20px' }}>
                      #{idx + 1}
                    </span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>{p.nickname}</div>
                      {p.team_name && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{p.team_name}</div>}
                    </div>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#38bdf8' }}>
                    {p.score} pts
                  </div>
                </div>
              ))}
              {players.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '13px' }}>
                  Nenhum aluno entrou na sala ainda.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ABA: CONTROLE PRINCIPAL DA SALA */
          <>
            {/* ESTADO DO LOBBY */}
            {isLobby && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    backgroundColor: 'rgba(76, 29, 149, 0.25)',
                    border: '1.5px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '20px',
                    padding: '24px 20px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                    Sala Aberta no Telão
                  </div>
                  <div style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '4px', color: '#ffffff', fontFamily: 'monospace' }}>
                    {room.code}
                  </div>
                  <div style={{ fontSize: '14px', color: '#cbd5e1', marginTop: '12px' }}>
                    {players.length} {players.length === 1 ? 'aluno aguardando' : 'alunos aguardando'}
                  </div>
                </div>

                {/* Botões do Lobby */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    type="button"
                    disabled={actionLoading || players.length === 0}
                    onClick={() => sendCommand('START_MATCH')}
                    style={{
                      height: '60px',
                      borderRadius: '16px',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      fontSize: '18px',
                      fontWeight: 900,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
                      opacity: players.length === 0 ? 0.5 : 1
                    }}
                  >
                    <Play style={{ width: '22px', height: '22px', fill: '#ffffff' }} />
                    <span>Iniciar Partida Agora</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendCommand('TOGGLE_JOIN_LOCK')}
                    style={{
                      height: '46px',
                      borderRadius: '12px',
                      backgroundColor: room.join_locked ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                      border: `1px solid ${room.join_locked ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.15)'}`,
                      color: room.join_locked ? '#f87171' : '#ffffff',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {room.join_locked ? <Lock style={{ width: '16px', height: '16px' }} /> : <Unlock style={{ width: '16px', height: '16px' }} />}
                    <span>{room.join_locked ? 'Entrada Trancada (Destrancar)' : 'Trancar Entrada de Alunos'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* ESTADO DE JOGO / PERGUNTA ATIVA */}
            {isPlaying && !isFinished && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* CARD DO TIMER E RESPOSTAS */}
                {isQuestion && (
                  <div
                    style={{
                      backgroundColor: isPaused ? 'rgba(234, 179, 8, 0.15)' : 'rgba(15, 23, 42, 0.8)',
                      border: `1.5px solid ${isPaused ? '#eab308' : 'rgba(255, 255, 255, 0.12)'}`,
                      borderRadius: '18px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Tempo Restante {isPaused && <span style={{ color: '#eab308' }}>• PAUSADO</span>}
                      </div>
                      <div
                        style={{
                          fontSize: '36px',
                          fontWeight: 900,
                          color: timeLeft <= 5 && !isPaused ? '#ef4444' : isPaused ? '#facc15' : '#ffffff',
                          fontFamily: 'monospace',
                          lineHeight: 1.1
                        }}
                      >
                        {timeLeft}s
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Respostas
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 900, color: '#38bdf8' }}>
                        {room.answered_count} / {totalPlayersCount}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                        {answeredPercentage}% da turma
                      </div>
                    </div>
                  </div>
                )}

                {/* CARD DA PERGUNTA COM GABARITO DESTACADO */}
                {room.current_question ? (
                  <div
                    style={{
                      backgroundColor: '#1e293b',
                      borderRadius: '20px',
                      padding: '20px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px'
                    }}
                  >
                    {/* Categoria */}
                    {room.selected_category && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 10px',
                            borderRadius: '999px',
                            backgroundColor: room.selected_category.color ? `${room.selected_category.color}22` : 'rgba(124, 58, 237, 0.2)',
                            color: room.selected_category.color || '#c4b5fd',
                            border: `1px solid ${room.selected_category.color || '#c4b5fd'}44`
                          }}
                        >
                          {room.selected_category.name}
                        </span>
                      </div>
                    )}

                    {/* Texto do Enunciado */}
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, lineHeight: 1.4, color: '#ffffff' }}>
                      {room.current_question.question_text}
                    </h3>

                    {/* Alternativas com GABARITO destacado em verde no celular do professor */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {room.current_question.alternatives.map((alt, idx) => {
                        const isCorrect = alt.isCorrect;
                        const letter = ['A', 'B', 'C', 'D'][idx];

                        return (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              borderRadius: '12px',
                              backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                              border: isCorrect ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 900,
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '6px',
                                  backgroundColor: isCorrect ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                                  color: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                {letter}
                              </span>
                              <span style={{ fontSize: '13px', fontWeight: isCorrect ? 800 : 600, color: isCorrect ? '#a7f3d0' : '#e2e8f0' }}>
                                {alt.text}
                              </span>
                            </div>
                            {isCorrect && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '11px', fontWeight: 900 }}>
                                <CheckCircle2 style={{ width: '16px', height: '16px' }} />
                                <span>GABARITO</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explicação Pedagógica (Accordion) */}
                    {room.current_question.explanation && (
                      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setShowExplanation(!showExplanation)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#93c5fd',
                            fontSize: '12px',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          <HelpCircle style={{ width: '14px', height: '14px' }} />
                          <span>Justificativa Pedagógica</span>
                          {showExplanation ? <ChevronUp style={{ width: '14px', height: '14px' }} /> : <ChevronDown style={{ width: '14px', height: '14px' }} />}
                        </button>
                        {showExplanation && (
                          <div
                            style={{
                              marginTop: '8px',
                              padding: '12px',
                              borderRadius: '10px',
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              border: '1px solid rgba(59, 130, 246, 0.25)',
                              color: '#bfdbfe',
                              fontSize: '12px',
                              lineHeight: 1.5
                            }}
                          >
                            {room.current_question.explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Modo Sorteio / Espera de Rodada */
                  <div
                    style={{
                      backgroundColor: '#1e293b',
                      borderRadius: '20px',
                      padding: '24px',
                      textAlign: 'center',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <Sparkles style={{ width: '32px', height: '32px', color: '#a855f7', margin: '0 auto 12px' }} />
                    <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 900 }}>Pronto para o Sorteio</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                      Toque no botão abaixo para girar a roleta ou sortear a próxima pergunta no telão.
                    </p>
                  </div>
                )}

                {/* ─── BOTOEIRA DE AÇÃO RÁPIDA (TOUCH ERGONÔMICO) ─── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                  {/* Durante a pergunta: Pausar e Revelar */}
                  {isQuestion && (
                    <>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => sendCommand('TOGGLE_PAUSE')}
                        style={{
                          height: '54px',
                          borderRadius: '14px',
                          backgroundColor: isPaused ? '#10b981' : '#eab308',
                          color: '#0f172a',
                          fontSize: '14px',
                          fontWeight: 900,
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                        }}
                      >
                        {isPaused ? <Play style={{ width: '18px', height: '18px', fill: '#0f172a' }} /> : <Pause style={{ width: '18px', height: '18px', fill: '#0f172a' }} />}
                        <span>{isPaused ? 'Retomar' : 'Pausar Tempo'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => sendCommand('REVEAL_ANSWER')}
                        style={{
                          height: '54px',
                          borderRadius: '14px',
                          backgroundColor: '#3b82f6',
                          color: '#ffffff',
                          fontSize: '14px',
                          fontWeight: 900,
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                        }}
                      >
                        <Eye style={{ width: '18px', height: '18px' }} />
                        <span>Revelar Agora</span>
                      </button>

                      {/* Botões de Ajuste de Tempo */}
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => sendCommand('ADJUST_TIME', { amount: 10 })}
                        style={{
                          height: '46px',
                          borderRadius: '12px',
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        <Plus style={{ width: '15px', height: '15px' }} />
                        <span>+10 Segundos</span>
                      </button>

                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => sendCommand('ADJUST_TIME', { amount: 20 })}
                        style={{
                          height: '46px',
                          borderRadius: '12px',
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        <Plus style={{ width: '15px', height: '15px' }} />
                        <span>+20 Segundos</span>
                      </button>
                    </>
                  )}

                  {/* Após resposta: Ir para o Placar */}
                  {isAnswered && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => sendCommand('SHOW_RANKING')}
                      style={{
                        gridColumn: 'span 2',
                        height: '56px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
                        color: '#ffffff',
                        fontSize: '16px',
                        fontWeight: 900,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 8px 24px rgba(124, 58, 237, 0.4)'
                      }}
                    >
                      <Trophy style={{ width: '20px', height: '20px' }} />
                      <span>Exibir Placar no Telão</span>
                    </button>
                  )}

                  {/* No Placar: Próxima Rodada */}
                  {isRanking && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => sendCommand('NEXT_ROUND')}
                      style={{
                        gridColumn: 'span 2',
                        height: '56px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        fontSize: '16px',
                        fontWeight: 900,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)'
                      }}
                    >
                      <span>Avançar para a Próxima Rodada</span>
                      <ArrowRight style={{ width: '20px', height: '20px' }} />
                    </button>
                  )}

                  {/* Em Idle ou Sorteio: Girar Roleta */}
                  {(room.round_state === 'idle' || room.round_state === 'spinning') && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => sendCommand('SPIN')}
                      style={{
                        gridColumn: 'span 2',
                        height: '56px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                        color: '#ffffff',
                        fontSize: '16px',
                        fontWeight: 900,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 8px 24px rgba(236, 72, 153, 0.4)'
                      }}
                    >
                      <RotateCw style={{ width: '20px', height: '20px' }} />
                      <span>Girar Roleta / Sortear Pergunta</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ESTADO FINALIZADO */}
            {isFinished && (
              <div
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: '24px',
                  padding: '32px 20px',
                  textAlign: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
                <Trophy style={{ width: '48px', height: '48px', color: '#facc15' }} />
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 900 }}>Partida Concluída!</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                  O pódio dos campeões está sendo exibido no telão da sala.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* ─── 3. BARRA INFERIOR DE STATUS ─── */}
      <footer
        style={{
          height: '42px',
          backgroundColor: '#0f172a',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#64748b'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
          <span>Controle Conectado</span>
        </div>
        <div>
          Quizziando Host v1.0
        </div>
      </footer>
    </div>
  );
};

export default TeacherRemoteView;
