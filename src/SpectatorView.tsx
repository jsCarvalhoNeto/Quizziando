import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from './lib/supabaseClient';
import { remainingSeconds } from './lib/gameRules';
import type { OnlineRoom } from './lib/onlineGame';
import { Trophy, Clock, CheckCircle2, Maximize2, Minimize2, Users, Sparkles, QrCode, Smartphone, Crown } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getAvatarUrl } from './lib/avatars';
import KahootCountdown from './components/KahootCountdown';
import TeacherRemoteModal from './components/teacher/TeacherRemoteModal';
import AmbientBorderGlow from './components/game/AmbientBorderGlow';

interface SpectatorPlayer {
  id: string;
  nickname: string;
  score: number;
  team_name: string | null;
}

const KAHOOT_COLORS = [
  { bg: 'linear-gradient(135deg, #e21b3c 0%, #b3102d 100%)', symbol: '▲', label: 'A' },
  { bg: 'linear-gradient(135deg, #1368ce 0%, #0c4a96 100%)', symbol: '◆', label: 'B' },
  { bg: 'linear-gradient(135deg, #d89e00 0%, #a37700 100%)', symbol: '●', label: 'C' },
  { bg: 'linear-gradient(135deg, #26890c 0%, #1a5f08 100%)', symbol: '◼', label: 'D' },
];

// Contagem animada de pontos do pódio (0 → valor final com desaceleração cúbica)
function ScoreCountUp({ value, duration = 1400, style }: { value: number; duration?: number; style?: React.CSSProperties }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span style={style}>{display} pts</span>;
}

