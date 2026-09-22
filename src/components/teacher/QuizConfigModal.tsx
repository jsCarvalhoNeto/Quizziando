import React from 'react';
import { 
  X, 
  Sparkles, 
  Bookmark, 
  Clock, 
  Award, 
  Zap,
  RotateCw,
  LayoutGrid,
  Settings2
} from 'lucide-react';

interface QuizConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame: () => void;
  quizFormat?: 'classic' | 'roulette' | 'blocks';
  setQuizFormat?: (format: 'classic' | 'roulette' | 'blocks') => void;
  gameMode: 'duel' | 'team' | 'open';
  setGameMode: (mode: 'duel' | 'team' | 'open') => void;
  gameRounds: number;
  setGameRounds: (rounds: number) => void;
  gameTimeLimit: number;
  setGameTimeLimit: (time: number) => void;
  scoringMode: 'speed' | 'fixed';
  setScoringMode: (mode: 'speed' | 'fixed') => void;
  fixedPoints: number;
  setFixedPoints: (points: number) => void;
  difficultyFilter: string;
  setDifficultyFilter: (diff: any) => void;
  tagFilter: string;
  setTagFilter: (tag: string) => void;
  availableQuestionCount: number;
  newQuizName: string;
  setNewQuizName: (name: string) => void;
  onSaveQuiz: () => void;
  categories: Array<{ id: string; name: string; color?: string; folder_id?: string | null }>;
  selectedCategoryIds: string[];
  onToggleCategorySelect: (categoryId: string) => void;
  onToggleSelectAllCategories: (select: boolean) => void;
}

