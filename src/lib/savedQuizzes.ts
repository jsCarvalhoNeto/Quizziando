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
  quizFormat?: 'classic' | 'roulette' | 'blocks';
  difficultyFilter?: 'all' | 'easy' | 'medium' | 'hard';
  tagFilter?: string;
  thumbnailUrl?: string;
  folderId?: string | null;
  isFavorite?: boolean;
  description?: string;
  authorName?: string;
  questionCount?: number;
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
    let hasUpdates = false;
    const todayIso = new Date().toISOString();
    const result = value.filter((quiz): quiz is SavedQuiz =>
      quiz && typeof quiz === 'object' && typeof quiz.id === 'string' &&
      typeof quiz.name === 'string' && Array.isArray(quiz.categoryIds) &&
      Array.isArray(quiz.questionIds) && typeof quiz.rounds === 'number' &&
      typeof quiz.timeLimit === 'number' && quiz.localRules && typeof quiz.localRules === 'object'
    ).map(quiz => {
      if (!quiz.savedAt) {
        hasUpdates = true;
        return { ...quiz, savedAt: todayIso };
      }
      return quiz;
    });

    if (hasUpdates) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    }
    return result;
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

export function toggleFavoriteQuiz(id: string): SavedQuiz[] {
  const quizzes = readSavedQuizzes();
  const next = quizzes.map(q => q.id === id ? { ...q, isFavorite: !q.isFavorite } : q);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function duplicateQuiz(id: string): SavedQuiz[] {
  const quizzes = readSavedQuizzes();
  const target = quizzes.find(q => q.id === id);
  if (!target) return quizzes;
  const copy: SavedQuiz = {
    ...target,
    id: `quiz-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: `${target.name} (Cópia)`,
    savedAt: new Date().toISOString(),
    isFavorite: false
  };
  return saveQuiz(copy);
}
