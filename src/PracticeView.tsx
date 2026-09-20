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
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
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
      const cats = localCategories.length ? localCategories : seedCategories;
      const quests = localQuestions.length ? localQuestions : seedQuestions;
      setCategories(cats);
      setQuestions(quests);
      setSelectedCategoryIds(cats.map(c => c.id));
    }).catch(() => {
      if (!cancelled) {
        setCategories(seedCategories);
        setQuestions(seedQuestions);
        setSelectedCategoryIds(seedCategories.map(c => c.id));
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [seedCategories, seedQuestions]);

  const eligible = questions.filter(question => question.alternatives.length === 4 &&
    (difficulty === 'all' || (question.difficulty || 'medium') === difficulty) &&
    selectedCategoryIds.includes(question.category_id));

  const needsReview = eligible.filter(question => progress[question.id]?.needsReview).length;

  const start = (nextMode: 'all' | 'review') => {
    if (selectedCategoryIds.length === 0) {
      setError('Por favor, selecione pelo menos uma categoria para treinar.');
      return;
    }
    const pool = eligible.filter(question => nextMode === 'all' || progress[question.id]?.needsReview);
    if (!pool.length) {
      setError(nextMode === 'review'
        ? 'Você ainda não tem erros para revisar nas categorias e dificuldade selecionadas.'
        : 'Não há perguntas disponíveis para os filtros selecionados.');
      return;
    }
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
      const updatedCats = getLocalCategories();
      setCategories(updatedCats);
      setQuestions(getLocalQuestions());
      setSelectedCategoryIds(updatedCats.map(c => c.id));
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível importar o acervo.'); }
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategoryIds(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const category = categories.find(item => item.id === current?.category_id);
  const correctIndex = current?.alternatives.findIndex(alternative => alternative.isCorrect) ?? -1;

  return <main style={{ minHeight: '100vh', background: '#0f1022', color: 'white', padding: '32px max(20px, 7vw)', fontFamily: 'sans-serif' }}>
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          type="button"
          onClick={mode ? () => { setMode(null); setCurrent(null); } : onBack}
          style={{
            padding: '10px 18px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'white',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s'
          }}
        >
          ← {mode ? 'Configurar treino' : 'Voltar ao Menu'}
        </button>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>📘 Treino individual</h1>
      </div>
      {mode && (
        <span style={{ fontSize: 13, color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '6px 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.08)' }}>
          {mode === 'review' ? 'Modo Revisão' : 'Modo Geral'}
        </span>
      )}
    </header>

    {loading ? <p>Carregando acervo...</p> : <>
      {error && <p role="alert" style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '12px 16px', borderRadius: 12, marginBottom: 16 }}>{error}</p>}

      {!mode && <section style={{ maxWidth: 760, display: 'grid', gap: 22 }}>
        <p style={{ margin: 0, color: '#cbd5e1', fontSize: 15, lineHeight: 1.5 }}>
          Pratique no seu ritmo. Seus erros ficam salvos neste navegador para revisão.
        </p>

        {/* SELEÇÃO DE CATEGORIAS */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#a78bfa' }}>
              Categorias ({selectedCategoryIds.length} de {categories.length} selecionadas)
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setSelectedCategoryIds(categories.map(c => c.id))}
                style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', color: '#c4b5fd', cursor: 'pointer', fontWeight: 600 }}
              >
                ✓ Todas
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategoryIds([])}
                style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}
              >
                ✕ Nenhuma
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10, maxHeight: 260, overflowY: 'auto', paddingRight: 4 }}>
            {categories.map(cat => {
              const isSelected = selectedCategoryIds.includes(cat.id);
              const catColor = cat.color || '#8b5cf6';
              const count = questions.filter(q => q.category_id === cat.id && q.alternatives.length === 4 && (difficulty === 'all' || (q.difficulty || 'medium') === difficulty)).length;
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: isSelected ? `${catColor}20` : 'rgba(255,255,255,0.02)',
                    border: isSelected ? `1.5px solid ${catColor}` : '1.5px solid rgba(255,255,255,0.07)',
                    color: isSelected ? 'white' : '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: catColor, flexShrink: 0, boxShadow: isSelected ? `0 0 8px ${catColor}` : 'none' }} />
                    <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cat.name}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? '#e2e8f0' : '#64748b', flexShrink: 0 }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedCategoryIds.length === 0 && (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
              ⚠️ Selecione ao menos uma categoria para treinar.
            </p>
          )}
        </div>

        {/* DIFICULDADE */}
        <label style={{ display: 'block' }}>
          <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#a78bfa' }}>
            Dificuldade
          </span>
          <select
            value={difficulty}
            onChange={event => setDifficulty(event.target.value as typeof difficulty)}
            style={{ display: 'block', width: '100%', padding: '12px 14px', marginTop: 8, borderRadius: 12, background: '#1e2142', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, outline: 'none' }}
          >
            <option value="all">Todas as dificuldades</option>
            <option value="easy">Fácil</option>
            <option value="medium">Média</option>
            <option value="hard">Difícil</option>
          </select>
        </label>

        {/* RESUMO DE DISPONIBILIDADE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 14, color: '#94a3b8' }}>
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
            {eligible.length} {eligible.length === 1 ? 'pergunta disponível' : 'perguntas disponíveis'}
          </span>
          <span>·</span>
          <span style={{ color: needsReview > 0 ? '#fca5a5' : '#94a3b8', fontWeight: needsReview > 0 ? 600 : 400 }}>
            {needsReview} {needsReview === 1 ? 'para revisar' : 'para revisar'}
          </span>
        </div>

        {/* BOTÕES DE INÍCIO */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => start('all')}
            disabled={eligible.length === 0}
            style={{
              padding: '14px 26px',
              borderRadius: 14,
              background: eligible.length > 0 ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'rgba(255,255,255,0.1)',
              color: 'white',
              fontWeight: 700,
              fontSize: 15,
              cursor: eligible.length > 0 ? 'pointer' : 'not-allowed',
              border: 'none',
              boxShadow: eligible.length > 0 ? '0 4px 20px rgba(124,58,237,0.4)' : 'none',
              opacity: eligible.length > 0 ? 1 : 0.5,
              transition: 'all 0.2s'
            }}
          >
            Treino geral
          </button>
          <button
            type="button"
            onClick={() => start('review')}
            disabled={needsReview === 0}
            style={{
              padding: '14px 26px',
              borderRadius: 14,
              background: needsReview > 0 ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'rgba(255,255,255,0.06)',
              color: 'white',
              fontWeight: 700,
              fontSize: 15,
              cursor: needsReview > 0 ? 'pointer' : 'not-allowed',
              border: 'none',
              boxShadow: needsReview > 0 ? '0 4px 20px rgba(37,99,235,0.4)' : 'none',
              opacity: needsReview > 0 ? 1 : 0.5,
              transition: 'all 0.2s'
            }}
          >
            Revisar erros ({needsReview})
          </button>
        </div>

        {sessionAnswered > 0 && (
          <p style={{ margin: 0, fontSize: 13, color: '#a78bfa' }}>
            Última sessão: {sessionCorrect}/{sessionAnswered} acertos ({Math.round((sessionCorrect / sessionAnswered) * 100)}%).
          </p>
        )}

        <label style={{ color: '#93c5fd', cursor: 'pointer', fontSize: 13, marginTop: 8 }}>
          Importar acervo JSON para treinar sem organizador
          <input
            type="file"
            accept=".json,application/json"
            style={{ display: 'block', marginTop: 8 }}
            onChange={event => {
              const file = event.target.files?.[0];
              if (file) void importBank(file);
              event.target.value = '';
            }}
          />
        </label>
      </section>}

      {mode && current && <section style={{ maxWidth: 900, padding: 28, borderRadius: 20, background: '#1d2040', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p style={{ color: '#c4b5fd', margin: '0 0 12px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: category?.color || '#8b5cf6' }} />
          <strong>{category?.name || 'Pergunta'}</strong>
          <span>·</span>
          <span>{current.difficulty === 'easy' ? 'Fácil' : current.difficulty === 'hard' ? 'Difícil' : 'Média'}</span>
          <span>·</span>
          <span>{sessionAnswered} respondidas ({sessionCorrect} acertos)</span>
        </p>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 20px', lineHeight: 1.4 }}>{current.question_text}</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {current.alternatives.map((alternative, index) => <button
            key={index}
            disabled={selectedIndex !== null}
            onClick={() => answer(index)}
            style={{
              textAlign: 'left',
              padding: '16px 20px',
              borderRadius: 12,
              color: 'white',
              background: selectedIndex === null ? '#282b54' : alternative.isCorrect ? '#166534' : selectedIndex === index ? '#991b1b' : '#282b54',
              border: selectedIndex === null ? '1px solid rgba(255,255,255,0.06)' : alternative.isCorrect ? '1px solid #22c55e' : selectedIndex === index ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.06)',
              opacity: selectedIndex !== null && !alternative.isCorrect && selectedIndex !== index ? 0.6 : 1,
              cursor: selectedIndex === null ? 'pointer' : 'default',
              fontSize: 15,
              transition: 'all 0.15s ease'
            }}
          >
            <strong style={{ marginRight: 8, color: '#a78bfa' }}>{'ABCD'[index]}.</strong> {alternative.text}
          </button>)}
        </div>
        {selectedIndex !== null && <div style={{ marginTop: 22, padding: 18, borderRadius: 14, background: '#25284c', border: '1px solid rgba(255,255,255,0.08)' }}>
          <strong style={{ color: selectedIndex === correctIndex ? '#86efac' : '#fca5a5', fontSize: 16 }}>
            {selectedIndex === correctIndex ? '✓ Correto!' : `✗ A resposta correta é ${'ABCD'[correctIndex]}.`}
          </strong>
          {current.explanation && <p style={{ margin: '10px 0 0', color: '#cbd5e1', fontSize: 14, lineHeight: 1.5 }}>Explicação: {current.explanation}</p>}
          {current.reference_url?.match(/^https?:\/\//i) && <p style={{ margin: '8px 0 0' }}>
            <a href={current.reference_url} target="_blank" rel="noopener noreferrer" style={{ color: '#93c5fd', fontSize: 13, textDecoration: 'underline' }}>
              Ver referência
            </a>
          </p>}
          <button
            type="button"
            onClick={nextQuestion}
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              marginTop: 16,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              color: 'white',
              fontWeight: 700,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(124,58,237,0.4)'
            }}
          >
            Próxima pergunta →
          </button>
        </div>}
      </section>}
    </>}
  </main>;
}
