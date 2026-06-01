import { useState, useEffect, useRef } from 'react';
import { 
  Trophy, Play, Plus, Trash, User, Users, Volume2, VolumeX, 
  Clock, CheckCircle, XCircle, RotateCcw, 
  Crown, Sparkles, List, BookOpen, ChevronRight, AlertCircle,
  Lock, Eye, EyeOff, LogOut, ShieldCheck, Mail, Copy
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from './lib/supabaseClient';
import PlayerView, { ANSWER_COLORS } from './PlayerView';

// Detectar se o jogador está acessando via link de sala
const urlParams = new URLSearchParams(window.location.search);
const URL_ROOM_CODE = urlParams.get('room')?.toUpperCase() || null;

// ==========================================
// 🎵 SINTETIZADOR DE EFEITOS SONOROS (WEB AUDIO API)
// ==========================================
class SoundFX {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  constructor() {
    // Inicializar quando houver interação do usuário
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
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
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

  playVictory() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, index) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + index * 0.15);
      
      gain.gain.setValueAtTime(0.1, this.ctx!.currentTime + index * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + index * 0.15 + 0.6);
      
      osc.start(this.ctx!.currentTime + index * 0.15);
      osc.stop(this.ctx!.currentTime + index * 0.15 + 0.6);
    });
  }
}

const sfx = new SoundFX();

// ==========================================
// 📊 TIPAGENS E INTERFACES DO PROJETO
// ==========================================
interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface Question {
  id: string;
  category_id: string;
  question_text: string;
  alternatives: Alternative[];
}

interface Alternative {
  text: string;
  isCorrect: boolean;
}

interface GamePlayer {
  id: string;
  nickname: string;
  team_name?: string;
  score: number;
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
  // ==========================================
  // Se acessado via link de sala → renderizar PlayerView
  // ==========================================
  if (URL_ROOM_CODE) {
    return <PlayerView roomCode={URL_ROOM_CODE} />;
  }

  // Configurações Globais / Conexão
  const isSupabaseConfigured = 
    import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_URL !== 'https://suasala.supabase.co' &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    import.meta.env.VITE_SUPABASE_ANON_KEY !== 'seu-anon-key';

