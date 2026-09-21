import React, { useState, useMemo } from 'react';
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
  Monitor,
  Smartphone,
  ChevronRight,
  PlusCircle,
  Trash2,
  AlertTriangle,
  Loader2,
  Database
} from 'lucide-react';
import { type SavedQuiz } from '../../lib/savedQuizzes';
import { type Category, type Question } from '../../App';
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
  onStartRouletteGame: (categoryIds: string[], mode: 'online' | 'local' | 'hybrid') => void;
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

export const QuizLibrary: React.FC<QuizLibraryProps> = ({
  quizzes,
  categories,
  questions,
  folders,
  selectedFolderId,
  currentFolderName,
  onSelectFolder,
  onCreateFolderClick,
  onPlayCategory,
  onEditCategory,
  onPlayQuiz,
  onEditQuiz,
  onDuplicateQuiz,
  onToggleFavorite,
  onDeleteQuiz,
  onDeleteCategory,
  onCreateNewQuiz,
  onStartRouletteGame,
  onSaveRouletteQuiz,
  onOpenQuestionManager,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'popular'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [openMenuCatId, setOpenMenuCatId] = useState<string | null>(null);

  // 🎡 Estado de Seleção para o Modo Roleta (Mínimo 2, Máximo 12)
  const [selectedQuizIds, setSelectedQuizIds] = useState<string[]>([]);
  const [selectionWarning, setSelectionWarning] = useState('');

  // Estado do Modal para Salvar Quiz com Roleta
  const [showSaveRouletteModal, setShowSaveRouletteModal] = useState(false);
  const [rouletteQuizName, setRouletteQuizName] = useState('');

  // 🎮 Estado do Modal de Escolha do Modo de Jogo com Roleta
  const [showRouletteModeModal, setShowRouletteModeModal] = useState(false);

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
  }, [categories, selectedFolderId, searchQuery, activeTab, questionCountByCategory, folderMap]);

  // Alternar seleção de um quiz para a Roleta
  const handleToggleSelectQuiz = (catId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectionWarning('');

    if (selectedQuizIds.includes(catId)) {
      setSelectedQuizIds(prev => prev.filter(id => id !== catId));
    } else {
      if (selectedQuizIds.length >= 12) {
        setSelectionWarning('Limite atingido: a Roleta comporta no máximo 12 quizzes para sorteio.');
        return;
      }
      setSelectedQuizIds(prev => [...prev, catId]);
    }
  };

  // Selecionar todos os visíveis (até 12)
  const handleSelectAllVisible = () => {
    setSelectionWarning('');
    const visibleIds = filteredCategories.map(c => c.id);
    if (selectedQuizIds.length === visibleIds.length) {
      setSelectedQuizIds([]);
    } else {
      if (visibleIds.length > 12) {
        setSelectionWarning('Selecionados os primeiros 12 quizzes (limite da Roleta).');
        setSelectedQuizIds(visibleIds.slice(0, 12));
      } else {
        setSelectedQuizIds(visibleIds);
      }
    }
  };

  // Confirmar início do jogo com Roleta (abre modal de escolha de modo)
  const handleConfirmPlayWithRoulette = () => {
    if (selectedQuizIds.length < 2) {
      setSelectionWarning('Selecione pelo menos 2 quizzes para poder girar a Roleta.');
      return;
    }
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

  // Total de itens exibidos
  const totalItemsCount = filteredCategories.length + (selectedFolderId === null ? quizzes.length : 0);

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

      {/* ─── BARRA DE AÇÃO DE SELEÇÃO ESTILO KAHOOT! (Modo Roleta) ───────────── */}
      {selectedQuizIds.length > 0 && (
        <div 
          style={{
            backgroundColor: '#1368ce',
            color: '#ffffff',
            borderRadius: '10px',
            padding: '12px 18px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(19, 104, 206, 0.3)',
          }}
        >
          {/* Lado Esquerdo: Contador e Instrução da Roleta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                color: '#1368ce',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
              }}
            >
              <Check style={{ width: '16px', height: '16px', strokeWidth: 3 }} />
            </div>

            <div>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>
                {selectedQuizIds.length} {selectedQuizIds.length === 1 ? 'quiz selecionado' : 'quizzes selecionados'} para a Roleta
              </span>
              <span style={{ fontSize: '11px', color: '#bfdbfe', display: 'block', fontWeight: 600 }}>
                {selectedQuizIds.length < 2 
                  ? `Selecione mais ${2 - selectedQuizIds.length} para liberar o sorteio na Roleta (Mínimo 2, Máximo 12)`
                  : `Pronto! A Roleta sorteará entre estes ${selectedQuizIds.length} quizzes durante a partida.`}
              </span>
            </div>
          </div>

          {/* Lado Direito: Ações da Roleta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Botão Jogar com Roleta */}
            <button
              type="button"
              onClick={handleConfirmPlayWithRoulette}
              disabled={selectedQuizIds.length < 2}
              style={{
                height: '36px',
                padding: '0 16px',
                borderRadius: '8px',
                backgroundColor: selectedQuizIds.length >= 2 ? '#ffffff' : 'rgba(255, 255, 255, 0.3)',
                color: selectedQuizIds.length >= 2 ? '#1368ce' : '#ffffff',
                fontWeight: 800,
                fontSize: '13px',
                border: 'none',
                cursor: selectedQuizIds.length >= 2 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: selectedQuizIds.length >= 2 ? '0 2px 6px rgba(0, 0, 0, 0.15)' : 'none',
              }}
            >
              <RotateCw style={{ width: '15px', height: '15px' }} />
              <span>Jogar com Roleta ({selectedQuizIds.length})</span>
            </button>

            {/* Botão Salvar Quiz da Roleta */}
            <button
              type="button"
              onClick={handleOpenSaveRouletteModal}
              disabled={selectedQuizIds.length < 2}
              style={{
                height: '36px',
                padding: '0 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
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
            { id: 'all', label: `Todos (${totalItemsCount})` },
            { id: 'popular', label: 'Mais Perguntas' },
          ].map(tab => {
            const isActive = activeTab === tab.id;
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
                }}
              >
                {tab.label}
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
      {filteredCategories.length > 0 || (selectedFolderId === null && quizzes.length > 0) ? (
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

            return (
              <div
                key={cat.id}
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

                      {/* Menu 3 Pontinhos */}
                      <div style={{ position: 'relative' }}>
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
                                onPlayCategory(cat);
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
                              <span>Jogar Convencional</span>
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
                              <>
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
                                  <PlusCircle style={{ width: '14px', height: '14px', color: '#7c3aed' }} />
                                  <span>Criar Questões</span>
                                </button>
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
                                    fontWeight: 600,
                                    color: '#334155',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <Edit3 style={{ width: '14px', height: '14px', color: '#0284c7' }} />
                                  <span>Ver Perguntas ({totalQ})</span>
                                </button>
                              </>
                            )}

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

                    {/* Pasta Associada com Bolinha de Cor */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <span 
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: folder?.color || cat.color || '#46178f',
                        }}
                      />
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                        {folder ? folder.name : 'Geral (Sem Pasta)'}
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
                        onClick={() => onPlayCategory(cat)}
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
                        title="Jogar este quiz de forma direta e convencional"
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

          {/* 2. Quizzes Salvos Customizados (Se exibindo todos) */}
          {selectedFolderId === null && quizzes.map(quiz => (
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

      {/* ─── MODAL DE ESCOLHA DO MODO DE JOGO COM ROLETA ──────────────────────── */}
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
                    backgroundColor: '#eff6ff',
                    border: '1.5px solid #dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1368ce',
                    flexShrink: 0,
                  }}
                >
                  <RotateCw style={{ width: '24px', height: '24px' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Como deseja jogar com a Roleta?
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0', fontWeight: 500 }}>
                    <strong style={{ color: '#1368ce' }}>{selectedQuizIds.length} quizzes</strong> selecionados para o sorteio. Escolha o formato da partida:
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

            {/* Lista dos 3 Modos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Opção 1: Modo Online */}
              <button
                type="button"
                onClick={() => {
                  setShowRouletteModeModal(false);
                  onStartRouletteGame(selectedQuizIds, 'online');
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
                    Jogue em tempo real com jogadores na internet. Crie salas, use o celular como controle e a Roleta sorteia as perguntas ao vivo.
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

              {/* Opção 2: Modo Local */}
              <button
                type="button"
                onClick={() => {
                  setShowRouletteModeModal(false);
                  onStartRouletteGame(selectedQuizIds, 'local');
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
                  <Monitor style={{ width: '24px', height: '24px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#064e3b' }}>
                      Modo Local
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
                    Jogue sem internet com dois times. Os participantes falam a resposta e o apresentador gira a Roleta e confirma acerto ou erro.
                  </p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {['Sem internet', '2 Times', 'Resposta oral', 'SQLite Local'].map(tag => (
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

              {/* Opção 3: Presencial com Celulares */}
              <button
                type="button"
                onClick={() => {
                  setShowRouletteModeModal(false);
                  onStartRouletteGame(selectedQuizIds, 'hybrid');
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
                      Presencial com Celulares
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
                    Projete a tela com a Roleta no telão ou projetor e receba as respostas dos celulares dos alunos conectados pela internet.
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
