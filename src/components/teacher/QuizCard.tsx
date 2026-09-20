import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  MoreVertical, 
  Star, 
  Copy, 
  Trash, 
  Edit3, 
  HelpCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { type SavedQuiz } from '../../lib/savedQuizzes';

interface QuizCardProps {
  quiz: SavedQuiz;
  onPlay: (quiz: SavedQuiz) => void;
  onEdit?: (quiz: SavedQuiz) => void;
  onDuplicate: (quizId: string) => void;
  onToggleFavorite: (quizId: string) => void;
  onDelete: (quizId: string) => void;
  isCompactList?: boolean;
}

// Paleta de gradientes atraentes para capas quando não houver imagem
const CARD_GRADIENTS = [
  'from-purple-900 via-indigo-900 to-slate-900',
  'from-blue-900 via-sky-950 to-slate-900',
  'from-emerald-950 via-teal-900 to-slate-900',
  'from-rose-950 via-pink-950 to-slate-900',
  'from-amber-950 via-orange-950 to-slate-900',
  'from-fuchsia-950 via-purple-950 to-slate-900',
];

export const QuizCard: React.FC<QuizCardProps> = ({
  quiz,
  onPlay,
  onEdit,
  onDuplicate,
  onToggleFavorite,
  onDelete,
  isCompactList = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Escolhe gradiente consistente baseado no ID do quiz
  const gradientIndex = Math.abs(
    quiz.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % CARD_GRADIENTS.length;
  const gradient = CARD_GRADIENTS[gradientIndex];

  const totalQuestions = quiz.questionCount || (quiz.questionIds ? quiz.questionIds.length : quiz.rounds || 10);
  const formattedDate = new Date(quiz.savedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });

  if (isCompactList) {
    return (
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 transition-all group">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Mini Thumbnail */}
          <div className={`w-14 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 border border-white/10 overflow-hidden relative shadow`}>
            {quiz.thumbnailUrl ? (
              <img src={quiz.thumbnailUrl} alt={quiz.name} className="w-full h-full object-cover" />
            ) : (
              <Sparkles className="w-5 h-5 text-white/60" />
            )}
            <span className="absolute bottom-0.5 right-1 text-[9px] font-extrabold text-white/90 drop-shadow">
              {totalQuestions}Q
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-white truncate" title={quiz.name}>
                {quiz.name}
              </h4>
              {quiz.isFavorite && (
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              )}
            </div>
            <p className="text-xs text-slate-400 truncate">
              {quiz.authorName || 'Professor'} · Modificado em {formattedDate}
            </p>
          </div>
        </div>

        {/* Ações da Lista */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPlay(quiz)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Jogar</span>
          </button>

          {/* Menu Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Mais opções"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-44 rounded-2xl bg-[#141b2d] border border-white/15 p-1.5 shadow-2xl z-50 animate-fade-in backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => { setShowMenu(false); onToggleFavorite(quiz.id); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-white/10 transition"
                >
                  <Star className={`w-4 h-4 ${quiz.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
                  <span>{quiz.isFavorite ? 'Remover dos favoritos' : 'Favoritar'}</span>
                </button>
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => { setShowMenu(false); onEdit(quiz); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-white/10 transition"
                  >
                    <Edit3 className="w-4 h-4 text-sky-400" />
                    <span>Editar Perguntas</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setShowMenu(false); onDuplicate(quiz.id); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-white/10 transition"
                >
                  <Copy className="w-4 h-4 text-purple-400" />
                  <span>Duplicar</span>
                </button>
                <div className="h-px bg-white/10 my-1" />
                <button
                  type="button"
                  onClick={() => { setShowMenu(false); onDelete(quiz.id); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/15 transition"
                >
                  <Trash className="w-4 h-4" />
                  <span>Excluir</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Visualização Padrão em Card / Grid (Estilo Kahoot)
  return (
    <div className="group relative flex flex-col rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-purple-500/40 transition-all duration-300 shadow-lg hover:shadow-purple-500/10 overflow-hidden">
      {/* Capa com Thumbnail ou Gradiente */}
      <div className={`relative w-full h-36 bg-gradient-to-br ${gradient} overflow-hidden flex items-center justify-center`}>
        {quiz.thumbnailUrl ? (
          <img
            src={quiz.thumbnailUrl}
            alt={quiz.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 opacity-40 group-hover:opacity-60 transition-opacity">
            <Sparkles className="w-10 h-10 text-white" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">Quizziando</span>
          </div>
        )}

        {/* Badge de Quantidade de Perguntas (Canto inferior direito da imagem) */}
        <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/20 text-white text-xs font-bold shadow-md flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-purple-300" />
          <span>{totalQuestions} perguntas</span>
        </div>

        {/* Botão de Favorito Rápido */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(quiz.id); }}
          className={`absolute top-2.5 left-2.5 p-1.5 rounded-lg backdrop-blur-md border transition-all ${
            quiz.isFavorite 
              ? 'bg-amber-500/30 border-amber-400/50 text-amber-300' 
              : 'bg-black/40 border-white/10 text-white/50 hover:text-white opacity-0 group-hover:opacity-100'
          }`}
          title={quiz.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <Star className={`w-4 h-4 ${quiz.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
        </button>

        {/* Hover Overlay com Botão de Jogar Direto */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
          <button
            type="button"
            onClick={() => onPlay(quiz)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-sm shadow-xl shadow-emerald-500/30 scale-95 group-hover:scale-100 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Iniciar Quiz</span>
          </button>
        </div>
      </div>

      {/* Corpo do Card */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-extrabold text-base text-white line-clamp-2 leading-snug group-hover:text-purple-300 transition-colors" title={quiz.name}>
              {quiz.name}
            </h3>

            {/* Menu 3 Pontos */}
            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Opções do quiz"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 bottom-full mb-1 w-44 rounded-2xl bg-[#141b2d] border border-white/15 p-1.5 shadow-2xl z-50 animate-fade-in backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={() => { setShowMenu(false); onPlay(quiz); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 transition"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Jogar Agora</span>
                  </button>
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => { setShowMenu(false); onEdit(quiz); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-white/10 transition"
                    >
                      <Edit3 className="w-4 h-4 text-sky-400" />
                      <span>Editar Perguntas</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setShowMenu(false); onDuplicate(quiz.id); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-white/10 transition"
                  >
                    <Copy className="w-4 h-4 text-purple-400" />
                    <span>Duplicar Quiz</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowMenu(false); onToggleFavorite(quiz.id); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-white/10 transition"
                  >
                    <Star className={`w-4 h-4 ${quiz.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
                    <span>{quiz.isFavorite ? 'Desfavoritar' : 'Favoritar'}</span>
                  </button>
                  <div className="h-px bg-white/10 my-1" />
                  <button
                    type="button"
                    onClick={() => { setShowMenu(false); onDelete(quiz.id); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/15 transition"
                  >
                    <Trash className="w-4 h-4" />
                    <span>Excluir</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <span>{quiz.authorName || 'Você'}</span>
            <span>·</span>
            <span>{formattedDate}</span>
          </p>
        </div>

        {/* Rodapé com atalho rápido */}
        <div className="flex items-center justify-between pt-2.5 border-t border-white/10 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            {quiz.timeLimit || 15}s por questão
          </span>

          <button
            type="button"
            onClick={() => onPlay(quiz)}
            className="flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors"
          >
            <span>Iniciar</span>
            <Play className="w-3 h-3 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizCard;