  const [useRealSupabase, setUseRealSupabase] = useState(!!isSupabaseConfigured);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    if (useRealSupabase) {
      console.log("Supabase inicializado na URL real:", supabase.auth);
    }
  }, [useRealSupabase]);

  // Carregar dados reais do Supabase se ativo
  useEffect(() => {
    const fetchData = async () => {
      if (useRealSupabase) {
        try {
          // 1. Carregar Categorias
          const { data: catData } = await supabase
            .from('categories')
            .select('*');
          if (catData && catData.length > 0) {
            setCategories(catData.map(c => ({
              id: c.id,
              name: c.name,
              color: c.color,
              icon: c.icon
            })));
          }

          // 2. Carregar Perguntas com suas respectivas alternativas
          const { data: qData } = await supabase
            .from('questions')
            .select(`
              id,
              category_id,
              question_text,
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
              alternatives: q.alternatives.map((alt: any) => ({
                text: alt.alternative_text,
                isCorrect: alt.is_correct
              }))
            })));
          }
        } catch (err) {
          console.error("Erro ao buscar dados do Supabase:", err);
        }
      } else {
        // Resetar para padrões do mockup local
        setCategories(DEFAULT_CATEGORIES);
        setQuestions(DEFAULT_QUESTIONS);
      }
    };
    
    fetchData();
  }, [useRealSupabase]);

  // Telas: 'welcome' | 'operator-dashboard' | 'game-lobby' | 'game-play' | 'podium'
  const [screen, setScreen] = useState<'welcome' | 'operator-dashboard' | 'game-lobby' | 'game-play' | 'podium'>('welcome');
  const [role, setRole] = useState<'operator' | 'player'>('player');
  const [nickname, setNickname] = useState('');
  const [teamName, setTeamName] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');

  // ==========================================
  // 🔐 ESTADOS DE AUTENTICAÇÃO DO GERENCIADOR
  // ==========================================
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authShowPassword, setAuthShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authUser, setAuthUser] = useState<{ email: string } | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Estados de Configuração do Painel do Operador
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [questions, setQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#EC4899');
  
  // Nova Pergunta Formulário
  const [newQText, setNewQText] = useState('');
  const [newQCatId, setNewQCatId] = useState('');
  const [newQAlts, setNewQAlts] = useState<Alternative[]>([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false }
  ]);

  // Estados de Partida Ativa
  const [gameMode, setGameMode] = useState<'duel' | 'team' | 'open'>('open');
  const [gameRounds, setGameRounds] = useState(3);
  const [gameTimeLimit, setGameTimeLimit] = useState(15);
  const [activePlayers, setActivePlayers] = useState<GamePlayer[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(1);
  const [usedQuestionIds, setUsedQuestionIds] = useState<string[]>([]);
  
  // Status da rodada ativa: 'idle' | 'spinning' | 'category-reveal' | 'question' | 'answered' | 'ranking'
  const [roundState, setRoundState] = useState<'idle' | 'spinning' | 'category-reveal' | 'question' | 'answered' | 'ranking'>('idle');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [timerRunning, setTimerRunning] = useState(false);
  const [playerAnswered, setPlayerAnswered] = useState<string | null>(null);
  
  // Efeito de Rotação da Roleta
  const [rouletteAngle, setRouletteAngle] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  
  // Referências
  const timerIntervalRef = useRef<any | null>(null);
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

  // Escutar respostas dos jogadores em tempo real (operador)
  useEffect(() => {
    if (screen !== 'game-play' || role !== 'operator' || !roomCode || !useRealSupabase) return;
    
    const channel = supabase
      .channel(`answers-${roomCode}-${currentRoundIndex}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'player_answers',
          filter: `room_code=eq.${roomCode}` },
        (payload) => {
          const ans = payload.new as any;
          if (ans.round_index !== currentRoundIndex) return;
          setRoomAnswers(prev => {
            const next = [...prev];
            if (ans.answer_index >= 0 && ans.answer_index <= 3) next[ans.answer_index]++;
            return next;
          });
          setTotalAnswered(prev => prev + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [screen, role, roomCode, currentRoundIndex, useRealSupabase]);


  // Controlar o temporizador
  useEffect(() => {
    if (timerRunning && timeLeft > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            revealAnswer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerRunning, timeLeft]);

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
        setAuthUser({ email: authEmail });
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
          setAuthUser({ email: data.user.email || authEmail });
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
          setAuthUser({ email: data.user.email || authEmail });
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
    setRole('player');
  };

  // ==========================================
  // ⚙️ FUNÇÕES DE NEGÓCIO & EVENTOS
  // ==========================================
  
  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    if (categories.length >= 20) {
      alert('Você atingiu o limite máximo de 20 categorias!');
      return;
    }
    const newCat: Category = {
      id: Math.random().toString(),
      name: newCatName.trim(),
      color: newCatColor,
      icon: 'HelpCircle'
    };
    setCategories([...categories, newCat]);
    setNewCatName('');
    sfx.playCorrect();
  };

  const handleDeleteCategory = (id: string) => {
    setCategories(categories.filter(c => c.id !== id));
    sfx.playClick();
  };

  const handleAddQuestion = () => {
    if (!newQText.trim() || !newQCatId) {
      alert('Preencha o texto da pergunta e selecione uma categoria.');
      return;
    }
    if (newQAlts.some(a => !a.text.trim())) {
      alert('Preencha todas as 4 alternativas!');
      return;
    }
    const newQuestion: Question = {
      id: Math.random().toString(),
      category_id: newQCatId,
      question_text: newQText.trim(),
      alternatives: [...newQAlts]
    };
    setQuestions([...questions, newQuestion]);
    setNewQText('');
    setNewQAlts([
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ]);
    sfx.playCorrect();
  };

  // const handleDeleteQuestion = (id: string) => {
  //   setQuestions(questions.filter(q => q.id !== id));
  //   sfx.playClick();
  // };

  // ==========================================
  // 🏗️ FUNÇÕES DO SISTEMA DE SALAS
  // ==========================================

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const publishRoomState = async (update: Record<string, any>) => {
    if (!useRealSupabase || !roomCode) return;
    await supabase.from('game_rooms').update({ ...update, updated_at: new Date().toISOString() }).eq('code', roomCode);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const handleStartGameSetup = async () => {
    if (role === 'player' && !nickname.trim()) {
      alert('Por favor, informe seu nickname para entrar no jogo!');
      return;
    }
    
    sfx.playClick();
    
    if (role === 'operator') {
      // Gerar código único de sala
      const code = generateRoomCode();
      const link = `${window.location.origin}${window.location.pathname}?room=${code}`;
      setRoomCode(code);
      setRoomLink(link);
      setActivePlayers([]);
      setRoomAnswers([0, 0, 0, 0]);
      setTotalAnswered(0);

      // Criar sala no Supabase
      if (useRealSupabase) {
        await supabase.from('game_rooms').insert({
          code,
          operator_email: authUser?.email || 'demo',
          game_mode: gameMode,
          rounds: gameRounds,
          time_limit: gameTimeLimit,
          status: 'lobby',
          round_state: 'idle',
        });
      }

      setScreen('game-lobby');
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
    }
  };

  const handleStartMatch = async () => {
    sfx.playClick();
    setCurrentRoundIndex(1);
    setUsedQuestionIds([]);
    setRoundState('idle');
    setRoomAnswers([0, 0, 0, 0]);
    setTotalAnswered(0);
    await publishRoomState({ status: 'playing', round_state: 'idle', current_round: 1 });
    setScreen('game-play');
  };


  // Girar a Roleta de Categorias
  const handleSpinRoulette = () => {
    if (categories.length === 0) {
      alert('Adicione pelo menos uma categoria antes de rodar!');
      return;
    }
    sfx.playSpin();
    setIsSpinning(true);
    setRoundState('spinning');
    
    // Gerar um giro aleatório
    const numSpins = 4 + Math.random() * 4;
    const finalAngle = rouletteAngle + numSpins * 360 + Math.random() * 360;
    setRouletteAngle(finalAngle);
    
    setTimeout(async () => {
      setIsSpinning(false);
      
      // Determinar a categoria selecionada com base no ângulo final
      const normalizedAngle = (360 - (finalAngle % 360)) % 360;
      const index = Math.floor((normalizedAngle / 360) * categories.length);
      const cat = categories[index] || categories[0];
      
      setSelectedCategory(cat);
      
      // Buscar pergunta elegível não repetida
      const availableQuestions = questions.filter(
        q => q.category_id === cat.id && !usedQuestionIds.includes(q.id)
      );
      
      let selectedQ;
      if (availableQuestions.length === 0) {
        // Fallback: se acabarem as perguntas daquela categoria, pegar qualquer uma não usada da categoria ou geral
        const fallbackQuestions = questions.filter(q => !usedQuestionIds.includes(q.id));
        if (fallbackQuestions.length > 0) {
          selectedQ = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
        } else {
          // Zerar banco de usadas se todas forem esgotadas
          selectedQ = questions[Math.floor(Math.random() * questions.length)];
          setUsedQuestionIds([selectedQ.id]);
        }
      } else {
        selectedQ = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
      }
      setCurrentQuestion(selectedQ);
      setUsedQuestionIds(prev => prev.includes(selectedQ!.id) ? prev : [...prev, selectedQ!.id]);

      // Publicar categoria e pergunta no Supabase para os jogadores verem
      await publishRoomState({
        round_state: 'category-reveal',
        current_round: currentRoundIndex,
        selected_category: cat,
        current_question: selectedQ,
      });

      // ⏳ Aguardar um momento exibindo a categoria antes de mostrar a pergunta
      setTimeout(async () => {
        setRoundState('category-reveal');
        setTimeout(async () => {
          setRoundState('question');
          setTimeLeft(gameTimeLimit);
          setTimerRunning(true);
          setPlayerAnswered(null);
          setRoomAnswers([0, 0, 0, 0]);
          setTotalAnswered(0);
          await publishRoomState({ round_state: 'question' });
        }, 2200);
      }, 0);

    }, 3500);
  };

  const handlePlayerAnswer = (altIndex: number) => {
    if (playerAnswered !== null || !timerRunning || !currentQuestion) return;
    
    const alt = currentQuestion.alternatives[altIndex];
    setPlayerAnswered(alt.text);
    
    if (alt.isCorrect) {
      sfx.playCorrect();
      // Incrementar score do jogador principal
      setActivePlayers(prev => prev.map(p => {
        if (p.id === 'player-self') {
          // Bônus por rapidez
          const speedBonus = Math.floor((timeLeft / gameTimeLimit) * 50);
          return { ...p, score: p.score + 100 + speedBonus };
        }
        return p;
      }));
    } else {
      sfx.playWrong();
    }
  };

  const revealAnswer = async () => {
    setTimerRunning(false);
    setRoundState('answered');
    await publishRoomState({ round_state: 'answered' });
    
    // Simular respostas e scores para outros jogadores do lobby (bots) no modo demo
    if (role === 'operator' || activePlayers.length > 1) {
      setActivePlayers(prev => prev.map(p => {
        if (p.id !== 'player-self') {
          const isCorrect = Math.random() > 0.4;
          if (isCorrect) {
            const addedScore = 100 + Math.floor(Math.random() * 50);
            return { ...p, score: p.score + addedScore };
          }
        }
        return p;
      }));
    }
  };

  const handleGoToRanking = async () => {
    setRoundState('ranking');
    sfx.playClick();
    await publishRoomState({ round_state: 'ranking' });
  };

  const handleNextRound = async () => {
    sfx.playClick();
    if (currentRoundIndex < gameRounds) {
      const nextRound = currentRoundIndex + 1;
      setCurrentRoundIndex(nextRound);
      setRoundState('idle');
      setSelectedCategory(null);
      setCurrentQuestion(null);
      await publishRoomState({ round_state: 'idle', current_round: nextRound });
    } else {
      // Fim do jogo! Chamar Pódio de Suspense
      setScreen('podium');
      await publishRoomState({ status: 'finished', round_state: 'idle' });
      sfx.playDrumRoll();
      setTimeout(() => {
        sfx.playVictory();
        // Efeito de confetes no pódio
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      }, 2500);
    }
  };

  // Ajuste fino do cronômetro em tempo real pelo host
  const adjustTimer = (amount: number) => {
    setTimeLeft(prev => Math.max(5, prev + amount));
    sfx.playClick();
  };

  // Ordenação de vencedores
  const sortedPlayers = [...activePlayers].sort((a, b) => b.score - a.score);
  const thirdPlace = sortedPlayers[2];
  const secondPlace = sortedPlayers[1];
  const firstPlace = sortedPlayers[0];

  if (URL_ROOM_CODE) {
    return <PlayerView roomCode={URL_ROOM_CODE} />;
  }

  return (
    <div className="app-container min-h-screen flex flex-col justify-between">
      {/* HEADER PREMIUM */}
      <header className="flex justify-between items-center py-4 border-b border-[hsl(var(--border-color))] mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-[hsl(var(--primary))] to-[hsl(var(--accent))] p-2.5 rounded-xl shadow-lg shadow-purple-900/20">
            <Trophy className="w-7 h-7 text-white animate-bounce-gentle" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-[hsl(var(--text-primary))] to-[hsl(var(--secondary))] bg-clip-text text-transparent">
              Quizziando
            </h1>
            <span className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider font-semibold">
              Live Realtime Arena
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.05)] transition text-[hsl(var(--text-secondary))]"
            title={soundEnabled ? 'Desativar som' : 'Ativar som'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-red-400" />}
          </button>
          
          <button 
            onClick={() => setUseRealSupabase(!useRealSupabase)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              useRealSupabase 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
            }`}
          >
            {useRealSupabase ? 'Supabase Conectado' : 'Modo Demo (Offline)'}
          </button>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL DINÂMICO */}
      <main className="flex-grow flex flex-col justify-center py-4">
        
        {/* ==========================================
            1. TELA DE ENTRADA (WELCOME)
            ========================================== */}
        {screen === 'welcome' && (
          <div className="max-w-md mx-auto w-full glass-card p-8 flex flex-col gap-6">
            <div className="text-center">
              <span className="text-xs font-bold text-[hsl(var(--secondary))] tracking-widest uppercase">
                Bem-vindo ao Arena
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">

            {/* Banner do Gerenciador Autenticado */}
            {authUser && (
              <div className="lg:col-span-3 flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5" style={{ color: 'rgba(52,211,153,1)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'rgba(52,211,153,1)' }}>Gerenciador Autenticado</span>
                  <span className="text-xs" style={{ color: 'rgba(148,163,184,1)' }}>— {authUser.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                  style={{ background: 'rgba(248,113,113,0.1)', color: 'rgba(248,113,113,1)', border: '1px solid rgba(248,113,113,0.25)' }}
                >
                  <LogOut className="w-3.5 h-3.5" /> Sair
                </button>
              </div>
            )}
            {/* Esquerda: Nova Partida */}
            <div className="glass-card p-6 flex flex-col gap-5 h-fit">
              <h3 className="text-lg font-bold border-b border-[rgba(255,255,255,0.05)] pb-3 flex items-center gap-2">
                <Play className="w-5 h-5 text-[hsl(var(--primary))]" />
                Iniciar Nova Partida
              </h3>
              
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-[hsl(var(--text-secondary))] uppercase block mb-1.5">Modo de Competição</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['duel', 'team', 'open'].map(mode => (
                      <button
                        key={mode}
                        onClick={() => setGameMode(mode as any)}
                        className={`py-2 px-1 text-center rounded-lg border text-xs font-bold transition capitalize ${
                          gameMode === mode 
                            ? 'border-[hsl(var(--primary))] bg-[hsla(var(--primary),0.08)] text-white' 
                            : 'border-[rgba(255,255,255,0.05)] bg-transparent text-[hsl(var(--text-muted))]'
                        }`}
                      >
                        {mode === 'duel' ? 'Duelo 1v1' : mode === 'team' ? 'Times' : 'Aberto'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[hsl(var(--text-secondary))] uppercase block mb-1.5">Rodadas</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="20"
                      value={gameRounds} 
                      onChange={e => setGameRounds(parseInt(e.target.value) || 3)}
                      className="input-glow text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[hsl(var(--text-secondary))] uppercase block mb-1.5">Tempo da Pergunta</label>
                    <input 
                      type="number" 
                      min="5" 
                      max="120"
                      value={gameTimeLimit} 
                      onChange={e => setGameTimeLimit(parseInt(e.target.value) || 15)}
                      className="input-glow text-center font-bold"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleStartGameSetup}
                  className="btn-glow w-full justify-center py-3 text-sm mt-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Abrir Lobby de Espera
                </button>
              </div>
            </div>

            {/* Centro: Categorias (Limite 20) */}
            <div className="glass-card p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.05)] pb-3">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <List className="w-5 h-5 text-[hsl(var(--secondary))]" />
                  Categorias ({categories.length}/20)
                </h3>
              </div>

              {/* Lista */}
              <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-1">
                {categories.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center p-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="font-semibold text-sm text-[hsl(var(--text-primary))]">{cat.name}</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1 text-[hsl(var(--text-muted))] hover:text-red-400 transition"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Criar nova */}
              <div className="flex flex-col gap-3 mt-auto pt-3 border-t border-[rgba(255,255,255,0.05)]">
                <input 
                  type="text" 
                  placeholder="Nova categoria..." 
                  value={newCatName} 
                  onChange={e => setNewCatName(e.target.value)}
                  className="input-glow py-2 text-sm"
                />
                <div className="flex justify-between items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[hsl(var(--text-secondary))]">Cor:</span>
                    <input 
                      type="color" 
                      value={newCatColor} 
                      onChange={e => setNewCatColor(e.target.value)}
                      className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                    />
                  </div>
                  <button 
                    onClick={handleAddCategory}
                    className="btn-glow py-2 px-4 text-xs"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>
            </div>

            {/* Direita: Banco de Perguntas */}
            <div className="glass-card p-6 flex flex-col gap-4">
              <h3 className="text-lg font-bold border-b border-[rgba(255,255,255,0.05)] pb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[hsl(var(--accent))]" />
                Adicionar Perguntas
              </h3>

              {/* Form de criação de pergunta */}
              <div className="flex flex-col gap-3 max-h-[20rem] overflow-y-auto pr-1">
                <div>
                  <label className="text-[10px] font-bold text-[hsl(var(--text-secondary))] uppercase block mb-1">Categoria Obrigatória</label>
                  <select 
                    value={newQCatId} 
                    onChange={e => setNewQCatId(e.target.value)}
                    className="input-glow py-2 text-xs"
                  >
                    <option value="">Selecione...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[hsl(var(--text-secondary))] uppercase block mb-1">Enunciado da Pergunta</label>
                  <textarea 
                    placeholder="Escreva a pergunta aqui..." 
                    value={newQText} 
                    onChange={e => setNewQText(e.target.value)}
                    className="input-glow py-2 text-xs h-16 resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[hsl(var(--text-secondary))] uppercase block mb-1.5">Alternativas (4 Opções)</label>
                  <div className="flex flex-col gap-2">
                    {newQAlts.map((alt, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <input 
                          type="radio" 
                          name="correct-alt" 
                          checked={alt.isCorrect} 
                          onChange={() => {
                            setNewQAlts(prev => prev.map((a, i) => ({ ...a, isCorrect: i === index })));
                          }}
                          className="accent-[hsl(var(--primary))]"
                        />
                        <input 
                          type="text" 
                          placeholder={index === 0 ? 'Opção Correta...' : `Opção Incorreta ${index}...`} 
                          value={alt.text} 
                          onChange={e => {
                            const newText = e.target.value;
                            setNewQAlts(prev => prev.map((a, i) => i === index ? { ...a, text: newText } : a));
                          }}
                          className="input-glow py-1 px-2 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleAddQuestion}
                  className="btn-glow py-2 w-full text-xs mt-2 justify-center"
                >
                  <Plus className="w-4 h-4" /> Salvar Pergunta
                </button>
              </div>

              {/* Rodapé: Contagem */}
              <div className="text-xs text-[hsl(var(--text-muted))] text-center pt-2 border-t border-[rgba(255,255,255,0.05)]">
                Total de perguntas no banco: {questions.length}
              </div>
            </div>

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
                    Jogadores na Sala ({activePlayers.length})
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                    {activePlayers.map((player) => (
                      <div key={player.id} className="p-3 bg-white/5 border border-[rgba(255,255,255,0.05)] rounded-xl flex justify-between items-center transition hover:border-[rgba(255,255,255,0.1)]">
                        <span className="font-semibold text-sm text-[hsl(var(--text-primary))]">{player.nickname}</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
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
                        <span className="font-semibold text-sm text-[hsl(var(--text-primary))]">{player.nickname}</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
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

            {/* Controles */}
            <div className="flex justify-between items-center gap-4 pt-4 border-t border-[rgba(255,255,255,0.05)]">
              <button 
                onClick={() => { setScreen(role === 'operator' ? 'operator-dashboard' : 'welcome'); sfx.playClick(); }}
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
          <div className="max-w-4xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LADO ESQUERDO: CONTROLES DO HOST / ROLETAS / TIMER */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* STATUS DO JOGO */}
              <div className="glass-card p-4 flex justify-between items-center">
                <span className="text-xs font-bold text-[hsl(var(--secondary))] uppercase">
                  Rodada {currentRoundIndex} de {gameRounds}
                </span>
                <span className="px-3 py-1 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] text-xs font-extrabold rounded-full tracking-wider uppercase">
                  Modo {gameMode === 'duel' ? 'Duelo' : gameMode === 'team' ? 'Times' : 'Aberto'}
                </span>
              </div>

              {/* ROLETA DE CATEGORIAS */}
              {roundState === 'idle' || roundState === 'spinning' ? (
                <div className="glass-card p-8 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
                  <h3 className="text-lg font-bold mb-4 text-[hsl(var(--text-secondary))]">Roleta das Categorias</h3>
                  
                  {/* ===== ROLETA PREMIUM ===== */}
                  <div style={{ position: 'relative', width: '320px', height: '320px', margin: '0 auto 24px auto' }}>

                    {/* Ponteiro Seta — lateral direita apontando para esquerda */}
                    <div style={{
                      position: 'absolute',
                      right: '-28px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 30,
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                    }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                        <path d="M22 4L4 12L22 20V4Z" fill="white" stroke="#444" strokeWidth="1.5" strokeLinejoin="round"/>
                      </svg>
                    </div>

                    {/* Disco Giratório com Conic Gradient */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '320px',
                      height: '320px',
                      borderRadius: '50%',
                      border: '5px solid white',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                      transform: `rotate(${rouletteAngle}deg)`,
                      transition: isSpinning ? 'transform 3.5s cubic-bezier(0.1, 0.8, 0.1, 1)' : 'none',
                      background: categories.length > 0
                        ? `conic-gradient(${categories.map((c, i) => `${c.color} ${i * (360 / categories.length)}deg ${(i + 1) * (360 / categories.length)}deg`).join(', ')})`
                        : '#555',
                      overflow: 'hidden'
                    }}>
                      {/* Textos radiais dentro do disco */}
                      {categories.map((cat, i) => {
                        const angle = i * (360 / categories.length) + (180 / categories.length);
                        return (
                          <div key={cat.id} style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            width: '130px',
                            height: '24px',
                            transformOrigin: '0% 50%',
                            transform: `translate(0%, -50%) rotate(${angle}deg)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            paddingRight: '18px',
                          }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '800',
                              color: 'white',
                              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                              letterSpacing: '0.02em',
                              whiteSpace: 'nowrap',
                            }}>
                              {cat.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pino Central Branco (Donut) */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'white',
                      zIndex: 20,
                      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.3)',
                      border: '3px solid rgba(0,0,0,0.05)'
                    }} />
                  </div>

                  {role === 'operator' && roundState === 'idle' && (
                    <button 
                      onClick={handleSpinRoulette}
                      disabled={isSpinning}
                      className="btn-glow animate-pulse-glow"
                    >
                      Girar Roleta!
                    </button>
                  )}

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
              {(roundState === 'question' || roundState === 'answered') && currentQuestion && (
                <div className="glass-card p-6 flex flex-col gap-6">
                  {/* Categoria Sorteada */}
                  <div className="flex justify-between items-center">
                    <span 
                      className="px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-md"
                      style={{ backgroundColor: selectedCategory?.color }}
                    >
                      {selectedCategory?.name}
                    </span>

                    {/* Cronômetro Circular Editável */}
                    <div className="flex items-center gap-3">
                      {role === 'operator' && roundState === 'question' && (
                        <div className="flex gap-1.5">
                          <button onClick={() => adjustTimer(-5)} className="px-2 py-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded font-mono text-[10px] text-red-400 hover:bg-[rgba(255,255,255,0.1)]">-5s</button>
                          <button onClick={() => adjustTimer(5)} className="px-2 py-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded font-mono text-[10px] text-emerald-400 hover:bg-[rgba(255,255,255,0.1)]">+5s</button>
                        </div>
                      )}
                      
                      <div className="relative w-12 h-12 flex items-center justify-center rounded-full border border-[rgba(255,255,255,0.1)]">
                        <Clock className="w-4 h-4 text-[hsl(var(--text-secondary))] absolute left-1.5 top-1.5 opacity-40" />
                        <span className="font-mono font-bold text-sm text-[hsl(var(--secondary))]">
                          {timeLeft}s
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Enunciado */}
                  <h3 className="text-xl font-bold text-white leading-relaxed">
                    {currentQuestion.question_text}
                  </h3>

                  {/* Alternativas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {currentQuestion.alternatives.map((alt, index) => {
                      const isSelectedBySelf = playerAnswered === alt.text;
                      const showAnswers = roundState === 'answered';
                      const isCorrectAnswer = alt.isCorrect;
                      
                      let cardStyle = "border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)] text-[hsl(var(--text-secondary))]";
                      
                      if (role === 'player' && !showAnswers) {
                        cardStyle = isSelectedBySelf 
                          ? "border-[hsl(var(--primary))] bg-[hsla(var(--primary),0.08)] text-white"
                          : "border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)] hover:border-white/10 hover:bg-white/[0.02]";
                      }

                      if (showAnswers) {
                        if (isCorrectAnswer) {
                          cardStyle = "border-emerald-500 bg-emerald-500/10 text-emerald-300";
                        } else if (isSelectedBySelf) {
                          cardStyle = "border-red-500 bg-red-500/10 text-red-300";
                        } else {
                          cardStyle = "border-[rgba(255,255,255,0.03)] bg-[rgba(255,255,255,0.005)] opacity-50";
                        }
                      }

                      return (
                        <button
                          key={index}
                          disabled={role !== 'player' || showAnswers || playerAnswered !== null}
                          onClick={() => handlePlayerAnswer(index)}
                          className={`w-full p-4 rounded-xl border text-left font-semibold text-sm transition flex justify-between items-center ${cardStyle}`}
                        >
                          <span>{alt.text}</span>
                          
                          {showAnswers && isCorrectAnswer && (
                            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                          )}
                          {showAnswers && !isCorrectAnswer && isSelectedBySelf && (
                            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Painel de Respostas dos Competidores (Visível apenas para o Host/Operador) */}
                  {role === 'operator' && (
                    <div className="mt-4 p-5 rounded-2xl border border-[rgba(255,255,255,0.04)] bg-white/5 flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-[hsl(var(--text-secondary))] uppercase tracking-wider">
                          Respostas Coletadas: <span className="font-mono text-sm text-[hsl(var(--accent))]">{totalAnswered} / {activePlayers.length}</span>
                        </h4>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full animate-pulse">
                          Realtime ativo
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-3">
                        {ANSWER_COLORS.map((col, idx) => {
                          const count = roomAnswers[idx] || 0;
                          const pct = totalAnswered > 0 ? Math.round((count / totalAnswered) * 100) : 0;
                          return (
                            <div key={idx} className="flex flex-col items-center gap-2 p-3 bg-white/5 border border-[rgba(255,255,255,0.02)] rounded-xl relative overflow-hidden">
                              <span className="text-xs font-black text-white/80">{['A', 'B', 'C', 'D'][idx]}</span>
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: col.bg }} />
                              <div className="text-lg font-black text-white">{count}</div>
                              <div className="text-[10px] font-mono text-[hsl(var(--text-secondary))]">{pct}%</div>
                              {/* Barra de progresso sutil no fundo */}
                              <div 
                                style={{ 
                                  position: 'absolute', bottom: 0, left: 0, right: 0, 
                                  height: '4px', backgroundColor: col.bg,
                                  width: `${pct}%`, transition: 'width 0.3s ease'
                                }} 
                              />
                            </div>
                          );
                        })}
                      </div>
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
                <div className="glass-card p-6 flex flex-col gap-4">
                  <h3 className="text-lg font-bold border-b border-[rgba(255,255,255,0.05)] pb-3 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    Placar da Rodada {currentRoundIndex}
                  </h3>

                  <div className="flex flex-col gap-3">
                    {sortedPlayers.map((p, idx) => (
                      <div key={p.id} className="flex justify-between items-center p-3.5 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-xs font-bold text-[hsl(var(--text-secondary))]">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-sm">{p.nickname}</span>
                        </div>
                        <span className="font-mono text-sm font-extrabold text-[hsl(var(--secondary))]">
                          {p.score} pts
                        </span>
                      </div>
                    ))}
                  </div>

                  {role === 'operator' && (
                    <button 
                      onClick={handleNextRound}
                      className="btn-glow w-full justify-center mt-3 py-3"
                    >
                      {currentRoundIndex < gameRounds ? 'Avançar para Próxima Rodada' : 'Finalizar Partida e Ver Vencedores!'}
                    </button>
                  )}
                </div>
              )}

            </div>

            {/* LADO DIREITO: LATERAL INFO / JOGADORES NA PARTIDA */}
            <div className="glass-card p-6 flex flex-col gap-4 h-fit">
              <h3 className="text-md font-bold border-b border-[rgba(255,255,255,0.05)] pb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-[hsl(var(--primary))]" />
                Lobby Ativo ({activePlayers.length})
              </h3>
              
              <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                {activePlayers.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-2.5 bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.03)] rounded-lg">
                    <span className="text-xs font-semibold text-[hsl(var(--text-secondary))] truncate">{p.nickname}</span>
                    <span className="text-xs font-mono font-bold text-[hsl(var(--text-muted))]">{p.score} pts</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ==========================================
            5. O PÓDIO DE CAMPEÕES (PODIUM)
            ========================================== */}
        {screen === 'podium' && (
          <div className="max-w-3xl mx-auto w-full glass-card p-10 flex flex-col gap-8 text-center relative overflow-hidden">
            
            {/* Raios de luz e celebração */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-b from-[hsla(var(--primary),0.2)] to-transparent rounded-full filter blur-3xl pointer-events-none" />

            <div>
              <span className="text-xs font-bold text-[hsl(var(--secondary))] tracking-widest uppercase">
                Fim do Desafio
              </span>
              <h2 className="text-4xl font-extrabold mt-1 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
                Grandes Campeões!
              </h2>
            </div>

            {/* PÓDIO 3D REAL-TIME */}
            <div className="flex flex-col md:flex-row justify-center items-end gap-6 md:gap-4 my-10 pt-16 min-h-[300px]">
              
              {/* 2º LUGAR */}
              {secondPlace && (
                <div className="flex flex-col items-center flex-1 w-full md:w-auto animate-bounce-gentle" style={{ animationDelay: '0.2s' }}>
                  <div className="w-14 h-14 rounded-full bg-slate-400/20 border-2 border-slate-300 flex items-center justify-center font-bold text-white shadow-lg mb-2 relative">
                    <Crown className="w-4 h-4 text-slate-300 absolute -top-3.5 rotate-[-12deg]" />
                    2
                  </div>
                  <span className="font-bold text-sm max-w-[120px] truncate mb-2">{secondPlace.nickname}</span>
                  <div className="w-32 bg-slate-700/40 border border-slate-500/20 rounded-t-xl py-6 flex flex-col items-center shadow-lg">
                    <span className="text-2xl font-black text-slate-300">2º</span>
                    <span className="text-[10px] font-mono font-bold text-slate-400">{secondPlace.score} pts</span>
                  </div>
                </div>
              )}

              {/* 1º LUGAR */}
              {firstPlace && (
                <div className="flex flex-col items-center flex-1 w-full md:w-auto animate-bounce-gentle">
                  <div className="w-18 h-18 rounded-full bg-yellow-500/20 border-4 border-yellow-400 flex items-center justify-center font-black text-white shadow-2xl mb-2 relative scale-110">
                    <Crown className="w-6 h-6 text-yellow-400 absolute -top-5.5 animate-pulse" />
                    1
                  </div>
                  <span className="font-bold text-base max-w-[140px] truncate mb-2">{firstPlace.nickname}</span>
                  <div className="w-36 bg-gradient-to-t from-yellow-600/30 to-yellow-500/10 border border-yellow-400/30 rounded-t-2xl py-10 flex flex-col items-center shadow-2xl">
                    <span className="text-4xl font-black text-yellow-400">1º</span>
                    <span className="text-xs font-mono font-bold text-yellow-300">{firstPlace.score} pts</span>
                  </div>
                </div>
              )}

              {/* 3º LUGAR */}
              {thirdPlace && (
                <div className="flex flex-col items-center flex-1 w-full md:w-auto animate-bounce-gentle" style={{ animationDelay: '0.4s' }}>
                  <div className="w-12 h-12 rounded-full bg-amber-800/20 border-2 border-amber-600 flex items-center justify-center font-bold text-white shadow-lg mb-2 relative">
                    <Crown className="w-3.5 h-3.5 text-amber-600 absolute -top-3 rotate-[12deg]" />
                    3
                  </div>
                  <span className="font-bold text-xs max-w-[100px] truncate mb-2">{thirdPlace.nickname}</span>
                  <div className="w-28 bg-amber-900/30 border border-amber-700/20 rounded-t-xl py-4 flex flex-col items-center shadow-lg">
                    <span className="text-xl font-black text-amber-600">3º</span>
                    <span className="text-[10px] font-mono font-bold text-amber-500">{thirdPlace.score} pts</span>
                  </div>
                </div>
              )}

            </div>

            {/* Ações */}
            <div className="flex justify-center gap-4 pt-6 border-t border-[rgba(255,255,255,0.05)]">
              <button 
                onClick={() => {
                  setScreen('welcome');
                  setRoundState('idle');
                  setActivePlayers([]);
                  setSelectedCategory(null);
                  setCurrentQuestion(null);
                  sfx.playClick();
                }}
                className="btn-glow"
              >
                <RotateCcw className="w-4 h-4" /> Jogar Novamente
              </button>
            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="text-center py-4 border-t border-[hsl(var(--border-color))] mt-6 text-xs text-[hsl(var(--text-muted))] flex flex-col sm:flex-row justify-between items-center gap-2">
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
    </div>
  );
}
