export interface QuestionRef { id: string; category_id: string }

/** Only categories with unused questions can participate in the draw. */
export function eligibleCategories<T extends { id: string }>(
  categories: T[], questions: QuestionRef[], selectedIds: string[], usedIds: string[],
): T[] {
  const used = new Set(usedIds);
  const available = new Set(questions.filter(q => !used.has(q.id)).map(q => q.category_id));
  return categories.filter(c => selectedIds.includes(c.id) && available.has(c.id));
}

export function remainingSeconds(deadline: string | null, serverOffset = 0, now = Date.now()): number {
  if (!deadline) return 0;
  return Math.max(0, Math.ceil((Date.parse(deadline) - now - serverOffset) / 1000));
}
