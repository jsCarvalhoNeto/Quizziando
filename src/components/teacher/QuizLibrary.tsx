import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  LayoutGrid, 
  List as ListIcon, 
  Plus, 
  Sparkles, 
  FileQuestion, 
  Play,
  MoreVertical,
  Edit3,
  Folder,
  FolderPlus,
  Check,
  RotateCw,
  Save,
  X,
  AlertCircle,
  Wifi,
  Smartphone,
  ChevronRight,
  PlusCircle,
  Trash2,
  AlertTriangle,
  Loader2,
  Database,
  Star,
  Zap,
  Calendar,
  Hand,
  Users
} from 'lucide-react';
import { type SavedQuiz } from '../../lib/savedQuizzes';
import { type Category, type Question, sfx } from '../../App';
import QuizCard from './QuizCard';

interface FolderItem {
  id: string;
  name: string;
  color?: string;
}

interface QuizLibraryProps {
  quizzes: SavedQuiz[];
  categories: Category[];
  questions: Question[];
  folders: FolderItem[];
  selectedFolderId: string | null;
  currentFolderName?: string;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolderClick: (e: React.MouseEvent) => void;
  onPlayCategory: (category: Category) => void;
  onEditCategory?: (category: Category) => void;
  onPlayQuiz: (quiz: SavedQuiz) => void;
  onEditQuiz?: (quiz: SavedQuiz) => void;
  onDuplicateQuiz: (quizId: string) => void;
  onToggleFavorite: (quizId: string) => void;
  onDeleteQuiz: (quizId: string) => void;
  onDeleteCategory?: (categoryId: string) => Promise<void> | void;
  onCreateNewQuiz: () => void;
  onStartRouletteGame: (categoryIds: string[], mode: 'online' | 'local' | 'hybrid', localPlayMode?: 'teams' | 'individual') => void;
  onStartClassicGame?: (categoryIds: string[], mode: 'online' | 'local' | 'hybrid', localPlayMode?: 'teams' | 'individual', format?: 'classic' | 'blocks', totalBlocks?: number) => void;
  onSaveRouletteQuiz: (name: string, categoryIds: string[]) => void;
  onOpenQuestionManager: (mode?: 'bank' | 'create') => void;
}

// Gradientes coloridos e vibrantes para as capas dos blocos estilo Kahoot
const BLOCK_GRADIENTS = [
  'linear-gradient(135deg, #46178f 0%, #1368ce 100%)',
  'linear-gradient(135deg, #059669 0%, #0284c7 100%)',
  'linear-gradient(135deg, #d97706 0%, #dc2626 100%)',
  'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
  'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
  'linear-gradient(135deg, #0d9488 0%, #1e40af 100%)',
  'linear-gradient(135deg, #e11d48 0%, #4f46e5 100%)',
  'linear-gradient(135deg, #0284c7 0%, #059669 100%)',
];

// Formatação segura de data para exibição (com fallback da data de hoje para quizzes prévios)
const formatQuizDate = (dateStr?: string) => {
  if (!dateStr) {
    return new Date().toLocaleDateString('pt-BR');
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toLocaleDateString('pt-BR');
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return new Date().toLocaleDateString('pt-BR');
  }
};

