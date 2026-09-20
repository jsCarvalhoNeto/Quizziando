// Quizziando - Arena Realtime Arena - Produção Supabase Habilitada
import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Trophy, Play, Plus, Trash, User, Users, Volume2, VolumeX, 
  Clock, CheckCircle, XCircle, RotateCcw, 
  Crown, Sparkles, BookOpen, ChevronRight, AlertCircle,
  Lock, Eye, EyeOff, LogOut, ShieldCheck, Mail, Copy,
  Pencil, Check, X, Settings, Upload, FileText, Monitor, Wifi, Palette,
  ArrowLeft
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from './lib/supabaseClient';
import { eligibleCategories, remainingSeconds } from './lib/gameRules';
import { gameRpc, type OnlineRoom } from './lib/onlineGame';
import PlayerView, { ANSWER_COLORS } from './PlayerView';
import SpectatorView from './SpectatorView';
import PracticeView from './PracticeView';
import { getAvatarUrl } from './lib/avatars';
import { readSavedQuizzes, saveQuiz, deleteSavedQuiz, duplicateQuiz, toggleFavoriteQuiz, type SavedQuiz } from './lib/savedQuizzes';
import { createQuestionBank, downloadQuestionBank, parseQuestionBank } from './lib/questionBank';
import LocalGameMode from './LocalGameMode';
import LoginPortal from './components/auth/LoginPortal';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import QuizConfigModal from './components/teacher/QuizConfigModal';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

// Contagem animada de pontos (0 → valor final) usada no pódio
function ScoreCountUp({ value, duration = 1200, style }: { value: number; duration?: number; style?: React.CSSProperties }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // desacelera no final
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span style={style}>{display} pts</span>;
}

// Detectar se o jogador está acessando via link de sala
const urlParams = new URLSearchParams(window.location.search);
const URL_ROOM_CODE = urlParams.get('room')?.toUpperCase() || null;

const GAME_THEMES: Record<string, { bg: string, img: string, label: string }> = {
  'default': { bg: '#2a1b54', img: 'none', label: 'Padrão' },
  'tema1': { bg: 'transparent', img: 'url(https://nttbpmnnzrrhijobinui.supabase.co/storage/v1/object/public/images/tema1.png)', label: 'Tema 1' },
  'tema2': { bg: 'transparent', img: 'url(https://nttbpmnnzrrhijobinui.supabase.co/storage/v1/object/public/images/tema2.png)', label: 'Tema 2' },
  'tema3': { bg: 'transparent', img: 'url(https://nttbpmnnzrrhijobinui.supabase.co/storage/v1/object/public/images/tema3.png)', label: 'Tema 3' },
  'tema4': { bg: 'transparent', img: 'url(https://nttbpmnnzrrhijobinui.supabase.co/storage/v1/object/public/images/tema4.png)', label: 'Tema 4' },
  'tema5': { bg: 'transparent', img: 'url(https://nttbpmnnzrrhijobinui.supabase.co/storage/v1/object/public/images/tema5.png)', label: 'Tema 5' },
  'tema6': { bg: 'transparent', img: 'url(https://nttbpmnnzrrhijobinui.supabase.co/storage/v1/object/public/images/tema6.png)', label: 'Tema 6' },
};

// ==========================================
// 🎵 SINTETIZADOR DE EFEITOS SONOROS (WEB AUDIO API)
// ==========================================
class SoundFX {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private spinAudio: HTMLAudioElement | null = null;
  public lobbyAudio: HTMLAudioElement | null = null;
  public gameAudio: HTMLAudioElement | null = null;

  constructor() {
    // Inicializar áudio para pre-carregamento
    if (typeof window !== 'undefined') {
      this.spinAudio = new Audio('/spin.mp3');
      this.spinAudio.preload = 'auto';
      
      this.lobbyAudio = new Audio('/lobby.mp3');
      this.lobbyAudio.preload = 'auto';
      this.lobbyAudio.loop = true;
      this.lobbyAudio.volume = 0.4;
      
      this.gameAudio = new Audio('/game.mp3');
      this.gameAudio.preload = 'auto';
      this.gameAudio.loop = true;
      this.gameAudio.volume = 0.5;
    }
  }

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playSpin() {
    if (!this.enabled) return;
    try {
      // Cria um novo objeto Audio a cada vez para evitar problemas de estado de mídia
      const audio = new Audio('/spin.mp3');
      audio.volume = 1.0;
      audio.play().catch(e => console.warn('Erro ao tocar spin.mp3:', e));
    } catch (e) {
      console.warn('Erro ao instanciar Audio:', e);
    }
  }

  playGameSound() {
    if (!this.enabled || !this.gameAudio) return;
    try {
      this.gameAudio.currentTime = 0;
      this.gameAudio.play().catch(e => console.warn('Erro ao tocar game.mp3:', e));
    } catch (e) {
      console.warn('Erro na música de jogo:', e);
    }
  }

  stopGameSound() {
    if (!this.gameAudio) return;
    try {
      this.gameAudio.pause();
    } catch (e) {
      console.warn('Erro ao parar música de jogo:', e);
    }
  }

  playCorrect() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, this.ctx.currentTime + 0.2); // G5
    osc.frequency.setValueAtTime(1046.50, this.ctx.currentTime + 0.3); // C6
    
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  playWrong() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(90, this.ctx.currentTime + 0.4);
    
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  playDrumRoll() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    
    // Simular rufar de tambores gerando ruído branco modulado
    const bufferSize = this.ctx.sampleRate * 2.5; // 2.5 segundos
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, this.ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(300, this.ctx.currentTime + 2.0);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 2.5);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    noise.start();
  }

  playLobby() {
    if (!this.enabled || !this.lobbyAudio) return;
    this.lobbyAudio.play().catch(e => console.error("Error playing lobby.mp3:", e));
  }

  stopLobby() {
    if (!this.lobbyAudio) return;
    this.lobbyAudio.pause();
    this.lobbyAudio.currentTime = 0;
  }

  playVictory() {
    if (!this.enabled) return;
    try {
      const audio = new Audio('/victory.mp3');
      audio.volume = 0.5; // Adjust volume as needed
      audio.play().catch(e => console.error("Error playing victory.mp3:", e));
    } catch (e) {
      console.error("Audio not supported:", e);
    }
  }
}

const sfx = new SoundFX();

// ==========================================
// 📊 TIPAGENS E INTERFACES DO PROJETO
// ==========================================
export interface CategoryFolder {
  id: string;
  name: string;
  color: string;
  created_by: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  folder_id?: string | null;
}

export interface Question {
  id: string;
  category_id: string;
  question_text: string;
  alternatives: Alternative[];
  time_limit?: number;
  explanation?: string | null;
  reference_url?: string | null;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
}

function matchesQuestionFilters(question: Question, selectedIds: string[] | null, difficulty: string, tag: string): boolean {
  return (!selectedIds || selectedIds.includes(question.id)) &&
    (difficulty === 'all' || (question.difficulty || 'medium') === difficulty) &&
    (!tag.trim() || (question.tags || []).some(value => value.toLocaleLowerCase('pt-BR').includes(tag.trim().toLocaleLowerCase('pt-BR'))));
}

interface Alternative {
  text: string;
  isCorrect: boolean;
}

interface HostRoomSummary {
  code: string;
  status: string;
  round_state: string;
  current_round: number;
  rounds: number;
  game_mode: 'open' | 'team' | 'duel';
  updated_at: string;
}

interface GamePlayer {
  id: string;
  nickname: string;
  team_name?: string;
  score: number;
  stats?: {
    answers: Record<number, boolean>; // round_index -> is_correct
  };
}

// ==========================================
// 💡 BANCO DE DADOS LOCAL DE DEMONSTRAÇÃO
// ==========================================
const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Tecnologia', color: '#10B981', icon: 'Zap' },
  { id: '2', name: 'Ciências', color: '#3B82F6', icon: 'Compass' },
  { id: '3', name: 'Geografia', color: '#F59E0B', icon: 'Crown' },
  { id: '4', name: 'História', color: '#EF4444', icon: 'Trophy' },
  { id: '5', name: 'Esportes', color: '#8B5CF6', icon: 'Sparkles' },
];

const DEFAULT_QUESTIONS: Question[] = [
  {
    id: 'q1',
    category_id: '1',
    question_text: 'Qual destas tecnologias é amplamente usada para estilização de páginas web modernas?',
    alternatives: [
      { text: 'CSS Custom Properties (Variables)', isCorrect: true },
      { text: 'Pascal', isCorrect: false },
      { text: 'JSON', isCorrect: false },
      { text: 'Apache Kafka', isCorrect: false }
    ]
  },
  {
    id: 'q2',
    category_id: '1',
    question_text: 'O que significa a sigla HTML na estruturação web?',
    alternatives: [
      { text: 'HyperText Markup Language', isCorrect: true },
      { text: 'High Text Modern Links', isCorrect: false },
      { text: 'Hyperlink Transfer Mode Language', isCorrect: false },
      { text: 'Home Tool Markup Ledger', isCorrect: false }
    ]
  },
  {
    id: 'q3',
    category_id: '2',
    question_text: 'Quantos planetas existem oficialmente no nosso Sistema Solar?',
    alternatives: [
      { text: '8 planetas', isCorrect: true },
      { text: '9 planetas', isCorrect: false },
      { text: '7 planetas', isCorrect: false },
      { text: '10 planetas', isCorrect: false }
    ]
  },
  {
    id: 'q4',
    category_id: '3',
    question_text: 'Qual é o maior país do mundo em área territorial?',
    alternatives: [
      { text: 'Rússia', isCorrect: true },
      { text: 'Canadá', isCorrect: false },
      { text: 'Brasil', isCorrect: false },
      { text: 'Estados Unidos', isCorrect: false }
    ]
  },
  {
    id: 'q5',
    category_id: '4',
    question_text: 'Em qual ano ocorreu a Proclamação da República no Brasil?',
    alternatives: [
      { text: '1889', isCorrect: true },
      { text: '1500', isCorrect: false },
      { text: '1822', isCorrect: false },
      { text: '1930', isCorrect: false }
    ]
  },
  {
    id: 'q6',
    category_id: '5',
    question_text: 'Quantas Copas do Mundo de Futebol Masculino a Seleção Brasileira conquistou?',
    alternatives: [
      { text: '5 Copas', isCorrect: true },
      { text: '4 Copas', isCorrect: false },
      { text: '6 Copas', isCorrect: false },
      { text: '3 Copas', isCorrect: false }
    ]
  }
];

