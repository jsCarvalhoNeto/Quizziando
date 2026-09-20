import React, { useState } from 'react';
import { 
  Library, 
  Play, 
  Plus, 
  Settings, 
  LogOut, 
  Sparkles, 
  Wifi, 
  Monitor, 
  Users,
  Search,
  Radio,
  Folder,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  Layers,
  X
} from 'lucide-react';
import { type SavedQuiz } from '../../lib/savedQuizzes';
import { type Category, type Question } from '../../App';
import QuizLibrary from './QuizLibrary';

interface TeacherDashboardProps {
  teacherEmail: string;
  quizzes: SavedQuiz[];
  folders: Array<{ id: string; name: string; color?: string }>;
  categories: Category[];
  questions: Question[];
  activeRooms?: Array<{
    code: string;
    game_mode: string;
    status: string;
    current_round: number;
    rounds: number;
    updated_at: string;
  }>;
  onLogout: () => void;
  onPlayQuiz: (quiz: SavedQuiz) => void;
  onPlayCategory: (category: Category) => void;
  onEditQuiz?: (quiz: SavedQuiz) => void;
  onEditCategory?: (category: Category) => void;
  onDuplicateQuiz: (quizId: string) => void;
  onToggleFavorite: (quizId: string) => void;
  onDeleteQuiz: (quizId: string) => void;
  onCreateNewQuiz: () => void;
  onCreateFolder: (name: string, color?: string) => Promise<void> | void;
  onOpenQuestionManager: () => void;
  onOpenSettings: () => void;
  onRecoverRoom: (roomCode: string) => void;
  onCloseRoom: (roomCode: string) => void;
  onLaunchNewRoom: (mode: 'online' | 'hybrid' | 'local') => void;
}

