// LocalGameMode.tsx — Modo Local (Offline) do Quizziando
// Layout idêntico ao modo online — sorteio, timer, ACERTOU/ERROU por rodada.

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Trophy, Home,
  Clock, Volume2, VolumeX, AlertCircle, ArrowLeft, Play, Crown,
  Settings, Upload, Image as ImageIcon, X,
  Hand, Users, Zap, RotateCcw, Target, BarChart3
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import {
  initDb, getLocalCategories, getLocalQuestions,
  importFromSupabaseData, mergeFromSupabaseData, hasLocalBackup, restoreLocalBackup,
  type LocalCategory, type LocalQuestion
} from './lib/localDb';
import logoCurso from './assets/logo_curso.png';
import { readSavedQuizzes, saveQuiz, deleteSavedQuiz, type SavedQuiz } from './lib/savedQuizzes';
import { createQuestionBank, downloadQuestionBank, parseQuestionBank } from './lib/questionBank';
import { localCategoryPool } from './lib/gameRules';
import { parseLocalGameSnapshot, type LocalPlayer, type RoundPhase, type SavedLocalGame } from './lib/localGameSnapshot';
import { getOfflineAssetsStatus, prepareOfflineAssets, type OfflineAssetsStatus } from './lib/offline';
import { KahootCountdown } from './components/KahootCountdown';


// ─── Cores das alternativas (igual ao modo online) ──────────────────────────

const ANSWER_COLORS = [
  { index: 0, label: 'A', bg: '#E53E3E', bgHover: '#C53030', glow: 'rgba(229,62,62,0.4)',  icon: '▲', name: 'Vermelho' },
  { index: 1, label: 'B', bg: '#3182CE', bgHover: '#2B6CB0', glow: 'rgba(49,130,206,0.4)', icon: '◆', name: 'Azul'     },
  { index: 2, label: 'C', bg: '#D69E2E', bgHover: '#B7791F', glow: 'rgba(214,158,46,0.4)', icon: '●', name: 'Amarelo'  },
  { index: 3, label: 'D', bg: '#38A169', bgHover: '#276749', glow: 'rgba(56,161,105,0.4)', name: 'Verde',   icon: '■'  },
];

// ─── Tipos ────────────────────────────────────────────────────────────────────

type LocalScreen = 'loading' | 'setup' | 'game' | 'podium';

const ACTIVE_GAME_STORAGE_KEY = 'quizziando_active_local_game_v1';

function matchesLocalQuestion(question: LocalQuestion, ids: string[] | null, difficulty: string, tag: string): boolean {
  return (!ids || ids.includes(question.id)) && (difficulty === 'all' || (question.difficulty || 'medium') === difficulty) &&
    (!tag.trim() || (question.tags || []).some(value => value.toLocaleLowerCase('pt-BR').includes(tag.trim().toLocaleLowerCase('pt-BR'))));
}

interface Props {
  onBack: () => void;
  onSavedQuizzesChange?: (quizzes: SavedQuiz[]) => void;
  supabaseCategories?: LocalCategory[];
  supabaseQuestions?: LocalQuestion[];
  initialSelectedCategoryIds?: string[];
  quizFormat?: 'classic' | 'roulette';
  initialPlayMode?: 'teams' | 'individual';
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
  public errorAudio: HTMLAudioElement | null = null;
  public correctAudio: HTMLAudioElement | null = null;

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

      this.errorAudio = new Audio('/error.mp3');
      this.errorAudio.preload = 'auto';
      this.errorAudio.volume = 0.5;

      this.correctAudio = new Audio('/correct.mp3');
      this.correctAudio.preload = 'auto';
      this.correctAudio.volume = 0.5;
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
  playCorrect() {
    if (!this.enabled || !this.correctAudio) {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.2), i * 80));
      return;
    }
    try {
      this.correctAudio.currentTime = 0;
      this.correctAudio.play().catch(() => {});
    } catch {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.2), i * 80));
    }
  }
  playWrong() {
    if (!this.enabled || !this.errorAudio) {
      this.tone(180, 0.4, 'sawtooth', 0.12);
      return;
    }
    try {
      this.errorAudio.currentTime = 0;
      this.errorAudio.play().catch(() => {});
    } catch {
      this.tone(180, 0.4, 'sawtooth', 0.12);
    }
  }
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
    if (this.errorAudio) {
      try { this.errorAudio.pause(); } catch {}
    }
    if (this.correctAudio) {
      try { this.correctAudio.pause(); } catch {}
    }
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

