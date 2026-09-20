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
  Users 
} from 'lucide-react';
import { type SavedQuiz } from '../../lib/savedQuizzes';
import QuizLibrary from './QuizLibrary';

interface TeacherDashboardProps {
  teacherEmail: string;
  quizzes: SavedQuiz[];
  folders?: Array<{ id: string; name: string; color?: string }>;
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
  onEditQuiz?: (quiz: SavedQuiz) => void;
  onDuplicateQuiz: (quizId: string) => void;
  onToggleFavorite: (quizId: string) => void;
  onDeleteQuiz: (quizId: string) => void;
  onCreateNewQuiz: () => void;
  onOpenQuestionManager: () => void;
  onOpenSettings: () => void;
  onRecoverRoom: (roomCode: string) => void;
  onCloseRoom: (roomCode: string) => void;
  onLaunchNewRoom: (mode: 'online' | 'hybrid' | 'local') => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  teacherEmail,
  quizzes,
  folders = [],
  activeRooms = [],
  onLogout,
  onPlayQuiz,
  onEditQuiz,
  onDuplicateQuiz,
  onToggleFavorite,
  onDeleteQuiz,
  onCreateNewQuiz,
  onOpenQuestionManager,
  onOpenSettings,
  onRecoverRoom,
  onCloseRoom,
  onLaunchNewRoom,
}) => {
  const [activeNav, setActiveNav] = useState<'library' | 'launch' | 'active_rooms' | 'reports'>('library');

  return (
    <div className="min-h-screen w-full bg-[#090d16] text-slate-100 flex flex-col font-sans">
      {/* ─── Top Bar Superior Estilo Kahoot ─────────────────────────────────── */}
      <header className="h-16 px-6 border-b border-white/10 bg-[#0f1523]/90 backdrop-blur-xl flex items-center justify-between sticky top-0 z-40">
        {/* Lado Esquerdo: Marca & Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <img 
              src="/logo.png" 
              alt="Quizziando Logo" 
              className="w-9 h-9 object-contain drop-shadow" 
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-purple-300 bg-clip-text text-transparent">
                Quizziando
              </span>
              <span className="text-[9px] uppercase tracking-widest text-purple-400 font-extrabold">
                Painel do Educador
              </span>
            </div>
          </div>
        </div>

        {/* Lado Direito: Ações Globais & Perfil */}
        <div className="flex items-center gap-3">
          {/* Botão de Destaque para Criar Quiz */}
          <button
            type="button"
            onClick={onCreateNewQuiz}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-500/25 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Quiz</span>
          </button>

          {/* Botão Gerenciador de Questões */}
          <button
            type="button"
            onClick={onOpenQuestionManager}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold transition-all"
            title="Acessar o Banco de Perguntas e IA"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Banco de Questões & IA</span>
          </button>

          {/* Botão Configurações */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
            title="Configurações e Chaves de API"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Divisor */}
          <div className="h-6 w-px bg-white/10" />

          {/* Perfil e Logout */}
          <div className="flex items-center gap-2.5 pl-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-xs font-black text-white shadow-md">
              {teacherEmail.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-white truncate max-w-[130px]" title={teacherEmail}>
                {teacherEmail.split('@')[0]}
              </span>
              <span className="text-[10px] text-slate-400">Professor</span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-1"
              title="Sair do painel"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Corpo Principal (Sidebar + Área de Conteúdo) ────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Lateral Esquerda (Desktop First) */}
        <aside className="w-64 border-r border-white/10 bg-[#0c111e]/80 p-4 flex flex-col justify-between shrink-0 hidden md:flex">
          <div className="flex flex-col gap-6">
            {/* Navegação Principal */}
            <nav className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setActiveNav('library')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  activeNav === 'library'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Library className="w-4 h-4" />
                <span>Biblioteca de Quizzes</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNav('launch')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  activeNav === 'launch'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Play className="w-4 h-4" />
                <span>Lançar Nova Sala</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNav('active_rooms')}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  activeNav === 'active_rooms'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Wifi className="w-4 h-4" />
                  <span>Salas Abertas</span>
                </div>
                {activeRooms.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
                    {activeRooms.length}
                  </span>
                )}
              </button>
            </nav>

            {/* Acesso Rápido a Modos de Apresentação */}
            <div className="flex flex-col gap-2 pt-4 border-t border-white/10">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider px-2">
                Modos de Apresentação
              </span>

              <button
                type="button"
                onClick={() => onLaunchNewRoom('hybrid')}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition group"
              >
                <Monitor className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform" />
                <span>Presencial / Datashow</span>
              </button>

              <button
                type="button"
                onClick={() => onLaunchNewRoom('online')}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition group"
              >
                <Wifi className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                <span>Modo Online Realtime</span>
              </button>

              <button
                type="button"
                onClick={() => onLaunchNewRoom('local')}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition group"
              >
                <Users className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>Modo Local 2 Times</span>
              </button>
            </div>
          </div>

          {/* Banner Informativo no Rodapé da Sidebar */}
          <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-950/40 to-indigo-950/40 border border-purple-500/20">
            <div className="flex items-center gap-2 text-purple-300 text-xs font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Dica Pedagógica</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Use o modo <b>Presencial</b> para projetar perguntas no telão enquanto os alunos respondem pelo smartphone.
            </p>
          </div>
        </aside>

        {/* Área Central de Conteúdo */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {/* Aviso se houver salas ativas aguardando retomada */}
          {activeRooms.length > 0 && activeNav !== 'active_rooms' && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-transparent border border-purple-500/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                  <Wifi className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Você possui {activeRooms.length} sala{activeRooms.length > 1 ? 's' : ''} em andamento
                  </h4>
                  <p className="text-xs text-slate-300">
                    A sala {activeRooms[0].code} está ativa. Você pode retomá-la a qualquer momento.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onRecoverRoom(activeRooms[0].code)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all"
                >
                  Retomar Sala
                </button>
                <button
                  type="button"
                  onClick={() => setActiveNav('active_rooms')}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all"
                >
                  Ver Todas
                </button>
              </div>
            </div>
          )}

          {/* Alternância de Abas Centrais */}
          {activeNav === 'library' && (
            <QuizLibrary
              quizzes={quizzes}
              folders={folders}
              onPlayQuiz={onPlayQuiz}
              onEditQuiz={onEditQuiz}
              onDuplicateQuiz={onDuplicateQuiz}
              onToggleFavorite={onToggleFavorite}
              onDeleteQuiz={onDeleteQuiz}
              onCreateNewQuiz={onCreateNewQuiz}
              onOpenQuestionManager={onOpenQuestionManager}
            />
          )}

          {activeNav === 'launch' && (
            <div className="flex flex-col gap-6 max-w-4xl mx-auto">
              <div>
                <h2 className="text-2xl font-extrabold text-white">Lançar Nova Partida</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Selecione o formato ideal para aplicar com seus alunos em sala ou remotamente.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Presencial Telão */}
                <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-pink-500/40 flex flex-col justify-between gap-4 transition-all">
                  <div className="flex flex-col gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
                      <Monitor className="w-6 h-6" />
                    </div>
                    <h3 className="font-extrabold text-base text-white">Presencial com Celulares</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Projete as perguntas e o placar no datashow/TV da sala enquanto os alunos respondem em seus próprios celulares via QR Code ou PIN.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLaunchNewRoom('hybrid')}
                    className="w-full py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs transition shadow-md shadow-pink-600/20"
                  >
                    Iniciar Presencial
                  </button>
                </div>

                {/* Modo Online */}
                <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-purple-500/40 flex flex-col justify-between gap-4 transition-all">
                  <div className="flex flex-col gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Wifi className="w-6 h-6" />
                    </div>
                    <h3 className="font-extrabold text-base text-white">Modo Online Remoto</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Para aulas virtuais ou atividades onde todos jogam remotamente pela internet com ranking e pódio em tempo real via Supabase.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLaunchNewRoom('online')}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow-md shadow-purple-600/20"
                  >
                    Iniciar Online
                  </button>
                </div>

                {/* Modo Local 2 Times */}
                <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/40 flex flex-col justify-between gap-4 transition-all">
                  <div className="flex flex-col gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Users className="w-6 h-6" />
                    </div>
                    <h3 className="font-extrabold text-base text-white">Modo Local (2 Times)</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Funciona 100% offline sem internet, dividindo a turma em dois times que respondem oralmente com pontuação registrada pelo professor.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLaunchNewRoom('local')}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-600/20"
                  >
                    Iniciar Modo Local
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeNav === 'active_rooms' && (
            <div className="flex flex-col gap-6 max-w-4xl mx-auto">
              <div>
                <h2 className="text-2xl font-extrabold text-white">Salas em Andamento</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Gerencie ou retome as salas ativas criadas na sua conta de professor.
                </p>
              </div>

              {activeRooms.length > 0 ? (
                <div className="grid gap-3">
                  {activeRooms.map(room => (
                    <div 
                      key={room.code} 
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.06] transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-300 font-black text-sm flex items-center justify-center border border-purple-500/30">
                          {room.code}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">
                            Sala {room.code} · <span className="capitalize">{room.game_mode}</span>
                          </p>
                          <p className="text-xs text-slate-400">
                            {room.status === 'lobby' ? 'Aguardando participantes' : `Rodada ${room.current_round} de ${room.rounds}`} · Atualizada em {new Date(room.updated_at).toLocaleTimeString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onCloseRoom(room.code)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 border border-red-500/20 transition"
                        >
                          Encerrar
                        </button>
                        <button
                          type="button"
                          onClick={() => onRecoverRoom(room.code)}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition"
                        >
                          Retomar Jogo
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-12 rounded-3xl border border-white/10 bg-white/[0.02]">
                  <p className="text-slate-400 text-sm">Nenhuma sala aberta no momento.</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default TeacherDashboard;