const FOLDER_COLORS = [
  '#46178F', // Roxo Kahoot
  '#1368CE', // Azul Royal
  '#059669', // Verde Esmeralda
  '#D97706', // Âmbar / Laranja
  '#DB2777', // Rosa
  '#0D9488', // Turquesa
  '#DC2626', // Vermelho
];

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  teacherEmail,
  quizzes,
  folders = [],
  categories = [],
  questions = [],
  activeRooms = [],
  onLogout,
  onPlayQuiz,
  onPlayCategory,
  onEditQuiz,
  onEditCategory,
  onDuplicateQuiz,
  onToggleFavorite,
  onDeleteQuiz,
  onCreateNewQuiz,
  onCreateFolder,
  onOpenQuestionManager,
  onOpenSettings,
  onRecoverRoom,
  onCloseRoom,
  onLaunchNewRoom,
}) => {
  const [activeNav, setActiveNav] = useState<'library' | 'launch' | 'active_rooms'>('library');
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');

  // Estado do Modal de Criar Pasta
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const handleOpenCreateFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNewFolderName('');
    setNewFolderColor(FOLDER_COLORS[0]);
    setShowCreateFolderModal(true);
  };

  const handleConfirmCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setIsCreatingFolder(true);
    await onCreateFolder(newFolderName.trim(), newFolderColor);
    setIsCreatingFolder(false);
    setShowCreateFolderModal(false);
  };

  // Nome da pasta selecionada atualmente
  const currentFolderName = selectedFolderId === null 
    ? 'Todos os Quizzes' 
    : folders.find(f => f.id === selectedFolderId)?.name || 'Pasta';

  return (
    <div 
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#f4f5f8',
        color: '#1e293b',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ─── Top Bar Superior Estilo Kahoot! (Branco Puro e Limpo) ───────────── */}
      <header
        style={{
          height: '64px',
          padding: '0 24px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.03)',
        }}
      >
        {/* Lado Esquerdo: Logo Proporcional e Título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src="/logo.png" 
              alt="Quizziando Logo" 
              style={{
                height: '36px',
                width: 'auto',
                maxHeight: '36px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.02em', color: '#1e1b4b', lineHeight: 1.1 }}>
                Quizziando
              </span>
              <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#46178f' }}>
                Painel do Educador
              </span>
            </div>
          </div>
        </div>

        {/* Centro: Barra de Busca Estilo Kahoot! */}
        <div 
          style={{
            flex: 1,
            maxWidth: '460px',
            margin: '0 20px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search 
            style={{
              position: 'absolute',
              left: '14px',
              width: '16px',
              height: '16px',
              color: '#64748b',
              pointerEvents: 'none',
            }}
          />
          <input 
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Pesquisar quizzes, conteúdos públicos e temas..."
            style={{
              width: '100%',
              height: '40px',
              paddingLeft: '40px',
              paddingRight: '14px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#1e293b',
              outline: 'none',
              transition: 'all 0.2s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = '#46178f';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(70, 23, 143, 0.12)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Lado Direito: Ações Globais & Perfil */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Botão de Destaque 'Criar' estilo Kahoot! (Azul Vibrante) */}
          <button
            type="button"
            onClick={onCreateNewQuiz}
            style={{
              height: '40px',
              padding: '0 18px',
              borderRadius: '8px',
              backgroundColor: '#1368ce',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(19, 104, 206, 0.3)',
              transition: 'transform 0.1s ease, background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0f59b3')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1368ce')}
          >
            <Plus style={{ width: '16px', height: '16px', strokeWidth: 3 }} />
            <span>Criar Quiz</span>
          </button>

          {/* Botão Banco de Questões & IA */}
          <button
            type="button"
            onClick={onOpenQuestionManager}
            style={{
              height: '40px',
              padding: '0 14px',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.color = '#334155';
            }}
            title="Acessar o Banco de Perguntas e IA"
          >
            <Sparkles style={{ width: '15px', height: '15px', color: '#8b5cf6' }} />
            <span>Banco de Questões</span>
          </button>

          {/* Botão Configurações */}
          <button
            type="button"
            onClick={onOpenSettings}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#1e293b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.color = '#64748b';
            }}
            title="Configurações"
          >
            <Settings style={{ width: '16px', height: '16px' }} />
          </button>

          {/* Divisor */}
          <div style={{ height: '24px', width: '1px', backgroundColor: '#e2e8f0', margin: '0 4px' }} />

          {/* Perfil e Sair */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#46178f',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '14px',
              }}
              title={teacherEmail}
            >
              {teacherEmail.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {teacherEmail.split('@')[0]}
              </span>
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>Professor</span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              style={{
                padding: '6px',
                borderRadius: '6px',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.backgroundColor = '#fee2e2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94a3b8';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Sair do painel"
            >
              <LogOut style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Corpo Principal (Sidebar com Submenu de Pastas + Conteúdo) ──────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Sidebar Lateral Estilo Kahoot! com Submenu de Pastas */}
        <aside 
          style={{
            width: '260px',
            backgroundColor: '#ffffff',
            borderRight: '1px solid #e5e7eb',
            padding: '20px 12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flexShrink: 0,
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Navegação Principal */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              
              {/* Botão Biblioteca (Com Submenu Expansível estilo Kahoot) */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveNav('library');
                    setIsLibraryExpanded(!isLibraryExpanded);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 800,
                    textAlign: 'left',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    backgroundColor: activeNav === 'library' ? '#f3e8ff' : 'transparent',
                    color: activeNav === 'library' ? '#46178f' : '#334155',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Library style={{ width: '18px', height: '18px', color: activeNav === 'library' ? '#46178f' : '#64748b' }} />
                    <span>Biblioteca</span>
                  </div>
                  {isLibraryExpanded ? (
                    <ChevronDown style={{ width: '15px', height: '15px', color: '#64748b' }} />
                  ) : (
                    <ChevronRight style={{ width: '15px', height: '15px', color: '#64748b' }} />
                  )}
                </button>

                {/* Submenu da Biblioteca (Pastas e Categorias estilo Kahoot) */}
                {isLibraryExpanded && (
                  <div 
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      paddingLeft: '14px',
                      marginTop: '6px',
                      borderLeft: '2px solid #e9d5ff',
                      marginLeft: '12px',
                    }}
                  >
                    {/* Item: Todos os Quizzes */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveNav('library');
                        setSelectedFolderId(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: selectedFolderId === null && activeNav === 'library' ? 800 : 600,
                        backgroundColor: selectedFolderId === null && activeNav === 'library' ? '#e9d5ff' : 'transparent',
                        color: selectedFolderId === null && activeNav === 'library' ? '#46178f' : '#475569',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Layers style={{ width: '14px', height: '14px', color: selectedFolderId === null ? '#46178f' : '#64748b' }} />
                        <span>Todos os Quizzes</span>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>
                        {categories.length + quizzes.length}
                      </span>
                    </button>

                    {/* Cabeçalho: Minhas Pastas + Botão (+) Criar Nova Pasta */}
                    <div 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 10px 4px 10px',
                        marginTop: '4px',
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Minhas Pastas
                      </span>
                      <button
                        type="button"
                        onClick={handleOpenCreateFolder}
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '6px',
                          backgroundColor: '#f1f5f9',
                          color: '#46178f',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #e2e8f0',
                          cursor: 'pointer',
                        }}
                        title="Criar nova pasta"
                      >
                        <Plus style={{ width: '13px', height: '13px', strokeWidth: 3 }} />
                      </button>
                    </div>

                    {/* Lista das Pastas Criadas */}
                    {folders.map(folder => {
                      const isSelected = selectedFolderId === folder.id && activeNav === 'library';
                      const count = categories.filter(c => c.folder_id === folder.id).length;
                      return (
                        <button
                          key={folder.id}
                          type="button"
                          onClick={() => {
                            setActiveNav('library');
                            setSelectedFolderId(folder.id);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: isSelected ? 800 : 600,
                            backgroundColor: isSelected ? '#e9d5ff' : 'transparent',
                            color: isSelected ? '#46178f' : '#475569',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                            <Folder style={{ width: '14px', height: '14px', color: folder.color || '#46178f', flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={folder.name}>
                              {folder.name}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', marginLeft: '6px' }}>
                            {count}
                          </span>
                        </button>
                      );
                    })}

                    {folders.length === 0 && (
                      <div style={{ padding: '6px 10px', fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                        Nenhuma pasta criada. Clique no (+) para adicionar.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Botão Lançar Partida */}
              <button
                type="button"
                onClick={() => setActiveNav('launch')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  textAlign: 'left',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  backgroundColor: activeNav === 'launch' ? '#f3e8ff' : 'transparent',
                  color: activeNav === 'launch' ? '#46178f' : '#475569',
                }}
                onMouseEnter={(e) => {
                  if (activeNav !== 'launch') e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (activeNav !== 'launch') e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Play style={{ width: '18px', height: '18px', color: activeNav === 'launch' ? '#46178f' : '#64748b' }} />
                <span>Lançar Partida</span>
              </button>

              {/* Botão Salas Abertas */}
              <button
                type="button"
                onClick={() => setActiveNav('active_rooms')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  textAlign: 'left',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  backgroundColor: activeNav === 'active_rooms' ? '#f3e8ff' : 'transparent',
                  color: activeNav === 'active_rooms' ? '#46178f' : '#475569',
                }}
                onMouseEnter={(e) => {
                  if (activeNav !== 'active_rooms') e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (activeNav !== 'active_rooms') e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Wifi style={{ width: '18px', height: '18px', color: activeNav === 'active_rooms' ? '#46178f' : '#64748b' }} />
                  <span>Salas Abertas</span>
                </div>
                {activeRooms.length > 0 && (
                  <span 
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 800,
                    }}
                  >
                    {activeRooms.length}
                  </span>
                )}
              </button>
            </nav>

            {/* Divisor */}
            <div style={{ height: '1px', backgroundColor: '#e5e7eb' }} />

            {/* Modos de Apresentação */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: '8px' }}>
                Modos de Apresentação
              </span>

              <button
                type="button"
                onClick={() => onLaunchNewRoom('hybrid')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Monitor style={{ width: '16px', height: '16px', color: '#0284c7' }} />
                <span>Presencial / Telão</span>
              </button>

              <button
                type="button"
                onClick={() => onLaunchNewRoom('online')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Radio style={{ width: '16px', height: '16px', color: '#8b5cf6' }} />
                <span>Online Realtime</span>
              </button>

              <button
                type="button"
                onClick={() => onLaunchNewRoom('local')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Users style={{ width: '16px', height: '16px', color: '#10b981' }} />
                <span>Local (2 Times)</span>
              </button>
            </div>
          </div>

          {/* Dica Pedagógica no Rodapé da Sidebar */}
          <div 
            style={{
              padding: '12px',
              borderRadius: '10px',
              backgroundColor: '#faf5ff',
              border: '1px solid #f3e8ff',
              marginTop: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#46178f', fontSize: '11px', fontWeight: 800, marginBottom: '4px' }}>
              <Sparkles style={{ width: '13px', height: '13px' }} />
              <span>Dica de Organização</span>
            </div>
            <p style={{ fontSize: '11px', color: '#6b7280', lineHeight: 1.4, margin: 0 }}>
              Crie pastas por turma, disciplina ou bimestre para manter seus quizzes sempre organizados.
            </p>
          </div>
        </aside>

        {/* Área Central de Conteúdo */}
        <main 
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Alerta de Salas Ativas (se houver) */}
          {activeRooms.length > 0 && activeNav !== 'active_rooms' && (
            <div 
              style={{
                padding: '14px 18px',
                borderRadius: '10px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#065f46' }}>
                  Você possui {activeRooms.length} {activeRooms.length === 1 ? 'partida aberta' : 'partidas abertas'} aguardando alunos.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveNav('active_rooms')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Gerenciar Salas
              </button>
            </div>
          )}

          {/* ─── Seção da Biblioteca de Quizzes (Pastas & Categorias em Blocos) ── */}
          {activeNav === 'library' && (
            <QuizLibrary
              quizzes={quizzes}
              categories={categories}
              questions={questions}
              folders={folders}
              selectedFolderId={selectedFolderId}
              currentFolderName={currentFolderName}
              onSelectFolder={setSelectedFolderId}
              onCreateFolderClick={handleOpenCreateFolder}
              onPlayCategory={onPlayCategory}
              onEditCategory={onEditCategory}
              onPlayQuiz={onPlayQuiz}
              onEditQuiz={onEditQuiz}
              onDuplicateQuiz={onDuplicateQuiz}
              onToggleFavorite={onToggleFavorite}
              onDeleteQuiz={onDeleteQuiz}
              onCreateNewQuiz={onCreateNewQuiz}
              onOpenQuestionManager={onOpenQuestionManager}
            />
          )}

          {/* ─── Seção Lançar Partida (Atalhos) ─────────────────────────────────── */}
          {activeNav === 'launch' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1e1b4b' }}>
                Escolha o Formato da Sua Partida
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                
                {/* Modo 1 */}
                <div 
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                      <Monitor style={{ width: '24px', height: '24px' }} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                      Presencial no Telão
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                      Ideal para sala de aula ou auditório. As perguntas aparecem no telão e os alunos respondem com cores e símbolos no celular.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLaunchNewRoom('hybrid')}
                    style={{
                      marginTop: '24px',
                      height: '42px',
                      borderRadius: '8px',
                      backgroundColor: '#1368ce',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Iniciar Partida no Telão
                  </button>
                </div>

                {/* Modo 2 */}
                <div 
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#f3e8ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                      <Wifi style={{ width: '24px', height: '24px' }} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                      Online em Tempo Real
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                      Para turmas remotas, híbridas ou atividades para casa. Cada aluno vê as perguntas e opções na sua própria tela.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLaunchNewRoom('online')}
                    style={{
                      marginTop: '24px',
                      height: '42px',
                      borderRadius: '8px',
                      backgroundColor: '#46178f',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Criar Sala Online
                  </button>
                </div>

                {/* Modo 3 */}
                <div 
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                      <Users style={{ width: '24px', height: '24px' }} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                      Local (2 Equipes)
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                      Disputa presencial rápida dividindo a turma em dois times (Azul vs Vermelho) usando apenas um único computador.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLaunchNewRoom('local')}
                    style={{
                      marginTop: '24px',
                      height: '42px',
                      borderRadius: '8px',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Abrir Batalha 2 Times
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* ─── Seção Salas Abertas ────────────────────────────────────────────── */}
          {activeNav === 'active_rooms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1e1b4b', margin: 0 }}>
                  Salas e Partidas Abertas
                </h2>
                <button
                  type="button"
                  onClick={() => onLaunchNewRoom('hybrid')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#1368ce',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  + Nova Sala
                </button>
              </div>

              {activeRooms.length === 0 ? (
                <div 
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    padding: '48px 24px',
                    textAlign: 'center',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <Wifi style={{ width: '42px', height: '42px', color: '#cbd5e1', margin: '0 auto 12px' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                    Nenhuma sala aberta no momento
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '400px', margin: '0 auto 20px' }}>
                    Quando você iniciar uma partida com seus alunos, a sala aparecerá aqui com o código PIN para você gerenciar ou retomar a qualquer momento.
                  </p>
                  <button
                    type="button"
                    onClick={() => onLaunchNewRoom('hybrid')}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      backgroundColor: '#46178f',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Criar Sala Agora
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                  {activeRooms.map(room => (
                    <div 
                      key={room.code}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '14px',
                        padding: '20px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '18px', fontWeight: 900, color: '#46178f', letterSpacing: '0.05em' }}>
                          PIN: {room.code}
                        </span>
                        <span style={{ padding: '2px 8px', borderRadius: '6px', backgroundColor: '#dcfce7', color: '#16a34a', fontSize: '11px', fontWeight: 800 }}>
                          Ativa
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Modo: <b>{room.game_mode}</b> · Rodada {room.current_round} de {room.rounds}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button
                          type="button"
                          onClick={() => onRecoverRoom(room.code)}
                          style={{
                            flex: 1,
                            height: '36px',
                            borderRadius: '6px',
                            backgroundColor: '#1368ce',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '12px',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Entrar na Sala
                        </button>
                        <button
                          type="button"
                          onClick={() => onCloseRoom(room.code)}
                          style={{
                            padding: '0 12px',
                            height: '36px',
                            borderRadius: '6px',
                            backgroundColor: '#fee2e2',
                            color: '#ef4444',
                            fontWeight: 700,
                            fontSize: '12px',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Encerrar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ─── Modal para Criar Nova Pasta (Estilo Kahoot!) ─────────────────────── */}
      {showCreateFolderModal && (
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
          onClick={() => setShowCreateFolderModal(false)}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '400px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderPlus style={{ width: '20px', height: '20px', color: '#46178f' }} />
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#1e1b4b', margin: 0 }}>
                  Criar Nova Pasta
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateFolderModal(false)}
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

            <form onSubmit={handleConfirmCreateFolder} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Nome da Pasta
                </label>
                <input 
                  type="text"
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ex: 3º Ano B, Robótica, História..."
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

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Cor de Identificação
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {FOLDER_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewFolderColor(color)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: color,
                        border: newFolderColor === color ? '3px solid #ffffff' : 'none',
                        boxShadow: newFolderColor === color ? '0 0 0 2px #46178f' : 'none',
                        cursor: 'pointer',
                        transition: 'transform 0.1s ease',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateFolderModal(false)}
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
                  disabled={!newFolderName.trim() || isCreatingFolder}
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
                    opacity: !newFolderName.trim() || isCreatingFolder ? 0.6 : 1,
                  }}
                >
                  {isCreatingFolder ? 'Criando...' : 'Salvar Pasta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default TeacherDashboard;