export default function LocalGameMode({
  onBack,
  onSavedQuizzesChange,
  supabaseCategories,
  supabaseQuestions,
  initialSelectedCategoryIds,
  quizFormat = 'classic',
  initialPlayMode = 'teams',
  soundEnabled,
  onToggleSound
}: Props) {
  sfx.enabled = soundEnabled;

  const [localScreen, setLocalScreen] = useState<LocalScreen>('loading');
  const [playMode, setPlayMode]       = useState<'teams' | 'individual'>(initialPlayMode || 'teams');

  const [dbError, setDbError]         = useState<string | null>(null);
  const [showSyncOptions, setShowSyncOptions] = useState(false);
  const [localBackupAvailable, setLocalBackupAvailable] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [playerNames, setPlayerNames] = useState(['Time A', 'Time B']);

  const [totalRounds, setTotalRounds] = useState(6);
  const [isCustomRounds, setIsCustomRounds] = useState(false);
  const [hasObstacles, setHasObstacles]     = useState(false);
  const [pointsPerCorrect, setPointsPerCorrect] = useState(100);
  const [pointsOnPass, setPointsOnPass] = useState(100);
  const [turnTimeLimit, setTurnTimeLimit] = useState(20);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(() => {
    const saved = localStorage.getItem('quizziando_countdown_seconds');
    const n = saved ? parseInt(saved, 10) : 7;
    return Number.isFinite(n) && n >= 2 && n <= 60 ? n : 7;
  });
  const handleUpdateCountdownSeconds = (sec: number) => {
    const clamped = Math.max(2, Math.min(60, sec));
    setCountdownSeconds(clamped);
    localStorage.setItem('quizziando_countdown_seconds', String(clamped));
  };
  const [quickMode, setQuickMode] = useState(false);
  const [tiePolicy, setTiePolicy] = useState<'shared' | 'extra'>('shared');
  const transitionMs = (normal: number) => quickMode ? Math.max(250, Math.round(normal * 0.25)) : normal;
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[] | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>(readSavedQuizzes);
  const [newQuizName, setNewQuizName] = useState('');
  const [allCategories, setAllCategories]   = useState<LocalCategory[]>([]);
  const [allQuestions, setAllQuestions]     = useState<LocalQuestion[]>([]);
  const [localDbReady, setLocalDbReady] = useState(false);
  const [offlineAssets, setOfflineAssets] = useState<OfflineAssetsStatus | null>(null);
  const [offlinePreparing, setOfflinePreparing] = useState(false);
  const [offlineNotice, setOfflineNotice] = useState('');

  const [players, setPlayers] = useState<LocalPlayer[]>([
    { name: 'Time A', score: 0, roundResults: [] },
    { name: 'Time B', score: 0, roundResults: [] },
  ]);

  const [currentRound, setCurrentRound]     = useState(1);
  const [roundStarterIndex, setRoundStarterIndex] = useState(0);
  const [firstFailed, setFirstFailed]       = useState(false);
  const [phase, setPhase]                   = useState<RoundPhase>('idle');
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<LocalCategory | null>(null);
  const [currentQuestion, setCurrentQuestion]   = useState<LocalQuestion | null>(null);
  const [usedQuestionIds, setUsedQuestionIds]   = useState<string[]>([]);
  // Ref espelho: fonte da verdade imune a closures desatualizadas (setTimeout),
  // garante que uma pergunta não seja sorteada duas vezes na mesma jogada
  const usedQuestionIdsRef = useRef<string[]>([]);
  const markQuestionUsed = (id: string) => {
    if (!usedQuestionIdsRef.current.includes(id)) {
      usedQuestionIdsRef.current = [...usedQuestionIdsRef.current, id];
    }
    setUsedQuestionIds(usedQuestionIdsRef.current);
  };
  const resetUsedQuestions = (ids: string[] = []) => {
    usedQuestionIdsRef.current = ids;
    setUsedQuestionIds(ids);
  };

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

  const [roundResult, setRoundResult] = useState<{
    scorer: number | null;
    correct: boolean;
    participantName?: string;
    correctText?: string;
  } | null>(null);
  const [savedGame, setSavedGame] = useState<SavedLocalGame | null>(null);
  const [lastDecision, setLastDecision] = useState<Pick<SavedLocalGame, 'players' | 'firstFailed' | 'phase' | 'timeLeft'> | null>(null);
  const roundCompletionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (roundCompletionTimerRef.current) clearTimeout(roundCompletionTimerRef.current);
    };
  }, []);

  // Estados de configurações (Modo Local)
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<'general' | 'appearance'>('general');
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

  const loadSavedGame = (): SavedLocalGame | null => {
    return parseLocalGameSnapshot(localStorage.getItem(ACTIVE_GAME_STORAGE_KEY));
  };

  const discardSavedGame = () => {
    localStorage.removeItem(ACTIVE_GAME_STORAGE_KEY);
    setSavedGame(null);
  };

  const resumeSavedGame = () => {
    if (!savedGame) return;
    setPlayers(savedGame.players);
    setTotalRounds(savedGame.totalRounds);
    setHasObstacles(savedGame.hasObstacles);
    setPointsPerCorrect(savedGame.pointsPerCorrect ?? 100);
    setPointsOnPass(savedGame.pointsOnPass ?? 100);
    setTurnTimeLimit(savedGame.turnTimeLimit ?? 20);
    setQuickMode(savedGame.quickMode ?? false);
    setTiePolicy(savedGame.tiePolicy ?? 'shared');
    setSelectedCatIds(savedGame.selectedCatIds);
    setSelectedQuestionIds(savedGame.selectedQuestionIds ?? null);
    setDifficultyFilter(savedGame.difficultyFilter ?? 'all');
    setTagFilter(savedGame.tagFilter ?? '');
    setCurrentRound(savedGame.currentRound);
    setRoundStarterIndex(savedGame.roundStarterIndex);
    setFirstFailed(savedGame.firstFailed);
    setPhase(savedGame.phase);
    setSelectedCategory(savedGame.selectedCategory);
    setCurrentQuestion(savedGame.currentQuestion);
    resetUsedQuestions(savedGame.usedQuestionIds);
    setTimeLeft(savedGame.timeLeft);
    setRouletteAngle(savedGame.rouletteAngle);
    // A retomada é deliberada: não reiniciamos o tempo automaticamente ao abrir.
    setTimerActive(false);
    setLocalScreen('game');
    setSavedGame(null);
    sfx.playClick();
  };

  // ─── Init banco ────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        await initDb();
        const cats = getLocalCategories();
        const qs   = getLocalQuestions();
        setLocalDbReady(true);
        setAllCategories(cats);
        setAllQuestions(qs);
        if (initialSelectedCategoryIds && initialSelectedCategoryIds.length > 0) {
          setSelectedCatIds(initialSelectedCategoryIds);
        } else {
          setSelectedCatIds(cats.map(c => c.id));
        }
        setLocalBackupAvailable(hasLocalBackup());
        setSavedGame(loadSavedGame());
      } catch (err: any) {
        setLocalDbReady(false);
        console.error('Erro no initDb:', err);
        setDbError(`Usando perguntas em memória (sql.js indisponível: ${err.message || String(err)}).`);
        if (supabaseCategories?.length) {
          setAllCategories(supabaseCategories);
          if (initialSelectedCategoryIds && initialSelectedCategoryIds.length > 0) {
            setSelectedCatIds(initialSelectedCategoryIds);
          } else {
            setSelectedCatIds(supabaseCategories.map(c => c.id));
          }
        }
        if (supabaseQuestions?.length) {
          setAllQuestions(supabaseQuestions);
        }
      }
      setLocalScreen('setup');
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (localScreen !== 'setup') return;
    let cancelled = false;
    const check = () => {
      void getOfflineAssetsStatus()
        .then(status => { if (!cancelled) setOfflineAssets(status); })
        .catch(error => { if (!cancelled) setOfflineAssets({ ready: false, cached: 0, total: 0,
          reason: error instanceof Error ? error.message : 'Não foi possível verificar o cache offline.' }); });
    };
    check();
    window.addEventListener('online', check);
    window.addEventListener('offline', check);
    return () => { cancelled = true; window.removeEventListener('online', check); window.removeEventListener('offline', check); };
  }, [localScreen]);

  // Salva cada estado jogável. O cronômetro fica pausado após restaurar para
  // evitar que uma questão termine enquanto o apresentador ainda se recompõe.
  useEffect(() => {
    if (localScreen !== 'game' || phase === 'finished') return;
    const snapshot: SavedLocalGame = {
      version: 1,
      savedAt: new Date().toISOString(),
      players,
      totalRounds,
      hasObstacles,
      selectedCatIds,
      selectedQuestionIds,
      difficultyFilter,
      tagFilter,
      currentRound,
      roundStarterIndex,
      firstFailed,
      phase,
      selectedCategory,
      currentQuestion,
      usedQuestionIds,
      timeLeft,
      rouletteAngle,
      pointsPerCorrect,
      pointsOnPass,
      turnTimeLimit,
      quickMode,
      tiePolicy,
    };
    localStorage.setItem(ACTIVE_GAME_STORAGE_KEY, JSON.stringify(snapshot));
  }, [localScreen, players, totalRounds, hasObstacles, selectedCatIds, selectedQuestionIds, difficultyFilter, tagFilter, currentRound, roundStarterIndex, firstFailed, phase, selectedCategory, currentQuestion, usedQuestionIds, timeLeft, rouletteAngle, pointsPerCorrect, pointsOnPass, turnTimeLimit, quickMode, tiePolicy]);

  const refreshLocalContent = () => {
    const cats = getLocalCategories();
    const qs = getLocalQuestions();
    setAllCategories(cats);
    setAllQuestions(qs);
    setSelectedCatIds(cats.map(category => category.id));
  };

  const handleImportLocalBank = async (file: File) => {
    if (file.size > 5_000_000) { setDbError('O arquivo deve ter até 5 MB.'); return; }
    try {
      const bank = parseQuestionBank(await file.text());
      mergeFromSupabaseData(bank.categories, bank.questions);
      refreshLocalContent();
      setLocalBackupAvailable(hasLocalBackup());
      setDbError(null);
      setSyncMessage(`${bank.questions.length} perguntas importadas.${hasLocalBackup() ? ' O acervo anterior pode ser restaurado pelo backup.' : ''}`);
    } catch (error) { setDbError(error instanceof Error ? error.message : 'Não foi possível importar o acervo.'); }
  };

  const handleSyncWithCloud = (mode: 'merge' | 'replace') => {
    if (!supabaseCategories?.length || !supabaseQuestions?.length) {
      alert('Não foi possível obter dados da nuvem no momento. Verifique sua conexão.');
      return;
    }
    sfx.playClick();
    try {
      if (mode === 'merge') {
        mergeFromSupabaseData(supabaseCategories, supabaseQuestions);
        setSyncMessage('Conteúdo da nuvem mesclado. Itens locais que não vieram da nuvem foram preservados.');
      } else {
        importFromSupabaseData(supabaseCategories, supabaseQuestions);
        setLocalBackupAvailable(true);
        setSyncMessage('Conteúdo local substituído pela nuvem. Um backup foi salvo e pode ser restaurado abaixo.');
      }
      refreshLocalContent();
      setShowSyncOptions(false);
    } catch (err: any) {
      alert(`Erro ao sincronizar com a nuvem: ${err.message || String(err)}`);
    }
  };

  const handlePrepareOffline = async () => {
    if (offlinePreparing) return;
    setOfflinePreparing(true);
    setOfflineNotice('');
    try {
      await initDb();
      setLocalDbReady(true);
      if (navigator.onLine && supabaseCategories?.length && supabaseQuestions?.length) {
        mergeFromSupabaseData(supabaseCategories, supabaseQuestions);
        refreshLocalContent();
        setLocalBackupAvailable(hasLocalBackup());
      }
      const categories = getLocalCategories();
      const questions = getLocalQuestions();
      setAllCategories(categories);
      setAllQuestions(questions);
      if (!selectedCatIds.length) setSelectedCatIds(categories.map(category => category.id));
      const assets = await prepareOfflineAssets();
      setOfflineAssets(assets);
      setOfflineNotice(assets.ready
        ? 'Arquivos do aplicativo verificados. Confira abaixo se as perguntas selecionadas cobrem todas as rodadas.'
        : assets.reason);
    } catch (error) {
      setOfflineNotice(error instanceof Error ? error.message : 'Não foi possível preparar o modo offline.');
    } finally {
      setOfflinePreparing(false);
    }
  };

  const handleRestoreBackup = () => {
    try {
      restoreLocalBackup();
      refreshLocalContent();
      setSyncMessage('Backup local restaurado com sucesso.');
      sfx.playCorrect();
    } catch (err: any) {
      alert(`Não foi possível restaurar o backup: ${err.message || String(err)}`);
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
        setTimeLeft(turnTimeLimit || currentQuestion?.time_limit || 20);
        setTimerActive(true);
      } else {
        finishRound(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  // ─── Game Logic ────────────────────────────────────────────────────────────

  const handleSaveQuiz = () => {
    const name = newQuizName.trim();
    const questionIds = allQuestions.filter(q => selectedCatIds.includes(q.category_id) && matchesLocalQuestion(q, selectedQuestionIds, difficultyFilter, tagFilter)).map(q => q.id);
    if (!name || !selectedCatIds.length || !questionIds.length) { setDbError('Informe um nome e selecione categorias com perguntas para salvar o quiz.'); return; }
    try {
      const next = saveQuiz({ id: crypto.randomUUID(), name, savedAt: new Date().toISOString(), categoryIds: selectedCatIds,
        questionIds, rounds: totalRounds, timeLimit: turnTimeLimit, onlineMode: 'team', scoringMode: 'fixed', fixedPoints: pointsPerCorrect, difficultyFilter, tagFilter,
        localRules: { hasObstacles, pointsPerCorrect, pointsOnPass, quickMode, tiePolicy } });
      setSavedQuizzes(next); onSavedQuizzesChange?.(next);
      setNewQuizName(''); setDbError(null);
    } catch { setDbError('Não foi possível salvar o quiz neste navegador.'); }
  };

  const handleLoadQuiz = (quiz: SavedQuiz) => {
    const categoryIds = quiz.categoryIds.filter(id => allCategories.some(c => c.id === id));
    const questionIds = quiz.questionIds.filter(id => allQuestions.some(q => q.id === id && categoryIds.includes(q.category_id)));
    if (!categoryIds.length || !questionIds.length) { setDbError('Este quiz não está no acervo local. Sincronize as perguntas antes de carregá-lo.'); return; }
    setSelectedCatIds(categoryIds); setSelectedQuestionIds(questionIds);
    setDifficultyFilter(quiz.difficultyFilter || 'all'); setTagFilter(quiz.tagFilter || '');
    const localRounds = Math.max(2, Math.min(100, Math.ceil(quiz.rounds / 2) * 2));
    setTotalRounds(localRounds); setIsCustomRounds(![2, 6, 10, 16].includes(localRounds));
    setTurnTimeLimit(quiz.timeLimit); setHasObstacles(quiz.localRules.hasObstacles);
    setPointsPerCorrect(quiz.localRules.pointsPerCorrect); setPointsOnPass(quiz.localRules.pointsOnPass);
    setQuickMode(quiz.localRules.quickMode); setTiePolicy(quiz.localRules.tiePolicy);
    setDbError(questionIds.length < quiz.questionIds.length ? 'Algumas perguntas salvas não estão mais disponíveis.' :
      localRounds !== quiz.rounds ? 'O modo presencial usa um número par de rodadas; a quantidade foi ajustada.' : null);
  };

  const startGame = () => {
    const cats = allCategories.filter(c => selectedCatIds.includes(c.id));
    const qs   = allQuestions.filter(q => selectedCatIds.includes(q.category_id) && matchesLocalQuestion(q, selectedQuestionIds, difficultyFilter, tagFilter));

    if (!cats.length) {
      setDbError('⚠️ Sem categorias disponíveis. Volte ao início e recarregue.');
      return;
    }
    if (qs.length < totalRounds) {
      setDbError(`⚠️ Precisa de ${totalRounds} perguntas, mas há ${qs.length}. Reduza as rodadas.`);
      return;
    }

    setDbError(null);

    if (playMode === 'individual') {
      setPlayers([{ name: 'Auditório', score: 0, roundResults: [] }]);
      setRoundStarterIndex(0);
    } else {
      const starter = Math.random() < 0.5 ? 0 : 1;
      setPlayers([
        { name: playerNames[0].trim() || 'Time A', score: 0, roundResults: [] },
        { name: playerNames[1].trim() || 'Time B', score: 0, roundResults: [] },
      ]);
      setRoundStarterIndex(starter);
    }

    setCurrentRound(1);
    setFirstFailed(false);
    resetUsedQuestions();
    setPhase('idle');
    setIsCountingDown(false);
    setRouletteAngle(0);
    discardSavedGame();
    setLocalScreen('game');
    sfx.playClick();
  };

  const handleStartClassicQuestion = useCallback(() => {
    if (phase !== 'idle') return;
    const matchingQuestions = allQuestions.filter(question =>
      selectedCatIds.includes(question.category_id) &&
      matchesLocalQuestion(question, selectedQuestionIds, difficultyFilter, tagFilter) &&
      !usedQuestionIdsRef.current.includes(question.id)
    );
    if (!matchingQuestions.length) {
      resetUsedQuestions();
    }
    const pool = matchingQuestions.length > 0 ? matchingQuestions : allQuestions.filter(q => selectedCatIds.includes(q.category_id));
    const chosenQuestion = pickRandom(pool);
    if (!chosenQuestion) {
      setDbError('Nenhuma pergunta encontrada para os quizzes selecionados.');
      return;
    }
    markQuestionUsed(chosenQuestion.id);
    const cat: LocalCategory = allCategories.find(c => c.id === chosenQuestion.category_id) || {
      id: chosenQuestion.category_id,
      name: 'Quiz Clássico',
      color: '#10b981',
      icon: 'help-circle'
    };
    setSelectedCategory(cat);
    setCurrentQuestion(chosenQuestion);
    setFirstFailed(false);
    setTimeLeft(turnTimeLimit || chosenQuestion.time_limit || 20);
    setPhase('question-reveal');
    setIsCountingDown(true);
    setTimerActive(false);
    sfx.playClick();
  }, [allQuestions, selectedCatIds, selectedQuestionIds, difficultyFilter, tagFilter, allCategories, turnTimeLimit, phase]);

  const handleSpin = useCallback(() => {
    if (isSpinning || phase !== 'idle') return;
    const used = usedQuestionIdsRef.current;
    const matchingQuestions = allQuestions.filter(question => matchesLocalQuestion(question, selectedQuestionIds, difficultyFilter, tagFilter));
    const pool = localCategoryPool(allCategories, matchingQuestions, selectedCatIds, used);
    if (pool.resetUsed) resetUsedQuestions();
    let wheelCats = pool.categories;
    if (!wheelCats.length) {
      setDbError('As categorias selecionadas não têm perguntas disponíveis.');
      return;
    }
    setDbError(null);
    if (hasObstacles) {
      wheelCats = [
        ...wheelCats,
        { id: 'obs-perde', name: 'Perde Tudo', color: '#111111', created_at: '', isObstacle: true, type: 'perde-tudo' } as any,
        { id: 'obs-passa', name: 'Passa a Vez', color: '#FFFFFF', created_at: '', isObstacle: true, type: 'passa-vez' } as any,
      ];
    }
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
                const p = [...prev];
                if (p[roundStarterIndex]) {
                  p[roundStarterIndex] = { ...p[roundStarterIndex], score: 0 };
                }
                return p;
              });
            }
            sfx.playWrong();
            setRoundStarterIndex(i => (i === 0 ? 1 : 0));
            setPhase('idle');
            setSelectedCategory(null);
            return;
          }

          const availableInCategory = allQuestions.filter(question =>
            question.category_id === chosen.id && matchesLocalQuestion(question, selectedQuestionIds, difficultyFilter, tagFilter) && !usedQuestionIdsRef.current.includes(question.id),
          );
          const chosenQuestion = pickRandom(availableInCategory);
          if (chosenQuestion) markQuestionUsed(chosenQuestion.id);

          if (!chosenQuestion) { setPhase('idle'); return; }

          setCurrentQuestion(chosenQuestion);
          setFirstFailed(false);
          setTimeLeft(turnTimeLimit || chosenQuestion.time_limit || 20);
          setPhase('question-reveal');
          setIsCountingDown(false);
          setTimerActive(false);
        }, transitionMs(3800));
      }, transitionMs(2000));
    }, transitionMs(8000));
  }, [isSpinning, phase, allCategories, allQuestions, selectedCatIds, selectedQuestionIds, difficultyFilter, tagFilter, usedQuestionIds, rouletteAngle, hasObstacles, roundStarterIndex, quickMode]);

  const currentResponderIndex = firstFailed
    ? (roundStarterIndex === 0 ? 1 : 0)
    : roundStarterIndex;

  const handleJudge = (correct: boolean) => {
    if (phase !== 'question-first' && phase !== 'question-second') return;
    setLastDecision({ players, firstFailed, phase, timeLeft });
    setTimerActive(false);
    if (correct) {
      sfx.playCorrect();
      finishRound(currentResponderIndex);
    } else {
      sfx.playWrong();
      if (phase === 'question-first') {
        setFirstFailed(true);
        setPhase('question-second');
        setTimeLeft(turnTimeLimit || currentQuestion?.time_limit || 20);
        setTimerActive(true);
      } else {
        finishRound(null);
      }
    }
  };

  const handleJudgeIndividual = (altIndex: number) => {
    if (phase !== 'question-first') return;

    const selectedAlt = currentQuestion?.alternatives[altIndex];
    if (!selectedAlt) return;

    const isCorrect = !!selectedAlt.isCorrect;
    const correctAlt = currentQuestion?.alternatives.find(a => a.isCorrect);

    setTimerActive(false);

    if (isCorrect) {
      sfx.playCorrect();
    } else {
      sfx.playWrong();
    }

    setPlayers(prev => {
      const next = [...prev];
      if (next.length > 0 && next[0]) {
        next[0] = {
          ...next[0],
          roundResults: [...next[0].roundResults, { answered: true, correct: isCorrect }]
        };
      }
      return next;
    });

    setRoundResult({
      scorer: isCorrect ? 0 : null,
      correct: isCorrect,
      correctText: correctAlt?.text || selectedAlt.text
    });
    setPhase('round-result');
  };

  const handleNoOneAnswered = () => {
    if (phase !== 'question-first') return;
    setTimerActive(false);
    sfx.playTimeout();
    setPlayers(prev => {
      const next = [...prev];
      if (next.length > 0 && next[0]) {
        next[0] = {
          ...next[0],
          roundResults: [...next[0].roundResults, { answered: true, correct: false }]
        };
      }
      return next;
    });
    setRoundResult({
      scorer: null,
      correct: false,
      correctText: currentQuestion?.alternatives.find(a => a.isCorrect)?.text || ''
    });
    setPhase('round-result');
  };

  const advanceRound = () => {
    if (roundCompletionTimerRef.current) {
      clearTimeout(roundCompletionTimerRef.current);
      roundCompletionTimerRef.current = null;
    }
    setRoundResult(null);
    setFirstFailed(false);

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
      setCurrentQuestion(null);
      setSelectedCategory(null);
      setPhase('idle');
    }
  };

  const finishRound = (scorerIndex: number | null) => {
    setTimerActive(false);
    setPhase('round-result');
    const awardedPoints = firstFailed ? pointsOnPass : pointsPerCorrect;
    const projectedTie = scorerIndex === null
      ? (players[0]?.score === players[1]?.score)
      : ((players[0]?.score || 0) + (scorerIndex === 0 ? awardedPoints : 0) === (players[1]?.score || 0) + (scorerIndex === 1 ? awardedPoints : 0));

    setPlayers(prev => {
      const updated = [...prev];
      if (updated[0] && updated[1]) {
        updated[0] = { ...updated[0], roundResults: [...updated[0].roundResults] };
        updated[1] = { ...updated[1], roundResults: [...updated[1].roundResults] };
        if (scorerIndex !== null) {
          updated[scorerIndex].score += firstFailed ? pointsOnPass : pointsPerCorrect;
          updated[scorerIndex].roundResults.push({ answered: true, correct: true });
          updated[scorerIndex === 0 ? 1 : 0].roundResults.push({ answered: false, correct: null });
        } else {
          updated[roundStarterIndex].roundResults.push({ answered: true, correct: false });
          const other = roundStarterIndex === 0 ? 1 : 0;
          updated[other].roundResults.push({ answered: firstFailed, correct: firstFailed ? false : null });
        }
      }
      return updated;
    });

    setRoundResult({ scorer: scorerIndex, correct: scorerIndex !== null });

    roundCompletionTimerRef.current = setTimeout(() => {
      roundCompletionTimerRef.current = null;
      setRoundResult(null);
      if (currentRound >= totalRounds) {
        if (projectedTie && tiePolicy === 'extra' && playMode === 'teams') {
          setTotalRounds(rounds => rounds + 1);
          setCurrentRound(round => round + 1);
          setRoundStarterIndex(index => (index === 0 ? 1 : 0));
          setFirstFailed(false);
          setCurrentQuestion(null);
          setSelectedCategory(null);
          setPhase('idle');
          return;
        }
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
    }, transitionMs(5500));
  };

  const toggleTimer = () => {
    if (phase !== 'question-first' && phase !== 'question-second') return;
    setTimerActive(active => !active);
    sfx.playClick();
  };

  const undoLastDecision = () => {
    if (!lastDecision || phase !== 'round-result') return;
    if (roundCompletionTimerRef.current) clearTimeout(roundCompletionTimerRef.current);
    roundCompletionTimerRef.current = null;
    setPlayers(lastDecision.players);
    setFirstFailed(lastDecision.firstFailed);
    setPhase(lastDecision.phase);
    setTimeLeft(lastDecision.timeLeft);
    setRoundResult(null);
    setTimerActive(false);
    setLastDecision(null);
    sfx.playClick();
  };

  const resetGame = () => {
    if (roundCompletionTimerRef.current) clearTimeout(roundCompletionTimerRef.current);
    roundCompletionTimerRef.current = null;
    sfx.stopAll();
    setPhase('idle');
    setCurrentRound(1);
    resetUsedQuestions();
    setLocalScreen('setup');
    setRoundResult(null);
    setTimerActive(false);
    setFirstFailed(false);
    setLastDecision(null);
    discardSavedGame();
    sfx.playClick();
  };

  // ─── Cálculos ─────────────────────────────────────────────────────────────

  const sorted    = [...players].sort((a, b) => b.score - a.score);
  const winner    = sorted[0] || { name: 'Vencedor', score: 0, roundResults: [] };
  const loser     = sorted[1] || sorted[0] || { name: 'Segundo', score: 0, roundResults: [] };
  const isTie     = sorted.length > 1 && winner.score === loser.score;
  const wheelCatsBase = allCategories.filter(c => selectedCatIds.includes(c.id) && allQuestions.some(q => q.category_id === c.id && matchesLocalQuestion(q, selectedQuestionIds, difficultyFilter, tagFilter)));
  const wheelCats = (hasObstacles && playMode === 'teams')
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

  const timerMax  = turnTimeLimit || currentQuestion?.time_limit || 20;
  const timerPct  = timeLeft / timerMax * 100;
  const timerCol  = timerPct > 50 ? '#10B981' : timerPct > 25 ? '#F59E0B' : '#EF4444';
  const selectedOfflineQuestions = allQuestions.filter(question =>
    selectedCatIds.includes(question.category_id) &&
    matchesLocalQuestion(question, selectedQuestionIds, difficultyFilter, tagFilter));
  const offlineBankValid = localDbReady && allCategories.length > 0 &&
    allQuestions.every(question => allCategories.some(category => category.id === question.category_id) &&
      question.alternatives.length === 4 && question.alternatives.filter(alternative => alternative.isCorrect).length === 1);
  const offlineReady = Boolean(offlineAssets?.ready && offlineBankValid && selectedOfflineQuestions.length >= totalRounds);

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
        style={{ maxWidth: 1240, margin: '0 auto', width: '100%', padding: '0 24px' }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '28px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 40px -10px rgba(15,23,42,0.07)',
          padding: '40px 44px',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px'
        }}>

          {/* Cabeçalho */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button onClick={onBack}
                style={{ padding: '10px 12px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; }}
                title="Voltar"
              >
                <ArrowLeft style={{ width: 20, height: 20 }} />
              </button>
              <div>
                <h2 style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', margin: 0, fontFamily: "'Outfit', sans-serif" }}>🖥️ Arena Modo Local</h2>
                <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0', fontWeight: 500 }}>Dois times · Resposta oral · Sem necessidade de internet</p>
              </div>
            </div>
            
            <button 
              onClick={() => { setShowSyncOptions(open => !open); setSyncMessage(null); }}
              title="Escolher como sincronizar categorias e perguntas da nuvem"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 12,
                background: '#eff6ff', border: '1px solid #bfdbfe',
                color: '#2563eb', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; }}
            >
              <Upload style={{ width: 18, height: 18, transform: 'rotate(180deg)' }} />
              Sincronizar
            </button>
          </div>

          {showSyncOptions && (
            <div style={{ padding: 18, borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: '1 1 260px' }}>
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: 4, fontSize: 15 }}>Como deseja sincronizar?</strong>
                <span style={{ color: '#64748b', fontSize: 13 }}>Mesclar preserva itens apenas locais. Substituir troca todo o acervo e cria um backup restaurável.</span>
              </div>
              <button onClick={() => handleSyncWithCloud('merge')} style={{ padding: '9px 14px', borderRadius: 10, cursor: 'pointer', color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', fontWeight: 700, fontSize: 13 }}>Mesclar nuvem</button>
              <button onClick={() => handleSyncWithCloud('replace')} style={{ padding: '9px 14px', borderRadius: 10, cursor: 'pointer', color: '#b45309', background: '#fef3c7', border: '1px solid #fde68a', fontWeight: 700, fontSize: 13 }}>Substituir e criar backup</button>
            </div>
          )}

          <section aria-label="Preparação offline" style={{ padding: 18, borderRadius: 16,
            background: offlineReady ? '#f0fdf4' : '#fffbeb',
            border: `1.5px solid ${offlineReady ? '#86efac' : '#fde68a'}`,
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <div style={{ flex: '1 1 280px' }}>
              <strong style={{ color: offlineReady ? '#166534' : '#92400e', display: 'block', marginBottom: 4, fontSize: 15 }}>Jogar sem internet</strong>
              <p role="status" style={{ margin: 0, color: offlineReady ? '#15803d' : '#b45309', fontSize: 13, fontWeight: 500 }}>
                {offlinePreparing ? 'Baixando e conferindo o aplicativo...' : offlineReady
                  ? `Pronto para jogar offline: ${selectedOfflineQuestions.length} perguntas para ${totalRounds} rodadas; ${offlineAssets?.cached} arquivos conferidos.`
                  : !offlineBankValid ? 'Acervo local ausente ou inválido. Sincronize ou importe perguntas.'
                  : selectedOfflineQuestions.length < totalRounds
                    ? `${selectedOfflineQuestions.length} perguntas disponíveis para ${totalRounds} rodadas. Ajuste a seleção ou sincronize o acervo.`
                    : offlineAssets?.reason || 'Os arquivos do aplicativo ainda não foram preparados.'}
              </p>
              {offlineNotice && <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 12 }}>{offlineNotice}</p>}
            </div>
            <button type="button" onClick={() => void handlePrepareOffline()} disabled={offlinePreparing}
              style={{ padding: '10px 18px', borderRadius: 10, cursor: offlinePreparing ? 'wait' : 'pointer',
                color: 'white', background: 'linear-gradient(135deg, #7C3AED, #2563EB)', border: 'none', fontWeight: 800, fontSize: 13, boxShadow: '0 4px 12px rgba(124,58,237,0.25)' }}>
              {offlinePreparing ? 'Preparando...' : 'Preparar para jogar sem internet'}
            </button>
          </section>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => downloadQuestionBank(createQuestionBank(allCategories, allQuestions))} style={{ padding: '9px 16px', borderRadius: 10, color: '#475569', background: '#f8fafc', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Exportar acervo JSON</button>
            <label style={{ padding: '9px 16px', borderRadius: 10, color: '#475569', background: '#f8fafc', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Importar acervo JSON
              <input type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={event => { const file = event.target.files?.[0]; if (file) void handleImportLocalBank(file); event.target.value = ''; }} />
            </label>
          </div>

          {(localBackupAvailable || syncMessage) && (
            <div role="status" style={{ padding: '12px 16px', borderRadius: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46' }}>
              <span style={{ flex: '1 1 280px', fontSize: 13, fontWeight: 600 }}>{syncMessage || 'Há um backup disponível da última substituição.'}</span>
              {localBackupAvailable && <button onClick={handleRestoreBackup} style={{ padding: '7px 14px', borderRadius: 8, cursor: 'pointer', color: 'white', background: '#10b981', border: 'none', fontWeight: 700, fontSize: 13 }}>Restaurar backup</button>}
            </div>
          )}

          {dbError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <AlertCircle style={{ width: 20, height: 20, color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 14, color: '#dc2626', lineHeight: 1.5, fontWeight: 600 }}>{dbError}</p>
            </div>
          )}

          {savedGame && (
            <div style={{ padding: 18, borderRadius: 16, background: '#f5f3ff', border: '1.5px solid #ddd6fe', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
              <div style={{ flex: '1 1 300px' }}>
                <strong style={{ color: '#4338ca', display: 'block', fontSize: 15 }}>Partida em andamento encontrada</strong>
                <span style={{ color: '#6b21a8', fontSize: 13 }}>Rodada {savedGame.currentRound} de {savedGame.totalRounds} · salva em {new Date(savedGame.savedAt).toLocaleString('pt-BR')}.</span>
              </div>
              <button onClick={resumeSavedGame} style={{ padding: '10px 18px', fontWeight: 800, color: 'white', background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14 }}>Retomar partida</button>
              <button onClick={discardSavedGame} style={{ padding: '10px 14px', borderRadius: 10, cursor: 'pointer', color: '#64748b', background: '#ffffff', border: '1px solid #cbd5e1', fontSize: 13 }}>Descartar</button>
            </div>
          )}

          <section style={{ padding: 18, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <strong style={{ color: '#1e293b', fontSize: 14 }}>Quizzes salvos neste navegador</strong>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input value={newQuizName} onChange={event => setNewQuizName(event.target.value)} maxLength={80} placeholder="Nome do quiz" aria-label="Nome do quiz para salvar" style={{ flex: '1 1 220px', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#0f172a', outline: 'none' }} />
              <button type="button" onClick={handleSaveQuiz} style={{ padding: '10px 18px', borderRadius: 10, background: '#7C3AED', color: 'white', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Salvar seleção e regras</button>
            </div>
            {savedQuizzes.map(quiz => <div key={quiz.id} style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#334155', fontSize: 14 }}>
              <span style={{ flex: 1, fontWeight: 600 }}>{quiz.name}</span>
              <button type="button" onClick={() => handleLoadQuiz(quiz)} style={{ color: '#7C3AED', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>Carregar</button>
              <button type="button" onClick={() => { const next = deleteSavedQuiz(quiz.id); setSavedQuizzes(next); onSavedQuizzesChange?.(next); }} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }} aria-label={`Excluir ${quiz.name}`}>Excluir</button>
            </div>)}
            {selectedQuestionIds && <button type="button" onClick={() => setSelectedQuestionIds(null)} style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start', fontSize: 13, fontWeight: 700 }}>Incluir todas as perguntas atuais</button>}
          </section>

          <section style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'end' }}>
            <label style={{ color: '#475569', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', flex: '1 1 180px' }}>Dificuldade
              <select value={difficultyFilter} onChange={event => setDifficultyFilter(event.target.value as typeof difficultyFilter)} style={{ display: 'block', width: '100%', marginTop: 6, background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#0f172a', outline: 'none' }}>
                <option value="all">Todas</option><option value="easy">Fácil</option><option value="medium">Média</option><option value="hard">Difícil</option>
              </select>
            </label>
            <label style={{ color: '#475569', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', flex: '1 1 220px' }}>Etiqueta
              <input value={tagFilter} onChange={event => setTagFilter(event.target.value)} placeholder="Assunto ou público" style={{ display: 'block', width: '100%', marginTop: 6, background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#0f172a', outline: 'none' }} />
            </label>
          </section>

          {/* Seção Quizzes Selecionados para a Roleta (Largura total, acima das equipes) */}
          {allCategories.length > 0 && (() => {
            const selectedCats = allCategories.filter(cat => selectedCatIds.includes(cat.id));
            const count = selectedCats.length;
            return (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '18px',
                padding: '18px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      🎯 Quizzes na Roleta
                    </span>
                    <span style={{ fontSize: 12, background: '#ede9fe', color: '#6d28d9', padding: '2px 10px', borderRadius: 999, fontWeight: 800 }}>
                      {count} selecionado{count === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', fontWeight: 600 }}>
                    <span>📝 Perguntas disponíveis:</span>
                    <strong style={{ color: '#0f172a', fontSize: 15, fontWeight: 900 }}>
                      {allQuestions.filter(q => selectedCatIds.includes(q.category_id) && matchesLocalQuestion(q, selectedQuestionIds, difficultyFilter, tagFilter)).length}
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {selectedCats.map(cat => (
                    <div
                      key={cat.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '7px 14px', borderRadius: 999, fontWeight: 700, fontSize: 13,
                        background: `${cat.color}15`,
                        border: `1.5px solid ${cat.color}55`,
                        color: cat.color,
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, display: 'inline-block' }} />
                      {cat.name}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Seletor de Modo: Equipes vs Individual */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '20px',
            padding: '20px',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  🎮 Formato da Partida Offline
                </span>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                  Escolha como os alunos e participantes competirão na sala.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 12, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => { setPlayMode('teams'); sfx.playClick(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '16px 20px',
                  borderRadius: '16px',
                  border: playMode === 'teams' ? '2.5px solid #059669' : '1.5px solid #e2e8f0',
                  background: playMode === 'teams' ? '#ecfdf5' : '#ffffff',
                  boxShadow: playMode === 'teams' ? '0 4px 14px rgba(5, 150, 105, 0.15)' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: playMode === 'teams' ? 'linear-gradient(135deg, #059669, #047857)' : '#f1f5f9',
                  color: playMode === 'teams' ? 'white' : '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Users style={{ width: 24, height: 24 }} />
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: 15, color: playMode === 'teams' ? '#065f46' : '#1e293b' }}>
                    Disputa por Equipes
                  </strong>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    2 Times disputando com turnos e repasse
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setPlayMode('individual'); sfx.playClick(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '16px 20px',
                  borderRadius: '16px',
                  border: playMode === 'individual' ? '2.5px solid #0284c7' : '1.5px solid #e2e8f0',
                  background: playMode === 'individual' ? '#f0f9ff' : '#ffffff',
                  boxShadow: playMode === 'individual' ? '0 4px 14px rgba(2, 132, 199, 0.15)' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: playMode === 'individual' ? 'linear-gradient(135deg, #0284c7, #0369a1)' : '#f1f5f9',
                  color: playMode === 'individual' ? 'white' : '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Hand style={{ width: 24, height: 24 }} />
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: 15, color: playMode === 'individual' ? '#0369a1' : '#1e293b' }}>
                    Individual (Medição de Conhecimento)
                  </strong>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Sem pontos ou ranking. Resposta na hora e aprendizado
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Grid de duas colunas responsivo com minWidth: 0 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
            gap: 36,
            alignItems: 'start',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            
            {/* Coluna 1: Participantes / Equipes & Pontuação */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
              
              {playMode === 'individual' ? (
                /* Modo Auditório / Telão */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', boxSizing: 'border-box' }}>
                  <div style={{
                    padding: '20px', borderRadius: 16,
                    background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08), rgba(56, 189, 248, 0.04))',
                    border: '1.5px solid rgba(2, 132, 199, 0.25)',
                    display: 'flex', flexDirection: 'column', gap: 8
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <Hand style={{ width: 20, height: 20 }} />
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 900, color: '#0c4a6e' }}>
                        Modo Auditório / Telão
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                      Perfeito para salas de aula e auditórios. Qualquer participante pode responder levantando a mão ou falando a opção. O apresentador clica na alternativa dita, o gabarito é revelado na hora e a próxima pergunta aparece em tela cheia!
                    </p>
                  </div>
                </div>
              ) : (
                /* Nomes dos times */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', boxSizing: 'border-box' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                    Nomes das Equipes
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%', boxSizing: 'border-box' }}>
                    {[0, 1].map(i => (
                      <div key={i} style={{
                        display: 'flex', flexDirection: 'column', gap: 8,
                        background: i === 0 ? '#fef2f2' : '#eff6ff',
                        border: `1.5px solid ${i === 0 ? '#fecaca' : '#bfdbfe'}`,
                        borderRadius: 16, padding: '16px', boxSizing: 'border-box'
                      }}>
                        <label style={{ fontSize: 13, fontWeight: 800, color: i === 0 ? '#dc2626' : '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {i === 0 ? '🔴 Time A' : '🔵 Time B'}
                        </label>
                        <input
                          type="text" maxLength={20}
                          style={{
                            textAlign: 'center', fontWeight: 800, fontSize: 18, padding: '12px',
                            background: '#ffffff', border: `1.5px solid ${i === 0 ? '#f87171' : '#60a5fa'}`,
                            borderRadius: 12, color: '#0f172a', outline: 'none', width: '100%', boxSizing: 'border-box'
                          }}
                          value={playerNames[i]}
                          onChange={e => setPlayerNames(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
                          placeholder={i === 0 ? 'Time A' : 'Time B'}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modo de Jogo & Pontuação */}
              {playMode === 'teams' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, width: '100%', boxSizing: 'border-box' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, color: '#475569', fontWeight: 700, fontSize: 13 }}>
                    Pontos por acerto
                    <input type="number" min={10} max={1000} step={10} value={pointsPerCorrect} onChange={event => setPointsPerCorrect(Math.max(10, Number(event.target.value) || 10))} style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: 10, padding: '9px 12px', fontSize: 14, color: '#0f172a', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, color: '#475569', fontWeight: 700, fontSize: 13 }}>
                    Pontos no repasse
                    <input type="number" min={0} max={1000} step={10} value={pointsOnPass} onChange={event => setPointsOnPass(Math.max(0, Number(event.target.value) || 0))} style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: 10, padding: '9px 12px', fontSize: 14, color: '#0f172a', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, color: '#475569', fontWeight: 700, fontSize: 13 }}>
                    Tempo por pergunta (s)
                    <input type="number" min={5} max={180} value={turnTimeLimit} onChange={event => setTurnTimeLimit(Math.max(5, Math.min(180, Number(event.target.value) || 5)))} style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: 10, padding: '9px 12px', fontSize: 14, color: '#0f172a', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, color: '#475569', fontWeight: 700, fontSize: 13 }}>
                    Critério de empate
                    <select value={tiePolicy} onChange={event => setTiePolicy(event.target.value as 'shared' | 'extra')} style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: 10, padding: '9px 12px', fontSize: 14, color: '#0f172a', outline: 'none', width: '100%', boxSizing: 'border-box' }}>
                      <option value="shared">Compartilhado</option>
                      <option value="extra">Pergunta extra</option>
                    </select>
                  </label>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', boxSizing: 'border-box' }}>
                  <div style={{
                    padding: '16px', borderRadius: 14,
                    background: '#f0f9ff', border: '1.5px solid #bae6fd',
                    display: 'flex', alignItems: 'center', gap: 12
                  }}>
                    <div style={{ fontSize: 24 }}>💡</div>
                    <div style={{ fontSize: 13, color: '#0369a1', lineHeight: 1.4 }}>
                      <strong>Modo Sem Pontuação ou Ranking:</strong> O foco é medir o conhecimento individual. O aluno responde, o condutor marca a alternativa e o gabarito com explicação é revelado imediatamente!
                    </div>
                  </div>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, color: '#475569', fontWeight: 700, fontSize: 13 }}>
                    Tempo por pergunta (s)
                    <input type="number" min={5} max={180} value={turnTimeLimit} onChange={event => setTurnTimeLimit(Math.max(5, Math.min(180, Number(event.target.value) || 5)))} style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: 10, padding: '9px 12px', fontSize: 14, color: '#0f172a', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                  </label>
                </div>
              )}

              <button onClick={() => setQuickMode(value => !value)} style={{ padding: '12px 16px', borderRadius: 10, cursor: 'pointer', color: quickMode ? '#065f46' : '#475569', background: quickMode ? '#ecfdf5' : '#f8fafc', border: `1.5px solid ${quickMode ? '#86efac' : '#e2e8f0'}`, fontWeight: 800, fontSize: 13, width: '100%', boxSizing: 'border-box' }}>
                {quickMode ? '✓ Modo rápido ativado' : 'Ativar modo rápido'}
              </button>
            </div>

            {/* Coluna 2: Rodadas & Regras */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
              {/* Rodadas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', boxSizing: 'border-box' }}>
                <label style={{ fontSize: 14, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Número de Rodadas (Perguntas)
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: '100%', boxSizing: 'border-box' }}>
                  {(playMode === 'individual' ? [3, 5, 10, 15] : [2, 6, 10, 16]).map(n => (
                    <button key={n}
                      onClick={() => { setTotalRounds(n); setIsCustomRounds(false); sfx.playClick(); }}
                      style={{
                        flex: 1, padding: '12px 6px', borderRadius: 12, fontWeight: 800, fontSize: 18,
                        background: !isCustomRounds && totalRounds === n ? 'linear-gradient(135deg, #7C3AED, #6D28D9)' : '#f8fafc',
                        border: !isCustomRounds && totalRounds === n ? 'none' : '1.5px solid #e2e8f0',
                        color: !isCustomRounds && totalRounds === n ? 'white' : '#334155',
                        cursor: 'pointer', boxShadow: !isCustomRounds && totalRounds === n ? '0 4px 12px rgba(124,58,237,0.3)' : 'none',
                        transition: 'all 0.2s'
                      }}>
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => { setIsCustomRounds(true); sfx.playClick(); }}
                    style={{
                      flex: '2', padding: '12px 6px', borderRadius: 12, fontWeight: 800, fontSize: 15,
                      background: isCustomRounds ? 'linear-gradient(135deg, #7C3AED, #6D28D9)' : '#f8fafc',
                      border: isCustomRounds ? 'none' : '1.5px solid #e2e8f0',
                      color: isCustomRounds ? 'white' : '#334155',
                      cursor: 'pointer', boxShadow: isCustomRounds ? '0 4px 12px rgba(124,58,237,0.3)' : 'none',
                      transition: 'all 0.2s'
                    }}>
                    Personalizado
                  </button>
                </div>
                {isCustomRounds && (
                  <div style={{ marginTop: 6, width: '100%', boxSizing: 'border-box' }}>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      step={1}
                      value={totalRounds}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setTotalRounds(playMode === 'teams' ? (val % 2 !== 0 ? val + 1 : val) : val);
                      }}
                      style={{ width: '100%', textAlign: 'center', fontWeight: 800, fontSize: 18, padding: '12px', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: 12, color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                      placeholder="Digite o número de rodadas..."
                    />
                    {playMode === 'teams' && (
                      <p style={{ fontSize: 13, color: '#64748b', marginTop: 8, textAlign: 'center', lineHeight: 1.4 }}>
                        No modo em equipes, o número deve ser par para igualdade de turnos.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Modo de Jogo / Obstáculos na Roleta */}
              {quizFormat === 'roulette' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: 14, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Obstáculos na Roleta
                  </label>
                  <div style={{ display: 'flex', gap: 12, width: '100%', boxSizing: 'border-box' }}>
                    <button
                      onClick={() => { setHasObstacles(false); sfx.playClick(); }}
                      style={{
                        flex: 1, padding: '12px 6px', borderRadius: 12, fontWeight: 800, fontSize: 15,
                        background: !hasObstacles ? 'linear-gradient(135deg, #7C3AED, #6D28D9)' : '#f8fafc',
                        border: !hasObstacles ? 'none' : '1.5px solid #e2e8f0',
                        color: !hasObstacles ? 'white' : '#334155',
                        cursor: 'pointer', boxShadow: !hasObstacles ? '0 4px 12px rgba(124,58,237,0.3)' : 'none',
                        transition: 'all 0.2s'
                      }}>
                      Sem obstáculos
                    </button>
                    <button
                      onClick={() => { setHasObstacles(true); sfx.playClick(); }}
                      style={{
                        flex: 1, padding: '12px 6px', borderRadius: 12, fontWeight: 800, fontSize: 15,
                        background: hasObstacles ? 'linear-gradient(135deg, #7C3AED, #6D28D9)' : '#f8fafc',
                        border: hasObstacles ? 'none' : '1.5px solid #e2e8f0',
                        color: hasObstacles ? 'white' : '#334155',
                        cursor: 'pointer', boxShadow: hasObstacles ? '0 4px 12px rgba(124,58,237,0.3)' : 'none',
                        transition: 'all 0.2s'
                      }}>
                      Com obstáculos
                    </button>
                  </div>
                </div>
              )}

              {/* Regras */}
              <div style={{ padding: '20px 24px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 20, width: '100%', boxSizing: 'border-box' }}>
                <p style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  ℹ️ Regras: {playMode === 'individual' ? 'Modo Individual (Mão Levantada)' : 'Disputa por Equipes'}
                </p>
                {playMode === 'individual' ? (
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: '#475569', lineHeight: 1.8 }}>
                    <li>A pergunta é projetada no telão ({quizFormat === 'classic' ? 'direto nas perguntas' : 'com sorteio na roleta'})</li>
                    <li>Quem souber a resposta <strong>levanta a mão na sala</strong></li>
                    <li>O condutor seleciona a pessoa no painel e <strong>clica na alternativa que ela respondeu</strong></li>
                    <li>Se <strong>acertar</strong>, ganha {pointsPerCorrect} pontos no ranking da sala</li>
                    <li>Se <strong>errar</strong>, outro participante pode levantar a mão para tentar responder</li>
                    <li>No final, há o <strong>Pódio Geral</strong> com os vencedores e ranking de todos</li>
                  </ul>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: '#475569', lineHeight: 1.8 }}>
                    <li>Um <strong>sorteio</strong> decide qual time começa a rodada 1</li>
                    <li>O time da vez responde <strong>em voz alta</strong> dentro do tempo</li>
                    <li>Se <strong>errar ou o tempo acabar</strong>, o outro time tem a chance de repasse</li>
                    <li>Acerto = <strong>{pointsPerCorrect} pontos</strong>. Repasse = <strong>{pointsOnPass} pontos</strong></li>
                    <li>A cada rodada, <strong>alterna</strong> quem começa respondendo</li>
                  </ul>
                )}
              </div>
            </div>

          </div>

          {/* Botão de Jogar (Rodapé) */}
          <div style={{ display: 'flex', justifyContent: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 28, marginTop: 10 }}>
            <button onClick={startGame}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                fontSize: 20, fontWeight: 900, padding: '18px 48px', width: '100%', maxWidth: 460,
                borderRadius: 16, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white', border: 'none', cursor: 'pointer',
                boxShadow: '0 8px 24px -4px rgba(16,185,129,0.45)',
                textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.2s'
              }}
              onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.06)')}
              onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
            >
              <Play style={{ width: 24, height: 24, fill: 'white' }} /> Iniciar Jogo
            </button>
          </div>
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
      <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: playMode === 'individual' ? 'column' : 'row', background: '#0f0e17' }}>

        {/* ── HEADER SUPERIOR (Apenas no Modo Individual / Auditório) ── */}
        {playMode === 'individual' && (
          <header style={{
            width: '100%',
            padding: '14px 28px',
            background: 'rgba(15, 14, 23, 0.9)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 40,
            flexShrink: 0
          }}>
            {/* Esquerda: Botões de navegação e áudio + badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={onBack} title="Início"
                  style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: 'rgba(241,245,249,0.85)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700 }}>
                  <Home style={{ width: 15, height: 15 }} />
                  <span>Início</span>
                </button>
                <button onClick={onToggleSound} title="Som"
                  style={{ padding: 8, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: 'rgba(241,245,249,0.85)', display: 'flex' }}>
                  {soundEnabled ? <Volume2 style={{ width: 16, height: 16 }} /> : <VolumeX style={{ width: 16, height: 16 }} />}
                </button>
                <button onClick={() => { setShowSettingsModal(true); sfx.playClick(); }} title="Configurações"
                  style={{ padding: 8, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: showSettingsModal ? '#7C3AED' : 'rgba(241,245,249,0.85)', display: 'flex' }}>
                  <Settings style={{ width: 16, height: 16 }} />
                </button>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', borderRadius: 999,
                background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)',
                color: '#38bdf8', fontSize: 13, fontWeight: 800, letterSpacing: '0.04em'
              }}>
                <Hand style={{ width: 15, height: 15 }} />
                <span>Modo Auditório · Telão</span>
              </div>
            </div>

            {/* Centro: Indicador de Rodada + Barra de Progresso */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(148,163,184,0.7)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  Pergunta
                </span>
                <span style={{ fontSize: 28, fontWeight: 900, color: '#FBBF24', lineHeight: 1, fontFamily: 'monospace' }}>
                  {currentRound}
                </span>
                <span style={{ fontSize: 16, fontWeight: 800, color: 'rgba(251,191,36,0.6)' }}>
                  / {totalRounds}
                </span>
              </div>
              <div style={{ width: 220, height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg,#7C3AED,#EC4899)', borderRadius: 999, width: `${progressPct}%`, transition: 'width 0.5s' }} />
              </div>
            </div>

            {/* Direita: Botão "Ninguém soube responder" na fase da questão */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {(phase === 'question-first' || phase === 'question-second') && (
                <button
                  type="button"
                  onClick={handleNoOneAnswered}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 16px', borderRadius: 10,
                    background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)',
                    color: '#fca5a5', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  title="Ninguém no auditório soube responder (mostrar gabarito correto)"
                >
                  <span>✕ Ninguém soube responder</span>
                </button>
              )}
            </div>
          </header>
        )}

        {/* ── Lateral Esquerda (Apenas no Modo Equipes) ── */}
        {playMode === 'teams' && (
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
                      {players[i]?.name || `Time ${i === 0 ? 'A' : 'B'}`}
                    </p>
                    <p style={{ margin: 0, fontSize: 40, fontWeight: 900, color: isActive ? TEAM_COLORS[i] : 'rgba(255,255,255,0.4)', fontFamily: 'monospace', lineHeight: 1 }}>
                      {players[i]?.score || 0}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', width: '100%' }}>
          {/* ── Área principal ── */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: playMode === 'individual' ? '28px 36px' : '16px 20px',
            position: 'relative', overflow: 'hidden',
            backgroundImage: (bgImage && (phase === 'idle' || phase === 'spinning')) ? `url(${bgImage})` : undefined,
            backgroundSize: 'cover', backgroundPosition: 'center'
          }}>

          {dbError && <p role="alert" style={{ color: '#FCA5A5', fontWeight: 700, textAlign: 'center' }}>{dbError}</p>}

          <AnimatePresence mode="wait">

            {/* IDLE + SPINNING — Quiz Clássico ou Roleta */}
            {(phase === 'idle' || phase === 'spinning') && (
              quizFormat === 'classic' ? (
                /* Card do Quiz Clássico (Direto nas perguntas) */
                <motion.div key="classic-intro"
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{
                    width: '100%', maxWidth: 750, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', textAlign: 'center', gap: 24, padding: '48px 36px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 32, boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(12px)'
                  }}
                >
                  <div style={{
                    width: 80, height: 80, borderRadius: 24,
                    background: playMode === 'individual' ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'linear-gradient(135deg, #10b981, #059669)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                    boxShadow: playMode === 'individual' ? '0 8px 24px rgba(2, 132, 199, 0.4)' : '0 8px 24px rgba(16, 185, 129, 0.4)'
                  }}>
                    {playMode === 'individual' ? <Hand style={{ width: 40, height: 40 }} /> : <Zap style={{ width: 40, height: 40 }} />}
                  </div>

                  <div>
                    <span style={{
                      fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em',
                      color: playMode === 'individual' ? '#38bdf8' : '#34d399',
                      background: playMode === 'individual' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(52, 211, 153, 0.12)',
                      padding: '4px 14px', borderRadius: 999,
                      border: playMode === 'individual' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(52, 211, 153, 0.3)'
                    }}>
                      {playMode === 'individual' ? '🙋 Modo Individual · Mão Levantada' : '👥 Disputa por Equipes'}
                    </span>
                    <h2 style={{ fontSize: 38, fontWeight: 900, color: 'white', margin: '14px 0 8px', fontFamily: "'Outfit', sans-serif" }}>
                      Preparados para a Pergunta {currentRound}?
                    </h2>
                    <p style={{ fontSize: 16, color: 'rgba(148,163,184,0.8)', margin: 0, maxWidth: 520, lineHeight: 1.5 }}>
                      {playMode === 'individual'
                        ? 'A pergunta será exibida com as 4 opções no telão. Quem souber levanta a mão e o condutor pontua no painel.'
                        : 'A pergunta será exibida no telão e o time da vez responderá em voz alta.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartClassicQuestion}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                      padding: '18px 44px', borderRadius: 18,
                      background: playMode === 'individual' ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white', fontWeight: 900, fontSize: 20, border: 'none', cursor: 'pointer',
                      boxShadow: playMode === 'individual' ? '0 10px 30px rgba(2, 132, 199, 0.4)' : '0 10px 30px rgba(16, 185, 129, 0.4)',
                      transition: 'all 0.2s', marginTop: 8
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
                  >
                    <Play style={{ width: 22, height: 22, fill: 'white' }} />
                    Mostrar Pergunta {currentRound}
                  </button>
                </motion.div>
              ) : (
                /* Roleta SVG de Categorias */
                <motion.div key="roulette"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>

                  {/* Roleta SVG */}
                  <div style={{ position: 'relative', width: WS, height: WS }}>
                    {/* Seta indicadora (direita) */}
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

                      {/* Botão central "RODAR" */}
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
                        <img src={logoCurso} alt="Logo Curso" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                      </div>
                    </div>
                  </div>

                  {/* Título abaixo da Roleta */}
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

                  {playMode === 'individual' ? (
                    <p style={{ fontSize: 16, color: 'rgba(148,163,184,0.7)', margin: 0 }}>
                      Gire a Roleta para sortear o tema! Após a revelação, quem levantar a mão responde.
                    </p>
                  ) : (
                    <p style={{ fontSize: 16, color: 'rgba(148,163,184,0.7)', margin: 0 }}>
                      Começa: <span style={{ color: TEAM_LIGHT[roundStarterIndex], fontWeight: 800 }}>{players[roundStarterIndex]?.name}</span>
                      {phase === 'idle' && <span style={{ color: 'rgba(148,163,184,0.4)', marginLeft: 6 }}>(se errar → {players[roundStarterIndex === 0 ? 1 : 0]?.name})</span>}
                    </p>
                  )}

                  {isSpinning && (
                    <p style={{ fontSize: 14, color: 'rgba(148,163,184,0.6)', animation: 'pulse 1s infinite' }}>
                      ✨ Sorteando categoria...
                    </p>
                  )}
                </motion.div>
              )
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
                initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, maxWidth: 1200, width: '100%' }}>
                
                {selectedCategory && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 24px',
                    borderRadius: 999,
                    background: `${selectedCategory.color}25`,
                    border: `1.5px solid ${selectedCategory.color}66`,
                    color: selectedCategory.color,
                    fontSize: 13,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                  }}>
                    {selectedCategory.name}
                  </div>
                )}

                <p style={{ fontSize: 18, fontWeight: 700, color: 'rgba(148,163,184,0.7)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>
                  Atenção para a pergunta
                </p>
                
                <h2 style={{ fontSize: 'clamp(32px, 4.5vw, 56px)', fontWeight: 900, color: 'white', lineHeight: 1.25, margin: 0, textShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
                  {currentQuestion.question_text}
                </h2>

                {isCountingDown ? (
                  <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <KahootCountdown
                      seconds={countdownSeconds}
                      soundEnabled={soundEnabled}
                      onComplete={() => {
                        setIsCountingDown(false);
                        setPhase('question-first');
                        setTimerActive(true);
                      }}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setIsCountingDown(true);
                    }}
                    style={{
                      padding: '22px 48px', borderRadius: 24,
                      background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                      border: '2px solid rgba(59,130,246,0.4)',
                      boxShadow: '0 8px 32px rgba(37,99,235,0.3)',
                      color: 'white', fontWeight: 900, fontSize: 24, cursor: 'pointer', marginTop: 16,
                      transition: 'all 0.2s ease',
                    }}>
                    Revelar Alternativas e Iniciar Tempo
                  </button>
                )}
              </motion.div>
            )}

            {/* QUESTION */}
            {(phase === 'question-first' || phase === 'question-second') && currentQuestion && (
              <motion.div key="question"
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  width: '100%',
                  maxWidth: playMode === 'individual' ? 1600 : 1450,
                  display: 'flex', flexDirection: 'column', gap: 0,
                  marginTop: playMode === 'individual' ? 0 : '-50px'
                }}>

                {/* Barra superior: categoria + timer + segunda chance */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: playMode === 'individual' ? '22px 32px' : '18px 26px',
                  background: 'rgba(0,0,0,0.3)', borderRadius: '16px 16px 0 0',
                  border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 16, height: 16, borderRadius: '50%', background: selectedCategory?.color || '#7C3AED', display: 'inline-block' }} />
                    <span style={{ fontSize: playMode === 'individual' ? 20 : 16, fontWeight: 800, color: selectedCategory?.color || '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Clock style={{ width: 22, height: 22, color: 'rgba(148,163,184,0.6)' }} />
                    <motion.span
                      key={timeLeft}
                      initial={{ scale: timeLeft <= 5 ? 1.3 : 1 }} animate={{ scale: 1 }}
                      style={{ fontSize: 44, fontWeight: 900, color: timerCol, fontFamily: 'monospace', minWidth: 72, textAlign: 'right' }}>
                      {timeLeft}s
                    </motion.span>
                    <button onClick={toggleTimer}
                      style={{ padding: '8px 14px', borderRadius: 8, cursor: 'pointer', color: 'white', background: timerActive ? 'rgba(245,158,11,0.22)' : 'rgba(16,185,129,0.2)', border: `1px solid ${timerActive ? 'rgba(245,158,11,0.5)' : 'rgba(16,185,129,0.5)'}`, fontWeight: 800, fontSize: 13 }}>
                      {timerActive ? 'Pausar' : 'Retomar'}
                    </button>
                  </div>
                </div>

                {/* Barra de progresso do timer */}
                <div style={{ height: 6, background: 'rgba(255,255,255,0.07)' }}>
                  <motion.div
                    animate={{ width: `${timerPct}%` }}
                    transition={{ duration: 0.95, ease: 'linear' }}
                    style={{ height: '100%', background: `linear-gradient(90deg, ${timerCol}, ${timerCol}bb)` }} />
                </div>

                {/* Banner do time respondendo (Apenas no Modo Equipes) */}
                {playMode === 'teams' && (
                  <div style={{
                    padding: '18px 26px',
                    background: TEAM_BG[respIdx],
                    border: `1px solid ${TEAM_COLORS[respIdx]}40`,
                    borderTop: 'none', borderBottom: 'none',
                    display: 'flex', alignItems: 'center', gap: 12
                  }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: TEAM_COLORS[respIdx], animation: 'pulse 1s infinite', flexShrink: 0 }} />
                    <span style={{ fontSize: 20, fontWeight: 800, color: TEAM_LIGHT[respIdx] }}>
                      {players[respIdx]?.name} — responda em voz alta!
                    </span>
                  </div>
                )}

                {/* Pergunta */}
                <div style={{
                  padding: playMode === 'individual' ? '56px 48px' : '46px 38px',
                  background: 'rgba(10,9,20,0.75)',
                  border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none', borderBottom: 'none',
                  textAlign: 'center'
                }}>
                  <p style={{ margin: 0, fontSize: playMode === 'individual' ? 46 : 42, fontWeight: 800, color: 'white', lineHeight: 1.45 }}>
                    {currentQuestion.question_text}
                  </p>
                </div>

                {/* Alternativas — 4 blocos coloridos estilo Kahoot */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
                  border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none', borderRadius: '0 0 16px 16px', overflow: 'hidden'
                }}>
                  {ANSWER_COLORS.map(col => {
                    const alt = currentQuestion.alternatives[col.index];

                    return (
                      <motion.button key={col.index}
                        whileHover={{ scale: 1.015, filter: 'brightness(1.08)' }}
                        whileTap={{ scale: 0.985 }}
                        onClick={() => {
                          if (playMode === 'individual') {
                            handleJudgeIndividual(col.index);
                          } else {
                            handleJudge(alt?.isCorrect || false);
                          }
                        }}
                        style={{
                          padding: playMode === 'individual' ? '48px 40px' : '42px 36px',
                          display: 'flex', alignItems: 'center', gap: 20,
                          background: `linear-gradient(135deg, ${col.bg} 0%, ${col.bgHover} 100%)`,
                          borderRight: col.index === 0 || col.index === 2 ? '1px solid rgba(0,0,0,0.2)' : 'none',
                          borderBottom: col.index === 0 || col.index === 1 ? '1px solid rgba(0,0,0,0.2)' : 'none',
                          position: 'relative',
                          cursor: 'pointer',
                          textAlign: 'left',
                          outline: 'none',
                          width: '100%',
                          transition: 'all 0.2s'
                        }}>
                        <span style={{ fontSize: playMode === 'individual' ? 44 : 38, fontWeight: 900, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                          {col.label}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: playMode === 'individual' ? 28 : 23, fontWeight: 700, color: 'white', lineHeight: 1.4 }}>
                            {alt?.text || '—'}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {playMode === 'teams' && phase === 'question-first' && (
                  <p style={{ margin: '8px 0 0', fontSize: 11, color: 'rgba(148,163,184,0.4)', textAlign: 'center' }}>
                    Se errar ou o tempo acabar → <strong style={{ color: TEAM_LIGHT[roundStarterIndex === 0 ? 1 : 0] }}>{players[roundStarterIndex === 0 ? 1 : 0]?.name}</strong> terá a mesma chance
                  </p>
                )}
              </motion.div>
            )}

            {/* RESULTADO DA RODADA */}
            {phase === 'round-result' && roundResult && (
              <motion.div key="round-result"
                initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 220 }}
                style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, maxWidth: 900 }}>

                <button onClick={undoLastDecision}
                  style={{ position: 'absolute', top: 24, right: 24, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', color: '#FDE68A', background: 'rgba(245,158,11,0.14)', border: '1px solid rgba(245,158,11,0.42)', fontWeight: 800 }}>
                  Desfazer decisão
                </button>

                {playMode === 'individual' ? (
                  /* Modo Individual (Medição de Conhecimento - Sem Pontos) */
                  roundResult.correct ? (
                    <>
                      <div style={{ fontSize: 100 }}>🎉</div>
                      <div>
                        <span style={{
                          padding: '6px 20px', borderRadius: 999,
                          background: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.4)',
                          color: '#34d399', fontWeight: 900, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.08em'
                        }}>
                          Gabarito Confirmado
                        </span>
                        <h3 style={{ margin: '14px 0 6px', fontSize: 56, fontWeight: 900, color: '#34d399' }}>
                          Resposta Correta!
                        </h3>
                      </div>
                      {correctAnswer && (
                        <div style={{ padding: '24px 36px', background: 'rgba(52,211,153,0.12)', border: '1.5px solid rgba(52,211,153,0.4)', borderRadius: 20, maxWidth: 900, width: '100%' }}>
                          <p style={{ margin: '0 0 6px', fontSize: 16, color: 'rgba(52,211,153,0.9)', textTransform: 'uppercase', fontWeight: 800 }}>Alternativa Correta</p>
                          <p style={{ margin: 0, fontSize: 26, color: 'white', fontWeight: 700 }}>{correctAnswer.text}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 100 }}>💡</div>
                      <div>
                        <span style={{
                          padding: '6px 20px', borderRadius: 999,
                          background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)',
                          color: '#f87171', fontWeight: 900, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.08em'
                        }}>
                          Atenção ao Gabarito
                        </span>
                        <h3 style={{ margin: '14px 0 6px', fontSize: 56, fontWeight: 900, color: '#f87171' }}>
                          Resposta Incorreta
                        </h3>
                      </div>
                      {correctAnswer && (
                        <div style={{ padding: '24px 36px', background: 'rgba(52,211,153,0.12)', border: '1.5px solid rgba(52,211,153,0.4)', borderRadius: 20, maxWidth: 900, width: '100%' }}>
                          <p style={{ margin: '0 0 6px', fontSize: 16, color: 'rgba(52,211,153,0.9)', textTransform: 'uppercase', fontWeight: 800 }}>A resposta correta era</p>
                          <p style={{ margin: 0, fontSize: 26, color: 'white', fontWeight: 700 }}>{correctAnswer.text}</p>
                        </div>
                      )}
                    </>
                  )
                ) : (
                  /* Modo Equipes (Com Pontos) */
                  roundResult.scorer !== null ? (
                    <>
                      <div style={{ fontSize: 110 }}>🎉</div>
                      <div>
                        <p style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 700, color: 'rgba(148,163,184,0.6)', textTransform: 'uppercase' }}>Acertou!</p>
                        <h3 style={{ margin: '0 0 10px', fontSize: 64, fontWeight: 900, color: TEAM_COLORS[roundResult.scorer] }}>
                          {players[roundResult.scorer]?.name}
                        </h3>
                        <p style={{ margin: 0, fontSize: 48, fontWeight: 900, color: '#34D399' }}>
                          +{firstFailed ? pointsOnPass : pointsPerCorrect} pontos
                        </p>
                      </div>
                      {correctAnswer && (
                        <div style={{ padding: '20px 32px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 20 }}>
                          <p style={{ margin: '0 0 6px', fontSize: 18, color: 'rgba(52,211,153,0.8)', textTransform: 'uppercase', fontWeight: 700 }}>Resposta Correta</p>
                          <p style={{ margin: 0, fontSize: 24, color: 'white', fontWeight: 700 }}>{correctAnswer.text}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 100 }}>😅</div>
                      <div>
                        <h3 style={{ margin: '0 0 10px', fontSize: 48, fontWeight: 900, color: '#F87171' }}>
                          Ninguém acertou
                        </h3>
                        <p style={{ margin: 0, fontSize: 22, color: 'rgba(148,163,184,0.7)' }}>
                          Ambos os times erraram esta rodada
                        </p>
                      </div>
                      {correctAnswer && (
                        <div style={{ padding: '20px 32px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20 }}>
                          <p style={{ margin: '0 0 6px', fontSize: 18, color: 'rgba(239,68,68,0.8)', textTransform: 'uppercase', fontWeight: 700 }}>Resposta Correta era</p>
                          <p style={{ margin: 0, fontSize: 24, color: 'white', fontWeight: 700 }}>{correctAnswer.text}</p>
                        </div>
                      )}
                    </>
                  )
                )}

                {currentQuestion?.explanation && (
                  <div style={{ maxWidth: 800, padding: '16px 22px', borderRadius: 16, background: 'rgba(124,58,237,0.13)', border: '1px solid rgba(167,139,250,0.3)', color: '#E9D5FF', fontSize: 18, lineHeight: 1.5 }}>
                    <strong>Explicação:</strong> {currentQuestion.explanation}
                    {currentQuestion.reference_url?.match(/^https?:\/\//i) && (
                      <a href={currentQuestion.reference_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', color: '#93C5FD', fontSize: 14, marginTop: 6 }}>Ver referência</a>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={advanceRound}
                    style={{
                      padding: '14px 32px', borderRadius: 14,
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white', fontWeight: 800, fontSize: 18, border: 'none', cursor: 'pointer',
                      boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                      display: 'flex', alignItems: 'center', gap: 8
                    }}
                  >
                    Próxima Pergunta <Play style={{ width: 18, height: 18, fill: 'white' }} />
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
          </div>

          {/* ── Histórico de rodadas (Apenas no Modo Equipes) ── */}
          {playMode === 'teams' && (
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
                      const r0 = players[0]?.roundResults?.[r];
                      const r1 = players[1]?.roundResults?.[r];
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
          )}
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
                    onClick={() => { setSettingsActiveTab('general'); sfx.playClick(); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, textAlign: 'left', cursor: 'pointer',
                      background: settingsActiveTab === 'general' ? 'rgba(255,255,255,0.05)' : 'transparent',
                      color: settingsActiveTab === 'general' ? '#818cf8' : '#94a3b8',
                      borderLeft: settingsActiveTab === 'general' ? '2px solid #6366f1' : '2px solid transparent'
                    }}
                  >
                    <Settings style={{ width: 16, height: 16 }} />
                    Geral
                  </button>

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
                  {settingsActiveTab === 'general' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeInModal 0.25s ease' }}>
                      {/* Efeitos Sonoros */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div>
                          <h4 style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: '0 0 4px 0' }}>Efeitos Sonoros</h4>
                          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Ative ou silencie os sons do jogo local.</p>
                        </div>
                        <button
                          onClick={() => {
                            onToggleSound();
                            sfx.playClick();
                          }}
                          style={{
                            padding: '10px 16px', borderRadius: 10,
                            background: soundEnabled ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${soundEnabled ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                            color: soundEnabled ? '#a5b4fc' : '#94a3b8',
                            fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, width: 'fit-content'
                          }}
                        >
                          {soundEnabled ? <Volume2 style={{ width: 16, height: 16 }} /> : <VolumeX style={{ width: 16, height: 16 }} />}
                          <span>{soundEnabled ? 'Sons Ativados' : 'Sons Desativados'}</span>
                        </button>
                      </div>

                      {/* Contagem Pré-Questão */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h4 style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Clock style={{ width: 16, height: 16, color: '#818cf8' }} />
                              Contagem Pré-Questão
                            </h4>
                            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Duração da animação estilo Kahoot antes das alternativas.</p>
                          </div>
                          <span style={{ background: '#46178f', color: 'white', padding: '4px 10px', borderRadius: 8, fontWeight: 800, fontSize: 12 }}>
                            {countdownSeconds}s
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {[3, 5, 7, 10, 15].map((sec) => (
                              <button
                                key={sec}
                                onClick={() => {
                                  handleUpdateCountdownSeconds(sec);
                                  sfx.playClick();
                                }}
                                style={{
                                  padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: countdownSeconds === sec ? 800 : 600,
                                  background: countdownSeconds === sec ? '#6366f1' : 'rgba(255,255,255,0.05)',
                                  color: countdownSeconds === sec ? '#ffffff' : '#94a3b8',
                                  border: `1px solid ${countdownSeconds === sec ? '#818cf8' : 'rgba(255,255,255,0.1)'}`,
                                  cursor: 'pointer'
                                }}
                              >
                                {sec}s
                              </button>
                            ))}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              onClick={() => {
                                if (countdownSeconds > 2) {
                                  handleUpdateCountdownSeconds(countdownSeconds - 1);
                                  sfx.playClick();
                                }
                              }}
                              disabled={countdownSeconds <= 2}
                              style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', cursor: countdownSeconds <= 2 ? 'not-allowed' : 'pointer', fontWeight: 800 }}
                            >
                              -
                            </button>
                            <button
                              onClick={() => {
                                if (countdownSeconds < 60) {
                                  handleUpdateCountdownSeconds(countdownSeconds + 1);
                                  sfx.playClick();
                                }
                              }}
                              disabled={countdownSeconds >= 60}
                              style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', cursor: countdownSeconds >= 60 ? 'not-allowed' : 'pointer', fontWeight: 800 }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

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
    const questionReport = usedQuestionIds.map((id, index) => {
      const question = allQuestions.find(item => item.id === id);
      const results = players.map(player => player.roundResults[index]).filter(result => result?.answered);
      return { id, question, answered: results.length, correct: results.filter(result => result.correct).length };
    }).filter(item => item.question);

    const categoryReport = allCategories.map(category => {
      const rows = questionReport.filter(row => row.question?.category_id === category.id);
      return { category, answered: rows.reduce((sum, row) => sum + row.answered, 0), correct: rows.reduce((sum, row) => sum + row.correct, 0) };
    }).filter(item => item.answered > 0);

    const totalAnswered = players.reduce((sum, p) => sum + p.roundResults.filter(r => r.answered).length, 0);
    const totalCorrect = players.reduce((sum, p) => sum + p.roundResults.filter(r => r.correct).length, 0);
    const overallPct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{ maxWidth: 1100, margin: '20px auto', width: '100%', padding: '0 16px' }}
      >
        <div style={{
          background: 'linear-gradient(165deg, #0b1120 0%, #0f172a 45%, #1e1b4b 100%)',
          borderRadius: 28,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.06)',
          padding: '44px 36px',
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Brilho decorativo no topo */}
          <div style={{
            position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)',
            width: 500, height: 220,
            background: playMode === 'individual'
              ? 'radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(251, 191, 36, 0.2) 0%, transparent 70%)',
            pointerEvents: 'none', filter: 'blur(60px)'
          }} />

          {playMode === 'individual' ? (
            /* Cabeçalho Modo Individual (Auditório) */
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <div style={{
                width: 76, height: 76, borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(124, 58, 237, 0.25) 100%)',
                border: '2px solid rgba(56, 189, 248, 0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 38, margin: '0 auto 16px',
                boxShadow: '0 0 30px rgba(56, 189, 248, 0.25)'
              }}>
                🎓
              </div>
              <h2 style={{ fontSize: 42, fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.02em', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
                Sessão Concluída!
              </h2>
              <p style={{ fontSize: 18, color: '#cbd5e1', marginTop: 10, fontWeight: 500, maxWidth: 640, marginInline: 'auto', lineHeight: 1.5 }}>
                Todas as <strong style={{ color: '#38bdf8', fontWeight: 800 }}>{totalRounds}</strong> perguntas do quiz foram apresentadas ao auditório.
              </p>
            </div>
          ) : (
            /* Cabeçalho Modo Equipes (Competição) */
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <Crown style={{ width: 84, height: 84, color: '#FBBF24', margin: '0 auto 16px', filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.6))' }} />
              <h2 style={{ fontSize: 46, fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.02em', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
                {isTie ? '🤝 Empate!' : `🏆 ${winner.name} venceu!`}
              </h2>
              <p style={{ fontSize: 18, color: '#cbd5e1', marginTop: 10, fontWeight: 500 }}>
                {totalRounds} rodadas concluídas com sucesso
              </p>
            </div>
          )}

          {/* Destaque Central */}
          {playMode === 'individual' ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 16,
              width: '100%',
              maxWidth: 820,
              margin: '0 auto',
              position: 'relative',
              zIndex: 1
            }}>
              {/* Card 1: Perguntas Apresentadas */}
              <div style={{
                padding: '20px 24px', borderRadius: 18,
                background: '#1e293b', border: '1px solid rgba(56, 189, 248, 0.3)',
                textAlign: 'center', boxShadow: '0 6px 18px rgba(0,0,0,0.2)'
              }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Perguntas Apresentadas
                </span>
                <p style={{ margin: '6px 0 0', fontSize: 40, fontWeight: 900, color: '#ffffff', fontFamily: 'monospace' }}>
                  {totalRounds}
                </p>
              </div>

              {/* Card 2: Acertos Registrados */}
              <div style={{
                padding: '20px 24px', borderRadius: 18,
                background: '#1e293b', border: '1px solid rgba(16, 185, 129, 0.3)',
                textAlign: 'center', boxShadow: '0 6px 18px rgba(0,0,0,0.2)'
              }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Acertos do Auditório
                </span>
                <p style={{ margin: '6px 0 0', fontSize: 40, fontWeight: 900, color: '#ffffff', fontFamily: 'monospace' }}>
                  {totalCorrect} <span style={{ fontSize: 18, color: '#94a3b8', fontWeight: 600 }}>/ {totalAnswered || totalRounds}</span>
                </p>
              </div>

              {/* Card 3: Taxa de Aproveitamento */}
              <div style={{
                padding: '20px 24px', borderRadius: 18,
                background: '#1e293b', border: '1px solid rgba(168, 85, 247, 0.3)',
                textAlign: 'center', boxShadow: '0 6px 18px rgba(0,0,0,0.2)'
              }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Taxa de Acertos
                </span>
                <p style={{
                  margin: '6px 0 0', fontSize: 40, fontWeight: 900,
                  color: overallPct >= 70 ? '#34d399' : overallPct >= 40 ? '#facc15' : '#f87171',
                  fontFamily: 'monospace'
                }}>
                  {overallPct}%
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, position: 'relative', zIndex: 1 }}>
              {[0, 1].map(i => {
                const isWinner = !isTie && players[i]?.name === winner.name;
                return (
                  <motion.div key={i}
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: i * 0.15 }}
                    style={{
                      padding: '36px 28px', borderRadius: 24,
                      background: isWinner ? TEAM_BG[i] : '#1e293b',
                      border: `2px solid ${isWinner ? TEAM_COLORS[i] : 'rgba(255,255,255,0.08)'}`,
                      textAlign: 'center', position: 'relative',
                      boxShadow: isWinner ? `0 10px 30px ${TEAM_COLORS[i]}35` : '0 6px 20px rgba(0,0,0,0.25)'
                    }}>
                    {isWinner && (
                      <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
                        background: TEAM_COLORS[i], borderRadius: 999, padding: '4px 22px',
                        fontSize: 16, fontWeight: 900, color: 'white', textTransform: 'uppercase', whiteSpace: 'nowrap',
                        boxShadow: `0 4px 14px ${TEAM_COLORS[i]}60` }}>
                        🏆 Vencedor
                      </div>
                    )}
                    <p style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: TEAM_LIGHT[i], textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {players[i]?.name}
                    </p>
                    <p style={{ margin: 0, fontSize: 80, fontWeight: 900, color: isWinner ? TEAM_COLORS[i] : '#ffffff', fontFamily: 'monospace', lineHeight: 1 }}>
                      {players[i]?.score}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 16, color: '#94a3b8', fontWeight: 600 }}>pontos</p>

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
                      {players[i]?.roundResults.map((r, ri) => (
                        <div key={ri} style={{
                          width: 22, height: 22, borderRadius: 6,
                          background: r.correct ? TEAM_COLORS[i] : r.answered ? '#ef4444' : 'rgba(255,255,255,0.1)',
                          border: `1.5px solid ${r.correct ? TEAM_COLORS[i] : r.answered ? '#f87171' : 'rgba(255,255,255,0.15)'}`
                        }} title={`R${ri + 1}: ${r.correct ? 'Acertou' : r.answered ? 'Errou' : '-'}`} />
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Seção de Relatórios com Alto Contraste */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, position: 'relative', zIndex: 1 }}>
            {/* Card 1: Desempenho */}
            <div style={{
              padding: 22, borderRadius: 20,
              background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 6px 16px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 14
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10 }}>
                <Users style={{ width: 18, height: 18, color: '#38bdf8' }} />
                <h3 style={{ color: '#ffffff', fontSize: 16, fontWeight: 800, margin: 0 }}>
                  {playMode === 'individual' ? 'Desempenho dos Participantes' : 'Desempenho dos Times'}
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {players.map(player => {
                  const answered = player.roundResults.filter(result => result.answered).length;
                  const correct = player.roundResults.filter(result => result.correct).length;
                  const pct = answered ? Math.round(correct / answered * 100) : 0;
                  return (
                    <div key={player.name} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', borderRadius: 12,
                      background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.06)'
                    }}>
                      <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>
                        {player.name}
                        {playMode === 'teams' ? ` (${player.score} pts)` : ''}
                      </span>
                      <span style={{
                        background: pct >= 70 ? 'rgba(16, 185, 129, 0.2)' : pct >= 40 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: pct >= 70 ? '#34d399' : pct >= 40 ? '#fcd34d' : '#fca5a5',
                        border: `1px solid ${pct >= 70 ? 'rgba(16, 185, 129, 0.4)' : pct >= 40 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                        padding: '4px 10px', borderRadius: 8, fontSize: 13, fontWeight: 800
                      }}>
                        {correct}/{answered} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card 2: Categorias */}
            <div style={{
              padding: 22, borderRadius: 20,
              background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 6px 16px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 14
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10 }}>
                <Target style={{ width: 18, height: 18, color: '#a855f7' }} />
                <h3 style={{ color: '#ffffff', fontSize: 16, fontWeight: 800, margin: 0 }}>Acertos por Categoria</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {categoryReport.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: 13, margin: 0, fontStyle: 'italic' }}>Nenhuma categoria registrada.</p>
                ) : (
                  categoryReport.map(row => {
                    const pct = Math.round(row.correct / row.answered * 100);
                    return (
                      <div key={row.category.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', borderRadius: 12,
                        background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.06)'
                      }}>
                        <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                          {row.category.name}
                        </span>
                        <span style={{
                          background: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe',
                          border: '1px solid rgba(168, 85, 247, 0.4)',
                          padding: '4px 10px', borderRadius: 8, fontSize: 13, fontWeight: 800
                        }}>
                          {row.correct}/{row.answered} ({pct}%)
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Card 3: Questões */}
            <div style={{
              padding: 22, borderRadius: 20,
              background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 6px 16px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 14
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10 }}>
                <BarChart3 style={{ width: 18, height: 18, color: '#f59e0b' }} />
                <h3 style={{ color: '#ffffff', fontSize: 16, fontWeight: 800, margin: 0 }}>Questões Apresentadas</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                {questionReport.filter(row => row.answered > 0).length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: 13, margin: 0, fontStyle: 'italic' }}>Nenhuma questão com resposta registrada.</p>
                ) : (
                  questionReport.filter(row => row.answered > 0)
                    .sort((a, b) => a.correct / a.answered - b.correct / b.answered)
                    .map(row => (
                      <div key={row.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                        padding: '10px 12px', borderRadius: 12,
                        background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.06)'
                      }}>
                        <span style={{
                          color: '#e2e8f0', fontSize: 13, fontWeight: 500,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3
                        }} title={row.question?.question_text}>
                          {row.question?.question_text}
                        </span>
                        <span style={{
                          background: row.correct === 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: row.correct === 0 ? '#fca5a5' : '#6ee7b7',
                          border: `1px solid ${row.correct === 0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                          padding: '4px 8px', borderRadius: 8, fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap'
                        }}>
                          {row.correct}/{row.answered} acertos
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>
          </section>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', gap: 16, position: 'relative', zIndex: 1, marginTop: 4 }}>
            <button
              onClick={resetGame}
              style={{
                flex: 1, padding: '18px 28px', borderRadius: 16,
                background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                border: 'none', color: '#ffffff', fontWeight: 800, fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                boxShadow: '0 8px 24px -4px rgba(124, 58, 237, 0.5)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 28px -4px rgba(124, 58, 237, 0.65)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 8px 24px -4px rgba(124, 58, 237, 0.5)';
              }}
            >
              <RotateCcw style={{ width: 22, height: 22 }} />
              <span>Jogar Novamente</span>
            </button>

            <button
              onClick={onBack}
              style={{
                flex: 1, padding: '18px 28px', borderRadius: 16,
                background: '#334155', border: '1px solid rgba(255,255,255,0.14)',
                color: '#ffffff', fontWeight: 700, fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#475569';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#334155';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <Home style={{ width: 22, height: 22 }} />
              <span>Início</span>
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}
