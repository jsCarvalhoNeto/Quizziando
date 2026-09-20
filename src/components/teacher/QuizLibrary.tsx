import React, { useState, useMemo } from 'react';
import { 
  Search, 
  LayoutGrid, 
  List as ListIcon, 
  Plus, 
  Sparkles, 
  FileQuestion, 
  Filter
} from 'lucide-react';
import { type SavedQuiz } from '../../lib/savedQuizzes';
import QuizCard from './QuizCard';

interface FolderItem {
  id: string;
  name: string;
  color?: string;
}

interface QuizLibraryProps {
  quizzes: SavedQuiz[];
  folders?: FolderItem[];
  onPlayQuiz: (quiz: SavedQuiz) => void;
  onEditQuiz?: (quiz: SavedQuiz) => void;
  onDuplicateQuiz: (quizId: string) => void;
  onToggleFavorite: (quizId: string) => void;
  onDeleteQuiz: (quizId: string) => void;
  onCreateNewQuiz: () => void;
  onOpenQuestionManager: () => void;
}

export const QuizLibrary: React.FC<QuizLibraryProps> = ({
  quizzes,
  folders = [],
  onPlayQuiz,
  onEditQuiz,
  onDuplicateQuiz,
  onToggleFavorite,
  onDeleteQuiz,
  onCreateNewQuiz,
  onOpenQuestionManager,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'favorites' | 'drafts'>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filtragem inteligente de quizzes
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(quiz => {
      // Filtro de texto por nome, tag ou autor
      const matchesSearch = searchQuery.trim() === '' || 
        quiz.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (quiz.tagFilter && quiz.tagFilter.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (quiz.authorName && quiz.authorName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Filtro de pasta
      if (selectedFolderId !== null) {
        if (selectedFolderId === 'none') {
          if (quiz.folderId) return false;
        } else if (quiz.folderId !== selectedFolderId) {
          return false;
        }
      }

      // Filtro de abas
      if (activeTab === 'favorites') return !!quiz.isFavorite;
      if (activeTab === 'recent') {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return new Date(quiz.savedAt).getTime() >= sevenDaysAgo;
      }
      if (activeTab === 'drafts') {
        return (quiz.questionIds && quiz.questionIds.length === 0) || quiz.rounds <= 1;
      }

      return true;
    });
  }, [quizzes, searchQuery, activeTab, selectedFolderId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* ─── Barra de Ações Superiores da Biblioteca (Estilo Kahoot!) ───────── */}
      <div 
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        {/* Abas Superiores (Pílulas Limpas) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto' }}>
          {[
            { id: 'all', label: `Todos os Quizzes (${quizzes.length})` },
            { id: 'recent', label: 'Recentes' },
            { id: 'favorites', label: 'Favoritos' },
            { id: 'drafts', label: 'Rascunhos' },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isActive ? '1px solid #46178f' : '1px solid transparent',
                  backgroundColor: isActive ? '#f3e8ff' : '#ffffff',
                  color: isActive ? '#46178f' : '#64748b',
                  boxShadow: isActive ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Busca e Alternância Grade / Lista */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', width: '240px' }}>
            <Search 
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '15px',
                height: '15px',
                color: '#94a3b8',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar por nome..."
              style={{
                width: '100%',
                height: '36px',
                paddingLeft: '34px',
                paddingRight: '12px',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                color: '#1e293b',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Botões de Grade / Lista */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              padding: '2px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                padding: '6px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: viewMode === 'grid' ? '#f3e8ff' : 'transparent',
                color: viewMode === 'grid' ? '#46178f' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Visualização em Grade"
            >
              <LayoutGrid style={{ width: '16px', height: '16px' }} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                padding: '6px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: viewMode === 'list' ? '#f3e8ff' : 'transparent',
                color: viewMode === 'list' ? '#46178f' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Visualização em Lista"
            >
              <ListIcon style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Filtro de Pastas (se houver) ────────────────────────────────────── */}
      {folders.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Filter style={{ width: '12px', height: '12px' }} />
            Pastas:
          </span>
          <button
            type="button"
            onClick={() => setSelectedFolderId(null)}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: selectedFolderId === null ? '1px solid #46178f' : '1px solid #e2e8f0',
              backgroundColor: selectedFolderId === null ? '#f3e8ff' : '#ffffff',
              color: selectedFolderId === null ? '#46178f' : '#475569',
            }}
          >
            Todas
          </button>
          {folders.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedFolderId(f.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                border: selectedFolderId === f.id ? '1px solid #46178f' : '1px solid #e2e8f0',
                backgroundColor: selectedFolderId === f.id ? '#f3e8ff' : '#ffffff',
                color: selectedFolderId === f.id ? '#46178f' : '#475569',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: f.color || '#46178f' }} />
              <span>{f.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* ─── Listagem dos Quizzes ou Empty State Estilo Kahoot! ─────────────── */}
      {filteredQuizzes.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: viewMode === 'grid' 
              ? 'repeat(auto-fill, minmax(280px, 1fr))' 
              : '1fr',
            gap: '20px',
          }}
        >
          {filteredQuizzes.map(quiz => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              onPlay={onPlayQuiz}
              onEdit={onEditQuiz}
              onDuplicate={onDuplicateQuiz}
              onToggleFavorite={onToggleFavorite}
              onDelete={onDeleteQuiz}
              isCompactList={viewMode === 'list'}
            />
          ))}
        </div>
      ) : (
        /* Estado Vazio Amigável Estilo Kahoot! */
        <div 
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '56px 24px',
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div 
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#f3e8ff',
              color: '#46178f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px',
            }}
          >
            <FileQuestion style={{ width: '32px', height: '32px' }} />
          </div>

          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1e1b4b', marginBottom: '8px' }}>
            Sua biblioteca de quizzes está vazia
          </h3>

          <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '440px', lineHeight: 1.6, marginBottom: '24px' }}>
            {searchQuery 
              ? 'Nenhum quiz encontrado para os termos pesquisados. Tente buscar com outras palavras.'
              : 'Crie seu primeiro quiz interativo ou gere perguntas completas com Inteligência Artificial para animar sua turma!'}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={onCreateNewQuiz}
              style={{
                height: '42px',
                padding: '0 22px',
                borderRadius: '8px',
                backgroundColor: '#1368ce',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(19, 104, 206, 0.3)',
                transition: 'transform 0.1s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0f59b3')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1368ce')}
            >
              <Plus style={{ width: '16px', height: '16px', strokeWidth: 3 }} />
              <span>Criar Meu Primeiro Quiz</span>
            </button>

            <button
              type="button"
              onClick={onOpenQuestionManager}
              style={{
                height: '42px',
                padding: '0 18px',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                color: '#334155',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
            >
              <Sparkles style={{ width: '16px', height: '16px', color: '#8b5cf6' }} />
              <span>Gerar Questões com IA</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizLibrary;
