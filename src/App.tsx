// Quizziando - Arena Realtime Arena - Produção Supabase Habilitada
import { useState, useEffect, useRef } from 'react';
import { 
  Trophy, Play, Plus, Trash, User, Users, Volume2, VolumeX, 
  Clock, CheckCircle, XCircle, RotateCcw, 
  Crown, Sparkles, List, BookOpen, ChevronRight, AlertCircle,
  Lock, Eye, EyeOff, LogOut, ShieldCheck, Mail, Copy,
  Pencil, Check, X, Settings, Upload, FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from './lib/supabaseClient';
import PlayerView, { ANSWER_COLORS } from './PlayerView';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

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
  time_limit?: number;
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
  const [useRealSupabase] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gameTheme, setGameTheme] = useState(() => localStorage.getItem('gameTheme') || 'default');

  // Estados de Categorias (declarados aqui para o useEffect)
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  
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
        try {
          // 1. Carregar Categorias
          const { data: catData } = await supabase
            .from('categories')
            .select('*');
          if (catData && catData.length > 0) {
            const mappedCats = catData.map(c => ({
              id: c.id,
              name: c.name,
              color: c.color,
              icon: c.icon
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
  }, [useRealSupabase]);

  // Telas: 'welcome' | 'operator-dashboard' | 'game-lobby' | 'game-play' | 'podium'
  const [screen, setScreen] = useState<'welcome' | 'operator-dashboard' | 'game-lobby' | 'game-play' | 'podium'>('welcome');
  const [podiumStep, setPodiumStep] = useState(0); // 0: cortina, 1: abre, 2: 3º lugar, 3: 2º lugar, 4: 1º lugar
  const [role, setRole] = useState<'operator' | 'player'>('player');
  const [nickname, setNickname] = useState('');
  const [teamName, setTeamName] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');

  // Sincronizar estado de som com a classe de efeitos sonoros
  useEffect(() => {
    sfx.enabled = soundEnabled;
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
  const [authUser, setAuthUser] = useState<{ email: string } | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Estados de Configuração do Painel do Operador
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#EC4899');
  
  // Estados para Edição de Categorias
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingCatColor, setEditingCatColor] = useState('');
  
  // Estados para Modal de Configurações
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<'general' | 'ai' | 'account' | 'questions'>('general');
  
  // Estados para Integração Gemini IA
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '');
  const [geminiModel, setGeminiModel] = useState(() => localStorage.getItem('geminiModel') || 'gemini-1.5-flash');
  const [managerTab, setManagerTab] = useState<'manual' | 'ai'>('manual');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiQuantity, setAiQuantity] = useState<number>(1);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiError, setAiError] = useState('');
  const [aiTestStatus, setAiTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [aiTestingKey, setAiTestingKey] = useState(false);

  // Função para testar conexão com o Gemini
  const testGeminiConnection = async (keyToTest: string) => {
    if (!keyToTest.trim()) {
      setAiTestStatus('error');
      return;
    }
    setAiTestingKey(true);
    setAiTestStatus('idle');
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
        localStorage.setItem('geminiApiKey', keyToTest);
      } else {
        setAiTestStatus('error');
      }
    } catch (e) {
      setAiTestStatus('error');
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
${contextText ? `Use o seguinte contexto extraído de um documento PDF do usuário para embasar a(s) questão(ões):
---
${contextText.slice(0, 10000)}
---` : ''}
REGRAS IMPORTANTES PARA A GERAÇÃO:
1. Enunciado da Questão (Pergunta): Limite de 120 caracteres. Seja objetivo, curto e direto, sem longos textos de contextualização.
2. Alternativas de Resposta: Limite de 75 caracteres por alternativa.
3. Alterne sempre a posição das alternativas corretas no array.
4. Seja o mais objetivo possível e priorize respostas claras e pequenas.
5. As alternativas corretas não devem ser sempre as que possuem maior número de caracteres.

Você DEVE retornar a resposta estritamente no formato de um ARRAY JSON, sem qualquer outro texto, blocos de código markdown (\`\`\`json) ou comentários.
Estrutura JSON:
[
  {
    "question_text": "Escreva aqui o enunciado da questão...",
    "time_limit": 20,
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
5. As perguntas e alternativas sejam desafiadoras, claras, corretas e redigidas em português do Brasil.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        })
      });

      if (!response.ok) {
        throw new Error(`Falha na API do Gemini: ${response.statusText} (${response.status})`);
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
        if (correctCount !== 1) {
          parsed.alternatives.forEach((a: any, idx: number) => {
            a.isCorrect = idx === 0;
          });
        }

        let savedQuestionId = Math.random().toString();
        const updatedAlts = parsed.alternatives.map((alt: any) => ({
          text: alt.text,
          isCorrect: alt.isCorrect
        }));

        if (useRealSupabase) {
          const { data: qData, error: qError } = await supabase
            .from('questions')
            .insert({
              category_id: managerQCatId,
              question_text: parsed.question_text.trim(),
              time_limit: parsed.time_limit || 20
            })
            .select()
            .single();

          if (qError || !qData) {
            throw new Error('Erro ao cadastrar pergunta no banco: ' + (qError?.message || 'Sem dados'));
          }

          savedQuestionId = qData.id.toString();

          const { error: insError } = await supabase
            .from('alternatives')
            .insert(
              updatedAlts.map((alt: any) => ({
                question_id: savedQuestionId,
                alternative_text: alt.text.trim(),
                is_correct: alt.isCorrect
              }))
            );

          if (insError) {
            await supabase.from('questions').delete().eq('id', savedQuestionId);
            throw new Error('Erro ao cadastrar alternativas no banco: ' + insError.message);
          }
        }

        newQuestions.push({
          id: savedQuestionId,
          category_id: managerQCatId,
          question_text: parsed.question_text.trim(),
          time_limit: parsed.time_limit || 20,
          alternatives: updatedAlts
        });
      }

      if (newQuestions.length === 0) {
        throw new Error('Nenhuma questão válida foi gerada.');
      }

      // Adicionar as novas questões ao estado
      setQuestions(prev => [...newQuestions, ...prev]);

      sfx.playCorrect();
      setAiPrompt('');
      setAiFile(null);
      setAiQuantity(1);
      alert(`${newQuestions.length} questão(ões) gerada(s) e salva(s) com sucesso!`);
      
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
  const [activePlayers, setActivePlayers] = useState<GamePlayer[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(1);
  const [usedQuestionIds, setUsedQuestionIds] = useState<string[]>([]);
  
  // Status da rodada ativa: 'idle' | 'spinning' | 'category-reveal' | 'question-reveal' | 'question' | 'answered' | 'ranking'
  const [roundState, setRoundState] = useState<'idle' | 'spinning' | 'category-reveal' | 'question-reveal' | 'question' | 'answered' | 'ranking'>('idle');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [timerRunning, setTimerRunning] = useState(false);
  const [playerAnswered, setPlayerAnswered] = useState<string | null>(null);
  
  // Efeito de Rotação da Roleta
  const [roundTransitionMessage, setRoundTransitionMessage] = useState<{ title: string, subtitle: string } | null>(null);
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

  // Controle de expansão do painel de Lobby (retrátil)
  const [isLobbyExpanded, setIsLobbyExpanded] = useState(false);

  // Controle de expansão do painel de respostas/votos (retrátil)
  const [isAnswersPanelExpanded, setIsAnswersPanelExpanded] = useState(true);

  // Temas visuais e geométricos baseados no Kahoot para as alternativas (inline styles)
  const KAHOOT_THEMES = [
    { gradient: 'linear-gradient(135deg, #e21b3c 0%, #b11029 100%)', icon: '▲', color: '#e21b3c', shadow: 'rgba(226,27,60,0.5)' },
    { gradient: 'linear-gradient(135deg, #1368ce 0%, #0d4a94 100%)', icon: '◆', color: '#1368ce', shadow: 'rgba(19,104,206,0.5)' },
    { gradient: 'linear-gradient(135deg, #d89e00 0%, #a07500 100%)', icon: '●', color: '#d89e00', shadow: 'rgba(216,158,0,0.5)' },
    { gradient: 'linear-gradient(135deg, #26890c 0%, #1a5f08 100%)', icon: '■', color: '#26890c', shadow: 'rgba(38,137,12,0.5)' }
  ];

  // Flag: se está na tela de jogo ativo (fullscreen)
  const isGamePlayFullscreen = screen === 'game-play';

  // Variáveis calculadas dinamicamente com base no estado do lobby retrátil
  const wheelSize = isLobbyExpanded ? 380 : 700;
  const radius = wheelSize / 2;
  const innerTranslate = wheelSize * 0.15;
  const textBoxWidth = radius - innerTranslate - 16;
  const textBoxHeight = wheelSize * 0.075;
  const fontSize = isLobbyExpanded ? '12px' : '18px';


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
          
          if (ans.is_correct) {
            setActivePlayers(prev => prev.map(p => {
              if (p.nickname === ans.player_nickname) {
                const newScore = p.score + (ans.points_earned || 100);
                // Atualizar o banco de dados para evitar que celulares fiquem dessincronizados ao dar refresh
                supabase.from('room_players').update({ score: newScore })
                  .eq('room_code', roomCode)
                  .eq('nickname', p.nickname)
                  .then();
                
                return { ...p, score: newScore };
              }
              return p;
            }));
          }
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
  
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    if (categories.length >= 20) {
      alert('Você atingiu o limite máximo de 20 categorias!');
      return;
    }
    
    let newCat: Category = {
      id: Math.random().toString(),
      name: newCatName.trim(),
      color: newCatColor,
      icon: 'HelpCircle'
    };

    if (useRealSupabase) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .insert({
            name: newCat.name,
            color: newCat.color,
            icon: newCat.icon
          })
          .select()
          .single();

        if (error) {
          alert('Erro ao salvar categoria no banco: ' + error.message);
          return;
        }
        if (data) {
          newCat = {
            id: data.id.toString(),
            name: data.name,
            color: data.color,
            icon: data.icon
          };
        }
      } catch (err: any) {
        alert('Erro de conexão ao salvar categoria: ' + err.message);
        return;
      }
    }

    setCategories([...categories, newCat]);
    setNewCatName('');
    sfx.playCorrect();
  };

  const handleDeleteCategory = async (id: string) => {
    if (useRealSupabase) {
      try {
        const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', id);
        
        if (error) {
          alert('Erro ao excluir categoria do banco: ' + error.message);
          return;
        }
      } catch (err: any) {
        alert('Erro de conexão ao excluir categoria: ' + err.message);
        return;
      }
    }
    setCategories(categories.filter(c => c.id !== id));
    sfx.playClick();
  };

  const handleSaveCategoryEdit = async (id: string) => {
    if (!editingCatName.trim()) {
      alert('O nome da categoria não pode ser vazio!');
      return;
    }

    if (useRealSupabase) {
      try {
        const { error } = await supabase
          .from('categories')
          .update({
            name: editingCatName.trim(),
            color: editingCatColor
          })
          .eq('id', id);

        if (error) {
          alert('Erro ao atualizar categoria no banco: ' + error.message);
          return;
        }
      } catch (err: any) {
        alert('Erro de conexão ao atualizar categoria: ' + err.message);
        return;
      }
    }

    setCategories(categories.map(c => c.id === id ? { ...c, name: editingCatName.trim(), color: editingCatColor } : c));
    setEditingCatId(null);
    sfx.playCorrect();
  };

  const startEditCategory = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
    setEditingCatColor(cat.color);
    sfx.playClick();
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

    let savedQuestionId = editingQuestionId || Math.random().toString();
    const updatedAlts = [...managerQAlts];

    if (useRealSupabase) {
      try {
        if (editingQuestionId) {
          // Atualizar pergunta existente
          const { error: qError } = await supabase
            .from('questions')
            .update({
              category_id: managerQCatId,
              question_text: managerQText.trim(),
              time_limit: managerQTimeLimit
            })
            .eq('id', editingQuestionId);

          if (qError) {
            alert('Erro ao atualizar pergunta no banco: ' + qError.message);
            return;
          }

          // Deletar alternativas anteriores
          const { error: delError } = await supabase
            .from('alternatives')
            .delete()
            .eq('question_id', editingQuestionId);

          if (delError) {
            alert('Erro ao atualizar alternativas no banco (limpeza): ' + delError.message);
            return;
          }

          // Inserir novas alternativas
          const { error: insError } = await supabase
            .from('alternatives')
            .insert(
              updatedAlts.map(alt => ({
                question_id: editingQuestionId,
                alternative_text: alt.text.trim(),
                is_correct: alt.isCorrect
              }))
            );

          if (insError) {
            alert('Erro ao atualizar alternativas no banco (inserção): ' + insError.message);
            return;
          }
        } else {
          // Inserir nova pergunta
          const { data: qData, error: qError } = await supabase
            .from('questions')
            .insert({
              category_id: managerQCatId,
              question_text: managerQText.trim(),
              time_limit: managerQTimeLimit
            })
            .select()
            .single();

          if (qError || !qData) {
            alert('Erro ao cadastrar pergunta no banco: ' + (qError?.message || 'Sem dados'));
            return;
          }

          savedQuestionId = qData.id.toString();

          // Inserir alternativas
          const { error: insError } = await supabase
            .from('alternatives')
            .insert(
              updatedAlts.map(alt => ({
                question_id: savedQuestionId,
                alternative_text: alt.text.trim(),
                is_correct: alt.isCorrect
              }))
            );

          if (insError) {
            alert('Erro ao cadastrar alternativas no banco: ' + insError.message);
            // Rollback da pergunta criada para evitar órfãs
            await supabase.from('questions').delete().eq('id', savedQuestionId);
            return;
          }
        }
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
      sfx.playLobby();
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

  const handleStartMatch = async () => {
    sfx.playClick();
    sfx.stopLobby();
    setCurrentRoundIndex(1);
    setUsedQuestionIds([]);
    setRoundState('idle');
    setRoomAnswers([0, 0, 0, 0]);
    setTotalAnswered(0);
    await publishRoomState({ status: 'playing', round_state: 'idle', current_round: 1 });
    setScreen('game-play');
  };


  // Girar a Roleta de Categorias
  const handleSpinRoulette = async () => {
    if (selectedCategoryIds.length === 0) {
      alert('Adicione pelo menos uma categoria antes de rodar!');
      return;
    }
    sfx.playSpin();
    setIsSpinning(true);
    setRoundState('spinning');
    
    // Publicar o estado de giro imediatamente no Supabase para os jogadores verem a animação
    if (useRealSupabase) {
      await publishRoomState({
        round_state: 'spinning',
        current_round: currentRoundIndex
      });
    }
    
    // Gerar um giro aleatório
    const numSpins = 4 + Math.random() * 4;
    const finalAngle = rouletteAngle + numSpins * 360 + Math.random() * 360;
    setRouletteAngle(finalAngle);
    
    setTimeout(async () => {
      setIsSpinning(false);
      sfx.playGameSound();
      
      // Determinar a categoria selecionada com base no ângulo final e na seta à direita (3 horas / 90 graus)
      const selectedCats = categories.filter(c => selectedCategoryIds.includes(c.id));
      const normalizedAngle = (90 - (finalAngle % 360) + 360) % 360;
      const index = Math.floor((normalizedAngle / 360) * selectedCats.length);
      const cat = selectedCats[index] || selectedCats[0];
      
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

      // ⏳ Aguardar 2 segundos exibindo a roleta parada antes de revelar a categoria
      setTimeout(async () => {
        // Publicar categoria e pergunta no Supabase para os jogadores verem
        await publishRoomState({
          round_state: 'category-reveal',
          current_round: currentRoundIndex,
          selected_category: cat,
          current_question: selectedQ,
        });

        setRoundState('category-reveal');
        setTimeout(async () => {
          setRoundState('question-reveal');
          await publishRoomState({ round_state: 'question-reveal' });
          setTimeout(async () => {
            setRoundState('question');
            setTimeLeft(selectedQ.time_limit || gameTimeLimit);
            setTimerRunning(true);
            setPlayerAnswered(null);
            setRoomAnswers([0, 0, 0, 0]);
            setTotalAnswered(0);
            await publishRoomState({ round_state: 'question' });
          }, 5000);
        }, 2200);
      }, 2000);

    }, 4000);
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
    sfx.stopGameSound();
    setTimerRunning(false);
    setRoundState('answered');
    await publishRoomState({ round_state: 'answered' });
    
    // Simular respostas e scores para outros jogadores do lobby (bots) no modo demo
    if (!useRealSupabase) {
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

      setTimeout(async () => {
        setRoundTransitionMessage(null);
        setCurrentRoundIndex(nextRound);
        setRoundState('idle');
        setSelectedCategory(null);
        setCurrentQuestion(null);
        await publishRoomState({ round_state: 'idle', current_round: nextRound });
      }, 2500);
    } else {
      // Fim do jogo! Chamar Pódio de Suspense
      setScreen('podium');
      setPodiumStep(0);
      await publishRoomState({ status: 'finished', round_state: 'idle' });
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
    <div className={`min-h-screen flex flex-col justify-between ${isGamePlayFullscreen ? '' : 'app-container'}`}
      style={isGamePlayFullscreen ? { maxWidth: '100%', margin: 0, padding: '0' } : undefined}
    >
      {/* HEADER PREMIUM — oculto durante game-play fullscreen */}
      <header className="flex justify-between items-center py-4 border-b border-[hsl(var(--border-color))] mb-6"
        style={isGamePlayFullscreen ? { display: 'none' } : undefined}
      >
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Quizziando Logo" className="animate-bounce-gentle" style={{ height: '44px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(124, 58, 237, 0.45))' }} />
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-[hsl(var(--text-primary))] to-[hsl(var(--secondary))] bg-clip-text text-transparent">
              Quizziando
            </h1>
            <span className="text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider font-semibold">
              Live Realtime Arena
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 relative">
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
                  width: '100%', maxWidth: '680px',
                  height: '600px',
                  background: 'rgba(8,12,28,0.96)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '20px',
                  boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 60px rgba(124,58,237,0.15)',
                  display: 'flex', flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  animation: 'slideUpModal 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-white/5">
                  <h3 className="text-base font-extrabold text-white tracking-wide uppercase font-sans">
                    Configurações
                  </h3>
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition-all duration-200 border border-transparent hover:border-white/10"
                    title="Fechar Configurações"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body (Sidebar + Content) */}
                <div className="flex flex-1 overflow-hidden">
                  {/* Sidebar */}
                  <div className="w-1/3 border-r border-white/5 bg-[#080c1c]/40 p-3 flex flex-col gap-1">
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
                  <div className="w-2/3 p-6 overflow-y-auto">
                    {settingsActiveTab === 'general' && (
                      <div className="flex flex-col gap-6 animate-fade-in">
                        <div className="flex flex-col gap-4">
                          <div>
                            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">Efeitos Sonoros</h4>
                            <p className="text-[11px] text-slate-400">Ative ou desative o feedback sonoro do aplicativo.</p>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg transition-colors ${soundEnabled ? 'bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))]' : 'bg-red-500/20 text-red-400'}`}>
                                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                              </div>
                              <div className="flex flex-col text-left">
                                <span className="block text-sm font-bold text-white leading-tight">Sons da Arena</span>
                                <span className="block text-[10.5px] text-slate-400 leading-tight mt-0.5">{soundEnabled ? 'O som está ativado' : 'O som está desativado'}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => { setSoundEnabled(!soundEnabled); sfx.playClick(); }}
                              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
                                soundEnabled ? 'bg-[hsl(var(--primary))]' : 'bg-slate-700'
                              }`}
                            >
                              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                                soundEnabled ? 'translate-x-5' : 'translate-x-0'
                              }`} />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col gap-4 mt-2">
                          <div>
                            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">Temas da Arena</h4>
                            <p className="text-[11px] text-slate-400">Personalize a imagem de fundo da Roleta.</p>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {Object.entries(GAME_THEMES).map(([key, theme]) => (
                              <button
                                key={key}
                                onClick={() => { setGameTheme(key); localStorage.setItem('gameTheme', key); sfx.playClick(); }}
                                className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                                  gameTheme === key
                                    ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 shadow-[0_0_15px_rgba(124,58,237,0.2)]'
                                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                                }`}
                              >
                                <div 
                                  className="w-full h-12 rounded-lg border border-white/10 bg-cover bg-center shadow-inner" 
                                  style={{ backgroundColor: theme.bg !== 'transparent' ? theme.bg : undefined, backgroundImage: theme.img }}
                                ></div>
                                <span className={`text-[10px] font-bold ${gameTheme === key ? 'text-[hsl(var(--primary))]' : 'text-slate-300'}`}>
                                  {theme.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                      </div>
                    )}

                    {settingsActiveTab === 'questions' && (role === 'operator' || authUser) && (
                      <div className="flex flex-col gap-6 animate-fade-in">
                        <div>
                          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">Banco de Questões</h4>
                          <p className="text-[11px] text-slate-400">Gerencie as perguntas do quiz.</p>
                        </div>
                        <button
                          onClick={() => {
                            setShowQuestionManagerModal(true);
                            setShowSettingsModal(false);
                            sfx.playClick();
                          }}
                          className="group relative w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 border border-indigo-500/20 hover:border-purple-500/40 transition-all duration-300 overflow-hidden shadow-lg shadow-indigo-500/5"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                          <div className="flex items-center gap-3 relative z-10">
                            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                              <BookOpen className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="block text-sm font-bold text-white leading-tight group-hover:text-indigo-300 transition-colors">Abrir Gerenciador de Questões</span>
                              <span className="block text-[10.5px] text-indigo-300/70 font-medium leading-tight mt-0.5">Adicione, edite ou remova perguntas</span>
                            </div>
                          </div>
                          <div className="relative z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                            <ChevronRight className="w-4 h-4 translate-x-0.5" />
                          </div>
                        </button>
                      </div>
                    )}

                    {settingsActiveTab === 'ai' && (
                      <div className="flex flex-col gap-4 animate-fade-in">
                        <div>
                          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">Integração Gemini AI</h4>
                          <p className="text-[11px] text-slate-400">Configure a chave de acesso e o modelo preditivo.</p>
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
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase">Modelo do Gemini</label>
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
                            </select>
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
                              <span className="px-3 py-1.5 bg-red-500/10 text-red-400 text-xs font-bold rounded-lg border border-red-500/20">
                                ✗ Chave Inválida
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {settingsActiveTab === 'account' && (
                      <div className="flex flex-col gap-4 animate-fade-in">
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
      <main className={`flex-grow flex flex-col justify-center ${isGamePlayFullscreen ? 'py-0' : 'py-4'}`}>
        
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
            {/* Esquerda: Novo Quiz */}
            <div className="glass-card p-6 flex flex-col gap-5 h-fit">
              <h3 className="text-lg font-bold border-b border-[rgba(255,255,255,0.05)] pb-3 flex items-center gap-2">
                <Play className="w-5 h-5 text-[hsl(var(--primary))]" />
                Iniciar Novo Quiz
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
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox"
                    checked={categories.length > 0 && selectedCategoryIds.length === categories.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCategoryIds(categories.map(c => c.id));
                      } else {
                        setSelectedCategoryIds([]);
                      }
                    }}
                    className="w-4 h-4 rounded accent-[hsl(var(--primary))] cursor-pointer flex-shrink-0 mt-0.5"
                    title="Selecionar todas"
                  />
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <List className="w-5 h-5 text-[hsl(var(--secondary))]" />
                    Categorias Selecionadas ({selectedCategoryIds.length}/{categories.length})
                  </h3>
                </div>
              </div>

              {/* Lista */}
              <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-1">
                {categories.map(cat => {
                  const isEditing = editingCatId === cat.id;
                  return (
                    <div key={cat.id} className="flex justify-between items-center p-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl gap-3">
                      {isEditing ? (
                        <>
                          <div className="flex items-center gap-2 flex-grow">
                            <input 
                              type="color" 
                              value={editingCatColor} 
                              onChange={e => setEditingCatColor(e.target.value)}
                              className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent flex-shrink-0"
                              title="Mudar cor"
                            />
                            <input 
                              type="text" 
                              value={editingCatName} 
                              onChange={e => setEditingCatName(e.target.value)}
                              className="input-glow py-1 px-2 text-xs flex-grow font-semibold"
                              placeholder="Nome da categoria..."
                            />
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button 
                              onClick={() => handleSaveCategoryEdit(cat.id)}
                              className="p-1 text-emerald-400 hover:text-emerald-300 transition"
                              title="Salvar"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setEditingCatId(null)}
                              className="p-1 text-red-400 hover:text-red-300 transition"
                              title="Cancelar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 cursor-pointer flex-grow animate-fade-in">
                            <input 
                              type="checkbox"
                              checked={selectedCategoryIds.includes(cat.id)}
                              onChange={() => handleToggleCategorySelect(cat.id)}
                              className="w-4 h-4 rounded accent-[hsl(var(--primary))] cursor-pointer flex-shrink-0"
                            />
                            <span className="w-3.5 h-3.5 rounded-full flex-shrink-0 transition-transform hover:scale-110" style={{ backgroundColor: cat.color }} onClick={() => startEditCategory(cat)} />
                            <span className="font-semibold text-sm text-[hsl(var(--text-primary))] hover:text-[hsl(var(--primary))] transition-colors truncate" onClick={() => startEditCategory(cat)}>{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button 
                              onClick={() => startEditCategory(cat)}
                              className="p-1 text-[hsl(var(--text-muted))] hover:text-blue-400 transition"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="p-1 text-[hsl(var(--text-muted))] hover:text-red-400 transition"
                              title="Excluir"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" style={{ minHeight: 'calc(100vh - 40px)', alignItems: 'stretch' }}>
            
              {/* LADO ESQUERDO: CONTROLES DO HOST / ROLETAS / TIMER */}
              <div className={`${isLobbyExpanded ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col gap-6 transition-all duration-500`} style={{ minHeight: 0 }}>
                
                {/* STATUS DO JOGO */}
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


              {/* ROLETA DE CATEGORIAS */}
              {roundState === 'idle' || roundState === 'spinning' ? (
                <div style={{ paddingTop: '60px', paddingBottom: '30px', paddingLeft: '24px', paddingRight: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '32px', border: '6px solid rgba(49,46,129,0.8)', position: 'relative', boxShadow: '0 12px 0 rgba(49,46,129,0.8), 0 20px 40px rgba(0,0,0,0.5)', backgroundColor: GAME_THEMES[gameTheme]?.bg || '#2a1b54', backgroundImage: GAME_THEMES[gameTheme]?.img || 'none', backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '350px' }}>
                  
                  {/* Floating Header */}
                  <div style={{ position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ background: 'linear-gradient(to bottom, #8b5cf6, #6d28d9)', border: '4px solid #4c1d95', borderRadius: '9999px', padding: '12px 32px', boxShadow: '0 6px 0 rgba(76,29,149,1)' }}>
                      <h3 style={{ fontSize: '24px', fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0, lineHeight: 1, textShadow: '0 2px 2px rgba(0,0,0,0.5)' }}>
                        Roleta das Categorias
                      </h3>
                    </div>
                  </div>
                  
                  {/* ===== ROLETA PREMIUM ===== */}
                  <div style={{ position: 'relative', width: `${wheelSize}px`, height: `${wheelSize}px`, margin: '0 auto 24px auto', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1), height 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}>

                    {/* Ponteiro Seta — lateral direita apontando para esquerda */}
                    <div style={{
                      position: 'absolute',
                      right: '-12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      transformOrigin: 'right center',
                      zIndex: 30,
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                      animation: isSpinning ? 'pointer-strike 0.1s linear infinite' : 'pointer-idle 2s ease-in-out infinite'
                    }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="#93c572" stroke="white" strokeWidth="2.5" strokeLinejoin="round">
                        <path d="M22 4L4 12L22 20V4Z"/>
                      </svg>
                    </div>

                    {/* Disco Giratório com Conic Gradient */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      border: '6px solid white',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                      transform: `rotate(${rouletteAngle}deg)`,
                      transition: isSpinning ? 'transform 4s cubic-bezier(0.1, 0.8, 0.1, 1)' : 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1), height 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                      background: selectedCategoryIds.length > 0
                        ? `conic-gradient(${categories.filter(c => selectedCategoryIds.includes(c.id)).map((c, i, arr) => `${c.color} ${i * (360 / arr.length)}deg ${(i + 1) * (360 / arr.length)}deg`).join(', ')})`
                        : '#555',
                      overflow: 'hidden'
                    }}>
                      {/* Margens (Linhas Brancas) */}
                      {categories.filter(c => selectedCategoryIds.includes(c.id)).map((cat, i, arr) => {
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
                      {categories.filter(c => selectedCategoryIds.includes(c.id)).map((cat, i, arr) => {
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
                            justifyContent: 'flex-end',
                            paddingRight: isLobbyExpanded ? '15px' : '30px',
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

                      {/* Pontos luminosos nas extremidades */}
                      {Array.from({length: 48}).map((_, i) => (
                        <div key={`dot-${i}`} className="led-dot" style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          transformOrigin: `0% 50%`,
                          transform: `rotate(${i * (360 / 48)}deg) translate(${wheelSize / 2 - 12}px, -50%)`,
                          animationDelay: `${(i % 2) * 0.5}s`
                        }} />
                      ))}
                    </div>

                    {/* Botão Central (Rodar) */}
                    <button 
                      onClick={role === 'operator' && roundState === 'idle' ? handleSpinRoulette : undefined}
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
                          <button onClick={() => adjustTimer(-5)} className="px-2 py-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded font-mono text-[10px] text-red-400 hover:bg-[rgba(255,255,255,0.1)]">-5s</button>
                          <button onClick={() => adjustTimer(5)} className="px-2 py-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded font-mono text-[10px] text-emerald-400 hover:bg-[rgba(255,255,255,0.1)]">+5s</button>
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
                <div style={{ width: '100%', maxWidth: '800px', margin: '40px auto 0', position: 'relative' }}>
                  
                  {/* Floating Header as seen in the image */}
                  <div style={{ position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Crown style={{ width: '48px', height: '48px', color: '#fbbf24', marginBottom: '-10px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
                    <div style={{ background: 'linear-gradient(to bottom, #fbbf24, #d97706)', border: '4px solid #92400e', borderRadius: '9999px', padding: '12px 40px', boxShadow: '0 6px 0 rgba(146,64,14,1)' }}>
                      <h3 style={{ fontSize: '32px', fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0, lineHeight: 1, textShadow: '0 2px 2px rgba(0,0,0,0.5)' }}>
                        Leaderboard
                      </h3>
                    </div>
                  </div>

                  {/* Main Board Container */}
                  <div style={{ paddingTop: '70px', paddingBottom: '30px', paddingLeft: '24px', paddingRight: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '32px', border: '6px solid rgba(49,46,129,0.8)', position: 'relative', boxShadow: '0 12px 0 rgba(49,46,129,0.8), 0 20px 40px rgba(0,0,0,0.5)', backgroundColor: '#2a1b54' }}>
                    
                    <div style={{ position: 'relative', height: `${sortedPlayers.length * 88}px`, width: '100%', zIndex: 10 }}>
                      <AnimatePresence>
                        {sortedPlayers.map((p, idx) => {
                          // Definir cores das medalhas
                          let badgeBg = '#db2777'; let badgeBorder = '#9d174d';
                          if (idx === 0) { badgeBg = '#f59e0b'; badgeBorder = '#b45309'; }
                          else if (idx === 1) { badgeBg = '#94a3b8'; badgeBorder = '#475569'; }
                          else if (idx === 2) { badgeBg = '#ea580c'; badgeBorder = '#9a3412'; }

                          return (
                            <motion.div 
                              key={p.id}
                              initial={{ opacity: 0, x: -50, y: idx * 88 }}
                              animate={{ opacity: 1, x: 0, y: idx * 88 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ 
                                y: { type: "spring", stiffness: 40, damping: 11 }, // Movimento lento e dramático
                                opacity: { duration: 0.2 },
                                x: { type: "spring", stiffness: 300, damping: 25 }
                              }}
                              style={{ 
                                position: 'absolute', 
                                top: 0, 
                                left: 0, 
                                width: '100%', 
                                height: '76px',
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                backgroundColor: '#3a2673', 
                                borderBottom: '4px solid #25164d', 
                                borderRadius: '16px', 
                                padding: '0 20px', 
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', 
                                zIndex: sortedPlayers.length - idx 
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                {/* Rank Badge */}
                                <motion.div 
                                  layout
                                  style={{ width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '24px', color: 'white', backgroundColor: badgeBg, borderBottom: `4px solid ${badgeBorder}`, boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3)' }}
                                >
                                  {idx + 1}
                                </motion.div>
                                
                                {/* Player Name */}
                                <span style={{ fontWeight: 900, fontSize: '24px', letterSpacing: '0.05em', color: 'white', textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                  {p.nickname}
                                </span>
                              </div>
                              
                              {/* Score Pill com Animação de Pop quando os pontos mudam */}
                              <div style={{ backgroundColor: '#1f1340', border: '3px solid #4a348c', borderRadius: '9999px', padding: '6px 24px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                                <motion.div
                                  key={p.score} /* a mudança de score engatilha a animação inicial novamente */
                                  initial={{ y: -20, opacity: 0, color: '#34d399', scale: 1.5 }}
                                  animate={{ y: 0, opacity: 1, color: '#ffffff', scale: 1 }}
                                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                                  style={{ fontFamily: 'monospace', fontSize: '24px', fontWeight: 900, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                                >
                                  {p.score}
                                </motion.div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>

                    {role === 'operator' && (
                      <button 
                        onClick={handleNextRound}
                        style={{ marginTop: '24px', marginLeft: 'auto', marginRight: 'auto', background: 'linear-gradient(to bottom, #34d399, #059669)', border: '4px solid #064e3b', color: 'white', fontWeight: 900, fontSize: '20px', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '16px 32px', borderRadius: '16px', boxShadow: '0 6px 0 rgba(6,78,59,1)', cursor: 'pointer', transition: 'all 0.1s ease' }}
                        onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.1)'; }}
                        onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(6px)'; e.currentTarget.style.boxShadow = 'none'; }}
                        onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 0 rgba(6,78,59,1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 0 rgba(6,78,59,1)'; e.currentTarget.style.filter = 'none'; }}
                      >
                        {currentRoundIndex < gameRounds ? 'Avançar Rodada' : 'Ver Vencedores'}
                      </button>
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
                  
                  {/* 2º LUGAR */}
                  {secondPlace && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, opacity: podiumStep >= 3 ? 1 : 0, transform: podiumStep >= 3 ? 'translateY(0)' : 'translateY(40px)', transition: 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#94a3b8', border: '4px solid #475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '28px', color: 'white', boxShadow: '0 8px 16px rgba(0,0,0,0.3)', marginBottom: '12px', position: 'relative' }}>
                          2
                        </div>
                        <span style={{ fontWeight: 900, fontSize: '20px', color: 'white', textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.5)', textAlign: 'center', wordBreak: 'break-all' }}>{secondPlace.nickname}</span>
                      </div>
                      <div style={{ width: '100%', height: '140px', backgroundColor: '#334155', border: '4px solid #1e293b', borderBottom: 'none', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 4px 0 rgba(255,255,255,0.1), 0 -8px 24px rgba(0,0,0,0.3)' }}>
                        <span style={{ fontSize: '36px', fontWeight: 900, color: '#94a3b8', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>2º</span>
                        <span style={{ fontSize: '28px', fontFamily: 'monospace', fontWeight: 900, color: '#cbd5e1' }}>{secondPlace.score} pts</span>
                      </div>
                    </div>
                  )}

                  {/* 1º LUGAR */}
                  {firstPlace && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1.2, zIndex: 10, opacity: podiumStep >= 4 ? 1 : 0, transform: podiumStep >= 4 ? 'translateY(0) scale(1)' : 'translateY(60px) scale(0.5)', transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#f59e0b', border: '4px solid #b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '36px', color: 'white', boxShadow: '0 12px 24px rgba(245,158,11,0.4)', marginBottom: '16px', position: 'relative' }}>
                          <Crown style={{ position: 'absolute', top: '-30px', color: '#fbbf24', width: '40px', height: '40px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                          1
                        </div>
                        <span style={{ fontWeight: 900, fontSize: '24px', color: 'white', textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.5)', textAlign: 'center', wordBreak: 'break-all' }}>{firstPlace.nickname}</span>
                      </div>
                      <div style={{ width: '100%', height: '200px', background: 'linear-gradient(to bottom, #d97706, #b45309)', border: '4px solid #78350f', borderBottom: 'none', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 4px 0 rgba(255,255,255,0.2), 0 -8px 32px rgba(245,158,11,0.3)' }}>
                        <span style={{ fontSize: '56px', fontWeight: 900, color: '#fde68a', textShadow: '0 4px 8px rgba(0,0,0,0.5)' }}>1º</span>
                        <span style={{ fontSize: '40px', fontFamily: 'monospace', fontWeight: 900, color: '#fef3c7' }}>{firstPlace.score} pts</span>
                      </div>
                    </div>
                  )}

                  {/* 3º LUGAR */}
                  {thirdPlace && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, opacity: podiumStep >= 2 ? 1 : 0, transform: podiumStep >= 2 ? 'translateY(0)' : 'translateY(40px)', transition: 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#ea580c', border: '4px solid #9a3412', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '24px', color: 'white', boxShadow: '0 8px 16px rgba(0,0,0,0.3)', marginBottom: '12px', position: 'relative' }}>
                          3
                        </div>
                        <span style={{ fontWeight: 900, fontSize: '18px', color: 'white', textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.5)', textAlign: 'center', wordBreak: 'break-all' }}>{thirdPlace.nickname}</span>
                      </div>
                      <div style={{ width: '100%', height: '110px', backgroundColor: '#7c2d12', border: '4px solid #431407', borderBottom: 'none', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 4px 0 rgba(255,255,255,0.1), 0 -8px 24px rgba(0,0,0,0.3)' }}>
                        <span style={{ fontSize: '32px', fontWeight: 900, color: '#fdba74', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>3º</span>
                        <span style={{ fontSize: '24px', fontFamily: 'monospace', fontWeight: 900, color: '#ffedd5' }}>{thirdPlace.score} pts</span>
                      </div>
                    </div>
                  )}

                </div>

                {/* Ações */}
                <div style={{ width: '100%', display: 'flex', justifyItems: 'center', justifyContent: 'center', marginTop: '32px', paddingTop: '32px', borderTop: '4px solid rgba(255,255,255,0.05)' }}>
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
            className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl"
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
                setManagerQText('');
                setManagerQTimeLimit(20);
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
            <div className="w-full lg:w-5/12 flex flex-col gap-4 pr-0 lg:pr-4 border-r-0 lg:border-r border-[rgba(255,255,255,0.06)]">
              <div>
                <span className="text-xs font-bold text-[hsl(var(--primary))] tracking-widest uppercase">
                  {editingQuestionId ? 'Modo de Edição' : 'Painel de Criação'}
                </span>
                <h3 className="text-xl font-extrabold text-white mt-1">
                  {editingQuestionId ? 'Editar Pergunta' : 'Criar Pergunta'}
                </h3>
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
                <div>
                  <label className="text-[10px] font-extrabold text-[hsl(var(--text-secondary))] uppercase block mb-1">
                    Categoria da Questão <span className="text-red-400">*</span>
                  </label>
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
                    className="input-glow py-2 px-3 text-xs w-full bg-[#0d1326] border border-white/10 rounded-xl font-semibold text-white mb-4"
                  />
                </div>

                {managerTab === 'manual' ? (
                  <>
                    {/* Texto da Pergunta */}
                    <div>
                      <label className="text-[10px] font-extrabold text-[hsl(var(--text-secondary))] uppercase block mb-1">
                        Enunciado da Pergunta <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        placeholder="Digite a pergunta aqui de forma clara..."
                        value={managerQText}
                        onChange={(e) => setManagerQText(e.target.value)}
                        className="input-glow py-2 px-3 text-xs h-24 w-full bg-[#0d1326] border border-white/10 rounded-xl resize-none font-semibold text-white"
                      />
                    </div>

                    {/* Alternativas */}
                    <div>
                      <label className="text-[10px] font-extrabold text-[hsl(var(--text-secondary))] uppercase block mb-2">
                        Alternativas (Selecione a opção CORRETA) <span className="text-red-400">*</span>
                      </label>
                      <div className="flex flex-col gap-2.5">
                        {managerQAlts.map((alt, index) => (
                          <div key={index} className="flex gap-3 items-center">
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
                    </div>

                    {/* Botões do Form */}
                    <div className="flex gap-2 mt-2">
                      {editingQuestionId && (
                        <button
                          onClick={() => {
                            setEditingQuestionId(null);
                            setManagerQText('');
                            setManagerQTimeLimit(20);
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
                  </>
                ) : (
                  <div className="flex flex-col gap-3.5 p-4 rounded-2xl border border-[hsla(var(--secondary),0.15)] bg-[hsla(var(--secondary),0.02)] relative overflow-hidden animate-fade-in">
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-[hsl(var(--secondary))]/10 rounded-full blur-2xl pointer-events-none" />
                    
                    <div>
                      <h4 className="text-xs font-bold text-[hsl(var(--text-secondary))] uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--secondary))]" />
                        Assistente de IA Gemini
                      </h4>
                      <p className="text-[11px] text-[hsl(var(--text-muted))] mt-1 leading-relaxed">
                        Selecione a categoria acima e digite um tema ou anexe um PDF para que a inteligência artificial formule uma pergunta premium completa com alternativas.
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
                        Tema ou Prompt de Contexto (Opcional)
                      </label>
                      <textarea
                        placeholder="Ex: Teorema de Pitágoras com aplicação prática do dia a dia, ou Revolução Francesa focado na Tomada da Bastilha..."
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="input-glow py-2 px-3 text-xs h-20 w-full bg-[#0d1326] border border-white/10 rounded-xl resize-none text-white font-medium"
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
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        aiLoading
                          ? 'bg-[hsl(var(--secondary))]/50 text-white cursor-not-allowed'
                          : 'bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] hover:opacity-95 text-white shadow-lg shadow-purple-900/25'
                      }`}
                      style={{ opacity: !geminiApiKey || !managerQCatId ? 0.5 : 1 }}
                    >
                      {aiLoading ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processando com Gemini...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Gerar {aiQuantity} Quest{aiQuantity > 1 ? 'ões' : 'ão'} Premium
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* LADO DIREITO: LISTAGEM E PESQUISA */}
            <div className="w-full lg:w-7/12 flex flex-col gap-4 pl-0 lg:pl-4 overflow-hidden">
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

              {/* Campo de Busca */}
              <input
                type="text"
                placeholder="Pesquisar pergunta pelo enunciado..."
                value={managerSearchTerm}
                onChange={(e) => setManagerSearchTerm(e.target.value)}
                className="input-glow py-2 px-3 text-xs w-full bg-[#0d1326] border border-white/10 rounded-xl"
              />

              {/* Lista Scrollable */}
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[50vh] pr-2">
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
                            </div>
                            <p className="text-sm font-semibold text-white leading-relaxed">
                              {q.question_text}
                            </p>
                          </div>

                          {/* Ações */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => {
                                setEditingQuestionId(q.id);
                                setManagerQText(q.question_text);
                                setManagerQTimeLimit(q.time_limit || 20);
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
