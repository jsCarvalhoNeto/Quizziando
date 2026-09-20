import { useEffect, useState } from 'react';
import { initDb, getLocalCategories, getLocalQuestions, mergeFromSupabaseData, type LocalCategory, type LocalQuestion } from './lib/localDb';
import { parseQuestionBank } from './lib/questionBank';

interface PracticeProgress { attempts: number; correct: number; needsReview: boolean }
const STORAGE_KEY = 'quizziando_practice_progress_v1';

function readProgress(): Record<string, PracticeProgress> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, PracticeProgress>; }
  catch { return {}; }
}

interface Props { onBack: () => void; seedCategories: LocalCategory[]; seedQuestions: LocalQuestion[] }

export default function PracticeView({ onBack, seedCategories, seedQuestions }: Props) {
  const [categories, setCategories] = useState<LocalCategory[]>([]);
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [progress, setProgress] = useState<Record<string, PracticeProgress>>(readProgress);
  const [mode, setMode] = useState<'all' | 'review' | null>(null);
  const [difficulty, setDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [current, setCurrent] = useState<LocalQuestion | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionAnswered, setSessionAnswered] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    initDb().then(() => {
      if (cancelled) return;
      const localCategories = getLocalCategories();
      const localQuestions = getLocalQuestions();
      setCategories(localCategories.length ? localCategories : seedCategories);
      setQuestions(localQuestions.length ? localQuestions : seedQuestions);
    }).catch(() => {
      if (!cancelled) { setCategories(seedCategories); setQuestions(seedQuestions); }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [seedCategories, seedQuestions]);

  const eligible = questions.filter(question => question.alternatives.length === 4 &&
    (difficulty === 'all' || (question.difficulty || 'medium') === difficulty));
  const needsReview = eligible.filter(question => progress[question.id]?.needsReview).length;

  const start = (nextMode: 'all' | 'review') => {
    const pool = eligible.filter(question => nextMode === 'all' || progress[question.id]?.needsReview);
    if (!pool.length) { setError(nextMode === 'review' ? 'Você ainda não tem erros para revisar nesta seleção.' : 'Não há perguntas disponíveis. Importe um acervo primeiro.'); return; }
    setMode(nextMode); setCurrent(pool[Math.floor(Math.random() * pool.length)]);
    setSeenIds([]); setSelectedIndex(null); setSessionCorrect(0); setSessionAnswered(0); setError('');
  };

  const answer = (index: number) => {
    if (!current || selectedIndex !== null) return;
    const correct = current.alternatives[index]?.isCorrect === true;
    setSelectedIndex(index); setSessionAnswered(count => count + 1);
    if (correct) setSessionCorrect(count => count + 1);
    const previous = progress[current.id] || { attempts: 0, correct: 0, needsReview: false };
    const next = { ...progress, [current.id]: { attempts: previous.attempts + 1,
      correct: previous.correct + (correct ? 1 : 0), needsReview: !correct } };
    setProgress(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const nextQuestion = () => {
    if (!current || !mode) return;
    const nextSeen = [...seenIds, current.id];
    const pool = eligible.filter(question => (mode === 'all' || progress[question.id]?.needsReview) && !nextSeen.includes(question.id));
    if (!pool.length) {
      if (mode === 'review') {
        const remaining = eligible.filter(question => progress[question.id]?.needsReview);
        if (remaining.length) { setCurrent(remaining[Math.floor(Math.random() * remaining.length)]); setSeenIds([]); setSelectedIndex(null); return; }
      }
      setCurrent(null); setMode(null); setSelectedIndex(null); return;
    }
    setCurrent(pool[Math.floor(Math.random() * pool.length)]);
    setSeenIds(nextSeen); setSelectedIndex(null);
  };

  const importBank = async (file: File) => {
    if (file.size > 5_000_000) { setError('O arquivo deve ter até 5 MB.'); return; }
    try {
      await initDb();
      const bank = parseQuestionBank(await file.text());
      mergeFromSupabaseData(bank.categories, bank.questions);
      setCategories(getLocalCategories()); setQuestions(getLocalQuestions()); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível importar o acervo.'); }
  };

  const category = categories.find(item => item.id === current?.category_id);
  const correctIndex = current?.alternatives.findIndex(alternative => alternative.isCorrect) ?? -1;

  return <main style={{ minHeight: '100vh', background: '#0f1022', color: 'white', padding: '32px max(20px, 7vw)', fontFamily: 'sans-serif' }}>
    <header style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
      <button onClick={onBack} style={{ padding: '10px 16px', borderRadius: 10, background: '#312e81', color: 'white' }}>← Voltar</button>
      <h1 style={{ margin: 0 }}>Treino individual</h1>
    </header>
    {loading ? <p>Carregando acervo...</p> : <>
      {error && <p role="alert" style={{ color: '#fca5a5' }}>{error}</p>}
      {!mode && <section style={{ maxWidth: 700, display: 'grid', gap: 18 }}>
        <p>Pratique no seu ritmo. Seus erros ficam salvos neste navegador para revisão.</p>
        <label>Dificuldade
          <select value={difficulty} onChange={event => setDifficulty(event.target.value as typeof difficulty)} style={{ display: 'block', width: '100%', padding: 12, marginTop: 8, borderRadius: 10, background: '#24264a', color: 'white' }}>
            <option value="all">Todas</option><option value="easy">Fácil</option><option value="medium">Média</option><option value="hard">Difícil</option>
          </select>
        </label>
        <p>{eligible.length} perguntas disponíveis · {needsReview} para revisar</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={() => start('all')} style={{ padding: '14px 22px', borderRadius: 12, background: '#7c3aed', color: 'white' }}>Treino geral</button>
          <button onClick={() => start('review')} style={{ padding: '14px 22px', borderRadius: 12, background: '#2563eb', color: 'white' }}>Revisar erros</button>
        </div>
        {sessionAnswered > 0 && <p>Última sessão: {sessionCorrect}/{sessionAnswered} acertos.</p>}
        <label style={{ color: '#93c5fd', cursor: 'pointer' }}>Importar acervo JSON para treinar sem organizador
          <input type="file" accept=".json,application/json" style={{ display: 'block', marginTop: 8 }} onChange={event => { const file = event.target.files?.[0]; if (file) void importBank(file); event.target.value = ''; }} />
        </label>
      </section>}
      {mode && current && <section style={{ maxWidth: 900, padding: 28, borderRadius: 20, background: '#1d2040' }}>
        <p style={{ color: '#c4b5fd' }}>{category?.name || 'Pergunta'} · {current.difficulty === 'easy' ? 'Fácil' : current.difficulty === 'hard' ? 'Difícil' : 'Média'} · {sessionAnswered} respondidas</p>
        <h2 style={{ fontSize: 28 }}>{current.question_text}</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {current.alternatives.map((alternative, index) => <button key={index} disabled={selectedIndex !== null} onClick={() => answer(index)} style={{ textAlign: 'left', padding: 18, borderRadius: 12, color: 'white', background: selectedIndex === null ? '#353870' : alternative.isCorrect ? '#166534' : selectedIndex === index ? '#991b1b' : '#353870', opacity: selectedIndex !== null && !alternative.isCorrect && selectedIndex !== index ? 0.6 : 1 }}>
            <strong>{'ABCD'[index]}.</strong> {alternative.text}
          </button>)}
        </div>
        {selectedIndex !== null && <div style={{ marginTop: 22, padding: 18, borderRadius: 12, background: '#25284c' }}>
          <strong style={{ color: selectedIndex === correctIndex ? '#86efac' : '#fca5a5' }}>{selectedIndex === correctIndex ? 'Correto!' : `A resposta correta é ${'ABCD'[correctIndex]}.`}</strong>
          {current.explanation && <p>Explicação: {current.explanation}</p>}
          {current.reference_url?.match(/^https?:\/\//i) && <a href={current.reference_url} target="_blank" rel="noopener noreferrer" style={{ color: '#93c5fd' }}>Ver referência</a>}
          <button onClick={nextQuestion} style={{ display: 'block', padding: '12px 18px', marginTop: 14, borderRadius: 10, background: '#7c3aed', color: 'white' }}>Próxima pergunta</button>
        </div>}
      </section>}
    </>}
  </main>;
}
