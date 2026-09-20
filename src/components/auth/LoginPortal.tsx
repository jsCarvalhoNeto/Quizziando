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
  Eye,
  EyeOff
} from 'lucide-react';

interface LoginPortalProps {
  onJoinAsStudent: (pin: string) => void;
  onGoToPractice: () => void;
  onTeacherLogin: (email: string, pass: string, isSignUp: boolean) => Promise<{ success: boolean; error?: string; info?: string; needsConfirmation?: boolean }>;
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
  const [teacherInfo, setTeacherInfo] = useState('');

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim().toUpperCase();
    if (!cleanPin) {
      setPinError('Informe o PIN da sala fornecido pelo professor.');
      return;
    }
    setPinError('');
    onJoinAsStudent(cleanPin);
  };

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setTeacherError('Preencha o e-mail e a senha para continuar.');
      setTeacherInfo('');
      return;
    }
    setIsLoading(true);
    setTeacherError('');
    setTeacherInfo('');
    const result = await onTeacherLogin(email.trim(), password, isSignUp);
    setIsLoading(false);
    if (result.needsConfirmation && result.info) {
      setTeacherInfo(result.info);
      setIsSignUp(false);
    } else if (!result.success && result.error) {
      setTeacherError(result.error);
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden select-none"
      style={{
        background: 'radial-gradient(circle at 50% 20%, #151b2e 0%, #080b13 70%, #04060a 100%)',
      }}
    >
      {/* Luzes decorativas sutis de fundo */}
      <div 
        style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
          height: '350px',
          background: activeTab === 'student' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(124, 58, 237, 0.1)',
          filter: 'blur(100px)',
          pointerEvents: 'none',
          borderRadius: '50%',
          transition: 'all 0.5s ease',
        }}
      />

      {/* Caixa Centralizada Compacta e Premium */}
      <div className="premium-login-box relative z-10 flex flex-col items-center">
        
        {/* Cabeçalho da Marca */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center gap-2.5 mb-2">
            <img 
              src="/logo.png" 
              alt="Quizziando Logo" 
              style={{ height: '38px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(124, 58, 237, 0.4))' }} 
            />
            <span className="font-extrabold text-2xl tracking-tight text-white">
              Quizziando
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Arena Interativa de Gamificação Educacional
          </p>
        </div>

        {/* Card Principal Compacto */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            width: '100%',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            boxShadow: '0 20px 50px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(124, 58, 237, 0.08)',
            padding: '24px',
          }}
        >
          {/* Seletor Segmentado (Pill Tabs) */}
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '4px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              marginBottom: '22px',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => { setActiveTab('student'); setTeacherError(''); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '9px 12px',
                borderRadius: '11px',
                fontSize: '13px',
                fontWeight: 700,
                transition: 'all 0.25s ease',
                color: activeTab === 'student' ? '#ffffff' : '#94a3b8',
                background: activeTab === 'student' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
                boxShadow: activeTab === 'student' ? '0 4px 14px rgba(16, 185, 129, 0.3)' : 'none',
                cursor: 'pointer',
              }}
            >
              <Gamepad2 style={{ width: '16px', height: '16px' }} />
              <span>Sou Aluno</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('teacher'); setPinError(''); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '9px 12px',
                borderRadius: '11px',
                fontSize: '13px',
                fontWeight: 700,
                transition: 'all 0.25s ease',
                color: activeTab === 'teacher' ? '#ffffff' : '#94a3b8',
                background: activeTab === 'teacher' ? 'linear-gradient(135deg, #7c3aed, #6366f1)' : 'transparent',
                boxShadow: activeTab === 'teacher' ? '0 4px 14px rgba(124, 58, 237, 0.3)' : 'none',
                cursor: 'pointer',
              }}
            >
              <GraduationCap style={{ width: '16px', height: '16px' }} />
              <span>Sou Professor</span>
            </button>
          </div>

          {/* Conteúdo Alternável */}
          <AnimatePresence mode="wait">
            {activeTab === 'student' ? (
              <motion.div
                key="tab-student"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-5"
              >
                <div className="text-center">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Conectar à Partida
                  </h2>
                  <p className="text-[12px] text-slate-400 mt-0.5">
                    Digite o PIN que o professor projetou na tela
                  </p>
                </div>

                {/* Form do PIN */}
                <form onSubmit={handleStudentSubmit} className="flex flex-col gap-3.5">
                  <div>
                    <input
                      type="text"
                      maxLength={8}
                      value={pin}
                      onChange={(e) => {
                        setPin(e.target.value.toUpperCase());
                        if (pinError) setPinError('');
                      }}
                      placeholder="PIN DA SALA"
                      autoFocus
                      style={{
                        width: '100%',
                        height: '52px',
                        textAlign: 'center',
                        fontWeight: 900,
                        fontSize: '22px',
                        letterSpacing: '0.22em',
                        borderRadius: '14px',
                        background: 'rgba(0, 0, 0, 0.45)',
                        border: '1.5px solid rgba(16, 185, 129, 0.4)',
                        color: '#ffffff',
                        outline: 'none',
                        transition: 'all 0.2s ease',
                      }}
                    />
                    {pinError && (
                      <p className="text-red-400 text-xs font-semibold text-center mt-2">
                        {pinError}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    style={{
                      height: '46px',
                      borderRadius: '13px',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 8px 20px -4px rgba(16, 185, 129, 0.4)',
                      cursor: 'pointer',
                      border: 'none',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    <Play style={{ width: '16px', height: '16px', fill: 'currentColor' }} />
                    <span>Entrar no Jogo</span>
                  </button>
                </form>

                {/* Divisor */}
                <div className="flex items-center gap-3 my-0.5">
                  <div className="h-px bg-white/10 flex-1" />
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">ou</span>
                  <div className="h-px bg-white/10 flex-1" />
                </div>

                {/* Botão Treino Individual */}
                <button
                  type="button"
                  onClick={onGoToPractice}
                  style={{
                    height: '42px',
                    borderRadius: '13px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#cbd5e1',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.color = '#cbd5e1';
                  }}
                >
                  <BookOpen style={{ width: '15px', height: '15px', color: '#38bdf8' }} />
                  <span>Praticar no Treino Individual</span>
                  <ArrowRight style={{ width: '13px', height: '13px', color: '#64748b', marginLeft: '2px' }} />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="tab-teacher"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-4"
              >
                <div className="text-center">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    {isSignUp ? 'Criar Conta de Educador' : 'Acesso do Professor'}
                  </h2>
                  <p className="text-[12px] text-slate-400 mt-0.5">
                    Painel de controle e biblioteca de quizzes
                  </p>
                </div>

                {/* Form do Professor */}
                <form onSubmit={handleTeacherSubmit} className="flex flex-col gap-3">
                  <div>
                    <div 
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Mail style={{ width: '16px', height: '16px', color: '#94a3b8', position: 'absolute', left: '14px', pointerEvents: 'none' }} />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="professor@escola.com"
                        style={{
                          width: '100%',
                          height: '44px',
                          paddingLeft: '40px',
                          paddingRight: '14px',
                          borderRadius: '12px',
                          background: 'rgba(0, 0, 0, 0.45)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#ffffff',
                          fontSize: '13px',
                          outline: 'none',
                          transition: 'border-color 0.2s ease',
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.7)')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
                      />
                    </div>
                  </div>

                  <div>
                    <div 
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Lock style={{ width: '16px', height: '16px', color: '#94a3b8', position: 'absolute', left: '14px', pointerEvents: 'none' }} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        style={{
                          width: '100%',
                          height: '44px',
                          paddingLeft: '40px',
                          paddingRight: '40px',
                          borderRadius: '12px',
                          background: 'rgba(0, 0, 0, 0.45)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#ffffff',
                          fontSize: '13px',
                          outline: 'none',
                          transition: 'border-color 0.2s ease',
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.7)')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          color: '#94a3b8',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '4px',
                        }}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff style={{ width: '15px', height: '15px' }} /> : <Eye style={{ width: '15px', height: '15px' }} />}
                      </button>
                    </div>
                  </div>

                  {teacherError && (
                    <p className="text-red-400 text-xs font-semibold text-center p-2 rounded-lg bg-red-500/10 border border-red-500/20 leading-relaxed">
                      {teacherError}
                    </p>
                  )}

                  {teacherInfo && (
                    <p className="text-emerald-300 text-xs font-semibold text-center p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 leading-relaxed">
                      {teacherInfo}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      height: '46px',
                      borderRadius: '13px',
                      background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 8px 20px -4px rgba(124, 58, 237, 0.4)',
                      cursor: 'pointer',
                      border: 'none',
                      marginTop: '4px',
                      opacity: isLoading ? 0.6 : 1,
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    {isLoading ? (
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : isSignUp ? (
                      <>
                        <UserPlus style={{ width: '16px', height: '16px' }} />
                        <span>Cadastrar Professor</span>
                      </>
                    ) : (
                      <>
                        <LogIn style={{ width: '16px', height: '16px' }} />
                        <span>Entrar no Painel</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Rodapé da Aba Professor */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-slate-400">
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(!isSignUp); setTeacherError(''); setTeacherInfo(''); }}
                    className="text-purple-300 hover:text-purple-200 underline font-medium cursor-pointer"
                  >
                    {isSignUp ? 'Já possui conta? Entrar' : 'Criar nova conta'}
                  </button>

                  <button
                    type="button"
                    onClick={onDemoLogin}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: 'rgba(124, 58, 237, 0.15)',
                      border: '1px solid rgba(124, 58, 237, 0.3)',
                      color: '#c084fc',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(124, 58, 237, 0.25)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(124, 58, 237, 0.15)')}
                    title="Acessar com a conta pré-configurada de demonstração"
                  >
                    <Sparkles style={{ width: '12px', height: '12px' }} />
                    <span>Acesso Demo</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Rodapé Discreto */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <ShieldCheck style={{ width: '14px', height: '14px', color: '#a855f7' }} />
          <span>Ambiente Seguro Quizziando</span>
        </div>

      </div>
    </div>
  );
};

export default LoginPortal;
