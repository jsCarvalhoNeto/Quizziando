import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Trophy, CheckCircle, XCircle, Clock, Users, 
  Flame, Sparkles, AlertCircle, Award
} from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { supabase } from './lib/supabaseClient';
import { getAvatarUrl } from './lib/avatars';
import { 
  gameRpc, newPlayerToken, readPlayerSession, savePlayerSession, 
  type OnlineRoom, type PlayerSnapshot, type PlayerSession 
} from './lib/onlineGame';
import { remainingSeconds } from './lib/gameRules';
import KahootCountdown from './components/KahootCountdown';
import AmbientBorderGlow from './components/game/AmbientBorderGlow';

// ==========================================
// 📳 UTILITÁRIO DE VIBRAÇÃO HÁPTICA (MOBILE)
// ==========================================
export const triggerHaptic = (pattern: number | number[]) => {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Silencioso se o dispositivo ou navegador não suportar
  }
};

// ==========================================
// 🎨 CORES E SÍMBOLOS DAS ALTERNATIVAS (A/B/C/D)
// ==========================================
export const ANSWER_COLORS = [
  { 
    index: 0, 
    label: 'A', 
    symbol: '▲', 
    bg: '#E53E3E', 
    bgHover: '#C53030', 
    glow: 'rgba(229,62,62,0.45)', 
    name: 'Vermelho',
    gradient: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
    border: '#FCA5A5'
  },
  { 
    index: 1, 
    label: 'B', 
    symbol: '◆', 
    bg: '#3182CE', 
    bgHover: '#2B6CB0', 
    glow: 'rgba(49,130,206,0.45)', 
    name: 'Azul',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
    border: '#93C5FD'
  },
  { 
    index: 2, 
    label: 'C', 
    symbol: '●', 
    bg: '#D69E2E', 
    bgHover: '#B7791F', 
    glow: 'rgba(214,158,46,0.45)', 
    name: 'Amarelo',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #B45309 100%)',
    border: '#FDE68A'
  },
  { 
    index: 3, 
    label: 'D', 
    symbol: '■', 
    bg: '#38A169', 
    bgHover: '#276749', 
    glow: 'rgba(56,161,105,0.45)', 
    name: 'Verde',
    gradient: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
    border: '#A7F3D0'
  },
];

// ==========================================
// 📊 TIPOS
// ==========================================
interface PlayerViewProps {
  roomCode: string;
}

type RoomState = OnlineRoom;

type PlayerScreen = 'join' | 'waiting' | 'spinning' | 'category-reveal' | 'question-reveal' | 'question' | 'answered' | 'round-result' | 'ranking' | 'finished';

// ==========================================
// 💬 MENSAGENS MOTIVACIONAIS
// ==========================================
const MOTIVATIONAL_MESSAGES = [
  "Vamos Lá!",
  "Falta Pouco!",
  "Continue Firme!",
  "Prepare-se!",
  "Você Consegue!",
  "Mantenha o Foco!"
];

const getMotivationalMessage = (): string => {
  return MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
};

const getRoundStatusMessage = (current: number, total: number): string => {
  const roundsLeft = total - current;
  const randomMsg = getMotivationalMessage();
  if (roundsLeft <= 0) {
    return `Última rodada! ${randomMsg}`;
  }
  return `Faltam ${roundsLeft} rodada${roundsLeft > 1 ? 's' : ''}. ${randomMsg}`;
};