export const QuizLibrary: React.FC<QuizLibraryProps> = ({
  quizzes,
  categories,
  questions,
  folders,
  selectedFolderId,
  currentFolderName,
  onSelectFolder,
  onCreateFolderClick,
  onPlayCategory: _onPlayCategory,
  onEditCategory,
  onPlayQuiz,
  onEditQuiz,
  onDuplicateQuiz,
  onToggleFavorite,
  onDeleteQuiz,
  onDeleteCategory,
  onCreateNewQuiz,
  onStartRouletteGame,
  onStartClassicGame,
  onSaveRouletteQuiz,
  onOpenQuestionManager,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'popular' | 'favorites'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [openMenuCatId, setOpenMenuCatId] = useState<string | null>(null);

  // 🖱️ Fecha o menu de contexto do quiz ao clicar fora dele
  useEffect(() => {
    if (!openMenuCatId) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(`[data-category-menu-container="${openMenuCatId}"]`)) {
        return;
      }
      setOpenMenuCatId(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [openMenuCatId]);

  // ⭐ Estado de Quizzes/Categorias Favoritas persistido em localStorage
  const [favoriteCategoryIds, setFavoriteCategoryIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('quizziando_favorite_categories_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleToggleFavoriteCategory = (catId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavoriteCategoryIds(prev => {
      const next = prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId];
      try {
        localStorage.setItem('quizziando_favorite_categories_v1', JSON.stringify(next));
      } catch (err) {
        console.error('Erro ao salvar categorias favoritas:', err);
      }
      return next;
    });
  };

  // 🎡 Estado de Seleção para o Modo Roleta (Mínimo 2, Máximo 12)
  const [selectedQuizIds, setSelectedQuizIds] = useState<string[]>([]);
  const [selectionWarning, setSelectionWarning] = useState('');

  // Estado do Modal para Salvar Quiz com Roleta
  const [showSaveRouletteModal, setShowSaveRouletteModal] = useState(false);
  const [rouletteQuizName, setRouletteQuizName] = useState('');

  // 🎮 Estado do Modal de Escolha do Modo de Jogo com Roleta, Clássico ou Blocos
  const [showRouletteModeModal, setShowRouletteModeModal] = useState(false);
  const [playSessionType, setPlaySessionType] = useState<'classic' | 'roulette' | 'blocks'>('classic');
  const [blocksCount, setBlocksCount] = useState<number>(12);

  // 🗑️ Estado do Modal de Confirmação para Excluir Quiz (Categoria)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  // Mapeamento de contagem de perguntas por categoria
  const questionCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    questions.forEach(q => {
      const current = map.get(q.category_id) || 0;
      map.set(q.category_id, current + 1);
    });
    return map;
  }, [questions]);

  // Mapeamento de nome de pasta por ID
  const folderMap = useMemo(() => {
    const map = new Map<string, FolderItem>();
    folders.forEach(f => map.set(f.id, f));
    return map;
  }, [folders]);

  // Filtragem das categorias (que são os quizzes principais)
  const filteredCategories = useMemo(() => {
    return categories.filter(cat => {
      // Filtro de Pasta
      if (selectedFolderId !== null) {
        if (cat.folder_id !== selectedFolderId) return false;
      }

      // Filtro de Favoritos
      if (activeTab === 'favorites') {
        if (!favoriteCategoryIds.includes(cat.id)) return false;
      }

      // Filtro de Busca
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = cat.name.toLowerCase().includes(query);
        const folder = cat.folder_id ? folderMap.get(cat.folder_id) : null;
        const matchesFolder = folder?.name.toLowerCase().includes(query);
        if (!matchesName && !matchesFolder) return false;
      }

      return true;
    }).sort((a, b) => {
      if (activeTab === 'popular') {
        const countA = questionCountByCategory.get(a.id) || 0;
        const countB = questionCountByCategory.get(b.id) || 0;
        return countB - countA;
      }
      return a.name.localeCompare(b.name);
    });
  }, [categories, selectedFolderId, searchQuery, activeTab, favoriteCategoryIds, questionCountByCategory, folderMap]);

  // Alternar seleção de um quiz para o jogo
  const handleToggleSelectQuiz = (catId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedQuizIds(prev => {
      if (prev.includes(catId)) {
        setSelectionWarning('');
        return prev.filter(id => id !== catId);
      }
      if (prev.length >= 12) {
        setSelectionWarning('Limite atingido: a seleção comporta no máximo 12 quizzes.');
        return prev;
      }
      setSelectionWarning('');
      return [...prev, catId];
    });
  };

  // Selecionar todos os quizzes visíveis
  const handleSelectAllVisible = (visibleIdsOrEvent?: string[] | React.MouseEvent) => {
    const ids = Array.isArray(visibleIdsOrEvent) ? visibleIdsOrEvent : filteredCategories.map(c => c.id);
    if (selectedQuizIds.length === ids.length && ids.length > 0) {
      setSelectedQuizIds([]);
    } else {
      if (ids.length > 12) {
        setSelectedQuizIds(ids.slice(0, 12));
        setSelectionWarning('Selecionados os primeiros 12 quizzes.');
      } else {
        setSelectedQuizIds(ids);
      }
    }
  };

  // Confirmar início do jogo no Modo Clássico (Estilo Kahoot - sem roleta)
  const handleConfirmPlayClassic = () => {
    if (selectedQuizIds.length < 1) {
      setSelectionWarning('Selecione pelo menos 1 quiz para jogar no Modo Clássico.');
      return;
    }
    setPlaySessionType('classic');
    setShowRouletteModeModal(true);
  };

  // Iniciar jogo direto no Modo Clássico para um quiz/card individual (sem necessidade de seleção prévia)
  const handlePlayCardClassic = (category: Category) => {
    setSelectedQuizIds([category.id]);
    setSelectionWarning('');
    setPlaySessionType('classic');
    setShowRouletteModeModal(true);
    sfx.playClick();
  };

  // Confirmar início do jogo no Modo Blocos (Kahoot Blocks - sem roleta)
  const handleConfirmPlayBlocks = () => {
    if (selectedQuizIds.length < 1) {
      setSelectionWarning('Selecione pelo menos 1 quiz para jogar no Modo Blocos.');
      return;
    }
    setPlaySessionType('blocks');
    setShowRouletteModeModal(true);
  };

  // Iniciar jogo direto no Modo Blocos para um quiz/card individual
  const handlePlayCardBlocks = (category: Category) => {
    setSelectedQuizIds([category.id]);
    setSelectionWarning('');
    setPlaySessionType('blocks');
    setShowRouletteModeModal(true);
    sfx.playClick();
  };

  // Iniciar jogo para um Quiz Salvo customizado
  const handlePlaySavedQuizClassic = (quiz: SavedQuiz) => {
    if (quiz.categoryIds && quiz.categoryIds.length > 0) {
      setSelectedQuizIds(quiz.categoryIds);
      setSelectionWarning('');
      setPlaySessionType(quiz.quizFormat === 'roulette' ? 'roulette' : 'classic');
      setShowRouletteModeModal(true);
      sfx.playClick();
    } else {
      onPlayQuiz(quiz);
    }
  };

  // Confirmar início do jogo com Roleta (abre modal de escolha de modo)
  const handleConfirmPlayWithRoulette = () => {
    if (selectedQuizIds.length < 2) {
      setSelectionWarning('Selecione pelo menos 2 quizzes para poder girar a Roleta.');
      return;
    }
    setPlaySessionType('roulette');
    setShowRouletteModeModal(true);
  };

  // Abrir modal de salvar quiz com roleta
  const handleOpenSaveRouletteModal = () => {
    if (selectedQuizIds.length < 2) {
      setSelectionWarning('Selecione pelo menos 2 quizzes para salvar um Quiz com Roleta.');
      return;
    }
    const defaultName = `Quiz Roleta (${selectedQuizIds.length} temas)`;
    setRouletteQuizName(defaultName);
    setShowSaveRouletteModal(true);
  };

  const handleSaveRouletteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rouletteQuizName.trim()) return;
    onSaveRouletteQuiz(rouletteQuizName.trim(), selectedQuizIds);
    setShowSaveRouletteModal(false);
    setSelectedQuizIds([]);
  };

  // Contagem total de favoritos
  const totalFavoritesCount = useMemo(() => {
    const favCatCount = categories.filter(c => favoriteCategoryIds.includes(c.id)).length;
    const favQuizCount = quizzes.filter(q => q.isFavorite).length;
    return favCatCount + (selectedFolderId === null ? favQuizCount : 0);
  }, [categories, favoriteCategoryIds, quizzes, selectedFolderId]);

  // Total de itens exibidos
  const totalItemsCount = categories.length + (selectedFolderId === null ? quizzes.length : 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%' }}>
      
      {/* ─── Cabeçalho da Pasta Selecionada e Ações Rápidas ─────────────────── */}
      <div 
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div 
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#f3e8ff',
              color: '#46178f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {selectedFolderId === null ? (
              <FileQuestion style={{ width: '22px', height: '22px' }} />
            ) : (
              <Folder style={{ width: '22px', height: '22px', color: folderMap.get(selectedFolderId)?.color || '#46178f' }} />
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e1b4b', margin: 0 }}>
                {currentFolderName}
              </h2>
              {selectedFolderId !== null && (
                <button
                  type="button"
                  onClick={() => onSelectFolder(null)}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#64748b',
                    backgroundColor: '#e2e8f0',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  title="Ver todos os quizzes"
                >
                  Ver Todos
                </button>
              )}
            </div>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
              {totalItemsCount} {totalItemsCount === 1 ? 'quiz disponível' : 'quizzes disponíveis'}
            </span>
          </div>
        </div>

        {/* Botões do Topo: Nova Pasta, Criar Quiz & Gerar com IA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={onCreateFolderClick}
            style={{
              height: '38px',
              padding: '0 14px',
              borderRadius: '8px',
              backgroundColor: '#faf5ff',
              border: '1px solid #e9d5ff',
              color: '#46178f',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            title="Criar uma nova pasta para organizar quizzes"
          >
            <FolderPlus style={{ width: '15px', height: '15px' }} />
            <span>Nova Pasta</span>
          </button>

          <button
            type="button"
            onClick={onCreateNewQuiz}
            style={{
              height: '38px',
              padding: '0 16px',
              borderRadius: '8px',
              backgroundColor: '#1368ce',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(19, 104, 206, 0.25)',
            }}
          >
            <Plus style={{ width: '15px', height: '15px', strokeWidth: 3 }} />
            <span>Criar Quiz</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenQuestionManager('bank')}
            style={{
              height: '38px',
              padding: '0 14px',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid #d1d5db',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.borderColor = '#94a3b8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
            title="Acessar Banco de Questões Cadastradas"
          >
            <Database style={{ width: '15px', height: '15px', color: '#1368ce' }} />
            <span>Banco de Questões</span>
          </button>
        </div>
      </div>

      {/* ─── BARRA DE AÇÃO DE SELEÇÃO ESTILO KAHOOT! ───────────── */}
      {selectedQuizIds.length > 0 && (
        <div 
          style={{
            backgroundColor: '#1e1b4b',
            color: '#ffffff',
            borderRadius: '14px',
            padding: '12px 20px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 8px 24px rgba(30, 27, 75, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          {/* Lado Esquerdo: Contador e Instrução */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
              }}
            >
              <Check style={{ width: '18px', height: '18px', strokeWidth: 3 }} />
            </div>

            <div>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>
                {selectedQuizIds.length} {selectedQuizIds.length === 1 ? 'quiz selecionado' : 'quizzes selecionados'}
              </span>
              <span style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', fontWeight: 500 }}>
                {selectedQuizIds.length === 1
                  ? 'Pronto para o Quiz Clássico, ou selecione mais um para liberar a Roleta.'
                  : 'Pronto para jogar no Quiz Clássico ou sorteando na Roleta.'}
              </span>
            </div>
          </div>

          {/* Lado Direito: Ações de Jogo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Botão NOVO: Jogar Clássico (Estilo Kahoot - sem roleta) */}
            <button
              type="button"
              onClick={handleConfirmPlayClassic}
              disabled={selectedQuizIds.length < 1}
              style={{
                height: '38px',
                padding: '0 16px',
                borderRadius: '10px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                boxShadow: '0 2px 10px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.15s ease',
              }}
              title="Jogar diretamente em sequência (sem roleta), no formato estilo Kahoot"
            >
              <Zap style={{ width: '16px', height: '16px', fill: 'currentColor' }} />
              <span>Jogar Clássico</span>
            </button>

            {/* Botão NOVO: Jogar em Blocos (Kahoot Blocks) */}
            <button
              type="button"
              onClick={handleConfirmPlayBlocks}
              disabled={selectedQuizIds.length < 1}
              style={{
                height: '38px',
                padding: '0 16px',
                borderRadius: '10px',
                backgroundColor: '#7c3aed',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                boxShadow: '0 2px 10px rgba(124, 58, 237, 0.4)',
                transition: 'all 0.15s ease',
              }}
              title="Jogar no Modo Blocos (tabuleiro com blocos numerados virados estilo Kahoot)"
            >
              <LayoutGrid style={{ width: '16px', height: '16px' }} />
              <span>Jogar em Blocos</span>
            </button>

            {/* Botão Jogar com Roleta */}
            <button
              type="button"
              onClick={handleConfirmPlayWithRoulette}
              disabled={selectedQuizIds.length < 2}
              style={{
                height: '38px',
                padding: '0 16px',
                borderRadius: '10px',
                backgroundColor: selectedQuizIds.length >= 2 ? '#46178f' : 'rgba(255, 255, 255, 0.12)',
                color: selectedQuizIds.length >= 2 ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
                fontWeight: 800,
                fontSize: '13px',
                border: selectedQuizIds.length >= 2 ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid transparent',
                cursor: selectedQuizIds.length >= 2 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                boxShadow: selectedQuizIds.length >= 2 ? '0 2px 8px rgba(70, 23, 143, 0.3)' : 'none',
                transition: 'all 0.15s ease',
              }}
              title={selectedQuizIds.length < 2 ? 'Selecione pelo menos 2 quizzes para girar a roleta' : 'Girar a roleta para sortear as categorias'}
            >
              <RotateCw style={{ width: '15px', height: '15px' }} />
              <span>Jogar com Roleta</span>
            </button>

            {/* Botão Salvar Quiz da Roleta */}
            <button
              type="button"
              onClick={handleOpenSaveRouletteModal}
              disabled={selectedQuizIds.length < 2}
              style={{
                height: '38px',
                padding: '0 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '12px',
                cursor: selectedQuizIds.length >= 2 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Salvar esta seleção como um quiz pré-configurado"
            >
              <Save style={{ width: '14px', height: '14px' }} />
              <span>Salvar Quiz</span>
            </button>

            {/* Botão Desmarcar */}
            <button
              type="button"
              onClick={() => setSelectedQuizIds([])}
              style={{
                height: '36px',
                padding: '0 10px',
                color: '#ffffff',
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Limpar
            </button>
          </div>
        </div>
      )}

      {/* Aviso de Validação de Seleção */}
      {selectionWarning && (
        <div 
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            backgroundColor: '#fef3c7',
            border: '1px solid #fde68a',
            color: '#92400e',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
          <span>{selectionWarning}</span>
        </div>
      )}

      {/* ─── Barra de Filtros & Busca Estilo Kahoot! ─────────────────────────── */}
      <div 
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          paddingBottom: '14px',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        {/* Abas Pílula estilo Kahoot + Selecionar Tudo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
          {[
            { id: 'all', label: `Todos (${totalItemsCount})`, icon: null },
            { id: 'popular', label: 'Mais Perguntas', icon: null },
            { id: 'favorites', label: `Favoritos (${totalFavoritesCount})`, icon: Star },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isActive ? '1px solid #46178f' : '1px solid transparent',
                  backgroundColor: isActive ? '#f3e8ff' : '#ffffff',
                  color: isActive ? '#46178f' : '#64748b',
                  boxShadow: isActive ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {TabIcon && (
                  <TabIcon 
                    style={{ 
                      width: '13px', 
                      height: '13px', 
                      fill: isActive || (tab.id === 'favorites' && totalFavoritesCount > 0) ? '#eab308' : 'none',
                      color: isActive || (tab.id === 'favorites' && totalFavoritesCount > 0) ? '#eab308' : '#64748b' 
                    }} 
                  />
                )}
                <span>{tab.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleSelectAllVisible}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Check style={{ width: '13px', height: '13px' }} />
            <span>{selectedQuizIds.length === filteredCategories.length && filteredCategories.length > 0 ? 'Desmarcar Todos' : 'Selecionar para Roleta'}</span>
          </button>
        </div>

        {/* Busca e Alternância Grade / Lista */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', width: '220px' }}>
            <Search 
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '14px',
                height: '14px',
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
                fontSize: '12px',
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
              <LayoutGrid style={{ width: '15px', height: '15px' }} />
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
              <ListIcon style={{ width: '15px', height: '15px' }} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Grid de Blocos / Quizzes com Checkbox de Seleção ────────────────── */}
      {filteredCategories.length > 0 || (selectedFolderId === null && (activeTab === 'favorites' ? quizzes.filter(q => q.isFavorite) : quizzes).length > 0) ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: viewMode === 'grid' 
              ? 'repeat(auto-fill, minmax(270px, 1fr))' 
              : '1fr',
            gap: '20px',
          }}
        >
          {/* 1. Blocos de Categorias (Quizzes Principais) */}
          {filteredCategories.map((cat, index) => {
            const totalQ = questionCountByCategory.get(cat.id) || 0;
            const folder = cat.folder_id ? folderMap.get(cat.folder_id) : null;
            const gradient = BLOCK_GRADIENTS[index % BLOCK_GRADIENTS.length];
            const isMenuOpen = openMenuCatId === cat.id;
            const isSelectedForRoulette = selectedQuizIds.includes(cat.id);
            const isCatFavorite = favoriteCategoryIds.includes(cat.id);

            return (
              <div
                key={cat.id}
                className="quiz-card-group"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '14px',
                  backgroundColor: '#ffffff',
                  border: isSelectedForRoulette ? '2px solid #1368ce' : '1px solid #e2e8f0',
                  overflow: 'hidden',
                  boxShadow: isSelectedForRoulette 
                    ? '0 6px 20px rgba(19, 104, 206, 0.18)' 
                    : '0 2px 6px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  if (!isSelectedForRoulette) {
                    e.currentTarget.style.boxShadow = '0 8px 18px rgba(0, 0, 0, 0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  if (!isSelectedForRoulette) {
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.03)';
                  }
                }}
              >
                {/* Capa com Gradiente, Badge de Perguntas e CHECKBOX estilo Kahoot */}
                <div 
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '135px',
                    background: gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {/* Checkbox de Seleção para Roleta no Canto Superior Esquerdo */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleSelectQuiz(cat.id, e)}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      width: '26px',
                      height: '26px',
                      borderRadius: '6px',
                      backgroundColor: isSelectedForRoulette ? '#1368ce' : 'rgba(0, 0, 0, 0.45)',
                      border: isSelectedForRoulette ? '2px solid #ffffff' : '1.5px solid rgba(255, 255, 255, 0.7)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 10,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      transition: 'all 0.15s ease',
                    }}
                    title={isSelectedForRoulette ? 'Remover da Roleta' : 'Selecionar para a Roleta (2 a 12)'}
                  >
                    {isSelectedForRoulette && <Check style={{ width: '16px', height: '16px', strokeWidth: 3 }} />}
                  </button>

                  {/* Botão de Favorito no Canto Superior Direito (Oculto até passar o mouse no card ou se favoritado) */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleFavoriteCategory(cat.id, e)}
                    className={`quiz-card-favorite-btn ${isCatFavorite ? 'is-favorite' : ''}`}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: isCatFavorite ? 'rgba(234, 179, 8, 0.95)' : 'rgba(0, 0, 0, 0.45)',
                      border: isCatFavorite ? '1.5px solid #fef08a' : '1.5px solid rgba(255, 255, 255, 0.7)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 10,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }}
                    title={isCatFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  >
                    <Star style={{ width: '15px', height: '15px', fill: isCatFavorite ? '#ffffff' : 'none' }} />
                  </button>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', opacity: 0.9 }}>
                    <FileQuestion style={{ width: '36px', height: '36px', color: '#ffffff' }} />
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Quizziando
                    </span>
                  </div>

                  {/* Badge de Perguntas */}
                  <div 
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(0, 0, 0, 0.75)',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 800,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    }}
                  >
                    {totalQ} {totalQ === 1 ? 'pergunta' : 'perguntas'}
                  </div>
                </div>

                {/* Corpo do Bloco */}
                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <h3 
                        style={{
                          fontSize: '15px',
                          fontWeight: 800,
                          color: '#1e293b',
                          lineHeight: 1.3,
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                        title={cat.name}
                      >
                        {cat.name}
                      </h3>

                      {/* Ações: Botão Editar Quiz e Menu 3 Pontinhos */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        {onEditCategory && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditCategory(cat);
                            }}
                            style={{
                              padding: '4px',
                              borderRadius: '6px',
                              color: '#94a3b8',
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#7c3aed'; e.currentTarget.style.backgroundColor = '#faf5ff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                            title="Editar Quiz (nome, pasta, questões)"
                          >
                            <Edit3 style={{ width: '15px', height: '15px' }} />
                          </button>
                        )}

                        {/* Menu 3 Pontinhos */}
                        <div 
                          style={{ position: 'relative' }}
                          data-category-menu-container={cat.id}
                        >
                        <button
                          type="button"
                          onClick={() => setOpenMenuCatId(isMenuOpen ? null : cat.id)}
                          style={{
                            padding: '4px',
                            borderRadius: '6px',
                            color: '#94a3b8',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <MoreVertical style={{ width: '16px', height: '16px' }} />
                        </button>

                        {isMenuOpen && (
                          <div 
                            style={{
                              position: 'absolute',
                              right: 0,
                              bottom: '100%',
                              marginBottom: '6px',
                              width: '180px',
                              borderRadius: '10px',
                              backgroundColor: '#ffffff',
                              border: '1px solid #e2e8f0',
                              padding: '6px',
                              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12)',
                              zIndex: 50,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuCatId(null);
                                handlePlayCardClassic(cat);
                              }}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#1368ce',
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                textAlign: 'left',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#eff6ff')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <Play style={{ width: '14px', height: '14px', fill: 'currentColor' }} />
                              <span>Jogar Modo Clássico</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuCatId(null);
                                handlePlayCardBlocks(cat);
                              }}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#7c3aed',
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                textAlign: 'left',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#faf5ff')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <LayoutGrid style={{ width: '14px', height: '14px' }} />
                              <span>Jogar em Blocos</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuCatId(null);
                                handleToggleFavoriteCategory(cat.id);
                              }}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: isCatFavorite ? '#b45309' : '#334155',
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                textAlign: 'left',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isCatFavorite ? '#fefce8' : '#f1f5f9')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <Star style={{ width: '14px', height: '14px', color: isCatFavorite ? '#eab308' : '#94a3b8', fill: isCatFavorite ? '#eab308' : 'none' }} />
                              <span>{isCatFavorite ? 'Remover Favorito' : 'Favoritar Quiz'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuCatId(null);
                                handleToggleSelectQuiz(cat.id);
                              }}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#46178f',
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                textAlign: 'left',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#faf5ff')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <RotateCw style={{ width: '14px', height: '14px' }} />
                              <span>{isSelectedForRoulette ? 'Remover da Roleta' : 'Adicionar à Roleta'}</span>
                            </button>

                            {onEditCategory && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuCatId(null);
                                  onEditCategory(cat);
                                }}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '8px 10px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  color: '#7c3aed',
                                  border: 'none',
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#faf5ff')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                              >
                                <Edit3 style={{ width: '14px', height: '14px', color: '#7c3aed' }} />
                                <span>Editar Quiz</span>
                              </button>
                            )}

                            {/* Separador */}
                            <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '4px 0' }} />

                            {/* Metadado: Data de Criação do Quiz */}
                            <div 
                              style={{ 
                                padding: '6px 10px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px',
                                fontSize: '11px',
                                color: '#475569',
                                backgroundColor: '#f8fafc',
                                borderRadius: '6px',
                                margin: '2px 0'
                              }}
                              title={`Data de criação: ${formatQuizDate(cat.created_at)}`}
                            >
                              <Calendar style={{ width: '13px', height: '13px', color: '#6366f1', flexShrink: 0 }} />
                              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                                <span style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>Criado em</span>
                                <span style={{ fontWeight: 700, color: '#1e293b' }}>{formatQuizDate(cat.created_at)}</span>
                              </div>
                            </div>

                            {/* Separador */}
                            <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '4px 0' }} />

                            {/* Opção Excluir Quiz */}
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuCatId(null);
                                setCategoryToDelete(cat);
                              }}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#ef4444',
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                textAlign: 'left',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <Trash2 style={{ width: '14px', height: '14px', color: '#ef4444' }} />
                              <span>Excluir Quiz</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                    {/* Pasta Associada com Bolinha de Cor e Data de Criação */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <span 
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: folder?.color || cat.color || '#46178f',
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {folder ? folder.name : 'Geral (Sem Pasta)'}
                        </span>
                      </div>

                      {/* Metadado de Data de Criação no Card */}
                      <span 
                        style={{
                          fontSize: '11px',
                          color: '#94a3b8',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          flexShrink: 0
                        }}
                        title={`Criado em: ${formatQuizDate(cat.created_at)}`}
                      >
                        <Calendar style={{ width: '12px', height: '12px', color: '#94a3b8' }} />
                        {formatQuizDate(cat.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Rodapé do Bloco: Jogar Convencional ou Criar Perguntas se Vazio */}
                  <div style={{ paddingTop: '8px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleSelectQuiz(cat.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: isSelectedForRoulette ? '#1368ce' : '#94a3b8',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <RotateCw style={{ width: '12px', height: '12px' }} />
                      <span>{isSelectedForRoulette ? 'Na Roleta' : '+ Roleta'}</span>
                    </button>

                    {/* Botão Principal: Criar Perguntas (se 0 perguntas) ou Jogar Convencional */}
                    {totalQ === 0 ? (
                      <button
                        type="button"
                        onClick={() => onEditCategory?.(cat)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          backgroundColor: '#7c3aed',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontWeight: 800,
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(124, 58, 237, 0.25)',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#6d28d9')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#7c3aed')}
                        title="Criar perguntas para este quiz"
                      >
                        <PlusCircle style={{ width: '13px', height: '13px' }} />
                        <span>Criar Perguntas</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePlayCardClassic(cat)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 16px',
                          borderRadius: '6px',
                          backgroundColor: '#1368ce',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontWeight: 800,
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(19, 104, 206, 0.25)',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0f59b3')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1368ce')}
                        title="Jogar este quiz no Modo Clássico (estilo Kahoot)"
                      >
                        <Play style={{ width: '13px', height: '13px', fill: 'currentColor' }} />
                        <span>Jogar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* 2. Quizzes Salvos Customizados */}
          {selectedFolderId === null && (
            (activeTab === 'favorites' ? quizzes.filter(q => q.isFavorite) : quizzes)
              .filter(quiz => {
                if (!searchQuery.trim()) return true;
                return quiz.name.toLowerCase().includes(searchQuery.toLowerCase());
              })
              .map(quiz => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  onPlay={handlePlaySavedQuizClassic}
                  onEdit={onEditQuiz}
                  onDuplicate={onDuplicateQuiz}
                  onToggleFavorite={onToggleFavorite}
                  onDelete={onDeleteQuiz}
                  isCompactList={viewMode === 'list'}
                />
              ))
          )}
        </div>
      ) : activeTab === 'favorites' ? (
        /* Estado Vazio Amigável para a Aba de Favoritos */
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
              backgroundColor: '#fef9c3',
              color: '#ca8a04',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px',
            }}
          >
            <Star style={{ width: '32px', height: '32px', fill: '#eab308' }} />
          </div>

          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1e1b4b', marginBottom: '8px' }}>
            Nenhum quiz favorito ainda
          </h3>

          <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '440px', lineHeight: 1.6, marginBottom: '24px' }}>
            Você ainda não favoritou nenhum quiz. Clique na estrela no canto superior direito de qualquer card para favoritá-lo e acessá-lo rapidamente por aqui!
          </p>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            style={{
              height: '42px',
              padding: '0 22px',
              borderRadius: '8px',
              backgroundColor: '#46178f',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(70, 23, 143, 0.3)',
            }}
          >
            <span>Ver Todos os Quizzes</span>
          </button>
        </div>
      ) : (
        /* Estado Vazio Amigável para a Pasta */
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
            <Folder style={{ width: '32px', height: '32px' }} />
          </div>

          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1e1b4b', marginBottom: '8px' }}>
            Nenhum quiz nesta pasta ainda
          </h3>

          <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '440px', lineHeight: 1.6, marginBottom: '24px' }}>
            Esta pasta não possui nenhuma categoria/quiz associada no momento. Crie um novo quiz ou adicione perguntas pelo Banco de Questões.
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
              }}
            >
              <Plus style={{ width: '16px', height: '16px', strokeWidth: 3 }} />
              <span>Criar Quiz</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenQuestionManager('create')}
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
              }}
            >
              <Sparkles style={{ width: '16px', height: '16px', color: '#8b5cf6' }} />
              <span>Adicionar Perguntas</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Modal para Salvar Quiz com Roleta ────────────────────────────────── */}
      {showSaveRouletteModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
          onClick={() => setShowSaveRouletteModal(false)}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '420px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCw style={{ width: '20px', height: '20px', color: '#46178f' }} />
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#1e1b4b', margin: 0 }}>
                  Salvar Quiz com Roleta
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveRouletteModal(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Você selecionou <b>{selectedQuizIds.length} quizzes/categorias</b> para girar na Roleta. Dê um nome para salvar esse quiz personalizado na sua biblioteca.
            </p>

            <form onSubmit={handleSaveRouletteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Nome do Quiz
                </label>
                <input 
                  type="text"
                  autoFocus
                  value={rouletteQuizName}
                  onChange={(e) => setRouletteQuizName(e.target.value)}
                  placeholder="Ex: Torneio Interclasses de Tecnologia..."
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#1e293b',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowSaveRouletteModal(false)}
                  style={{
                    flex: 1,
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '13px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!rouletteQuizName.trim()}
                  style={{
                    flex: 1,
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: '#1368ce',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '13px',
                    border: 'none',
                    cursor: 'pointer',
                    opacity: !rouletteQuizName.trim() ? 0.6 : 1,
                  }}
                >
                  Salvar Quiz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL DE ESCOLHA DO MODO DE JOGO (CLÁSSICO OU ROLETA) ─────────── */}
      {showRouletteModeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRouletteModeModal(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '640px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              border: '1px solid #e2e8f0',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Cabeçalho do Modal */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    backgroundColor: playSessionType === 'classic' ? '#ecfdf5' : playSessionType === 'blocks' ? '#f3e8ff' : '#eff6ff',
                    border: playSessionType === 'classic' ? '1.5px solid #a7f3d0' : playSessionType === 'blocks' ? '1.5px solid #ddd6fe' : '1.5px solid #dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: playSessionType === 'classic' ? '#059669' : playSessionType === 'blocks' ? '#7c3aed' : '#1368ce',
                    flexShrink: 0,
                  }}
                >
                  {playSessionType === 'classic' ? (
                    <Zap style={{ width: '24px', height: '24px', fill: 'currentColor' }} />
                  ) : playSessionType === 'blocks' ? (
                    <LayoutGrid style={{ width: '24px', height: '24px' }} />
                  ) : (
                    <RotateCw style={{ width: '24px', height: '24px' }} />
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {playSessionType === 'classic'
                      ? 'Iniciar Partida - Quiz Clássico'
                      : playSessionType === 'blocks'
                      ? 'Iniciar Partida - Modo Blocos'
                      : 'Como deseja jogar com a Roleta?'}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0', fontWeight: 500 }}>
                    <strong style={{ color: playSessionType === 'classic' ? '#059669' : playSessionType === 'blocks' ? '#7c3aed' : '#1368ce' }}>
                      {selectedQuizIds.length} {selectedQuizIds.length === 1 ? 'quiz selecionado' : 'quizzes selecionados'}
                    </strong>
                    {playSessionType === 'classic'
                      ? ' no formato sequencial estilo Kahoot (perguntas diretas, sem sorteio de roleta).'
                      : playSessionType === 'blocks'
                      ? ' no formato Blocos (perguntas viradas com pontuação de acerto + e erro -).'
                      : ' selecionados para o sorteio na Roleta.'} Escolha o formato da partida:
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowRouletteModeModal(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                }}
                title="Fechar"
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            {/* Alternador de Formato Sem Roleta: Clássico vs Blocos */}
            {playSessionType !== 'roulette' && (
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  padding: '4px',
                  backgroundColor: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '14px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setPlaySessionType('classic')}
                  style={{
                    flex: 1,
                    padding: '9px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: playSessionType === 'classic' ? '#ffffff' : 'transparent',
                    color: playSessionType === 'classic' ? '#059669' : '#64748b',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: playSessionType === 'classic' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '7px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Zap style={{ width: '15px', height: '15px', fill: playSessionType === 'classic' ? 'currentColor' : 'none' }} />
                  <span>Modo Clássico (Sequencial)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlaySessionType('blocks')}
                  style={{
                    flex: 1,
                    padding: '9px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: playSessionType === 'blocks' ? '#ffffff' : 'transparent',
                    color: playSessionType === 'blocks' ? '#7c3aed' : '#64748b',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: playSessionType === 'blocks' ? '0 2px 8px rgba(124, 58, 237, 0.12)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '7px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <LayoutGrid style={{ width: '15px', height: '15px' }} />
                  <span>Modo Blocos (Kahoot Blocks)</span>
                </button>
              </div>
            )}

            {/* Configuração da Quantidade Pré-definida de Blocos */}
            {playSessionType === 'blocks' && (
              <div
                style={{
                  backgroundColor: '#faf5ff',
                  border: '1.5px solid #e9d5ff',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#4c1d95', display: 'block' }}>
                    Quantidade de Blocos no Tabuleiro:
                  </span>
                  <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 500 }}>
                    Defina quantos blocos numerados virados serão exibidos na tela
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[6, 8, 9, 12, 16, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setBlocksCount(num)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        border: blocksCount === num ? '2px solid #7c3aed' : '1px solid #d8b4fe',
                        backgroundColor: blocksCount === num ? '#7c3aed' : '#ffffff',
                        color: blocksCount === num ? '#ffffff' : '#6b21a8',
                        transition: 'all 0.15s ease',
                        boxShadow: blocksCount === num ? '0 2px 6px rgba(124, 58, 237, 0.3)' : 'none',
                      }}
                    >
                      {num} Blocos
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Lista dos 4 Modos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Opção 1: Modo Online */}
              <button
                type="button"
                onClick={() => {
                  setShowRouletteModeModal(false);
                  if ((playSessionType === 'classic' || playSessionType === 'blocks') && onStartClassicGame) {
                    onStartClassicGame(selectedQuizIds, 'online', undefined, playSessionType, blocksCount);
                  } else {
                    onStartRouletteGame(selectedQuizIds, 'online');
                  }
                }}
                style={{
                  padding: '18px',
                  borderRadius: '14px',
                  border: '1.5px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#7c3aed';
                  e.currentTarget.style.backgroundColor = '#faf5ff';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(124, 58, 237, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
                    color: '#ffffff',
                  }}
                >
                  <Wifi style={{ width: '24px', height: '24px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#1e1b4b' }}>
                      Modo Online
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        backgroundColor: '#ede9fe',
                        color: '#6d28d9',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Multiplayer Remoto
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                    {playSessionType === 'blocks'
                      ? 'Partida multiplayer com PIN da sala. Os participantes usam o celular e as perguntas abrem no tabuleiro de blocos virados.'
                      : playSessionType === 'classic'
                      ? 'Partida multiplayer com PIN da sala. Os participantes usam o celular e as perguntas seguem em sequência sem roleta.'
                      : 'Jogue em tempo real com jogadores na internet. Crie salas, use o celular como controle e a Roleta sorteia as perguntas ao vivo.'}
                  </p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {['Sala ao vivo', 'Multiplayer', 'Supabase Realtime'].map(tag => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#7c3aed',
                          backgroundColor: '#f5f3ff',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          border: '1px solid #ddd6fe',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight style={{ width: '20px', height: '20px', color: '#94a3b8', flexShrink: 0 }} />
              </button>

              {/* Opção 2: Modo Local por Equipes */}
              <button
                type="button"
                onClick={() => {
                  setShowRouletteModeModal(false);
                  if ((playSessionType === 'classic' || playSessionType === 'blocks') && onStartClassicGame) {
                    onStartClassicGame(selectedQuizIds, 'local', 'teams', playSessionType, blocksCount);
                  } else {
                    onStartRouletteGame(selectedQuizIds, 'local', 'teams');
                  }
                }}
                style={{
                  padding: '18px',
                  borderRadius: '14px',
                  border: '1.5px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#059669';
                  e.currentTarget.style.backgroundColor = '#ecfdf5';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(5, 150, 105, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #059669, #047857)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                    color: '#ffffff',
                  }}
                >
                  <Users style={{ width: '24px', height: '24px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#064e3b' }}>
                      Modo Local por Equipes
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        backgroundColor: '#d1fae5',
                        color: '#065f46',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      100% Offline
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                    {playSessionType === 'blocks'
                      ? 'Disputa entre equipes sem internet. Os times escolhem os blocos numerados, respondem oralmente e gravam acertos (+) e erros (-).'
                      : playSessionType === 'classic'
                      ? 'Disputa entre 2 times sem internet. O time da vez responde em voz alta e o apresentador confirma os pontos.'
                      : 'Disputa entre 2 times sem internet. Os participantes falam a resposta e o apresentador gira a Roleta e confirma acerto ou erro.'}
                  </p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {['Sem internet', 'Equipes', 'Resposta oral', 'Blocos + / -'].map(tag => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#059669',
                          backgroundColor: '#ecfdf5',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          border: '1px solid #a7f3d0',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight style={{ width: '20px', height: '20px', color: '#94a3b8', flexShrink: 0 }} />
              </button>

              {/* Opção 3: Modo Local Individual (Medição de Conhecimento) */}
              <button
                type="button"
                onClick={() => {
                  setShowRouletteModeModal(false);
                  if ((playSessionType === 'classic' || playSessionType === 'blocks') && onStartClassicGame) {
                    onStartClassicGame(selectedQuizIds, 'local', 'individual', playSessionType, blocksCount);
                  } else {
                    onStartRouletteGame(selectedQuizIds, 'local', 'individual');
                  }
                }}
                style={{
                  padding: '18px',
                  borderRadius: '14px',
                  border: '1.5px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0284c7';
                  e.currentTarget.style.backgroundColor = '#f0f9ff';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(2, 132, 199, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                    color: '#ffffff',
                  }}
                >
                  <Hand style={{ width: '24px', height: '24px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#0c4a6e' }}>
                      Modo Local Individual
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Medição de Conhecimento
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                    {playSessionType === 'blocks'
                      ? 'Sem competição. O aluno escolhe livremente os blocos numerados virados, responde e confere se acertou (+) ou errou (-).'
                      : playSessionType === 'classic'
                      ? 'Sem competição ou pontos. O aluno responde, confere a resposta correta na hora e segue para a próxima pergunta.'
                      : 'Sem competição ou pontos. A roleta sorteia o tema, o aluno responde, confere a resposta correta na hora e avança.'}
                  </p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {['Sem pontos', 'Sem ranking', 'Feedback imediato', '100% Offline'].map(tag => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#0284c7',
                          backgroundColor: '#f0f9ff',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          border: '1px solid #bae6fd',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight style={{ width: '20px', height: '20px', color: '#94a3b8', flexShrink: 0 }} />
              </button>

              {/* Opção 4: Presencial com Celulares */}
              <button
                type="button"
                onClick={() => {
                  setShowRouletteModeModal(false);
                  if ((playSessionType === 'classic' || playSessionType === 'blocks') && onStartClassicGame) {
                    onStartClassicGame(selectedQuizIds, 'hybrid', undefined, playSessionType, blocksCount);
                  } else {
                    onStartRouletteGame(selectedQuizIds, 'hybrid');
                  }
                }}
                style={{
                  padding: '18px',
                  borderRadius: '14px',
                  border: '1.5px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#db2777';
                  e.currentTarget.style.backgroundColor = '#fdf2f8';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(219, 39, 119, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #db2777, #be185d)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(219, 39, 119, 0.3)',
                    color: '#ffffff',
                  }}
                >
                  <Smartphone style={{ width: '24px', height: '24px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#831843' }}>
                      Presencial com Celulares (Kahoot)
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        backgroundColor: '#fce7f3',
                        color: '#be185d',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Telão + Celulares
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                    {playSessionType === 'blocks'
                      ? 'Projete o tabuleiro de blocos no telão. Os alunos escolhem blocos e respondem ao vivo com os 4 botões geométricos do celular.'
                      : playSessionType === 'classic'
                      ? 'Projete a partida no telão ou projetor da sala. Os alunos respondem ao vivo com os 4 botões geométricos do celular.'
                      : 'Projete a Roleta e perguntas no telão da sala. Os alunos respondem ao vivo com os 4 botões geométricos do celular.'}
                  </p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {['Telão / Projetor', 'Controle por celular', 'Modo Híbrido'].map(tag => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#db2777',
                          backgroundColor: '#fdf2f8',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          border: '1px solid #fbcfe8',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight style={{ width: '20px', height: '20px', color: '#94a3b8', flexShrink: 0 }} />
              </button>

            </div>

            {/* Rodapé do Modal */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                onClick={() => setShowRouletteModeModal(false)}
                style={{
                  height: '38px',
                  padding: '0 20px',
                  borderRadius: '8px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL DE ALERTA: CONFIRMAÇÃO DE EXCLUSÃO DE QUIZ ─────────────── */}
      {categoryToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingCategory) {
              setCategoryToDelete(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: '26px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              border: '1px solid #fee2e2',
            }}
          >
            {/* Cabeçalho do Alerta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: '#fee2e2',
                  border: '1.5px solid #fecaca',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle style={{ width: '24px', height: '24px' }} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                  Excluir Quiz
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Aviso de desvinculação de perguntas
                </span>
              </div>
              {!isDeletingCategory && (
                <button
                  type="button"
                  onClick={() => setCategoryToDelete(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '6px',
                  }}
                >
                  <X style={{ width: '20px', height: '20px' }} />
                </button>
              )}
            </div>

            {/* Pergunta de Alerta e Detalhes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '14px', color: '#334155', margin: 0, lineHeight: 1.5 }}>
                Deseja realmente excluir o quiz <strong style={{ color: '#0f172a' }}>"{categoryToDelete.name}"</strong>?
              </p>

              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderLeft: '4px solid #3b82f6',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e40af', fontSize: '13px', fontWeight: 700 }}>
                  <AlertCircle style={{ width: '16px', height: '16px' }} />
                  <span>Suas questões serão preservadas!</span>
                </div>
                <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.4 }}>
                  As <strong>{questionCountByCategory.get(categoryToDelete.id) || 0} perguntas</strong> vinculadas a este quiz serão desvinculadas e movidas automaticamente para a categoria <strong style={{ color: '#2563eb' }}>"Sem Categoria"</strong>.
                </p>
              </div>
            </div>

            {/* Ações do Modal */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                disabled={isDeletingCategory}
                onClick={() => setCategoryToDelete(null)}
                style={{
                  height: '40px',
                  padding: '0 18px',
                  borderRadius: '10px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: 'none',
                  cursor: isDeletingCategory ? 'not-allowed' : 'pointer',
                  opacity: isDeletingCategory ? 0.6 : 1,
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isDeletingCategory) e.currentTarget.style.backgroundColor = '#e2e8f0';
                }}
                onMouseLeave={(e) => {
                  if (!isDeletingCategory) e.currentTarget.style.backgroundColor = '#f1f5f9';
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isDeletingCategory}
                onClick={async () => {
                  if (!onDeleteCategory) return;
                  try {
                    setIsDeletingCategory(true);
                    await onDeleteCategory(categoryToDelete.id);
                    // Se estava selecionado para Roleta, desmarca
                    setSelectedQuizIds(prev => prev.filter(id => id !== categoryToDelete.id));
                  } catch (err) {
                    console.error('Erro ao excluir quiz:', err);
                  } finally {
                    setIsDeletingCategory(false);
                    setCategoryToDelete(null);
                  }
                }}
                style={{
                  height: '40px',
                  padding: '0 20px',
                  borderRadius: '10px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: 'none',
                  cursor: isDeletingCategory ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isDeletingCategory) e.currentTarget.style.backgroundColor = '#b91c1c';
                }}
                onMouseLeave={(e) => {
                  if (!isDeletingCategory) e.currentTarget.style.backgroundColor = '#dc2626';
                }}
              >
                {isDeletingCategory ? (
                  <>
                    <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 style={{ width: '16px', height: '16px' }} />
                    <span>Sim, Excluir Quiz</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default QuizLibrary;
