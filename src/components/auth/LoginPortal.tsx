import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  Gamepad2, 
  LogIn, 
  UserPlus, 
  Play, 
  BookOpen, 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight,
  Monitor,
  Smartphone,
  Eye,
  EyeOff
} from 'lucide-react';

interface LoginPortalProps {
  onJoinAsStudent: (pin: string) => void;
  onGoToPractice: () => void;
  onTeacherLogin: (email: string, pass: string, isSignUp: boolean) => Promise<{ success: boolean; error?: string }>;
  onDemoLogin: () => void;
  initialPin?: string;
}

export const LoginPortal: React.FC<LoginPortalProps> = ({
  onJoinAsStudent,
  onGoToPractice,
  onTeacherLogin,
  onDemoLogin,
  initialPin = '',
}) => {
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');
  const [pin, setPin] = useState(initialPin);
  const [pinError, setPinError] = useState('');

  // Professor Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [teacherError, setTeacherError] = useState('');

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim().toUpperCase();
    if (!cleanPin) {
      setPinError('Digite o código PIN da sala fornecido pelo professor.');
      return;
    }
    setPinError('');
    onJoinAsStudent(cleanPin);
  };

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setTeacherError('Preencha o e-mail e a senha para continuar.');
      return;
    }
    setIsLoading(true);
    setTeacherError('');
    const result = await onTeacherLogin(email.trim(), password, isSignUp);
    setIsLoading(false);
    if (!result.success && result.error) {
      setTeacherError(result.error);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-radial-gradient relative overflow-hidden">
      {/* Background Decorativo com Brilhos Suaves */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      
      {/* Cabeçalho da Marca */}
      <div className="text-center mb-8 z-10">
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-3 shadow-lg">
          <img 
            src="/logo.png" 
            alt="Quizziando Logo" 
            className="w-8 h-8 object-contain drop-shadow"
          />
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-purple-300 bg-clip-text text-transparent">
            Quizziando
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Arena Interativa
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Aprenda, compita e divirta-se!
        </h1>
        <p className="text-sm text-slate-300 mt-1 max-w-md mx-auto">
          Escolha como deseja acessar para começar a sua experiência.
        </p>
      </div>

      {/* Card Principal */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-xl glass-card border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl z-10"
      >
        {/* Seletor de Perfil (Tabs) */}
        <div className="grid grid-cols-2 p-1.5 bg-black/40 rounded-2xl border border-white/10 mb-6 gap-1">
          <button
            type="button"
            onClick={() => { setActiveTab('student'); setTeacherError(''); }}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 ${
              activeTab === 'student'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Gamepad2 className="w-5 h-5" />
            <span>Sou Aluno</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('teacher'); setPinError(''); }}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 ${
              activeTab === 'teacher'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <GraduationCap className="w-5 h-5" />
            <span>Sou Professor</span>
          </button>
        </div>

        {/* Conteúdo da Aba */}
        <AnimatePresence mode="wait">
          {activeTab === 'student' ? (
            <motion.div
              key="tab-student"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6"
            >
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Otimizado para o seu celular ou qualquer tela!</span>
                </div>
                <span className="font-bold uppercase tracking-wider text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full">
                  Sem Login
                </span>
              </div>

              {/* Formulário do Aluno (PIN) */}
              <form onSubmit={handleStudentSubmit} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="room-pin-input" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Código PIN da Sala:
                  </label>
                  <div className="relative">
                    <input
                      id="room-pin-input"
                      type="text"
                      maxLength={8}
                      value={pin}
                      onChange={(e) => {
                        setPin(e.target.value.toUpperCase());
                        if (pinError) setPinError('');
                      }}
                      placeholder="Ex: ABCD12"
                      className="w-full py-3.5 px-4 text-center font-extrabold text-2xl tracking-[0.25em] rounded-2xl bg-black/50 border-2 border-emerald-500/40 text-white placeholder:text-slate-600 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none"
                      autoFocus
                    />
                  </div>
                  {pinError && (
                    <p className="text-red-400 text-xs font-semibold mt-2 text-center animate-shake">
                      {pinError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-black text-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-xl shadow-emerald-500/30 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Entrar no Jogo</span>
                </button>
              </form>

              {/* Divisor */}
              <div className="flex items-center gap-3 my-1">
                <div className="h-px bg-white/10 flex-1" />
                <span className="text-xs uppercase font-bold text-slate-500">ou pratique sozinho</span>
                <div className="h-px bg-white/10 flex-1" />
              </div>

              {/* Botão de Treino Individual */}
              <button
                type="button"
                onClick={onGoToPractice}
                className="w-full flex items-center justify-center gap-3 p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white transition-all text-sm font-bold group"
              >
                <BookOpen className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>Praticar no Treino Individual</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform ml-auto" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="tab-teacher"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-5"
            >
              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200 text-xs">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-purple-300 shrink-0" />
                  <span>Painel completo de quizzes projetado para PC / Laptop.</span>
                </div>
                <span className="font-bold text-[10px] bg-purple-500/20 px-2 py-0.5 rounded-full text-purple-300 uppercase">
                  Gestor
                </span>
              </div>

              {/* Formulário do Professor */}
              <form onSubmit={handleTeacherSubmit} className="flex flex-col gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    E-mail do Professor:
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="professor@escola.com"
                      className="w-full py-2.5 pl-10 pr-4 rounded-xl bg-black/40 border border-white/15 text-white text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Senha de Acesso:
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full py-2.5 pl-10 pr-10 rounded-xl bg-black/40 border border-white/15 text-white text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {teacherError && (
                  <p className="text-red-400 text-xs font-semibold p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                    {teacherError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-500/25 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : isSignUp ? (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Cadastrar Professor</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Entrar no Painel do Professor</span>
                    </>
                  )}
                </button>
              </form>

              {/* Alternar entre login e cadastro */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); setTeacherError(''); }}
                  className="text-purple-300 hover:text-purple-200 underline font-medium cursor-pointer"
                >
                  {isSignUp ? 'Já tem conta? Fazer Login' : 'Criar nova conta de professor'}
                </button>

                <button
                  type="button"
                  onClick={onDemoLogin}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 text-[11px] font-semibold transition-all border border-purple-500/25"
                  title="Acesse com a conta de demonstração pré-configurada"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Acesso Demo</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Rodapé institucional */}
      <footer className="mt-8 text-center text-xs text-slate-500 z-10 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-purple-400" />
        <span>Quizziando — Plataforma Interativa de Gamificação Educacional</span>
      </footer>
    </div>
  );
};

export default LoginPortal;