// ==========================================
// 🎮 COMPONENTE PRINCIPAL DO JOGADOR
// ==========================================
export default function PlayerView({ roomCode }: PlayerViewProps) {
  const [playerScreen, setPlayerScreen] = useState<PlayerScreen>('join');
  const [nickname, setNickname] = useState('');
  const [teamName, setTeamName] = useState('');
  const [roomMode, setRoomMode] = useState<OnlineRoom['game_mode'] | null>(null);
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
  const [countdownSeconds] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('quizziando_countdown_seconds');
      const n = saved ? parseInt(saved, 10) : 7;
      return Number.isFinite(n) && n >= 2 && n <= 60 ? n : 7;
    } catch {
      return 7;
    }
  });

  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [connected, setConnected] = useState(false);

  // ── 🔥 Mecânica de Acerto em Cadeia (Streaks) ──
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const lastStreakRound = useRef<number>(-1);
  const lastHapticSecond = useRef<number>(-1);

  useEffect(() => {
    supabase.from('game_rooms').select('game_mode').eq('code', roomCode).maybeSingle()
      .then(({ data }) => setRoomMode((data?.game_mode as OnlineRoom['game_mode']) || null));
  }, [roomCode]);

  const [session, setSession] = useState<PlayerSession | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [answerError, setAnswerError] = useState('');
  const [pendingAnswer, setPendingAnswer] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [serverOffset, setServerOffset] = useState(0);
  const sendingRef = useRef(false);
  const lastSnapshot = useRef(0);
  const lastRound = useRef(0);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [isWinner, setIsWinner] = useState(false);
  const [rankingPlayers, setRankingPlayers] = useState<PlayerSnapshot['players']>([]);
  const categories = roomState?.categories || [];

  const applySnapshot = useCallback((snapshot: PlayerSnapshot) => {
    const stamp = Date.parse(snapshot.server_now);
    if (stamp < lastSnapshot.current) return;
    lastSnapshot.current = stamp;
    const { room, player, answer, players } = snapshot;

    if (lastRound.current !== room.current_round) {
      setAnswerError('');
      setPendingAnswer(null);
      lastRound.current = room.current_round;
    }

    setRoomState(room);
    setPlayerId(player.id);
    setNickname(player.nickname);
    setMyScore(player.score);
    setChosenIndex(answer?.answer_index ?? null);
    setWasCorrect(answer?.is_correct ?? null);
    setPointsEarned(answer?.points_earned ?? 0);
    if (answer) { 
      setPendingAnswer(null); 
      setAnswerError(''); 
    }
    setAnsweredCount(room.answered_count);
    setTotalPlayers(players.length);
    setRankingPlayers(players);
    setPlayerRank(players.findIndex(p => p.id === player.id) + 1);
    setIsWinner(players.length > 0 && player.score > 0 && player.score === players[0].score);
    setServerOffset(stamp - Date.now());
    setConnected(true);

    // ── Atualização do Streak e Efeitos Hápticos ──
    if (room.round_state === 'answered' && lastStreakRound.current !== room.current_round) {
      lastStreakRound.current = room.current_round;
      if (answer?.is_correct) {
        setStreak(prev => {
          const next = prev + 1;
          setBestStreak(b => Math.max(b, next));
          if (next >= 2) {
            triggerHaptic([40, 40, 50, 40, 140]);
            try {
              confetti({
                particleCount: 45 + Math.min(next * 15, 80),
                spread: 70,
                origin: { y: 0.6 }
              });
            } catch {}
          } else {
            triggerHaptic([45, 60, 90]);
            try {
              confetti({
                particleCount: 25,
                spread: 45,
                origin: { y: 0.7 }
              });
            } catch {}
          }
          return next;
        });
      } else {
        setStreak(0);
        triggerHaptic([140, 60, 140]);
      }
    }

    if (room.status === 'finished') setPlayerScreen('finished');
    else if (room.round_state === 'question') setPlayerScreen(answer ? 'answered' : 'question');
    else if (room.round_state === 'answered') setPlayerScreen('round-result');
    else if (room.round_state === 'ranking') setPlayerScreen('ranking');
    else if (['spinning', 'category-reveal', 'question-reveal'].includes(room.round_state)) {
      setPlayerScreen(room.round_state as PlayerScreen);
    } else {
      setPlayerScreen('waiting');
    }
  }, []);

  // Resume only with the secret saved on this device.
  useEffect(() => {
    const saved = readPlayerSession(roomCode);
    if (!saved) return;
    let cancelled = false;
    setJoining(true);
    gameRpc<PlayerSnapshot>('quiz_player_state', { p_code: roomCode, p_token: saved.token })
      .then(snapshot => { if (!cancelled) { applySnapshot(snapshot); setSession(saved); } })
      .catch(error => { if (!cancelled) setJoinError(error.message); })
      .finally(() => { if (!cancelled) setJoining(false); });
    return () => { cancelled = true; };
  }, [roomCode, applySnapshot]);

  // Subscribe once per session, resync on reconnect, and recover missed events by polling.
  useEffect(() => {
    if (!session) return;
    let stopped = false;
    let loading = false;
    let queued = false;
    const refresh = async () => {
      if (stopped) return;
      if (loading) { queued = true; return; }
      loading = true;
      try {
        const snapshot = await gameRpc<PlayerSnapshot>('quiz_player_state', { p_code: roomCode, p_token: session.token });
        if (!stopped) applySnapshot(snapshot);
      } catch { if (!stopped) setConnected(false); }
      finally {
        loading = false;
        if (queued && !stopped) { queued = false; void refresh(); }
      }
    };
    const channel = supabase.channel(`room-${roomCode}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `code=eq.${roomCode}` }, () => void refresh())
      .subscribe(status => { if (status === 'SUBSCRIBED') void refresh(); else if (!stopped) setConnected(false); });
    void refresh();
    const poll = window.setInterval(() => void refresh(), 2000);
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      window.clearInterval(poll);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(channel);
    };
  }, [session, roomCode, applySnapshot]);

  useEffect(() => {
    if (!session || !playerId) return;
    const channel = supabase.channel(`presence-${roomCode}`, { config: { presence: { key: playerId } } });
    channel.subscribe(status => {
      if (status === 'SUBSCRIBED') void channel.track({ player_id: playerId, joined_at: new Date().toISOString() });
    });
    return () => { void supabase.removeChannel(channel); };
  }, [session, playerId, roomCode]);

  useEffect(() => {
    const tick = () => setSecondsLeft(roomState?.paused_remaining_ms != null
      ? Math.ceil(roomState.paused_remaining_ms / 1000)
      : remainingSeconds(roomState?.question_deadline ?? null, serverOffset));
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [roomState?.question_deadline, roomState?.paused_remaining_ms, serverOffset]);

  // Vibração nos últimos 3 segundos para criar tensão saudável
  useEffect(() => {
    if (playerScreen === 'question' && secondsLeft > 0 && secondsLeft <= 3 && lastHapticSecond.current !== secondsLeft) {
      lastHapticSecond.current = secondsLeft;
      triggerHaptic(25);
    }
  }, [secondsLeft, playerScreen]);

  // Evitar que a tela do celular apague durante o jogo (Screen Wake Lock API)
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err: any) {
        console.warn(`Wake Lock error: ${err.name}, ${err.message}`);
      }
    };

    const handleVisibilityChange = () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    if (playerScreen !== 'join') {
      requestWakeLock();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock !== null) {
        wakeLock.release().catch(() => {});
        wakeLock = null;
      }
    };
  }, [playerScreen]);

  const handleJoin = async () => {
    if (!nickname.trim()) { setJoinError('Insira um nickname para continuar.'); return; }
    triggerHaptic(30);
    setJoining(true);
    setJoinError('');
    try {
      const saved = readPlayerSession(roomCode);
      const nextSession = saved?.nickname === nickname.trim() ? saved : { token: newPlayerToken(), nickname: nickname.trim() };
      savePlayerSession(roomCode, nextSession);
      const snapshot = await gameRpc<PlayerSnapshot>('quiz_join_room_v2', {
        p_code: roomCode, p_nickname: nextSession.nickname, p_token: nextSession.token, p_team_name: teamName || null,
      });
      applySnapshot(snapshot);
      setSession(nextSession);
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : 'Não foi possível entrar na sala.');
      triggerHaptic([100, 50, 100]);
    } finally { setJoining(false); }
  };

  const handleAnswer = async (answerIndex: number) => {
    if (sendingRef.current || chosenIndex !== null || !session || roomState?.round_state !== 'question') return;
    
    // 📳 Feedback tátil imediato no momento do toque!
    triggerHaptic(35);
    
    sendingRef.current = true;
    setSending(true);
    setPendingAnswer(answerIndex);
    setAnswerError('');
    try {
      const snapshot = await gameRpc<PlayerSnapshot>('quiz_submit_answer', {
        p_code: roomCode, p_token: session.token, p_round: roomState.current_round, p_answer: answerIndex,
      });
      applySnapshot(snapshot);
    } catch (error) {
      setAnswerError(error instanceof Error ? error.message : 'Não foi possível confirmar a resposta. Tente novamente.');
      triggerHaptic([120, 60, 120]);
    } finally { 
      sendingRef.current = false; 
      setSending(false); 
    }
  };

  // Cálculo da porcentagem da barra de tempo
  const totalQuestionSeconds = roomState?.current_question?.time_limit || 20;
  const timeProgressPercent = Math.max(0, Math.min(100, (secondsLeft / totalQuestionSeconds) * 100));

  // ==========================================
  // 🖥️ SUB-COMPONENTES DE UI ERGONÔMICA
  // ==========================================

  // Barra de Status Superior (HUD Compacto)
  const renderTopHUD = () => {
    if (playerScreen === 'join') return null;

    return (
      <header style={styles.topHud}>
        {/* Jogador Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{ position: 'relative' }}>
            <img
              src={getAvatarUrl(nickname)}
              alt=""
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                objectFit: 'cover',
                background: '#1a1f36',
                border: '2px solid rgba(167, 139, 250, 0.5)'
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 9,
                height: 9,
                borderRadius: '50%',
                backgroundColor: connected ? '#10B981' : '#EF4444',
                border: '1.5px solid #0b1021'
              }}
            />
          </div>
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#F1F5F9', fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>
              {nickname}
            </span>
            <span style={{ color: '#94A3B8', fontSize: 10, fontWeight: 600 }}>
              {roomState ? `Rodada ${roomState.current_round}/${roomState.rounds}` : 'Conectado'}
            </span>
          </div>
        </div>

        {/* Centro: 🔥 Streak Badge */}
        {streak > 0 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="streak-badge"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 999,
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(245, 158, 11, 0.25) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.5)',
              boxShadow: '0 0 12px rgba(245, 158, 11, 0.3)'
            }}
          >
            <Flame style={{ width: 14, height: 14, color: '#F59E0B', fill: '#F59E0B' }} />
            <span style={{ color: '#FDE68A', fontWeight: 900, fontSize: 12 }}>
              {streak}x
            </span>
          </motion.div>
        )}

        {/* Lado Direito: Pontuação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            background: 'rgba(124, 58, 237, 0.18)',
            border: '1px solid rgba(124, 58, 237, 0.4)',
            borderRadius: 12,
            padding: '4px 10px',
            textAlign: 'right'
          }}>
            <span style={{ color: '#C4B5FD', fontSize: 12, fontWeight: 900, fontFamily: 'Outfit, monospace' }}>
              {myScore} <span style={{ fontSize: 10, fontWeight: 600, color: '#A78BFA' }}>pts</span>
            </span>
          </div>
        </div>
      </header>
    );
  };

  // ==========================================
  // 🖥️ TELAS DO JOGADOR
  // ==========================================

  // ── 1. Tela de Entrada (Join) ──
  if (playerScreen === 'join') {
    return (
      <div style={styles.fullscreen}>
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.3 }}
          style={styles.joinCard}
        >
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <img 
              src="/logo.png" 
              alt="Quizziando Logo" 
              style={{ 
                height: '60px', 
                width: 'auto', 
                objectFit: 'contain', 
                margin: '0 auto 10px', 
                display: 'block', 
                filter: 'drop-shadow(0 4px 14px rgba(124, 58, 237, 0.45))' 
              }} 
            />
            <h1 style={styles.title}>Quizziando</h1>
            <p style={styles.subtitle}>
              Entrando na Sala <span style={{ color: '#A78BFA', fontWeight: 900 }}>{roomCode.toUpperCase()}</span>
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={styles.label}>SEU NICKNAME</label>
              <input
                type="text"
                placeholder="Ex: Campeão99"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                maxLength={20}
                style={styles.input}
                autoFocus
              />
            </div>

            {roomMode === 'team' && (
              <div>
                <label style={styles.label}>NOME DO TIME</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder="Ex: Time Fênix"
                  maxLength={30}
                  style={styles.input}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                />
              </div>
            )}

            {joinError && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={styles.errorBox}
              >
                <XCircle style={{ width: 16, height: 16, flexShrink: 0, color: '#F87171' }} />
                <span>{joinError}</span>
              </motion.div>
            )}

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleJoin}
              disabled={joining}
              style={{ 
                ...styles.btnPrimary, 
                opacity: joining ? 0.7 : 1,
                marginTop: 6
              }}
            >
              {joining ? 'Entrando na Arena...' : `Entrar na Partida`}
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── 2. Tela de Aguardo (Waiting) ──
  if (playerScreen === 'waiting') {
    return (
      <div style={styles.fullscreen}>
        {renderTopHUD()}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={styles.waitingCard}
        >
          <div style={{ textAlign: 'center' }}>
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              src={getAvatarUrl(nickname)}
              alt="Seu avatar"
              style={{ 
                height: '92px', 
                width: '92px', 
                objectFit: 'cover', 
                borderRadius: '50%', 
                margin: '0 auto 16px', 
                display: 'block', 
                border: '3px solid rgba(124,58,237,0.7)', 
                background: '#0d1326', 
                boxShadow: '0 8px 24px rgba(124, 58, 237, 0.45)' 
              }}
            />
            <h2 style={styles.title}>Tudo pronto!</h2>
            <p style={{ color: '#94A3B8', fontSize: 14, marginTop: 4 }}>
              Olá, <strong style={{ color: 'white' }}>{nickname}</strong>
            </p>
          </div>

          <div style={styles.roomCodeCard}>
            <p style={{ color: '#94A3B8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
              Código da Sala
            </p>
            <p style={{ color: 'white', fontSize: 34, fontWeight: 900, letterSpacing: '0.15em', fontFamily: 'Outfit, monospace' }}>
              {roomCode.toUpperCase()}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
            <span style={styles.pulseDot} />
            <span style={{ color: '#CBD5E1', fontSize: 14, fontWeight: 500 }}>
              Aguardando o professor iniciar...
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', color: '#94A3B8', fontSize: 12 }}>
            <Users style={{ width: 14, height: 14 }} />
            <span>{totalPlayers} jogador{totalPlayers !== 1 ? 'es' : ''} na sala</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── 3. Roleta Girando (Spinning) ──
  if (playerScreen === 'spinning') {
    return (
      <div style={styles.fullscreen}>
        {renderTopHUD()}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={styles.waitingCard}
        >
          <div style={{ textAlign: 'center' }}>
            <h2 style={styles.title}>Sorteando Categoria...</h2>
            <p style={{ color: '#94A3B8', fontSize: 13, marginTop: 6, lineHeight: 1.4 }}>
              A roleta está girando na tela! Fique atento.
            </p>
          </div>

          {/* Mini Roleta Premium Girando */}
          <div style={{ position: 'relative', width: '180px', height: '180px', margin: '16px auto' }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              border: '4px solid white',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              animation: 'spin-infinite 2s linear infinite',
              background: categories.length > 0
                ? `conic-gradient(${categories.map((c, i) => `${c.color} ${i * (360 / categories.length)}deg ${(i + 1) * (360 / categories.length)}deg`).join(', ')})`
                : '#555',
              overflow: 'hidden'
            }} />
            
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'white',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.3)',
            }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <span style={styles.pulseDot} />
            <span style={{ color: '#CBD5E1', fontSize: 13 }}>Dedos cruzados! 🤞</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── 4. Revelação da Categoria (category-reveal) ──
  if (playerScreen === 'category-reveal' && roomState?.selected_category) {
    const cat = roomState.selected_category;
    return (
      <div style={styles.fullscreen}>
        {renderTopHUD()}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 20 }}
          style={{
            ...styles.waitingCard,
            border: `1.5px solid ${cat.color || '#7C3AED'}88`,
            boxShadow: `0 24px 60px ${cat.color || '#7C3AED'}33`,
          }}
        >
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 22,
              background: `linear-gradient(135deg, ${cat.color}ee, ${cat.color}77)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 8px 24px ${cat.color}60`,
            }}>
              <Trophy style={{ width: 36, height: 36, color: 'white' }} />
            </div>

            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
                Categoria Sorteada
              </p>
              <h2 style={{
                fontSize: 26, fontWeight: 900,
                color: cat.color || '#FFFFFF',
                textShadow: `0 0 20px ${cat.color}50`,
                margin: 0,
                fontFamily: "'Outfit', sans-serif"
              }}>
                {cat.name}
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#CBD5E1' }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: cat.color || '#A78BFA',
                animation: 'pulse-opac 1s infinite'
              }} />
              Prepare-se para a pergunta...
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── 5. Pergunta Sendo Revelada (question-reveal) ──
  if (playerScreen === 'question-reveal' && roomState?.current_question) {
    return (
      <div style={styles.fullscreen}>
        {renderTopHUD()}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            ...styles.questionContainer, 
            justifyContent: 'center', 
            alignItems: 'center', 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column'
          }}
        >
          <div style={{ textAlign: 'center', width: '100%', marginBottom: 16 }}>
            <span style={{ color: '#94A3B8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Leia com atenção
            </span>
            <h3 style={{ 
              color: 'white', 
              fontSize: 'clamp(20px, 5.5vw, 28px)', 
              fontWeight: 900, 
              lineHeight: 1.35, 
              textAlign: 'center', 
              marginTop: 8 
            }}>
              {roomState.current_question.question_text}
            </h3>
          </div>

          <div style={{ margin: 'auto 0', display: 'flex', justifyContent: 'center' }}>
            <KahootCountdown seconds={countdownSeconds} soundEnabled={true} />
          </div>
        </motion.div>
      </div>
    );
  }

  // ── 6. PERGUNTA ATIVA — 4 BOTÕES ERGONÔMICOS MOBILE (QUESTION) ──
  if (playerScreen === 'question' && roomState?.current_question) {
    const isPaused = roomState.paused_remaining_ms !== null;
    const isTimeOut = secondsLeft === 0 && !isPaused;

    // Cor dinâmica da barra de progresso do timer
    let timerBarColor = 'linear-gradient(90deg, #10B981 0%, #3B82F6 100%)';
    if (timeProgressPercent <= 25) {
      timerBarColor = 'linear-gradient(90deg, #EF4444 0%, #DC2626 100%)';
    } else if (timeProgressPercent <= 50) {
      timerBarColor = 'linear-gradient(90deg, #F59E0B 0%, #EA580C 100%)';
    }

    return (
      <div style={styles.fullscreen}>
        {renderTopHUD()}

        <main style={styles.questionContainer}>
          {/* Barra de Progresso de Tempo Dinâmica */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{
              width: '100%',
              height: '8px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)'
            }}>
              <motion.div
                initial={false}
                animate={{ width: `${timeProgressPercent}%` }}
                transition={{ duration: 0.25, ease: 'linear' }}
                style={{
                  height: '100%',
                  background: timerBarColor,
                  borderRadius: '999px',
                  boxShadow: timeProgressPercent <= 25 ? '0 0 12px rgba(239, 68, 68, 0.8)' : 'none'
                }}
              />
            </div>

            {/* Linha com Timer Numérico & Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock style={{ width: 14, height: 14, color: secondsLeft <= 3 ? '#EF4444' : '#94A3B8' }} />
                <span style={{ 
                  color: secondsLeft <= 3 ? '#F87171' : '#CBD5E1', 
                  fontSize: 13, 
                  fontWeight: 800,
                  fontFamily: 'Outfit, monospace'
                }}>
                  {isPaused ? `Pausado (${secondsLeft}s)` : `${secondsLeft}s`}
                </span>
              </div>

              {roomState.selected_category && (
                <div style={{
                  padding: '2px 10px',
                  borderRadius: 999,
                  background: `${roomState.selected_category.color || '#7C3AED'}25`,
                  border: `1px solid ${roomState.selected_category.color || '#7C3AED'}60`,
                  color: roomState.selected_category.color || '#C4B5FD',
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}>
                  {roomState.selected_category.name}
                </div>
              )}
            </div>
          </div>

          {/* Enunciado da Pergunta */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            borderRadius: 18,
            padding: '16px',
            textAlign: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ 
              color: '#FFFFFF', 
              fontSize: 'clamp(15px, 4.2vw, 18px)', 
              fontWeight: 800, 
              lineHeight: 1.45,
              margin: 0
            }}>
              {roomState.current_question.question_text}
            </h3>
          </div>

          {/* Alerta de erro ou status de envio */}
          {sending && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ color: '#A78BFA', textAlign: 'center', fontSize: 13, fontWeight: 700 }}
            >
              Enviando sua resposta... ⚡
            </motion.p>
          )}

          {answerError && (
            <div style={styles.errorBox}>
              <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>{answerError}</span>
                {pendingAnswer !== null && (
                  <button
                    onClick={() => handleAnswer(pendingAnswer)}
                    style={{ color: '#FCA5A5', textDecoration: 'underline', fontWeight: 700, fontSize: 12, textAlign: 'left' }}
                  >
                    Tentar confirmar novamente
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── 4 BOTÕES ERGONÔMICOS (POLEGAR MOBILE / THUMB-FRIENDLY) ── */}
          <div style={styles.answersGrid}>
            {ANSWER_COLORS.map((col) => {
              const altText = roomState.current_question!.alternatives?.[col.index]?.text || '';
              const isSelected = pendingAnswer === col.index || chosenIndex === col.index;
              const isDisabled = sending || chosenIndex !== null || isTimeOut || isPaused;

              return (
                <motion.button
                  key={col.index}
                  whileTap={!isDisabled ? { scale: 0.94 } : undefined}
                  whileHover={!isDisabled ? { scale: 1.02 } : undefined}
                  onClick={() => handleAnswer(col.index)}
                  disabled={isDisabled}
                  style={{
                    ...styles.answerBtn,
                    background: col.gradient,
                    boxShadow: isSelected
                      ? `0 0 0 3px #FFFFFF, 0 10px 30px ${col.glow}`
                      : `0 6px 20px ${col.glow}, inset 0 1px 1px rgba(255,255,255,0.3)`,
                    border: `1.5px solid ${col.border}55`,
                    opacity: isDisabled && !isSelected ? 0.65 : 1,
                    transform: isSelected ? 'scale(0.98)' : 'scale(1)',
                  }}
                >
                  {/* Símbolo Geométrico Grande (Kahoot Style com Alto Relevo) */}
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    left: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    opacity: 0.95
                  }}>
                    <span style={{ fontSize: 20, color: 'white', lineHeight: 1, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
                      {col.symbol}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: 'rgba(255,255,255,0.85)', fontFamily: 'Outfit, sans-serif' }}>
                      {col.label}
                    </span>
                  </div>

                  {/* Texto da Alternativa com Quebra Elegante */}
                  <div style={{ 
                    width: '100%', 
                    paddingTop: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '44px'
                  }}>
                    <span style={{
                      ...styles.answerText,
                      fontSize: altText.length > 45 ? '13px' : '15px'
                    }}>
                      {altText || '—'}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
            <Users style={{ width: 12, height: 12, color: '#64748B' }} />
            <p style={{ color: '#94A3B8', fontSize: 11, textAlign: 'center', margin: 0 }}>
              {answeredCount} de {totalPlayers} responderam
            </p>
          </div>
        </main>

        <AmbientBorderGlow
          active={true}
          remainingSeconds={secondsLeft}
          totalSeconds={roomState.time_limit || roomState.current_question?.time_limit || 20}
          isPaused={isPaused}
          intensity="subtle"
        />
      </div>
    );
  }

  // ── 7. Resposta Enviada — Aguardando Resultado (Answered) ──
  if (playerScreen === 'answered' && chosenIndex !== null) {
    const chosen = ANSWER_COLORS[chosenIndex];
    return (
      <div style={styles.fullscreen}>
        {renderTopHUD()}
        <motion.div 
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 20 }}
          style={styles.waitingCard}
        >
          <div style={{ textAlign: 'center' }}>
            <motion.div 
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              style={{
                width: 86, height: 86, borderRadius: 26,
                background: chosen.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: `0 12px 36px ${chosen.glow}`,
                border: '2px solid rgba(255,255,255,0.4)',
                fontSize: 34, fontWeight: 900, color: 'white'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
                <span style={{ fontSize: 24, marginBottom: 2 }}>{chosen.symbol}</span>
                <span>{chosen.label}</span>
              </div>
            </motion.div>

            <h2 style={styles.title}>Resposta Enviada!</h2>
            <p style={{ color: '#94A3B8', fontSize: 13, marginTop: 6 }}>
              Você selecionou <strong style={{ color: chosen.border }}>{chosen.name}</strong> ({chosen.label})
            </p>

            {streak > 1 && (
              <div style={{
                margin: '14px auto 0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 999,
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#FDE68A',
                fontSize: 12,
                fontWeight: 800
              }}>
                <Flame style={{ width: 15, height: 15, color: '#F59E0B' }} />
                <span>Sequência de {streak}x em jogo!</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: 8 }}>
            <Clock style={{ width: 16, height: 16, color: '#A78BFA', animation: 'spin 2.5s linear infinite' }} />
            <span style={{ color: '#CBD5E1', fontSize: 14, fontWeight: 600 }}>
              Aguardando todos responderem...
            </span>
          </div>

          <p style={{ color: '#64748B', fontSize: 11, textAlign: 'center', margin: 0 }}>
            {answeredCount} de {totalPlayers} já confirmaram
          </p>
        </motion.div>

        <AmbientBorderGlow
          active={true}
          remainingSeconds={secondsLeft}
          totalSeconds={roomState?.time_limit || 20}
          isPaused={roomState?.paused_remaining_ms != null}
          intensity="subtle"
        />
      </div>
    );
  }

  // ── 8. RESULTADO DA RODADA COM STREAK E FEEDBACK PEDAGÓGICO (ROUND-RESULT) ──
  if (playerScreen === 'round-result') {
    const chosen = chosenIndex !== null ? ANSWER_COLORS[chosenIndex] : null;

    return (
      <div style={styles.fullscreen}>
        {renderTopHUD()}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 18 }}
          style={styles.waitingCard}
        >
          {roomState && (
            <div style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', fontWeight: 600 }}>
              {getRoundStatusMessage(roomState.current_round, roomState.rounds)}
            </div>
          )}

          <div style={{ textAlign: 'center' }}>
            {wasCorrect ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.25, 1] }}
                  transition={{ duration: 0.5 }}
                >
                  <CheckCircle style={{ width: 64, height: 64, color: '#10B981', filter: 'drop-shadow(0 4px 16px rgba(16, 185, 129, 0.5))' }} />
                </motion.div>
                
                <h2 style={{ ...styles.title, color: '#34D399', marginTop: 10 }}>Resposta Correta!</h2>
                <div style={{
                  marginTop: 6,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 14px',
                  borderRadius: 999,
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#6EE7B7',
                  fontSize: 14,
                  fontWeight: 900
                }}>
                  <Sparkles style={{ width: 14, height: 14 }} />
                  <span>+{pointsEarned} pontos</span>
                </div>

                {/* 🔥 BANNER DE ACERTO EM CADEIA (STREAK) */}
                {streak >= 2 && (
                  <motion.div
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    style={{
                      marginTop: 14,
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 16,
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(239, 68, 68, 0.25) 100%)',
                      border: '1.5px solid rgba(245, 158, 11, 0.6)',
                      boxShadow: '0 4px 20px rgba(245, 158, 11, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8
                    }}
                  >
                    <Flame style={{ width: 22, height: 22, color: '#F59E0B', fill: '#F59E0B' }} />
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ margin: 0, color: '#FDE68A', fontWeight: 900, fontSize: 13 }}>
                        COMBO EM CHAMAS! {streak} ACERTOS SEGUIDOS!
                      </p>
                      <p style={{ margin: 0, color: '#FCD34D', fontSize: 11, fontWeight: 600 }}>
                        Multiplicador de velocidade ativado 🔥
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : chosenIndex === null ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <XCircle style={{ width: 64, height: 64, color: '#F87171', filter: 'drop-shadow(0 4px 16px rgba(239, 68, 68, 0.4))' }} />
                <h2 style={{ ...styles.title, color: '#F87171', marginTop: 10 }}>Tempo Esgotado!</h2>
                <p style={{ color: '#FCA5A5', fontSize: 13, marginTop: 4 }}>
                  Você não respondeu dentro do tempo limite.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <XCircle style={{ width: 64, height: 64, color: '#F87171', filter: 'drop-shadow(0 4px 16px rgba(239, 68, 68, 0.4))' }} />
                <h2 style={{ ...styles.title, color: '#F87171', marginTop: 10 }}>Resposta Incorreta</h2>
                {chosen && (
                  <p style={{ color: '#94A3B8', fontSize: 13, marginTop: 4 }}>
                    Você escolheu <strong style={{ color: chosen.border }}>{chosen.name}</strong> ({chosen.label})
                  </p>
                )}
              </div>
            )}

            {/* Alternativa Correta Destacada */}
            {roomState?.current_question && (
              <div style={{ 
                marginTop: '16px', 
                padding: '12px 14px', 
                background: 'rgba(255,255,255,0.04)', 
                borderRadius: '14px', 
                border: '1px solid rgba(255,255,255,0.08)' 
              }}>
                <p style={{ color: '#94A3B8', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 800 }}>
                  Alternativa Correta
                </p>
                {(() => {
                  const correctIdx = roomState.current_question.alternatives?.findIndex((a: any) => a.isCorrect);
                  if (correctIdx !== undefined && correctIdx !== -1) {
                    const color = ANSWER_COLORS[correctIdx];
                    const text = roomState.current_question.alternatives[correctIdx].text;
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <span style={{ 
                          background: color.gradient, 
                          color: 'white', 
                          width: '26px', 
                          height: '26px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          borderRadius: '8px', 
                          fontSize: '13px', 
                          fontWeight: 900,
                          boxShadow: `0 2px 8px ${color.glow}`
                        }}>
                          {color.label}
                        </span>
                        <span style={{ color: '#F1F5F9', fontWeight: 700, fontSize: '14px', textAlign: 'left', wordBreak: 'break-word' }}>
                          {text}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            {/* Justificativa Pedagógica */}
            {roomState?.current_question?.explanation && (
              <div style={{ 
                marginTop: 12, 
                padding: 12, 
                borderRadius: 14, 
                background: 'rgba(124,58,237,0.12)', 
                border: '1px solid rgba(124,58,237,0.3)',
                color: '#E9D5FF', 
                fontSize: 12,
                lineHeight: 1.5,
                textAlign: 'left'
              }}>
                <strong style={{ color: '#C4B5FD' }}>Por quê?</strong> {roomState.current_question.explanation}
                {roomState.current_question.reference_url?.match(/^https?:\/\//i) && (
                  <a 
                    href={roomState.current_question.reference_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ display: 'block', color: '#93C5FD', marginTop: 6, fontWeight: 700, fontSize: 11 }}
                  >
                    Ver referência externa →
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Card com a Pontuação Acumulada */}
          <div style={styles.scoreCard}>
            <p style={{ color: '#94A3B8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>
              Sua Pontuação Total
            </p>
            <p style={{ color: '#C4B5FD', fontSize: 36, fontWeight: 900, fontFamily: 'Outfit, sans-serif', margin: '4px 0' }}>
              {myScore}
            </p>
            <p style={{ color: '#64748B', fontSize: 11, margin: 0 }}>pontos acumulados</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <span style={styles.pulseDot} />
            <span style={{ color: '#CBD5E1', fontSize: 13, fontWeight: 600 }}>Aguardando próxima rodada...</span>
          </div>
        </motion.div>

        <AmbientBorderGlow
          active={true}
          remainingSeconds={0}
          isAnswered={true}
          isCorrect={wasCorrect}
          intensity="subtle"
        />
      </div>
    );
  }

  // ── 9. Ranking da Rodada (Ranking) ──
  if (playerScreen === 'ranking') {
    return (
      <div style={styles.fullscreen}>
        {renderTopHUD()}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={styles.waitingCard}
        >
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <Trophy style={{ width: 44, height: 44, color: '#FBBF24', margin: '0 auto 8px', filter: 'drop-shadow(0 2px 8px rgba(251, 191, 36, 0.4))' }} />
            <h2 style={{ ...styles.title, color: '#FBBF24', fontSize: 22 }}>Placar da Rodada</h2>
          </div>

          {/* Ranking */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
            {rankingPlayers.map((p, idx) => {
              let badgeBg = '#64748B';
              if (idx === 0) badgeBg = '#F59E0B';
              else if (idx === 1) badgeBg = '#94A3B8';
              else if (idx === 2) badgeBg = '#D97706';

              const isMe = p.nickname === nickname;
              return (
                <div
                  key={p.nickname}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: isMe ? 'rgba(124, 58, 237, 0.22)' : 'rgba(255,255,255,0.04)',
                    border: isMe ? '1.5px solid rgba(167, 139, 250, 0.6)' : '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: badgeBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '13px',
                        color: 'white',
                        flexShrink: 0
                      }}
                    >
                      {idx + 1}
                    </div>
                    <img 
                      src={getAvatarUrl(p.nickname)} 
                      alt="" 
                      style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', background: '#0d1326', flexShrink: 0 }} 
                    />
                    <span style={{ color: 'white', fontWeight: isMe ? 800 : 600, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.nickname} {isMe && '(Você)'}
                    </span>
                  </div>
                  <span style={{ color: '#C4B5FD', fontWeight: 900, fontSize: '15px', fontFamily: 'monospace' }}>
                    {p.score}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: '14px' }}>
            <span style={styles.pulseDot} />
            <span style={{ color: '#CBD5E1', fontSize: 13, fontWeight: 600 }}>Aguardando próxima rodada...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── 10. Jogo Encerrado / Pódio Final (Finished) ──
  if (playerScreen === 'finished') {
    return (
      <div style={styles.fullscreen}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={styles.waitingCard}
        >
          <div style={{ textAlign: 'center' }}>
            {isWinner ? (
              <div style={{ marginBottom: '16px' }}>
                <Trophy style={{ width: 64, height: 64, color: '#FBBF24', margin: '0 auto', filter: 'drop-shadow(0 0 16px rgba(251, 191, 36, 0.6))' }} />
                <h2 style={{ ...styles.title, color: '#FBBF24', marginTop: '12px', fontSize: '26px' }}>
                  Parabéns, Campeão! 👑
                </h2>
                <p style={{ color: '#94A3B8', fontSize: 14, marginTop: 4 }}>
                  Você foi o grande vencedor, {nickname}!
                </p>
              </div>
            ) : (
              <>
                <Award style={{ width: 56, height: 56, color: '#A78BFA', margin: '0 auto 12px' }} />
                <h2 style={styles.title}>Partida Concluída!</h2>
                <p style={{ color: '#94A3B8', fontSize: 14, marginTop: 4 }}>
                  Excelente jogo, {nickname}!
                </p>
              </>
            )}
          </div>

          <div style={styles.scoreCard}>
            <p style={{ color: '#94A3B8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>
              Sua Pontuação Final
            </p>
            <p style={{ color: '#C4B5FD', fontSize: 44, fontWeight: 900, fontFamily: 'Outfit, sans-serif', margin: '4px 0' }}>
              {myScore}
            </p>
            <p style={{ color: '#64748B', fontSize: 12, margin: 0 }}>pontos</p>

            {playerRank !== null && (
              <p style={{ color: '#E2E8F0', fontSize: 14, marginTop: '12px', fontWeight: 700 }}>
                Posição Final: <span style={{ color: '#FBBF24' }}>{playerRank}º lugar</span>
              </p>
            )}

            {bestStreak > 1 && (
              <div style={{
                marginTop: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 999,
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#FDE68A',
                fontSize: 12,
                fontWeight: 700
              }}>
                <Flame style={{ width: 14, height: 14, color: '#F59E0B' }} />
                <span>Melhor sequência: {bestStreak} acertos seguidos</span>
              </div>
            )}
          </div>

          <motion.button 
            whileTap={{ scale: 0.96 }}
            onClick={() => window.location.href = '/'} 
            style={styles.btnPrimary}
          >
            Voltar ao Início
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // Fallback
  return (
    <div style={styles.fullscreen}>
      <div style={styles.waitingCard}>
        <div style={{ ...styles.pulseDot, margin: '0 auto' }} />
        <p style={{ color: '#94A3B8', textAlign: 'center', fontSize: 14, marginTop: 12 }}>Carregando sala...</p>
      </div>
    </div>
  );
}

// ==========================================
// 🎨 ESTILOS ERGONÔMICOS MOBILE (PLAYER VIEW)
// ==========================================
const styles: Record<string, React.CSSProperties> = {
  fullscreen: {
    minHeight: '100dvh',
    background: 'radial-gradient(circle at 50% 0%, #111827 0%, #070B19 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'max(16px, env(safe-area-inset-top)) 16px max(20px, env(safe-area-inset-bottom)) 16px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    position: 'relative',
    boxSizing: 'border-box',
    overflowX: 'hidden',
  },
  topHud: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '56px',
    padding: '0 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(7, 11, 25, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    zIndex: 50,
  },
  joinCard: {
    width: '100%',
    maxWidth: 400,
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: '32px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
    backdropFilter: 'blur(16px)',
  },
  waitingCard: {
    width: '100%',
    maxWidth: 420,
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: '28px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
    backdropFilter: 'blur(16px)',
    marginTop: '48px', // Compensa o header fixo
  },
  questionContainer: {
    width: '100%',
    maxWidth: 440,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    marginTop: '56px', // Compensa o top HUD
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    color: 'white',
    fontFamily: "'Outfit', sans-serif",
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: 800,
    color: '#94A3B8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    marginBottom: 6,
    display: 'block',
  },
  input: {
    width: '100%',
    padding: '13px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1.5px solid rgba(255,255,255,0.1)',
    borderRadius: 14,
    color: 'white',
    fontSize: 15,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    borderRadius: 12,
    padding: '10px 14px',
    fontSize: 12,
    color: '#FCA5A5',
    lineHeight: 1.4,
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
    color: 'white',
    border: 'none',
    padding: '14px 20px',
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
    width: '100%',
    WebkitTapHighlightColor: 'transparent',
  },
  roomCodeCard: {
    background: 'rgba(124, 58, 237, 0.1)',
    border: '1.5px solid rgba(124, 58, 237, 0.3)',
    borderRadius: 18,
    padding: '16px 20px',
    textAlign: 'center',
  },
  // ── Grade Ergonômica dos 4 Botões ──
  answersGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    width: '100%',
    marginTop: 4,
  },
  answerBtn: {
    position: 'relative',
    borderRadius: 20,
    padding: '14px 12px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 116,
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
    userSelect: 'none',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  answerText: {
    fontWeight: 800,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 1.3,
    maxWidth: '100%',
    wordBreak: 'break-word',
    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
    letterSpacing: '-0.01em',
  },
  scoreCard: {
    background: 'rgba(124, 58, 237, 0.1)',
    border: '1.5px solid rgba(124, 58, 237, 0.25)',
    borderRadius: 18,
    padding: '16px 20px',
    textAlign: 'center',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#A78BFA',
    animation: 'pulse-opac 1.5s infinite',
    display: 'inline-block',
  },
};