export default function App() {
  const [authUser, setAuthUser] = useState<{ id?: string, email: string } | null>(null);
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ? { id: session.user.id, email: session.user.email || '' } : null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Configurações Globais / Conexão
  const [useRealSupabase] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = localStorage.getItem('soundEnabled');
      return saved === null || saved === 'true' ? true : false;
    } catch {
      return true;
    }
  });
  const [gameTheme, setGameTheme] = useState(() => localStorage.getItem('gameTheme') || 'default');
  // Imagem de tema personalizada (carregada localmente, salva como data URL no localStorage)
  const [customThemeImg, setCustomThemeImg] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try { return localStorage.getItem('customThemeImg'); } catch { return null; }
  });

  // Resolve o fundo do tema atual (suporta o tema 'custom')
  const activeThemeBg = gameTheme === 'custom' ? 'transparent' : (GAME_THEMES[gameTheme]?.bg || '#2a1b54');
  const activeThemeImg = gameTheme === 'custom'
    ? (customThemeImg ? `url(${customThemeImg})` : 'none')
    : (GAME_THEMES[gameTheme]?.img || 'none');

  // Carregar arquivo de imagem local e defini-lo como tema personalizado
  const handleCustomThemeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 3 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      try {
        localStorage.setItem('customThemeImg', dataUrl);
      } catch {
        alert('Não foi possível salvar a imagem (muito grande). Tente uma imagem menor.');
        return;
      }
      setCustomThemeImg(dataUrl);
      setGameTheme('custom');
      localStorage.setItem('gameTheme', 'custom');
      sfx.playClick();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Estados de Pastas
  const [folders, setFolders] = useState<CategoryFolder[]>([]);

  // Estados de Categorias (declarados aqui para o useEffect)
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[] | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>(readSavedQuizzes);
  const [newQuizName, setNewQuizName] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const availableQuestionCount = questions.filter(q =>
    selectedCategoryIds.includes(q.category_id) && matchesQuestionFilters(q, selectedQuestionIds, difficultyFilter, tagFilter)
  ).length;
  
  const handleToggleCategorySelect = (id: string) => {
    setSelectedCategoryIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(c => c !== id);
      }
      if (prev.length >= 14) {
        alert('Você só pode selecionar até 14 categorias para o jogo.');
        return prev;
      }
      return [...prev, id];
    });
  };

  // Carregar dados reais do Supabase se ativo
  useEffect(() => {
    const fetchData = async () => {
      if (useRealSupabase) {
        if (!authUser?.id) { setFolders([]); setCategories([]); setQuestions([]); setSelectedCategoryIds([]); return; }
        try {
          // 0. Carregar Pastas
          const { data: folderData } = await supabase
            .from('category_folders')
            .select('*');
          if (folderData && folderData.length > 0) {
            setFolders(folderData);
          } else {
            setFolders([]);
          }

          // 1. Carregar Categorias
          const { data: catData } = await supabase
            .from('categories')
            .select('*');
          if (catData && catData.length > 0) {
            const mappedCats = catData.map(c => ({
              id: c.id,
              name: c.name,
              color: c.color,
              icon: c.icon,
              folder_id: c.folder_id
            }));
            setCategories(mappedCats);
            setSelectedCategoryIds(mappedCats.slice(0, 14).map(c => c.id));
          } else {
            setCategories([]);
            setSelectedCategoryIds([]);
          }

          // 2. Carregar Perguntas com suas respectivas alternativas
          const { data: qData } = await supabase
            .from('questions')
            .select(`
              id,
              category_id,
              question_text,
              time_limit,
              explanation,
              reference_url,
              difficulty,
              tags,
              alternatives (
                alternative_text,
                is_correct
              )
            `);
          if (qData && qData.length > 0) {
            setQuestions(qData.map((q: any) => ({
              id: q.id,
              category_id: q.category_id,
              question_text: q.question_text,
              time_limit: q.time_limit,
              explanation: q.explanation,
              reference_url: q.reference_url,
              difficulty: q.difficulty,
              tags: q.tags,
              alternatives: q.alternatives.map((alt: any) => ({
                text: alt.alternative_text,
                isCorrect: alt.is_correct
              }))
            })));
          } else {
            setQuestions([]);
          }
        } catch (err) {
          console.error("Erro ao buscar dados do Supabase:", err);
          setCategories([]);
          setQuestions([]);
        }
      } else {
        // Resetar para padrões do mockup local
        setCategories(DEFAULT_CATEGORIES);
        setQuestions(DEFAULT_QUESTIONS);
        setSelectedCategoryIds(DEFAULT_CATEGORIES.slice(0, 14).map(c => c.id));
      }
    };
    
    fetchData();
  }, [useRealSupabase, authUser?.id]);

  // ==========================================
  // 🖥️ MODO DE JOGO: 'portal' | 'select' | 'online' | 'local' | 'practice'
  // ==========================================
  const [appMode, setAppMode] = useState<'portal' | 'select' | 'online' | 'local' | 'practice'>('portal');
  const [studentRoomCode, setStudentRoomCode] = useState<string | null>(null);
  const [showQuizConfigModal, setShowQuizConfigModal] = useState(false);
  const [hybridMode, setHybridMode] = useState(false);

  const handleReturnToSelectMode = () => {
    if (screen === 'game-play' || screen === 'game-lobby') {
      const confirmLeave = window.confirm('Deseja realmente sair da sala atual?');
      if (!confirmLeave) return;
      setScreen(authUser ? 'operator-dashboard' : 'welcome');
    }
    sfx.stopLobby();
    sfx.playClick();
    if (authUser) {
      setAppMode('online');
      setScreen('operator-dashboard');
    } else {
      setAppMode('portal');
      setScreen('welcome');
    }
  };

  // Telas: 'welcome' | 'operator-dashboard' | 'game-lobby' | 'game-play' | 'podium'
  const [screen, setScreen] = useState<'welcome' | 'operator-dashboard' | 'game-lobby' | 'game-play' | 'podium'>('welcome');
  const [hostRooms, setHostRooms] = useState<HostRoomSummary[]>([]);
  const [hostRoomsLoading, setHostRoomsLoading] = useState(false);
  const [hostRoomsError, setHostRoomsError] = useState('');
  const [hostRoomsRefresh, setHostRoomsRefresh] = useState(0);
  useEffect(() => {
    if (screen !== 'operator-dashboard' || !authUser?.id || !useRealSupabase) return;
    let cancelled = false;
    const load = async () => {
      setHostRoomsLoading(true);
      setHostRoomsError('');
      setHostRooms([]);
      const { data, error } = await supabase.from('game_rooms')
        .select('code,status,round_state,current_round,rounds,game_mode,updated_at')
        .eq('host_id', authUser.id).in('status', ['lobby', 'playing'])
        .order('updated_at', { ascending: false });
      if (cancelled) return;
      setHostRoomsLoading(false);
      if (error) setHostRoomsError('Não foi possível carregar suas salas. Tente novamente.');
      else setHostRooms((data || []) as HostRoomSummary[]);
    };
    void load();
    return () => { cancelled = true; };
  }, [screen, authUser?.id, useRealSupabase, hostRoomsRefresh]);
  void hostRoomsLoading;
  void hostRoomsError;
  const [podiumStep, setPodiumStep] = useState(0); // 0: cortina, 1: abre, 2: 3º lugar, 3: 2º lugar, 4: 1º lugar
  const [role, setRole] = useState<'operator' | 'player'>('player');
  const [nickname, setNickname] = useState('');
  const [teamName, setTeamName] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');

  // Sincronizar estado de som com a classe de efeitos sonoros
  useEffect(() => {
    sfx.enabled = soundEnabled;
    localStorage.setItem('soundEnabled', String(soundEnabled));
    if (!soundEnabled) {
      sfx.stopLobby();
      sfx.stopGameSound();
    } else {
      if (screen === 'game-lobby') {
        sfx.playLobby();
      } else if (screen === 'game-play') {
        sfx.playGameSound();
      }
    }
  }, [soundEnabled, screen]);

  // ==========================================
  // 🔐 ESTADOS DE AUTENTICAÇÃO DO GERENCIADOR
  // ==========================================
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authShowPassword, setAuthShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Estados de Configuração do Painel do Operador
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#EC4899');
  const [showQuickCategoryForm, setShowQuickCategoryForm] = useState(false);
  
  // Estados para Modal de Configurações
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<'general' | 'appearance' | 'ai' | 'account' | 'questions'>('general');
  
  // Estados para Integração Gemini IA
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('geminiApiKey') || '';
    }
    return '';
  });
  const [geminiModel, setGeminiModel] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('geminiModel') || 'gemini-1.5-flash';
    }
    return 'gemini-1.5-flash';
  });
  const [geminiCustomModels, setGeminiCustomModels] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const savedModels = JSON.parse(localStorage.getItem('geminiCustomModels') || '[]');
      return Array.isArray(savedModels) ? savedModels.filter((model): model is string => typeof model === 'string') : [];
    } catch {
      return [];
    }
  });
  const [newGeminiModel, setNewGeminiModel] = useState('');

  // Sincroniza os valores com localStorage sempre que mudam
  useEffect(() => {
    if (geminiApiKey) localStorage.setItem('geminiApiKey', geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    localStorage.setItem('geminiModel', geminiModel);
  }, [geminiModel]);

  useEffect(() => {
    localStorage.setItem('geminiCustomModels', JSON.stringify(geminiCustomModels));
  }, [geminiCustomModels]);
  const [managerTab, setManagerTab] = useState<'manual' | 'ai'>('manual');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiQuantity, setAiQuantity] = useState<number>(1);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDrafts, setAiDrafts] = useState<Question[]>([]);
  const [editingAiDraftId, setEditingAiDraftId] = useState<string | null>(null);
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiUrl, setAiUrl] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiTestStatus, setAiTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [aiTestingKey, setAiTestingKey] = useState(false);
  const [aiTestErrorMsg, setAiTestErrorMsg] = useState('');
  const [aiSavingDraftIds, setAiSavingDraftIds] = useState<string[]>([]);
  const [aiSavingAllDrafts, setAiSavingAllDrafts] = useState(false);

  // Função para testar conexão com o Gemini
  const testGeminiConnection = async (keyToTest: string) => {
    if (!keyToTest.trim()) {
      setAiTestStatus('error');
      setAiTestErrorMsg('Informe uma chave válida.');
      return;
    }
    setAiTestingKey(true);
    setAiTestStatus('idle');
    setAiTestErrorMsg('');
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${keyToTest}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello, respond with exactly "OK"' }] }]
        })
      });
      if (response.ok) {
        setAiTestStatus('success');
        setAiTestErrorMsg('');
        localStorage.setItem('geminiApiKey', keyToTest);
      } else {
        setAiTestStatus('error');
        let details = '';
        try {
          const errData = await response.json();
          if (errData?.error?.message) details = errData.error.message;
        } catch {
          // ignore
        }
        if (response.status === 429) {
          setAiTestErrorMsg('Cota excedida (Erro 429). Aguarde alguns instantes.');
        } else if (response.status === 400 || response.status === 403) {
          setAiTestErrorMsg('Chave inválida ou não autorizada.');
        } else {
          setAiTestErrorMsg(details || `Erro HTTP ${response.status}`);
        }
      }
    } catch (e: any) {
      setAiTestStatus('error');
      setAiTestErrorMsg(e?.message || 'Falha de rede ao conectar.');
    } finally {
      setAiTestingKey(false);
    }
  };

  // Função para extrair texto do arquivo PDF localmente usando pdf.js
  const extractTextFromPdf = async (file: File): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!(window as any).pdfjsLib) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
          document.head.appendChild(script);
          await new Promise((res) => {
            script.onload = () => {
              (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
              res(true);
            };
          });
        }

        const pdfjsLib = (window as any).pdfjsLib;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = '';
        const maxPages = Math.min(pdf.numPages, 10); // Limitar para 10 páginas para performance

        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(' ');
          text += pageText + '\n';
        }
        resolve(text);
      } catch (err) {
        reject(err);
      }
    });
  };

  // Função para gerar questão usando IA do Gemini
  const generateQuestionWithAI = async () => {
    if (!geminiApiKey.trim()) {
      setAiError('Chave de API do Gemini não configurada! Adicione-a nas configurações (ícone de engrenagem no topo).');
      return;
    }
    if (!managerQCatId) {
      setAiError('Por favor, selecione uma Categoria da Questão no formulário.');
      return;
    }

    setAiLoading(true);
    setAiError('');

    try {
      let contextText = '';
      if (aiFile) {
        contextText = await extractTextFromPdf(aiFile);
      }

      const categoryName = categories.find(c => c.id === managerQCatId)?.name || 'Geral';
      const promptText = `Crie ${aiQuantity} questão(ões) de múltipla escolha inédita(s) de alta qualidade, adequada(s) para um jogo de quiz dinâmico.
A(s) questão(ões) deve(m) pertencer ou se relacionar à categoria: "${categoryName}".
${aiPrompt.trim() ? `O tema/prompt de contexto especificado pelo usuário é: "${aiPrompt.trim()}".` : ''}
${aiUrl.trim() ? `Considere o conteúdo desta URL ou vídeo do YouTube como contexto principal: ${aiUrl.trim()}` : ''}
${contextText ? `Use o seguinte contexto extraído de um documento PDF do usuário para embasar a(s) questão(ões):
---
${contextText.slice(0, 10000)}
---` : ''}
REGRAS IMPORTANTES PARA A GERAÇÃO:
1. Enunciado da Questão (Pergunta): Limite de 120 caracteres. Seja objetivo, curto e direto, sem longos textos de contextualização.
2. Alternativas de Resposta: Limite de 75 caracteres por alternativa.
3. Alterne sempre a posição das alternativas corretas no array.
4. Seja o mais objetivo possível e priorize respostas claras e pequenas.
5. Mantenha o comprimento de todas as alternativas de uma questão rigorosamente balanceado. A diferença de tamanho entre a alternativa mais curta e a mais longa em uma mesma questão não deve ultrapassar 10 a 15 caracteres. As opções incorretas devem ser plausíveis e usar o mesmo nível de vocabulário e detalhamento da opção correta.

Você DEVE retornar a resposta estritamente no formato de um ARRAY JSON, sem qualquer outro texto, blocos de código markdown (\`\`\`json) ou comentários.
Estrutura JSON:
[
  {
    "question_text": "Escreva aqui o enunciado da questão...",
    "time_limit": 20,
    "explanation": "Explique brevemente por que a alternativa correta está certa.",
    "alternatives": [
      { "text": "Alternativa correta...", "isCorrect": true },
      { "text": "Alternativa incorreta 1...", "isCorrect": false },
      { "text": "Alternativa incorreta 2...", "isCorrect": false },
      { "text": "Alternativa incorreta 3...", "isCorrect": false }
    ]
  }
]

Garanta que:
1. O array contenha exatamente ${aiQuantity} objeto(s) de questão. As questões devem ser variadas e diferentes entre si.
2. Haja exatamente 4 alternativas por questão.
3. Exatamente uma alternativa por questão tenha "isCorrect": true, e as outras 3 tenham "isCorrect": false.
4. Inclua o campo "time_limit" com o valor numérico em segundos de tempo de espera. O padrão é 20.
5. As perguntas e alternativas sejam desafiadoras, claras, corretas e redigidas em português do Brasil.
6. Inclua uma explicação curta para revisão humana; não invente referências.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        })
      });

      if (!response.ok) {
        let details = '';
        try {
          const errData = await response.json();
          if (errData?.error?.message) {
            details = errData.error.message;
          }
        } catch {
          // ignore
        }

        if (response.status === 429) {
          throw new Error(
            `Cota ou limite de requisições excedido na API do Gemini (Erro 429). ` +
            `Aguarde de 1 a 2 minutos antes de tentar novamente, reduza o número de questões ou escolha o modelo "gemini-1.5-flash" nas configurações.` +
            (details ? ` [Detalhes: ${details}]` : '')
          );
        } else if (response.status === 400 || response.status === 403) {
          throw new Error(
            `Chave de API do Gemini inválida ou sem permissão (Erro ${response.status}). ` +
            `Verifique sua chave nas configurações.` +
            (details ? ` [Detalhes: ${details}]` : '')
          );
        } else if (response.status === 404) {
          throw new Error(
            `Modelo "${geminiModel}" não encontrado (Erro 404). ` +
            `Selecione outro modelo suportado (ex: gemini-1.5-flash) nas configurações.` +
            (details ? ` [Detalhes: ${details}]` : '')
          );
        } else {
          throw new Error(
            `Falha na API do Gemini (${response.status}): ${details || response.statusText || 'Erro na comunicação'}`
          );
        }
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Nenhuma resposta retornada do Gemini.');
      }

      const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      let parsedArray = JSON.parse(cleanJson);
      
      // Fallback in case AI returned a single object instead of an array
      if (!Array.isArray(parsedArray)) {
        parsedArray = [parsedArray];
      }

      const newQuestions: Question[] = [];

      for (const parsed of parsedArray) {
        if (!parsed.question_text || !Array.isArray(parsed.alternatives) || parsed.alternatives.length !== 4) {
          continue; // Pular questões mal formatadas
        }

        const correctCount = parsed.alternatives.filter((a: any) => a.isCorrect).length;
        if (correctCount !== 1 || parsed.alternatives.some((a: any) => typeof a.text !== 'string' || !a.text.trim())) continue;

        const updatedAlts = parsed.alternatives.map((alt: any) => ({
          text: alt.text,
          isCorrect: alt.isCorrect
        }));

        newQuestions.push({
          id: crypto.randomUUID(),
          category_id: managerQCatId,
          question_text: parsed.question_text.trim(),
          time_limit: parsed.time_limit || 20,
          explanation: typeof parsed.explanation === 'string' ? parsed.explanation.trim() : '',
          alternatives: updatedAlts
        });
      }

      if (newQuestions.length === 0) {
        throw new Error('Nenhuma questão válida foi gerada.');
      }

      setAiDrafts(prev => [...prev, ...newQuestions]);

      sfx.playCorrect();
      setAiPrompt('');
      setAiUrl('');
      setAiFile(null);
      setAiQuantity(1);
      setAiError('');
      
    } catch (e: any) {
      console.error(e);
      setAiError(e.message || 'Erro ao gerar questão. Tente novamente.');
    } finally {
      setAiLoading(false);
    }
  };
  


  // Estados para Modal de Gerenciamento de Questões
  const [showQuestionManagerModal, setShowQuestionManagerModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [managerQText, setManagerQText] = useState('');
  const [managerQCatId, setManagerQCatId] = useState('');
  const [managerQTimeLimit, setManagerQTimeLimit] = useState(20);
  const [managerQExplanation, setManagerQExplanation] = useState('');
  const [managerQReference, setManagerQReference] = useState('');
  const [managerQDifficulty, setManagerQDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [managerQTags, setManagerQTags] = useState('');
  const [managerQAlts, setManagerQAlts] = useState<Alternative[]>([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false }
  ]);
  const [managerSearchTerm, setManagerSearchTerm] = useState('');
  const [managerSelectedCatFilter, setManagerSelectedCatFilter] = useState('');

  // Estados de Partida Ativa
  const [gameMode, setGameMode] = useState<'duel' | 'team' | 'open'>('open');
  const [gameRounds, setGameRounds] = useState(3);
  const [gameTimeLimit, setGameTimeLimit] = useState(15);
  const [maxPlayers, setMaxPlayers] = useState(50);
  const [joinLocked, setJoinLocked] = useState(false);
  const [autoReveal, setAutoReveal] = useState(false);
  const [scoringMode, setScoringMode] = useState<'speed' | 'fixed'>('speed');
  const [fixedPoints, setFixedPoints] = useState(100);
  const [activePlayers, setActivePlayers] = useState<GamePlayer[]>([]);
  const [onlinePlayerIds, setOnlinePlayerIds] = useState<string[]>([]);
  const [teamScores, setTeamScores] = useState<Record<string, number>>({});
  const [currentRoundIndex, setCurrentRoundIndex] = useState(1);
  const [usedQuestionIds, setUsedQuestionIds] = useState<string[]>([]);
  // Ref espelho: fonte da verdade para o filtro de perguntas usadas, imune a
  // closures desatualizadas dentro de setTimeout (garante não repetir na jogada)
  const usedQuestionIdsRef = useRef<string[]>([]);
  const markQuestionUsed = (id: string) => {
    if (!usedQuestionIdsRef.current.includes(id)) {
      usedQuestionIdsRef.current = [...usedQuestionIdsRef.current, id];
    }
    setUsedQuestionIds(usedQuestionIdsRef.current);
  };
  const resetUsedQuestions = (ids: string[] = []) => {
    usedQuestionIdsRef.current = ids;
    setUsedQuestionIds(ids);
  };

  // Status da rodada ativa: 'idle' | 'spinning' | 'category-reveal' | 'question-reveal' | 'question' | 'answered' | 'ranking'
  const [roundState, setRoundState] = useState<'idle' | 'spinning' | 'category-reveal' | 'question-reveal' | 'question' | 'answered' | 'ranking'>('idle');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [questionDeadline, setQuestionDeadline] = useState<string | null>(null);
  const [pausedRemaining, setPausedRemaining] = useState<number | null>(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [gameError, setGameError] = useState('');
  const [recoveredTransition, setRecoveredTransition] = useState(false);
  const [hostBusy, setHostBusy] = useState(false);
  const hostBusyRef = useRef(false);
  const lastHostSnapshotRef = useRef(0);
  const createRequestRef = useRef<string | null>(null);
  const spinSequenceRef = useRef(0);
  const onlineTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => {
    spinSequenceRef.current++;
    onlineTimersRef.current.forEach(clearTimeout);
  }, []);
  const [playerAnswered, setPlayerAnswered] = useState<string | null>(null);
  
  // Efeito de Rotação da Roleta
  const [roundTransitionMessage, setRoundTransitionMessage] = useState<{ title: string, subtitle: string } | null>(null);
  const [rouletteAngle, setRouletteAngle] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [pinDuration, setPinDuration] = useState<number | null>(null);

  useEffect(() => {
    if (!isSpinning) {
      setPinDuration(null);
      return;
    }

    const startTime = Date.now();
    const totalDuration = 8000;
    const startSlowdownTime = 3000;
    const baseDuration = 0.1;
    const maxDuration = 2.0;

    let animFrameId: number;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= totalDuration) {
        setPinDuration(null);
        return;
      }

      if (elapsed < startSlowdownTime) {
        setPinDuration(baseDuration);
      } else {
        const t = (elapsed - startSlowdownTime) / (totalDuration - startSlowdownTime);
        const easeT = Math.pow(t, 2);
        const currentDur = baseDuration + easeT * (maxDuration - baseDuration);
        setPinDuration(currentDur);
      }

      animFrameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [isSpinning]);
  
  // Referências
  const realtimeChannelRef = useRef<any | null>(null);

  // ==========================================
  // 🏗️ ESTADOS DO SISTEMA DE SALAS
  // ==========================================
  const [roomCode, setRoomCode] = useState('');
  const [roomLink, setRoomLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  // Contagem de respostas por alternativa para o operador [A, B, C, D]
  const [roomAnswers, setRoomAnswers] = useState<number[]>([0, 0, 0, 0]);
  const [totalAnswered, setTotalAnswered] = useState(0);

  // Controle de expansão do painel de Lobby (retrátil)
  const [isLobbyExpanded, setIsLobbyExpanded] = useState(false);

  // Controle de expansão do painel de respostas/votos (retrátil)
  const [isAnswersPanelExpanded, setIsAnswersPanelExpanded] = useState(false);

  // Temas visuais e geométricos baseados no Kahoot para as alternativas (inline styles)
  const KAHOOT_THEMES = [
    { gradient: 'linear-gradient(135deg, #e21b3c 0%, #b11029 100%)', icon: '▲', color: '#e21b3c', shadow: 'rgba(226,27,60,0.5)' },
    { gradient: 'linear-gradient(135deg, #1368ce 0%, #0d4a94 100%)', icon: '◆', color: '#1368ce', shadow: 'rgba(19,104,206,0.5)' },
    { gradient: 'linear-gradient(135deg, #d89e00 0%, #a07500 100%)', icon: '●', color: '#d89e00', shadow: 'rgba(216,158,0,0.5)' },
    { gradient: 'linear-gradient(135deg, #26890c 0%, #1a5f08 100%)', icon: '■', color: '#26890c', shadow: 'rgba(38,137,12,0.5)' }
  ];

  // Flag: se está na tela de jogo ativo (fullscreen)
  const isGamePlayFullscreen = screen === 'game-play';

  // Dimensões da janela (para dimensionar a roleta em projeções/telas grandes)
  const [winSize, setWinSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setWinSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Variáveis calculadas dinamicamente com base no estado do lobby retrátil
  // Roleta responsiva: ocupa até 78% da altura ou 55% da largura da tela (mín. 480px, máx. 1000px)
  const wheelSize = isLobbyExpanded
    ? 380
    : Math.round(Math.min(Math.max(Math.min(winSize.h * 0.78, winSize.w * 0.55), 480), 1000));
  const radius = wheelSize / 2;
  const innerTranslate = wheelSize * 0.12; // início do texto, logo após o botão central (raio 0.09)
  // Aro externo dedicado (moldura escura onde os LEDs "moram")
  const rimWidth = Math.round(Math.max(16, wheelSize * 0.045));
  const textBoxWidth = radius - innerTranslate - rimWidth - 10;
  const textBoxHeight = wheelSize * 0.075;
  const fontSize = isLobbyExpanded ? '12px' : `${Math.max(18, Math.round(wheelSize * 0.026))}px`;

  // Segmentos da roleta com cores ajustadas: se dois segmentos vizinhos têm a
  // mesma cor, o segundo é escurecido para manter a separação visual à distância
  const wheelCategories = useMemo(() => {
    const shade = (hex: string, pct: number) => {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!m) return hex;
      const f = (c: string) => {
        const v = Math.round(parseInt(c, 16) * (1 + pct / 100));
        return Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0');
      };
      return `#${f(m[1])}${f(m[2])}${f(m[3])}`;
    };
    const cats = eligibleCategories(categories, questions.filter(q => matchesQuestionFilters(q, selectedQuestionIds, difficultyFilter, tagFilter)), selectedCategoryIds, usedQuestionIds)
      .map(c => ({ ...c, displayColor: c.color }));
    for (let i = 1; i < cats.length; i++) {
      if (cats[i].displayColor.toLowerCase() === cats[i - 1].displayColor.toLowerCase()) {
        cats[i].displayColor = shade(cats[i].color, -25);
      }
    }
    // Fechamento do círculo: último vizinho do primeiro
    if (cats.length > 2 && cats[cats.length - 1].displayColor.toLowerCase() === cats[0].displayColor.toLowerCase()) {
      cats[cats.length - 1].displayColor = shade(cats[cats.length - 1].displayColor, -25);
    }
    return cats;
  }, [categories, questions, selectedCategoryIds, selectedQuestionIds, difficultyFilter, tagFilter, usedQuestionIds]);


  // Efeito para som global
  useEffect(() => {
    sfx.enabled = soundEnabled;
  }, [soundEnabled]);

  // Simular a entrada de jogadores reais via Supabase Realtime
  useEffect(() => {
    if (screen !== 'game-lobby' || role !== 'operator' || !roomCode) return;
    
    if (!useRealSupabase) {
      // Modo demo: simular jogadores fictícios
      const names = ['Ana', 'Bruno', 'Carlos', 'Diana', 'Eduardo', 'Felipe', 'Gabriela'];
      const interval = setInterval(() => {
        setActivePlayers(prev => {
          if (prev.length >= 6) return prev;
          const randName = names[Math.floor(Math.random() * names.length)];
          if (prev.some(p => p.nickname === randName)) return prev;
          sfx.playClick();
          return [...prev, { id: Math.random().toString(), nickname: randName, score: 0 }];
        });
      }, 3000);
      return () => clearInterval(interval);
    }

    // Supabase Real: escutar novos jogadores na sala
    const channel = supabase
      .channel(`lobby-${roomCode}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'room_players', filter: `room_code=eq.${roomCode}` },
        (payload) => {
          const p = payload.new as any;
          setActivePlayers(prev => {
            if (prev.some(x => x.nickname === p.nickname)) return prev;
            sfx.playClick();
            return [...prev, { id: p.id, nickname: p.nickname, score: p.score || 0 }];
          });
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [screen, role, roomCode, useRealSupabase]);

  type HostSnapshot = {
    room: OnlineRoom;
    host_question: Question | null;
    used_question_ids: string[];
    players: { id: string; nickname: string; score: number; team_name?: string | null }[];
    team_scores: Record<string, number>;
    answers: { player_id: string; round_index: number; answer_index: number; is_correct: boolean }[];
    server_now: string;
  };
  const applyHostSnapshot = (snapshot: HostSnapshot) => {
    const stamp = Date.parse(snapshot.server_now);
    if (stamp < lastHostSnapshotRef.current) return;
    lastHostSnapshotRef.current = stamp;
    const room = snapshot.room;
    setRoundState(room.round_state as typeof roundState);
    setCurrentRoundIndex(room.current_round);
    setCurrentQuestion(snapshot.host_question);
    resetUsedQuestions(snapshot.used_question_ids);
    setSelectedCategory(room.selected_category);
    setQuestionDeadline(room.question_deadline);
    setPausedRemaining(room.paused_remaining_ms);
    setServerOffset(stamp - Date.now());
    setTotalAnswered(room.answered_count);
    setJoinLocked(room.join_locked);
    setMaxPlayers(room.max_players);
    setAutoReveal(room.reveal_when_all_answered);
    setScoringMode(room.scoring_mode);
    setFixedPoints(room.fixed_points);
    const counts = [0, 0, 0, 0];
    snapshot.answers.filter(a => a.round_index === room.current_round).forEach(a => counts[a.answer_index]++);
    setRoomAnswers(counts);
    setTeamScores(snapshot.team_scores || {});
    setActivePlayers(snapshot.players.map(p => ({ ...p, team_name: p.team_name ?? undefined, stats: {
      answers: Object.fromEntries(snapshot.answers.filter(a => a.player_id === p.id).map(a => [a.round_index, a.is_correct])),
    } })));
  };
  const applyHostSnapshotRef = useRef(applyHostSnapshot);
  useEffect(() => { applyHostSnapshotRef.current = applyHostSnapshot; });

  // Scores always come from the server. Realtime and polling reconcile missed events.
  useEffect(() => {
    if (!roomCode || role !== 'operator' || !['game-lobby', 'game-play'].includes(screen)) return;
    let stopped = false;
    let loading = false;
    const refresh = async () => {
      if (stopped || loading) return;
      loading = true;
      try {
        const snapshot = await gameRpc<HostSnapshot>('quiz_host_state', { p_code: roomCode });
        if (!stopped) applyHostSnapshotRef.current(snapshot);
      } catch (error) {
        if (!stopped) setGameError(error instanceof Error ? error.message : 'Falha ao sincronizar a sala.');
      } finally { loading = false; }
    };
    const channel = supabase.channel(`host-${roomCode}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms', filter: `code=eq.${roomCode}` }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_code=eq.${roomCode}` }, () => void refresh())
      .subscribe(status => { if (status === 'SUBSCRIBED') void refresh(); });
    void refresh();
    const poll = window.setInterval(() => void refresh(), 2000);
    return () => { stopped = true; window.clearInterval(poll); void supabase.removeChannel(channel); };
  }, [roomCode, role, screen]);

  useEffect(() => {
    if (!roomCode || role !== 'operator' || !['game-lobby', 'game-play'].includes(screen) || !useRealSupabase) return;
    const channel = supabase.channel(`presence-${roomCode}`)
      .on('presence', { event: 'sync' }, () => setOnlinePlayerIds(Object.keys(channel.presenceState())))
      .subscribe();
    return () => { setOnlinePlayerIds([]); void supabase.removeChannel(channel); };
  }, [roomCode, role, screen, useRealSupabase]);

  const revealAnswerRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    if (roundState !== 'question') return;
    const tick = () => {
      const remaining = pausedRemaining !== null ? Math.ceil(pausedRemaining / 1000) : remainingSeconds(questionDeadline, serverOffset);
      setTimeLeft(remaining);
      if (questionDeadline && remaining === 0 && pausedRemaining === null && !hostBusyRef.current) void revealAnswerRef.current();
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [roundState, questionDeadline, pausedRemaining, serverOffset]);

  // ==========================================
  // 🔐 FUNÇÕES DE AUTENTICAÇÃO DO GERENCIADOR
  // ==========================================

  const handleOpenManagerLogin = () => {
    setRole('operator');
    sfx.playClick();
    if (authUser) {
      // Já autenticado, vai direto para o painel
      setScreen('operator-dashboard');
    } else {
      setShowLoginModal(true);
      setAuthError('');
      setAuthEmail('');
      setAuthPassword('');
    }
  };

  const handleAuthSubmit = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Preencha o e-mail e a senha para continuar.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');

    // Modo Demo: aceitar credenciais padrão sem Supabase
      if (!useRealSupabase) {
      await new Promise(r => setTimeout(r, 900));
      if (authEmail === 'admin@quizziando.com' && authPassword === 'admin123') {
        setAuthUser({ id: 'demo-id', email: authEmail });
        setShowLoginModal(false);
        setScreen('operator-dashboard');
        sfx.playCorrect();
      } else {
        setAuthError('Modo Demo: use admin@quizziando.com / admin123');
      }
      setAuthLoading(false);
      return;
    }

    // Autenticação real via Supabase
    try {
      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) {
          setAuthError('E-mail ou senha incorretos. Tente novamente.');
        } else if (data.user) {
          setAuthUser({ id: data.user.id, email: data.user.email || authEmail });
          setShowLoginModal(false);
          setScreen('operator-dashboard');
          sfx.playCorrect();
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        });
        if (error) {
          setAuthError(error.message || 'Erro ao criar conta. Tente novamente.');
        } else if (data.user) {
          setAuthUser({ id: data.user.id, email: data.user.email || authEmail });
          setShowLoginModal(false);
          setScreen('operator-dashboard');
          sfx.playCorrect();
        }
      }
    } catch {
      setAuthError('Erro inesperado. Verifique sua conexão.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    sfx.playClick();
    if (useRealSupabase) {
      await supabase.auth.signOut();
    }
    setAuthUser(null);
    setScreen('welcome');
    setAppMode('portal');
    setRole('player');
  };

  const handleTeacherLoginFromPortal = async (email: string, pass: string, isSignUp: boolean) => {
    setRole('operator');
    if (!useRealSupabase) {
      if (email === 'admin@quizziando.com' && pass === 'admin123') {
        setAuthUser({ id: 'demo-id', email });
        setAppMode('online');
        setScreen('operator-dashboard');
        sfx.playCorrect();
        return { success: true };
      } else {
        return { success: false, error: 'Modo Demo: use admin@quizziando.com / admin123' };
      }
    }

    try {
      if (!isSignUp) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });
        if (error) {
          console.warn('[Supabase Auth Login Error]', error);
          if (error.message?.toLowerCase().includes('email not confirmed')) {
            return {
              success: false,
              error: 'E-mail cadastrado, mas ainda não confirmado. Verifique o link de confirmação na sua caixa de entrada ou spam.'
            };
          }
          if (error.message?.toLowerCase().includes('invalid login credentials')) {
            return {
              success: false,
              error: 'E-mail ou senha incorretos. Se acabou de criar a conta, certifique-se de ter clicado no link de confirmação enviado para seu e-mail.'
            };
          }
          return { success: false, error: error.message || 'E-mail ou senha incorretos. Tente novamente.' };
        }
        if (data.user) {
          setAuthUser({ id: data.user.id, email: data.user.email || email });
          setAppMode('online');
          setScreen('operator-dashboard');
          sfx.playCorrect();
          return { success: true };
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
        });
        if (error) {
          console.warn('[Supabase Auth SignUp Error]', error);
          return { success: false, error: error.message || 'Erro ao criar conta. Tente novamente.' };
        }

        // Se o e-mail já existia, o Supabase retorna identities vazio por segurança
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          return {
            success: false,
            error: 'Este e-mail já está cadastrado. Faça login com sua senha ou confirme o e-mail recebido.'
          };
        }

        // Se o Supabase retornou sessão ativa imediatamente (confirmação de email desligada)
        if (data.session && data.user) {
          setAuthUser({ id: data.user.id, email: data.user.email || email });
          setAppMode('online');
          setScreen('operator-dashboard');
          sfx.playCorrect();
          return { success: true };
        }

        // Se o usuário foi criado mas requer confirmação por e-mail (comportamento padrão do Supabase)
        if (data.user && !data.session) {
          return {
            success: false,
            needsConfirmation: true,
            info: 'Conta criada com sucesso! Enviamos um link de confirmação para o seu e-mail. Por favor, confirme-o na sua caixa de entrada (ou spam) para poder fazer login.'
          };
        }
      }
      return { success: false, error: 'Não foi possível concluir a operação.' };
    } catch {
      return { success: false, error: 'Erro inesperado. Verifique sua conexão.' };
    }
  };

  const handleDemoLoginFromPortal = () => {
    setRole('operator');
    setAuthUser({ id: 'demo-id', email: 'admin@quizziando.com' });
    setAppMode('online');
    setScreen('operator-dashboard');
    sfx.playCorrect();
  };

  const handleJoinAsStudentFromPortal = (pin: string) => {
    setStudentRoomCode(pin.toUpperCase());
    sfx.playClick();
  };




  const handleRemovePlayer = async (playerId: string) => {
    if (!confirm('Tem certeza que deseja remover este jogador?')) return;
    if (useRealSupabase) {
      const { error } = await supabase.from('room_players').delete().eq('id', playerId);
      if (error) { setGameError(error.message); return; }
    }
    setActivePlayers(prev => prev.filter(p => p.id !== playerId));
    sfx.playClick();
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    let newCat: Category = {
      id: Math.random().toString(),
      name: newCatName.trim(),
      color: newCatColor,
      icon: 'HelpCircle',
      folder_id: null
    };

    if (useRealSupabase) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = authUser?.id || sessionData.session?.user?.id;
        if (userId) {
          const { data, error } = await supabase
            .from('categories')
            .insert({
              name: newCat.name,
              color: newCat.color,
              icon: newCat.icon,
              created_by: userId
            })
            .select()
            .single();

          if (!error && data) {
            newCat = {
              id: data.id.toString(),
              name: data.name,
              color: data.color,
              icon: data.icon,
              folder_id: data.folder_id
            };
          }
        }
      } catch (err: any) {
        console.error('Erro ao adicionar categoria:', err);
      }
    }

    setCategories([...categories, newCat]);
    setNewCatName('');
    sfx.playCorrect();
  };

  const persistAiDraft = async (draft: Question): Promise<Question> => {
    let savedQuestionId = draft.id || crypto.randomUUID();
    const alternatives = draft.alternatives.map((alternative) => ({ ...alternative, text: alternative.text.trim() }));

    if (useRealSupabase) {
      const { data, error } = await supabase.rpc('quiz_save_question', {
        p_question_id: null,
        p_category_id: draft.category_id,
        p_question_text: draft.question_text.trim(),
        p_time_limit: draft.time_limit || 20,
        p_explanation: draft.explanation?.trim() || '',
        p_reference_url: draft.reference_url?.trim() || null,
        p_difficulty: draft.difficulty || 'medium',
        p_tags: draft.tags || [],
        p_alternatives: alternatives
      });
      if (error || !data) throw new Error(error?.message || 'Sem dados ao salvar a questão');
      savedQuestionId = String(data);
    }

    return { ...draft, id: savedQuestionId, alternatives, difficulty: draft.difficulty || 'medium', tags: draft.tags || [] };
  };

  const handleAddAiDraftToBank = async (draft: Question) => {
    setAiSavingDraftIds((ids) => [...ids, draft.id]);
    try {
      const savedDraft = await persistAiDraft(draft);
      setQuestions((current) => [...current, savedDraft]);
      setAiDrafts((drafts) => drafts.filter((item) => item.id !== draft.id));
      sfx.playCorrect();
    } catch (error: any) {
      alert('Não foi possível adicionar a questão ao banco: ' + (error?.message || 'erro desconhecido'));
    } finally {
      setAiSavingDraftIds((ids) => ids.filter((id) => id !== draft.id));
    }
  };

  const handleAddAllAiDraftsToBank = async () => {
    const draftsToSave = [...aiDrafts];
    if (draftsToSave.length === 0) return;
    setAiSavingAllDrafts(true);
    const failedDraftIds: string[] = [];

    for (const draft of draftsToSave) {
      try {
        const savedDraft = await persistAiDraft(draft);
        setQuestions((current) => [...current, savedDraft]);
        setAiDrafts((drafts) => drafts.filter((item) => item.id !== draft.id));
      } catch {
        failedDraftIds.push(draft.id);
      }
    }

    setAiSavingAllDrafts(false);
    if (failedDraftIds.length > 0) {
      alert(`${draftsToSave.length - failedDraftIds.length} questão(ões) adicionada(s). ${failedDraftIds.length} não puderam ser salvas e continuam como rascunho.`);
    } else {
      sfx.playCorrect();
    }
  };

  const handleManagerSaveQuestion = async () => {
    if (!managerQText.trim() || !managerQCatId) {
      alert('Preencha o texto da pergunta e selecione uma categoria.');
      return;
    }
    if (managerQAlts.some(a => !a.text.trim())) {
      alert('Preencha todas as 4 alternativas!');
      return;
    }
    if (managerQAlts.filter(a => a.isCorrect).length !== 1) {
      alert('Selecione exatamente uma alternativa correta.');
      return;
    }
    if (managerQReference.trim()) {
      try {
        const url = new URL(managerQReference.trim());
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Protocolo inválido');
      } catch { alert('Informe uma URL de referência http ou https válida.'); return; }
    }

    let savedQuestionId = editingQuestionId || Math.random().toString();
    const updatedAlts = [...managerQAlts];

    if (useRealSupabase) {
      try {
        const { data, error } = await supabase.rpc('quiz_save_question', {
          p_question_id: editingQuestionId || null,
          p_category_id: managerQCatId,
          p_question_text: managerQText.trim(),
          p_time_limit: managerQTimeLimit,
          p_explanation: managerQExplanation.trim(),
          p_reference_url: managerQReference.trim() || null,
          p_difficulty: managerQDifficulty,
          p_tags: managerQTags.split(',').map(tag => tag.trim()).filter(Boolean),
          p_alternatives: updatedAlts.map(alt => ({ text: alt.text.trim(), isCorrect: alt.isCorrect }))
        });
        if (error || !data) {
          alert('Erro ao salvar pergunta no banco: ' + (error?.message || 'Sem dados'));
          return;
        }
        savedQuestionId = String(data);
      } catch (err: any) {
        alert('Erro de conexão ao salvar pergunta: ' + err.message);
        return;
      }
    }

    const questionObj: Question = {
      id: savedQuestionId,
      category_id: managerQCatId,
      question_text: managerQText.trim(),
      time_limit: managerQTimeLimit,
      explanation: managerQExplanation.trim() || null,
      reference_url: managerQReference.trim() || null,
      difficulty: managerQDifficulty,
      tags: managerQTags.split(',').map(tag => tag.trim()).filter(Boolean),
      alternatives: updatedAlts
    };

    if (editingQuestionId) {
      setQuestions(questions.map(q => q.id === editingQuestionId ? questionObj : q));
    } else {
      setQuestions([...questions, questionObj]);
    }

    // Resetar campos
    setEditingQuestionId(null);
    setManagerQText('');
    setManagerQTimeLimit(20);
    setManagerQExplanation('');
    setManagerQReference('');
    setManagerQDifficulty('medium');
    setManagerQTags('');
    if (editingAiDraftId) {
      setAiDrafts(prev => prev.filter(draft => draft.id !== editingAiDraftId));
      setEditingAiDraftId(null);
    }
    setManagerQAlts([
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ]);
    
    sfx.playCorrect();
  };

  const handleManagerDeleteQuestion = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta pergunta?')) return;

    if (useRealSupabase) {
      try {
        const { error } = await supabase
          .from('questions')
          .delete()
          .eq('id', id);

        if (error) {
          alert('Erro ao excluir pergunta do banco: ' + error.message);
          return;
        }
      } catch (err: any) {
        alert('Erro de conexão ao excluir pergunta: ' + err.message);
        return;
      }
    }

    setQuestions(questions.filter(q => q.id !== id));
    sfx.playClick();
  };

  // ==========================================
  // 🏗️ FUNÇÕES DO SISTEMA DE SALAS
  // ==========================================

  const publishRoomState = async (update: Record<string, unknown>) => {
    const snapshot = await gameRpc<HostSnapshot>('quiz_host_update', {
      p_code: roomCode, p_expected_round: currentRoundIndex, p_update: update,
    });
    applyHostSnapshot(snapshot);
    setGameError('');
  };
  const runHostAction = async (action: () => Promise<void>) => {
    if (hostBusyRef.current) return;
    hostBusyRef.current = true;
    setHostBusy(true);
    try { await action(); }
    catch (error) {
      setGameError(error instanceof Error ? error.message : 'Operação não confirmada. Tente novamente.');
    } finally { hostBusyRef.current = false; setHostBusy(false); }
  };

  const handleCloseRoom = (code: string) => {
    if (hostBusyRef.current || !window.confirm(`Encerrar a sala ${code}? Os participantes não poderão continuar jogando. Os pontos já contabilizados serão preservados, mas a rodada em andamento será interrompida. Esta ação não pode ser desfeita.`)) return;
    return runHostAction(async () => {
      await gameRpc('quiz_host_close_room', { p_code: code });
      setHostRooms(rooms => rooms.filter(room => room.code !== code));
      setHostRoomsRefresh(value => value + 1);
      setGameError('');
    });
  };

  const handleRecoverRoom = (code: string) => runHostAction(async () => {
    const snapshot = await gameRpc<HostSnapshot>('quiz_host_state', { p_code: code });
    const room = snapshot.room;
    if (!['lobby', 'playing'].includes(room.status)) throw new Error('Esta sala já foi encerrada. Atualize a lista.');
    spinSequenceRef.current++;
    onlineTimersRef.current.forEach(clearTimeout);
    onlineTimersRef.current = [];
    lastHostSnapshotRef.current = 0;
    setRole('operator');
    setRoomCode(room.code);
    setRoomLink(`${window.location.origin}${window.location.pathname}?room=${room.code}`);
    setGameMode(room.game_mode);
    setGameRounds(room.rounds);
    setGameTimeLimit(room.time_limit);
    setSelectedCategoryIds(room.categories.map(category => category.id));
    setSelectedQuestionIds(room.question_ids?.length ? room.question_ids : null);
    setDifficultyFilter('all');
    setTagFilter('');
    setIsSpinning(false);
    setOnlinePlayerIds([]);
    setPlayerAnswered(null);
    setPrevScores(null);
    setShowNewScores(true);
    setRoundTransitionMessage(null);
    setRecoveredTransition(room.status === 'playing' &&
      ['spinning', 'category-reveal', 'question-reveal'].includes(room.round_state));
    applyHostSnapshot(snapshot);
    setScreen(room.status === 'lobby' ? 'game-lobby' : 'game-play');
    setGameError('');
  });

  const continueRecoveredRound = () => runHostAction(async () => {
    if (roundState === 'spinning') {
      const available = questions.filter(question =>
        selectedCategoryIds.includes(question.category_id) &&
        (!selectedQuestionIds || selectedQuestionIds.includes(question.id)) &&
        !usedQuestionIdsRef.current.includes(question.id));
      if (!available.length) throw new Error('Não há perguntas disponíveis para continuar esta rodada. Confira o acervo da sala.');
      await publishRoomState({ round_state: 'category-reveal', current_question: { id: available[0].id } });
    } else if (roundState === 'category-reveal') {
      await publishRoomState({ round_state: 'question-reveal' });
    } else if (roundState === 'question-reveal') {
      await publishRoomState({ round_state: 'question' });
      setRecoveredTransition(false);
    }
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const handleStartGameSetup = async () => {
    if (role === 'operator' && selectedCategoryIds.length === 0) {
      alert('Selecione pelo menos uma categoria para iniciar o jogo.');
      return;
    }
    if (role === 'player' && !nickname.trim()) {
      alert('Por favor, informe seu nickname para entrar no jogo!');
      return;
    }
    
    sfx.playClick();
    
    if (role === 'operator') {
      await runHostAction(async () => {
        if (availableQuestionCount < gameRounds) {
          if (availableQuestionCount === 0) {
            throw new Error('Nenhuma pergunta corresponde às categorias e aos filtros selecionados. Escolha “Todas” em Dificuldade, limpe a etiqueta ou classifique perguntas no acervo.');
          }
          throw new Error(`Há ${availableQuestionCount} perguntas para ${gameRounds} rodadas com os filtros atuais. Reduza as rodadas ou amplie a seleção para jogar sem repetição.`);
        }
        createRequestRef.current ??= crypto.randomUUID();
        const room = await gameRpc<OnlineRoom>('quiz_create_room', {
          p_request_id: createRequestRef.current, p_mode: gameMode, p_rounds: gameRounds,
          p_time_limit: gameTimeLimit, p_category_ids: selectedCategoryIds,
        });
        const configured = await gameRpc<HostSnapshot>('quiz_host_configure_room', {
          p_code: room.code,
          p_settings: { max_players: maxPlayers, join_locked: joinLocked, reveal_when_all_answered: autoReveal,
            scoring_mode: scoringMode, fixed_points: fixedPoints,
            question_ids: questions.filter(q => selectedCategoryIds.includes(q.category_id) &&
              matchesQuestionFilters(q, selectedQuestionIds, difficultyFilter, tagFilter)).map(q => q.id) },
        });
        createRequestRef.current = null;
        lastHostSnapshotRef.current = 0;
        setRoomCode(room.code);
        setRoomLink(`${window.location.origin}${window.location.pathname}?room=${room.code}`);
        setActivePlayers([]);
        setRoomAnswers([0, 0, 0, 0]);
        setTotalAnswered(0);
        setGameError('');
        applyHostSnapshot(configured);
        setScreen('game-lobby');
        sfx.playLobby();
      });
    } else {
      // Jogador entra na fila
      if (joinRoomCode.trim()) {
        window.location.href = `${window.location.origin}${window.location.pathname}?room=${joinRoomCode.trim().toUpperCase()}`;
        return;
      }
      
      const newPlayer: GamePlayer = {
        id: 'player-self',
        nickname: nickname.trim(),
        team_name: gameMode === 'team' ? teamName || 'Time Alfa' : undefined,
        score: 0
      };
      setActivePlayers([newPlayer]);
      setScreen('game-lobby');
      sfx.playLobby();
    }
  };

  const handleStartMatch = async () => runHostAction(async () => {
    await publishRoomState({ status: 'playing', round_state: 'idle', current_round: 1 });
    sfx.playClick();
    sfx.stopLobby();
    resetUsedQuestions();
    setScreen('game-play');
  });

  const saveRoomControls = async (settings: Record<string, unknown>) => runHostAction(async () => {
    const snapshot = await gameRpc<HostSnapshot>('quiz_host_configure_room', { p_code: roomCode, p_settings: settings });
    applyHostSnapshot(snapshot);
  });

  // ── Giro por arraste do mouse (flick) ─────────────────────────────────
  const rouletteAngleRef = useRef(0);
  useEffect(() => { rouletteAngleRef.current = rouletteAngle; }, [rouletteAngle]);
  const wheelDragRef = useRef({ active: false, lastAngle: 0, lastTime: 0, velocity: 0 });

  const pointerAngleOnWheel = (e: React.PointerEvent, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * (180 / Math.PI);
  };

  const handleWheelPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (role !== 'operator' || roundState !== 'idle' || isSpinning) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    wheelDragRef.current = { active: true, lastAngle: pointerAngleOnWheel(e, e.currentTarget), lastTime: performance.now(), velocity: 0 };
  };

  const handleWheelPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = wheelDragRef.current;
    if (!d.active) return;
    const a = pointerAngleOnWheel(e, e.currentTarget);
    let delta = a - d.lastAngle;
    if (delta > 180) delta -= 360; else if (delta < -180) delta += 360;
    const now = performance.now();
    const dt = Math.max(1, now - d.lastTime);
    d.velocity = 0.8 * (delta / dt * 1000) + 0.2 * d.velocity; // graus/segundo suavizado
    d.lastAngle = a;
    d.lastTime = now;
    rouletteAngleRef.current += delta;
    setRouletteAngle(prev => prev + delta); // a roda acompanha o mouse em tempo real
  };

  const handleWheelPointerUp = () => {
    const d = wheelDragRef.current;
    if (!d.active) return;
    d.active = false;
    const speed = Math.abs(d.velocity);
    if (speed > 150) {
      // Arremesso: quanto mais rápido o gesto, mais voltas extras (até 6)
      const boost = Math.min(6, speed / 400);
      handleSpinRoulette(boost, rouletteAngleRef.current);
    }
  };

  // Girar a Roleta de Categorias
  // boostTurns: voltas extras vindas do "arremesso" do mouse; startAngle: ângulo atual após arraste manual
  const handleSpinRoulette = async (boostTurns: number = 0, startAngle?: number) => {
    if (hostBusyRef.current || isSpinning || roundState !== 'idle') return;
    const eligible = eligibleCategories(categories, questions.filter(q => matchesQuestionFilters(q, selectedQuestionIds, difficultyFilter, tagFilter)), selectedCategoryIds, usedQuestionIdsRef.current);
    if (!eligible.length) { setGameError('As categorias selecionadas não têm mais perguntas disponíveis.'); return; }
    const numSpins = 4 + Math.random() * 4 + boostTurns;
    const finalAngle = (startAngle ?? rouletteAngle) + numSpins * 360 + Math.random() * 360;
    const index = Math.floor(((90 - (finalAngle % 360) + 360) % 360) / 360 * eligible.length);
    const cat = eligible[index];
    const pool = questions.filter(q => q.category_id === cat.id && matchesQuestionFilters(q, selectedQuestionIds, difficultyFilter, tagFilter) && !usedQuestionIdsRef.current.includes(q.id));
    const selectedQ = pool[Math.floor(Math.random() * pool.length)];
    const sequence = ++spinSequenceRef.current;
    const later = (delay: number, action: () => Promise<void>) => {
      onlineTimersRef.current.push(setTimeout(() => {
        if (sequence === spinSequenceRef.current) void runHostAction(action);
      }, delay));
    };
    await runHostAction(async () => {
      await publishRoomState({ round_state: 'spinning' });
      setIsSpinning(true);
      setRouletteAngle(finalAngle);
      sfx.playSpin();
      later(10000, async () => {
        setIsSpinning(false);
        sfx.playGameSound();
        await publishRoomState({ round_state: 'category-reveal', current_question: { id: selectedQ.id } });
        later(2200, async () => {
          await publishRoomState({ round_state: 'question-reveal' });
          later(5000, async () => { await publishRoomState({ round_state: 'question' }); setPlayerAnswered(null); });
        });
      });
    });
  };

  const handlePlayerAnswer = (altIndex: number) => {
    void altIndex;
    // Participantes respondem exclusivamente pela URL da sala, onde a resposta
    // é validada no servidor. Esta tela pertence ao controle do organizador.
    setGameError('Abra o link ou QR Code da sala no dispositivo do participante para responder.');
  };

  const handleExportQuestionBank = () => {
    downloadQuestionBank(createQuestionBank(categories.map(c => ({ id: c.id, name: c.name, color: c.color, icon: c.icon })),
      questions.map(q => ({ id: q.id, category_id: q.category_id, question_text: q.question_text,
        time_limit: q.time_limit || 20, explanation: q.explanation, reference_url: q.reference_url,
        difficulty: q.difficulty, tags: q.tags, alternatives: q.alternatives }))));
  };

  const handleImportQuestionBank = async (file: File) => {
    if (!useRealSupabase || !authUser?.id) { alert('Faça login como organizador para importar na nuvem.'); return; }
    if (file.size > 5_000_000) { alert('O arquivo deve ter até 5 MB.'); return; }
    try {
      const bank = parseQuestionBank(await file.text());
      const result = await gameRpc<{ categories_created: number; questions_created: number }>('quiz_import_question_bank', { p_bank: bank });
      alert(`${result.questions_created} perguntas importadas. ${result.categories_created} categorias criadas. A página será atualizada.`);
      window.location.reload();
    } catch (error) { alert(error instanceof Error ? error.message : 'Não foi possível importar o acervo.'); }
  };

  const handleSaveQuiz = () => {
    const name = newQuizName.trim();
    if (!name || selectedCategoryIds.length === 0) { setGameError('Informe um nome e selecione categorias para salvar o quiz.'); return; }
    const questionIds = questions.filter(q => selectedCategoryIds.includes(q.category_id) && matchesQuestionFilters(q, selectedQuestionIds, difficultyFilter, tagFilter)).map(q => q.id);
    if (!questionIds.length) { setGameError('As categorias selecionadas não têm perguntas disponíveis.'); return; }
    try {
      setSavedQuizzes(saveQuiz({ id: crypto.randomUUID(), name, savedAt: new Date().toISOString(), categoryIds: selectedCategoryIds,
        questionIds, rounds: gameRounds, timeLimit: gameTimeLimit, onlineMode: gameMode, scoringMode, fixedPoints, difficultyFilter, tagFilter,
        localRules: { hasObstacles: false, pointsPerCorrect: 100, pointsOnPass: 100, quickMode: false, tiePolicy: 'shared' } }));
      setNewQuizName(''); setGameError('');
    } catch { setGameError('Não foi possível salvar o quiz neste navegador.'); }
  };

  const handleLoadQuiz = (quiz: SavedQuiz) => {
    const categoryIds = quiz.categoryIds.filter(id => categories.some(c => c.id === id));
    const questionIds = quiz.questionIds.filter(id => questions.some(q => q.id === id && categoryIds.includes(q.category_id)));
    if (!categoryIds.length || !questionIds.length) { setGameError('Este quiz não tem mais categorias ou perguntas disponíveis neste acervo.'); return; }
    setSelectedCategoryIds(categoryIds); setSelectedQuestionIds(questionIds);
    setDifficultyFilter(quiz.difficultyFilter || 'all'); setTagFilter(quiz.tagFilter || '');
    const onlineRounds = Math.max(1, Math.min(20, quiz.rounds));
    setGameRounds(onlineRounds); setGameTimeLimit(Math.max(5, Math.min(120, quiz.timeLimit))); setGameMode(quiz.onlineMode);
    setScoringMode(quiz.scoringMode); setFixedPoints(quiz.fixedPoints);
    setGameError(questionIds.length < quiz.questionIds.length ? 'Algumas perguntas salvas não estão mais disponíveis.' :
      onlineRounds !== quiz.rounds ? 'O modo online permite até 20 rodadas; a quantidade foi ajustada.' : '');
  };

  const handlePlayQuizFromDashboard = (quiz: SavedQuiz) => {
    handleLoadQuiz(quiz);
    setShowQuizConfigModal(true);
    sfx.playClick();
  };

  const handleEditQuizFromDashboard = (quiz: SavedQuiz) => {
    handleLoadQuiz(quiz);
    setShowQuestionManagerModal(true);
    sfx.playClick();
  };

  const handleDuplicateQuizFromDashboard = (quizId: string) => {
    const updated = duplicateQuiz(quizId);
    setSavedQuizzes(updated);
    sfx.playCorrect();
  };

  const handleToggleFavoriteFromDashboard = (quizId: string) => {
    const updated = toggleFavoriteQuiz(quizId);
    setSavedQuizzes(updated);
    sfx.playClick();
  };

  const handleDeleteQuizFromDashboard = (quizId: string) => {
    const confirmDelete = window.confirm('Tem certeza de que deseja excluir este quiz da sua biblioteca?');
    if (!confirmDelete) return;
    const updated = deleteSavedQuiz(quizId);
    setSavedQuizzes(updated);
    sfx.playClick();
  };

  const handleCreateFolder = async (name: string, color: string = '#46178F') => {
    if (!name.trim()) return;
    const newFolderId = crypto.randomUUID();
    const newFolder: CategoryFolder = {
      id: newFolderId,
      name: name.trim(),
      color,
      created_by: authUser?.id || 'local'
    };
    if (useRealSupabase && authUser?.id) {
      try {
        const { data, error } = await supabase
          .from('category_folders')
          .insert({
            id: newFolderId,
            name: newFolder.name,
            color: newFolder.color,
            created_by: authUser.id
          })
          .select()
          .single();
        if (!error && data) {
          setFolders(prev => [...prev, data]);
          sfx.playCorrect();
          return;
        }
      } catch (e) {
        console.error('Erro ao criar pasta no Supabase:', e);
      }
    }
    setFolders(prev => [...prev, newFolder]);
    sfx.playCorrect();
  };

  const handlePlayCategoryAsQuiz = (category: Category) => {
    setSelectedCategoryIds([category.id]);
    const catQuestions = questions.filter(q => q.category_id === category.id);
    const roundsCount = Math.max(1, Math.min(catQuestions.length || 10, 20));
    setGameRounds(roundsCount);
    setShowQuizConfigModal(true);
    sfx.playClick();
  };

  const handleEditCategoryQuestions = (category: Category) => {
    setManagerQCatId(category.id);
    setShowQuestionManagerModal(true);
    sfx.playClick();
  };

  const revealAnswer = async () => runHostAction(async () => {
    await publishRoomState({ round_state: 'answered' });
    sfx.stopGameSound();
  });
  useEffect(() => { revealAnswerRef.current = revealAnswer; });

  const handleGoToRanking = async () => runHostAction(async () => {
    await publishRoomState({ round_state: 'ranking' });
    sfx.playClick();
  });

  const handleNextRound = async () => runHostAction(async () => {
    sfx.playClick();
    if (currentRoundIndex < gameRounds) {
      const nextRound = currentRoundIndex + 1;
      const roundsLeft = gameRounds - nextRound;
      
      const motivationalMessages = [
        "Vamos Lá!",
        "Falta Pouco!",
        "Continuem Firmes!",
        "Preparem-se!",
        "Vocês Conseguem!",
        "Mantenham o Foco!"
      ];
      const randomMsg = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
      
      setRoundTransitionMessage({
        title: `Rodada ${nextRound} de ${gameRounds}`,
        subtitle: roundsLeft === 0 ? `Última rodada! ${randomMsg}` : `Faltam ${roundsLeft} rodadas. ${randomMsg}`
      });

      await publishRoomState({ round_state: 'idle', current_round: nextRound });
      if (currentQuestion) markQuestionUsed(currentQuestion.id);
      setRoundTransitionMessage(null);
    } else {
      // Fim do jogo! Chamar Pódio de Suspense
      await publishRoomState({ status: 'finished', round_state: 'idle' });
      setScreen('podium');
      setPodiumStep(0);
      sfx.playDrumRoll();
      
      // Animação de suspense do pódio dinâmica conforme o número de jogadores
      const pCount = activePlayers.length;
      let delay = 1000;
      setTimeout(() => setPodiumStep(1), delay); // Abre as cortinas
      
      if (pCount >= 3) {
        delay += 2000;
        setTimeout(() => setPodiumStep(2), delay); // Mostra 3º
      } else {
        setTimeout(() => setPodiumStep(2), delay + 100);
      }
      
      if (pCount >= 2) {
        delay += 2000;
        setTimeout(() => setPodiumStep(3), delay); // Mostra 2º
      } else {
        setTimeout(() => setPodiumStep(3), delay + 100);
      }
      
      delay += 2000;
      setTimeout(() => {
        setPodiumStep(4);
        sfx.playVictory();

        // Canhão central: explosão única no instante exato da revelação do campeão
        confetti({
          particleCount: 160,
          spread: 100,
          startVelocity: 45,
          origin: { x: 0.5, y: 0.45 },
          colors: ['#fbbf24', '#fde68a', '#f59e0b', '#26ccff', '#ff5e7e', '#a25afd']
        });

        // Efeito de confetes no pódio - Mais festivo e prolongado
        const duration = 4000;
        const end = Date.now() + duration;

        const frame = () => {
          confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
          });
          confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();
        
        // Explosão central
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 }
        });
      }, delay);
    }
  });

  // Ajuste fino do cronômetro em tempo real pelo host
  const adjustTimer = async (amount: number) => runHostAction(async () => {
    await publishRoomState({ adjust_seconds: amount });
    sfx.playClick();
  });
  const toggleTimerPause = async () => runHostAction(async () => {
    await publishRoomState({ paused: pausedRemaining === null });
  });

  // Ordenação de vencedores
  // ── Leaderboard animado: mostra o placar anterior primeiro, depois revela o novo ──
  const [prevScores, setPrevScores] = useState<Record<string, number> | null>(null);
  const [showNewScores, setShowNewScores] = useState(false);

  // Fotografa os pontos no início da rodada (antes de qualquer resposta pontuar)
  useEffect(() => {
    if (roundState === 'spinning') {
      setPrevScores(Object.fromEntries(activePlayers.map(p => [p.id, p.score])));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundState]);

  // Ao abrir o ranking: exibe o placar antigo por ~2,2s e então revela o novo
  useEffect(() => {
    if (roundState === 'ranking') {
      setShowNewScores(false);
      const t = setTimeout(() => setShowNewScores(true), 2200);
      return () => clearTimeout(t);
    }
  }, [roundState]);

  const sortedPlayers = [...activePlayers].sort((a, b) => b.score - a.score);
  const questionReport = usedQuestionIds.map((id, index) => {
    const question = questions.find(item => item.id === id);
    const results = activePlayers.map(player => player.stats?.answers?.[index + 1]).filter(value => value !== undefined);
    return { id, question, answered: results.length, correct: results.filter(Boolean).length };
  }).filter(item => item.question);
  const categoryReport = categories.map(category => {
    const rows = questionReport.filter(row => row.question?.category_id === category.id);
    return { category, answered: rows.reduce((sum, row) => sum + row.answered, 0), correct: rows.reduce((sum, row) => sum + row.correct, 0) };
  }).filter(item => item.answered > 0);
  const onlineCount = activePlayers.filter(player => onlinePlayerIds.includes(player.id)).length;
  const spectatorLink = roomLink ? `${roomLink}&view=spectator` : '';
  const sortedTeams = Object.entries(teamScores).sort(([, left], [, right]) => right - left);
  const prevSortedPlayers = prevScores
    ? activePlayers.map(p => ({ ...p, score: prevScores[p.id] ?? 0 })).sort((a, b) => b.score - a.score)
    : sortedPlayers;
  // Lista exibida no leaderboard: placar congelado da rodada anterior → placar novo
  const rankingPlayers = (showNewScores || !prevScores) ? sortedPlayers : prevSortedPlayers;
  const prevPosById = new Map(prevSortedPlayers.map((p, i) => [p.id, i]));
  const thirdPlace = sortedPlayers[2];
  const secondPlace = sortedPlayers[1];
  const firstPlace = sortedPlayers[0];

  if (URL_ROOM_CODE || studentRoomCode) {
    const activeRoom = (URL_ROOM_CODE || studentRoomCode)!;
    if (urlParams.get('view') === 'spectator') return <SpectatorView roomCode={activeRoom} />;
    return (
      <div className="relative w-full min-h-screen">
        {!URL_ROOM_CODE && (
          <button
            type="button"
            onClick={() => { setStudentRoomCode(null); setAppMode('portal'); }}
            className="fixed top-3 left-3 z-50 px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 text-white/80 hover:text-white text-xs font-bold border border-white/10 backdrop-blur-md transition-all flex items-center gap-1.5 shadow-lg"
            title="Voltar ao início para trocar de sala"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Sair da Sala</span>
          </button>
        )}
        <PlayerView roomCode={activeRoom} />
      </div>
    );
  }

  if (appMode === 'practice') return <PracticeView onBack={() => setAppMode(authUser ? 'online' : 'portal')}
    seedCategories={categories.map(c => ({ id: c.id, name: c.name, color: c.color, icon: c.icon }))}
    seedQuestions={questions.map(q => ({ id: q.id, category_id: q.category_id, question_text: q.question_text,
      time_limit: q.time_limit || 20, explanation: q.explanation, reference_url: q.reference_url,
      difficulty: q.difficulty, tags: q.tags, alternatives: q.alternatives }))} />;

  if (appMode === 'portal') {
    return (
      <LoginPortal
        onJoinAsStudent={handleJoinAsStudentFromPortal}
        onGoToPractice={() => setAppMode('practice')}
        onTeacherLogin={handleTeacherLoginFromPortal}
        onDemoLogin={handleDemoLoginFromPortal}
        initialPin={URL_ROOM_CODE || ''}
      />
    );
  }

  // ─── Modo Local: renderizar componente dedicado ──────────────────────────
  if (appMode === 'local') {
    return (
      <div className="w-full min-h-screen flex flex-col">
        {/* Header */}
        <div className="max-w-[1200px] w-full mx-auto px-6">
          <header className="flex justify-between items-center py-4 border-b border-[hsl(var(--border-color))] mb-6">
            <button
              type="button"
              onClick={() => { setAppMode(authUser ? 'online' : 'portal'); sfx.playClick(); }}
              className="flex items-center gap-3 text-left p-1.5 -ml-1.5 rounded-2xl hover:bg-white/[0.04] active:scale-[0.98] transition group cursor-pointer border border-transparent hover:border-white/10"
              title="Voltar à tela anterior"
            >
              <img src="/logo.png" alt="Quizziando Logo" className="animate-bounce-gentle group-hover:scale-105 transition-transform" style={{ height: '44px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(124, 58, 237, 0.45))' }} />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-[hsl(var(--text-primary))] to-[hsl(var(--secondary))] bg-clip-text text-transparent group-hover:opacity-90">
                  Quizziando
                </h1>
                <span className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider font-semibold flex items-center gap-1 group-hover:text-emerald-300 transition-colors">
                  <Monitor style={{ width: 12, height: 12 }} /> Modo Local
                </span>
              </div>
            </button>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => { setAppMode(authUser ? 'online' : 'portal'); sfx.playClick(); }}
                className="flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-emerald-500/40 text-slate-300 hover:text-white text-xs font-bold transition-all shadow-sm active:scale-95 group cursor-pointer"
                title="Voltar à tela anterior"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline">Voltar</span>
              </button>
              <button
                onClick={() => { setSoundEnabled(s => !s); sfx.playClick(); }}
                className="p-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.05)] text-[hsl(var(--text-secondary))]"
                title={soundEnabled ? 'Silenciar' : 'Ativar som'}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>
          </header>
        </div>
        <main className="flex-grow flex flex-col justify-center">
          <LocalGameMode
            onBack={() => setAppMode('select')}
            onSavedQuizzesChange={setSavedQuizzes}
            supabaseCategories={categories.map(c => ({ id: c.id, name: c.name, color: c.color, icon: c.icon }))}
            supabaseQuestions={questions.map(q => ({
              id: q.id,
              category_id: q.category_id,
              question_text: q.question_text,
              time_limit: q.time_limit || 20,
              explanation: q.explanation,
              reference_url: q.reference_url,
              difficulty: q.difficulty,
              tags: q.tags,
              alternatives: q.alternatives
            }))}
            soundEnabled={soundEnabled}
            onToggleSound={() => { setSoundEnabled(s => !s); sfx.playClick(); }}
          />
        </main>
      </div>
    );
  }

  // ─── Tela de Seleção de Modo ─────────────────────────────────────────────
  if (appMode === 'select') {
    return (
      <div className="app-container min-h-screen flex flex-col">
        <header className="flex justify-between items-center py-4 border-b border-[hsl(var(--border-color))] mb-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Quizziando Logo" className="animate-bounce-gentle" style={{ height: '44px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(124, 58, 237, 0.45))' }} />
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-[hsl(var(--text-primary))] to-[hsl(var(--secondary))] bg-clip-text text-transparent">
                Quizziando
              </h1>
              <span className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider font-semibold">
                Escolha o Modo de Jogo
              </span>
            </div>
          </div>
        </header>
        <main className="flex-grow flex flex-col justify-center py-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ maxWidth: 560, margin: '0 auto', width: '100%' }}
          >
            <div className="glass-card p-8 flex flex-col gap-8">
              <div className="text-center">
                <span className="text-xs font-bold text-[hsl(var(--secondary))] tracking-widest uppercase">
                  Bem-vindo ao Quizziando!
                </span>
                <h2 className="text-3xl font-extrabold mt-2">Como deseja jogar?</h2>
                <p className="text-sm text-[hsl(var(--text-secondary))] mt-2">
                  Escolha o modo de jogo para continuar.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                {/* Modo Online */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setHybridMode(false); setAppMode('online'); sfx.playClick(); }}
                  style={{
                    padding: '24px', borderRadius: 20,
                    background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(99,102,241,0.08))',
                    border: '1.5px solid rgba(124,58,237,0.35)',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                    display: 'flex', alignItems: 'center', gap: 20,
                    boxShadow: '0 8px 32px rgba(124,58,237,0.15)',
                  }}
                >
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
                    <Wifi style={{ width: 28, height: 28, color: 'white' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'white' }}>🌐 Modo Online</p>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(148,163,184,0.8)', lineHeight: 1.5 }}>
                      Jogue em tempo real com jogadores na internet. Crie salas, use o celular como controle e compita ao vivo.
                    </p>
                    <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {['Sala ao vivo', 'Multiplayer', 'Supabase Realtime'].map(tag => (
                        <span key={tag} style={{ fontSize: 10, fontWeight: 700, color: '#A78BFA', background: 'rgba(124,58,237,0.15)', borderRadius: 999, padding: '3px 10px', border: '1px solid rgba(124,58,237,0.2)' }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight style={{ width: 22, height: 22, color: 'rgba(124,58,237,0.7)', flexShrink: 0 }} />
                </motion.button>

                {/* Modo Local */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setAppMode('local'); sfx.playClick(); }}
                  style={{
                    padding: '24px', borderRadius: 20,
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.06))',
                    border: '1.5px solid rgba(16,185,129,0.3)',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                    display: 'flex', alignItems: 'center', gap: 20,
                    boxShadow: '0 8px 32px rgba(16,185,129,0.12)',
                  }}
                >
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #059669, #047857)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 20px rgba(5,150,105,0.4)' }}>
                    <Monitor style={{ width: 28, height: 28, color: 'white' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'white' }}>🖥️ Modo Local</p>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(148,163,184,0.8)', lineHeight: 1.5 }}>
                      Jogue sem internet com dois times. Os participantes falam a resposta e o host confirma acerto ou erro.
                    </p>
                    <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {['Sem internet', '2 Times', 'Resposta oral', 'SQLite Local'].map(tag => (
                        <span key={tag} style={{ fontSize: 10, fontWeight: 700, color: '#34D399', background: 'rgba(5,150,105,0.15)', borderRadius: 999, padding: '3px 10px', border: '1px solid rgba(5,150,105,0.2)' }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight style={{ width: 22, height: 22, color: 'rgba(16,185,129,0.7)', flexShrink: 0 }} />
                </motion.button>

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => { setHybridMode(true); setGameMode('open'); setAppMode('online'); handleOpenManagerLogin(); }}
                  style={{ padding: 24, borderRadius: 20, background: 'linear-gradient(135deg, rgba(236,72,153,0.14), rgba(124,58,237,0.08))', border: '1.5px solid rgba(244,114,182,0.35)', cursor: 'pointer', textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center', gap: 20 }}>
                  <Monitor style={{ width: 36, height: 36, color: '#F9A8D4' }} />
                  <div style={{ flex: 1 }}><p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'white' }}>📱 Presencial com celulares</p>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#CBD5E1' }}>Projete a tela do público e receba respostas dos celulares pela internet.</p></div>
                  <ChevronRight style={{ width: 22, height: 22, color: '#F9A8D4' }} />
                </motion.button>

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => { setAppMode('practice'); sfx.playClick(); }}
                  style={{ padding: 24, borderRadius: 20, background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(124,58,237,0.08))', border: '1.5px solid rgba(96,165,250,0.35)', cursor: 'pointer', textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center', gap: 20 }}>
                  <BookOpen style={{ width: 36, height: 36, color: '#93C5FD' }} />
                  <div style={{ flex: 1 }}><p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'white' }}>📘 Treino individual</p>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#CBD5E1' }}>Pratique com o acervo local e revise seus erros, sem organizador conectado.</p></div>
                  <ChevronRight style={{ width: 22, height: 22, color: '#93C5FD' }} />
                </motion.button>
              </div>

              <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(148,163,184,0.4)', fontWeight: 600 }}>
                Quizziando — Live Realtime Arena
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col justify-between ${isGamePlayFullscreen || screen === 'operator-dashboard' ? '' : 'app-container'}`}
      style={isGamePlayFullscreen || screen === 'operator-dashboard' ? { maxWidth: '100%', margin: 0, padding: '0' } : undefined}
    >
      {gameError && <div role="alert" style={{ position: 'fixed', top: 12, left: '10%', right: '10%', zIndex: 9999, background: '#451a1a', color: 'white', padding: 16, borderRadius: 12 }}>
        <p>{gameError}</p>
        {screen === 'game-play' && ['spinning', 'category-reveal', 'question-reveal'].includes(roundState) && <button disabled={hostBusy} onClick={() => void runHostAction(async () => {
          if (roundState === 'spinning') {
            const available = questions.filter(q => selectedCategoryIds.includes(q.category_id) && matchesQuestionFilters(q, selectedQuestionIds, difficultyFilter, tagFilter) && !usedQuestionIdsRef.current.includes(q.id));
            if (!available.length) throw new Error('Não há perguntas disponíveis.');
            setIsSpinning(false);
            await publishRoomState({ round_state: 'category-reveal', current_question: { id: available[0].id } });
          } else await publishRoomState({ round_state: roundState === 'category-reveal' ? 'question-reveal' : 'question' });
        })}>Retomar rodada</button>}
        <button onClick={() => setGameError('')} style={{ marginLeft: 12 }}>Fechar aviso</button>
      </div>}
      {/* HEADER PREMIUM — oculto durante game-play fullscreen ou no dashboard do operador */}
      <header className="flex justify-between items-center py-4 border-b border-[hsl(var(--border-color))] mb-6"
        style={isGamePlayFullscreen || screen === 'operator-dashboard' ? { display: 'none' } : undefined}
      >
        <button
          type="button"
          onClick={handleReturnToSelectMode}
          className="flex items-center gap-3 text-left p-1.5 -ml-1.5 rounded-2xl hover:bg-white/[0.04] active:scale-[0.98] transition group cursor-pointer border border-transparent hover:border-white/10"
          title="Clique para voltar à tela de escolha do tipo de quiz"
        >
          <img src="/logo.png" alt="Quizziando Logo" className="animate-bounce-gentle group-hover:scale-105 transition-transform" style={{ height: '44px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(124, 58, 237, 0.45))' }} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-[hsl(var(--text-primary))] to-[hsl(var(--secondary))] bg-clip-text text-transparent group-hover:opacity-90">
                Quizziando
              </h1>
            </div>
            <span className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider font-semibold flex items-center gap-1.5 group-hover:text-purple-300 transition-colors">
              Live Realtime Arena
            </span>
          </div>
        </button>
        
        <div className="flex items-center gap-2 sm:gap-3 relative">
          {/* BADGE DO MODO ATUAL */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-300 text-xs font-semibold border border-purple-500/20">
            {hybridMode ? '📱 Presencial com Celulares' : '🌐 Modo Online'}
          </div>

          {/* BOTÃO VOLTAR / TROCAR MODO */}
          <button
            type="button"
            onClick={handleReturnToSelectMode}
            className="flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-purple-500/40 text-slate-300 hover:text-white text-xs font-bold transition-all shadow-sm active:scale-95 group cursor-pointer"
            title="Voltar à tela de escolha do tipo de quiz"
          >
            <ArrowLeft className="w-4 h-4 text-purple-400 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Trocar Modo</span>
          </button>

          {/* BOTÃO DE CONFIGURAÇÕES */}
          <button 
            onClick={() => { setShowSettingsModal(true); sfx.playClick(); }}
            className={`p-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.08)] border transition text-[hsl(var(--text-secondary))] flex items-center justify-center ${
              showSettingsModal ? 'border-[hsl(var(--primary))]' : 'border-[rgba(255,255,255,0.05)]'
            }`}
            title="Configurações"
          >
            <Settings className={`w-5 h-5 transition-transform duration-300 ${showSettingsModal ? 'rotate-90 text-[hsl(var(--primary))]' : ''}`} />
          </button>

          {/* ==========================================
              ⚙️ MODAL PREMIUM DE CONFIGURAÇÕES (ESTILO SIDEBAR)
              ========================================== */}
          {showSettingsModal && (
            <div
              style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.8)',
                backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                animation: 'fadeInModal 0.25s ease'
              }}
              onClick={(e) => { if (e.target === e.currentTarget) setShowSettingsModal(false); }}
            >
              <div
                style={{
                  width: '100%', maxWidth: '740px',
                  height: '640px',
                  background: 'rgba(8,12,28,0.96)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '24px',
                  boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 60px rgba(124,58,237,0.15)',
                  display: 'flex', flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  animation: 'slideUpModal 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                {/* Header */}
                <div className="flex justify-between items-center px-8 py-6 border-b border-white/5 bg-gradient-to-r from-white/[0.02] to-transparent">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-[hsl(var(--secondary))] tracking-widest uppercase">
                      Preferências do Sistema
                    </span>
                    <h3 className="text-xl font-extrabold text-white tracking-tight font-sans">
                      Configurações
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:scale-110 active:scale-95 transition-all duration-200 border border-white/10 hover:border-white/20 flex-shrink-0"
                    title="Fechar Configurações"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body (Sidebar + Content) */}
                <div className="flex flex-1 overflow-hidden">
                  {/* Sidebar */}
                  <div className="w-1/4 border-r border-white/5 bg-[#080c1c]/40 px-4 py-6 flex flex-col gap-2">
                    <button
                      onClick={() => { setSettingsActiveTab('general'); sfx.playClick(); }}
                      className={`flex items-center gap-2.5 py-2 px-3 rounded-lg text-xs font-bold transition-all text-left ${
                        settingsActiveTab === 'general'
                          ? 'bg-white/5 text-[hsl(var(--primary))] border-l-2 border-[hsl(var(--primary))]'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
                      }`}
                    >
                      <Settings className="w-4 h-4" />
                      Geral
                    </button>

                    <button
                      onClick={() => { setSettingsActiveTab('appearance'); sfx.playClick(); }}
                      className={`flex items-center gap-2.5 py-2 px-3 rounded-lg text-xs font-bold transition-all text-left ${
                        settingsActiveTab === 'appearance'
                          ? 'bg-white/5 text-pink-400 border-l-2 border-pink-500'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
                      }`}
                    >
                      <Palette className="w-4 h-4" />
                      Aparência
                    </button>

                    <button
                      onClick={() => { setSettingsActiveTab('ai'); sfx.playClick(); }}
                      className={`flex items-center gap-2.5 py-2 px-3 rounded-lg text-xs font-bold transition-all text-left ${
                        settingsActiveTab === 'ai'
                          ? 'bg-white/5 text-[hsl(var(--secondary))] border-l-2 border-[hsl(var(--secondary))]'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      Inteligência Artificial
                    </button>

                    {(role === 'operator' || authUser) && (
                      <button
                        onClick={() => { setSettingsActiveTab('questions'); sfx.playClick(); }}
                        className={`flex items-center gap-2.5 py-2 px-3 rounded-lg text-xs font-bold transition-all text-left ${
                          settingsActiveTab === 'questions'
                            ? 'bg-white/5 text-indigo-400 border-l-2 border-indigo-500'
                            : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
                        }`}
                      >
                        <BookOpen className="w-4 h-4" />
                        Questões
                      </button>
                    )}

                    <button
                      onClick={() => { setSettingsActiveTab('account'); sfx.playClick(); }}
                      className={`flex items-center gap-2.5 py-2 px-3 rounded-lg text-xs font-bold transition-all text-left ${
                        settingsActiveTab === 'account'
                          ? 'bg-white/5 text-emerald-400 border-l-2 border-emerald-500'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
                      }`}
                    >
                      <User className="w-4 h-4" />
                      Conta
                    </button>
                  </div>

                  {/* Content Panel */}
                  <div className="w-3/4 px-8 py-8 overflow-y-auto">
                    {settingsActiveTab === 'general' && (
                      <div className="flex flex-col gap-6 animate-fade-in">
                        <div className="flex flex-col gap-4 pt-2">
                          <div>
                            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">Efeitos Sonoros</h4>
                            <p className="text-[11px] text-slate-400">Ative ou desative o feedback sonoro do aplicativo.</p>
                          </div>
                          <button
                            onClick={() => {
                              if (soundEnabled) {
                                sfx.playClick();
                              }
                              setSoundEnabled(!soundEnabled);
                            }}
                            title={soundEnabled ? 'Desativar som' : 'Ativar som'}
                            className="flex items-center justify-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-colors"
                          >
                            {soundEnabled ? <Volume2 className="w-5 h-5 text-[hsl(var(--primary))]" /> : <VolumeX className="w-5 h-5 text-red-400" />}
                            <span className="text-sm font-bold text-white">
                              {soundEnabled ? 'Som ativado' : 'Som desativado'}
                            </span>
                          </button>
                        </div>

                      </div>
                    )}

                    {settingsActiveTab === 'appearance' && (
                      <div className="flex flex-col gap-6 animate-fade-in pt-2">
                        <div className="flex flex-col gap-4">
                          <div>
                            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">Temas da Arena</h4>
                            <p className="text-[11px] text-slate-400">Personalize a imagem de fundo da Roleta.</p>
                          </div>
                          <div className="grid grid-cols-4 gap-4">
                            {Object.entries(GAME_THEMES).map(([key, theme]) => (
                              <button
                                key={key}
                                onClick={() => { setGameTheme(key); localStorage.setItem('gameTheme', key); sfx.playClick(); }}
                                className={`p-2 rounded-xl border flex flex-col gap-2 transition-all ${
                                  gameTheme === key
                                    ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 shadow-[0_0_15px_rgba(124,58,237,0.2)]'
                                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                                }`}
                              >
                                <div
                                  className="w-full rounded-lg border border-white/10 bg-cover bg-center"
                                  style={{
                                    height: '64px',
                                    backgroundColor: theme.bg !== 'transparent' ? theme.bg : '#0d1326',
                                    backgroundImage: theme.img !== 'none' ? theme.img : 'linear-gradient(135deg, #2a1b54, #4338ca)'
                                  }}
                                />
                                <span className={`text-[8px] font-semibold text-center ${gameTheme === key ? 'text-[hsl(var(--primary))]' : 'text-slate-300'}`}>
                                  {theme.label}
                                </span>
                              </button>
                            ))}

                            {/* Card Personalizado — carrega imagem local */}
                            <label
                              className={`p-2 rounded-xl border flex flex-col gap-2 transition-all cursor-pointer ${
                                gameTheme === 'custom'
                                  ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 shadow-[0_0_15px_rgba(124,58,237,0.2)]'
                                  : 'border-dashed border-white/20 bg-white/5 hover:bg-white/10'
                              }`}
                            >
                              <input type="file" accept="image/*" className="hidden" onChange={handleCustomThemeUpload} />
                              <div
                                className="w-full rounded-lg border border-white/10 bg-cover bg-center flex items-center justify-center"
                                style={{
                                  height: '64px',
                                  backgroundColor: '#0d1326',
                                  backgroundImage: (gameTheme === 'custom' && customThemeImg) ? `url(${customThemeImg})` : 'none'
                                }}
                              >
                                {!(gameTheme === 'custom' && customThemeImg) && (
                                  <Upload className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                              <span className={`text-[8px] font-semibold text-center ${gameTheme === 'custom' ? 'text-[hsl(var(--primary))]' : 'text-slate-300'}`}>
                                Personalizado
                              </span>
                            </label>
                          </div>

                          {gameTheme === 'custom' && customThemeImg && (
                            <button
                              onClick={() => {
                                localStorage.removeItem('customThemeImg');
                                setCustomThemeImg(null);
                                setGameTheme('default');
                                localStorage.setItem('gameTheme', 'default');
                                sfx.playClick();
                              }}
                              className="self-start flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[10px] font-bold transition-all"
                            >
                              <Trash className="w-3 h-3" />
                              Remover imagem personalizada
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {settingsActiveTab === 'questions' && (role === 'operator' || authUser) && (
                      <div className="flex flex-col gap-6 animate-fade-in pt-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">Banco de Questões</h4>
                          <p className="text-[11px] text-slate-400">Gerencie as perguntas do quiz.</p>
                        </div>

                        {/* Card hero do gerenciador */}
                        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-indigo-950/60 via-[#0d1326] to-purple-950/40">
                          {/* Brilho decorativo */}
                          <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
                          <div className="absolute -bottom-20 -left-10 w-40 h-40 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

                          <div className="relative p-6 flex flex-col items-center text-center gap-4">
                            {/* Ícone destaque */}
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                              <BookOpen className="w-8 h-8 text-white" />
                            </div>

                            <div className="flex flex-col gap-1">
                              <span className="text-lg font-extrabold text-white tracking-tight">Gerenciador de Questões</span>
                              <span className="text-[12px] text-slate-400 max-w-[280px] leading-relaxed">
                                Adicione, edite, organize e remova as perguntas que aparecem no seu quiz.
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                setShowQuestionManagerModal(true);
                                setShowSettingsModal(false);
                                sfx.playClick();
                              }}
                              className="group mt-1 w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all duration-300 active:scale-[0.98]"
                            >
                              <BookOpen className="w-4 h-4" />
                              Abrir Gerenciador
                              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {settingsActiveTab === 'ai' && (
                      <div className="flex flex-col gap-4 animate-fade-in pt-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">Integração Gemini AI</h4>
                          <p className="text-[11px] text-slate-400">Configure a chave de acesso e escolha ou cadastre um modelo compatível com a API Gemini.</p>
                        </div>

                        <div className="flex flex-col gap-3">
                          {/* Chave de API */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase">Gemini API Key</label>
                            <input
                              type="password"
                              placeholder="Cole sua API Key aqui..."
                              value={geminiApiKey}
                              onChange={(e) => {
                                setGeminiApiKey(e.target.value);
                                localStorage.setItem('geminiApiKey', e.target.value);
                                if (aiTestStatus !== 'idle') setAiTestStatus('idle');
                              }}
                              className="input-glow py-2 px-3 text-xs w-full bg-[#0d1326] border border-white/10 rounded-xl"
                            />
                          </div>

                          {/* Nome do Modelo */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase">Modelo ativo</label>
                            <select
                              value={geminiModel}
                              onChange={(e) => {
                                setGeminiModel(e.target.value);
                                localStorage.setItem('geminiModel', e.target.value);
                                if (aiTestStatus !== 'idle') setAiTestStatus('idle');
                              }}
                              className="input-glow py-2 px-3 text-xs w-full bg-[#0d1326] border border-white/10 rounded-xl text-white font-medium"
                            >
                              <option value="gemini-1.5-flash">gemini-1.5-flash (Padrão e Rápido)</option>
                              <option value="gemini-1.5-pro">gemini-1.5-pro (Precisão Máxima)</option>
                              <option value="gemini-2.5-flash">gemini-2.5-flash (Nova Geração)</option>
                              <option value="gemini-2.0-flash-exp">gemini-2.0-flash-exp (Experimental)</option>
                              {geminiCustomModels.map((model) => (
                                <option key={model} value={model}>{model} (Personalizado)</option>
                              ))}
                            </select>
                          </div>

                          <div className="ai-model-manager">
                            <div className="ai-model-manager__heading">
                              <span>Modelos personalizados</span>
                              <small>Ex.: gemini-2.5-pro</small>
                            </div>
                            <div className="ai-model-manager__add">
                              <input
                                type="text"
                                value={newGeminiModel}
                                onChange={(e) => setNewGeminiModel(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key !== 'Enter') return;
                                  e.preventDefault();
                                  const model = newGeminiModel.trim();
                                  if (!model || geminiCustomModels.includes(model)) return;
                                  setGeminiCustomModels((models) => [...models, model]);
                                  setGeminiModel(model);
                                  setNewGeminiModel('');
                                  setAiTestStatus('idle');
                                }}
                                placeholder="ID do modelo"
                                className="input-glow py-2 px-3 text-xs w-full bg-[#0d1326] border border-white/10 rounded-xl"
                              />
                              <button
                                type="button"
                                className="ai-model-manager__button"
                                onClick={() => {
                                  const model = newGeminiModel.trim();
                                  if (!model || geminiCustomModels.includes(model)) return;
                                  setGeminiCustomModels((models) => [...models, model]);
                                  setGeminiModel(model);
                                  setNewGeminiModel('');
                                  setAiTestStatus('idle');
                                }}
                                disabled={!newGeminiModel.trim() || geminiCustomModels.includes(newGeminiModel.trim())}
                              >Adicionar</button>
                            </div>
                            {geminiCustomModels.length > 0 && (
                              <div className="ai-model-manager__chips">
                                {geminiCustomModels.map((model) => (
                                  <span key={model}>{model}
                                    <button type="button" aria-label={`Remover ${model}`} onClick={() => {
                                      setGeminiCustomModels((models) => models.filter((item) => item !== model));
                                      if (geminiModel === model) setGeminiModel('gemini-1.5-flash');
                                    }}>×</button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Teste de Conexão */}
                          <div className="flex gap-2 items-center mt-1">
                            <button
                              onClick={() => testGeminiConnection(geminiApiKey)}
                              disabled={aiTestingKey}
                              className="py-2 px-4 rounded-xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 hover:opacity-90"
                            >
                              {aiTestingKey ? 'Validando...' : 'Testar Chave'}
                            </button>
                            {aiTestStatus === 'success' && (
                              <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20">
                                ✓ Chave Conectada
                              </span>
                            )}
                            {aiTestStatus === 'error' && (
                              <span className="px-3 py-1.5 bg-red-500/10 text-red-400 text-xs font-bold rounded-lg border border-red-500/20" title={aiTestErrorMsg}>
                                ✗ {aiTestErrorMsg ? `Falha: ${aiTestErrorMsg}` : 'Chave Inválida'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {settingsActiveTab === 'account' && (
                      <div className="flex flex-col gap-4 animate-fade-in pt-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">Gerenciamento de Conta</h4>
                          <p className="text-[11px] text-slate-400">Verifique seu perfil de operador e permissões de arena.</p>
                        </div>

                        {authUser ? (
                          <div className="flex flex-col gap-3">
                            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1.5">
                              <span className="text-xs text-white font-bold">{authUser.email}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
                                  Permissão: Operador
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => { setShowSettingsModal(false); handleLogout(); }}
                              className="w-full py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold transition-all flex items-center justify-center gap-2"
                            >
                              <LogOut className="w-4 h-4" />
                              Sair da Conta
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3 p-4 border border-white/5 rounded-xl bg-white/[0.01] text-center justify-center items-center">
                            <Lock className="w-8 h-8 text-[hsl(var(--primary))] opacity-60 mb-1" />
                            <span className="text-xs text-slate-300 font-bold">Nenhuma Conta Logada</span>
                            <p className="text-[11px] text-slate-400 leading-relaxed max-w-[280px]">
                              Faça login como organizador para poder acessar a gestão de questões e gerenciar o quiz online.
                            </p>
                            <button
                              onClick={() => {
                                setShowSettingsModal(false);
                                setShowLoginModal(true);
                                sfx.playClick();
                              }}
                              className="py-1.5 px-4 bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20 rounded-lg text-[hsl(var(--primary))] text-xs font-bold hover:bg-[hsl(var(--primary))]/20 transition-all mt-1"
                            >
                              Fazer Login agora
                        </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL DINÂMICO */}
      <main className={`flex-grow flex flex-col justify-center ${isGamePlayFullscreen || screen === 'operator-dashboard' ? 'py-0' : 'py-4'}`}>
        
        {/* ==========================================
            1. TELA DE ENTRADA (WELCOME)
            ========================================== */}
        {screen === 'welcome' && (
          <div className="max-w-md mx-auto w-full glass-card p-8 flex flex-col gap-6">
            <div className="text-center">
              <span className="text-xs font-bold text-[hsl(var(--secondary))] tracking-widest uppercase">
                Bem-vindo ao Quizziando!
              </span>
              <h2 className="text-3xl font-extrabold mt-1">Escolha seu Papel</h2>
              <p className="text-sm text-[hsl(var(--text-secondary))] mt-2">
                Acesse como Organizador para criar salas ou entre como Jogador para duelar em tempo real.
              </p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => { setRole('player'); sfx.playClick(); }}
                className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 transition ${
                  role === 'player' 
                    ? 'border-[hsl(var(--secondary))] bg-[hsla(var(--secondary),0.05)] text-white' 
                    : 'border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)] text-[hsl(var(--text-muted))]'
                }`}
              >
                <User className="w-8 h-8" />
                <span className="font-semibold text-sm">Jogar Arena</span>
              </button>
              
              <button 
                onClick={handleOpenManagerLogin}
                className={`flex-1 p-4 rounded-xl border flex flex-col items-center gap-2 transition ${
                  role === 'operator' 
                    ? 'border-[hsl(var(--primary))] bg-[hsla(var(--primary),0.05)] text-white' 
                    : 'border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)] text-[hsl(var(--text-muted))]'
                }`}
              >
                <Crown className="w-8 h-8" />
                <span className="font-semibold text-sm">Gerenciar Quiz</span>
                {authUser && (
                  <span style={{ fontSize: '10px', color: 'rgba(52, 211, 153, 0.9)', background: 'rgba(16,185,129,0.1)', borderRadius: '999px', padding: '2px 8px', border: '1px solid rgba(16,185,129,0.25)' }}>
                    ✓ Autenticado
                  </span>
                )}
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {role === 'player' ? (
                <>
                  <label className="text-xs font-semibold text-[hsl(var(--text-secondary))] uppercase">Nickname do Competidor</label>
                  <input 
                    type="text" 
                    placeholder="Ex: QuizMaster99" 
                    value={nickname} 
                    onChange={e => setNickname(e.target.value)}
                    className="input-glow"
                  />
                  
                  <label className="text-xs font-semibold text-[hsl(var(--text-secondary))] uppercase mt-2">Código da Sala (para Jogar Online)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Y9KA (Opcional para local)" 
                    value={joinRoomCode} 
                    onChange={e => setJoinRoomCode(e.target.value)}
                    className="input-glow font-mono uppercase"
                  />
                  {gameMode === 'team' && (
                    <>
                      <label className="text-xs font-semibold text-[hsl(var(--text-secondary))] uppercase mt-2">Nome da Equipe (Opcional)</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Time Alfa" 
                        value={teamName} 
                        onChange={e => setTeamName(e.target.value)}
                        className="input-glow"
                      />
                    </>
                  )}
                </>
              ) : (
                <div className="p-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl text-xs text-[hsl(var(--text-secondary))] flex items-start gap-2">
                  <Lock className="w-4 h-4 text-[hsl(var(--primary))] flex-shrink-0 mt-0.5" />
                  <span>
                    {authUser 
                      ? `Logado como ${authUser.email}. Acesse o painel abaixo.`
                      : 'Acesso restrito. Clique em "Gerenciar Quiz" para autenticar-se como organizador.'
                    }
                  </span>
                </div>
              )}
            </div>

            <button 
              onClick={role === 'operator' ? handleOpenManagerLogin : handleStartGameSetup}
              className="btn-glow justify-center text-center font-bold"
            >
              {role === 'operator' ? (authUser ? 'Entrar no Painel' : 'Fazer Login') : 'Entrar no Lobby'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ==========================================
            2. PAINEL DE CONTROLE DO OPERADOR
            ========================================== */}
        {screen === 'operator-dashboard' && (
          <div className="w-full min-h-screen flex flex-col">
            <TeacherDashboard
              teacherEmail={authUser?.email || 'professor@quizziando.com'}
              quizzes={savedQuizzes}
              folders={folders.map(f => ({ id: f.id, name: f.name, color: f.color }))}
              categories={categories}
              questions={questions}
              activeRooms={hostRooms}
              onLogout={handleLogout}
              onPlayQuiz={handlePlayQuizFromDashboard}
              onPlayCategory={handlePlayCategoryAsQuiz}
              onEditQuiz={handleEditQuizFromDashboard}
              onEditCategory={handleEditCategoryQuestions}
              onDuplicateQuiz={handleDuplicateQuizFromDashboard}
              onToggleFavorite={handleToggleFavoriteFromDashboard}
              onDeleteQuiz={handleDeleteQuizFromDashboard}
              onCreateNewQuiz={() => { setShowQuizConfigModal(true); sfx.playClick(); }}
              onCreateFolder={handleCreateFolder}
              onOpenQuestionManager={() => { setShowQuestionManagerModal(true); sfx.playClick(); }}
              onOpenSettings={() => { setShowSettingsModal(true); sfx.playClick(); }}
              onRecoverRoom={handleRecoverRoom}
              onCloseRoom={handleCloseRoom}
              onLaunchNewRoom={(mode) => {
                if (mode === 'hybrid') {
                  setHybridMode(true);
                  setGameMode('open');
                  setShowQuizConfigModal(true);
                } else if (mode === 'online') {
                  setHybridMode(false);
                  setShowQuizConfigModal(true);
                } else {
                  setAppMode('local');
                }
                sfx.playClick();
              }}
            />

            <QuizConfigModal
              isOpen={showQuizConfigModal}
              onClose={() => setShowQuizConfigModal(false)}
              onStartGame={() => {
                setShowQuizConfigModal(false);
                handleStartGameSetup();
              }}
              gameMode={gameMode}
              setGameMode={setGameMode}
              gameRounds={gameRounds}
              setGameRounds={setGameRounds}
              gameTimeLimit={gameTimeLimit}
              setGameTimeLimit={setGameTimeLimit}
              scoringMode={scoringMode}
              setScoringMode={setScoringMode}
              fixedPoints={fixedPoints}
              setFixedPoints={setFixedPoints}
              difficultyFilter={difficultyFilter}
              setDifficultyFilter={setDifficultyFilter}
              tagFilter={tagFilter}
              setTagFilter={setTagFilter}
              availableQuestionCount={availableQuestionCount}
              newQuizName={newQuizName}
              setNewQuizName={setNewQuizName}
              onSaveQuiz={handleSaveQuiz}
              categories={categories}
              selectedCategoryIds={selectedCategoryIds}
              onToggleCategorySelect={handleToggleCategorySelect}
              onToggleSelectAllCategories={(selectAll) => {
                if (selectAll) {
                  setSelectedCategoryIds(categories.map(c => c.id));
                } else {
                  setSelectedCategoryIds([]);
                }
              }}
            />
          </div>
        )}

        {/* ==========================================
            3. LOBBY DE ESPERA (LOBBY)
            ========================================== */}
        {screen === 'game-lobby' && (
          <div className={`${role === 'operator' ? 'max-w-4xl' : 'max-w-2xl'} mx-auto w-full glass-card p-8 flex flex-col gap-6`}>
            <div className="text-center">
              <span className="text-xs font-bold text-[hsl(var(--accent))] tracking-widest uppercase">
                Sala de Espera
              </span>
              <h2 className="text-3xl font-extrabold mt-1">Lobby do Quiz</h2>
              <p className="text-sm text-[hsl(var(--text-secondary))] mt-2">
                {role === 'operator' 
                  ? 'Compartilhe o código ou o link abaixo com seus competidores.' 
                  : 'Aguardando os competidores se conectarem.'}
              </p>
            </div>

            {role === 'operator' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* Lado Esquerdo: Acesso à Sala */}
                <div className="flex flex-col gap-5 p-5 rounded-2xl border border-[rgba(255,255,255,0.04)] bg-white/5 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-[hsl(var(--primary))]/10 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-[hsl(var(--text-secondary))] uppercase tracking-widest block mb-1">
                      Código de Acesso
                    </span>
                    <div className="text-4xl font-black bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] bg-clip-text text-transparent tracking-widest font-mono">
                      {roomCode}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-[hsl(var(--text-secondary))] uppercase">Link para Celular</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={roomLink}
                        className="input-glow text-xs flex-grow font-semibold"
                        onClick={e => (e.target as any).select()}
                      />
                      <button 
                        onClick={handleCopyLink}
                        className="p-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-white/5 hover:bg-white/10 transition text-white"
                        title="Copiar Link"
                      >
                        {linkCopied ? <span className="text-xs text-emerald-400 font-bold">Copiado!</span> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-[hsl(var(--text-secondary))] uppercase">Link para Espectadores</label>
                    <div className="flex gap-2">
                      <input type="text" readOnly value={spectatorLink} className="input-glow text-xs flex-grow font-semibold" onClick={event => event.currentTarget.select()} />
                      <button type="button" onClick={() => void navigator.clipboard.writeText(spectatorLink)} className="p-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-white/5 hover:bg-white/10 transition text-white" title="Copiar link para espectadores" aria-label="Copiar link para espectadores">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="flex flex-col items-center justify-center gap-3 pt-2">
                    <span className="text-[10px] font-bold text-[hsl(var(--text-secondary))] uppercase tracking-wider">
                      Aponte a câmera para jogar 📱
                    </span>
                    <div className="p-3 bg-white rounded-2xl shadow-xl shadow-purple-900/10 border border-purple-500/20">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(roomLink)}&color=7c3aed&bgcolor=ffffff`}
                        alt="QR Code da Sala"
                        className="w-36 h-36 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Jogadores Conectados */}
                <div className="flex flex-col gap-4">
                  <h4 className="text-sm font-bold text-[hsl(var(--text-secondary))] uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-[hsl(var(--primary))]" />
                    Jogadores na Sala ({activePlayers.length}) · {onlineCount} online · {activePlayers.length - onlineCount} offline · {totalAnswered} responderam
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                    {activePlayers.map((player) => (
                      <div key={player.id} className="p-3 bg-white/5 border border-[rgba(255,255,255,0.05)] rounded-xl flex justify-between items-center transition hover:border-[rgba(255,255,255,0.1)]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img src={getAvatarUrl(player.nickname)} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10 bg-[#0d1326] flex-shrink-0" />
                          <span className="font-semibold text-sm text-[hsl(var(--text-primary))] truncate">{player.nickname}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`w-2.5 h-2.5 rounded-full ${onlinePlayerIds.includes(player.id) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} title={onlinePlayerIds.includes(player.id) ? 'Conectado' : 'Desconectado'} />
                          <button
                            onClick={() => handleRemovePlayer(player.id)}
                            className="p-1 text-[hsl(var(--text-muted))] hover:text-red-400 transition"
                            title="Remover jogador"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {activePlayers.length === 0 && (
                      <div className="col-span-2 text-center text-xs text-[hsl(var(--text-muted))] py-12 border border-dashed border-[rgba(255,255,255,0.05)] rounded-2xl">
                        Aguardando competidores se conectarem...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Status do Jogador Principal */}
                <div className="p-4 bg-[hsla(var(--secondary),0.05)] border border-[hsla(var(--secondary),0.2)] rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-[hsl(var(--secondary))]" />
                    <div>
                      <p className="text-sm font-bold text-white">{nickname}</p>
                      <p className="text-xs text-[hsl(var(--text-secondary))]">Seu Nickname de Jogo</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-[hsl(var(--secondary))]/10 text-[hsl(var(--secondary))] text-xs font-bold rounded-full">
                    Pronto
                  </span>
                </div>

                {/* Grid de Competidores */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-sm font-bold text-[hsl(var(--text-secondary))] uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-[hsl(var(--primary))]" />
                    Jogadores Conectados ({activePlayers.length})
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                    {activePlayers.map((player) => (
                      <div key={player.id} className="p-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl flex justify-between items-center">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img src={getAvatarUrl(player.nickname)} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10 bg-[#0d1326] flex-shrink-0" />
                          <span className="font-semibold text-sm text-[hsl(var(--text-primary))] truncate">{player.nickname}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <button
                            onClick={() => handleRemovePlayer(player.id)}
                            className="p-1 text-[hsl(var(--text-muted))] hover:text-red-400 transition"
                            title="Remover jogador"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {activePlayers.length === 0 && (
                      <div className="col-span-2 text-center text-xs text-[hsl(var(--text-muted))] py-6">
                        Nenhum jogador conectado ainda.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {role === 'operator' && <div className="rounded-xl border border-pink-400/30 bg-pink-500/10 p-4 flex flex-wrap items-center justify-between gap-3 text-sm text-pink-100">
              <span>Abra a tela do público em outra janela para projetar a partida.</span>
              <button type="button" onClick={() => window.open(spectatorLink, '_blank', 'noopener,noreferrer')} className="btn-glow px-4 py-2 text-xs">Abrir tela do público</button>
            </div>}

            {role === 'operator' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-white/5 border border-[rgba(255,255,255,0.06)]">
                <label className="text-xs text-[hsl(var(--text-secondary))]">Limite de participantes
                  <input type="number" min="1" max="500" value={maxPlayers}
                    onChange={event => { const value = Math.max(1, Math.min(500, Number(event.target.value) || 1)); setMaxPlayers(value); void saveRoomControls({ max_players: value }); }}
                    className="input-glow mt-1 w-full text-center" />
                </label>
                <div className="flex flex-col gap-2 text-xs text-[hsl(var(--text-secondary))]">
                  <button onClick={() => { const value = !joinLocked; setJoinLocked(value); void saveRoomControls({ join_locked: value }); }} className="btn-secondary-glow py-2">
                    {joinLocked ? 'Liberar entradas' : 'Bloquear novas entradas'}
                  </button>
                  <button onClick={() => { const value = !autoReveal; setAutoReveal(value); void saveRoomControls({ reveal_when_all_answered: value }); }} className="btn-secondary-glow py-2">
                    {autoReveal ? 'Revelar manualmente' : 'Revelar quando todos responderem'}
                  </button>
                </div>
              </div>
            )}

            {/* Controles */}
            <div className="flex justify-between items-center gap-4 pt-4 border-t border-[rgba(255,255,255,0.05)]">
              <button 
                onClick={() => { setScreen(role === 'operator' ? 'operator-dashboard' : 'welcome'); sfx.stopLobby(); sfx.playClick(); }}
                className="btn-secondary-glow"
              >
                Voltar
              </button>
              
              {role === 'operator' ? (
                <button 
                  onClick={handleStartMatch}
                  className="btn-glow px-8"
                  disabled={activePlayers.length === 0}
                  style={{ opacity: activePlayers.length === 0 ? 0.6 : 1 }}
                >
                  <Play className="w-4 h-4" /> Iniciar Partida
                </button>
              ) : (
                <div className="text-xs text-[hsl(var(--text-secondary))] font-medium flex items-center gap-2">
                  <span className="w-2 h-2 bg-[hsl(var(--primary))] rounded-full animate-ping" />
                  Aguardando Host iniciar...
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            4. TELA DA PARTIDA ATIVA (GAME SCREEN)
            ========================================== */}
        {screen === 'game-play' && (
          <div className="w-full transition-all duration-500" style={{ maxWidth: '100%', padding: '0 24px' }}>
            {recoveredTransition && ['spinning', 'category-reveal', 'question-reveal'].includes(roundState) &&
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                <span>A apresentação foi interrompida nesta rodada. Continue quando o público estiver pronto.</span>
                <button type="button" className="btn-glow px-4 py-2 text-xs" disabled={hostBusy} onClick={() => void continueRecoveredRound()}>Continuar rodada</button>
              </div>}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" style={{ minHeight: 'calc(100vh - 40px)', alignItems: 'stretch' }}>
            
              {/* LADO ESQUERDO: CONTROLES DO HOST / ROLETAS / TIMER */}
              <div className={`${isLobbyExpanded ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col gap-6 transition-all duration-500`} style={{ minHeight: 0 }}>
                
                {/* STATUS DO JOGO — oculto durante a roleta (vira chips dentro do card para maximizar a projeção) */}
                {!(roundState === 'idle' || roundState === 'spinning') && (
                <div className="glass-card p-4 flex justify-between items-center relative overflow-hidden">
                  <span className="text-xs font-bold text-[hsl(var(--secondary))] uppercase">
                    Rodada {currentRoundIndex} de {gameRounds}
                  </span>

                  {/* Botão de Controle do Lobby Retrátil */}
                  <button
                    onClick={() => { setIsLobbyExpanded(!isLobbyExpanded); sfx.playClick(); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md hover:border-purple-500/30"
                    title={isLobbyExpanded ? "Ocultar lista de jogadores" : "Mostrar lista de jogadores"}
                  >
                    <Users className="w-4 h-4 text-[hsl(var(--primary))]" />
                    {isLobbyExpanded ? 'Recolher Lobby' : 'Expandir Lobby'}
                  </button>

                  <span className="px-3 py-1 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] text-xs font-extrabold rounded-full tracking-wider uppercase">
                    Modo {gameMode === 'duel' ? 'Duelo' : gameMode === 'team' ? 'Times' : 'Aberto'}
                  </span>
                </div>
                )}


              {/* ROLETA DE CATEGORIAS */}
              {roundState === 'idle' || roundState === 'spinning' ? (
                <div style={{ flex: 1, paddingTop: '44px', paddingBottom: '20px', paddingLeft: '24px', paddingRight: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '32px', border: '6px solid rgba(49,46,129,0.8)', position: 'relative', boxShadow: '0 12px 0 rgba(49,46,129,0.8), 0 20px 40px rgba(0,0,0,0.5)', backgroundColor: activeThemeBg, backgroundImage: activeThemeImg, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '350px' }}>

                  {/* Vinheta — escurece as bordas do card para focar a atenção na roda */}
                  <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: '26px',
                    background: 'radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 42%, rgba(0,0,0,0.20) 72%, rgba(0,0,0,0.45) 100%)'
                  }} />

                  {/* Floating Header */}
                  <div style={{ position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ background: 'linear-gradient(to bottom, #8b5cf6, #6d28d9)', border: '4px solid #4c1d95', borderRadius: '9999px', padding: '12px 32px', boxShadow: '0 6px 0 rgba(76,29,149,1)' }}>
                      <h3 style={{ fontSize: '24px', fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0, lineHeight: 1, textShadow: '0 2px 2px rgba(0,0,0,0.5)' }}>
                        Roleta das Categorias
                      </h3>
                    </div>
                  </div>

                  {/* Chips de status (substituem a barra superior durante a roleta) */}
                  <span style={{ position: 'absolute', top: 14, left: 20, zIndex: 10, fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.85)', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '6px 14px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Rodada {currentRoundIndex} de {gameRounds}
                  </span>
                  <div style={{ position: 'absolute', top: 14, right: 20, zIndex: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.85)', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '6px 14px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Modo {gameMode === 'duel' ? 'Duelo' : gameMode === 'team' ? 'Times' : 'Aberto'}
                    </span>
                    <button
                      onClick={() => { setIsLobbyExpanded(!isLobbyExpanded); sfx.playClick(); }}
                      title={isLobbyExpanded ? "Ocultar lista de jogadores" : "Mostrar lista de jogadores"}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: 'white', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '6px 14px', cursor: 'pointer' }}
                    >
                      <Users className="w-4 h-4 text-[hsl(var(--primary))]" />
                      {isLobbyExpanded ? 'Recolher' : 'Lobby'}
                    </button>
                  </div>

                  {/* ===== ROLETA PREMIUM ===== */}
                  <div style={{ position: 'relative', width: `${wheelSize}px`, height: `${wheelSize}px`, margin: '0 auto', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1), height 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}>

                    {/* Glow ambiente atrás da roda — foco cinematográfico */}
                    <div style={{
                      position: 'absolute', inset: `-${Math.round(wheelSize * 0.14)}px`,
                      borderRadius: '50%', pointerEvents: 'none',
                      background: 'radial-gradient(circle, rgba(139,92,246,0.38) 0%, rgba(139,92,246,0.16) 45%, rgba(139,92,246,0) 72%)',
                      filter: 'blur(10px)'
                    }} />

                    {/* Ponteiro "flipper" realista — parado em repouso, bate nos pinos apenas durante o giro */}
                    {(() => {
                      const pW = Math.round(Math.max(48, wheelSize * 0.095));
                      const pH = Math.round(pW * 0.58);
                      return (
                        <div style={{
                          position: 'absolute',
                          right: `-${Math.round(pW * 0.32)}px`,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          transformOrigin: `${pW - pH * 0.28}px 50%`, // gira em torno do eixo (parafuso)
                          zIndex: 30,
                          filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.45))',
                          animation: isSpinning
                            ? (pinDuration ? `pointer-strike ${pinDuration}s linear infinite` : 'none')
                            : 'none'
                        }}>
                          <svg width={pW} height={pH} viewBox="0 0 48 28">
                            <defs>
                              <linearGradient id="pinBody" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor="#c8f57a" />
                                <stop offset="0.45" stopColor="#84cc16" />
                                <stop offset="1" stopColor="#3f6212" />
                              </linearGradient>
                              <radialGradient id="pinHub" cx="0.35" cy="0.3" r="1">
                                <stop offset="0" stopColor="#ffffff" />
                                <stop offset="0.5" stopColor="#c9ced6" />
                                <stop offset="1" stopColor="#5b6472" />
                              </radialGradient>
                            </defs>
                            {/* Corpo do ponteiro (gota apontando para a roda) */}
                            <path d="M2 14 L36 3.5 Q43 6 43 14 Q43 22 36 24.5 Z"
                              fill="url(#pinBody)" stroke="#2c400b" strokeWidth="1.4" strokeLinejoin="round" />
                            {/* Reflexo especular no dorso */}
                            <path d="M6 12.6 L35 5.5 Q39 7 40.2 10.5 L7.5 14 Z" fill="rgba(255,255,255,0.32)" />
                            {/* Eixo metálico (parafuso) */}
                            <circle cx="36.5" cy="14" r="6" fill="url(#pinHub)" stroke="#3f4753" strokeWidth="1.2" />
                            <circle cx="34.8" cy="12.2" r="1.8" fill="rgba(255,255,255,0.85)" />
                          </svg>
                        </div>
                      );
                    })()}

                    {/* Disco Giratório com Conic Gradient — arraste e solte para arremessar */}
                    <div
                      onPointerDown={handleWheelPointerDown}
                      onPointerMove={handleWheelPointerMove}
                      onPointerUp={handleWheelPointerUp}
                      onPointerCancel={handleWheelPointerUp}
                      style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      border: '6px solid white',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                      touchAction: 'none',
                      cursor: (role === 'operator' && roundState === 'idle' && !isSpinning) ? 'grab' : 'default',
                      transform: `rotate(${rouletteAngle}deg)`,
                      transition: isSpinning ? 'transform 8s cubic-bezier(0.1, 0.9, 0.2, 1)' : 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1), height 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                      background: wheelCategories.length > 0
                        ? `conic-gradient(${wheelCategories.map((c, i, arr) => `${c.displayColor} ${i * (360 / arr.length)}deg ${(i + 1) * (360 / arr.length)}deg`).join(', ')})`
                        : '#555',
                      overflow: 'hidden',
                      userSelect: 'none'
                    }}>
                      {/* Margens (Linhas Brancas) */}
                      {wheelCategories.map((cat, i, arr) => {
                        const angle = i * (360 / arr.length);
                        return (
                          <div key={`sep-${cat.id}`} style={{
                            position: 'absolute',
                            top: `calc(50% - 2px)`,
                            left: '50%',
                            width: `${wheelSize / 2}px`,
                            height: '4px',
                            backgroundColor: 'white',
                            transformOrigin: '0% 50%',
                            transform: `rotate(${angle - 90}deg)`
                          }} />
                        );
                      })}

                      {/* Textos radiais dentro do disco */}
                      {wheelCategories.map((cat, i, arr) => {
                        const angle = i * (360 / arr.length) + (180 / arr.length) - 90;
                        return (
                          <div key={cat.id} style={{
                            position: 'absolute',
                            top: `calc(50% - ${textBoxHeight / 2}px)`,
                            left: '50%',
                            width: `${textBoxWidth}px`,
                            height: `${textBoxHeight}px`,
                            transformOrigin: '0% 50%',
                            transform: `rotate(${angle}deg) translateX(${innerTranslate}px)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start', // todos os textos começam a partir do centro
                            paddingLeft: '6px',
                            overflow: 'hidden', // garante que o texto nunca invada o aro externo
                            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}>
                            <span style={{
                              fontSize: fontSize,
                              fontWeight: '800',
                              color: 'white',
                              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                              letterSpacing: '0.02em',
                              whiteSpace: 'nowrap',
                              transition: 'font-size 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}>
                              {cat.name}
                            </span>
                          </div>
                        );
                      })}

                      {/* Fatia vencedora "acesa" — pisca enquanto a roleta parada exibe o resultado */}
                      {!isSpinning && roundState === 'spinning' && selectedCategory && (() => {
                        const n = wheelCategories.length;
                        const idx = wheelCategories.findIndex(c => c.id === selectedCategory.id);
                        if (idx < 0 || n === 0) return null;
                        const start = idx * (360 / n);
                        const end = (idx + 1) * (360 / n);
                        return (
                          <div className="slice-win" style={{
                            position: 'absolute', inset: 0, borderRadius: '50%',
                            pointerEvents: 'none',
                            background: `conic-gradient(transparent 0deg ${start}deg, rgba(255,255,255,0.55) ${start}deg ${end}deg, transparent ${end}deg 360deg)`,
                            mixBlendMode: 'screen'
                          }} />
                        );
                      })()}

                      {/* Aro externo dedicado — moldura escura que emoldura as fatias e abriga os LEDs */}
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        border: `${rimWidth}px solid rgba(22,17,48,0.95)`,
                        boxShadow: 'inset 0 0 12px rgba(0,0,0,0.7), inset 0 2px 3px rgba(255,255,255,0.08)',
                        pointerEvents: 'none'
                      }} />

                      {/* Pontos luminosos no aro — marquee estilo game show (escala com a roda, luzes correndo) */}
                      {(() => {
                        const dotCount = 48;
                        const dotSize = Math.round(Math.max(8, wheelSize * 0.014));
                        const ledRadius = wheelSize / 2 - rimWidth / 2; // centro exato do aro
                        return Array.from({ length: dotCount }).map((_, i) => {
                          const a = (i * (360 / dotCount)) * (Math.PI / 180);
                          return (
                            <div key={`dot-${i}`} className="led-dot" style={{
                              position: 'absolute',
                              top: `calc(50% + ${Math.sin(a) * ledRadius}px)`,
                              left: `calc(50% + ${Math.cos(a) * ledRadius}px)`,
                              width: `${dotSize}px`,
                              height: `${dotSize}px`,
                              borderRadius: '50%',
                              backgroundColor: 'rgba(120,90,20,0.55)',
                              transform: 'translate(-50%, -50%)',
                              animationDelay: `${(i / dotCount) * 1.2}s`
                            }} />
                          );
                        });
                      })()}
                    </div>

                    {/* Camada de profundidade — vinheta radial + brilho especular fixo (não gira; funciona sobre qualquer cor de categoria) */}
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      zIndex: 15, pointerEvents: 'none',
                      background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 40%, rgba(0,0,0,0.10) 68%, rgba(0,0,0,0.28) 100%)'
                    }} />
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      zIndex: 15, pointerEvents: 'none',
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 22%, rgba(255,255,255,0) 45%)'
                    }} />

                    {/* Botão Central (Rodar) */}
                    <button 
                      onClick={role === 'operator' && roundState === 'idle' ? () => handleSpinRoulette() : undefined}
                      disabled={isSpinning || role !== 'operator' || roundState !== 'idle'}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: `${wheelSize * 0.18}px`,
                        height: `${wheelSize * 0.18}px`,
                        borderRadius: '50%',
                        background: 'linear-gradient(to bottom, #3b82f6, #1d4ed8)',
                        border: '4px solid #1e40af',
                        zIndex: 20,
                        boxShadow: '0 6px 0 #1e3a8a, inset 0 2px 4px rgba(255,255,255,0.3), 0 10px 20px rgba(0,0,0,0.5)',
                        transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1), height 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: (role === 'operator' && roundState === 'idle' && !isSpinning) ? 'pointer' : 'default',
                        opacity: (role === 'operator' && roundState === 'idle') || isSpinning ? 1 : 0.8
                      }}
                      onMouseEnter={(e) => {
                        if (role === 'operator' && roundState === 'idle' && !isSpinning) {
                          e.currentTarget.style.filter = 'brightness(1.1)';
                        }
                      }}
                      onMouseDown={(e) => {
                        if (role === 'operator' && roundState === 'idle' && !isSpinning) {
                          e.currentTarget.style.transform = 'translate(-50%, calc(-50% + 6px))';
                          e.currentTarget.style.boxShadow = '0 0px 0 #1e3a8a, inset 0 2px 4px rgba(255,255,255,0.3), 0 4px 10px rgba(0,0,0,0.5)';
                        }
                      }}
                      onMouseUp={(e) => {
                        if (role === 'operator' && roundState === 'idle' && !isSpinning) {
                          e.currentTarget.style.transform = 'translate(-50%, -50%)';
                          e.currentTarget.style.boxShadow = '0 6px 0 #1e3a8a, inset 0 2px 4px rgba(255,255,255,0.3), 0 10px 20px rgba(0,0,0,0.5)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translate(-50%, -50%)';
                        e.currentTarget.style.boxShadow = '0 6px 0 #1e3a8a, inset 0 2px 4px rgba(255,255,255,0.3), 0 10px 20px rgba(0,0,0,0.5)';
                        e.currentTarget.style.filter = 'none';
                      }}
                    >
                      <svg width={isLobbyExpanded ? "16" : "28"} height={isLobbyExpanded ? "16" : "28"} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '2px' }}>
                        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
                        <path d="M13 13l6 6"/>
                      </svg>
                      <span style={{ color: 'white', fontWeight: 900, fontSize: isLobbyExpanded ? '12px' : '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Rodar
                      </span>
                    </button>
                  </div>

                  {roundState === 'spinning' && (
                    <div className="text-center font-bold text-[hsl(var(--secondary))] animate-pulse">
                      Escolhendo Categoria...
                    </div>
                  )}
                </div>
              ) : null}

              {/* REVEAL DA CATEGORIA — estado intermediário após a roleta parar */}
              {roundState === 'category-reveal' && selectedCategory && (
                <div
                  className="glass-card p-8 flex flex-col items-center justify-center"
                  style={{
                    minHeight: '300px',
                    border: `1px solid ${selectedCategory.color}55`,
                    boxShadow: `0 0 60px ${selectedCategory.color}30`,
                    animation: 'slideUpModal 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}
                >
                  {/* Glow de cor da categoria */}
                  <div style={{
                    position: 'absolute', width: '200px', height: '200px', borderRadius: '50%',
                    background: `radial-gradient(circle, ${selectedCategory.color}40 0%, transparent 70%)`,
                    filter: 'blur(40px)', pointerEvents: 'none'
                  }} />

                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', position: 'relative' }}>
                    {/* Ícone pulsando com a cor da categoria */}
                    <div style={{
                      width: '80px', height: '80px', borderRadius: '24px',
                      background: `linear-gradient(135deg, ${selectedCategory.color}cc, ${selectedCategory.color}66)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 8px 32px ${selectedCategory.color}60`,
                      animation: 'bounce-gentle 0.8s ease infinite'
                    }}>
                      <Trophy style={{ width: '40px', height: '40px', color: 'white' }} />
                    </div>

                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(148,163,184,1)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>
                        Categoria Sorteada
                      </p>
                      <h3 style={{
                        fontSize: '36px', fontWeight: 900,
                        fontFamily: 'Outfit, sans-serif',
                        color: selectedCategory.color,
                        textShadow: `0 0 30px ${selectedCategory.color}80`,
                        lineHeight: 1.1
                      }}>
                        {selectedCategory.name}
                      </h3>
                    </div>

                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      fontSize: '13px', color: 'rgba(148,163,184,0.8)'
                    }}>
                      <span style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: selectedCategory.color,
                        animation: 'animate-pulse 1s infinite'
                      }} />
                      Preparando a pergunta...
                    </div>
                  </div>
                </div>
              )}

              {/* PERGUNTA & CRONÔMETRO */}
              {(roundState === 'question-reveal' || roundState === 'question' || roundState === 'answered') && currentQuestion && (
                <div className="glass-card p-6 flex flex-col gap-6" style={{ flex: 1, minHeight: 0 }}>
                  {/* Categoria Sorteada */}
                  <div className="flex justify-between items-center">
                    <div 
                      className="flex items-center gap-3 px-6 py-2.5 rounded-2xl border transition-all duration-500 hover:scale-105"
                      style={{ 
                        background: `linear-gradient(135deg, rgba(255,255,255,0.03) 0%, ${selectedCategory?.color}15 100%)`,
                        borderColor: `${selectedCategory?.color}40`,
                        boxShadow: `0 8px 32px 0 ${selectedCategory?.color}20, inset 0 1px 0 0 rgba(255,255,255,0.1)`,
                        backdropFilter: 'blur(12px)'
                      }}
                    >
                      {/* Indicador Neon / Pulsante */}
                      <div className="relative flex items-center justify-center w-3 h-3">
                        <div className="absolute w-full h-full rounded-full animate-ping opacity-60" style={{ backgroundColor: selectedCategory?.color }} />
                        <div className="w-2 h-2 rounded-full z-10" style={{ backgroundColor: selectedCategory?.color, boxShadow: `0 0 12px ${selectedCategory?.color}, 0 0 4px #fff` }} />
                      </div>
                      
                      {/* Texto Moderno */}
                      <span 
                        className="text-[11px] font-black tracking-[0.25em] uppercase text-white drop-shadow-md"
                        style={{ textShadow: `0 0 15px ${selectedCategory?.color}` }}
                      >
                        {selectedCategory?.name}
                      </span>
                    </div>

                    {/* Cronômetro Circular Editável */}
                    {roundState !== 'question-reveal' && (
                    <div className="flex items-center gap-3">
                      {role === 'operator' && roundState === 'question' && (
                        <div className="flex gap-1.5">
                          <button disabled={hostBusy} onClick={toggleTimerPause} className="px-2 py-1 rounded text-xs">{pausedRemaining === null ? 'Pausar' : 'Retomar'}</button>
                          <button disabled={hostBusy} onClick={() => adjustTimer(-5)} className="px-2 py-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded font-mono text-[10px] text-red-400 hover:bg-[rgba(255,255,255,0.1)]">-5s</button>
                          <button disabled={hostBusy} onClick={() => adjustTimer(5)} className="px-2 py-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded font-mono text-[10px] text-emerald-400 hover:bg-[rgba(255,255,255,0.1)]">+5s</button>
                        </div>
                      )}
                      
                      <div style={{
                        position: 'relative',
                        width: '72px',
                        height: '72px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.15)',
                        background: 'rgba(255,255,255,0.03)',
                        boxShadow: timeLeft <= 5 ? '0 0 20px rgba(239,68,68,0.4)' : '0 0 12px rgba(124,58,237,0.2)',
                        transition: 'box-shadow 0.3s ease',
                      }}>
                        <Clock style={{ width: 18, height: 18, position: 'absolute', left: 8, top: 8, opacity: 0.35, color: 'hsl(var(--text-secondary))' }} />
                        <span style={{
                          fontFamily: "'Outfit', monospace",
                          fontWeight: 800,
                          fontSize: '24px',
                          color: timeLeft <= 5 ? '#f87171' : 'hsl(var(--secondary))',
                          transition: 'color 0.3s ease',
                        }}>
                          {timeLeft}s
                        </span>
                      </div>
                    </div>
                    )}
                  </div>

                  {/* Enunciado Premium Destacado */}
                  <div className={`p-6 md:p-12 rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] shadow-inner backdrop-blur-sm relative overflow-hidden transition-all duration-500 ${roundState === 'question-reveal' ? 'my-auto flex-1 flex flex-col justify-center' : ''}`}>
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    <h3 
                      className={`font-extrabold text-white text-center drop-shadow-[0_2px_8px_rgba(124,58,237,0.25)] select-none transition-all duration-500 ${roundState === 'question-reveal' ? '' : 'text-3xl md:text-4xl leading-relaxed'}`}
                      style={{ 
                        fontSize: roundState === 'question-reveal' ? '60px' : undefined,
                        lineHeight: roundState === 'question-reveal' ? '1.2' : undefined,
                        padding: roundState === 'question-reveal' ? '0 3rem' : undefined,
                        width: '100%'
                      }}
                    >
                      {currentQuestion.question_text}
                    </h3>
                  </div>

                  {/* Alternativas — Estilo Kahoot com cores vibrantes */}
                  {roundState !== 'question-reveal' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '16px', flex: 1, minHeight: 0 }}>
                    {currentQuestion.alternatives.map((alt, index) => {
                      const isSelectedBySelf = playerAnswered === alt.text;
                      const showAnswers = roundState === 'answered';
                      const isCorrectAnswer = alt.isCorrect;
                      const theme = KAHOOT_THEMES[index] || KAHOOT_THEMES[0];
                      
                      // Estilo base com gradiente inline
                      let btnStyle: React.CSSProperties = {
                        background: theme.gradient,
                        color: 'white',
                        border: '3px solid transparent',
                        borderRadius: '16px',
                        padding: '24px 20px',
                        cursor: role === 'player' && !showAnswers && !playerAnswered ? 'pointer' : 'default',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        textAlign: 'left' as const,
                        fontWeight: 700,
                        fontSize: '18px',
                        lineHeight: 1.4,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: `0 6px 20px ${theme.shadow}`,
                        width: '100%',
                        minHeight: '100px',
                        flex: 1,
                        opacity: 1,
                        transform: 'scale(1)',
                        filter: 'none',
                        fontFamily: "'Plus Jakarta Sans', 'Outfit', sans-serif",
                      };

                      // Jogador selecionou esta alternativa
                      if (role === 'player' && !showAnswers && isSelectedBySelf) {
                        btnStyle = {
                          ...btnStyle,
                          border: '3px solid white',
                          boxShadow: `0 0 25px white, 0 6px 20px ${theme.shadow}`,
                          transform: 'scale(1.03)',
                        };
                      }

                      // Revelação da resposta
                      if (showAnswers) {
                        if (isCorrectAnswer) {
                          btnStyle = {
                            ...btnStyle,
                            border: '3px solid #48BB78',
                            boxShadow: `0 0 30px ${theme.shadow}, 0 0 15px rgba(72, 187, 120, 0.5)`,
                            transform: 'scale(1.02)',
                          };
                        } else {
                          btnStyle = {
                            ...btnStyle,
                            opacity: 0.25,
                            filter: 'saturate(0.4)',
                            transform: 'scale(0.97)',
                            cursor: 'default',
                            pointerEvents: 'none',
                          };
                        }
                      }

                      return (
                        <button
                          key={index}
                          disabled={role !== 'player' || showAnswers || playerAnswered !== null}
                          onClick={() => handlePlayerAnswer(index)}
                          style={btnStyle}
                          onMouseEnter={(e) => {
                            if (role === 'player' && !showAnswers && !playerAnswered) {
                              e.currentTarget.style.transform = 'scale(1.03)';
                              e.currentTarget.style.boxShadow = `0 8px 28px ${theme.shadow}`;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (role === 'player' && !showAnswers && !isSelectedBySelf) {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.boxShadow = `0 6px 20px ${theme.shadow}`;
                            }
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <span style={{
                              fontSize: '28px',
                              fontWeight: 900,
                              userSelect: 'none',
                              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                              lineHeight: 1,
                            }}>{theme.icon}</span>
                            <span style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>{alt.text}</span>
                          </div>
                          
                          {showAnswers && isCorrectAnswer && (
                            <CheckCircle style={{ width: 28, height: 28, color: 'white', flexShrink: 0, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                          )}
                          {showAnswers && !isCorrectAnswer && isSelectedBySelf && (
                            <XCircle style={{ width: 28, height: 28, color: 'white', flexShrink: 0, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  )}
                  {/* Painel de Respostas dos Competidores (Visível apenas para o Host/Operador) */}
                  {role === 'operator' && roundState !== 'question-reveal' && (
                    <div className="mt-4 p-5 rounded-2xl border border-[rgba(255,255,255,0.04)] bg-white/5 flex flex-col gap-4 transition-all duration-300">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-[hsl(var(--text-secondary))] uppercase tracking-wider">
                            Respostas Coletadas: <span className="font-mono text-sm text-[hsl(var(--accent))]">{totalAnswered} / {activePlayers.length}</span>
                          </h4>
                          
                          {/* Botão retrátil para o gráfico de votos */}
                          <button
                            onClick={() => { setIsAnswersPanelExpanded(!isAnswersPanelExpanded); sfx.playClick(); }}
                            className="ml-3 text-[10px] font-bold bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded border border-white/5 text-[hsl(var(--text-secondary))] hover:text-white transition-all"
                            title={isAnswersPanelExpanded ? "Ocultar gráfico de respostas" : "Mostrar gráfico de respostas"}
                          >
                            {isAnswersPanelExpanded ? 'Recolher' : 'Expandir'}
                          </button>
                        </div>
                        
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full animate-pulse">
                          Realtime ativo
                        </span>
                      </div>
                      
                      {isAnswersPanelExpanded && (
                        <div className="grid grid-cols-4 gap-3 animate-fade-in">
                          {ANSWER_COLORS.map((col, idx) => {
                            const count = roomAnswers[idx] || 0;
                            const pct = totalAnswered > 0 ? Math.round((count / totalAnswered) * 100) : 0;
                            return (
                              <div 
                                key={idx} 
                                className="flex flex-col items-center gap-2.5 p-4 rounded-xl relative overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                                  border: '1px solid rgba(255,255,255,0.04)',
                                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 0 4px 12px rgba(0,0,0,0.15)'
                                }}
                              >
                                {/* Emblema com Letra em Cores Vibrantes */}
                                <div 
                                  className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shadow-md animate-bounce-gentle" 
                                  style={{ 
                                    backgroundColor: col.bg, 
                                    color: '#fff', 
                                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                    boxShadow: `0 4px 10px ${col.bg}40`
                                  }}
                                >
                                  {['A', 'B', 'C', 'D'][idx]}
                                </div>
                                
                                {/* Contador de Votos */}
                                <div className="flex flex-col items-center mt-1">
                                  <span className="text-2xl font-extrabold text-white leading-none">{count}</span>
                                  <span className="text-[9px] font-bold text-[hsl(var(--text-muted))] uppercase mt-1 tracking-wider">votos</span>
                                </div>

                                {/* Percentagem em Badge Estilizado */}
                                <span 
                                  className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-white/5 border border-white/5 mt-0.5" 
                                  style={{ color: col.bg }}
                                >
                                  {pct}%
                                </span>

                                {/* Barra de Progresso com Brilho Sutil */}
                                <div 
                                  style={{ 
                                    position: 'absolute', bottom: 0, left: 0, right: 0, 
                                    height: '4px', backgroundColor: col.bg,
                                    width: `${pct}%`, transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: `0 -1px 8px ${col.bg}`
                                  }} 
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {roundState === 'answered' && currentQuestion?.explanation && (
                    <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-4 text-sm text-violet-100">
                      <strong>Explicação:</strong> {currentQuestion.explanation}
                      {currentQuestion.reference_url?.match(/^https?:\/\//i) && <a href={currentQuestion.reference_url} target="_blank" rel="noopener noreferrer" className="block mt-2 text-sky-300 underline">Ver referência</a>}
                    </div>
                  )}

                  {/* Ações do Organizador na Pergunta */}
                  {role === 'operator' && (
                    <div className="flex justify-end gap-3 pt-3 border-t border-[rgba(255,255,255,0.05)]">
                      {roundState === 'question' && (
                        <button 
                          onClick={revealAnswer}
                          className="btn-glow bg-amber-500/90 hover:bg-amber-500"
                        >
                          Revelar Resposta
                        </button>
                      )}
                      
                      {roundState === 'answered' && (
                        <button 
                          onClick={handleGoToRanking}
                          className="btn-glow"
                        >
                          Ver Placar da Rodada
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Aviso ao Jogador */}
                  {role === 'player' && playerAnswered && roundState === 'question' && (
                    <div className="text-center text-xs text-[hsl(var(--text-muted))] animate-pulse">
                      Resposta enviada! Aguardando o tempo acabar...
                    </div>
                  )}
                </div>
              )}

              {/* PLACAR PARCIAL / LEADERBOARD DA RODADA */}
              {roundState === 'ranking' && (
                <div style={{ width: '100%', maxWidth: '720px', margin: '24px auto 0', position: 'relative' }}>

                  {gameMode === 'team' && sortedTeams.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {sortedTeams.map(([name, score], index) => (
                        <div key={name} className="p-4 rounded-xl border border-purple-400/30 bg-purple-500/10 flex justify-between items-center">
                          <span className="font-bold text-white">{index + 1}º {name}</span>
                          <span className="font-mono text-xl font-black text-amber-300">{score}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Main Board Container — estilo premium adaptável */}
                  <div style={{
                    padding: '28px',
                    display: 'flex', flexDirection: 'column', gap: '20px',
                    borderRadius: '24px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    position: 'relative',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
                    background: 'linear-gradient(160deg, rgba(30,22,60,0.95), rgba(15,12,32,0.98))',
                    overflow: 'hidden'
                  }}>
                    {/* Brilho decorativo */}
                    <div style={{ position: 'absolute', top: '-60px', right: '-40px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(251,191,36,0.12), transparent 70%)', pointerEvents: 'none' }} />

                    {/* Header interno — título + rodada */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #fbbf24, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(251,191,36,0.35)' }}>
                          <Trophy style={{ width: '24px', height: '24px', color: 'white' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(251,191,36,0.9)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                            Classificação
                          </span>
                          <h3 style={{ fontSize: '24px', fontWeight: 900, color: 'white', margin: 0, lineHeight: 1.1, letterSpacing: '-0.01em' }}>
                            Placar Parcial
                          </h3>
                        </div>
                      </div>
                      <div style={{ padding: '6px 14px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                          Rodada {currentRoundIndex} de {gameRounds}
                        </span>
                      </div>
                    </div>

                    <div style={{ position: 'relative', height: `${rankingPlayers.length * 72}px`, width: '100%', zIndex: 10 }}>
                      <AnimatePresence>
                        {rankingPlayers.map((p, idx) => {
                          const isLeader = idx === 0;
                          // Cores das medalhas para o Top 3
                          let badgeBg = 'rgba(255,255,255,0.08)'; let badgeColor = 'rgba(255,255,255,0.6)';
                          if (idx === 0) { badgeBg = 'linear-gradient(135deg, #fbbf24, #d97706)'; badgeColor = 'white'; }
                          else if (idx === 1) { badgeBg = 'linear-gradient(135deg, #cbd5e1, #94a3b8)'; badgeColor = 'white'; }
                          else if (idx === 2) { badgeBg = 'linear-gradient(135deg, #fb923c, #ea580c)'; badgeColor = 'white'; }

                          // Movimento de posição vs. placar anterior (positivo = subiu)
                          const movement = showNewScores ? ((prevPosById.get(p.id) ?? idx) - idx) : 0;

                          return (
                            <motion.div
                              key={p.id}
                              initial={false} /* placar antigo entra estático; só a revelação anima */
                              animate={{
                                opacity: 1, x: 0, y: idx * 72,
                                rotate: movement !== 0 ? [0, movement > 0 ? -2 : 2, movement > 0 ? 1 : -1, 0] : 0
                              }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{
                                y: { type: "spring", stiffness: 40, damping: 11 },
                                opacity: { duration: 0.2 },
                                x: { type: "spring", stiffness: 300, damping: 25 },
                                rotate: { duration: 0.9, delay: 0.3 }
                              }}
                              style={{
                                position: 'absolute',
                                top: 0, left: 0, width: '100%', height: '60px',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                background: isLeader ? 'linear-gradient(90deg, rgba(251,191,36,0.14), rgba(255,255,255,0.04))' : 'rgba(255,255,255,0.04)',
                                border: isLeader ? '1px solid rgba(251,191,36,0.4)' : '1px solid rgba(255,255,255,0.07)',
                                borderRadius: '14px',
                                padding: '0 16px',
                                boxShadow: isLeader ? '0 0 24px rgba(251,191,36,0.15)' : 'none',
                                zIndex: sortedPlayers.length - idx
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                {/* Rank Badge */}
                                <motion.div
                                  layout
                                  style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '16px', color: badgeColor, background: badgeBg, flexShrink: 0 }}
                                >
                                  {idx + 1}
                                </motion.div>

                                {/* Avatar */}
                                <img
                                  src={getAvatarUrl(p.nickname)}
                                  alt=""
                                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: isLeader ? '2px solid rgba(251,191,36,0.7)' : '2px solid rgba(255,255,255,0.12)', background: '#0d1326', flexShrink: 0 }}
                                />

                                {/* Player Name */}
                                <span style={{ fontWeight: 700, fontSize: '18px', color: 'white', letterSpacing: '0.01em' }}>
                                  {p.nickname}
                                </span>

                                {/* Emoji bem-humorado de mudança de posição */}
                                {movement !== 0 && (
                                  <motion.span
                                    initial={{ scale: 0, rotate: movement > 0 ? -45 : 45 }}
                                    animate={{ scale: [0, 1.6, 1], rotate: 0 }}
                                    transition={{ delay: 0.5, duration: 0.6, times: [0, 0.6, 1] }}
                                    style={{ fontSize: '22px', lineHeight: 1 }}
                                    title={movement > 0 ? `Subiu ${movement} posição(ões)!` : `Caiu ${-movement} posição(ões)...`}
                                  >
                                    {movement > 0 ? '🚀' : '🫠'}
                                  </motion.span>
                                )}
                              </div>

                              {/* Score Pill com Animação de Pop quando os pontos mudam */}
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                                <motion.div
                                  key={p.score}
                                  initial={showNewScores ? { y: -20, opacity: 0, color: '#34d399', scale: 1.5 } : false}
                                  animate={{ y: 0, opacity: 1, color: isLeader ? '#fbbf24' : '#ffffff', scale: 1 }}
                                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                                  style={{ fontFamily: "'Outfit', monospace", fontSize: '26px', fontWeight: 900, lineHeight: 1 }}
                                >
                                  {p.score}
                                </motion.div>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>pts</span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
            </div>

            {role === 'operator' && <div className="rounded-xl border border-pink-400/30 bg-pink-500/10 p-4 flex flex-wrap items-center justify-between gap-3 text-sm text-pink-100">
              <span>Abra ou recupere a projeção em outra janela.</span>
              <button type="button" onClick={() => window.open(spectatorLink, '_blank', 'noopener,noreferrer')} className="btn-glow px-4 py-2 text-xs">Abrir tela do público</button>
            </div>}

            {role === 'operator' && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', position: 'relative', zIndex: 10 }}>
                        <button
                          onClick={handleNextRound}
                          className="group w-full flex items-center justify-center gap-2 text-white font-bold transition-all active:scale-[0.98]"
                          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '14px 32px', borderRadius: '14px', boxShadow: '0 8px 24px rgba(5,150,105,0.35)', cursor: 'pointer' }}
                          onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.08)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
                        >
                          {currentRoundIndex < gameRounds ? 'Avançar Rodada' : 'Ver Vencedores'}
                          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <button
                          onClick={() => setShowStatsModal(true)}
                          className="text-xs font-semibold text-white/50 hover:text-white/90 transition-colors flex items-center gap-1.5"
                        >
                          <FileText className="w-4 h-4" /> Relatório Estatístico
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* LADO DIREITO: LATERAL INFO / JOGADORES NA PARTIDA */}
            {isLobbyExpanded && (
              <div className="lg:col-span-4 glass-card p-6 flex flex-col gap-4 h-fit animate-fade-in">
                <h3 className="text-md font-bold border-b border-[rgba(255,255,255,0.05)] pb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[hsl(var(--primary))]" />
                  Lobby Ativo ({activePlayers.length}) · {onlineCount} online · {totalAnswered} responderam
                </h3>
                
                <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                  {activePlayers.map(p => (
                    <div key={p.id} className="flex justify-between items-center p-2.5 bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.03)] rounded-lg">
                      <span className="text-xs font-semibold text-[hsl(var(--text-secondary))] truncate"><span className={onlinePlayerIds.includes(p.id) ? 'text-emerald-400' : 'text-slate-500'}>●</span> {p.nickname}</span>
                      <span className="text-xs font-mono font-bold text-[hsl(var(--text-muted))]">{p.score} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            </div>
          </div>
        )}

        {/* ==========================================
            5. O PÓDIO DE CAMPEÕES (PODIUM)
            ========================================== */}
        {screen === 'podium' && (
          <div style={{ width: '100%', maxWidth: '850px', margin: '60px auto 0', position: 'relative' }}>
            
            {/* Floating Header */}
            <div style={{ position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Crown style={{ width: '64px', height: '64px', color: '#fbbf24', marginBottom: '-15px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
              <div style={{ background: 'linear-gradient(to bottom, #fbbf24, #d97706)', border: '4px solid #92400e', borderRadius: '9999px', padding: '16px 48px', boxShadow: '0 6px 0 rgba(146,64,14,1)' }}>
                <h2 style={{ fontSize: '36px', fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0, lineHeight: 1, textShadow: '0 2px 2px rgba(0,0,0,0.5)' }}>
                  Vencedores
                </h2>
              </div>
            </div>

            {/* Main Board Container */}
            <div style={{ borderRadius: '32px', border: '6px solid rgba(49,46,129,0.8)', position: 'relative', boxShadow: '0 12px 0 rgba(49,46,129,0.8), 0 20px 40px rgba(0,0,0,0.5)', backgroundColor: '#2a1b54', overflow: 'hidden', paddingTop: '60px', paddingBottom: '30px' }}>
              
              {/* Cortinas de Suspense */}
              <div 
                style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '50%', backgroundColor: '#0f172a', zIndex: 50, transition: 'transform 1s ease-in-out', borderRight: '2px solid rgba(245,158,11,0.2)', boxShadow: '10px 0 30px rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyItems: 'flex-end', justifyContent: 'flex-end', paddingRight: '16px', transform: podiumStep >= 1 ? 'translateX(-100%)' : 'translateX(0)' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: 'rgba(245,158,11,0.5)' }}>
                  {[...Array(3)].map((_, i) => <Sparkles key={i} style={{ width: '32px', height: '32px', animation: 'pulse-opac 1.5s infinite' }} />)}
                </div>
              </div>
              <div 
                style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '50%', backgroundColor: '#0f172a', zIndex: 50, transition: 'transform 1s ease-in-out', borderLeft: '2px solid rgba(245,158,11,0.2)', boxShadow: '-10px 0 30px rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyItems: 'flex-start', justifyContent: 'flex-start', paddingLeft: '16px', transform: podiumStep >= 1 ? 'translateX(100%)' : 'translateX(0)' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: 'rgba(245,158,11,0.5)' }}>
                  {[...Array(3)].map((_, i) => <Sparkles key={i} style={{ width: '32px', height: '32px', animation: 'pulse-opac 1.5s infinite' }} />)}
                </div>
              </div>

              {/* Raios de luz e celebração */}
              <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '384px', height: '384px', background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none' }} />

              <div style={{ opacity: podiumStep >= 1 ? 1 : 0, transition: 'opacity 0.7s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 24px' }}>
                
                {/* PÓDIO 3D REAL-TIME */}
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: '16px', marginTop: '20px', minHeight: '350px', width: '100%', opacity: podiumStep >= 1 ? 1 : 0, transition: 'opacity 0.7s ease' }}>
                  
                  {/* 2º LUGAR — pedestal visível desde a abertura, jogador revelado no passo 3 */}
                  {secondPlace && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px', opacity: podiumStep >= 3 ? 1 : 0, transform: podiumStep >= 3 ? 'translateY(0)' : 'translateY(30px)', transition: 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '4px solid #94a3b8', boxShadow: '0 8px 16px rgba(0,0,0,0.3)', marginBottom: '12px', position: 'relative' }}>
                          <img src={getAvatarUrl(secondPlace.nickname)} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: '#0d1326' }} />
                          <div style={{ position: 'absolute', bottom: '-6px', right: '-6px', width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#94a3b8', border: '2px solid #475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '14px', color: 'white' }}>2</div>
                        </div>
                        <span style={{ fontWeight: 900, fontSize: '20px', color: 'white', textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.5)', textAlign: 'center', wordBreak: 'break-word' }}>{secondPlace.nickname}</span>
                      </div>
                      <div style={{ width: '100%', height: '140px', backgroundColor: '#334155', border: '4px solid #1e293b', borderBottom: 'none', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 4px 0 rgba(255,255,255,0.1), 0 -8px 24px rgba(0,0,0,0.3)' }}>
                        {podiumStep >= 3 ? (
                          <>
                            <span style={{ fontSize: '36px', fontWeight: 900, color: '#94a3b8', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>2º</span>
                            <ScoreCountUp value={secondPlace.score} duration={1000} style={{ fontSize: '28px', fontFamily: 'monospace', fontWeight: 900, color: '#cbd5e1' }} />
                          </>
                        ) : (
                          <span className="podium-question" style={{ fontSize: '52px', fontWeight: 900, color: 'rgba(203,213,225,0.4)' }}>?</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 1º LUGAR — pedestal dourado no centro do palco; "?" pulsante gera antecipação */}
                  {firstPlace && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1.2, zIndex: 10 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px', opacity: podiumStep >= 4 ? 1 : 0, transform: podiumStep >= 4 ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.5)', transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '4px solid #f59e0b', boxShadow: '0 12px 24px rgba(245,158,11,0.4)', marginBottom: '16px', position: 'relative' }}>
                          <Crown style={{ position: 'absolute', top: '-34px', left: '50%', transform: 'translateX(-50%)', color: '#fbbf24', width: '40px', height: '40px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))', zIndex: 2 }} />
                          <img src={getAvatarUrl(firstPlace.nickname)} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: '#0d1326' }} />
                          <div style={{ position: 'absolute', bottom: '-6px', right: '-6px', width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#f59e0b', border: '2px solid #b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '16px', color: 'white' }}>1</div>
                        </div>
                        <span style={{ fontWeight: 900, fontSize: '24px', color: 'white', textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.5)', textAlign: 'center', wordBreak: 'break-word' }}>{firstPlace.nickname}</span>
                      </div>
                      <div className={podiumStep >= 4 ? 'champion-pedestal' : undefined} style={{ width: '100%', height: '200px', background: 'linear-gradient(to bottom, #d97706, #b45309)', border: '4px solid #78350f', borderBottom: 'none', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 4px 0 rgba(255,255,255,0.2), 0 -8px 32px rgba(245,158,11,0.3)' }}>
                        {podiumStep >= 4 ? (
                          <>
                            <span style={{ fontSize: '56px', fontWeight: 900, color: '#fde68a', textShadow: '0 4px 8px rgba(0,0,0,0.5)' }}>1º</span>
                            <ScoreCountUp value={firstPlace.score} duration={1400} style={{ fontSize: '40px', fontFamily: 'monospace', fontWeight: 900, color: '#fef3c7' }} />
                          </>
                        ) : (
                          <span className="podium-question" style={{ fontSize: '72px', fontWeight: 900, color: 'rgba(253,230,138,0.55)' }}>?</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3º LUGAR — revelado primeiro (passo 2) */}
                  {thirdPlace && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px', opacity: podiumStep >= 2 ? 1 : 0, transform: podiumStep >= 2 ? 'translateY(0)' : 'translateY(30px)', transition: 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '4px solid #ea580c', boxShadow: '0 8px 16px rgba(0,0,0,0.3)', marginBottom: '12px', position: 'relative' }}>
                          <img src={getAvatarUrl(thirdPlace.nickname)} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: '#0d1326' }} />
                          <div style={{ position: 'absolute', bottom: '-6px', right: '-6px', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#ea580c', border: '2px solid #9a3412', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '13px', color: 'white' }}>3</div>
                        </div>
                        <span style={{ fontWeight: 900, fontSize: '18px', color: 'white', textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.5)', textAlign: 'center', wordBreak: 'break-word' }}>{thirdPlace.nickname}</span>
                      </div>
                      <div style={{ width: '100%', height: '110px', backgroundColor: '#7c2d12', border: '4px solid #431407', borderBottom: 'none', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 4px 0 rgba(255,255,255,0.1), 0 -8px 24px rgba(0,0,0,0.3)' }}>
                        {podiumStep >= 2 ? (
                          <>
                            <span style={{ fontSize: '32px', fontWeight: 900, color: '#fdba74', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>3º</span>
                            <ScoreCountUp value={thirdPlace.score} duration={900} style={{ fontSize: '24px', fontFamily: 'monospace', fontWeight: 900, color: '#ffedd5' }} />
                          </>
                        ) : (
                          <span className="podium-question" style={{ fontSize: '44px', fontWeight: 900, color: 'rgba(255,237,213,0.4)' }}>?</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Com apenas 2 jogadores: espaçador mantém o campeão no centro do palco */}
                  {secondPlace && !thirdPlace && <div style={{ flex: 1 }} />}

                </div>

                {/* Ações — só aparecem após a revelação do campeão, para não vazar o suspense */}
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '32px', paddingTop: '32px', borderTop: '4px solid rgba(255,255,255,0.05)', opacity: podiumStep >= 4 ? 1 : 0, pointerEvents: podiumStep >= 4 ? 'auto' : 'none', transition: 'opacity 0.6s ease 1s' }}>
                  <button 
                    onClick={() => {
                      setScreen('operator-dashboard');
                      setPodiumStep(0);
                      setRoundState('idle');
                      setActivePlayers([]);
                      setSelectedCategory(null);
                      setCurrentQuestion(null);
                      sfx.stopLobby();
                      sfx.playClick();
                    }}
                    style={{ background: 'linear-gradient(to bottom, #ec4899, #be185d)', border: '4px solid #831843', color: 'white', fontWeight: 900, fontSize: '20px', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '16px 32px', borderRadius: '16px', boxShadow: '0 6px 0 rgba(131,24,67,1)', cursor: 'pointer', transition: 'all 0.1s ease', display: 'flex', alignItems: 'center', gap: '12px' }}
                    onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.1)'; }}
                    onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(6px)'; e.currentTarget.style.boxShadow = 'none'; }}
                    onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 0 rgba(131,24,67,1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 0 rgba(131,24,67,1)'; e.currentTarget.style.filter = 'none'; }}
                  >
                    <RotateCcw style={{ width: '24px', height: '24px' }} /> Jogar Novamente
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* FOOTER — oculto durante game-play fullscreen */}
      <footer className="text-center py-4 border-t border-[hsl(var(--border-color))] mt-6 text-xs text-[hsl(var(--text-muted))] flex flex-col sm:flex-row justify-between items-center gap-2"
        style={isGamePlayFullscreen ? { display: 'none' } : undefined}
      >
        <span>© 2026 Quizziando. Criado com design de alta fidelidade e tempo real.</span>
        <div className="flex gap-4">
          <span className="hover:text-[hsl(var(--text-primary))] transition cursor-pointer">Termos</span>
          <span className="hover:text-[hsl(var(--text-primary))] transition cursor-pointer">Privacidade</span>
        </div>
      </footer>

      {/* ==========================================
          🔐 MODAL DE LOGIN DO GERENCIADOR
          ========================================== */}
      {showLoginModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
            animation: 'fadeInModal 0.25s ease'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowLoginModal(false); }}
        >
          <div
            style={{
              width: '100%', maxWidth: '420px',
              background: 'rgba(8,12,28,0.92)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '24px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 60px rgba(124,58,237,0.15)',
              padding: '40px 36px',
              display: 'flex', flexDirection: 'column', gap: '24px',
              position: 'relative',
              animation: 'slideUpModal 0.3s cubic-bezier(0.34,1.56,0.64,1)'
            }}
          >
            {/* Glow decorativo */}
            <div style={{
              position: 'absolute', top: '-80px', left: '50%', transform: 'translateX(-50%)',
              width: '200px', height: '200px',
              background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)',
              pointerEvents: 'none', filter: 'blur(30px)'
            }} />

            {/* Header do Modal */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                background: 'linear-gradient(135deg, hsl(263,90%,64%) 0%, hsl(322,81%,54%) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(124,58,237,0.4)'
              }}>
                <Crown style={{ width: '28px', height: '28px', color: 'white' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'white', fontFamily: 'Outfit, sans-serif', marginBottom: '4px' }}>
                  {authMode === 'login' ? 'Acesso ao Gerenciador' : 'Criar Conta'}
                </h2>
                <p style={{ fontSize: '13px', color: 'hsl(215,20%,65%)' }}>
                  {authMode === 'login'
                    ? 'Entre com suas credenciais para gerenciar quizzes'
                    : 'Crie uma conta de gerenciador para começar'
                  }
                </p>
              </div>
            </div>

            {/* Badge Modo Demo */}
            {!useRealSupabase && (
              <div style={{
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: '12px', padding: '10px 14px',
                display: 'flex', alignItems: 'flex-start', gap: '10px'
              }}>
                <AlertCircle style={{ width: '16px', height: '16px', color: 'rgba(251,191,36,1)', flexShrink: 0, marginTop: '1px' }} />
                <div style={{ fontSize: '12px', color: 'rgba(251,191,36,0.9)', lineHeight: '1.5' }}>
                  <strong>Modo Demo</strong> — use as credenciais de teste:<br />
                  <span style={{ fontFamily: 'monospace', letterSpacing: '0.03em' }}>admin@quizziando.com</span> / <span style={{ fontFamily: 'monospace' }}>admin123</span>
                </div>
              </div>
            )}

            {/* Formulário */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'hsl(215,20%,65%)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  E-mail
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{
                    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                    width: '16px', height: '16px', color: 'hsl(215,15%,55%)', pointerEvents: 'none'
                  }} />
                  <input
                    id="auth-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAuthSubmit()}
                    autoComplete="email"
                    style={{
                      width: '100%', padding: '13px 16px 13px 40px',
                      background: 'rgba(255,255,255,0.04)',
                      border: authError ? '1px solid rgba(248,113,113,0.5)' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px', color: 'white',
                      fontSize: '15px', fontFamily: 'inherit',
                      outline: 'none', transition: 'all 0.2s ease'
                    }}
                    onFocus={e => { e.target.style.borderColor = 'hsl(263,90%,64%)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.2)'; }}
                    onBlur={e => { e.target.style.borderColor = authError ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Senha */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'hsl(215,20%,65%)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Senha
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{
                    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                    width: '16px', height: '16px', color: 'hsl(215,15%,55%)', pointerEvents: 'none'
                  }} />
                  <input
                    id="auth-password"
                    type={authShowPassword ? 'text' : 'password'}
                    placeholder="Sua senha segura"
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAuthSubmit()}
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    style={{
                      width: '100%', padding: '13px 44px 13px 40px',
                      background: 'rgba(255,255,255,0.04)',
                      border: authError ? '1px solid rgba(248,113,113,0.5)' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px', color: 'white',
                      fontSize: '15px', fontFamily: 'inherit',
                      outline: 'none', transition: 'all 0.2s ease'
                    }}
                    onFocus={e => { e.target.style.borderColor = 'hsl(263,90%,64%)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.2)'; }}
                    onBlur={e => { e.target.style.borderColor = authError ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setAuthShowPassword(!authShowPassword)}
                    style={{
                      position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(215,15%,55%)',
                      padding: '2px', display: 'flex', alignItems: 'center'
                    }}
                  >
                    {authShowPassword ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
                  </button>
                </div>
              </div>

              {/* Mensagem de Erro */}
              {authError && (
                <div style={{
                  background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)',
                  borderRadius: '10px', padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  fontSize: '13px', color: 'rgba(252,165,165,1)'
                }}>
                  <XCircle style={{ width: '15px', height: '15px', flexShrink: 0, color: 'rgba(248,113,113,1)' }} />
                  {authError}
                </div>
              )}

              {/* Botão Principal */}
              <button
                id="auth-submit-btn"
                onClick={handleAuthSubmit}
                disabled={authLoading}
                style={{
                  background: authLoading
                    ? 'rgba(124,58,237,0.5)'
                    : 'linear-gradient(135deg, hsl(263,90%,64%) 0%, hsl(322,81%,54%) 100%)',
                  color: 'white', border: 'none',
                  padding: '14px 24px', borderRadius: '12px',
                  fontSize: '15px', fontWeight: 700, cursor: authLoading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Outfit, sans-serif',
                  boxShadow: authLoading ? 'none' : '0 4px 20px rgba(124,58,237,0.4)',
                  transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  marginTop: '4px'
                }}
              >
                {authLoading ? (
                  <>
                    <span style={{
                      width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white', borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                    Autenticando...
                  </>
                ) : (
                  <>
                    <ShieldCheck style={{ width: '18px', height: '18px' }} />
                    {authMode === 'login' ? 'Entrar como Gerenciador' : 'Criar Conta'}
                  </>
                )}
              </button>
            </div>

            {/* Alternar Login / Cadastro */}
            <div style={{ textAlign: 'center', fontSize: '13px', color: 'hsl(215,20%,65%)' }}>
              {authMode === 'login' ? (
                <>
                  Não tem conta?{' '}
                  <button
                    onClick={() => { setAuthMode('register'); setAuthError(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(263,90%,74%)', fontWeight: 600, fontSize: '13px' }}
                  >
                    Criar conta de gerenciador
                  </button>
                </>
              ) : (
                <>
                  Já tem conta?{' '}
                  <button
                    onClick={() => { setAuthMode('login'); setAuthError(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(263,90%,74%)', fontWeight: 600, fontSize: '13px' }}
                  >
                    Fazer login
                  </button>
                </>
              )}
            </div>

            {/* Fechar */}
            <button
              onClick={() => setShowLoginModal(false)}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px', width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'hsl(215,15%,55%)', fontSize: '18px', fontWeight: 300,
                transition: 'all 0.2s'
              }}
              aria-label="Fechar modal"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          📚 MODAL DE GERENCIAMENTO DE QUESTÕES (PREMIUM)
          ========================================== */}
      {showQuestionManagerModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: 'rgba(0,0,0,0.82)',
            backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
            animation: 'fadeInModal 0.25s ease'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowQuestionManagerModal(false); }}
        >
          <div
            className="question-manager-modal flex flex-col lg:flex-row gap-6 w-full max-w-6xl"
            style={{
              background: 'rgba(8,12,28,0.95)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '24px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 60px rgba(124,58,237,0.12)',
              padding: '32px',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
              animation: 'slideUpModal 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Fechar */}
            <button
              onClick={() => {
                setShowQuestionManagerModal(false);
                setEditingQuestionId(null);
                setEditingAiDraftId(null);
                setManagerQText('');
                setManagerQTimeLimit(20);
                setManagerQExplanation('');
                setManagerQReference('');
                setManagerQDifficulty('medium');
                setManagerQTags('');
                setManagerQAlts([
                  { text: '', isCorrect: true },
                  { text: '', isCorrect: false },
                  { text: '', isCorrect: false },
                  { text: '', isCorrect: false }
                ]);
              }}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px', width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'white', fontSize: '20px',
                transition: 'all 0.2s', zIndex: 10
              }}
              className="hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/20"
              title="Fechar"
            >
              ×
            </button>

            {/* LADO ESQUERDO: FORMULÁRIO (CADASTRO / EDIÇÃO / GERADOR IA) */}
            <div className="question-composer w-full lg:w-5/12 flex flex-col gap-4 pr-0 lg:pr-4 border-r-0 lg:border-r border-[rgba(255,255,255,0.06)]">
              <div className="question-composer__heading">
                <span className="text-xs font-bold text-[hsl(var(--primary))] tracking-widest uppercase">
                  {editingQuestionId ? 'Modo de Edição' : 'Painel de Criação'}
                </span>
                <h3 className="text-xl font-extrabold text-white mt-1">
                  {editingQuestionId ? 'Editar Pergunta' : 'Criar Pergunta'}
                </h3>
                <p className="question-composer__intro">Preencha os dados essenciais e escolha a alternativa correta.</p>
              </div>

              {/* TABS DE SELEÇÃO */}
              <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
                <button
                  onClick={() => { setManagerTab('manual'); sfx.playClick(); }}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                    managerTab === 'manual'
                      ? 'bg-[hsl(var(--primary))] text-white'
                      : 'text-[hsl(var(--text-muted))] hover:text-white'
                  }`}
                >
                  Manual
                </button>
                <button
                  onClick={() => { setManagerTab('ai'); sfx.playClick(); }}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    managerTab === 'ai'
                      ? 'bg-[hsl(var(--secondary))] text-white shadow-[0_0_15px_rgba(236,72,153,0.3)]'
                      : 'text-[hsl(var(--text-muted))] hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Gerar com IA
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {/* Selecionar Categoria (Comum a ambos) */}
                <div className="question-basics">
                <div>
                  <div className="question-category-label">
                    <label className="text-[10px] font-extrabold text-[hsl(var(--text-secondary))] uppercase block mb-1">
                      Categoria da Questão <span className="text-red-400">*</span>
                    </label>
                    <button type="button" onClick={() => setShowQuickCategoryForm((visible) => !visible)} className="question-category-add">
                      <Plus className="w-3 h-3" /> Nova categoria
                    </button>
                  </div>
                  <select
                    value={managerQCatId}
                    onChange={(e) => setManagerQCatId(e.target.value)}
                    className="input-glow py-2 text-xs w-full bg-[#0d1326] border border-white/10 rounded-xl"
                  >
                    <option value="">Selecione a categoria...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-[hsl(var(--text-secondary))] uppercase block mb-1">
                    Tempo Limite de Resposta (Segundos)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={managerQTimeLimit}
                    onChange={(e) => setManagerQTimeLimit(parseInt(e.target.value) || 20)}
                    className="input-glow py-2 px-3 text-xs w-full bg-[#0d1326] border border-white/10 rounded-xl font-semibold text-white"
                  />
                </div>
                </div>
                {showQuickCategoryForm && (
                  <div className="quick-category-form">
                    <div>
                      <strong>Nova categoria</strong>
                      <span>Ela ficará disponível imediatamente nesta lista.</span>
                    </div>
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(event) => setNewCatName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') return;
                        event.preventDefault();
                        if (!newCatName.trim()) return;
                        void handleAddCategory();
                        setShowQuickCategoryForm(false);
                      }}
                      maxLength={80}
                      placeholder="Ex.: História"
                      className="input-glow py-2 px-3 text-xs"
                    />
                    <input type="color" value={newCatColor} onChange={(event) => setNewCatColor(event.target.value)} title="Cor da categoria" />
                    <button type="button" className="quick-category-form__save" onClick={() => {
                      if (!newCatName.trim()) return;
                      void handleAddCategory();
                      setShowQuickCategoryForm(false);
                    }}>Adicionar</button>
                  </div>
                )}

                <div className={`question-composer__workspace ${managerTab === 'manual' ? '' : 'question-composer__workspace--hidden'}`} aria-hidden={managerTab !== 'manual'}>
                    {/* Texto da Pergunta */}
                    <section className="question-form-section question-form-section--prompt">
                      <div className="question-section-heading"><span>01</span><div><h4>Enunciado</h4><p>A pergunta que os participantes vão responder.</p></div></div>
                      <label className="text-[10px] font-extrabold text-[hsl(var(--text-secondary))] uppercase block mb-1">
                        Enunciado da Pergunta <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        placeholder="Digite a pergunta aqui de forma clara..."
                        value={managerQText}
                        onChange={(e) => setManagerQText(e.target.value)}
                        className="input-glow py-2 px-3 text-xs h-24 w-full bg-[#0d1326] border border-white/10 rounded-xl resize-none font-semibold text-white"
                      />
                    </section>

                    <details className="question-details">
                      <summary>Adicionar explicação, referência e etiquetas <span>Opcional</span></summary>
                      <div className="question-details__content">
                        <label className="text-[10px] font-extrabold text-[hsl(var(--text-secondary))] uppercase">Explicação após a resposta
                          <textarea value={managerQExplanation} onChange={event => setManagerQExplanation(event.target.value)} maxLength={2000} className="input-glow p-2 text-xs min-h-20" placeholder="Explique por que a resposta está correta" />
                        </label>
                        <label className="text-[10px] font-extrabold text-[hsl(var(--text-secondary))] uppercase">Referência (URL)
                          <input type="url" value={managerQReference} onChange={event => setManagerQReference(event.target.value)} maxLength={500} className="input-glow p-2 text-xs" placeholder="https://..." />
                        </label>
                        <div className="question-details__grid">
                          <label className="text-[10px] font-extrabold text-[hsl(var(--text-secondary))] uppercase">Dificuldade
                            <select className="input-glow mt-1 w-full text-xs" value={managerQDifficulty} onChange={event => setManagerQDifficulty(event.target.value as typeof managerQDifficulty)}>
                              <option value="easy">Fácil</option><option value="medium">Média</option><option value="hard">Difícil</option>
                            </select>
                          </label>
                          <label className="text-[10px] font-extrabold text-[hsl(var(--text-secondary))] uppercase">Etiquetas
                            <input className="input-glow mt-1 w-full text-xs" value={managerQTags} onChange={event => setManagerQTags(event.target.value)} maxLength={300} placeholder="8º ano, ciência" />
                          </label>
                        </div>
                      </div>
                    </details>
                    <section className="question-form-section question-form-section--answers">
                      <div className="question-section-heading"><span>02</span><div><h4>Alternativas <em>Selecione a correta</em></h4><p>Inclua uma resposta certa e três distratores.</p></div></div>
                      <label className="text-[10px] font-extrabold text-[hsl(var(--text-secondary))] uppercase block mb-2">
                        Alternativas (Selecione a opção CORRETA) <span className="text-red-400">*</span>
                      </label>
                      <div className="flex flex-col gap-2.5">
                        {managerQAlts.map((alt, index) => (
                          <div key={index} className={`answer-option flex gap-3 items-center ${alt.isCorrect ? 'answer-option--correct' : ''}`}>
                            <input
                              type="radio"
                              name="manager-correct-alt"
                              checked={alt.isCorrect}
                              onChange={() => {
                                setManagerQAlts((prev) =>
                                  prev.map((a, i) => ({ ...a, isCorrect: i === index }))
                                );
                                sfx.playClick();
                              }}
                              className="w-4 h-4 accent-[hsl(var(--primary))] cursor-pointer"
                              title="Marcar como correta"
                            />
                            <span className="answer-option__letter">{'ABCD'[index]}</span>
                            <input
                              type="text"
                              placeholder={
                                index === 0
                                  ? 'Ex: Alternativa correta da pergunta...'
                                  : `Alternativa incorreta ${index}...`
                              }
                              value={alt.text}
                              onChange={(e) => {
                                const newText = e.target.value;
                                setManagerQAlts((prev) =>
                                  prev.map((a, i) => (i === index ? { ...a, text: newText } : a))
                                );
                              }}
                              className="input-glow py-2 px-3 text-xs w-full bg-[#0d1326] border border-white/10 rounded-xl font-medium text-white"
                            />
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Botões do Form */}
                    <div className="question-save-bar flex gap-2 mt-2">
                      {editingQuestionId && (
                        <button
                          onClick={() => {
                            setEditingQuestionId(null);
                            setEditingAiDraftId(null);
                            setManagerQText('');
                            setManagerQTimeLimit(20);
                            setManagerQExplanation('');
                            setManagerQReference('');
                            setManagerQDifficulty('medium');
                            setManagerQTags('');
                            setManagerQAlts([
                              { text: '', isCorrect: true },
                              { text: '', isCorrect: false },
                              { text: '', isCorrect: false },
                              { text: '', isCorrect: false }
                            ]);
                            sfx.playClick();
                          }}
                          className="flex-1 py-2.5 rounded-xl border border-white/10 text-white hover:bg-white/5 text-xs font-bold transition-all"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        onClick={handleManagerSaveQuestion}
                        className="flex-grow btn-glow justify-center py-2.5 text-xs font-bold"
                      >
                        {editingQuestionId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {editingQuestionId ? 'Salvar Alterações' : 'Adicionar Pergunta'}
                      </button>
                    </div>
                  </div>
                  <div className={`flex flex-col gap-3.5 p-4 rounded-2xl border border-[hsla(var(--secondary),0.15)] bg-[hsla(var(--secondary),0.02)] relative overflow-hidden animate-fade-in ${managerTab === 'ai' ? '' : 'question-composer__workspace--hidden'}`} aria-hidden={managerTab !== 'ai'}>
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-[hsl(var(--secondary))]/10 rounded-full blur-2xl pointer-events-none" />
                    
                    <div>
                      <h4 className="text-xs font-bold text-[hsl(var(--text-secondary))] uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--secondary))]" />
                        Assistente de IA Gemini
                      </h4>
                      <p className="text-[11px] text-[hsl(var(--text-muted))] mt-1 leading-relaxed">
                        Selecione a categoria acima e anexe um PDF ou informe um tema. Com o PDF anexado, você pode gerar as questões sem escrever um prompt.
                      </p>
                    </div>

                    {/* API Key Warning */}
                    {!geminiApiKey && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-[11px] text-amber-300 leading-relaxed">
                        ⚠️ <strong>Atenção:</strong> Chave de API do Gemini não configurada! Insira a chave nas Configurações (ícone de engrenagem no topo direito) para utilizar esta ferramenta.
                      </div>
                    )}

                    {/* Prompt de Contexto/Tema */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-[hsl(var(--text-secondary))] uppercase">
                        Tema ou instrução adicional (Opcional)
                      </label>
                      <textarea
                        placeholder="Deixe em branco para usar somente o PDF anexado. Ex.: foco em exercícios práticos."
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="input-glow py-2 px-3 text-xs h-20 w-full bg-[#0d1326] border border-white/10 rounded-xl resize-none text-white font-medium"
                      />
                    </div>

                    {/* URL ou Link do YouTube */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-[hsl(var(--text-secondary))] uppercase">
                        URL ou Vídeo do YouTube (Opcional)
                      </label>
                      <input
                        type="url"
                        placeholder="Ex: https://youtube.com/watch?v=... ou https://wikipedia.org/..."
                        value={aiUrl}
                        onChange={(e) => setAiUrl(e.target.value)}
                        className="input-glow py-2 px-3 text-xs w-full bg-[#0d1326] border border-white/10 rounded-xl text-white font-medium"
                      />
                    </div>

                    {/* Upload de Arquivo PDF */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-[hsl(var(--text-secondary))] uppercase">
                        Documento PDF de Contexto (Opcional)
                      </label>
                      <div className="flex flex-col gap-2">
                        {aiFile ? (
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center text-xs text-white">
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="w-4 h-4 text-[hsl(var(--secondary))] flex-shrink-0" />
                              <span className="truncate font-semibold text-white">{aiFile.name}</span>
                              <span className="text-[10px] text-[hsl(var(--text-muted))]">({Math.round(aiFile.size / 1024)} KB)</span>
                            </div>
                            <button
                              onClick={() => { setAiFile(null); sfx.playClick(); }}
                              className="text-red-400 hover:text-red-300 font-bold p-1 text-sm"
                              title="Remover arquivo"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <label className="border border-dashed border-white/15 hover:border-[hsl(var(--secondary))]/50 bg-white/[0.01] hover:bg-[hsl(var(--secondary))]/5 transition rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group">
                            <Upload className="w-5 h-5 text-[hsl(var(--text-muted))] group-hover:text-[hsl(var(--secondary))] transition-colors" />
                            <span className="text-[11px] font-bold text-[hsl(var(--text-secondary))]">Fazer upload de PDF</span>
                            <span className="text-[9px] text-[hsl(var(--text-muted))]">Processamento 100% local e seguro</span>
                            <input
                              type="file"
                              accept="application/pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                if (file) {
                                  setAiFile(file);
                                  sfx.playClick();
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Quantidade de Questões */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-extrabold text-[hsl(var(--text-secondary))] uppercase">
                        Quantidade de Questões (1 a 25)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="25"
                        value={aiQuantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val)) {
                            setAiQuantity(Math.min(25, Math.max(1, val)));
                          } else {
                            setAiQuantity(1);
                          }
                        }}
                        className="input-glow py-2 px-3 text-xs w-full bg-[#0d1326] border border-white/10 rounded-xl text-white font-medium"
                      />
                    </div>

                    {/* AI Error Display */}
                    {aiError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-[11px] text-red-300 leading-relaxed">
                        {aiError}
                      </div>
                    )}

                    {/* Gerar Button */}
                    <button
                      onClick={generateQuestionWithAI}
                      disabled={aiLoading || !geminiApiKey || !managerQCatId}
                      className={`group w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2.5 ${
                        aiLoading
                          ? 'bg-[hsl(var(--secondary))]/50 text-white cursor-not-allowed'
                          : 'bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] hover:from-[hsl(var(--primary))]/90 hover:to-[hsl(var(--secondary))]/90 text-white shadow-lg shadow-purple-900/30 active:scale-[0.98]'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {aiLoading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processando com Gemini...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          {aiQuantity > 1 ? `Gerar ${aiQuantity} Questões` : 'Gerar Questão'}
                        </>
                      )}
                    </button>
                    {aiDrafts.length > 0 && <div className="flex flex-col gap-3 rounded-xl border border-amber-400/30 bg-amber-500/5 p-3">
                      <div className="ai-drafts-header">
                        <strong className="text-xs text-amber-200">Rascunhos pendentes de revisão ({aiDrafts.length})</strong>
                        <button type="button" className="ai-drafts-add-all" onClick={() => void handleAddAllAiDraftsToBank()} disabled={aiSavingAllDrafts || aiSavingDraftIds.length > 0}>
                          {aiSavingAllDrafts ? 'Adicionando...' : <><Check className="w-3.5 h-3.5" /> Adicionar todas ao banco</>}
                        </button>
                      </div>
                      {aiDrafts.map(draft => <div key={draft.id} className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-white">
                        <p className="font-semibold mb-2">{draft.question_text}</p>
                        {draft.alternatives.map((alternative, index) => <p key={index} className={alternative.isCorrect ? 'text-emerald-300' : 'text-slate-300'}>{'ABCD'[index]}. {alternative.text}{alternative.isCorrect ? ' ✓' : ''}</p>)}
                        {draft.explanation && <p className="mt-2 text-violet-200">Explicação: {draft.explanation}</p>}
                        <div className="flex gap-3 mt-3">
                          <button type="button" className="text-emerald-300" disabled={aiSavingAllDrafts || aiSavingDraftIds.includes(draft.id)} onClick={() => void handleAddAiDraftToBank(draft)}>
                            {aiSavingDraftIds.includes(draft.id) ? 'Adicionando...' : 'Adicionar ao banco'}
                          </button>
                          <button type="button" className="text-violet-300" onClick={() => {
                            setEditingAiDraftId(draft.id); setEditingQuestionId(null); setManagerTab('manual');
                            setManagerQCatId(draft.category_id); setManagerQText(draft.question_text);
                            setManagerQTimeLimit(draft.time_limit || 20); setManagerQAlts(draft.alternatives);
                            setManagerQExplanation(draft.explanation || ''); setManagerQReference(''); setManagerQDifficulty('medium'); setManagerQTags('');
                          }}>Revisar no formulário</button>
                          <button type="button" className="text-red-300" onClick={() => setAiDrafts(prev => prev.filter(item => item.id !== draft.id))}>Descartar</button>
                        </div>
                      </div>)}
                    </div>}
                  </div>
              </div>
            </div>

            {/* LADO DIREITO: LISTAGEM E PESQUISA */}
            <div className="question-library w-full lg:w-7/12 flex flex-col gap-4 pl-0 lg:pl-4 overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <span className="text-xs font-bold text-[hsl(var(--secondary))] tracking-widest uppercase">
                    Banco de Dados
                  </span>
                  <h3 className="text-xl font-extrabold text-white mt-1">
                    Questões Cadastradas ({questions.length})
                  </h3>
                </div>

                {/* Filtro por Categoria */}
                <select
                  value={managerSelectedCatFilter}
                  onChange={(e) => setManagerSelectedCatFilter(e.target.value)}
                  className="input-glow py-1.5 px-3 text-xs bg-[#0d1326] border border-white/10 rounded-xl w-fit"
                >
                  <option value="">Todas Categorias</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <button type="button" onClick={handleExportQuestionBank} className="btn-secondary-glow px-3 py-2">Exportar acervo JSON</button>
                <label className="btn-secondary-glow px-3 py-2 cursor-pointer">Importar acervo JSON
                  <input type="file" accept=".json,application/json" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) void handleImportQuestionBank(file); event.target.value = ''; }} />
                </label>
              </div>

              {/* Campo de Busca */}
              <input
                type="text"
                placeholder="Pesquisar pergunta pelo enunciado..."
                value={managerSearchTerm}
                onChange={(e) => setManagerSearchTerm(e.target.value)}
                className="input-glow py-2 px-3 text-xs w-full bg-[#0d1326] border border-white/10 rounded-xl"
              />

              {/* Lista Scrollable */}
              <div className="question-library__list flex flex-col gap-3 overflow-y-auto max-h-[50vh] pr-2">
                {questions
                  .filter((q) => {
                    const matchesSearch = q.question_text
                      .toLowerCase()
                      .includes(managerSearchTerm.toLowerCase());
                    const matchesCategory = managerSelectedCatFilter
                      ? q.category_id === managerSelectedCatFilter
                      : true;
                    return matchesSearch && matchesCategory;
                  })
                  .map((q) => {
                    const cat = categories.find((c) => c.id === q.category_id);
                    return (
                      <div
                        key={q.id}
                        className={`p-4 bg-[rgba(255,255,255,0.02)] border rounded-xl flex flex-col gap-3 transition-all ${
                          editingQuestionId === q.id
                            ? 'border-[hsl(var(--primary))] bg-[hsla(var(--primary),0.02)]'
                            : 'border-white/5 hover:border-white/10 hover:bg-white/[0.03]'
                        }`}
                      >
                        {/* Enunciado e Categoria */}
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex flex-col gap-1.5 flex-grow">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: cat?.color || 'gray' }}
                              />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--text-secondary))]">
                                {cat?.name || 'Sem Categoria'}
                              </span>
                              <span className="text-[10px] text-violet-300">{q.difficulty === 'easy' ? 'Fácil' : q.difficulty === 'hard' ? 'Difícil' : 'Média'}</span>
                            </div>
                            {!!q.tags?.length && <span className="text-[10px] text-sky-300">{q.tags.join(' · ')}</span>}
                            <p className="text-sm font-semibold text-white leading-relaxed">
                              {q.question_text}
                            </p>
                          </div>

                          {/* Ações */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => {
                                setEditingQuestionId(q.id);
                                setEditingAiDraftId(null);
                                setManagerQText(q.question_text);
                            setManagerQTimeLimit(q.time_limit || 20);
                            setManagerQExplanation(q.explanation || '');
                            setManagerQReference(q.reference_url || '');
                            setManagerQDifficulty(q.difficulty || 'medium');
                            setManagerQTags((q.tags || []).join(', '));
                                setManagerQCatId(q.category_id);
                                setManagerQAlts(q.alternatives.map(alt => ({
                                  text: alt.text,
                                  isCorrect: alt.isCorrect
                                })));
                                setManagerTab('manual');
                                sfx.playClick();
                              }}
                              className="p-2 rounded-lg bg-white/5 hover:bg-blue-500/20 hover:text-blue-400 text-[hsl(var(--text-muted))] transition"
                              title="Editar Pergunta"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleManagerDeleteQuestion(q.id)}
                              className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-[hsl(var(--text-muted))] transition"
                              title="Excluir Pergunta"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Alternativas compactas */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/5">
                          {q.alternatives.map((alt, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium ${
                                alt.isCorrect
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-white/5 text-[hsl(var(--text-secondary))] border border-transparent'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  alt.isCorrect ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'
                                }`}
                              />
                              <span className="truncate" title={alt.text}>
                                {alt.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                {questions.filter((q) => {
                  const matchesSearch = q.question_text
                    .toLowerCase()
                    .includes(managerSearchTerm.toLowerCase());
                  const matchesCategory = managerSelectedCatFilter
                    ? q.category_id === managerSelectedCatFilter
                    : true;
                  return matchesSearch && matchesCategory;
                }).length === 0 && (
                  <div className="text-center p-8 border border-dashed border-white/10 rounded-xl text-[hsl(var(--text-muted))] text-sm">
                    Nenhuma pergunta encontrada para os filtros selecionados.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RELATÓRIO ESTATÍSTICO */}
      {showStatsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1f1340] border border-[rgba(255,255,255,0.1)] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-[rgba(255,255,255,0.05)]">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <FileText className="text-[hsl(var(--primary))]" />
                Relatório Estatístico
              </h2>
              <button 
                onClick={() => setShowStatsModal(false)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
              <section className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="font-bold text-white mb-3">Acertos por categoria</h3>
                {categoryReport.map(row => <p key={row.category.id} className="text-sm text-slate-300">{row.category.name}: {row.correct}/{row.answered} ({Math.round(row.correct / row.answered * 100)}%)</p>)}
                {!categoryReport.length && <p className="text-sm text-slate-400">Ainda não há respostas para analisar.</p>}
              </section>
              <section className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="font-bold text-white mb-3">Questões mais difíceis</h3>
                {questionReport.filter(row => row.answered > 0).sort((a, b) => a.correct / a.answered - b.correct / b.answered).map(row => <p key={row.id} className="text-sm text-slate-300 mb-2">{row.question?.question_text}: {row.correct}/{row.answered} acertos ({Math.round(row.correct / row.answered * 100)}%)</p>)}
              </section>
              {activePlayers.map(p => {
                const answers = p.stats?.answers || {};
                const answeredRounds = Object.keys(answers).map(Number);
                const totalAnswered = answeredRounds.length;
                const totalCorrect = Object.values(answers).filter(Boolean).length;
                const percentage = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
                
                return (
                  <div key={p.id} className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                      <h3 className="text-xl font-bold text-white uppercase">{p.nickname}</h3>
                      <div className="flex gap-4">
                        <span className="text-sm text-emerald-400 font-mono">Acertos: {totalCorrect}/{totalAnswered}</span>
                        <span className="text-sm text-blue-400 font-mono">({percentage}%)</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {answeredRounds.sort((a,b) => a-b).map(roundIndex => {
                        const isCorrect = answers[roundIndex];
                        const qId = usedQuestionIds[roundIndex - 1];
                        const q = questions.find(q => q.id === qId);
                        
                        return (
                          <div key={roundIndex} className="flex items-start gap-3 bg-black/20 p-3 rounded-lg text-sm">
                            <div className="mt-0.5">
                              {isCorrect ? (
                                <CheckCircle className="w-5 h-5 text-emerald-500" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                              )}
                            </div>
                            <div className="flex-1">
                              <span className="text-xs text-white/50 font-bold uppercase mb-1 block">Rodada {roundIndex}</span>
                              <span className="text-white/90">{q?.question_text || 'Pergunta não encontrada'}</span>
                            </div>
                          </div>
                        );
                      })}
                      {answeredRounds.length === 0 && (
                        <div className="text-white/40 text-sm text-center py-2">Nenhuma resposta registrada.</div>
                      )}
                    </div>
                  </div>
                );
              })}
              {activePlayers.length === 0 && (
                <div className="text-white/40 text-center py-8">Nenhum jogador na partida.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY DE TRANSIÇÃO DE RODADA */}
      <AnimatePresence>
        {roundTransitionMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              zIndex: 9999,
              backdropFilter: 'blur(10px)'
            }}
          >
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              style={{ fontSize: '4rem', fontWeight: 900, color: '#fbbf24', textTransform: 'uppercase', textShadow: '0 4px 20px rgba(251, 191, 36, 0.4)', marginBottom: '24px', textAlign: 'center' }}
            >
              {roundTransitionMessage.title}
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', textAlign: 'center', maxWidth: '80%' }}
            >
              {roundTransitionMessage.subtitle}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
