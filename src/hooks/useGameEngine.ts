// useGameEngine.ts — Máquina de Estados das Rodadas de Quiz
// Gerencia a progressão: sorteio ➔ revelação ➔ contagem/tempo ➔ pontuação ➔ pódio

import { useState, useEffect, useRef, useCallback } from 'react';

export type GamePhase =
  | 'idle'
  | 'spinning'
  | 'category-reveal'
  | 'question-reveal'
  | 'question'
  | 'round-result'
  | 'ranking'
  | 'podium'
  | 'finished';

export interface GameEngineOptions {
  totalRounds?: number;
  defaultTimeLimit?: number;
  scoringMode?: 'speed' | 'fixed';
  basePoints?: number;
  onPhaseChange?: (phase: GamePhase, round: number) => void;
  onTimeExpired?: () => void;
}

export interface GameEngineState<TCategory, TQuestion> {
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  selectedCategory: TCategory | null;
  currentQuestion: TQuestion | null;
  timeLeft: number;
  timeLimit: number;
  isPaused: boolean;
  scoringMode: 'speed' | 'fixed';
  basePoints: number;
}

export function useGameEngine<TCategory = unknown, TQuestion = unknown>(options: GameEngineOptions = {}) {
  const {
    totalRounds: initialTotalRounds = 10,
    defaultTimeLimit = 30,
    scoringMode: initialScoringMode = 'speed',
    basePoints: initialBasePoints = 1000,
    onPhaseChange,
    onTimeExpired
  } = options;

  const [phase, setPhaseState] = useState<GamePhase>('idle');
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [totalRounds, setTotalRounds] = useState<number>(initialTotalRounds);
  const [selectedCategory, setSelectedCategory] = useState<TCategory | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<TQuestion | null>(null);
  const [timeLimit, setTimeLimit] = useState<number>(defaultTimeLimit);
  const [timeLeft, setTimeLeft] = useState<number>(defaultTimeLimit);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [scoringMode, setScoringMode] = useState<'speed' | 'fixed'>(initialScoringMode);
  const [basePoints, setBasePoints] = useState<number>(initialBasePoints);

  const onTimeExpiredRef = useRef(onTimeExpired);
  onTimeExpiredRef.current = onTimeExpired;

  const onPhaseChangeRef = useRef(onPhaseChange);
  onPhaseChangeRef.current = onPhaseChange;

  const setPhase = useCallback((newPhase: GamePhase) => {
    setPhaseState(newPhase);
    if (onPhaseChangeRef.current) {
      onPhaseChangeRef.current(newPhase, currentRound);
    }
  }, [currentRound]);

  // Timer de contagem regressiva durante a fase de pergunta
  useEffect(() => {
    if (phase !== 'question' || isPaused) return;

    if (timeLeft <= 0) {
      if (onTimeExpiredRef.current) {
        onTimeExpiredRef.current();
      }
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          window.clearInterval(timer);
          if (onTimeExpiredRef.current) {
            onTimeExpiredRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [phase, isPaused, timeLeft]);

  // Transições da máquina de estados
  const startSpinning = useCallback(() => {
    setSelectedCategory(null);
    setCurrentQuestion(null);
    setPhase('spinning');
  }, [setPhase]);

  const revealCategory = useCallback((category: TCategory) => {
    setSelectedCategory(category);
    setPhase('category-reveal');
  }, [setPhase]);

  const revealQuestion = useCallback((question: TQuestion, customTimeLimit?: number) => {
    setCurrentQuestion(question);
    const limit = customTimeLimit || defaultTimeLimit;
    setTimeLimit(limit);
    setTimeLeft(limit);
    setIsPaused(false);
    setPhase('question-reveal');
  }, [defaultTimeLimit, setPhase]);

  const startQuestion = useCallback(() => {
    setPhase('question');
  }, [setPhase]);

  const finishQuestion = useCallback(() => {
    setIsPaused(true);
    setPhase('round-result');
  }, [setPhase]);

  const showRanking = useCallback(() => {
    setPhase('ranking');
  }, [setPhase]);

  const advanceNextRound = useCallback(() => {
    if (currentRound >= totalRounds) {
      setPhase('podium');
    } else {
      setCurrentRound(prev => prev + 1);
      setSelectedCategory(null);
      setCurrentQuestion(null);
      setPhase('idle');
    }
  }, [currentRound, totalRounds, setPhase]);

  const finishGame = useCallback(() => {
    setPhase('podium');
  }, [setPhase]);

  const pauseTimer = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeTimer = useCallback(() => {
    setIsPaused(false);
  }, []);

  const resetGame = useCallback(() => {
    setCurrentRound(1);
    setPhase('idle');
    setSelectedCategory(null);
    setCurrentQuestion(null);
    setTimeLeft(defaultTimeLimit);
    setIsPaused(false);
  }, [defaultTimeLimit, setPhase]);

  // Cálculo de pontuação padronizado
  const calculatePoints = useCallback((remainingSec: number, isCorrect: boolean): number => {
    if (!isCorrect) return 0;
    if (scoringMode === 'fixed') return basePoints;
    // Modo speed (estilo Kahoot: pontuação proporcional ao tempo restante com piso de 50%)
    const safeRemaining = Math.max(0, Math.min(remainingSec, timeLimit));
    const ratio = timeLimit > 0 ? safeRemaining / timeLimit : 0;
    const speedBonus = Math.round(basePoints * 0.5 * ratio);
    return Math.round(basePoints * 0.5 + speedBonus);
  }, [scoringMode, basePoints, timeLimit]);

  return {
    state: {
      phase,
      currentRound,
      totalRounds,
      selectedCategory,
      currentQuestion,
      timeLeft,
      timeLimit,
      isPaused,
      scoringMode,
      basePoints
    },
    // Setters diretos caso necessário
    setPhase,
    setCurrentRound,
    setTotalRounds,
    setSelectedCategory,
    setCurrentQuestion,
    setTimeLeft,
    setScoringMode,
    setBasePoints,
    // Ações de fluxo
    startSpinning,
    revealCategory,
    revealQuestion,
    startQuestion,
    finishQuestion,
    showRanking,
    advanceNextRound,
    finishGame,
    pauseTimer,
    resumeTimer,
    resetGame,
    calculatePoints
  };
}
