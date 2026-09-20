import test from 'node:test';
import assert from 'node:assert/strict';
import { readPlayerSession, savePlayerSession, newPlayerToken } from '../src/lib/playerSession.ts';
import { parseLocalGameSnapshot } from '../src/lib/localGameSnapshot.ts';

test('reconexão recupera a identidade secreta da sala, inclusive após mudar o código de caixa', () => {
  const items = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => { items.set(key, value); },
  } });
  const token = newPlayerToken();
  assert.match(token, /^[a-f0-9]{64}$/);
  savePlayerSession('abc123', { token, nickname: 'Ana' });
  assert.deepEqual(readPlayerSession('ABC123'), { token, nickname: 'Ana' });
  assert.equal(readPlayerSession('OTHER'), null);
  items.set('quizziando:player:ABC123', '{broken');
  assert.equal(readPlayerSession('ABC123'), null);
  items.set('quizziando:player:ABC123', JSON.stringify({ token: 'not-secret', nickname: 'Ana' }));
  assert.equal(readPlayerSession('ABC123'), null);
});

test('retomada presencial preserva rodada, pontuação, pergunta e histórico', () => {
  const saved = {
    version: 1, savedAt: '2026-01-01T00:00:00Z',
    players: [
      { name: 'Azul', score: 200, roundResults: [{ answered: true, correct: true }] },
      { name: 'Verde', score: 100, roundResults: [{ answered: false, correct: null }] },
    ],
    totalRounds: 3, hasObstacles: true, selectedCatIds: ['science'],
    currentRound: 2, roundStarterIndex: 1, firstFailed: false,
    phase: 'question-first', selectedCategory: { id: 'science', name: 'Ciências', color: '#fff', icon: 'x' },
    currentQuestion: { id: 'q2', category_id: 'science', question_text: 'Pergunta 2', time_limit: 20, alternatives: [] },
    usedQuestionIds: ['q1', 'q2'], timeLeft: 12, rouletteAngle: 360,
    pointsPerCorrect: 100, pointsOnPass: 50, turnTimeLimit: 20, quickMode: false, tiePolicy: 'shared',
  };
  const restored = parseLocalGameSnapshot(JSON.stringify(saved));
  assert.equal(restored?.currentRound, 2);
  assert.equal(restored?.players[0].score, 200);
  assert.equal(restored?.currentQuestion?.id, 'q2');
  assert.deepEqual(restored?.usedQuestionIds, ['q1', 'q2']);
  assert.equal(parseLocalGameSnapshot(JSON.stringify({ ...saved, players: [] })), null);
  assert.equal(parseLocalGameSnapshot(JSON.stringify({ ...saved, currentRound: 8 })), null);
  assert.equal(parseLocalGameSnapshot('{invalid'), null);
});
