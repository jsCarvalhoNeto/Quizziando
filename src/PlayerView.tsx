import { useState, useEffect, useRef } from 'react';
import { Trophy, CheckCircle, XCircle, Clock, Users, Wifi, WifiOff } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import { getAvatarUrl } from './lib/avatars';

// ==========================================
// 🎨 CORES DAS ALTERNATIVAS (A/B/C/D)
// ==========================================
export const ANSWER_COLORS = [
  { index: 0, label: 'A', bg: '#E53E3E', bgHover: '#C53030', glow: 'rgba(229,62,62,0.5)',  name: 'Vermelho' },
  { index: 1, label: 'B', bg: '#3182CE', bgHover: '#2B6CB0', glow: 'rgba(49,130,206,0.5)', name: 'Azul'     },
  { index: 2, label: 'C', bg: '#D69E2E', bgHover: '#B7791F', glow: 'rgba(214,158,46,0.5)', name: 'Amarelo'  },
  { index: 3, label: 'D', bg: '#38A169', bgHover: '#276749', glow: 'rgba(56,161,105,0.5)', name: 'Verde'    },
];

// ==========================================
// 📊 TIPOS
// ==========================================
interface PlayerViewProps {
  roomCode: string;
}

interface RoomState {
  code: string;
  status: string;
  round_state: string;
  current_round: number;
  rounds: number;
  current_question: {
    id: string;
    question_text: string;
    alternatives: { text: string; isCorrect: boolean }[];
  } | null;
  selected_category: { name: string; color: string } | null;
  time_limit?: number;
}

type PlayerScreen = 'join' | 'waiting' | 'spinning' | 'category-reveal' | 'question-reveal' | 'question' | 'answered' | 'round-result' | 'ranking' | 'finished';

// ==========================================
// 💬 MENSAGENS MOTIVACIONAIS
// ==========================================
const MOTIVATIONAL_MESSAGES = [
  "Vamos Lá!",
  "Falta Pouco!",
  "Continuem Firmes!",
  "Preparem-se!",
  "Vocês Conseguem!",
  "Mantenham o Foco!"
];

const getMotivationalMessage = (): string => {
  return MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
};

