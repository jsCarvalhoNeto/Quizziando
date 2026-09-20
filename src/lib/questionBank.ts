import type { LocalCategory, LocalQuestion } from './localDb';

export interface QuestionBank {
  format: 'quizziando-question-bank';
  version: 1;
  exportedAt: string;
  categories: LocalCategory[];
  questions: LocalQuestion[];
}

export function createQuestionBank(categories: LocalCategory[], questions: LocalQuestion[]): QuestionBank {
  return { format: 'quizziando-question-bank', version: 1, exportedAt: new Date().toISOString(), categories, questions };
}

export function parseQuestionBank(raw: string): QuestionBank {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('Arquivo JSON inválido.');
  const bank = value as Partial<QuestionBank>;
  if (bank.format !== 'quizziando-question-bank' || bank.version !== 1 || !Array.isArray(bank.categories) || !Array.isArray(bank.questions))
    throw new Error('Formato de acervo não reconhecido.');
  if (bank.categories.length > 100 || bank.questions.length > 5000) throw new Error('O arquivo excede o limite de itens.');
  const ids = new Set<string>();
  for (const category of bank.categories) {
    if (!category || typeof category.id !== 'string' || !category.id || ids.has(category.id) ||
      typeof category.name !== 'string' || !category.name.trim() || typeof category.color !== 'string' || typeof category.icon !== 'string')
      throw new Error('Há uma categoria inválida ou duplicada no arquivo.');
    ids.add(category.id);
  }
  const questionIds = new Set<string>();
  for (const question of bank.questions) {
    if (!question || typeof question.id !== 'string' || !question.id || questionIds.has(question.id) ||
      typeof question.category_id !== 'string' || !ids.has(question.category_id) ||
      typeof question.question_text !== 'string' || !question.question_text.trim() ||
      !Number.isInteger(question.time_limit) || question.time_limit < 5 || question.time_limit > 600 ||
      !Array.isArray(question.alternatives) || question.alternatives.length !== 4 ||
      question.alternatives.filter(alt => alt?.isCorrect === true).length !== 1 ||
      question.alternatives.some(alt => typeof alt?.text !== 'string' || !alt.text.trim()) ||
      (question.difficulty !== undefined && !['easy', 'medium', 'hard'].includes(question.difficulty)) ||
      (question.explanation !== undefined && question.explanation !== null && typeof question.explanation !== 'string') ||
      (question.reference_url !== undefined && question.reference_url !== null && typeof question.reference_url !== 'string') ||
      (question.tags !== undefined && (!Array.isArray(question.tags) || question.tags.length > 20 || question.tags.some(tag => typeof tag !== 'string' || tag.length > 80))))
      throw new Error('Há uma pergunta inválida ou sem categoria no arquivo.');
    questionIds.add(question.id);
  }
  return bank as QuestionBank;
}

export function downloadQuestionBank(bank: QuestionBank): void {
  const blob = new Blob([JSON.stringify(bank, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `quizziando-acervo-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
