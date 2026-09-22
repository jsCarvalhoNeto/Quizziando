import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import { remainingSeconds } from './lib/gameRules';
import type { OnlineRoom } from './lib/onlineGame';
import { Trophy, Clock, CheckCircle2, Maximize2, Minimize2, Users, Sparkles, QrCode } from 'lucide-react';
import KahootCountdown from './components/KahootCountdown';

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

export default function SpectatorView({ roomCode }: { roomCode: string }) {
  const [room, setRoom] = useState<OnlineRoom | null>(null);
  const [players, setPlayers] = useState<SpectatorPlayer[]>([]);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
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

              {/* Cronômetro Gigante */}
              {room.round_state === 'question' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: seconds <= 5 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                    border: `2px solid ${seconds <= 5 ? '#ef4444' : 'rgba(255, 255, 255, 0.15)'}`,
                    borderRadius: '999px',
                    padding: '8px 24px',
                    boxShadow: seconds <= 5 ? '0 0 24px rgba(239, 68, 68, 0.4)' : 'none',
                    transition: 'all 0.3s',
                  }}
                >
                  <Clock style={{ width: '22px', height: '22px', color: seconds <= 5 ? '#f87171' : '#fbbf24' }} />
                  <span
                    style={{
                      fontSize: '32px',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      color: seconds <= 5 ? '#f87171' : '#ffffff',
                    }}
                  >
                    {seconds}s
                  </span>
                </div>
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

            {/* Grid 2x2 das Alternativas Kahoot */}
            {room.round_state !== 'question-reveal' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '20px',
                }}
              >
                {room.current_question.alternatives.map((alt, index) => {
                  const kTheme = KAHOOT_COLORS[index] || KAHOOT_COLORS[0];
                const isAnsweredState = room.round_state === 'answered';
                const isCorrect = alt.isCorrect;

                const textLen = (alt.text || '').length;
                const altFontSize = textLen <= 28
                  ? 'clamp(24px, 2.5vw, 36px)'
                  : textLen <= 55
                  ? 'clamp(20px, 1.9vw, 28px)'
                  : 'clamp(17px, 1.5vw, 23px)';

                return (
                  <div
                    key={index}
                    style={{
                      background: kTheme.bg,
                      borderRadius: '20px',
                      padding: '24px 30px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                      border: isAnsweredState && isCorrect ? '4px solid #86efac' : '4px solid transparent',
                      opacity: isAnsweredState ? (isCorrect ? 1 : 0.3) : 1,
                      transform: isAnsweredState && isCorrect ? 'scale(1.02)' : 'none',
                      transition: 'all 0.3s ease',
                      minHeight: '110px',
                    }}
                  >
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
                      <CheckCircle2 style={{ width: '36px', height: '36px', color: '#86efac', flexShrink: 0 }} />
                    )}
                  </div>
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

        {/* ESTADO 4: RANKING / PLACAR DA RODADA OU FIM DE JOGO */}
        {(room?.round_state === 'ranking' || room?.status === 'finished') && (
          <div
            style={{
              maxWidth: '820px',
              margin: '0 auto',
              width: '100%',
              background: 'rgba(30, 27, 75, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '28px',
              padding: '36px 40px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(251, 191, 36, 0.4)',
                  }}
                >
                  <Trophy style={{ width: '26px', height: '26px', color: 'white' }} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 900 }}>
                    {room?.status === 'finished' ? 'Classificação Final' : 'Placar da Rodada'}
                  </h2>
                  <span style={{ fontSize: '12px', color: '#a5b4fc', fontWeight: 700, textTransform: 'uppercase' }}>
                    Top Competidores
                  </span>
                </div>
              </div>

              <span style={{ fontSize: '13px', fontWeight: 800, color: '#e2e8f0', background: 'rgba(255, 255, 255, 0.08)', padding: '6px 14px', borderRadius: '999px' }}>
                Rodada {room?.current_round} de {room?.rounds}
              </span>
            </div>

            {/* Times se houver */}
            {room?.game_mode === 'team' && teams.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {teams.map(([name, score], idx) => (
                  <div key={name} style={{ background: 'rgba(124, 58, 237, 0.2)', border: '1px solid rgba(124, 58, 237, 0.4)', borderRadius: '14px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '15px' }}>{idx + 1}º {name}</span>
                    <span style={{ fontWeight: 900, fontSize: '18px', color: '#fbbf24', fontFamily: 'monospace' }}>{score} pts</span>
                  </div>
                ))}
              </div>
            )}

            {/* Lista dos Jogadores */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {players.slice(0, 6).map((player, index) => {
                const isLeader = index === 0;
                let badgeBg = 'rgba(255, 255, 255, 0.1)';
                if (index === 0) badgeBg = 'linear-gradient(135deg, #fbbf24, #d97706)';
                else if (index === 1) badgeBg = 'linear-gradient(135deg, #cbd5e1, #94a3b8)';
                else if (index === 2) badgeBg = 'linear-gradient(135deg, #fb923c, #ea580c)';

                return (
                  <div
                    key={player.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: isLeader ? 'rgba(251, 191, 36, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                      border: isLeader ? '1.5px solid rgba(251, 191, 36, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '16px',
                      padding: '14px 20px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: badgeBg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: '16px',
                          color: 'white',
                        }}
                      >
                        {index + 1}
                      </div>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: 'white' }}>
                        {player.nickname}
                        {player.team_name ? ` (${player.team_name})` : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'monospace', color: isLeader ? '#fbbf24' : 'white' }}>
                        {player.score}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase' }}>
                        pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