// Pirotecnia contínua e canhões de confetes de celebração do pódio
function triggerPodiumCelebration() {
  try {
    const end = Date.now() + 5000;
    const colors = ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#8b5cf6'];
    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 65,
        origin: { x: 0, y: 0.8 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 65,
        origin: { x: 1, y: 0.8 },
        colors,
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
    confetti({
      particleCount: 85,
      spread: 100,
      origin: { y: 0.5 },
      colors,
    });
  } catch {}
}

export default function SpectatorView({ roomCode }: { roomCode: string }) {
  const [room, setRoom] = useState<OnlineRoom | null>(null);
  const [players, setPlayers] = useState<SpectatorPlayer[]>([]);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [pairingPin] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem(`quiz_host_pin_${roomCode}`);
      if (saved) return saved;
      const gen = Math.floor(1000 + Math.random() * 9000).toString();
      sessionStorage.setItem(`quiz_host_pin_${roomCode}`, gen);
      return gen;
    } catch {
      return '4819';
    }
  });
  const [countdownSeconds] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('quizziando_countdown_seconds');
      const n = saved ? parseInt(saved, 10) : 7;
      return Number.isFinite(n) && n >= 2 && n <= 60 ? n : 7;
    } catch {
      return 7;
    }
  });

  useEffect(() => {
    let stopped = false;
    const refresh = async () => {
      const [{ data: nextRoom, error: roomError }, { data: nextPlayers, error: playersError }] = await Promise.all([
        supabase
          .from('game_rooms')
          .select('code,status,round_state,current_round,rounds,game_mode,current_question,selected_category,question_deadline,paused_remaining_ms,answered_count')
          .eq('code', roomCode)
          .maybeSingle(),
        supabase
          .from('room_players')
          .select('id,nickname,score,team_name')
          .eq('room_code', roomCode)
          .order('score', { ascending: false }),
      ]);
      if (stopped) return;
      if (roomError || !nextRoom) {
        setError('Sala não encontrada ou indisponível.');
        return;
      }
      if (playersError) {
        setError('Não foi possível atualizar o placar. Tentando novamente...');
        return;
      }
      setError('');
      setRoom(nextRoom as OnlineRoom);
      setPlayers(nextPlayers || []);
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 1500);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [roomCode]);

  useEffect(() => {
    const tick = () =>
      setSeconds(
        room?.paused_remaining_ms != null
          ? Math.ceil(room.paused_remaining_ms / 1000)
          : remainingSeconds(room?.question_deadline ?? null)
      );
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [room?.question_deadline, room?.paused_remaining_ms]);

  // Celebração de Pódio com Canhões de Fogos e Confetes
  const hasTriggeredPodiumFireworks = useRef(false);
  useEffect(() => {
    if (room?.round_state === 'ranking' || room?.status === 'finished') {
      if (!hasTriggeredPodiumFireworks.current) {
        hasTriggeredPodiumFireworks.current = true;
        triggerPodiumCelebration();
      }
    } else {
      hasTriggeredPodiumFireworks.current = false;
    }
  }, [room?.round_state, room?.status]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const teams = Object.entries(
    players.reduce<Record<string, number>>((scores, player) => {
      if (player.team_name) scores[player.team_name] = (scores[player.team_name] || 0) + player.score;
      return scores;
    }, {})
  ).sort(([, a], [, b]) => b - a);

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    window.location.origin + '?room=' + roomCode
  )}&color=46178F&bgcolor=FFFFFF&margin=2`;

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0f172a 60%, #090d16 100%)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {/* Topbar Cinematográfica do Telão */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 36px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #7C3AED, #2563EB)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)',
            }}
          >
            <Sparkles style={{ width: '22px', height: '22px', color: 'white' }} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Quizziando
            </div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#a5b4fc', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Telão do Público
            </div>
          </div>
        </div>

        {/* PIN Gigante no Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '6px 20px',
            borderRadius: '999px',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.65)', textTransform: 'uppercase' }}>
            PIN:
          </span>
          <span
            style={{
              fontSize: '26px',
              fontWeight: 900,
              letterSpacing: '0.15em',
              fontFamily: 'monospace',
              color: '#38bdf8',
              textShadow: '0 0 12px rgba(56, 189, 248, 0.4)',
            }}
          >
            {roomCode}
          </span>
        </div>

        {/* Ações: Status da Rodada & Fullscreen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {room && (
            <div
              style={{
                fontSize: '13px',
                fontWeight: 800,
                color: '#e2e8f0',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '6px 14px',
                borderRadius: '999px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Rodada {room.current_round} de {room.rounds}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowRemoteModal(true)}
            style={{
              background: 'rgba(124, 58, 237, 0.25)',
              border: '1px solid rgba(139, 92, 246, 0.45)',
              color: '#c4b5fd',
              borderRadius: '10px',
              padding: '7px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 800,
              transition: 'background 0.2s',
            }}
            title="Abrir Controle do Professor no Smartphone"
          >
            <Smartphone style={{ width: '15px', height: '15px' }} />
            <span>Controle Celular</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: 'white',
              borderRadius: '10px',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            title={isFullscreen ? 'Sair da Tela Cheia' : 'Entrar em Tela Cheia'}
          >
            {isFullscreen ? <Minimize2 style={{ width: '18px', height: '18px' }} /> : <Maximize2 style={{ width: '18px', height: '18px' }} />}
          </button>
        </div>
      </header>

      {/* Alerta de erro caso ocorra */}
      {error && (
        <div style={{ background: '#ef4444', color: 'white', padding: '12px 24px', textAlign: 'center', fontWeight: 700 }}>
          {error}
        </div>
      )}

      {/* Conteúdo Central Projetado */}
      <div style={{ flex: 1, padding: '36px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* ESTADO 1: LOBBY / AGUARDANDO INÍCIO OU ROLETA */}
        {(!room || room.round_state === 'idle' || room.round_state === 'spinning') && (
          <div
            style={{
              maxWidth: '960px',
              margin: '0 auto',
              width: '100%',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '36px',
              alignItems: 'center',
              background: 'rgba(30, 27, 75, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '32px',
              padding: '48px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Lado Esquerdo: QR Code e Instruções */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px' }}>
              <div
                style={{
                  background: '#ffffff',
                  padding: '16px',
                  borderRadius: '24px',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
                }}
              >
                <img src={qrCodeUrl} alt="QR Code da Sala" style={{ width: '200px', height: '200px', display: 'block' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#a5b4fc', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  <QrCode style={{ width: '16px', height: '16px' }} /> Aponte a câmera para entrar
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: 'white', marginTop: '6px' }}>
                  Acesse pelo Celular
                </div>
              </div>
            </div>

            {/* Lado Direito: Participantes Conectados */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Users style={{ width: '24px', height: '24px', color: '#38bdf8' }} />
                  <span style={{ fontSize: '20px', fontWeight: 800, color: 'white' }}>
                    Jogadores ({players.length})
                  </span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#34d399', background: 'rgba(52, 211, 153, 0.15)', padding: '4px 12px', borderRadius: '999px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                  Aguardando Início...
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  padding: '10px 0',
                }}
              >
                {players.length === 0 ? (
                  <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '15px', fontStyle: 'italic', padding: '20px 0' }}>
                    Aguardando competidores se conectarem...
                  </div>
                ) : (
                  players.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '999px',
                        padding: '6px 16px',
                        fontSize: '15px',
                        fontWeight: 700,
                        color: 'white',
                      }}
                    >
                      {p.nickname}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ESTADO 2: REVEAL DE CATEGORIA */}
        {room?.round_state === 'category-reveal' && room.selected_category && (
          <div
            style={{
              maxWidth: '700px',
              margin: '0 auto',
              textAlign: 'center',
              background: 'rgba(30, 27, 75, 0.75)',
              border: `2px solid ${room.selected_category.color || '#7C3AED'}`,
              borderRadius: '32px',
              padding: '60px 40px',
              boxShadow: `0 0 60px ${room.selected_category.color}40`,
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#a5b4fc', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px' }}>
              Categoria da Rodada Sorteada
            </div>
            <h2
              style={{
                fontSize: '52px',
                fontWeight: 900,
                color: room.selected_category.color || '#ffffff',
                margin: '0 0 20px 0',
                textShadow: `0 0 25px ${room.selected_category.color}80`,
              }}
            >
              {room.selected_category.name}
            </h2>
            <div style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 600 }}>
              Preparem-se! A pergunta começará em instantes...
            </div>
          </div>
        )}

        {/* ESTADO 3: PERGUNTA ATIVA OU REVELADA */}
        {(room?.round_state === 'question' || room?.round_state === 'question-reveal' || room?.round_state === 'answered') && room.current_question && (
          <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Topo da Questão: Categoria + Cronômetro */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {room.selected_category && (
                <div
                  style={{
                    background: `${room.selected_category.color}25`,
                    border: `1.5px solid ${room.selected_category.color}`,
                    color: room.selected_category.color,
                    padding: '8px 20px',
                    borderRadius: '999px',
                    fontSize: '14px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {room.selected_category.name}
                </div>
              )}

              {/* Cronômetro Gigante com Suspense Cinematográfico */}
              {room.round_state === 'question' && (
                <motion.div
                  animate={{
                    scale: seconds <= 5 && seconds > 0 ? [1, 1.08, 1] : 1,
                  }}
                  transition={{ duration: 0.45, ease: 'easeInOut' }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: seconds <= 5 ? 'rgba(239, 68, 68, 0.28)' : 'rgba(255, 255, 255, 0.08)',
                    border: `2px solid ${seconds <= 5 ? '#ef4444' : 'rgba(255, 255, 255, 0.15)'}`,
                    borderRadius: '999px',
                    padding: '8px 24px',
                    boxShadow: seconds <= 5 ? '0 0 30px rgba(239, 68, 68, 0.55)' : 'none',
                    transition: 'all 0.3s',
                  }}
                >
                  <Clock style={{ width: '22px', height: '22px', color: seconds <= 5 ? '#f87171' : '#fbbf24' }} />
                  <motion.span
                    key={seconds}
                    initial={seconds <= 5 ? { scale: 1.28, opacity: 0.7 } : false}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.25 }}
                    style={{
                      fontSize: '32px',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      color: seconds <= 5 ? '#f87171' : '#ffffff',
                    }}
                  >
                    {seconds}s
                  </motion.span>
                </motion.div>
              )}

              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#94a3b8',
                  background: 'rgba(255, 255, 255, 0.06)',
                  padding: '8px 18px',
                  borderRadius: '999px',
                }}
              >
                {room.answered_count} {room.answered_count === 1 ? 'resposta recebida' : 'respostas recebidas'}
              </div>
            </div>

            {/* Enunciado da Pergunta */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '24px',
                padding: '36px 40px',
                textAlign: 'center',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.3)',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: '36px',
                  fontWeight: 900,
                  lineHeight: 1.3,
                  color: '#ffffff',
                  letterSpacing: '-0.01em',
                }}
              >
                {room.current_question.question_text}
              </h2>
            </div>

            {/* Contagem regressiva estilo Kahoot durante question-reveal */}
            {room.round_state === 'question-reveal' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', padding: '30px 0' }}>
                <KahootCountdown seconds={countdownSeconds} soundEnabled={true} />
              </div>
            )}

            {/* Grid 2x2 das Alternativas Kahoot com Câmera Dinâmica */}
            {room.round_state !== 'question-reveal' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '24px',
                  perspective: 1200,
                  position: 'relative',
                }}
              >
                {room.current_question.alternatives.map((alt, index) => {
                  const kTheme = KAHOOT_COLORS[index] || KAHOOT_COLORS[0];
                  const isAnsweredState = room.round_state === 'answered';
                  const isCorrect = !!alt.isCorrect;

                  const textLen = (alt.text || '').length;
                  const altFontSize = textLen <= 28
                    ? 'clamp(24px, 2.5vw, 36px)'
                    : textLen <= 55
                    ? 'clamp(20px, 1.9vw, 28px)'
                    : 'clamp(17px, 1.5vw, 23px)';

                  return (
                    <motion.div
                      key={index}
                      initial={false}
                      animate={{
                        scale: isAnsweredState ? (isCorrect ? 1.07 : 0.91) : 1,
                        y: isAnsweredState ? (isCorrect ? -8 : 10) : 0,
                        opacity: isAnsweredState ? (isCorrect ? 1 : 0.2) : 1,
                        filter: isAnsweredState ? (isCorrect ? 'none' : 'grayscale(70%) blur(0.5px)') : 'none',
                        zIndex: isAnsweredState && isCorrect ? 30 : 1,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: isAnsweredState && isCorrect ? 380 : 320,
                        damping: isAnsweredState && isCorrect ? 20 : 28,
                      }}
                      style={{
                        background: kTheme.bg,
                        borderRadius: '24px',
                        padding: '26px 32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '18px',
                        boxShadow: isAnsweredState && isCorrect
                          ? '0 0 65px rgba(74, 222, 128, 0.7), 0 24px 50px rgba(0, 0, 0, 0.7)'
                          : '0 8px 24px rgba(0, 0, 0, 0.25)',
                        border: isAnsweredState && isCorrect ? '4.5px solid #4ade80' : '4px solid transparent',
                        position: 'relative',
                        minHeight: '120px',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Selo Animado de Resposta Correta */}
                      {isAnsweredState && isCorrect && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0, y: -8 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          transition={{ delay: 0.1, type: 'spring', stiffness: 500, damping: 20 }}
                          style={{
                            position: 'absolute',
                            top: '10px',
                            right: '16px',
                            background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                            color: '#ffffff',
                            padding: '4px 12px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 900,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                            border: '1px solid rgba(255, 255, 255, 0.35)',
                          }}
                        >
                          <CheckCircle2 style={{ width: '14px', height: '14px' }} />
                          <span>Gabarito</span>
                        </motion.div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: 'clamp(32px, 3vw, 44px)',
                            fontWeight: 900,
                            lineHeight: 1,
                            userSelect: 'none',
                            flexShrink: 0,
                            textShadow: '0 2px 6px rgba(0,0,0,0.35)',
                          }}
                        >
                          {kTheme.symbol}
                        </span>
                        <span
                          style={{
                            fontSize: altFontSize,
                            fontWeight: 800,
                            lineHeight: 1.25,
                            color: '#ffffff',
                            textShadow: '0 2px 4px rgba(0,0,0,0.25)',
                            wordBreak: 'break-word',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {alt.text}
                        </span>
                      </div>

                      {isAnsweredState && isCorrect && (
                        <motion.div
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: [0, 1.3, 1], rotate: 0 }}
                          transition={{ duration: 0.4 }}
                        >
                          <CheckCircle2 style={{ width: '38px', height: '38px', color: '#4ade80', flexShrink: 0 }} />
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Explicação da Resposta */}
            {room.round_state === 'answered' && room.current_question.explanation && (
              <div
                style={{
                  background: 'rgba(124, 58, 237, 0.15)',
                  border: '1px solid rgba(124, 58, 237, 0.4)',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  color: '#e9d5ff',
                  fontSize: '16px',
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ color: '#ffffff' }}>Explicação Didática:</strong> {room.current_question.explanation}
                {room.current_question.reference_url?.match(/^https?:\/\//i) && (
                  <a
                    href={room.current_question.reference_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#93c5fd', marginLeft: '12px', textDecoration: 'underline' }}
                  >
                    Ver Referência
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* ESTADO 4: RANKING / PÓDIO 3D REAL-TIME OU FIM DE JOGO */}
        {(room?.round_state === 'ranking' || room?.status === 'finished') && (
          <div
            style={{
              maxWidth: '1100px',
              margin: '0 auto',
              width: '100%',
              background: 'linear-gradient(170deg, rgba(30, 27, 75, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '32px',
              padding: '36px 40px',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '28px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Header do Pódio */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 6px 20px rgba(251, 191, 36, 0.45)',
                  }}
                >
                  <Trophy style={{ width: '30px', height: '30px', color: 'white' }} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '30px', fontWeight: 900, letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                    {room?.status === 'finished' ? '🏆 Pódio dos Campeões' : 'Placar da Rodada'}
                  </h2>
                  <span style={{ fontSize: '13px', color: '#a5b4fc', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {room?.status === 'finished' ? 'Classificação Final da Partida' : 'Top Competidores em Tempo Real'}
                  </span>
                </div>
              </div>

              <span style={{ fontSize: '14px', fontWeight: 800, color: '#f1f5f9', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.15)', padding: '8px 18px', borderRadius: '999px' }}>
                Rodada {room?.current_round} de {room?.rounds}
              </span>
            </div>

            {/* PÓDIO 3D COM PEDESTAIS METÁLICOS */}
            {players.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-end',
                  gap: '20px',
                  minHeight: '380px',
                  width: '100%',
                  padding: '20px 0 10px',
                  perspective: '1200px',
                }}
              >
                {/* 2º LUGAR — PRATA (ESQUERDA) */}
                {players[1] && (
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.2 }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flex: 1,
                      maxWidth: '220px',
                    }}
                  >
                    {/* Avatar e Nome */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '14px' }}>
                      <div
                        style={{
                          width: '70px',
                          height: '70px',
                          borderRadius: '50%',
                          border: '3.5px solid #cbd5e1',
                          boxShadow: '0 8px 24px rgba(148, 163, 184, 0.45)',
                          position: 'relative',
                          marginBottom: '10px',
                        }}
                      >
                        <img
                          src={getAvatarUrl(players[1].nickname)}
                          alt=""
                          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: '#0f172a' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '-6px',
                            right: '-6px',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #cbd5e1, #64748b)',
                            border: '2px solid #334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            fontSize: '14px',
                            color: 'white',
                          }}
                        >
                          2
                        </div>
                      </div>
                      <span style={{ fontWeight: 900, fontSize: '18px', color: 'white', textAlign: 'center', wordBreak: 'break-word', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                        {players[1].nickname}
                      </span>
                      {players[1].team_name && (
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>
                          {players[1].team_name}
                        </span>
                      )}
                    </div>

                    {/* Bloco do Pedestal 2º Lugar */}
                    <div
                      style={{
                        width: '100%',
                        height: '150px',
                        background: 'linear-gradient(180deg, #94a3b8 0%, #475569 50%, #334155 100%)',
                        border: '3.5px solid #cbd5e1',
                        borderBottom: 'none',
                        borderTopLeftRadius: '20px',
                        borderTopRightRadius: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 35px rgba(148, 163, 184, 0.35), inset 0 3px 0 rgba(255,255,255,0.4)',
                        padding: '12px',
                      }}
                    >
                      <span style={{ fontSize: '38px', fontWeight: 900, color: '#f1f5f9', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>2º</span>
                      <ScoreCountUp value={players[1].score} duration={1200} style={{ fontSize: '24px', fontFamily: 'monospace', fontWeight: 900, color: '#e2e8f0' }} />
                    </div>
                  </motion.div>
                )}

                {/* 1º LUGAR — OURO (CENTRO - CAMPEÃO) */}
                {players[0] && (
                  <motion.div
                    initial={{ opacity: 0, y: 60, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 20, delay: 0.35 }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flex: 1.25,
                      maxWidth: '260px',
                      zIndex: 10,
                    }}
                  >
                    {/* Avatar, Coroa Flutuante e Nome */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
                      <div
                        style={{
                          width: '88px',
                          height: '88px',
                          borderRadius: '50%',
                          border: '4.5px solid #fde047',
                          boxShadow: '0 0 30px rgba(245, 158, 11, 0.6), 0 10px 25px rgba(0,0,0,0.5)',
                          position: 'relative',
                          marginBottom: '12px',
                        }}
                      >
                        <motion.div
                          animate={{ y: [-4, 3, -4], rotate: [-2, 2, -2] }}
                          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                          style={{ position: 'absolute', top: '-38px', left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}
                        >
                          <Crown style={{ width: '44px', height: '44px', color: '#fbbf24', fill: '#f59e0b', filter: 'drop-shadow(0 4px 12px rgba(245,158,11,0.8))' }} />
                        </motion.div>
                        <img
                          src={getAvatarUrl(players[0].nickname)}
                          alt=""
                          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: '#0f172a' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '-6px',
                            right: '-6px',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                            border: '2.5px solid #78350f',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            fontSize: '16px',
                            color: 'white',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                          }}
                        >
                          1
                        </div>
                      </div>
                      <span style={{ fontWeight: 900, fontSize: '22px', color: '#fef08a', textAlign: 'center', wordBreak: 'break-word', textShadow: '0 0 20px rgba(245,158,11,0.5)' }}>
                        {players[0].nickname}
                      </span>
                      {players[0].team_name && (
                        <span style={{ fontSize: '12px', color: '#fde68a', fontWeight: 800 }}>
                          {players[0].team_name}
                        </span>
                      )}
                    </div>

                    {/* Bloco do Pedestal 1º Lugar */}
                    <div
                      style={{
                        width: '100%',
                        height: '210px',
                        background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 45%, #92400e 100%)',
                        border: '4.5px solid #fde047',
                        borderBottom: 'none',
                        borderTopLeftRadius: '24px',
                        borderTopRightRadius: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 50px rgba(245, 158, 11, 0.6), inset 0 4px 0 rgba(255,255,255,0.45)',
                        padding: '16px',
                      }}
                    >
                      <span style={{ fontSize: '48px', fontWeight: 900, color: '#fef3c7', textShadow: '0 4px 12px rgba(0,0,0,0.6)' }}>1º</span>
                      <ScoreCountUp value={players[0].score} duration={1600} style={{ fontSize: '32px', fontFamily: 'monospace', fontWeight: 900, color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }} />
                    </div>
                  </motion.div>
                )}

                {/* 3º LUGAR — BRONZE (DIREITA) */}
                {players[2] && (
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.1 }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flex: 1,
                      maxWidth: '210px',
                    }}
                  >
                    {/* Avatar e Nome */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '14px' }}>
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          border: '3.5px solid #fdba74',
                          boxShadow: '0 8px 24px rgba(234, 88, 12, 0.45)',
                          position: 'relative',
                          marginBottom: '10px',
                        }}
                      >
                        <img
                          src={getAvatarUrl(players[2].nickname)}
                          alt=""
                          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: '#0f172a' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '-6px',
                            right: '-6px',
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #ea580c, #9a3412)',
                            border: '2px solid #431407',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            fontSize: '13px',
                            color: 'white',
                          }}
                        >
                          3
                        </div>
                      </div>
                      <span style={{ fontWeight: 900, fontSize: '17px', color: 'white', textAlign: 'center', wordBreak: 'break-word', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                        {players[2].nickname}
                      </span>
                      {players[2].team_name && (
                        <span style={{ fontSize: '11px', color: '#fed7aa', fontWeight: 700 }}>
                          {players[2].team_name}
                        </span>
                      )}
                    </div>

                    {/* Bloco do Pedestal 3º Lugar */}
                    <div
                      style={{
                        width: '100%',
                        height: '115px',
                        background: 'linear-gradient(180deg, #ea580c 0%, #c2410c 50%, #7c2d12 100%)',
                        border: '3.5px solid #fdba74',
                        borderBottom: 'none',
                        borderTopLeftRadius: '20px',
                        borderTopRightRadius: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 30px rgba(234, 88, 12, 0.35), inset 0 3px 0 rgba(255,255,255,0.3)',
                        padding: '12px',
                      }}
                    >
                      <span style={{ fontSize: '34px', fontWeight: 900, color: '#fed7aa', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>3º</span>
                      <ScoreCountUp value={players[2].score} duration={1000} style={{ fontSize: '22px', fontFamily: 'monospace', fontWeight: 900, color: '#ffedd5' }} />
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Times no Modo Equipes */}
            {room?.game_mode === 'team' && teams.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginTop: '10px' }}>
                {teams.map(([name, score], idx) => (
                  <div key={name} style={{ background: 'rgba(124, 58, 237, 0.25)', border: '1.5px solid rgba(167, 139, 250, 0.4)', borderRadius: '16px', padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 18px rgba(0,0,0,0.3)' }}>
                    <span style={{ fontWeight: 900, fontSize: '17px', color: '#ffffff' }}>{idx + 1}º {name}</span>
                    <ScoreCountUp value={score} duration={1200} style={{ fontWeight: 900, fontSize: '20px', color: '#fbbf24', fontFamily: 'monospace' }} />
                  </div>
                ))}
              </div>
            )}

            {/* Demais Competidores (4º colocado em diante) */}
            {players.length > 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Demais Colocados
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                  {players.slice(3, 9).map((player, index) => {
                    const rank = index + 4;
                    return (
                      <div
                        key={player.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '14px',
                          padding: '12px 18px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', color: '#cbd5e1' }}>
                            {rank}º
                          </span>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>
                            {player.nickname}
                            {player.team_name ? ` (${player.team_name})` : ''}
                          </span>
                        </div>
                        <span style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'monospace', color: '#cbd5e1' }}>
                          {player.score} pts
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── ILUMINAÇÃO PERIFÉRICA REATIVA (AMBIENT BORDER GLOW) ─── */}
      <AmbientBorderGlow
        active={room?.round_state === 'question' || room?.round_state === 'answered'}
        remainingSeconds={seconds}
        totalSeconds={room?.time_limit || room?.current_question?.time_limit || 20}
        isPaused={room?.paused_remaining_ms != null}
        isAnswered={room?.round_state === 'answered'}
        intensity="cinematic"
      />

      <TeacherRemoteModal
        isOpen={showRemoteModal}
        onClose={() => setShowRemoteModal(false)}
        roomCode={roomCode}
        pairingPin={pairingPin}
      />
    </main>
  );
}
