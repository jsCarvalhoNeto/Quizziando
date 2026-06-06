// LocalGameMode.tsx — Modo Local (Offline) do Quizziando
// Layout idêntico ao modo online — sorteio, timer, ACERTOU/ERROU por rodada.

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Trophy, CheckCircle, XCircle, Home,
  Clock, Volume2, VolumeX, AlertCircle, ArrowLeft, Play, Crown, Sparkles,
  Settings, Upload, Image as ImageIcon, X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import {
  initDb, getLocalCategories, getLocalQuestions,
  importFromSupabaseData,
  type LocalCategory, type LocalQuestion
} from './lib/localDb';

// ─── Cores das alternativas (igual ao modo online) ──────────────────────────

const ANSWER_COLORS = [
  { index: 0, label: 'A', bg: '#E53E3E', bgHover: '#C53030', glow: 'rgba(229,62,62,0.4)',  icon: '▲', name: 'Vermelho' },
  { index: 1, label: 'B', bg: '#3182CE', bgHover: '#2B6CB0', glow: 'rgba(49,130,206,0.4)', icon: '◆', name: 'Azul'     },
  { index: 2, label: 'C', bg: '#D69E2E', bgHover: '#B7791F', glow: 'rgba(214,158,46,0.4)', icon: '●', name: 'Amarelo'  },
  { index: 3, label: 'D', bg: '#38A169', bgHover: '#276749', glow: 'rgba(56,161,105,0.4)', name: 'Verde',   icon: '■'  },
];

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface LocalPlayer {
  name: string;
  score: number;
  roundResults: Array<{ answered: boolean; correct: boolean | null }>;
}

type RoundPhase =
  | 'idle'
  | 'spinning'
  | 'category-reveal'
  | 'question-reveal'
  | 'question-first'
  | 'question-second'
  | 'round-result'
  | 'finished';

type LocalScreen = 'loading' | 'setup' | 'game' | 'podium';

interface Props {
  onBack: () => void;
  supabaseCategories?: LocalCategory[];
  supabaseQuestions?: LocalQuestion[];
  soundEnabled: boolean;
  onToggleSound: () => void;
}

// ─── Efeitos Sonoros ─────────────────────────────────────────────────────────

class LocalSfx {
  private ctx: AudioContext | null = null;
  public enabled = true;
  public gameAudio: HTMLAudioElement | null = null;
  public spinAudio: HTMLAudioElement | null = null;
  public victoryAudio: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.gameAudio = new Audio('/game.mp3');
      this.gameAudio.preload = 'auto';
      this.gameAudio.loop = true;
      this.gameAudio.volume = 0.5;

      this.spinAudio = new Audio('/spin.mp3');
      this.spinAudio.volume = 1.0;

      this.victoryAudio = new Audio('/victory.mp3');
      this.victoryAudio.volume = 0.5;
    }
  }

  private init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15) {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.start(); osc.stop(this.ctx.currentTime + dur);
  }

  playClick() { this.tone(600, 0.1, 'sine', 0.1); }
  playCorrect() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.2), i * 80)); }
  playWrong() { this.tone(180, 0.4, 'sawtooth', 0.12); }
  playTimeout() { this.tone(120, 0.6, 'sawtooth', 0.1); }

  playSpin() {
    if (!this.spinAudio) return;
    try { this.spinAudio.currentTime = 0; this.spinAudio.play().catch(() => {}); } catch {}
  }
  stopSpin() {
    if (!this.spinAudio) return;
    try { this.spinAudio.pause(); } catch {}
  }

  playVictory() {
    if (!this.victoryAudio) return;
    try { this.victoryAudio.currentTime = 0; this.victoryAudio.play().catch(() => {}); } catch {}
  }
  stopVictory() {
    if (!this.victoryAudio) return;
    try { this.victoryAudio.pause(); } catch {}
  }

  stopAll() {
    this.stopGameSound();
    this.stopSpin();
    this.stopVictory();
  }

  playGameSound() {
    if (!this.enabled || !this.gameAudio) return;
    try {
      this.gameAudio.currentTime = 0;
      this.gameAudio.play().catch(() => {});
    } catch {}
  }

  stopGameSound() {
    if (!this.gameAudio) return;
    try {
      this.gameAudio.pause();
    } catch {}
  }
}

const sfx = new LocalSfx();

function pickRandom<T>(arr: T[]): T | null {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
}

const TEAM_COLORS = ['#EF4444', '#3B82F6'] as const;
const TEAM_LIGHT  = ['#FCA5A5', '#93C5FD'] as const;
const TEAM_BG     = ['rgba(239,68,68,0.15)', 'rgba(59,130,246,0.15)'] as const;

// ─── Componente Principal ────────────────────────────────────────────────────

