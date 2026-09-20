import test from 'node:test';
import assert from 'node:assert/strict';
import { eligibleCategories, localCategoryPool, remainingSeconds } from '../src/lib/gameRules.ts';

const categories = [{ id: 'science' }, { id: 'history' }];
const questions = [
  { id: 's1', category_id: 'science' },
  { id: 's2', category_id: 'science' },
  { id: 'h1', category_id: 'history' },
];

test('categorias esgotadas saem do sorteio sem mudar a categoria anunciada', () => {
  assert.deepEqual(eligibleCategories(categories, questions, ['science', 'history'], ['s1', 's2']), [{ id: 'history' }]);
  assert.deepEqual(localCategoryPool(categories, questions, ['science'], ['s1', 's2']), {
    categories: [{ id: 'science' }], resetUsed: true,
  });
  assert.deepEqual(localCategoryPool(categories, [], ['science'], ['s1', 's2']), {
    categories: [], resetUsed: false,
  });
});

test('tempo oficial respeita o relógio do servidor e encerra no limite', () => {
  const deadline = '2026-01-01T00:00:10.000Z';
  const now = Date.parse('2026-01-01T00:00:00.000Z');
  assert.equal(remainingSeconds(deadline, 2000, now), 8);
  assert.equal(remainingSeconds(deadline, 2000, now + 7999), 1);
  assert.equal(remainingSeconds(deadline, 2000, now + 8000), 0);
  assert.equal(remainingSeconds(deadline, 2000, now + 9000), 0);
  assert.equal(remainingSeconds(null, 0, now), 0);
});
