// src/components/game/JourneyGameMode.tsx
// Modo Jornada: Expedição Ceará (Juazeiro do Norte a Fortaleza)

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, ArrowLeft, Volume2, VolumeX, Sparkles, CheckCircle2, 
  XCircle, ChevronRight, RotateCcw, Compass, MapPin, 
  Play, AlertCircle, ShieldAlert
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CEARA_JOURNEY, type JourneyDef, type JourneyStage } from '../../lib/journey';
import { sfx } from '../../lib/soundFx';

export interface JourneyCategory {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

export interface JourneyQuestion {
  id: string;
  category_id: string;
  question_text: string;
  time_limit?: number;
  explanation?: string | null;
  reference_url?: string | null;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  alternatives: {
    text: string;
    isCorrect: boolean;
  }[];
}

interface JourneyGameModeProps {
  onBack: () => void;
  categories: JourneyCategory[];
  questions: JourneyQuestion[];
  soundEnabled: boolean;
  onToggleSound: () => void;
}

type JourneyGameState = 'setup' | 'playing' | 'stage_success' | 'stage_fail' | 'victory';

export const JourneyGameMode: React.FC<JourneyGameModeProps> = ({
  onBack,
  categories,
  questions,
  soundEnabled,
  onToggleSound,
}) => {
  const journey: JourneyDef = CEARA_JOURNEY;

  // ─── Estados de Configuração ─────────────────────────────────────────────
  const [playerName, setPlayerName] = useState<string>('Explorador');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [questionsPerStage, setQuestionsPerStage] = useState<number>(2);

  // ─── Estados do Jogo ─────────────────────────────────────────────────────
  const [gameState, setGameState] = useState<JourneyGameState>('setup');
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(0);
  const [stageQuestions, setStageQuestions] = useState<JourneyQuestion[]>([]);
  const [currentQuestionIndexInStage, setCurrentQuestionIndexInStage] = useState<number>(0);
  const [selectedAltIndex, setSelectedAltIndex] = useState<number | null>(null);
  const [stageCorrectAnswers, setStageCorrectAnswers] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [totalCorrectOverall, setTotalCorrectOverall] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [isTimeActive, setIsTimeActive] = useState<boolean>(false);
  const timerRef = useRef<any>(null);

  // Selecionar categoria inicial padrão se disponível
  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  // Questões filtradas pela categoria selecionada
  const categoryQuestions = useMemo(() => {
    if (!selectedCategoryId) return [];
    return questions.filter(q => q.category_id === selectedCategoryId && q.alternatives && q.alternatives.length >= 2);
  }, [questions, selectedCategoryId]);

  const maxAvailableQuestions = categoryQuestions.length;

  // Ajustar questionsPerStage se exceder o total disponível da categoria
  useEffect(() => {
    if (maxAvailableQuestions > 0 && questionsPerStage > maxAvailableQuestions) {
      setQuestionsPerStage(maxAvailableQuestions);
    } else if (maxAvailableQuestions > 0 && questionsPerStage < 1) {
      setQuestionsPerStage(1);
    }
  }, [maxAvailableQuestions, questionsPerStage]);

  const currentStage: JourneyStage = journey.stages[currentStageIndex] || journey.stages[0];
  const currentQuestion = stageQuestions[currentQuestionIndexInStage] || null;

  // Efeito sonoro comemorativo na tela épica de vitória
  useEffect(() => {
    if (gameState === 'victory') {
      if (soundEnabled) {
        try {
          sfx.playVictory();
        } catch {
          // ignore
        }
      }

      // Efeito épico de confetes em cascata
      const duration = 6 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const interval: any = setInterval(() => {
        const remainingTime = animationEnd - Date.now();
        if (remainingTime <= 0) {
          return clearInterval(interval);
        }
        const particleCount = 50 * (remainingTime / duration);
        confetti({ ...defaults, particleCount, origin: { x: 0.1, y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: 0.9, y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: 0.5, y: 0.5 } });
      }, 350);

      return () => clearInterval(interval);
    }
  }, [gameState, soundEnabled]);

  // Função para sortear perguntas para a etapa atual
  const prepareQuestionsForStage = (_stageIdx?: number) => {
    if (categoryQuestions.length === 0) return;

    // Embaralha o banco da categoria
    const shuffled = [...categoryQuestions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(questionsPerStage, shuffled.length));

    // Embaralha também as alternativas de cada pergunta
    const prepared = selected.map(q => ({
      ...q,
      alternatives: [...q.alternatives].sort(() => Math.random() - 0.5)
    }));

    setStageQuestions(prepared);
    setCurrentQuestionIndexInStage(0);
    setSelectedAltIndex(null);
    setStageCorrectAnswers(0);
    resetTimer(prepared[0]?.time_limit || 30);
  };

  const resetTimer = (sec: number = 30) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(sec);
    setIsTimeActive(true);
  };

