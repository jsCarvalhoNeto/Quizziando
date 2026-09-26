import { useState, useEffect, useCallback } from 'react';
import { 
  HelpCircle, 
  Search, 
  RefreshCw, 
  Filter, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Lightbulb,
  BookOpen
} from 'lucide-react';
import { 
  fetchAdminQuestions, 
  fetchAdminCategories, 
  deleteAdminQuestion, 
  type AdminQuestion, 
  type AdminCategory 
} from '../../lib/adminService';

interface AdminQuestionsProps {
  initialCategoryId?: string | null;
}

export default function AdminQuestions({ initialCategoryId }: AdminQuestionsProps) {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryId || 'all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);
  const pageSize = 20;

  useEffect(() => {
    if (initialCategoryId) {
      setSelectedCategory(initialCategoryId);
    }
  }, [initialCategoryId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [qData, catsData] = await Promise.all([
        fetchAdminQuestions({ limit: 2000 }),
        fetchAdminCategories()
      ]);
      setQuestions(qData);
      setCategories(catsData);
    } catch (err) {
      console.error('Erro ao carregar banco de questões:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (questionId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente esta pergunta do Supabase?')) {
      return;
    }

    setQuestions(prev => prev.filter(q => q.id !== questionId));
    const res = await deleteAdminQuestion(questionId);
    if (!res.success) {
      setFeedback(`Erro ao excluir pergunta: ${res.error}`);
      loadData();
    } else {
      setFeedback('Pergunta excluída com sucesso!');
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = 
      q.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.category_name && q.category_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.explanation && q.explanation.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || q.category_id === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;

    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const paginatedQuestions = filteredQuestions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getDifficultyBadge = (diff?: string) => {
    switch (diff) {
      case 'easy':
        return <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Fácil</span>;
      case 'medium':
        return <span style={{ backgroundColor: 'rgba(234, 179, 8, 0.2)', color: '#facc15', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Média</span>;
      case 'hard':
        return <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Difícil</span>;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Feedback */}
      {feedback && (
        <div 
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: '#38bdf8',
            fontSize: '0.9rem',
            fontWeight: 500
          }}
        >
          {feedback}
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', minWidth: '260px', flex: 1, maxWidth: '380px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Buscar pelo enunciado da pergunta..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Filtro por Categoria */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BookOpen size={16} style={{ color: '#94a3b8' }} />
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                fontSize: '0.875rem',
                outline: 'none',
                maxWidth: '220px',
                cursor: 'pointer'
              }}
            >
              <option value="all">Todos os Quizzes ({categories.length})</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.questions_count || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Dificuldade */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1e293b', padding: '4px', borderRadius: '8px', border: '1px solid #334155' }}>
            <Filter size={14} style={{ color: '#94a3b8', marginLeft: '6px' }} />
            {(['all', 'easy', 'medium', 'hard'] as const).map((diff) => (
              <button
                key={diff}
                onClick={() => { setSelectedDifficulty(diff); setCurrentPage(1); }}
                className={`admin-btn ${selectedDifficulty === diff ? 'primary' : 'outline'}`}
                style={{ fontSize: '0.75rem', padding: '5px 10px', border: 'none' }}
              >
                {diff === 'all' && 'Todas'}
                {diff === 'easy' && 'Fácil'}
                {diff === 'medium' && 'Média'}
                {diff === 'hard' && 'Difícil'}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={loadData} 
          disabled={loading} 
          className="admin-btn outline"
          title="Recarregar perguntas"
        >
          <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Atualizar ({filteredQuestions.length})
        </button>
      </div>

      {/* Lista de Perguntas */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
          <RefreshCw size={32} className="spin-anim" style={{ margin: '0 auto 16px', display: 'block', color: '#38bdf8' }} />
          Carregando banco de questões do Supabase...
        </div>
      ) : paginatedQuestions.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
          <HelpCircle size={40} style={{ margin: '0 auto 12px', color: '#64748b' }} />
          <h3 style={{ color: '#f8fafc', marginBottom: '8px' }}>Nenhuma questão encontrada</h3>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>Tente ajustar a busca ou os filtros de quiz e dificuldade.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {paginatedQuestions.map((q, idx) => {
            const indexNumber = (currentPage - 1) * pageSize + idx + 1;
            const catColor = q.category_color || '#38bdf8';

            return (
              <div
                key={q.id}
                style={{
                  background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                  border: '1px solid #334155',
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                }}
              >
                {/* Cabeçalho da Pergunta */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span 
                      style={{ 
                        background: '#334155', 
                        color: '#f8fafc', 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        padding: '3px 8px', 
                        borderRadius: '6px' 
                      }}
                    >
                      #{indexNumber}
                    </span>

                    <span 
                      style={{ 
                        backgroundColor: `${catColor}25`, 
                        color: catColor, 
                        border: `1px solid ${catColor}60`,
                        fontSize: '0.8rem', 
                        fontWeight: 600, 
                        padding: '2px 10px', 
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <BookOpen size={13} /> {q.category_name}
                    </span>

                    {getDifficultyBadge(q.difficulty)}

                    <span 
                      style={{ 
                        fontSize: '0.75rem', 
                        color: '#94a3b8', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        marginLeft: '4px'
                      }}
                    >
                      <Clock size={13} /> {q.time_limit || 15}s
                    </span>
                  </div>

                  <button
                    onClick={() => handleDelete(q.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '6px',
                      transition: 'color 0.2s'
                    }}
                    title="Excluir Pergunta"
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Enunciado */}
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.5 }}>
                  {q.question_text}
                </div>

                {/* Alternativas */}
                {q.alternatives && q.alternatives.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px' }}>
                    {q.alternatives.map((alt, aIdx) => {
                      const isCorrect = alt.is_correct;
                      return (
                        <div
                          key={alt.id || aIdx}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: isCorrect ? '1px solid #22c55e' : '1px solid #334155',
                            backgroundColor: isCorrect ? 'rgba(34, 197, 94, 0.15)' : '#0f172a',
                            color: isCorrect ? '#4ade80' : '#cbd5e1',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                          }}
                        >
                          <div 
                            style={{ 
                              width: '20px', 
                              height: '20px', 
                              borderRadius: '50%', 
                              backgroundColor: isCorrect ? '#22c55e' : '#334155', 
                              color: '#fff', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              flexShrink: 0
                            }}
                          >
                            {String.fromCharCode(65 + aIdx)}
                          </div>
                          <span style={{ flex: 1, wordBreak: 'break-word' }}>
                            {alt.alternative_text}
                          </span>
                          {isCorrect && <CheckCircle2 size={16} style={{ color: '#22c55e', flexShrink: 0 }} />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Explicação Pedagógica (se existir) */}
                {q.explanation && (
                  <div 
                    style={{ 
                      marginTop: '4px',
                      padding: '10px 14px', 
                      borderRadius: '8px', 
                      backgroundColor: 'rgba(56, 189, 248, 0.08)', 
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      fontSize: '0.825rem',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      lineHeight: 1.4
                    }}
                  >
                    <Lightbulb size={16} style={{ color: '#38bdf8', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ color: '#38bdf8' }}>Explicação: </strong>
                      {q.explanation}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '16px 20px', 
            background: '#1e293b', 
            borderRadius: '12px', 
            border: '1px solid #334155',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Página <strong style={{ color: '#f8fafc' }}>{currentPage}</strong> de <strong style={{ color: '#f8fafc' }}>{totalPages}</strong> ({filteredQuestions.length} questões encontradas)
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="admin-btn outline"
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              <ChevronLeft size={16} /> Anterior
            </button>

            <span style={{ fontSize: '0.85rem', color: '#cbd5e1', padding: '0 8px' }}>
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="admin-btn outline"
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              Próxima <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