const getRoundStatusMessage = (current: number, total: number): string => {
  const roundsLeft = total - current;
  const randomMsg = getMotivationalMessage();
  if (roundsLeft === 0) {
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
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [connected, setConnected] = useState(false);

  const earnedRef = useRef<number>(0);
  const questionStartTimeRef = useRef<number>(0);

  const [categories, setCategories] = useState<any[]>([]);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [isWinner, setIsWinner] = useState(false);
  const [rankingPlayers, setRankingPlayers] = useState<any[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*');
      if (data) {
        setCategories(data);
      }
    };
    fetchCategories();
  }, []);

  // Buscar posição e verificar se é o vencedor ao finalizar o jogo
  useEffect(() => {
    if (playerScreen === 'finished') {
      const fetchRank = async () => {
        const { data } = await supabase
          .from('room_players')
          .select('nickname, score')
          .eq('room_code', roomCode)
          .order('score', { ascending: false });
        
        if (data && data.length > 0) {
          const rank = data.findIndex(p => p.nickname === nickRef.current || p.nickname === nickname) + 1;
          setPlayerRank(rank);
          
          const topScore = data[0].score;
          const myData = data.find(p => p.nickname === nickRef.current || p.nickname === nickname);
          
          if (myData && myData.score === topScore && topScore > 0) {
            setIsWinner(true);
          }
        }
      };
      fetchRank();
    }
  }, [playerScreen, roomCode, nickname]);

  const channelRef = useRef<any>(null);
  const nickRef = useRef('');

  // Subscrição Realtime na sala
  useEffect(() => {
    if (playerScreen === 'join') return;

    const channel = supabase
      .channel(`room-${roomCode}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_rooms', filter: `code=eq.${roomCode}` },
        (payload) => {
          const room = payload.new as RoomState;
          setRoomState(room);
          handleRoomStateChange(room);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'player_answers', filter: `room_code=eq.${roomCode}` },
        () => {
          setAnsweredCount(prev => prev + 1);
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [playerScreen, roomCode]);

  // Carregar estado inicial da sala
  useEffect(() => {
    if (playerScreen === 'join') return;
    fetchRoomState();
    fetchPlayerCount();
  }, [playerScreen]);

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

  const fetchRoomState = async () => {
    const { data } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('code', roomCode)
      .single();
    if (data) {
      setRoomState(data);
      handleRoomStateChange(data);
    }
  };

  const fetchPlayerCount = async () => {
    const { count } = await supabase
      .from('room_players')
      .select('*', { count: 'exact', head: true })
      .eq('room_code', roomCode);
    setTotalPlayers(count || 0);
  };

  const handleRoomStateChange = (room: RoomState) => {
    if (room.status === 'finished') {
      setPlayerScreen('finished');
      return;
    }
    if (room.round_state === 'spinning') {
      setPlayerScreen('spinning');
    } else if (room.round_state === 'category-reveal') {
      const isNewCategory = !roomState || roomState.selected_category?.name !== room.selected_category?.name;
      if (isNewCategory || playerScreen !== 'category-reveal') {
        setChosenIndex(null);
        setWasCorrect(null);
        setAnsweredCount(0);
        setPlayerScreen('category-reveal');
      }
    } else if (room.round_state === 'question-reveal') {
      const isNewQuestion = !roomState || roomState.current_question?.id !== room.current_question?.id;
      if (isNewQuestion || playerScreen !== 'question-reveal') {
        setChosenIndex(null);
        setWasCorrect(null);
        setAnsweredCount(0);
        setPlayerScreen('question-reveal');
      }
    } else if (room.round_state === 'question') {
      // Nova pergunta — resetar resposta APENAS se mudou a pergunta!
      const isNewQuestion = !roomState || roomState.current_question?.id !== room.current_question?.id;
      const shouldSetQuestionScreen = isNewQuestion || (playerScreen !== 'question' && playerScreen !== 'answered');
      if (shouldSetQuestionScreen) {
        setChosenIndex(null);
        setWasCorrect(null);
        setAnsweredCount(0);
        questionStartTimeRef.current = Date.now();
        setPlayerScreen('question');
      }
    } else if (room.round_state === 'answered') {
      // Revelar resultado
      if (chosenIndex !== null && room.current_question) {
        const correct = room.current_question.alternatives?.[chosenIndex]?.isCorrect;
        
        // Evitar soma dupla caso o evento chegue mais de uma vez
        if (wasCorrect === null) {
          setWasCorrect(correct);
          if (correct) {
            const pts = earnedRef.current;
            setPointsEarned(pts);
            setMyScore(prev => prev + pts);
          }
        }
      }
      setPlayerScreen('round-result');
    } else if (room.round_state === 'ranking') {
      // Mostrar ranking se não for a última rodada
      if (room.current_round < room.rounds) {
        setPlayerScreen('ranking');
        fetchRankingPlayers(roomCode);
      } else {
        // Última rodada: pula direto para finished (pódio)
        setPlayerScreen('finished');
      }
    } else if (room.round_state === 'idle' && room.status === 'playing') {
      setPlayerScreen('waiting');
    } else if (room.status === 'lobby') {
      setPlayerScreen('waiting');
    }
  };

  const fetchRankingPlayers = async (code: string) => {
    const { data } = await supabase
      .from('room_players')
      .select('nickname, score')
      .eq('room_code', code)
      .order('score', { ascending: false });

    if (data) {
      setRankingPlayers(data);
    }
  };

  // Entrar na sala
  const handleJoin = async () => {
    if (!nickname.trim()) { setJoinError('Insira um nickname para continuar.'); return; }
    setJoining(true);
    setJoinError('');

    // Verificar se a sala existe
    const { data: room, error: roomErr } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('code', roomCode.toUpperCase())
      .single();

    if (roomErr || !room) {
      setJoinError(`Sala "${roomCode}" não encontrada. Verifique o código.`);
      setJoining(false);
      return;
    }

    if (room.status === 'finished') {
      setJoinError('Esta sala já foi encerrada.');
      setJoining(false);
      return;
    }

    // Inserir jogador na sala ou recuperar score se existir
    const { data: existingPlayer } = await supabase
      .from('room_players')
      .select('score')
      .eq('room_code', roomCode.toUpperCase())
      .eq('nickname', nickname.trim())
      .maybeSingle();

    if (existingPlayer) {
      setMyScore(existingPlayer.score || 0);
    } else {
      // Bloquear novos jogadores se a partida já tiver começado
      if (room.status === 'playing') {
        setJoinError('A partida já começou! Não é possível entrar agora.');
        setJoining(false);
        return;
      }

      const { error: playerErr } = await supabase
        .from('room_players')
        .insert({ room_code: roomCode.toUpperCase(), nickname: nickname.trim(), score: 0 });

      if (playerErr) {
        setJoinError('Erro ao entrar na sala. Tente novamente.');
        setJoining(false);
        return;
      }
    }

    nickRef.current = nickname.trim();
    setRoomState(room);
    setJoining(false);

    if (room.round_state === 'question') {
      setPlayerScreen('question');
    } else if (room.round_state === 'question-reveal') {
      setPlayerScreen('question-reveal');
    } else if (room.round_state === 'spinning') {
      setPlayerScreen('spinning');
    } else if (room.round_state === 'category-reveal') {
      setPlayerScreen('category-reveal');
    } else {
      setPlayerScreen('waiting');
    }
  };

  // Responder pergunta
  const handleAnswer = async (answerIndex: number) => {
    if (chosenIndex !== null || !roomState?.current_question) return;
    setChosenIndex(answerIndex);
    setPlayerScreen('answered');

    const isCorrect = roomState.current_question?.alternatives?.[answerIndex]?.isCorrect || false;

    // Cálculo do bônus de velocidade
    let totalPoints = 0;
    if (isCorrect) {
      const timeElapsed = Date.now() - questionStartTimeRef.current;
      const timeLimitMs = (roomState?.time_limit || 15) * 1000;
      const timeLeft = Math.max(0, timeLimitMs - timeElapsed);
      const speedBonus = Math.floor((timeLeft / timeLimitMs) * 50);
      totalPoints = 100 + speedBonus;
    }
    earnedRef.current = totalPoints;

    await supabase.from('player_answers').insert({
      room_code: roomCode,
      player_nickname: nickRef.current || nickname.trim(),
      round_index: roomState.current_round,
      answer_index: answerIndex,
      is_correct: isCorrect,
      points_earned: totalPoints,
    });
  };

  // ==========================================
  // 🖥️ RENDER
  // ==========================================

  // ── Tela de entrada ──
  if (playerScreen === 'join') {
    return (
      <div style={styles.fullscreen}>
        <div style={styles.joinCard}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <img src="/logo.png" alt="Quizziando Logo" style={{ height: '64px', width: 'auto', objectFit: 'contain', margin: '0 auto 12px', display: 'block', filter: 'drop-shadow(0 4px 12px rgba(124, 58, 237, 0.45))' }} />
            <h1 style={styles.title}>Quizziando</h1>
            <p style={styles.subtitle}>Sala <span style={{ color: '#A78BFA', fontWeight: 800 }}>{roomCode.toUpperCase()}</span></p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={styles.label}>SEU NICKNAME</label>
            <input
              type="text"
              placeholder="Ex: QuizMaster99"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              maxLength={20}
              style={styles.input}
            />
            {joinError && (
              <div style={styles.errorBox}>
                <XCircle style={{ width: 15, height: 15, flexShrink: 0 }} />
                {joinError}
              </div>
            )}
            <button
              onClick={handleJoin}
              disabled={joining}
              style={{ ...styles.btnPrimary, opacity: joining ? 0.7 : 1 }}
            >
              {joining ? 'Entrando...' : `Entrar na Sala ${roomCode.toUpperCase()}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Aguardando ──
  if (playerScreen === 'waiting') {
    return (
      <div style={styles.fullscreen}>
        <div style={styles.waitingCard}>
          <ConnectedBadge connected={connected} />
          <div style={{ textAlign: 'center' }}>
            <img
              src={getAvatarUrl(nickname)}
              alt="Seu avatar"
              style={{ height: '96px', width: '96px', objectFit: 'cover', borderRadius: '50%', margin: '0 auto 16px', display: 'block', border: '3px solid rgba(124,58,237,0.6)', background: '#0d1326', boxShadow: '0 6px 20px rgba(124, 58, 237, 0.45)' }}
            />
            <h2 style={styles.title}>Você está dentro!</h2>
            <p style={{ color: '#A0AEC0', fontSize: 14, marginTop: 8 }}>Olá, <strong style={{ color: 'white' }}>{nickname}</strong></p>
          </div>

          <div style={styles.roomCodeCard}>
            <p style={{ color: '#718096', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Código da Sala</p>
            <p style={{ color: 'white', fontSize: 36, fontWeight: 900, letterSpacing: '0.15em', fontFamily: 'Outfit, monospace' }}>
              {roomCode.toUpperCase()}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
            <span style={styles.pulseDot} />
            <span style={{ color: '#A0AEC0', fontSize: 14 }}>Aguardando o host iniciar...</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', color: '#718096', fontSize: 12 }}>
            <Users style={{ width: 14, height: 14 }} />
            {totalPlayers} jogador{totalPlayers !== 1 ? 'es' : ''} conectado{totalPlayers !== 1 ? 's' : ''}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <p style={{ color: '#4A5568', fontSize: 11, textAlign: 'center' }}>
              Pontuação acumulada: <strong style={{ color: '#A78BFA' }}>{myScore} pts</strong>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Roleta Girando (spinning) ──
  if (playerScreen === 'spinning') {
    return (
      <div style={styles.fullscreen}>
        <div style={styles.waitingCard}>
          <ConnectedBadge connected={connected} />
          {roomState && (
            <div style={{ fontSize: 11, color: '#A0AEC0', textAlign: 'center', marginBottom: 8 }}>
              Rodada {roomState.current_round} de {roomState.rounds}
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            <h2 style={styles.title}>Sorteando Categoria...</h2>
            <p style={{ color: '#A0AEC0', fontSize: 13, marginTop: 8, lineHeight: 1.4 }}>
              A roleta já está rodando! <br />
              Por favor, aguarde a categoria ser sorteada.
            </p>
          </div>

          {/* Mini Roleta Premium Girando */}
          <div style={{ position: 'relative', width: '200px', height: '200px', margin: '20px auto' }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              border: '4px solid white',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              animation: 'spin-infinite 2s linear infinite',
              background: categories.length > 0
                ? `conic-gradient(${categories.map((c, i) => `${c.color} ${i * (360 / categories.length)}deg ${(i + 1) * (360 / categories.length)}deg`).join(', ')})`
                : '#555',
              overflow: 'hidden'
            }} />
            
            {/* Pino Central Branco */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'white',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.3)',
            }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
            <span style={styles.pulseDot} />
            <span style={{ color: '#A0AEC0', fontSize: 14 }}>Cruzando os dedos! 🤞</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Revelação da Categoria (category-reveal) ──
  if (playerScreen === 'category-reveal' && roomState?.selected_category) {
    const cat = roomState.selected_category;
    return (
      <div style={styles.fullscreen}>
        <div style={{
          ...styles.waitingCard,
          border: `1px solid ${cat.color}66`,
          boxShadow: `0 24px 60px ${cat.color}22`,
          animation: 'fadeInScale 0.4s ease-out'
        }}>
          <ConnectedBadge connected={connected} />
          <div style={{ fontSize: 11, color: '#A0AEC0', textAlign: 'center', marginBottom: 8 }}>
            Rodada {roomState.current_round} de {roomState.rounds}
          </div>

          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 70, height: 70, borderRadius: 20,
              background: `linear-gradient(135deg, ${cat.color}cc, ${cat.color}66)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 8px 24px ${cat.color}50`,
              animation: 'bounce-gentle 1s ease infinite'
            }}>
              <Trophy style={{ width: 34, height: 34, color: 'white' }} />
            </div>

            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#A0AEC0', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
                Categoria Sorteada
              </p>
              <h2 style={{
                fontSize: 28, fontWeight: 900,
                color: cat.color,
                textShadow: `0 0 20px ${cat.color}40`,
                margin: 0,
                fontFamily: "'Outfit', sans-serif"
              }}>
                {cat.name}
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#A0AEC0' }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: cat.color,
                animation: 'pulse-opac 1s infinite'
              }} />
              Prepare-se para a pergunta...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Pergunta sendo lida (sem alternativas) ──
  if (playerScreen === 'question-reveal' && roomState?.current_question) {
    return (
      <div style={styles.fullscreen}>
        <div style={{...styles.questionContainer, justifyContent: 'center', alignItems: 'center', flex: 1, display: 'flex', flexDirection: 'column'}}>
          <div style={{ alignSelf: 'flex-end', marginBottom: 'auto' }}>
            <ConnectedBadge connected={connected} />
          </div>
          <div style={{ fontSize: 11, color: '#A0AEC0', marginBottom: 16 }}>
            Rodada {roomState.current_round} de {roomState.rounds}
          </div>
          <h3 style={{ color: 'white', fontSize: 32, fontWeight: 900, lineHeight: 1.4, textAlign: 'center', marginBottom: 'auto' }}>
            {roomState.current_question.question_text}
          </h3>
        </div>
      </div>
    );
  }

  // ── Pergunta ativa — 4 botões coloridos ──
  if (playerScreen === 'question' && roomState?.current_question) {
    return (
      <div style={styles.fullscreen}>
        <div style={styles.questionContainer}>
          <ConnectedBadge connected={connected} />

          {/* Categoria */}
          {roomState.selected_category && (
            <div style={{
              alignSelf: 'flex-start',
              padding: '4px 14px',
              borderRadius: 999,
              background: `${roomState.selected_category.color}33`,
              border: `1px solid ${roomState.selected_category.color}66`,
              color: roomState.selected_category.color,
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em'
            }}>
              {roomState.selected_category.name}
            </div>
          )}

          {/* Rodada */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#A0AEC0', fontSize: 12 }}>Rodada {roomState.current_round} de {roomState.rounds}</span>
            <span style={{ color: '#A78BFA', fontSize: 12, fontWeight: 700 }}>{myScore} pts</span>
          </div>

          {/* Instrução */}
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <p style={{ color: '#718096', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Escolha sua resposta
            </p>
            <h3 style={{ color: 'white', fontSize: 15, fontWeight: 700, lineHeight: 1.5 }}>
              {roomState.current_question.question_text}
            </h3>
          </div>

          {/* 4 BOTÕES COLORIDOS */}
          <div style={styles.answersGrid}>
            {ANSWER_COLORS.map((color) => (
              <button
                key={color.index}
                onClick={() => handleAnswer(color.index)}
                style={{
                  ...styles.answerBtn,
                  background: `linear-gradient(135deg, ${color.bg} 0%, ${color.bgHover} 100%)`,
                  boxShadow: `0 8px 24px ${color.glow}`,
                }}
              >
                <span style={styles.answerLabel}>{color.label}</span>
                <span style={styles.answerText}>
                  {roomState.current_question!.alternatives?.[color.index]?.text || '—'}
                </span>
              </button>
            ))}
          </div>

          <p style={{ color: '#4A5568', fontSize: 11, textAlign: 'center' }}>
            {answeredCount} jogador{answeredCount !== 1 ? 'es' : ''} já respondeu{answeredCount !== 1 ? 'ram' : ''}
          </p>
        </div>
      </div>
    );
  }

  // ── Resposta enviada — aguardando resultado ──
  if (playerScreen === 'answered' && chosenIndex !== null) {
    const chosen = ANSWER_COLORS[chosenIndex];
    return (
      <div style={styles.fullscreen}>
        <div style={styles.waitingCard}>
          <ConnectedBadge connected={connected} />
          {roomState && (
            <div style={{ fontSize: 11, color: '#A0AEC0', textAlign: 'center' }}>
              Rodada {roomState.current_round} de {roomState.rounds}
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: 24,
              background: `linear-gradient(135deg, ${chosen.bg}, ${chosen.bgHover})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: `0 8px 32px ${chosen.glow}`,
              fontSize: 32, fontWeight: 900, color: 'white'
            }}>
              {chosen.label}
            </div>
            <h2 style={styles.title}>Resposta enviada!</h2>
            <p style={{ color: '#718096', fontSize: 13, marginTop: 8 }}>
              Você escolheu <strong style={{ color: chosen.bg }}>{chosen.name}</strong> ({chosen.label})
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
            <Clock style={{ width: 16, height: 16, color: '#A0AEC0', animation: 'spin 2s linear infinite' }} />
            <span style={{ color: '#A0AEC0', fontSize: 14 }}>Aguardando resultado...</span>
          </div>

          <p style={{ color: '#4A5568', fontSize: 11, textAlign: 'center' }}>
            {answeredCount} jogador{answeredCount !== 1 ? 'es' : ''} respondeu{answeredCount !== 1 ? 'ram' : ''}
          </p>
        </div>
      </div>
    );
  }

  // ── Resultado da rodada ──
  if (playerScreen === 'round-result') {
    const chosen = chosenIndex !== null ? ANSWER_COLORS[chosenIndex] : null;
    return (
      <div style={styles.fullscreen}>
        <div style={styles.waitingCard}>
          <ConnectedBadge connected={connected} />
          {roomState && (
            <div style={{ fontSize: 11, color: '#A0AEC0', textAlign: 'center', marginBottom: 8 }}>
              {getRoundStatusMessage(roomState.current_round, roomState.rounds)}
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            {wasCorrect ? (
              <>
                <CheckCircle style={{ width: 64, height: 64, color: '#48BB78', margin: '0 auto 12px' }} />
                <h2 style={{ ...styles.title, color: '#48BB78' }}>Correto!</h2>
                <p style={{ color: '#68D391', fontSize: 14, marginTop: 8 }}>
                  +{pointsEarned} pontos ganhos 🎉
                </p>
              </>
            ) : chosenIndex === null ? (
              <>
                <XCircle style={{ width: 64, height: 64, color: '#FC8181', margin: '0 auto 12px' }} />
                <h2 style={{ ...styles.title, color: '#FC8181' }}>Tempo esgotado!</h2>
                <p style={{ color: '#FC8181', fontSize: 14, marginTop: 8 }}>Você não respondeu a tempo</p>
              </>
            ) : (
              <>
                <XCircle style={{ width: 64, height: 64, color: '#FC8181', margin: '0 auto 12px' }} />
                <h2 style={{ ...styles.title, color: '#FC8181' }}>Errado!</h2>
                {chosen && (
                  <p style={{ color: '#A0AEC0', fontSize: 14, marginTop: 8 }}>
                    Você escolheu <strong style={{ color: chosen.bg }}>{chosen.name}</strong>
                  </p>
                )}
              </>
            )}

            {/* Resposta Correta */}
            {roomState?.current_question && (
              <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ color: '#A0AEC0', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Resposta Correta</p>
                {(() => {
                  const correctIdx = roomState.current_question.alternatives?.findIndex((a: any) => a.isCorrect);
                  if (correctIdx !== undefined && correctIdx !== -1) {
                    const color = ANSWER_COLORS[correctIdx];
                    const text = roomState.current_question.alternatives[correctIdx].text;
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <span style={{ 
                          background: color.bg, color: 'white', width: '24px', height: '24px', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          borderRadius: '6px', fontSize: '13px', fontWeight: 'bold',
                          boxShadow: `0 2px 8px ${color.glow}`
                        }}>{color.label}</span>
                        <span style={{ color: 'white', fontWeight: 600, fontSize: '14px', textAlign: 'left', wordBreak: 'break-word' }}>{text}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>

          <div style={styles.scoreCard}>
            <p style={{ color: '#718096', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Pontuação Total</p>
            <p style={{ color: '#A78BFA', fontSize: 40, fontWeight: 900, fontFamily: 'Outfit, sans-serif' }}>
              {myScore}
            </p>
            <p style={{ color: '#4A5568', fontSize: 12 }}>pontos</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
            <span style={styles.pulseDot} />
            <span style={{ color: '#A0AEC0', fontSize: 14 }}>Aguardando próxima rodada...</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Ranking da Rodada ──
  if (playerScreen === 'ranking') {
    return (
      <div style={styles.fullscreen}>
        <div style={styles.waitingCard}>
          <ConnectedBadge connected={connected} />
          {roomState && (
            <div style={{ fontSize: 11, color: '#A0AEC0', textAlign: 'center', marginBottom: 8 }}>
              Rodada {roomState.current_round} de {roomState.rounds}
            </div>
          )}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <Trophy style={{ width: 48, height: 48, color: '#FBBF24', margin: '0 auto 12px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
            <h2 style={{ ...styles.title, color: '#FBBF24' }}>Placar da Rodada</h2>
          </div>

          {/* Ranking */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
            {rankingPlayers.map((p, idx) => {
              let badgeBg = '#db2777';
              if (idx === 0) badgeBg = '#f59e0b';
              else if (idx === 1) badgeBg = '#94a3b8';
              else if (idx === 2) badgeBg = '#ea580c';

              const isMe = p.nickname === nickname;
              return (
                <div
                  key={p.nickname}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: isMe ? 'rgba(167, 139, 250, 0.15)' : 'rgba(255,255,255,0.05)',
                    border: isMe ? '1px solid rgba(167, 139, 250, 0.4)' : '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: badgeBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '14px',
                        color: 'white'
                      }}
                    >
                      {idx + 1}
                    </div>
                    <img src={getAvatarUrl(p.nickname)} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.15)', background: '#0d1326' }} />
                    <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>
                      {p.nickname} {isMe && '(Você)'}
                    </span>
                  </div>
                  <span style={{ color: '#A78BFA', fontWeight: 900, fontSize: '16px', fontFamily: 'monospace' }}>
                    {p.score}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: '20px' }}>
            <span style={styles.pulseDot} />
            <span style={{ color: '#A0AEC0', fontSize: 14 }}>Aguardando próxima rodada...</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Jogo encerrado ──
  if (playerScreen === 'finished') {
    return (
      <div style={styles.fullscreen}>
        <div style={styles.waitingCard}>
          <div style={{ textAlign: 'center' }}>
            {isWinner ? (
              <div style={{ animation: 'bounce-gentle 1.5s ease infinite', marginBottom: '16px' }}>
                <Trophy style={{ width: 64, height: 64, color: '#F6E05E', margin: '0 auto', filter: 'drop-shadow(0 0 12px rgba(246, 224, 94, 0.6))' }} />
                <h2 style={{ ...styles.title, color: '#F6E05E', marginTop: '12px', fontSize: '28px' }}>Parabéns, Campeão!</h2>
                <p style={{ color: '#A0AEC0', fontSize: 14, marginTop: 8 }}>Você foi o grande vencedor, {nickname}!</p>
              </div>
            ) : (
              <>
                <Trophy style={{ width: 64, height: 64, color: '#F6AD55', margin: '0 auto 16px' }} />
                <h2 style={styles.title}>Jogo encerrado!</h2>
                <p style={{ color: '#A0AEC0', fontSize: 14, marginTop: 8 }}>Obrigado por jogar, {nickname}!</p>
              </>
            )}
          </div>
          <div style={styles.scoreCard}>
            <p style={{ color: '#718096', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sua Pontuação Final</p>
            <p style={{ color: '#A78BFA', fontSize: 48, fontWeight: 900, fontFamily: 'Outfit, sans-serif' }}>{myScore}</p>
            <p style={{ color: '#4A5568', fontSize: 12 }}>pontos</p>
            {playerRank !== null && !isWinner && (
              <p style={{ color: '#A0AEC0', fontSize: 13, marginTop: '8px' }}>
                Sua posição: <strong>{playerRank}º lugar</strong>
              </p>
            )}
          </div>
          <button onClick={() => window.location.href = '/'} style={styles.btnPrimary}>
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div style={styles.fullscreen}>
      <div style={styles.waitingCard}>
        <div style={{ ...styles.pulseDot, margin: '0 auto' }} />
        <p style={{ color: '#A0AEC0', textAlign: 'center' }}>Carregando sala...</p>
      </div>
    </div>
  );
}

// ==========================================
// 🟢 COMPONENTE BADGE DE CONEXÃO
// ==========================================
function ConnectedBadge({ connected }: { connected: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      alignSelf: 'flex-end',
      fontSize: 11, color: connected ? '#68D391' : '#FC8181'
    }}>
      {connected
        ? <Wifi style={{ width: 12, height: 12 }} />
        : <WifiOff style={{ width: 12, height: 12 }} />}
      {connected ? 'Conectado' : 'Reconectando...'}
    </div>
  );
}

// ==========================================
// 🎨 ESTILOS DO PLAYER VIEW
// ==========================================
const styles: Record<string, React.CSSProperties> = {
  fullscreen: {
    minHeight: '100vh',
    background: 'radial-gradient(circle at 50% 0%, #0f1729 0%, #070b18 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  joinCard: {
    width: '100%',
    maxWidth: 380,
    background: 'rgba(10,15,30,0.85)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 24,
    padding: '40px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
  },
  waitingCard: {
    width: '100%',
    maxWidth: 380,
    background: 'rgba(10,15,30,0.85)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 24,
    padding: '36px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
  },
  questionContainer: {
    width: '100%',
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    background: 'linear-gradient(135deg, hsl(263,90%,64%) 0%, hsl(322,81%,54%) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(124,58,237,0.4)',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: 'white',
    fontFamily: "'Outfit', sans-serif",
    margin: 0,
  },
  subtitle: {
    color: '#A0AEC0',
    fontSize: 14,
    marginTop: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: '#718096',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  },
  input: {
    width: '100%',
    padding: '14px 18px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    color: 'white',
    fontSize: 16,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(248,113,113,0.08)',
    border: '1px solid rgba(248,113,113,0.3)',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    color: 'rgba(252,165,165,1)',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, hsl(263,90%,64%) 0%, hsl(322,81%,54%) 100%)',
    color: 'white',
    border: 'none',
    padding: '14px 24px',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
    width: '100%',
  },
  roomCodeCard: {
    background: 'rgba(167,139,250,0.06)',
    border: '1px solid rgba(167,139,250,0.2)',
    borderRadius: 16,
    padding: '16px 24px',
    textAlign: 'center',
  },
  answersGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  answerBtn: {
    border: 'none',
    borderRadius: 20,
    padding: '24px 16px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'transform 0.1s ease, box-shadow 0.2s ease',
    minHeight: 120,
    WebkitTapHighlightColor: 'transparent',
  },
  answerLabel: {
    fontSize: 28,
    fontWeight: 900,
    color: 'white',
    fontFamily: "'Outfit', sans-serif",
    lineHeight: 1,
  },
  answerText: {
    fontSize: 13,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 1.3,
    maxWidth: '100%',
    wordBreak: 'break-word',
  },
  scoreCard: {
    background: 'rgba(167,139,250,0.06)',
    border: '1px solid rgba(167,139,250,0.2)',
    borderRadius: 16,
    padding: '20px',
    textAlign: 'center',
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#A78BFA',
    animation: 'pulse-opac 1.5s infinite',
    display: 'inline-block',
  },
};
