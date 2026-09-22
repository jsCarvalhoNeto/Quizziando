import React, { useState, useRef, useEffect } from 'react';
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
  Radio, 
  Folder, 
  FolderPlus, 
  ChevronDown, 
  ChevronRight, 
  Layers, 
  X,
  Volume2,
  VolumeX,
  Palette,
  User,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  BookOpen,
  Loader2,
  Sliders
} from 'lucide-react';
import { type SavedQuiz } from '../../lib/savedQuizzes';
import { type Category, type Question, GAME_THEMES, sfx } from '../../App';
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
  onDeleteCategory?: (categoryId: string) => Promise<void> | void;
  onCreateNewQuiz: () => void;
  onStartRouletteGame: (categoryIds: string[], mode: 'online' | 'local' | 'hybrid') => void;
  onStartClassicGame?: (categoryIds: string[], mode: 'online' | 'local' | 'hybrid') => void;
  onSaveRouletteQuiz: (name: string, categoryIds: string[]) => void;
  onCreateFolder: (name: string, color?: string) => Promise<void> | void;
  onOpenQuestionManager: (mode?: 'bank' | 'create') => void;
  onOpenSettings: () => void;
  onRecoverRoom: (roomCode: string) => void;
  onCloseRoom: (roomCode: string) => void;
  onLaunchNewRoom: (mode: 'online' | 'hybrid' | 'local') => void;
  // Configurações e IA
  geminiApiKey?: string;
  onUpdateGeminiApiKey?: (key: string) => void;
  geminiModel?: string;
  onUpdateGeminiModel?: (model: string) => void;
  geminiCustomModels?: string[];
  onAddCustomModel?: (model: string) => void;
  onRemoveCustomModel?: (model: string) => void;
  aiTestStatus?: 'idle' | 'success' | 'error';
  aiTestingKey?: boolean;
  aiTestErrorMsg?: string;
  onTestGeminiConnection?: (key: string) => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  gameTheme?: string;
  onSelectGameTheme?: (theme: string) => void;
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
  onDeleteCategory,
  onCreateNewQuiz,
  onStartRouletteGame,
  onStartClassicGame,
  onSaveRouletteQuiz,
  onCreateFolder,
  onOpenQuestionManager,
  onOpenSettings,
  onRecoverRoom,
  onCloseRoom,
  onLaunchNewRoom,
  // Configurações e IA
  geminiApiKey = '',
  onUpdateGeminiApiKey,
  geminiModel = 'gemini-1.5-flash',
  onUpdateGeminiModel,
  geminiCustomModels = [],
  onAddCustomModel,
  onRemoveCustomModel,
  aiTestStatus = 'idle',
  aiTestingKey = false,
  aiTestErrorMsg = '',
  onTestGeminiConnection,
  soundEnabled = true,
  onToggleSound,
  gameTheme = 'default',
  onSelectGameTheme,
}) => {
  const [activeNav, setActiveNav] = useState<'library' | 'launch' | 'active_rooms'>('library');
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Estados do Menu Popover de Configurações no Painel
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<'ai' | 'preferences' | 'themes' | 'account'>('ai');
  const [showApiKey, setShowApiKey] = useState(false);
  const [customModelInput, setCustomModelInput] = useState('');
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // Fechar menu de configurações ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setShowSettingsMenu(false);
      }
    };
    if (showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsMenu]);

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
        minHeight: 'calc(100vh - 38px)',
        flex: 1,
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

          {/* Botão Criar Questões & IA */}
          <button
            type="button"
            onClick={() => onOpenQuestionManager('create')}
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
            title="Criar Questões e Gerar com IA"
          >
            <Sparkles style={{ width: '15px', height: '15px', color: '#8b5cf6' }} />
            <span>Criar Questões</span>
          </button>

          {/* Botão e Menu Popover de Configurações */}
          <div style={{ position: 'relative' }} ref={settingsMenuRef}>
            <button
              type="button"
              onClick={() => {
                setShowSettingsMenu(prev => !prev);
                sfx.playClick();
              }}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: showSettingsMenu ? '#ede9fe' : '#f8fafc',
                border: `1px solid ${showSettingsMenu ? '#8b5cf6' : '#e2e8f0'}`,
                color: showSettingsMenu ? '#6d28d9' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: showSettingsMenu ? '0 0 0 3px rgba(139, 92, 246, 0.15)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!showSettingsMenu) {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#1e293b';
                }
              }}
              onMouseLeave={(e) => {
                if (!showSettingsMenu) {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.color = '#64748b';
                }
              }}
              title="Configurações e Inteligência Artificial"
            >
              <Settings 
                style={{ 
                  width: '18px', 
                  height: '18px', 
                  transform: showSettingsMenu ? 'rotate(45deg)' : 'none', 
                  transition: 'transform 0.25s ease' 
                }} 
              />
            </button>

            {/* Menu Popover de Configurações */}
            {showSettingsMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  right: 0,
                  width: '420px',
                  maxWidth: '92vw',
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.04)',
                  zIndex: 100,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  animation: 'fadeInModal 0.2s ease',
                }}
              >
                {/* Cabeçalho do Popover */}
                <div 
                  style={{
                    padding: '16px 20px 12px 20px',
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div 
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: '#f5f3ff',
                          color: '#7c3aed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Settings style={{ width: '18px', height: '18px' }} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                          Configurações
                        </h4>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          IA, áudio, temas e perfil
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSettingsMenu(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#0f172a'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                      title="Fechar"
                    >
                      <X style={{ width: '18px', height: '18px' }} />
                    </button>
                  </div>

                  {/* Abas de Navegação */}
                  <div 
                    style={{
                      display: 'flex',
                      gap: '4px',
                      backgroundColor: '#f8fafc',
                      padding: '4px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => { setSettingsActiveTab('ai'); sfx.playClick(); }}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: '7px',
                        border: 'none',
                        backgroundColor: settingsActiveTab === 'ai' ? '#ffffff' : 'transparent',
                        color: settingsActiveTab === 'ai' ? '#7c3aed' : '#64748b',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        boxShadow: settingsActiveTab === 'ai' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Sparkles style={{ width: '13px', height: '13px' }} />
                      <span>IA Gemini</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setSettingsActiveTab('preferences'); sfx.playClick(); }}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: '7px',
                        border: 'none',
                        backgroundColor: settingsActiveTab === 'preferences' ? '#ffffff' : 'transparent',
                        color: settingsActiveTab === 'preferences' ? '#0284c7' : '#64748b',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        boxShadow: settingsActiveTab === 'preferences' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Volume2 style={{ width: '13px', height: '13px' }} />
                      <span>Geral</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setSettingsActiveTab('themes'); sfx.playClick(); }}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: '7px',
                        border: 'none',
                        backgroundColor: settingsActiveTab === 'themes' ? '#ffffff' : 'transparent',
                        color: settingsActiveTab === 'themes' ? '#db2777' : '#64748b',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        boxShadow: settingsActiveTab === 'themes' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Palette style={{ width: '13px', height: '13px' }} />
                      <span>Temas</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setSettingsActiveTab('account'); sfx.playClick(); }}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: '7px',
                        border: 'none',
                        backgroundColor: settingsActiveTab === 'account' ? '#ffffff' : 'transparent',
                        color: settingsActiveTab === 'account' ? '#059669' : '#64748b',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        boxShadow: settingsActiveTab === 'account' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <User style={{ width: '13px', height: '13px' }} />
                      <span>Conta</span>
                    </button>
                  </div>
                </div>

                {/* Conteúdo Dinâmico das Abas */}
                <div 
                  style={{ 
                    padding: '16px 20px', 
                    maxHeight: '440px', 
                    overflowY: 'auto',
                    backgroundColor: '#ffffff'
                  }}
                >
                  {/* ABA: INTELIGÊNCIA ARTIFICIAL */}
                  {settingsActiveTab === 'ai' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {/* Card de Status da Conexão */}
                      {aiTestStatus === 'success' && (
                        <div 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            backgroundColor: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            color: '#15803d',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          <CheckCircle2 style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                          <span>Google Gemini AI conectado e pronto para uso!</span>
                        </div>
                      )}

                      {aiTestStatus === 'error' && (
                        <div 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#b91c1c',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                          <span>{aiTestErrorMsg || 'Falha ao conectar. Verifique a chave ou cota.'}</span>
                        </div>
                      )}

                      {!geminiApiKey?.trim() && aiTestStatus === 'idle' && (
                        <div 
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            backgroundColor: '#fffbeb',
                            border: '1px solid #fef3c7',
                            color: '#b45309',
                            fontSize: '12px',
                            lineHeight: 1.4,
                          }}
                        >
                          <AlertTriangle style={{ width: '16px', height: '16px', flexShrink: 0, marginTop: '2px' }} />
                          <span>Chave de API do Gemini não configurada. Insira sua chave abaixo para gerar questões automaticamente por IA.</span>
                        </div>
                      )}

                      {/* Campo: Chave de API */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Key style={{ width: '13px', height: '13px', color: '#7c3aed' }} />
                            Chave de API do Gemini
                          </label>
                          <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '11px',
                              color: '#7c3aed',
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontWeight: 600,
                            }}
                          >
                            Obter chave gratuita
                            <ExternalLink style={{ width: '10px', height: '10px' }} />
                          </a>
                        </div>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <input
                            type={showApiKey ? 'text' : 'password'}
                            placeholder="Cole sua API Key do Google AI Studio..."
                            value={geminiApiKey}
                            onChange={(e) => {
                              if (onUpdateGeminiApiKey) {
                                onUpdateGeminiApiKey(e.target.value);
                              } else {
                                localStorage.setItem('geminiApiKey', e.target.value);
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 38px 10px 12px',
                              borderRadius: '10px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#f8fafc',
                              color: '#0f172a',
                              fontSize: '13px',
                              outline: 'none',
                              boxSizing: 'border-box',
                              fontFamily: showApiKey ? 'monospace' : 'inherit',
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = '#8b5cf6';
                              e.currentTarget.style.backgroundColor = '#ffffff';
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = '#cbd5e1';
                              e.currentTarget.style.backgroundColor = '#f8fafc';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(prev => !prev)}
                            style={{
                              position: 'absolute',
                              right: '8px',
                              background: 'transparent',
                              border: 'none',
                              color: '#64748b',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title={showApiKey ? 'Ocultar chave' : 'Mostrar chave'}
                          >
                            {showApiKey ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
                          </button>
                        </div>
                      </div>

                      {/* Campo: Modelo Ativo */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                          Modelo Ativo do Gemini
                        </label>
                        <select
                          value={geminiModel}
                          onChange={(e) => {
                            if (onUpdateGeminiModel) {
                              onUpdateGeminiModel(e.target.value);
                            } else {
                              localStorage.setItem('geminiModel', e.target.value);
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#f8fafc',
                            color: '#0f172a',
                            fontSize: '12px',
                            fontWeight: 600,
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="gemini-1.5-flash">gemini-1.5-flash (Padrão e Mais Rápido)</option>
                          <option value="gemini-1.5-pro">gemini-1.5-pro (Raciocínio Avançado)</option>
                          <option value="gemini-2.5-flash">gemini-2.5-flash (Nova Geração)</option>
                          <option value="gemini-2.0-flash-exp">gemini-2.0-flash-exp (Experimental)</option>
                          {geminiCustomModels.map((model) => (
                            <option key={model} value={model}>{model} (Personalizado)</option>
                          ))}
                        </select>
                      </div>

                      {/* Adicionar Modelo Customizado */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
                          Adicionar modelo personalizado
                        </label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="text"
                            placeholder="Ex: gemini-2.5-pro"
                            value={customModelInput}
                            onChange={(e) => setCustomModelInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (customModelInput.trim() && onAddCustomModel) {
                                  onAddCustomModel(customModelInput.trim());
                                  setCustomModelInput('');
                                }
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              fontSize: '12px',
                              color: '#0f172a',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (customModelInput.trim() && onAddCustomModel) {
                                onAddCustomModel(customModelInput.trim());
                                setCustomModelInput('');
                              }
                            }}
                            disabled={!customModelInput.trim()}
                            style={{
                              padding: '0 12px',
                              borderRadius: '8px',
                              backgroundColor: customModelInput.trim() ? '#7c3aed' : '#e2e8f0',
                              color: customModelInput.trim() ? '#ffffff' : '#94a3b8',
                              border: 'none',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: customModelInput.trim() ? 'pointer' : 'default',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Plus style={{ width: '13px', height: '13px' }} />
                            <span>Adicionar</span>
                          </button>
                        </div>

                        {/* Chips de modelos customizados */}
                        {geminiCustomModels.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '4px' }}>
                            {geminiCustomModels.map((model) => (
                              <span
                                key={model}
                                style={{
                                  fontSize: '11px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: '#f5f3ff',
                                  border: '1px solid #ddd6fe',
                                  color: '#6d28d9',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontWeight: 600,
                                }}
                              >
                                {model}
                                {onRemoveCustomModel && (
                                  <button
                                    type="button"
                                    onClick={() => onRemoveCustomModel(model)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#7c3aed',
                                      cursor: 'pointer',
                                      padding: '0 2px',
                                      fontSize: '13px',
                                      lineHeight: 1,
                                    }}
                                    title={`Remover ${model}`}
                                  >
                                    ×
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Botões de Ação de IA */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (onTestGeminiConnection) {
                              onTestGeminiConnection(geminiApiKey);
                            }
                          }}
                          disabled={aiTestingKey || !geminiApiKey?.trim()}
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            borderRadius: '10px',
                            backgroundColor: geminiApiKey?.trim() ? '#46178f' : '#cbd5e1',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: geminiApiKey?.trim() && !aiTestingKey ? 'pointer' : 'default',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: geminiApiKey?.trim() ? '0 4px 12px rgba(70, 23, 143, 0.25)' : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {aiTestingKey ? (
                            <>
                              <Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
                              <span>Validando Conexão...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles style={{ width: '14px', height: '14px' }} />
                              <span>Testar Conexão</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowSettingsMenu(false);
                            onOpenQuestionManager('create');
                          }}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#1e293b',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f1f5f9';
                            e.currentTarget.style.borderColor = '#94a3b8';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                            e.currentTarget.style.borderColor = '#cbd5e1';
                          }}
                          title="Abrir Gerador de Questões com IA"
                        >
                          <BookOpen style={{ width: '14px', height: '14px', color: '#7c3aed' }} />
                          <span>Gerar Questões</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ABA: PREFERÊNCIAS & SOM */}
                  {settingsActiveTab === 'preferences' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {/* Efeitos Sonoros */}
                      <div 
                        style={{
                          padding: '14px',
                          borderRadius: '12px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div 
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              backgroundColor: soundEnabled ? '#e0f2fe' : '#fee2e2',
                              color: soundEnabled ? '#0284c7' : '#ef4444',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {soundEnabled ? <Volume2 style={{ width: '18px', height: '18px' }} /> : <VolumeX style={{ width: '18px', height: '18px' }} />}
                          </div>
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'block' }}>
                              Efeitos Sonoros
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              Sons de lobby, cliques e respostas
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (onToggleSound) onToggleSound();
                            else sfx.playClick();
                          }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            border: 'none',
                            backgroundColor: soundEnabled ? '#0284c7' : '#e2e8f0',
                            color: soundEnabled ? '#ffffff' : '#64748b',
                            fontSize: '11px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {soundEnabled ? 'LIGADO' : 'DESLIGADO'}
                        </button>
                      </div>

                      {/* Acesso ao Gerenciador de Perguntas */}
                      <div 
                        style={{
                          padding: '14px',
                          borderRadius: '12px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div 
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              backgroundColor: '#f5f3ff',
                              color: '#7c3aed',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <BookOpen style={{ width: '18px', height: '18px' }} />
                          </div>
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'block' }}>
                              Banco de Questões
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              {questions.length} perguntas cadastradas
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setShowSettingsMenu(false);
                            onOpenQuestionManager('bank');
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            backgroundColor: '#46178f',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Gerenciar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ABA: TEMAS DA ARENA */}
                  {settingsActiveTab === 'themes' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        Escolha a aparência visual de fundo das partidas e roleta:
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        {Object.entries(GAME_THEMES).map(([key, theme]) => {
                          const isSelected = gameTheme === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                if (onSelectGameTheme) onSelectGameTheme(key);
                              }}
                              style={{
                                padding: '8px',
                                borderRadius: '10px',
                                border: `2px solid ${isSelected ? '#7c3aed' : '#e2e8f0'}`,
                                backgroundColor: isSelected ? '#f5f3ff' : '#f8fafc',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                textAlign: 'left',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div 
                                style={{
                                  width: '100%',
                                  height: '36px',
                                  borderRadius: '6px',
                                  backgroundColor: theme.bg !== 'transparent' ? theme.bg : '#1e1b4b',
                                  backgroundImage: theme.img !== 'none' ? theme.img : 'linear-gradient(135deg, #46178f, #1368ce)',
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                }}
                              />
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#6d28d9' : '#334155' }}>
                                  {theme.label}
                                </span>
                                {isSelected && (
                                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#16a34a', backgroundColor: '#dcfce7', padding: '1px 5px', borderRadius: '4px' }}>
                                    Ativo
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ABA: CONTA */}
                  {settingsActiveTab === 'account' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div 
                        style={{
                          padding: '16px',
                          borderRadius: '12px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div 
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              backgroundColor: '#46178f',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '16px',
                            }}
                          >
                            {teacherEmail.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {teacherEmail}
                            </span>
                            <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>
                              ✓ Professor Autenticado
                            </span>
                          </div>
                        </div>

                        <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                          Você possui permissão de operador com acesso ao gerenciador de quizzes, pastas, relatórios e controle de salas.
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setShowSettingsMenu(false);
                          onLogout();
                        }}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '10px',
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fecaca',
                          color: '#dc2626',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#fee2e2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#fef2f2';
                        }}
                      >
                        <LogOut style={{ width: '15px', height: '15px' }} />
                        <span>Sair da Conta (Logout)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Rodapé do Menu: Atalho para o Modal Completo de Configurações */}
                <div 
                  style={{
                    padding: '10px 20px',
                    borderTop: '1px solid #f1f5f9',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsMenu(false);
                      onOpenSettings();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#46178f',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 0',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                  >
                    <Sliders style={{ width: '13px', height: '13px' }} />
                    <span>Abrir Configurações Detalhadas (Modal)</span>
                  </button>

                  <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>
                    Quizziando v2.0
                  </span>
                </div>
              </div>
            )}
          </div>

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
              onDeleteCategory={onDeleteCategory}
              onCreateNewQuiz={onCreateNewQuiz}
              onStartRouletteGame={onStartRouletteGame}
              onStartClassicGame={onStartClassicGame}
              onSaveRouletteQuiz={onSaveRouletteQuiz}
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
