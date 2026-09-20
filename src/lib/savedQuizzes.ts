export interface SavedQuiz {
  id: string;
  name: string;
  savedAt: string;
  categoryIds: string[];
  questionIds: string[];
  rounds: number;
  timeLimit: number;
  onlineMode: 'open' | 'duel' | 'team';
  scoringMode: 'speed' | 'fixed';
  fixedPoints: number;
  localRules: {
    hasObstacles: boolean;
    pointsPerCorrect: number;
    pointsOnPass: number;
    quickMode: boolean;
    tiePolicy: 'shared' | 'extra';
  };
}

const STORAGE_KEY = 'quizziando_saved_quizzes_v1';

export function readSavedQuizzes(): SavedQuiz[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((quiz): quiz is SavedQuiz =>
      quiz && typeof quiz === 'object' && typeof quiz.id === 'string' &&
      typeof quiz.name === 'string' && Array.isArray(quiz.categoryIds) &&
      Array.isArray(quiz.questionIds) && typeof quiz.rounds === 'number' &&
      typeof quiz.timeLimit === 'number' && quiz.localRules && typeof quiz.localRules === 'object');
  } catch { return []; }
}

export function saveQuiz(quiz: SavedQuiz): SavedQuiz[] {
  const next = [quiz, ...readSavedQuizzes().filter(item => item.id !== quiz.id)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function deleteSavedQuiz(id: string): SavedQuiz[] {
  const next = readSavedQuizzes().filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
