import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  RefreshCw, 
  FolderTree, 
  HelpCircle, 
  Trash2, 
  ArrowRight,
  Filter,
  Calendar,
  User,
  Crown,
  Sparkles
} from 'lucide-react';
import { 
  fetchAdminCategories, 
  fetchAdminFolders, 
  deleteAdminCategory, 
  type AdminCategory, 
  type AdminFolder 
} from '../../lib/adminService';

interface AdminQuizzesProps {
  onSelectCategoryQuestions?: (categoryId: string) => void;
}

export default function AdminQuizzes({ onSelectCategoryQuestions }: AdminQuizzesProps) {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [folders, setFolders] = useState<AdminFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [selectedCreator, setSelectedCreator] = useState<string>('all');
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catsData, foldersData] = await Promise.all([
        fetchAdminCategories(),
        fetchAdminFolders()
      ]);
      setCategories(catsData);
      setFolders(foldersData);
    } catch (err) {
      console.error('Erro ao carregar quizzes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lista agregada de criadores ordenados pelos mais ativos
  const creatorsList = useMemo(() => {
    const map = new Map<string, { username: string; name: string; quizzesCount: number; questionsCount: number }>();
    categories.forEach(c => {
      const u = c.creator_username || 'quizziando';
      const existing = map.get(u) || {
        username: u,
        name: c.creator_name || u,
        quizzesCount: 0,
        questionsCount: 0
      };
      existing.quizzesCount += 1;
      existing.questionsCount += (c.questions_count || 0);
      map.set(u, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.quizzesCount - a.quizzesCount);
  }, [categories]);

  const handleDelete = async (categoryId: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o quiz "${name}"? Todas as perguntas deste quiz também poderão ser excluídas ou desvinculadas no banco.`)) {
      return;
    }

    setCategories(prev => prev.filter(c => c.id !== categoryId));
    const res = await deleteAdminCategory(categoryId);
    if (!res.success) {
      setFeedback(`Erro ao excluir quiz: ${res.error}`);
      loadData();
    } else {
      setFeedback(`Quiz "${name}" excluído com sucesso!`);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const filteredCategories = categories.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.folder_name && c.folder_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.creator_username && c.creator_username.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFolder = 
      selectedFolderId === 'all' || 
      (selectedFolderId === 'none' ? !c.folder_id : c.folder_id === selectedFolderId);

    const matchesCreator =
      selectedCreator === 'all' ||
      (c.creator_username || 'quizziando') === selectedCreator;

    return matchesSearch && matchesFolder && matchesCreator;
  });

  const totalQuestions = categories.reduce((sum, c) => sum + (c.questions_count || 0), 0);

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

      {/* Mini Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#1e293b', padding: '16px 20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
            Total de Quizzes / Categorias
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#c084fc' }}>
            {categories.length}
          </div>
        </div>

        <div style={{ background: '#1e293b', padding: '16px 20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
            Pastas Organizadoras
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fbbf24' }}>
            {folders.length}
          </div>
        </div>

        <div style={{ background: '#1e293b', padding: '16px 20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
            Perguntas Vinculadas
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#38bdf8' }}>
            {totalQuestions.toLocaleString('pt-BR')}
          </div>
        </div>
      </div>

      {/* Widget de Ranking de Educadores / Criadores Mais Ativos */}
      {creatorsList.length > 0 && (
        <div 
          style={{
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Crown size={18} style={{ color: '#fbbf24' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
              Educadores Mais Ativos:
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {creatorsList.slice(0, 5).map((cr, idx) => {
              const isSelected = selectedCreator === cr.username;
              return (
                <button
                  key={cr.username}
                  type="button"
                  onClick={() => setSelectedCreator(isSelected ? 'all' : cr.username)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: isSelected ? '1px solid #a855f7' : '1px solid #334155',
                    backgroundColor: isSelected ? 'rgba(168, 85, 247, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                    color: isSelected ? '#d8b4fe' : '#cbd5e1',
                    transition: 'all 0.15s ease'
                  }}
                  title={`Filtrar quizzes de @${cr.username}`}
                >
                  <span>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '👤'}</span>
                  <span>@{cr.username}</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.85, backgroundColor: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: '4px' }}>
                    {cr.quizzesCount} {cr.quizzesCount === 1 ? 'quiz' : 'quizzes'}
                  </span>
                </button>
              );
            })}
            {selectedCreator !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCreator('all')}
                style={{
                  fontSize: '0.75rem',
                  color: '#f87171',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontWeight: 600
                }}
              >
                Limpar filtro
              </button>
            )}
          </div>
        </div>
      )}

      {/* Controles de Filtro e Busca */}
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
          <div style={{ position: 'relative', minWidth: '240px', flex: 1, maxWidth: '380px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Buscar quiz, pasta ou @usuário..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} style={{ color: '#94a3b8' }} />
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                fontSize: '0.875rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">Todas as Pastas</option>
              <option value="none">Sem Pasta Vinculada</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Usuário Criador */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={16} style={{ color: '#c084fc' }} />
            <select
              value={selectedCreator}
              onChange={(e) => setSelectedCreator(e.target.value)}
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                border: selectedCreator !== 'all' ? '1px solid #c084fc' : '1px solid #334155',
                backgroundColor: selectedCreator !== 'all' ? '#1e1b4b' : '#0f172a',
                color: '#f8fafc',
                fontSize: '0.875rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">Todos os Criadores ({creatorsList.length})</option>
              {creatorsList.map(cr => (
                <option key={cr.username} value={cr.username}>
                  @{cr.username} ({cr.quizzesCount} {cr.quizzesCount === 1 ? 'quiz' : 'quizzes'})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button 
          onClick={loadData} 
          disabled={loading} 
          className="admin-btn outline"
          title="Recarregar categorias"
        >
          <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Atualizar Lista ({filteredCategories.length})
        </button>
      </div>

      {/* Grid de Quizzes / Categorias */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
          <RefreshCw size={32} className="spin-anim" style={{ margin: '0 auto 16px', display: 'block', color: '#38bdf8' }} />
          Carregando quizzes e categorias do Supabase...
        </div>
      ) : filteredCategories.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
          <BookOpen size={40} style={{ margin: '0 auto 12px', color: '#64748b' }} />
          <h3 style={{ color: '#f8fafc', marginBottom: '8px' }}>Nenhum quiz ou categoria encontrado</h3>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>Tente alterar o filtro de busca ou a pasta selecionada.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filteredCategories.map(c => {
            const catColor = c.color || '#8b5cf6';
            return (
              <div 
                key={c.id}
                style={{
                  background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                  border: '1px solid #334155',
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  transition: 'transform 0.2s, border-color 0.2s',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div 
                      style={{ 
                        width: '42px', 
                        height: '42px', 
                        borderRadius: '10px', 
                        backgroundColor: `${catColor}25`, 
                        border: `1px solid ${catColor}60`,
                        color: catColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700
                      }}
                    >
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '1.05rem', fontWeight: 600 }}>
                        {c.name}
                      </h4>
                      <span 
                        style={{ 
                          fontSize: '0.75rem', 
                          color: '#fbbf24', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          marginTop: '2px'
                        }}
                      >
                        <FolderTree size={12} /> {c.folder_name}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(c.id, c.name)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '6px',
                      transition: 'color 0.2s'
                    }}
                    title="Excluir Categoria"
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b'
                  }}
                >
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HelpCircle size={15} style={{ color: '#38bdf8' }} /> Questões
                  </span>
                  <span style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.95rem' }}>
                    {c.questions_count || 0}
                  </span>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #334155', paddingTop: '12px', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedCreator(c.creator_username || 'quizziando')}
                      style={{ 
                        fontSize: '0.75rem', 
                        color: '#c084fc', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        cursor: 'pointer',
                        backgroundColor: 'rgba(192, 132, 252, 0.12)',
                        border: '1px solid rgba(192, 132, 252, 0.25)',
                        padding: '2px 7px',
                        borderRadius: '5px',
                        fontWeight: 600
                      }}
                      title={`Filtrar apenas quizzes criados por @${c.creator_username || 'quizziando'}`}
                    >
                      <User size={11} /> @{c.creator_username || 'quizziando'}
                    </button>

                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} />
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : 'Data não informada'}
                    </span>
                  </div>

                  {onSelectCategoryQuestions && (
                    <button
                      onClick={() => onSelectCategoryQuestions(c.id)}
                      className="admin-btn outline"
                      style={{ fontSize: '0.75rem', padding: '4px 10px', gap: '4px', flexShrink: 0 }}
                    >
                      Ver Questões <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