  // Timer da questão atual
  useEffect(() => {
    if (gameState !== 'playing' || !isTimeActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, isTimeActive, currentQuestionIndexInStage]);

  // Iniciar a jornada
  const handleStartJourney = () => {
    if (!selectedCategoryId) return;
    if (maxAvailableQuestions === 0) return;

    sfx.playClick();
    setCurrentStageIndex(0);
    setTotalScore(0);
    setTotalCorrectOverall(0);
    setGameState('playing');
    prepareQuestionsForStage(0);
  };

  // Tempo esgotado
  const handleTimeOut = () => {
    if (selectedAltIndex !== null) return;
    setIsTimeActive(false);
    setSelectedAltIndex(-1); // -1 = não respondeu
    if (soundEnabled) sfx.playWrong();
  };

  // Ao clicar em uma alternativa
  const handleSelectAlternative = (index: number) => {
    if (selectedAltIndex !== null || !currentQuestion) return;
    setIsTimeActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

    setSelectedAltIndex(index);
    const isCorrect = currentQuestion.alternatives[index]?.isCorrect === true;

    if (isCorrect) {
      if (soundEnabled) sfx.playCorrect();
      setStageCorrectAnswers(prev => prev + 1);
      setTotalCorrectOverall(prev => prev + 1);
      const points = 100 + Math.max(0, timeLeft * 5);
      setTotalScore(prev => prev + points);
    } else {
      if (soundEnabled) sfx.playWrong();
    }
  };

  // Avançar para a próxima questão ou finalizar etapa
  const handleNextQuestion = () => {
    sfx.playClick();
    const nextIdx = currentQuestionIndexInStage + 1;

    if (nextIdx < stageQuestions.length) {
      setCurrentQuestionIndexInStage(nextIdx);
      setSelectedAltIndex(null);
      resetTimer(stageQuestions[nextIdx]?.time_limit || 30);
    } else {
      // Final da etapa!
      // Regra de ouro da jornada: acertar todas as questões da etapa para subir de cidade!
      const totalQuestionsInThisStage = stageQuestions.length;
      const isPerfectScore = stageCorrectAnswers === totalQuestionsInThisStage;

      if (isPerfectScore) {
        // Se já está na última cidade (Fortaleza = etapa index 5), venceu a jornada inteira!
        if (currentStageIndex === journey.stages.length - 1) {
          setGameState('victory');
        } else {
          setGameState('stage_success');
          if (soundEnabled) sfx.playVictory();
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        }
      } else {
        // Errou alguma pergunta da etapa
        setGameState('stage_fail');
        if (soundEnabled) sfx.playWrong();
      }
    }
  };

  // Continuar para a próxima cidade
  const handleAdvanceToNextStage = () => {
    sfx.playClick();
    const nextStageIdx = currentStageIndex + 1;
    setCurrentStageIndex(nextStageIdx);
    setGameState('playing');
    prepareQuestionsForStage(nextStageIdx);
  };

  // Tentar a mesma etapa novamente
  const handleRetryStage = () => {
    sfx.playClick();
    setGameState('playing');
    prepareQuestionsForStage(currentStageIndex);
  };

  // Reiniciar a jornada desde Juazeiro do Norte
  const handleRestartEntireJourney = () => {
    sfx.playClick();
    setCurrentStageIndex(0);
    setTotalScore(0);
    setTotalCorrectOverall(0);
    setGameState('playing');
    prepareQuestionsForStage(0);
  };

  // Avatar amigável do jogador
  const playerAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
    playerName || 'Explorador'
  )}&backgroundColor=b6e3f4,c0aede,ffd5dc,ffdfbf`;

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. TELA DE CONFIGURAÇÃO / SETUP DA JORNADA
  // ═══════════════════════════════════════════════════════════════════════════
  if (gameState === 'setup') {
    return (
      <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl bg-slate-900/90 backdrop-blur-xl border border-amber-500/30 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Brilho de fundo temático */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Cabeçalho da Configuração */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-6">
            <button
              onClick={() => { sfx.playClick(); onBack(); }}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-xl hover:bg-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold text-sm">Voltar ao Menu</span>
            </button>

            <div className="flex items-center gap-3">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                🗺️ Modo Jornada Oficial
              </span>
              <button
                onClick={onToggleSound}
                className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
                title={soundEnabled ? 'Silenciar som' : 'Ativar som'}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Coluna 1: Imagem e Sinopse da Jornada Ceará */}
            <div className="lg:col-span-5 flex flex-col items-center text-center">
              <div className="relative group w-full max-w-[320px] rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-2xl bg-slate-950">
                <img 
                  src="/jornada/mapa00.png" 
                  alt="Mapa da Jornada Ceará" 
                  className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-3 left-3 right-3 text-left">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400">
                    Rota dos Mestres
                  </span>
                  <p className="text-white font-black text-lg leading-tight">
                    Juazeiro do Norte ➔ Fortaleza
                  </p>
                  <p className="text-xs text-slate-300">6 Cidades • 100% de Acerto por Etapa</p>
                </div>
              </div>

              {/* Rota simplificada */}
              <div className="flex items-center justify-center gap-1.5 mt-4 text-xs font-semibold text-slate-400 flex-wrap">
                <span className="text-amber-400 font-bold">Juazeiro</span>
                <span>➔</span>
                <span>Icó</span>
                <span>➔</span>
                <span>Jaguaribe</span>
                <span>➔</span>
                <span>Russas</span>
                <span>➔</span>
                <span>Pacajus</span>
                <span>➔</span>
                <span className="text-blue-400 font-bold">Fortaleza ⭐</span>
              </div>
            </div>

            {/* Coluna 2: Formulário de Seleção e Regras */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
                  <Compass className="w-8 h-8 text-amber-400" />
                  Expedição Ceará
                </h1>
                <p className="text-sm text-slate-300 mt-1">
                  Desafie seu conhecimento cruzando o estado. Acerte todas as questões da etapa para subir para a próxima cidade até alcançar Fortaleza!
                </p>
              </div>

              {/* Nome do Jogador */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  👤 Nome do Conquistador / Viajante:
                </label>
                <div className="flex items-center gap-3">
                  <img src={playerAvatar} alt="Avatar" className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 p-0.5" />
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Digite seu nome ou apelido"
                    maxLength={25}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
              </div>

              {/* Escolha da Categoria */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    📚 Escolha a Categoria do Quiz:
                  </label>
                  <span className="text-xs font-bold text-amber-400">
                    {maxAvailableQuestions} questões disponíveis
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {categories.map((cat) => {
                    const count = questions.filter(q => q.category_id === cat.id && q.alternatives?.length >= 2).length;
                    const isSelected = selectedCategoryId === cat.id;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategoryId(cat.id);
                          sfx.playClick();
                        }}
                        className={`text-left p-3 rounded-xl border flex items-center justify-between transition-all ${
                          isSelected 
                            ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg shadow-amber-500/10' 
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div 
                            className="w-3.5 h-3.5 rounded-full shrink-0" 
                            style={{ backgroundColor: cat.color || '#F59E0B' }} 
                          />
                          <span className="font-bold text-sm truncate">{cat.name}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${
                          count > 0 ? 'bg-slate-800 text-slate-300' : 'bg-red-900/50 text-red-300'
                        }`}>
                          {count} {count === 1 ? 'questão' : 'questões'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {maxAvailableQuestions === 0 && selectedCategoryId && (
                  <p className="text-xs text-rose-400 mt-2 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Esta categoria não possui perguntas cadastradas. Escolha outra categoria para jogar.
                  </p>
                )}
              </div>

              {/* Quantidade de Questões por Etapa */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      🎯 Questões por Etapa da Jornada:
                    </label>
                    <span className="text-[11px] text-slate-400">
                      (Não pode ultrapassar o total de {maxAvailableQuestions} da categoria)
                    </span>
                  </div>
                  <span className="text-2xl font-black text-amber-400 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/30">
                    {questionsPerStage}
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-3">
                  <input
                    type="range"
                    min={1}
                    max={Math.max(1, maxAvailableQuestions)}
                    value={questionsPerStage}
                    disabled={maxAvailableQuestions === 0}
                    onChange={(e) => setQuestionsPerStage(parseInt(e.target.value) || 1)}
                    className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-700 rounded-lg"
                  />
                </div>

                {/* Seletores rápidos */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {[1, 2, 3, 4, 5, 10].map(n => (
                    <button
                      key={n}
                      type="button"
                      disabled={n > maxAvailableQuestions}
                      onClick={() => { setQuestionsPerStage(n); sfx.playClick(); }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        questionsPerStage === n
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : n > maxAvailableQuestions
                            ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {n} {n === 1 ? 'questão' : 'questões'}
                    </button>
                  ))}
                  {maxAvailableQuestions > 0 && (
                    <button
                      type="button"
                      onClick={() => { setQuestionsPerStage(maxAvailableQuestions); sfx.playClick(); }}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 ml-auto"
                    >
                      Máximo ({maxAvailableQuestions})
                    </button>
                  )}
                </div>
              </div>

              {/* Botão de Iniciar a Jornada */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={maxAvailableQuestions === 0 || !selectedCategoryId}
                onClick={handleStartJourney}
                className={`w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl ${
                  maxAvailableQuestions === 0 || !selectedCategoryId
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 hover:brightness-110 shadow-amber-500/25 border-2 border-amber-300'
                }`}
              >
                <Play className="w-6 h-6 fill-current" />
                PARTIR DE JUAZEIRO DO NORTE!
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. TELA DE SUCESSO DA ETAPA (CIDADE CONQUISTADA - SOBE DE CIDADE!)
  // ═══════════════════════════════════════════════════════════════════════════
  if (gameState === 'stage_success') {
    const nextStage = journey.stages[currentStageIndex + 1];

    return (
      <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl bg-slate-900/95 border-2 border-emerald-500/50 rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-4 text-emerald-400 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <span className="text-xs font-black tracking-widest text-emerald-400 uppercase bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
            100% de Aproveitamento!
          </span>

          <h2 className="text-3xl font-black text-white mt-3">
            {currentStage.cityName} Conquistada!
          </h2>
          <p className="text-slate-300 mt-2 text-sm max-w-lg mx-auto">
            Parabéns, <strong className="text-amber-400">{playerName}</strong>! Você acertou todas as {stageQuestions.length} questões desta etapa e liberou a passagem na expedição!
          </p>

          {/* Visual do Mapa Desbloqueado */}
          <div className="my-6 rounded-2xl overflow-hidden border-2 border-emerald-500/30 max-w-sm mx-auto shadow-xl bg-slate-950">
            <img 
              src={nextStage ? nextStage.image : currentStage.image} 
              alt={nextStage ? nextStage.cityName : currentStage.cityName}
              className="w-full h-auto object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = nextStage ? `/jornada/mapa0${nextStage.stageNumber}.png` : `/jornada/mapa0${currentStage.stageNumber}.png`;
              }}
            />
          </div>

          {nextStage && (
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 mb-6 max-w-md mx-auto">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Próximo Destino Cearense:
              </span>
              <p className="text-xl font-black text-amber-400 mt-0.5">
                Etapa {nextStage.stageNumber}: {nextStage.cityName}
              </p>
              <p className="text-xs text-slate-300 mt-1 italic">
                "{nextStage.tagline}"
              </p>
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleAdvanceToNextStage}
              className="px-8 py-3.5 rounded-xl font-black text-base bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <span>Subir para {nextStage?.cityName || 'Próxima Cidade'}</span>
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. TELA DE FALHA DA ETAPA (NÃO FEZ 100% - DEVE TENTAR NOVAMENTE)
  // ═══════════════════════════════════════════════════════════════════════════
  if (gameState === 'stage_fail') {
    return (
      <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-slate-900/95 border-2 border-rose-500/50 rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center mb-4 text-rose-400">
            <ShieldAlert className="w-10 h-10" />
          </div>

          <span className="text-xs font-black tracking-widest text-rose-400 uppercase bg-rose-500/20 px-3 py-1 rounded-full border border-rose-500/30">
            Exigência: 100% de Acertos
          </span>

          <h2 className="text-2xl md:text-3xl font-black text-white mt-3">
            Quase lá em {currentStage.cityName}!
          </h2>
          <p className="text-slate-300 mt-2 text-sm">
            Você acertou <strong className="text-amber-400">{stageCorrectAnswers}</strong> de <strong className="text-white">{stageQuestions.length}</strong> questões.
          </p>
          <p className="text-xs text-rose-300 bg-rose-950/40 border border-rose-800/40 rounded-xl p-3 my-4">
            Para avançar de cidade na Expedição Ceará, é obrigatório acertar todas as questões desta etapa. Não desanime e tente novamente!
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <button
              onClick={handleRetryStage}
              className="px-6 py-3 rounded-xl font-black text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:brightness-110"
            >
              <RotateCcw className="w-4 h-4" />
              Tentar {currentStage.cityName} Novamente
            </button>

            <button
              onClick={() => { sfx.playClick(); setGameState('setup'); }}
              className="px-5 py-3 rounded-xl font-bold text-sm bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
            >
              Voltar à Configuração
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. TELA ÉPICA DE VITÓRIA (CHEGADA A FORTALEZA / DESTINO FINAL CONQUISTADO!)
  // ═══════════════════════════════════════════════════════════════════════════
  if (gameState === 'victory') {
    return (
      <div className="min-h-[90vh] flex flex-col justify-center items-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, type: 'spring' }}
          className="w-full max-w-4xl bg-gradient-to-b from-slate-900 via-slate-900/98 to-slate-950 border-4 border-amber-400/80 rounded-3xl p-6 md:p-10 shadow-[0_0_80px_rgba(245,158,11,0.35)] text-center relative overflow-hidden"
        >
          {/* Luzes cósmicas de fundo */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-amber-400/20 to-transparent blur-3xl pointer-events-none" />

          {/* Coroa e Troféu Monumental */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="relative w-28 h-28 mx-auto mb-4"
          >
            <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.6)] border-4 border-yellow-200">
              <Trophy className="w-14 h-14 text-slate-950 fill-current animate-bounce-gentle" />
            </div>
            <div className="absolute -top-3 -right-2 bg-rose-500 text-white rounded-full p-2 shadow-lg">
              <Sparkles className="w-5 h-5" />
            </div>
          </motion.div>

          {/* Faixa de Honra */}
          <span className="inline-block text-xs md:text-sm font-black tracking-widest text-amber-300 uppercase bg-amber-500/20 px-5 py-1.5 rounded-full border-2 border-amber-400/50 mb-3 shadow-inner">
            ⭐ GRANDE CAMPEÃO DA EXPEDIÇÃO CEARÁ ⭐
          </span>

          {/* NOME DO GANHADOR EM TAMANHO ÉPICO */}
          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-500 uppercase tracking-tight filter drop-shadow-[0_4px_12px_rgba(245,158,11,0.5)] my-2">
            {playerName || 'CONQUISTADOR'}
          </h1>

          <p className="text-lg md:text-xl font-bold text-slate-200 max-w-2xl mx-auto leading-relaxed">
            Com inteligência e precisão lendária, você conquistou todas as 6 cidades e chegou vitorioso a <span className="text-amber-400 font-extrabold">Fortaleza</span>!
          </p>

          {/* Destaque do Mapa Final com Fortaleza */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center my-8">
            <div className="md:col-span-6">
              <div className="rounded-2xl overflow-hidden border-2 border-amber-400/60 shadow-[0_0_30px_rgba(245,158,11,0.25)] bg-slate-950 max-w-[320px] mx-auto">
                <img 
                  src="/jornada/mapa06.png" 
                  alt="Fortaleza Conquistada" 
                  className="w-full h-auto object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/jornada/mapa06.png';
                  }}
                />
              </div>
            </div>

            <div className="md:col-span-6 flex flex-col gap-3 text-left">
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    🏛️
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase">Rota Concluída</span>
                    <p className="text-white font-extrabold text-sm">Juazeiro do Norte ➔ Fortaleza</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    🎯
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase">Cidades Conquistadas</span>
                    <p className="text-emerald-400 font-extrabold text-sm">6 de 6 Cidades (100% Acerto)</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center font-bold">
                    🏆
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase">Pontuação Épica & Acertos</span>
                    <p className="text-amber-300 font-extrabold text-sm">{totalScore} Pontos • {totalCorrectOverall} Acertos Totais</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2 border-t border-slate-800">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleRestartEntireJourney}
              className="px-8 py-3.5 rounded-2xl font-black text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 hover:brightness-110"
            >
              <RotateCcw className="w-5 h-5" />
              JOGAR NOVAMENTE
            </motion.button>

            <button
              onClick={() => { sfx.playClick(); setGameState('setup'); }}
              className="px-6 py-3.5 rounded-2xl font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700"
            >
              Nova Configuração
            </button>

            <button
              onClick={() => { sfx.playClick(); onBack(); }}
              className="px-6 py-3.5 rounded-2xl font-bold text-slate-400 hover:text-white"
            >
              Voltar ao Menu
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. TELA DE JOGO ATIVO (PERGUNTA ATUAL & MAPA DA ETAPA)
  // ═══════════════════════════════════════════════════════════════════════════
  const answerColorClasses = [
    'hover:border-red-500 border-red-500/30 bg-red-500/10 text-red-100',
    'hover:border-blue-500 border-blue-500/30 bg-blue-500/10 text-blue-100',
    'hover:border-amber-500 border-amber-500/30 bg-amber-500/10 text-amber-100',
    'hover:border-emerald-500 border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
  ];

  const answerBadgeColors = ['bg-red-500', 'bg-blue-500', 'bg-amber-500', 'bg-emerald-500'];
  const answerLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="min-h-[85vh] flex flex-col justify-start py-4 px-3 md:px-6 max-w-7xl mx-auto w-full">
      {/* Barra de Progresso Superior e Navegação */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <button
            onClick={() => {
              if (window.confirm('Deseja realmente sair da jornada atual? Seu progresso nesta expedição será reiniciado.')) {
                sfx.playClick();
                setGameState('setup');
              }
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Abandonar</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold">Viajante:</span>
            <span className="text-sm font-black text-amber-400">{playerName}</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-xl border border-slate-700">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-extrabold text-white">{totalScore} pts</span>
          </div>
        </div>

        {/* Marcadores das 6 Cidades */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto max-w-full py-1">
          {journey.stages.map((stg, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;

            return (
              <div
                key={stg.stageNumber}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black transition-all ${
                  isCompleted 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                    : isCurrent 
                      ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/30 ring-2 ring-amber-300' 
                      : 'bg-slate-800/60 text-slate-500 border border-slate-800'
                }`}
              >
                <span>{stg.stageNumber}.</span>
                <span className="hidden sm:inline">{stg.cityName}</span>
                {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                {isCurrent && <MapPin className="w-3.5 h-3.5 shrink-0 animate-bounce" />}
              </div>
            );
          })}
        </div>

        <button
          onClick={onToggleSound}
          className="hidden md:flex p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
          title={soundEnabled ? 'Silenciar som' : 'Ativar som'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Grid Principal: Mapa da Cidade Atual + Pergunta do Quiz */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna do Mapa & Dados da Cidade */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                  Etapa {currentStage.stageNumber} de 6 • {currentStage.region}
                </span>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-400" />
                  {currentStage.cityName}
                </h3>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                {currentStage.badge}
              </span>
            </div>

            {/* Imagem do Mapa da Etapa */}
            <div className="relative rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-2xl bg-slate-950 aspect-[4/5] max-h-[380px] w-full flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentStage.image}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.4 }}
                  src={currentStage.image}
                  alt={`Mapa Etapa ${currentStage.stageNumber} - ${currentStage.cityName}`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `/jornada/mapa0${currentStage.stageNumber}.png`;
                  }}
                />
              </AnimatePresence>
            </div>

            {/* Curiosidade da Cidade */}
            <div className="mt-3 p-3 rounded-xl bg-slate-800/70 border border-slate-700/60 text-xs text-slate-300 leading-relaxed">
              <span className="font-bold text-amber-400">💡 Sabia que: </span>
              {currentStage.curiosity}
            </div>

            {/* Requisito da Etapa */}
            <div className="mt-2 text-center text-xs font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-800/30 py-1.5 px-3 rounded-lg">
              🎯 Meta da Cidade: Acertar todas as {stageQuestions.length} perguntas para subir de cidade!
            </div>
          </div>
        </div>

        {/* Coluna da Pergunta & Alternativas */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl relative">
            {/* Header da Pergunta */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Questão {currentQuestionIndexInStage + 1} de {stageQuestions.length}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                  Acertos: {stageCorrectAnswers} / {stageQuestions.length}
                </span>
              </div>

              {/* Timer Regressivo */}
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-xs ${
                timeLeft <= 5 
                  ? 'bg-rose-500 text-white animate-pulse' 
                  : 'bg-slate-800 border border-slate-700 text-slate-300'
              }`}>
                <span>⏱️</span>
                <span>{timeLeft}s</span>
              </div>
            </div>

            {/* Enunciado */}
            {currentQuestion ? (
              <div className="mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-white leading-snug">
                  {currentQuestion.question_text}
                </h2>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400">
                Carregando pergunta da etapa...
              </div>
            )}

            {/* Lista de Alternativas */}
            {currentQuestion && (
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.alternatives.map((alt, index) => {
                  const isSelected = selectedAltIndex === index;
                  const hasAnswered = selectedAltIndex !== null;
                  const isCorrect = alt.isCorrect === true;

                  let styleClass = 'bg-slate-800/80 border-slate-700 text-slate-200 hover:border-amber-400 hover:bg-slate-800';

                  if (hasAnswered) {
                    if (isCorrect) {
                      styleClass = 'bg-emerald-500/25 border-emerald-400 text-emerald-100 shadow-lg shadow-emerald-500/20';
                    } else if (isSelected && !isCorrect) {
                      styleClass = 'bg-rose-500/25 border-rose-500 text-rose-100 shadow-lg shadow-rose-500/20';
                    } else {
                      styleClass = 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60';
                    }
                  } else {
                    styleClass = answerColorClasses[index % 4];
                  }

                  return (
                    <motion.button
                      key={index}
                      whileHover={!hasAnswered ? { scale: 1.01 } : {}}
                      whileTap={!hasAnswered ? { scale: 0.99 } : {}}
                      disabled={hasAnswered}
                      onClick={() => handleSelectAlternative(index)}
                      className={`w-full p-4 rounded-2xl border-2 text-left flex items-center gap-4 transition-all duration-200 font-semibold text-base relative ${styleClass}`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                        hasAnswered && isCorrect 
                          ? 'bg-emerald-500 text-slate-950' 
                          : hasAnswered && isSelected && !isCorrect
                            ? 'bg-rose-500 text-white'
                            : answerBadgeColors[index % 4] + ' text-slate-950'
                      }`}>
                        {answerLetters[index]}
                      </div>

                      <span className="flex-1 leading-snug">{alt.text}</span>

                      {hasAnswered && isCorrect && (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                      )}
                      {hasAnswered && isSelected && !isCorrect && (
                        <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* Feedback e Botão Avançar */}
            {selectedAltIndex !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4"
              >
                <div className="text-left w-full sm:w-auto">
                  {currentQuestion?.alternatives[selectedAltIndex]?.isCorrect ? (
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span>Resposta Correta! Ponto para a viagem!</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                      <XCircle className="w-5 h-5 shrink-0" />
                      <span>
                        {selectedAltIndex === -1 ? 'Tempo Esgotado!' : 'Resposta Incorreta!'}
                      </span>
                    </div>
                  )}

                  {currentQuestion?.explanation && (
                    <p className="text-xs text-slate-400 mt-1 max-w-md">
                      {currentQuestion.explanation}
                    </p>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleNextQuestion}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl font-black text-slate-950 bg-gradient-to-r from-amber-400 to-orange-400 hover:brightness-110 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 shrink-0"
                >
                  <span>
                    {currentQuestionIndexInStage + 1 < stageQuestions.length ? 'Próxima Questão' : 'Verificar Etapa'}
                  </span>
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JourneyGameMode;