export const QuizConfigModal: React.FC<QuizConfigModalProps> = ({
  isOpen,
  onClose,
  onStartGame,
  quizFormat = 'classic',
  setQuizFormat,
  gameMode,
  setGameMode,
  gameRounds,
  setGameRounds,
  gameTimeLimit,
  setGameTimeLimit,
  scoringMode,
  setScoringMode,
  fixedPoints,
  setFixedPoints,
  difficultyFilter,
  setDifficultyFilter,
  tagFilter,
  setTagFilter,
  availableQuestionCount,
  newQuizName,
  setNewQuizName,
  onSaveQuiz,
  categories,
  selectedCategoryIds,
  onToggleCategorySelect,
  onToggleSelectAllCategories,
}) => {
  if (!isOpen) return null;

  const allSelected = categories.length > 0 && selectedCategoryIds.length === categories.length;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="glass-card max-w-4xl w-full p-6 sm:p-8 rounded-3xl border border-white/20 shadow-2xl relative my-auto max-h-[90vh] flex flex-col gap-6 overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Configurar Partida do Quiz</h3>
              <p className="text-xs text-slate-400">Ajuste os parâmetros antes de abrir a sala de espera.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo Scrollável com 2 Colunas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-1 flex-1">
          {/* Coluna 1: Regras da Partida */}
          <div className="flex flex-col gap-4">
            {/* Escolha do Formato: Quiz Clássico (Estilo Kahoot) vs Quiz com Roleta */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5 flex items-center justify-between">
                <span>Formato da Partida</span>
                <span className="text-[10px] text-purple-400 font-semibold lowercase">
                  {quizFormat === 'classic' ? 'direto nas perguntas' : quizFormat === 'blocks' ? 'tabuleiro de blocos' : 'sorteio de temas'}
                </span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setQuizFormat?.('classic')}
                  className={`p-2.5 text-left rounded-xl border transition-all ${
                    quizFormat === 'classic'
                      ? 'border-emerald-500 bg-emerald-500/20 text-white shadow-md shadow-emerald-500/20'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap className={`w-3.5 h-3.5 ${quizFormat === 'classic' ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span className="text-xs font-extrabold">Clássico</span>
                  </div>
                  <p className="text-[9px] text-slate-300/80 leading-snug">
                    Perguntas em sequência sem roleta.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setQuizFormat?.('blocks')}
                  className={`p-2.5 text-left rounded-xl border transition-all ${
                    quizFormat === 'blocks'
                      ? 'border-purple-500 bg-purple-500/20 text-white shadow-md shadow-purple-500/20'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <LayoutGrid className={`w-3.5 h-3.5 ${quizFormat === 'blocks' ? 'text-purple-400' : 'text-slate-400'}`} />
                    <span className="text-xs font-extrabold">Blocos</span>
                  </div>
                  <p className="text-[9px] text-slate-300/80 leading-snug">
                    Perguntas viradas com sinais + e -.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setQuizFormat?.('roulette')}
                  className={`p-2.5 text-left rounded-xl border transition-all ${
                    quizFormat === 'roulette'
                      ? 'border-indigo-500 bg-indigo-500/20 text-white shadow-md shadow-indigo-500/20'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <RotateCw className={`w-3.5 h-3.5 ${quizFormat === 'roulette' ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span className="text-xs font-extrabold">Roleta</span>
                  </div>
                  <p className="text-[9px] text-slate-300/80 leading-snug">
                    Sorteio de categorias por roleta.
                  </p>
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5">
                Modo de Competição
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'open', label: 'Aberto (Geral)' },
                  { id: 'duel', label: 'Duelo 1v1' },
                  { id: 'team', label: 'Times' },
                ].map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setGameMode(mode.id as any)}
                    className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition-all ${
                      gameMode === mode.id 
                        ? 'border-purple-500 bg-purple-500/20 text-white shadow-md shadow-purple-500/20' 
                        : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-purple-400" />
                  <span>Rodadas</span>
                </label>
                <input 
                  type="number" 
                  min="1" 
                  max="20"
                  value={gameRounds} 
                  onChange={e => setGameRounds(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                  className="w-full py-2 px-3 text-center font-bold text-sm rounded-xl bg-black/40 border border-white/15 text-white outline-none focus:border-purple-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Tempo (segundos)</span>
                </label>
                <input 
                  type="number" 
                  min="5" 
                  max="120"
                  value={gameTimeLimit} 
                  onChange={e => setGameTimeLimit(Math.max(5, Math.min(120, parseInt(e.target.value) || 15)))}
                  className="w-full py-2 px-3 text-center font-bold text-sm rounded-xl bg-black/40 border border-white/15 text-white outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5">
                Cálculo de Pontuação
              </label>
              <select 
                className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-white text-xs outline-none focus:border-purple-400"
                value={scoringMode} 
                onChange={e => setScoringMode(e.target.value as 'speed' | 'fixed')}
              >
                <option value="speed" className="bg-[#0f1523]">Acerto + Bônus por velocidade (Estilo Kahoot)</option>
                <option value="fixed" className="bg-[#0f1523]">Pontos fixos por acerto</option>
              </select>
            </div>

            {scoringMode === 'fixed' && (
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5">
                  Pontos por acerto
                </label>
                <input 
                  type="number" 
                  min="10" 
                  max="1000" 
                  value={fixedPoints} 
                  onChange={e => setFixedPoints(Math.max(0, parseInt(e.target.value) || 100))}
                  className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-white text-xs outline-none"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5">
                  Dificuldade
                </label>
                <select 
                  className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-white text-xs outline-none"
                  value={difficultyFilter} 
                  onChange={e => setDifficultyFilter(e.target.value)}
                >
                  <option value="all" className="bg-[#0f1523]">Todas</option>
                  <option value="easy" className="bg-[#0f1523]">Fácil</option>
                  <option value="medium" className="bg-[#0f1523]">Média</option>
                  <option value="hard" className="bg-[#0f1523]">Difícil</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase block mb-1.5">
                  Etiqueta / Assunto
                </label>
                <input 
                  type="text" 
                  value={tagFilter} 
                  onChange={e => setTagFilter(e.target.value)}
                  placeholder="Ex: informática"
                  className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-white text-xs outline-none"
                />
              </div>
            </div>

            {/* Salvar Quiz na Biblioteca */}
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col gap-2">
              <label className="text-xs font-bold text-purple-300 uppercase flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5" />
                <span>Salvar Quiz na Biblioteca</span>
              </label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={newQuizName}
                  onChange={e => setNewQuizName(e.target.value)}
                  maxLength={80}
                  placeholder="Nome do Quiz (ex: Revisão Aula 04)"
                  className="flex-1 py-1.5 px-3 rounded-xl bg-black/40 border border-white/15 text-xs text-white outline-none focus:border-purple-400"
                />
                <button
                  type="button"
                  onClick={onSaveQuiz}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
                >
                  Salvar
                </button>
              </div>
            </div>

            <p className={`text-xs font-semibold ${availableQuestionCount < gameRounds ? 'text-amber-300' : 'text-emerald-300'}`}>
              {availableQuestionCount} pergunta{availableQuestionCount === 1 ? '' : 's'} disponível{availableQuestionCount === 1 ? '' : 'is'} para {gameRounds} rodada{gameRounds === 1 ? '' : 's'}.
            </p>
          </div>

          {/* Coluna 2: Seleção de Categorias */}
          <div className="flex flex-col gap-3 rounded-2xl bg-white/[0.02] border border-white/10 p-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onToggleSelectAllCategories(e.target.checked)}
                  className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
                  id="select-all-cats"
                />
                <label htmlFor="select-all-cats" className="text-xs font-bold text-white uppercase tracking-wider cursor-pointer">
                  Categorias ({selectedCategoryIds.length}/{categories.length})
                </label>
              </div>
              <span className="text-[11px] text-slate-400">Marque para incluir</span>
            </div>

            <div className="flex flex-col gap-1.5 max-h-[350px] overflow-y-auto pr-1">
              {categories.map(category => {
                const isSelected = selectedCategoryIds.includes(category.id);
                return (
                  <label
                    key={category.id}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-purple-600/20 border-purple-500/40 text-white' 
                        : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
                    }`}
                  >
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleCategorySelect(category.id)}
                      className="w-4 h-4 rounded accent-purple-600 cursor-pointer shrink-0"
                    />
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: category.color || '#A855F7' }} 
                    />
                    <span className="text-xs font-semibold flex-1 truncate">
                      {category.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rodapé com Botão Principal de Iniciar */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onStartGame}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-sm shadow-xl shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>Abrir Lobby da Sala</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizConfigModal;
