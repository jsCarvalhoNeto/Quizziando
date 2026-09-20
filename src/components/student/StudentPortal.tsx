import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Gamepad2, 
  Play, 
  BookOpen, 
  ArrowLeft, 
  Smartphone
} from 'lucide-react';

interface StudentPortalProps {
  onJoinRoom: (pin: string) => void;
  onGoToPractice: () => void;
  onBackToLogin: () => void;
  initialPin?: string;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  onJoinRoom,
  onGoToPractice,
  onBackToLogin,
  initialPin = '',
}) => {
  const [pin, setPin] = useState(initialPin);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim().toUpperCase();
    if (!cleanPin) {
      setError('Por favor, informe o PIN da sala.');
      return;
    }
    setError('');
    onJoinRoom(cleanPin);
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0f1d] text-white flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Compacto do Aluno */}
      <header className="flex items-center justify-between w-full max-w-md mx-auto z-10">
        <button
          type="button"
          onClick={onBackToLogin}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>

        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Quizziando" className="w-7 h-7 object-contain" />
          <span className="font-extrabold text-sm tracking-tight text-white">Quizziando</span>
        </div>

        <div className="w-16" /> {/* Espaçador para equilíbrio */}
      </header>

      {/* Área Central / Card de Entrada */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto my-6 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full glass-card border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col gap-6"
        >
          {/* Título & Ícone */}
          <div className="text-center flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
              <Gamepad2 className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-black text-white mt-1">
              Entrar na Partida
            </h2>
            <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
              Digite o código que o professor projetou na tela da sala.
            </p>
          </div>

          {/* Form do PIN */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <input
                type="text"
                maxLength={8}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.toUpperCase());
                  if (error) setError('');
                }}
                placeholder="PIN DA SALA"
                className="w-full py-4 px-4 text-center font-black text-3xl tracking-[0.25em] rounded-2xl bg-black/60 border-2 border-emerald-500/50 text-white placeholder:text-slate-600 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/25 outline-none transition-all"
                autoFocus
              />
              {error && (
                <p className="text-red-400 text-xs font-bold text-center mt-2 animate-shake">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-black text-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-xl shadow-emerald-500/30 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Conectar e Jogar</span>
            </button>
          </form>

          {/* Divisor */}
          <div className="flex items-center gap-3">
            <div className="h-px bg-white/10 flex-1" />
            <span className="text-[11px] font-bold text-slate-500 uppercase">Ou</span>
            <div className="h-px bg-white/10 flex-1" />
          </div>

          {/* Botão de Estudo / Prática Solo */}
          <button
            type="button"
            onClick={onGoToPractice}
            className="w-full flex items-center justify-center gap-3 p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white transition-all text-xs font-bold"
          >
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>Treino Individual (Sem Professor)</span>
          </button>
        </motion.div>
      </main>

      {/* Rodapé Mobile */}
      <footer className="text-center text-[11px] text-slate-500 z-10 max-w-md mx-auto flex items-center justify-center gap-2">
        <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
        <span>Seu celular é o seu controle de respostas!</span>
      </footer>
    </div>
  );
};

export default StudentPortal;