export default function LocalGameMode({ onBack, supabaseCategories, supabaseQuestions, soundEnabled, onToggleSound }: Props) {
  sfx.enabled = soundEnabled;

  const [localScreen, setLocalScreen] = useState<LocalScreen>('loading');

  const [dbError, setDbError]         = useState<string | null>(null);
  const [playerNames, setPlayerNames] = useState(['Time A', 'Time B']);
  const [totalRounds, setTotalRounds] = useState(6);
  const [isCustomRounds, setIsCustomRounds] = useState(false);
  const [hasObstacles, setHasObstacles]     = useState(false);
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);
  const [allCategories, setAllCategories]   = useState<LocalCategory[]>([]);
  const [allQuestions, setAllQuestions]     = useState<LocalQuestion[]>([]);

  const [players, setPlayers] = useState<[LocalPlayer, LocalPlayer]>([
    { name: 'Time A', score: 0, roundResults: [] },
    { name: 'Time B', score: 0, roundResults: [] },
  ]);

  const [currentRound, setCurrentRound]     = useState(1);
  const [roundStarterIndex, setRoundStarterIndex] = useState(0);
  const [firstFailed, setFirstFailed]       = useState(false);
  const [phase, setPhase]                   = useState<RoundPhase>('idle');
  const [selectedCategory, setSelectedCategory] = useState<LocalCategory | null>(null);
  const [currentQuestion, setCurrentQuestion]   = useState<LocalQuestion | null>(null);
  const [usedQuestionIds, setUsedQuestionIds]   = useState<string[]>([]);

  const [timeLeft, setTimeLeft]     = useState(20);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [rouletteAngle, setRouletteAngle] = useState(0);
  const [isSpinning, setIsSpinning]       = useState(false);
  const [pinDuration, setPinDuration]     = useState<number | null>(null);

  useEffect(() => {
    if (!isSpinning) {
      setPinDuration(null);
      return;
    }

    const startTime = Date.now();
    const totalDuration = 8000;
    const startSlowdownTime = 3000;
    const baseDuration = 0.1;
    const maxDuration = 2.0;

    let animFrameId: number;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= totalDuration) {
        setPinDuration(null);
        return;
      }

      if (elapsed < startSlowdownTime) {
        setPinDuration(baseDuration);
      } else {
        const t = (elapsed - startSlowdownTime) / (totalDuration - startSlowdownTime);
        const easeT = Math.pow(t, 2);
        const currentDur = baseDuration + easeT * (maxDuration - baseDuration);
        setPinDuration(currentDur);
      }

      animFrameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [isSpinning]);

  const [roundResult, setRoundResult] = useState<{ scorer: number | null; correct: boolean } | null>(null);

  useEffect(() => {
    if (!soundEnabled) {
      sfx.stopGameSound();
    } else {
      if (localScreen === 'game' && phase !== 'idle' && phase !== 'spinning') {
        sfx.playGameSound();
      } else {
        sfx.stopGameSound();
      }
    }
  }, [soundEnabled, localScreen, phase]);

  useEffect(() => {
    return () => {
      sfx.stopAll();
    };
  }, []);

  // Estados de configurações (Modo Local)
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<'appearance'>('appearance');
  const [bgImage, setBgImage] = useState<string | null>(() => localStorage.getItem('local_roulette_bg') || null);

  useEffect(() => {
    try {
      if (bgImage) localStorage.setItem('local_roulette_bg', bgImage);
      else localStorage.removeItem('local_roulette_bg');
    } catch (err) {
      console.error('Erro ao salvar imagem:', err);
      alert('A imagem é muito pesada para ser salva na memória. Tente enviar uma menor.');
    }
  }, [bgImage]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1080;
          
          if (width > height && width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          } else if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Comprime para JPEG com 80% de qualidade para economizar espaço no localStorage
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setBgImage(dataUrl);
        };
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  // ─── Init banco ────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        await initDb();
        const cats = getLocalCategories();
        const qs   = getLocalQuestions();
        setAllCategories(cats);
        setAllQuestions(qs);
        setSelectedCatIds(cats.map(c => c.id));
      } catch (err: any) {
        console.error('Erro no initDb:', err);
        setDbError(`Usando perguntas em memória (sql.js indisponível: ${err.message || String(err)}).`);
        if (supabaseCategories?.length) {
          setAllCategories(supabaseCategories);
          setSelectedCatIds(supabaseCategories.map(c => c.id));
        }
        if (supabaseQuestions?.length) {
          setAllQuestions(supabaseQuestions);
        }
      }
      setLocalScreen('setup');
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSyncWithCloud = () => {
    if (!supabaseCategories?.length || !supabaseQuestions?.length) {
      alert('Não foi possível obter dados da nuvem no momento. Verifique sua conexão.');
      return;
    }
    sfx.playClick();
    try {
      importFromSupabaseData(supabaseCategories, supabaseQuestions);
      const cats = getLocalCategories();
      const qs   = getLocalQuestions();
      setAllCategories(cats);
      setAllQuestions(qs);
      setSelectedCatIds(cats.map(c => c.id));
      alert('Sincronização concluída com sucesso!');
    } catch (err: any) {
      alert(`Erro ao sincronizar com a nuvem: ${err.message || String(err)}`);
    }
  };

  // ─── Timer ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { setTimerActive(false); return 0; }
          return t - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive]);

  useEffect(() => {
    if (timeLeft === 0 && (phase === 'question-first' || phase === 'question-second')) {
      sfx.playTimeout();
      if (phase === 'question-first') {
        setFirstFailed(true);
        setPhase('question-second');
        setTimeLeft(currentQuestion?.time_limit || 20);
        setTimerActive(true);
      } else {
        finishRound(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  // ─── Game Logic ────────────────────────────────────────────────────────────

  const startGame = () => {
    const cats = allCategories.filter(c => selectedCatIds.includes(c.id));
    const qs   = allQuestions.filter(q => selectedCatIds.includes(q.category_id));

    if (!cats.length) {
      setDbError('⚠️ Sem categorias disponíveis. Volte ao início e recarregue.');
      return;
    }
    if (qs.length < totalRounds) {
      setDbError(`⚠️ Precisa de ${totalRounds} perguntas, mas há ${qs.length}. Reduza as rodadas.`);
      return;
    }

    setDbError(null);
    const starter = Math.random() < 0.5 ? 0 : 1;
    setPlayers([
      { name: playerNames[0].trim() || 'Time A', score: 0, roundResults: [] },
      { name: playerNames[1].trim() || 'Time B', score: 0, roundResults: [] },
    ]);
    setCurrentRound(1);
    setRoundStarterIndex(starter);
    setFirstFailed(false);
    setUsedQuestionIds([]);
    setPhase('idle');
    setRouletteAngle(0);
    setLocalScreen('game');
    sfx.playClick();
  };

  const handleSpin = useCallback(() => {
    if (isSpinning || phase !== 'idle') return;
    let wheelCats = allCategories.filter(c => selectedCatIds.includes(c.id));
    if (hasObstacles) {
      wheelCats = [
        ...wheelCats,
        { id: 'obs-perde', name: 'Perde Tudo', color: '#111111', created_at: '', isObstacle: true, type: 'perde-tudo' } as any,
        { id: 'obs-passa', name: 'Passa a Vez', color: '#FFFFFF', created_at: '', isObstacle: true, type: 'passa-vez' } as any,
      ];
    }
    if (!wheelCats.length) return;

    setIsSpinning(true);
    setPhase('spinning');
    sfx.playSpin();

    const chosenIdx = Math.floor(Math.random() * wheelCats.length);
    const chosen    = wheelCats[chosenIdx];
    const extraSp   = 6 + Math.floor(Math.random() * 4);
    
    // Cálculo do ângulo exato para a roleta parar na categoria 'chosen'
    const segCount  = Math.max(wheelCats.length, 1);
    const segAngle  = 360 / segCount;
    const r         = 0.15 + Math.random() * 0.7; // Ponto aleatório dentro da fatia, evitando as bordas
    const P         = chosenIdx * segAngle - 90 + r * segAngle; // Ângulo inicial desse ponto
    
    let targetMod = (360 - P) % 360;
    if (targetMod < 0) targetMod += 360;
    
    let diff = targetMod - (rouletteAngle % 360);
    if (diff <= 0) diff += 360;
    
    const target = rouletteAngle + diff + 360 * extraSp;
    setRouletteAngle(target);

    setTimeout(() => {
      setIsSpinning(false);

      setTimeout(() => {
        setSelectedCategory(chosen);
        setPhase('category-reveal');
        sfx.playClick();

        setTimeout(() => {
          if ((chosen as any).isObstacle) {
            if ((chosen as any).type === 'perde-tudo') {
              setPlayers(prev => {
                const p = [...prev] as [LocalPlayer, LocalPlayer];
                p[roundStarterIndex] = { ...p[roundStarterIndex], score: 0 };
                return p;
              });
            }
            sfx.playWrong();
            setRoundStarterIndex(i => (i === 0 ? 1 : 0));
            setPhase('idle');
            setSelectedCategory(null);
            return;
          }

          const catQs = allQuestions.filter(q => q.category_id === chosen.id && !usedQuestionIds.includes(q.id));
          const anyQs = allQuestions.filter(q => selectedCatIds.includes(q.category_id) && !usedQuestionIds.includes(q.id));
          let pool  = catQs.length > 0 ? catQs : anyQs;
          let question = pickRandom(pool);

          let chosenQuestion = question;
          if (!chosenQuestion) {
            // Fallback: se todas as perguntas das categorias selecionadas foram usadas, resetamos o histórico de usadas
            const resetPool = allQuestions.filter(q => selectedCatIds.includes(q.category_id));
            chosenQuestion = pickRandom(resetPool);
            if (chosenQuestion) {
              setUsedQuestionIds([chosenQuestion.id]);
            }
          } else {
            const qId = chosenQuestion.id;
            setUsedQuestionIds(prev => [...prev, qId]);
          }

          if (!chosenQuestion) { setPhase('idle'); return; }

          setCurrentQuestion(chosenQuestion);
          setFirstFailed(false);
          setTimeLeft(chosenQuestion.time_limit || 20);
          setPhase('question-reveal');
          setTimerActive(false);
        }, 3800);
      }, 2000);
    }, 8000);
  }, [isSpinning, phase, allCategories, allQuestions, selectedCatIds, usedQuestionIds, rouletteAngle, hasObstacles, roundStarterIndex]);

  const currentResponderIndex = firstFailed
    ? (roundStarterIndex === 0 ? 1 : 0)
    : roundStarterIndex;

  const handleJudge = (correct: boolean) => {
    if (phase !== 'question-first' && phase !== 'question-second') return;
    setTimerActive(false);
    if (correct) {
      sfx.playCorrect();
      finishRound(currentResponderIndex);
    } else {
      sfx.playWrong();
      if (phase === 'question-first') {
        setFirstFailed(true);
        setPhase('question-second');
        setTimeLeft(currentQuestion?.time_limit || 20);
        setTimerActive(true);
      } else {
        finishRound(null);
      }
    }
  };

  const finishRound = (scorerIndex: number | null) => {
    setTimerActive(false);
    setPhase('round-result');

    setPlayers(prev => {
      const updated: [LocalPlayer, LocalPlayer] = [
        { ...prev[0], roundResults: [...prev[0].roundResults] },
        { ...prev[1], roundResults: [...prev[1].roundResults] },
      ];
      if (scorerIndex !== null) {
        updated[scorerIndex].score += 100;
        updated[scorerIndex].roundResults.push({ answered: true, correct: true });
        updated[scorerIndex === 0 ? 1 : 0].roundResults.push({ answered: false, correct: null });
      } else {
        updated[roundStarterIndex].roundResults.push({ answered: true, correct: false });
        const other = roundStarterIndex === 0 ? 1 : 0;
        updated[other].roundResults.push({ answered: firstFailed, correct: firstFailed ? false : null });
      }
      return updated;
    });

    setRoundResult({ scorer: scorerIndex, correct: scorerIndex !== null });

    setTimeout(() => {
      setRoundResult(null);
      if (currentRound >= totalRounds) {
        setPhase('finished');
        setLocalScreen('podium');
        sfx.stopGameSound();
        sfx.playVictory();
        setTimeout(() => {
          const end = Date.now() + 4000;
          const frame = () => {
            confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } });
            confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } });
            if (Date.now() < end) requestAnimationFrame(frame);
          };
          frame();
          confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
        }, 300);
      } else {
        setCurrentRound(r => r + 1);
        setRoundStarterIndex(i => (i === 0 ? 1 : 0));
        setFirstFailed(false);
        setCurrentQuestion(null);
        setSelectedCategory(null);
        setPhase('idle');
      }
    }, 5500);
  };

  const resetGame = () => {
    setLocalScreen('setup');
    setPhase('idle');
    setCurrentQuestion(null);
    setSelectedCategory(null);
    setUsedQuestionIds([]);
    setRoundResult(null);
    setTimerActive(false);
    setFirstFailed(false);
    sfx.playClick();
  };

  // ─── Cálculos ─────────────────────────────────────────────────────────────

  const sorted    = [...players].sort((a, b) => b.score - a.score);
  const winner    = sorted[0];
  const loser     = sorted[1];
  const isTie     = winner.score === loser.score;
  const wheelCatsBase = allCategories.filter(c => selectedCatIds.includes(c.id));
  const wheelCats = hasObstacles
    ? [
        ...wheelCatsBase,
        { id: 'obs-perde', name: 'Perde Tudo', color: '#111111', created_at: '', isObstacle: true, type: 'perde-tudo' } as any,
        { id: 'obs-passa', name: 'Passa a Vez', color: '#FFFFFF', created_at: '', isObstacle: true, type: 'passa-vez' } as any,
      ]
    : wheelCatsBase;
  const segCount  = Math.max(wheelCats.length, 1);
  const segAngle  = 360 / segCount;
  const WS        = 800; // wheel size
  const R         = WS / 2;

  const timerMax  = currentQuestion?.time_limit || 20;
  const timerPct  = timeLeft / timerMax * 100;
  const timerCol  = timerPct > 50 ? '#10B981' : timerPct > 25 ? '#F59E0B' : '#EF4444';

  // ─── LOADING ──────────────────────────────────────────────────────────────

  if (localScreen === 'loading') {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div className="animate-spin" style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid rgba(124,58,237,0.2)', borderTopColor: '#7C3AED' }} />
        <p style={{ color: 'rgba(148,163,184,0.8)', fontWeight: 600 }}>Iniciando banco local...</p>
      </div>
    );
  }

  // ─── SETUP ────────────────────────────────────────────────────────────────

  if (localScreen === 'setup') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{ maxWidth: 580, margin: '0 auto', width: '100%' }}>
        <div className="glass-card p-8 flex flex-col gap-6">

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={onBack}
                style={{ padding: 8, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', color: 'rgba(148,163,184,0.9)', display: 'flex' }}>
                <ArrowLeft style={{ width: 18, height: 18 }} />
              </button>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: 0 }}>🖥️ Modo Local</h2>
                <p style={{ fontSize: 12, color: 'rgba(148,163,184,0.6)', margin: '2px 0 0' }}>Dois times · Resposta oral · Sem internet</p>
              </div>
            </div>
            
            <button 
              onClick={handleSyncWithCloud}
              title="Baixar categorias e perguntas da nuvem para o SQLite local"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 10,
                background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                color: '#60A5FA', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; }}
            >
              <Upload style={{ width: 14, height: 14, transform: 'rotate(180deg)' }} />
              Sincronizar
            </button>
          </div>

          {dbError && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <AlertCircle style={{ width: 18, height: 18, color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 12, color: '#EF4444', lineHeight: 1.5 }}>{dbError}</p>
            </div>
          )}

          {/* Nomes dos times */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[0, 1].map(i => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: TEAM_LIGHT[i], textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {i === 0 ? '🔴' : '🔵'} {i === 0 ? 'Time A' : 'Time B'}
                </label>
                <input
                  type="text" maxLength={20} className="input-glow"
                  style={{ textAlign: 'center', fontWeight: 700, borderColor: TEAM_COLORS[i] + '44' }}
                  value={playerNames[i]}
                  onChange={e => setPlayerNames(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
                  placeholder={i === 0 ? 'Time A' : 'Time B'}
                />
              </div>
            ))}
          </div>

          {/* Rodadas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(148,163,184,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Número de Rodadas
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[2, 6, 10, 16].map(n => (
                <button key={n}
                  onClick={() => { setTotalRounds(n); setIsCustomRounds(false); sfx.playClick(); }}
                  style={{
                    flex: 1, padding: '10px 4px', borderRadius: 10, fontWeight: 800, fontSize: 16,
                    background: !isCustomRounds && totalRounds === n ? 'linear-gradient(135deg, #7C3AED, #6D28D9)' : 'rgba(255,255,255,0.04)',
                    border: !isCustomRounds && totalRounds === n ? '1px solid #7C3AED' : '1px solid rgba(255,255,255,0.06)',
                    color: !isCustomRounds && totalRounds === n ? 'white' : 'rgba(148,163,184,0.7)',
                    cursor: 'pointer', boxShadow: !isCustomRounds && totalRounds === n ? '0 4px 20px rgba(124,58,237,0.35)' : 'none',
                    transition: 'all 0.2s'
                  }}>
                  {n}
                </button>
              ))}
              <button
                onClick={() => { setIsCustomRounds(true); sfx.playClick(); }}
                style={{
                  flex: '2', padding: '10px 4px', borderRadius: 10, fontWeight: 800, fontSize: 14,
                  background: isCustomRounds ? 'linear-gradient(135deg, #7C3AED, #6D28D9)' : 'rgba(255,255,255,0.04)',
                  border: isCustomRounds ? '1px solid #7C3AED' : '1px solid rgba(255,255,255,0.06)',
                  color: isCustomRounds ? 'white' : 'rgba(148,163,184,0.7)',
                  cursor: 'pointer', boxShadow: isCustomRounds ? '0 4px 20px rgba(124,58,237,0.35)' : 'none',
                  transition: 'all 0.2s'
                }}>
                Personalizado
              </button>
            </div>
            {isCustomRounds && (
              <div style={{ marginTop: 4 }}>
                <input
                  type="number"
                  min={2}
                  max={100}
                  step={2}
                  value={totalRounds}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 2;
                    setTotalRounds(val % 2 !== 0 ? val + 1 : val);
                  }}
                  className="input-glow"
                  style={{ width: '100%', textAlign: 'center', fontWeight: 700, fontSize: 16 }}
                  placeholder="Digite o número de rodadas (par)..."
                />
                <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)', marginTop: 8, textAlign: 'center', lineHeight: 1.4 }}>
                  O número de rodadas deve ser par para que as duas equipes tenham exatamente o mesmo número de turnos.
                </p>
              </div>
            )}
          </div>

          {/* Modo de Jogo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(148,163,184,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Modo de Jogo
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setHasObstacles(false); sfx.playClick(); }}
                style={{
                  flex: 1, padding: '10px 4px', borderRadius: 10, fontWeight: 800, fontSize: 14,
                  background: !hasObstacles ? 'linear-gradient(135deg, #7C3AED, #6D28D9)' : 'rgba(255,255,255,0.04)',
                  border: !hasObstacles ? '1px solid #7C3AED' : '1px solid rgba(255,255,255,0.06)',
                  color: !hasObstacles ? 'white' : 'rgba(148,163,184,0.7)',
                  cursor: 'pointer', boxShadow: !hasObstacles ? '0 4px 20px rgba(124,58,237,0.35)' : 'none',
                  transition: 'all 0.2s'
                }}>
                Sem obstáculos
              </button>
              <button
                onClick={() => { setHasObstacles(true); sfx.playClick(); }}
                style={{
                  flex: 1, padding: '10px 4px', borderRadius: 10, fontWeight: 800, fontSize: 14,
                  background: hasObstacles ? 'linear-gradient(135deg, #7C3AED, #6D28D9)' : 'rgba(255,255,255,0.04)',
                  border: hasObstacles ? '1px solid #7C3AED' : '1px solid rgba(255,255,255,0.06)',
                  color: hasObstacles ? 'white' : 'rgba(148,163,184,0.7)',
                  cursor: 'pointer', boxShadow: hasObstacles ? '0 4px 20px rgba(124,58,237,0.35)' : 'none',
                  transition: 'all 0.2s'
                }}>
                Com obstáculos
              </button>
            </div>
          </div>

          {/* Categorias */}
          {allCategories.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(148,163,184,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Categorias ({selectedCatIds.length}/{allCategories.length})
                </label>
                <button onClick={() => setSelectedCatIds(s => s.length === allCategories.length ? [] : allCategories.map(c => c.id))}
                  style={{ fontSize: 11, color: '#7C3AED', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                  {selectedCatIds.length === allCategories.length ? 'Desmarcar todas' : 'Selecionar todas'}
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 140, overflowY: 'auto' }}>
                {allCategories.map(cat => {
                  const sel = selectedCatIds.includes(cat.id);
                  return (
                    <button key={cat.id}
                      onClick={() => { setSelectedCatIds(prev => sel ? prev.filter(id => id !== cat.id) : [...prev, cat.id]); sfx.playClick(); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 999, fontWeight: 700, fontSize: 12,
                        background: sel ? `${cat.color}22` : 'rgba(255,255,255,0.03)',
                        border: sel ? `1.5px solid ${cat.color}99` : '1.5px solid rgba(255,255,255,0.06)',
                        color: sel ? cat.color : 'rgba(148,163,184,0.5)',
                        cursor: 'pointer', transition: 'all 0.18s'
                      }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cat.color, display: 'inline-block' }} />
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Regras */}
          <div style={{ padding: '14px 16px', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12 }}>
            <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: 'rgba(199,210,254,0.9)' }}>ℹ️ Regras do Modo Local</p>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'rgba(148,163,184,0.8)', lineHeight: 1.8 }}>
              <li>Um <strong>sorteio</strong> decide qual time começa a rodada 1</li>
              <li>O time da vez responde <strong>em voz alta</strong> dentro do tempo</li>
              <li>Se <strong>errar ou o tempo acabar</strong>, o outro time tem a mesma chance</li>
              <li>Acerto = <strong>100 pontos</strong>. Erro = 0 pontos</li>
              <li>A cada rodada, <strong>alterna</strong> quem começa respondendo</li>
            </ul>
          </div>

          <button onClick={startGame} className="btn-glow justify-center" style={{ fontSize: 16, fontWeight: 800, padding: 14 }}>
            <Play style={{ width: 20, height: 20 }} /> Iniciar Jogo
          </button>
        </div>
      </motion.div>
    );
  }

  // ─── TELA DE JOGO ─────────────────────────────────────────────────────────

  if (localScreen === 'game') {
    const respIdx       = currentResponderIndex;
    const progressPct   = (currentRound - 1) / totalRounds * 100;
    const correctAnswer = currentQuestion?.alternatives.find(a => a.isCorrect);

    return (
      <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'row', background: '#0f0e17' }}>

        {/* ── Lateral Esquerda (Placar e Status) ── */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start',
          padding: '32px 24px', background: 'rgba(0,0,0,0.3)',
          borderRight: '1px solid rgba(255,255,255,0.06)', gap: 32, flexShrink: 0,
          width: 260, overflowY: 'auto'
        }}>
          {/* Controles + Rodada (Topo) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <button onClick={onBack} title="Início"
                style={{ padding: 7, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', color: 'rgba(148,163,184,0.7)', display: 'flex' }}>
                <Home style={{ width: 14, height: 14 }} />
              </button>
              <button onClick={onToggleSound} title="Som"
                style={{ padding: 7, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', color: 'rgba(148,163,184,0.7)', display: 'flex' }}>
                {soundEnabled ? <Volume2 style={{ width: 14, height: 14 }} /> : <VolumeX style={{ width: 14, height: 14 }} />}
              </button>
              <button onClick={() => { setShowSettingsModal(true); sfx.playClick(); }} title="Configurações"
                style={{ padding: 7, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', color: showSettingsModal ? '#7C3AED' : 'rgba(148,163,184,0.7)', display: 'flex' }}>
                <Settings style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Rodada</span>
            <span style={{ fontSize: 36, fontWeight: 900, color: '#FBBF24', lineHeight: 1 }}>
              {currentRound}<span style={{ fontSize: 16, color: 'rgba(251,191,36,0.5)' }}>/{totalRounds}</span>
            </span>
            <div style={{ width: '100%', height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 4 }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg,#7C3AED,#EC4899)', borderRadius: 999, width: `${progressPct}%`, transition: 'width 0.5s' }} />
            </div>
          </div>

          {/* Equipes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {([0, 1] as const).map((i) => {
              const isActive = respIdx === i && phase !== 'round-result' && phase !== 'finished';
              return (
                <motion.div key={i}
                  animate={{ 
                    scale: isActive ? [1, 1.03, 1] : 1,
                    opacity: isActive ? [1, 0.85, 1] : 1
                  }}
                  transition={{ repeat: isActive ? Infinity : 0, duration: 1.5 }}
                  style={{
                    padding: '20px 16px', borderRadius: 16,
                    background: isActive ? TEAM_BG[i] : 'rgba(255,255,255,0.03)',
                    border: isActive ? `2px solid ${TEAM_COLORS[i]}60` : '1px solid rgba(255,255,255,0.06)',
                    textAlign: 'center', position: 'relative', overflow: 'hidden',
                    transition: 'all 0.35s'
                  }}>
                  {isActive && (
                    <span style={{
                      position: 'absolute', top: 12, right: 12,
                      display: 'flex', alignItems: 'center', gap: 4
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: TEAM_COLORS[i], animation: 'pulse 1s infinite', display: 'inline-block' }} />
                      <span style={{ fontSize: 9, fontWeight: 800, color: TEAM_COLORS[i] }}>VEZ</span>
                    </span>
                  )}
                  <p style={{ margin: '0 0 8px 0', fontSize: 12, fontWeight: 800, color: 'rgba(148,163,184,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {players[i].name}
                  </p>
                  <p style={{ margin: 0, fontSize: 40, fontWeight: 900, color: isActive ? TEAM_COLORS[i] : 'rgba(255,255,255,0.4)', fontFamily: 'monospace', lineHeight: 1 }}>
                    {players[i].score}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* ── Área principal ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 20px', position: 'relative', overflow: 'hidden', backgroundImage: (bgImage && (phase === 'idle' || phase === 'spinning')) ? `url(${bgImage})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>

          <AnimatePresence mode="wait">

            {/* IDLE + SPINNING — Roleta estilo online */}
            {(phase === 'idle' || phase === 'spinning') && (
              <motion.div key="roulette"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>


                {/* Roleta SVG — igual ao online em tamanho */}
                <div style={{ position: 'relative', width: WS, height: WS }}>
                  {/* Seta indicadora (direita, igual ao online) */}
                  <div style={{
                    position: 'absolute', right: -18, top: '50%', transform: 'translateY(-50%)',
                    zIndex: 20, width: 0, height: 0,
                    borderTop: '14px solid transparent',
                    borderBottom: '14px solid transparent',
                    borderRight: '28px solid #A3E635',
                    filter: 'drop-shadow(0 2px 8px rgba(163,230,53,0.6))',
                    transformOrigin: 'right center',
                    animation: isSpinning
                      ? (pinDuration ? `pointer-strike ${pinDuration}s linear infinite` : 'none')
                      : 'pointer-idle 1.5s ease-in-out infinite'
                  }} />

                  <div
                    onClick={phase === 'idle' ? handleSpin : undefined}
                    style={{
                      width: WS, height: WS, borderRadius: '50%',
                      boxShadow: '0 0 60px rgba(124,58,237,0.3), 0 12px 40px rgba(0,0,0,0.6)',
                      transform: `rotate(${rouletteAngle}deg)`,
                      transition: isSpinning ? 'transform 8s cubic-bezier(0.1, 0.9, 0.2, 1)' : 'none',
                      cursor: phase === 'idle' ? 'pointer' : 'default',
                      position: 'relative'
                    }}>
                    <svg width={WS} height={WS} viewBox={`0 0 ${WS} ${WS}`} style={{ position: 'absolute', top: 0, left: 0 }}>
                      {wheelCats.map((cat, i) => {
                        const sa  = (i * segAngle - 90) * (Math.PI / 180);
                        const ea  = ((i + 1) * segAngle - 90) * (Math.PI / 180);
                        const x1  = R + R * Math.cos(sa), y1 = R + R * Math.sin(sa);
                        const x2  = R + R * Math.cos(ea), y2 = R + R * Math.sin(ea);
                        const la  = segAngle > 180 ? 1 : 0;
                        const ma  = (sa + ea) / 2;
                        const tr  = R * 0.26;
                        const tx  = R + tr * Math.cos(ma), ty = R + tr * Math.sin(ma);
                        const ta  = ma * (180 / Math.PI);
                        const fz  = segCount > 10 ? 14 : segCount > 6 ? 16 : 18;
                        const textColor = cat.color.toUpperCase() === '#FFFFFF' ? '#000000' : 'white';
                        return (
                          <g key={cat.id}>
                            <path d={`M ${R} ${R} L ${x1} ${y1} A ${R} ${R} 0 ${la} 1 ${x2} ${y2} Z`}
                              fill={cat.color} stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} />
                            <text x={tx} y={ty} fill={textColor} fontSize={fz} fontWeight="bold"
                              textAnchor="start" dominantBaseline="middle"
                              transform={`rotate(${ta}, ${tx}, ${ty})`}
                              style={{ userSelect: 'none' }}>
                              {cat.name}
                            </text>
                          </g>
                        );
                      })}
                      <circle cx={R} cy={R} r={R - 4} fill="none" stroke="white" strokeWidth={8} />
                      {Array.from({ length: 36 }).map((_, i) => {
                        const angle = (i * 10) * (Math.PI / 180);
                        const dotR = R - 12;
                        const cx = R + dotR * Math.cos(angle);
                        const cy = R + dotR * Math.sin(angle);
                        return (
                          <circle key={`dot-${i}`} cx={cx} cy={cy} r={3.5} fill="white"
                            className="animate-pulse"
                            style={{ animationDelay: `${Math.random() * 2}s`, animationDuration: `${0.8 + Math.random()}s` }} />
                        );
                      })}
                      {wheelCats.length === 0 && <circle cx={R} cy={R} r={R - 3} fill="#374151" />}
                    </svg>

                    {/* Botão central "RODAR" — estilo online */}
                    <div
                      onClick={e => { e.stopPropagation(); if (phase === 'idle') handleSpin(); }}
                      style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: WS * 0.22, height: WS * 0.22, borderRadius: '50%',
                        background: 'radial-gradient(circle at 35% 35%, #6366f1, #4338ca)',
                        border: '4px solid #3730a3',
                        boxShadow: '0 6px 0 #2e1065, 0 8px 24px rgba(99,102,241,0.6)',
                        zIndex: 20, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        cursor: phase === 'idle' ? 'pointer' : 'default',
                        gap: 2,
                        transition: 'transform 0.1s, box-shadow 0.1s'
                      }}>
                      {isSpinning
                        ? <Sparkles style={{ color: 'white', width: 24, height: 24 }} />
                        : <>
                            <svg viewBox="0 0 24 24" fill="white" style={{ width: 20, height: 20 }}>
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8l5 4-5 4z"/>
                            </svg>
                            <span style={{ color: 'white', fontWeight: 900, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              RODAR
                            </span>
                          </>
                      }
                    </div>
                  </div>
                </div>

                {/* Título igual ao online - Movido para a parte de baixo */}
                <div style={{
                  background: 'linear-gradient(135deg, #5B21B6, #7C3AED)',
                  borderRadius: 999, padding: '10px 32px',
                  boxShadow: '0 4px 24px rgba(124,58,237,0.4)',
                  marginTop: 24
                }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: 'white', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    🎯 Roleta das Categorias
                  </span>
                </div>

                <p style={{ fontSize: 16, color: 'rgba(148,163,184,0.7)', margin: 0 }}>
                  Começa: <span style={{ color: TEAM_LIGHT[roundStarterIndex], fontWeight: 800 }}>{players[roundStarterIndex].name}</span>
                  {phase === 'idle' && <span style={{ color: 'rgba(148,163,184,0.4)', marginLeft: 6 }}>(se errar → {players[roundStarterIndex === 0 ? 1 : 0].name})</span>}
                </p>

                {isSpinning && (
                  <p style={{ fontSize: 14, color: 'rgba(148,163,184,0.6)', animation: 'pulse 1s infinite' }}>
                    ✨ Sorteando categoria...
                  </p>
                )}
              </motion.div>
            )}

            {/* CATEGORY REVEAL */}
            {phase === 'category-reveal' && selectedCategory && (
              <motion.div key="cat-reveal"
                initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 44 }}>
                <p style={{ fontSize: 24, fontWeight: 700, color: 'rgba(148,163,184,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                  {(selectedCategory as any).isObstacle ? 'Obstáculo Sorteado' : 'Categoria Sorteada'}
                </p>
                <div style={{
                  width: 200, height: 200, borderRadius: 60,
                  background: `linear-gradient(135deg, ${selectedCategory.color}cc, ${selectedCategory.color}55)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 12px 40px ${selectedCategory.color}50`
                }}>
                  {(selectedCategory as any).isObstacle ? (
                    <AlertCircle style={{ width: 100, height: 100, color: 'white' }} />
                  ) : (
                    <Trophy style={{ width: 100, height: 100, color: 'white' }} />
                  )}
                </div>
                <h3 style={{ fontSize: 96, fontWeight: 900, color: selectedCategory.color, textShadow: `0 0 40px ${selectedCategory.color}60`, margin: 0 }}>
                  {selectedCategory.name}
                </h3>
                <p style={{ fontSize: 28, color: 'rgba(148,163,184,0.6)', margin: 0 }}>
                  {(selectedCategory as any).isObstacle
                    ? ((selectedCategory as any).type === 'perde-tudo' ? 'Zerando os pontos e passando a vez...' : 'Passando a vez...')
                    : '⏳ Carregando pergunta...'}
                </p>
              </motion.div>
            )}
            {/* QUESTION REVEAL */}
            {phase === 'question-reveal' && currentQuestion && (
              <motion.div key="question-reveal"
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40, maxWidth: 1200 }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: 'rgba(148,163,184,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                  Atenção para a pergunta
                </p>
                <h2 style={{ fontSize: 72, fontWeight: 900, color: 'white', lineHeight: 1.3, margin: 0 }}>
                  {currentQuestion.question_text}
                </h2>
                <button
                  onClick={() => {
                    setPhase('question-first');
                    setTimerActive(true);
                  }}
                  style={{
                    padding: '24px 48px', borderRadius: 24,
                    background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                    border: '2px solid rgba(59,130,246,0.4)',
                    boxShadow: '0 8px 32px rgba(37,99,235,0.3)',
                    color: 'white', fontWeight: 900, fontSize: 24, cursor: 'pointer', marginTop: 24
                  }}>
                  Revelar Alternativas e Iniciar Tempo
                </button>
              </motion.div>
            )}

            {/* QUESTION */}
            {(phase === 'question-first' || phase === 'question-second') && currentQuestion && (
              <motion.div key="question"
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                style={{ width: '100%', maxWidth: 1500, display: 'flex', flexDirection: 'column', gap: 0 }}>

                {/* Barra superior: categoria + timer + segunda chance */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '18px 26px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px 16px 0 0',
                  border: '1px solid rgba(255,255,255,0.06)', borderBottom: 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: selectedCategory?.color || '#7C3AED', display: 'inline-block' }} />
                    <span style={{ fontSize: 16, fontWeight: 700, color: selectedCategory?.color || '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {selectedCategory?.name}
                    </span>
                    {phase === 'question-second' && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                        style={{ fontSize: 13, fontWeight: 800, color: '#FBBF24', background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 999, padding: '4px 12px', marginLeft: 8 }}>
                        ⚡ SEGUNDA CHANCE
                      </motion.span>
                    )}
                  </div>
                  {/* Timer circular */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Clock style={{ width: 20, height: 20, color: 'rgba(148,163,184,0.6)' }} />
                    <motion.span
                      key={timeLeft}
                      initial={{ scale: timeLeft <= 5 ? 1.3 : 1 }} animate={{ scale: 1 }}
                      style={{ fontSize: 40, fontWeight: 900, color: timerCol, fontFamily: 'monospace', minWidth: 68, textAlign: 'right' }}>
                      {timeLeft}s
                    </motion.span>
                  </div>
                </div>

                {/* Barra de progresso do timer */}
                <div style={{ height: 6, background: 'rgba(255,255,255,0.07)' }}>
                  <motion.div
                    animate={{ width: `${timerPct}%` }}
                    transition={{ duration: 0.95, ease: 'linear' }}
                    style={{ height: '100%', background: `linear-gradient(90deg, ${timerCol}, ${timerCol}bb)` }} />
                </div>

                {/* Banner do time respondendo */}
                <div style={{
                  padding: '18px 26px',
                  background: TEAM_BG[respIdx],
                  border: `1px solid ${TEAM_COLORS[respIdx]}40`,
                  borderTop: 'none', borderBottom: 'none',
                  display: 'flex', alignItems: 'center', gap: 12
                }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: TEAM_COLORS[respIdx], animation: 'pulse 1s infinite', flexShrink: 0 }} />
                  <span style={{ fontSize: 20, fontWeight: 800, color: TEAM_LIGHT[respIdx] }}>
                    {players[respIdx].name} — responda em voz alta!
                  </span>
                </div>

                {/* Pergunta */}
                <div style={{
                  padding: '46px 38px', background: 'rgba(10,9,20,0.7)',
                  border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none', borderBottom: 'none',
                  textAlign: 'center'
                }}>
                  <p style={{ margin: 0, fontSize: 42, fontWeight: 800, color: 'white', lineHeight: 1.5 }}>
                    {currentQuestion.question_text}
                  </p>
                </div>

                {/* Alternativas — 4 blocos coloridos estilo online */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
                  border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none', borderRadius: '0 0 16px 16px', overflow: 'hidden'
                }}>
                  {ANSWER_COLORS.map(col => {
                    const alt = currentQuestion.alternatives[col.index];
                    return (
                      <div key={col.index}
                        style={{
                          padding: '26px 36px', display: 'flex', alignItems: 'center', gap: 18,
                          background: `linear-gradient(135deg, ${col.bg} 0%, ${col.bgHover} 100%)`,
                          borderRight: col.index === 0 || col.index === 2 ? '1px solid rgba(0,0,0,0.2)' : 'none',
                          borderBottom: col.index === 0 || col.index === 1 ? '1px solid rgba(0,0,0,0.2)' : 'none',
                          position: 'relative'
                        }}>
                        <span style={{ fontSize: 38, fontWeight: 900, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                          {col.label}
                        </span>
                        <span style={{ fontSize: 23, fontWeight: 700, color: 'white', lineHeight: 1.4 }}>
                          {alt?.text || '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Botões ACERTOU / ERROU */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => handleJudge(true)}
                    style={{
                      padding: '16px 32px', borderRadius: 16,
                      background: 'linear-gradient(135deg, #059669, #047857)',
                      border: '2px solid rgba(16,185,129,0.4)',
                      boxShadow: '0 8px 32px rgba(5,150,105,0.35)',
                      color: 'white', fontWeight: 900, fontSize: 28, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14
                    }}>
                    <CheckCircle style={{ width: 32, height: 32 }} />
                    ACERTOU
                  </motion.button>

                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => handleJudge(false)}
                    style={{
                      padding: '16px 32px', borderRadius: 16,
                      background: 'linear-gradient(135deg, #DC2626, #B91C1C)',
                      border: '2px solid rgba(239,68,68,0.4)',
                      boxShadow: '0 8px 32px rgba(220,38,38,0.35)',
                      color: 'white', fontWeight: 900, fontSize: 28, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14
                    }}>
                    <XCircle style={{ width: 32, height: 32 }} />
                    ERROU
                  </motion.button>
                </div>

                {phase === 'question-first' && (
                  <p style={{ margin: '8px 0 0', fontSize: 11, color: 'rgba(148,163,184,0.4)', textAlign: 'center' }}>
                    Se errar ou o tempo acabar → <strong style={{ color: TEAM_LIGHT[roundStarterIndex === 0 ? 1 : 0] }}>{players[roundStarterIndex === 0 ? 1 : 0].name}</strong> terá a mesma chance
                  </p>
                )}
              </motion.div>
            )}

            {/* RESULTADO DA RODADA */}
            {phase === 'round-result' && roundResult && (
              <motion.div key="round-result"
                initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 220 }}
                style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36 }}>

                {roundResult.scorer !== null ? (
                  <>
                    <div style={{ fontSize: 130 }}>🎉</div>
                    <div>
                      <p style={{ margin: '0 0 14px', fontSize: 23, fontWeight: 700, color: 'rgba(148,163,184,0.6)', textTransform: 'uppercase' }}>Acertou!</p>
                      <h3 style={{ margin: '0 0 10px', fontSize: 72, fontWeight: 900, color: TEAM_COLORS[roundResult.scorer] }}>
                        {players[roundResult.scorer].name}
                      </h3>
                      <p style={{ margin: 0, fontSize: 54, fontWeight: 900, color: '#34D399' }}>+100 pontos</p>
                    </div>
                    {correctAnswer && (
                      <div style={{ padding: '22px 36px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 20 }}>
                        <p style={{ margin: '0 0 8px', fontSize: 20, color: 'rgba(52,211,153,0.8)', textTransform: 'uppercase', fontWeight: 700 }}>Resposta Correta</p>
                        <p style={{ margin: 0, fontSize: 27, color: 'white', fontWeight: 700 }}>{correctAnswer.text}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 115 }}>😅</div>
                    <div>
                      <h3 style={{ margin: '0 0 14px', fontSize: 54, fontWeight: 900, color: '#F87171' }}>Ninguém acertou</h3>
                      <p style={{ margin: 0, fontSize: 27, color: 'rgba(148,163,184,0.7)' }}>Ambos os times erraram esta rodada</p>
                    </div>
                    {correctAnswer && (
                      <div style={{ padding: '22px 36px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20 }}>
                        <p style={{ margin: '0 0 8px', fontSize: 20, color: 'rgba(239,68,68,0.8)', textTransform: 'uppercase', fontWeight: 700 }}>Resposta Correta era</p>
                        <p style={{ margin: 0, fontSize: 27, color: 'white', fontWeight: 700 }}>{correctAnswer.text}</p>
                      </div>
                    )}
                  </>
                )}

                {currentRound < totalRounds && (
                  <p style={{ margin: 0, fontSize: 22, color: 'rgba(148,163,184,0.4)' }}>
                    Próxima rodada em instantes...
                  </p>
                )}
              </motion.div>
            )}

          </AnimatePresence>
          </div>

          {/* ── Histórico de rodadas (Lateral Direita) ── */}
          <div style={{
            display: 'flex', flexDirection: 'row', gap: 32, padding: '32px 24px', justifyContent: 'center',
            borderLeft: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)', flexShrink: 0,
            overflowX: 'auto', overflowY: 'auto'
          }}>
            {Array.from({ length: Math.ceil(totalRounds / 10) }).map((_, colIndex) => {
              const startRound = colIndex * 10;
              const endRound = Math.min(startRound + 10, totalRounds);
              
              return (
                <div key={colIndex} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {Array.from({ length: endRound - startRound }, (_, i) => {
                    const r = startRound + i;
                    const r0 = players[0].roundResults[r];
                    const r1 = players[1].roundResults[r];
                    return (
                      <div key={r} style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: 'rgba(148,163,184,0.6)', fontWeight: 800 }}>R{r + 1}</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[r0, r1].map((res, ti) => (
                            <div key={ti} style={{
                              width: 24, height: 24, borderRadius: 6,
                              background: !res ? 'rgba(255,255,255,0.06)'
                                : res.correct ? TEAM_COLORS[ti]
                                : res.answered ? 'rgba(239,68,68,0.5)'
                                : 'rgba(255,255,255,0.08)',
                              border: `2px solid ${!res ? 'rgba(255,255,255,0.06)' : res.correct ? TEAM_COLORS[ti] : 'rgba(239,68,68,0.4)'}`,
                              transition: 'all 0.3s'
                            }} title={`Time ${ti === 0 ? 'A' : 'B'} R${r + 1}: ${!res ? 'Pendente' : res.correct ? 'Acertou' : 'Errou'}`} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal de Configurações */}
        {showSettingsModal && (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)'
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowSettingsModal(false); }}
          >
            <div
              style={{
                width: '100%', maxWidth: 768, height: '80vh', display: 'flex', flexDirection: 'column',
                background: '#0b1026', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden', animation: 'fadeInModal 0.25s ease'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(8,12,28,0.6)' }}>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: 'white', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 12, margin: 0 }}>
                  <Settings style={{ width: 20, height: 20, color: '#818cf8' }} />
                  Configurações Locais
                </h3>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', cursor: 'pointer', border: '1px solid transparent' }}
                >
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>
              {/* Body */}
              <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Sidebar */}
                <div style={{ width: '33.33%', borderRight: '1px solid rgba(255,255,255,0.05)', background: 'rgba(8,12,28,0.4)', padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button
                    onClick={() => { setSettingsActiveTab('appearance'); sfx.playClick(); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, textAlign: 'left', cursor: 'pointer',
                      background: settingsActiveTab === 'appearance' ? 'rgba(255,255,255,0.05)' : 'transparent',
                      color: settingsActiveTab === 'appearance' ? '#818cf8' : '#94a3b8',
                      borderLeft: settingsActiveTab === 'appearance' ? '2px solid #6366f1' : '2px solid transparent'
                    }}
                  >
                    <ImageIcon style={{ width: 16, height: 16 }} />
                    Aparência
                  </button>
                </div>
                {/* Content */}
                <div style={{ width: '66.66%', padding: 24, overflowY: 'auto' }}>
                  {settingsActiveTab === 'appearance' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeInModal 0.25s ease' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                          <h4 style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: '0 0 4px 0' }}>Fundo da Roleta</h4>
                          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Personalize o plano de fundo da área principal de jogo.</p>
                        </div>
                        
                        <label style={{
                          position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: 128,
                          border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 12, cursor: 'pointer', overflow: 'hidden', transition: 'all 0.2s',
                          background: 'rgba(255,255,255,0.02)'
                        }}>
                          {bgImage ? (
                            <>
                              <img src={bgImage} alt="Background" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
                              <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                <Upload style={{ width: 24, height: 24, color: '#818cf8' }} />
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc' }}>Alterar Imagem</span>
                              </div>
                            </>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                              <Upload style={{ width: 24, height: 24, color: '#94a3b8' }} />
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>Fazer upload de imagem</span>
                            </div>
                          )}
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                        </label>

                        {bgImage && (
                          <button
                            onClick={() => setBgImage(null)}
                            style={{ fontSize: 12, color: '#f87171', fontWeight: 700, alignSelf: 'flex-start', cursor: 'pointer', background: 'none', border: 'none' }}
                          >
                            Remover imagem de fundo
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── PÓDIO ────────────────────────────────────────────────────────────────

  if (localScreen === 'podium') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div className="glass-card p-16 flex flex-col gap-16">
          <div style={{ textAlign: 'center' }}>
            <Crown style={{ width: 112, height: 112, color: '#FBBF24', margin: '0 auto 24px', filter: 'drop-shadow(0 0 16px rgba(251,191,36,0.5))' }} />
            <h2 style={{ fontSize: 64, fontWeight: 900, color: 'white', margin: 0 }}>
              {isTie ? '🤝 Empate!' : `🏆 ${winner.name} venceu!`}
            </h2>
            <p style={{ fontSize: 28, color: 'rgba(148,163,184,0.7)', marginTop: 16 }}>
              {totalRounds} rodadas concluídas
            </p>
          </div>

          {/* Placar final */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            {[0, 1].map(i => {
              const isWinner = !isTie && players[i].name === winner.name;
              return (
                <motion.div key={i}
                  initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.15 }}
                  style={{
                    padding: '44px', borderRadius: 40,
                    background: isWinner ? TEAM_BG[i] : 'rgba(255,255,255,0.03)',
                    border: `2px solid ${isWinner ? TEAM_COLORS[i] + '80' : 'rgba(255,255,255,0.06)'}`,
                    textAlign: 'center', position: 'relative',
                    boxShadow: isWinner ? `0 8px 32px ${TEAM_COLORS[i]}30` : 'none'
                  }}>
                  {isWinner && (
                    <div style={{ position: 'absolute', top: -28, left: '50%', transform: 'translateX(-50%)',
                      background: TEAM_COLORS[i], borderRadius: 999, padding: '6px 28px',
                      fontSize: 22, fontWeight: 900, color: 'white', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      🏆 Vencedor
                    </div>
                  )}
                  <p style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: TEAM_LIGHT[i], textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {players[i].name}
                  </p>
                  <p style={{ margin: 0, fontSize: 104, fontWeight: 900, color: isWinner ? TEAM_COLORS[i] : 'rgba(255,255,255,0.5)', fontFamily: 'monospace', lineHeight: 1 }}>
                    {players[i].score}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 22, color: 'rgba(148,163,184,0.4)' }}>pontos</p>

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24 }}>
                    {players[i].roundResults.map((r, ri) => (
                      <div key={ri} style={{
                        width: 24, height: 24, borderRadius: 6,
                        background: r.correct ? TEAM_COLORS[i] : r.answered ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)',
                        border: `2px solid ${r.correct ? TEAM_COLORS[i] : r.answered ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.06)'}`
                      }} title={`R${ri + 1}: ${r.correct ? 'Acertou' : r.answered ? 'Errou' : '-'}`} />
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 24 }}>
            <button onClick={resetGame}
              style={{
                flex: 1, padding: '28px', borderRadius: 28,
                background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.35)',
                color: '#A78BFA', fontWeight: 800, fontSize: 30, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16
              }}>
              🔄 Jogar Novamente
            </button>
            <button onClick={onBack}
              style={{
                flex: 1, padding: '28px', borderRadius: 28,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(148,163,184,0.8)', fontWeight: 700, fontSize: 30, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16
              }}>
              <Home style={{ width: 36, height: 36 }} /> Início
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}
