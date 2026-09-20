import type { LocalCategory, LocalQuestion } from './localDb';

export interface LocalPlayer {
  name: string;
  score: number;
  roundResults: Array<{ answered: boolean; correct: boolean | null }>;
}

export type RoundPhase =
  | 'idle' | 'spinning' | 'category-reveal' | 'question-reveal'
  | 'question-first' | 'question-second' | 'round-result' | 'finished';

export interface SavedLocalGame {
  version: 1;
  savedAt: string;
  players: [LocalPlayer, LocalPlayer];
  totalRounds: number;
  hasObstacles: boolean;
  selectedCatIds: string[];
  selectedQuestionIds?: string[] | null;
  difficultyFilter?: 'all' | 'easy' | 'medium' | 'hard';
  tagFilter?: string;
  currentRound: number;
  roundStarterIndex: number;
  firstFailed: boolean;
  phase: RoundPhase;
  selectedCategory: LocalCategory | null;
  currentQuestion: LocalQuestion | null;
  usedQuestionIds: string[];
  timeLeft: number;
  rouletteAngle: number;
  pointsPerCorrect: number;
  pointsOnPass: number;
  turnTimeLimit: number;
  quickMode: boolean;
  tiePolicy: 'shared' | 'extra';
}

const phases = new Set<RoundPhase>([
  'idle', 'spinning', 'category-reveal', 'question-reveal',
  'question-first', 'question-second', 'round-result', 'finished',
]);

/** Reject a broken save before it can replace a running game's state. */
export function parseLocalGameSnapshot(raw: string | null): SavedLocalGame | null {
  try {
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const game = value as Record<string, unknown>;
    if (game.version !== 1 || !Array.isArray(game.players) || game.players.length !== 2 ||
      !game.players.every(player => player && typeof player.name === 'string' &&
        Number.isFinite(player.score) && Array.isArray(player.roundResults)) ||
      !Array.isArray(game.selectedCatIds) || !game.selectedCatIds.every(id => typeof id === 'string') ||
      !Array.isArray(game.usedQuestionIds) || !game.usedQuestionIds.every(id => typeof id === 'string') ||
      !Number.isInteger(game.totalRounds) || (game.totalRounds as number) < 1 ||
      !Number.isInteger(game.currentRound) || (game.currentRound as number) < 1 ||
      (game.currentRound as number) > (game.totalRounds as number) ||
      !Number.isFinite(game.timeLeft) || !phases.has(game.phase as RoundPhase) ||
      ![0, 1].includes(game.roundStarterIndex as number)) return null;
    return game as unknown as SavedLocalGame;
  } catch { return null; }
}
