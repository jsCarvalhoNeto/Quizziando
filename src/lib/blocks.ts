// src/lib/blocks.ts
// Tipos e utilitários para o Modo Blocos (Kahoot Blocks)

export type QuizFormat = 'classic' | 'roulette' | 'blocks' | 'boss_raid';

export type BlockStatus = 'unrevealed' | 'active' | 'correct' | 'wrong';

export interface QuizBlockItem {
  id: string;
  number: number; // 1, 2, 3...
  questionId: string;
  status: BlockStatus;
  answeredByTeamId?: string;
  answeredByTeamName?: string;
  scoreAwarded?: number;
}

export interface BlocksConfig {
  totalBlocks: number; // Ex: 6, 8, 9, 12, 16 ou todas
}

/**
 * Gera os blocos numerados associando-os com as perguntas disponíveis.
 * Se houver mais perguntas do que o total de blocos desejado, embaralha e seleciona a quantidade configurada.
 */
export function generateQuizBlocks(
  questions: Array<{ id: string }>,
  desiredCount: number = 12
): QuizBlockItem[] {
  if (!questions || questions.length === 0) return [];

  // Clona e embaralha as perguntas
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  
  // Limita à quantidade desejada (ou ao número máximo de perguntas se for menor)
  const actualCount = Math.max(1, Math.min(desiredCount, shuffled.length));
  const selectedQuestions = shuffled.slice(0, actualCount);

  return selectedQuestions.map((q, index) => ({
    id: `block-${index + 1}`,
    number: index + 1,
    questionId: q.id,
    status: 'unrevealed',
  }));
}

/**
 * Calcula as dimensões recomendadas da grade (colunas x linhas) com base no número de blocos
 */
export function getGridColumns(totalBlocks: number): number {
  if (totalBlocks <= 4) return 2;
  if (totalBlocks <= 6) return 3;
  if (totalBlocks <= 8) return 4;
  if (totalBlocks <= 9) return 3;
  if (totalBlocks <= 12) return 4;
  if (totalBlocks <= 16) return 4;
  if (totalBlocks <= 20) return 5;
  return 5;
}
