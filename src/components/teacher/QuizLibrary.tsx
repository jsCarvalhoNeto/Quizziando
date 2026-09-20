import React, { useState, useMemo } from 'react';
import { 
  Search, 
  LayoutGrid, 
  List as ListIcon, 
  Plus, 
  Sparkles, 
  Star, 
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
  const [activeTab, setActiveTab] = useState<'recent' | 'all' | 'favorites' | 'drafts'>('all');
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
        // Quizzes salvos nos últimos 7 dias
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
    <div className="flex flex-col gap-6 w-full">
      {/* Barra de Ações Superiores da Biblioteca (Estilo Kahoot) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        {/* Abas Superiores */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'all'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Todos os Quizzes ({quizzes.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('recent')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'recent'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Recentes
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('favorites')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'favorites'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>Favoritos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('drafts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'drafts'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Rascunhos
          </button>
        </div>

        {/* Busca e Alternância de Visualização (Grid/Lista) */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar quizzes..."
              className="w-full py-2 pl-9 pr-3 text-xs rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
            />
          </div>

          {/* Botões de Grade / Lista */}
          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Visualização em Grade"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Visualização em Lista"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Filtro de Pastas (se houver pastas cadastradas) */}
      {folders.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
            <Filter className="w-3 h-3 text-purple-400" />
            Pastas:
          </span>
          <button
            type="button"
            onClick={() => setSelectedFolderId(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
              selectedFolderId === null
                ? 'bg-white/15 text-white'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            Todas as pastas
          </button>
          {folders.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedFolderId(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all border ${
                selectedFolderId === f.id
                  ? 'bg-purple-600/30 border-purple-500/50 text-white'
                  : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: f.color || '#A855F7' }} />
              <span>{f.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Listagem dos Quizzes */}
      {filteredQuizzes.length > 0 ? (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'
            : 'flex flex-col gap-2.5'
        }>
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
        /* Estado Vazio Elegante */
        <div className="flex flex-col items-center justify-center p-12 rounded-3xl border border-dashed border-white/15 bg-white/[0.02] text-center max-w-xl mx-auto my-6">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mb-4 text-purple-400 shadow-lg shadow-purple-600/10">
            <FileQuestion className="w-8 h-8" />
          </div>
          <h3 className="font-extrabold text-lg text-white mb-1">
            {searchQuery ? 'Nenhum quiz encontrado' : 'Sua biblioteca está vazia'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
            {searchQuery 
              ? `Não foram encontrados quizzes correspondentes a "${searchQuery}". Tente outro termo.`
              : 'Crie seu primeiro quiz interativo ou acesse o banco de questões para montar suas perguntas e lançar rodadas empolgantes!'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onCreateNewQuiz}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-500/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Novo Quiz</span>
            </button>

            <button
              type="button"
              onClick={onOpenQuestionManager}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold transition-all"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Explorar Banco de Questões</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizLibrary;
