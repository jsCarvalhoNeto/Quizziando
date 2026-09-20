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
  Users,
  Search,
  Radio
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
  const [activeNav, setActiveNav] = useState<'library' | 'launch' | 'active_rooms'>('library');
  const [globalSearch, setGlobalSearch] = useState('');

  return (
    <div 
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#f4f5f8',
        color: '#1e293b',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ─── Top Bar Superior Estilo Kahoot! (Branco Puro e Limpo) ───────────── */}
      <header
        style={{
          height: '64px',
          padding: '0 24px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.03)',
        }}
      >
        {/* Lado Esquerdo: Logo Proporcional e Título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src="/logo.png" 
              alt="Quizziando Logo" 
              style={{
                height: '36px',
                width: 'auto',
                maxHeight: '36px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.02em', color: '#1e1b4b', lineHeight: 1.1 }}>
                Quizziando
              </span>
              <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#46178f' }}>
                Painel do Educador
              </span>
            </div>
          </div>
        </div>

        {/* Centro: Barra de Busca Estilo Kahoot! */}
        <div 
          style={{
            flex: 1,
            maxWidth: '460px',
            margin: '0 20px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search 
            style={{
              position: 'absolute',
              left: '14px',
              width: '16px',
              height: '16px',
              color: '#64748b',
              pointerEvents: 'none',
            }}
          />
          <input 
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Pesquisar quizzes, conteúdos públicos e temas..."
            style={{
              width: '100%',
              height: '40px',
              paddingLeft: '40px',
              paddingRight: '14px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#1e293b',
              outline: 'none',
              transition: 'all 0.2s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = '#46178f';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(70, 23, 143, 0.12)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Lado Direito: Ações Globais & Perfil */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Botão de Destaque 'Criar' estilo Kahoot! (Azul Vibrante) */}
          <button
            type="button"
            onClick={onCreateNewQuiz}
            style={{
              height: '40px',
              padding: '0 18px',
              borderRadius: '8px',
              backgroundColor: '#1368ce',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(19, 104, 206, 0.3)',
              transition: 'transform 0.1s ease, background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0f59b3')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1368ce')}
          >
            <Plus style={{ width: '16px', height: '16px', strokeWidth: 3 }} />
            <span>Criar Quiz</span>
          </button>

          {/* Botão Banco de Questões & IA */}
          <button
            type="button"
            onClick={onOpenQuestionManager}
            style={{
              height: '40px',
              padding: '0 14px',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.color = '#334155';
            }}
            title="Acessar o Banco de Perguntas e IA"
          >
            <Sparkles style={{ width: '15px', height: '15px', color: '#8b5cf6' }} />
            <span>Banco de Questões</span>
          </button>

          {/* Botão Configurações */}
          <button
            type="button"
            onClick={onOpenSettings}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#1e293b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.color = '#64748b';
            }}
            title="Configurações"
          >
            <Settings style={{ width: '16px', height: '16px' }} />
          </button>

          {/* Divisor */}
          <div style={{ height: '24px', width: '1px', backgroundColor: '#e2e8f0', margin: '0 4px' }} />

          {/* Perfil e Sair */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#46178f',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '14px',
              }}
              title={teacherEmail}
            >
              {teacherEmail.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {teacherEmail.split('@')[0]}
              </span>
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>Professor</span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              style={{
                padding: '6px',
                borderRadius: '6px',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.backgroundColor = '#fee2e2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94a3b8';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Sair do painel"
            >
              <LogOut style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Corpo Principal (Sidebar + Área de Conteúdo) ────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Sidebar Lateral Esquerda Estilo Kahoot! */}
        <aside 
          style={{
            width: '240px',
            backgroundColor: '#ffffff',
            borderRight: '1px solid #e5e7eb',
            padding: '20px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Navegação Principal */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setActiveNav('library')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  textAlign: 'left',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  backgroundColor: activeNav === 'library' ? '#f3e8ff' : 'transparent',
                  color: activeNav === 'library' ? '#46178f' : '#475569',
                }}
                onMouseEnter={(e) => {
                  if (activeNav !== 'library') e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (activeNav !== 'library') e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Library style={{ width: '18px', height: '18px', color: activeNav === 'library' ? '#46178f' : '#64748b' }} />
                <span>Biblioteca</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNav('launch')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  textAlign: 'left',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  backgroundColor: activeNav === 'launch' ? '#f3e8ff' : 'transparent',
                  color: activeNav === 'launch' ? '#46178f' : '#475569',
                }}
                onMouseEnter={(e) => {
                  if (activeNav !== 'launch') e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (activeNav !== 'launch') e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Play style={{ width: '18px', height: '18px', color: activeNav === 'launch' ? '#46178f' : '#64748b' }} />
                <span>Lançar Partida</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNav('active_rooms')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  textAlign: 'left',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  backgroundColor: activeNav === 'active_rooms' ? '#f3e8ff' : 'transparent',
                  color: activeNav === 'active_rooms' ? '#46178f' : '#475569',
                }}
                onMouseEnter={(e) => {
                  if (activeNav !== 'active_rooms') e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (activeNav !== 'active_rooms') e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Wifi style={{ width: '18px', height: '18px', color: activeNav === 'active_rooms' ? '#46178f' : '#64748b' }} />
                  <span>Salas Abertas</span>
                </div>
                {activeRooms.length > 0 && (
                  <span 
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 800,
                    }}
                  >
                    {activeRooms.length}
                  </span>
                )}
              </button>
            </nav>

            {/* Divisor */}
            <div style={{ height: '1px', backgroundColor: '#e5e7eb' }} />

            {/* Modos de Apresentação */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: '8px' }}>
                Modos de Apresentação
              </span>

              <button
                type="button"
                onClick={() => onLaunchNewRoom('hybrid')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Monitor style={{ width: '16px', height: '16px', color: '#0284c7' }} />
                <span>Presencial / Telão</span>
              </button>

              <button
                type="button"
                onClick={() => onLaunchNewRoom('online')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Radio style={{ width: '16px', height: '16px', color: '#8b5cf6' }} />
                <span>Online Realtime</span>
              </button>

              <button
                type="button"
                onClick={() => onLaunchNewRoom('local')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Users style={{ width: '16px', height: '16px', color: '#10b981' }} />
                <span>Local (2 Times)</span>
              </button>
            </div>
          </div>

          {/* Dica Pedagógica no Rodapé da Sidebar */}
          <div 
            style={{
              padding: '14px',
              borderRadius: '12px',
              backgroundColor: '#faf5ff',
              border: '1px solid #f3e8ff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#46178f', fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>
              <Sparkles style={{ width: '14px', height: '14px' }} />
              <span>Dica Kahoot! Style</span>
            </div>
            <p style={{ fontSize: '11px', color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
              Projete o telão no modo <b>Presencial</b> para perguntas visuais e deixe os alunos responderem pelo smartphone com PIN da sala.
            </p>
          </div>
        </aside>

        {/* Área Central de Conteúdo */}
        <main 
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '28px 36px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Alerta de Salas Ativas (se houver) */}
          {activeRooms.length > 0 && activeNav !== 'active_rooms' && (
            <div 
              style={{
                padding: '16px 20px',
                borderRadius: '12px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#065f46' }}>
                  Você possui {activeRooms.length} {activeRooms.length === 1 ? 'partida em andamento' : 'partidas em andamento'} aguardando alunos.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveNav('active_rooms')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Gerenciar Salas
              </button>
            </div>
          )}

          {/* ─── Banner Hero Estilo Kahoot! (Roxo Vibrante) ───────────────────── */}
          {activeNav === 'library' && (
            <div 
              style={{
                background: 'linear-gradient(135deg, #46178f 0%, #361070 100%)',
                borderRadius: '16px',
                padding: '32px 36px',
                color: '#ffffff',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '32px',
                boxShadow: '0 10px 25px -5px rgba(70, 23, 143, 0.3)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Elementos decorativos suaves no fundo */}
              <div 
                style={{
                  position: 'absolute',
                  right: '-40px',
                  top: '-40px',
                  width: '240px',
                  height: '240px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.06)',
                  pointerEvents: 'none',
                }}
              />

              {/* Lado Esquerdo do Banner: Título e Mensagem */}
              <div style={{ flex: 1, maxWidth: '580px', position: 'relative', zIndex: 2 }}>
                <h1 
                  style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    lineHeight: 1.2,
                    marginBottom: '12px',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Engaje seus alunos e dinamize o aprendizado com o Quizziando
                </h1>
                <p 
                  style={{
                    fontSize: '14px',
                    lineHeight: 1.6,
                    color: '#e9d5ff',
                    marginBottom: '20px',
                  }}
                >
                  Crie quizzes interativos, lance partidas eletrizantes em tempo real para a turma e acompanhe o desempenho dos estudantes com a melhor experiência de gamificação.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={onCreateNewQuiz}
                    style={{
                      height: '42px',
                      padding: '0 20px',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff',
                      color: '#46178f',
                      fontWeight: 800,
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      transition: 'transform 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    <Plus style={{ width: '16px', height: '16px', strokeWidth: 3 }} />
                    <span>Criar Novo Quiz</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenQuestionManager}
                    style={{
                      height: '42px',
                      padding: '0 18px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)')}
                  >
                    <Sparkles style={{ width: '16px', height: '16px' }} />
                    <span>Gerar com Inteligência Artificial</span>
                  </button>
                </div>
              </div>

              {/* Lado Direito do Banner: Cards de Ação Rápida estilo Kahoot! */}
              <div 
                style={{
                  display: 'flex',
                  gap: '16px',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                {/* Card 1: Partida Presencial */}
                <div 
                  style={{
                    width: '180px',
                    padding: '18px 16px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(20, 6, 45, 0.65)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontSize: '11px', fontWeight: 800, marginBottom: '6px' }}>
                      <Monitor style={{ width: '14px', height: '14px' }} />
                      <span>TELÃO / SALA</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', display: 'block', marginBottom: '4px' }}>
                      Presencial
                    </span>
                    <p style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: 1.4, margin: 0 }}>
                      Projete no projetor para toda a turma responder.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLaunchNewRoom('hybrid')}
                    style={{
                      marginTop: '14px',
                      height: '32px',
                      borderRadius: '6px',
                      backgroundColor: '#1368ce',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0f59b3')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1368ce')}
                  >
                    Iniciar Partida
                  </button>
                </div>

                {/* Card 2: Partida Online */}
                <div 
                  style={{
                    width: '180px',
                    padding: '18px 16px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(20, 6, 45, 0.65)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc', fontSize: '11px', fontWeight: 800, marginBottom: '6px' }}>
                      <Radio style={{ width: '14px', height: '14px' }} />
                      <span>REALTIME</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', display: 'block', marginBottom: '4px' }}>
                      Online Remoto
                    </span>
                    <p style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: 1.4, margin: 0 }}>
                      Partidas sincronizadas em tempo real via internet.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLaunchNewRoom('online')}
                    style={{
                      marginTop: '14px',
                      height: '32px',
                      borderRadius: '6px',
                      backgroundColor: '#8b5cf6',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#7c3aed')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#8b5cf6')}
                  >
                    Criar Sala
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Seção da Biblioteca de Quizzes ─────────────────────────────────── */}
          {activeNav === 'library' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e1b4b', margin: 0 }}>
                  Minha Biblioteca de Quizzes
                </h2>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                  {quizzes.length} {quizzes.length === 1 ? 'quiz salvo' : 'quizzes salvos'}
                </span>
              </div>

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
            </div>
          )}

          {/* ─── Seção Lançar Partida (Atalhos) ─────────────────────────────────── */}
          {activeNav === 'launch' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1e1b4b' }}>
                Escolha o Formato da Sua Partida
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                
                {/* Modo 1 */}
                <div 
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                      <Monitor style={{ width: '24px', height: '24px' }} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                      Presencial no Telão
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                      Ideal para sala de aula ou auditório. As perguntas aparecem no telão e os alunos respondem com cores e símbolos no celular.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLaunchNewRoom('hybrid')}
                    style={{
                      marginTop: '24px',
                      height: '42px',
                      borderRadius: '8px',
                      backgroundColor: '#1368ce',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Iniciar Partida no Telão
                  </button>
                </div>

                {/* Modo 2 */}
                <div 
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#f3e8ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                      <Wifi style={{ width: '24px', height: '24px' }} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                      Online em Tempo Real
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                      Para turmas remotas, híbridas ou atividades para casa. Cada aluno vê as perguntas e opções na sua própria tela.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLaunchNewRoom('online')}
                    style={{
                      marginTop: '24px',
                      height: '42px',
                      borderRadius: '8px',
                      backgroundColor: '#46178f',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Criar Sala Online
                  </button>
                </div>

                {/* Modo 3 */}
                <div 
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                      <Users style={{ width: '24px', height: '24px' }} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                      Local (2 Equipes)
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                      Disputa presencial rápida dividindo a turma em dois times (Azul vs Vermelho) usando apenas um único computador.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLaunchNewRoom('local')}
                    style={{
                      marginTop: '24px',
                      height: '42px',
                      borderRadius: '8px',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Abrir Batalha 2 Times
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* ─── Seção Salas Abertas ────────────────────────────────────────────── */}
          {activeNav === 'active_rooms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1e1b4b', margin: 0 }}>
                  Salas e Partidas Abertas
                </h2>
                <button
                  type="button"
                  onClick={() => onLaunchNewRoom('hybrid')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#1368ce',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  + Nova Sala
                </button>
              </div>

              {activeRooms.length === 0 ? (
                <div 
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    padding: '48px 24px',
                    textAlign: 'center',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <Wifi style={{ width: '42px', height: '42px', color: '#cbd5e1', margin: '0 auto 12px' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                    Nenhuma sala aberta no momento
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '400px', margin: '0 auto 20px' }}>
                    Quando você iniciar uma partida com seus alunos, a sala aparecerá aqui com o código PIN para você gerenciar ou retomar a qualquer momento.
                  </p>
                  <button
                    type="button"
                    onClick={() => onLaunchNewRoom('hybrid')}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      backgroundColor: '#46178f',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Criar Sala Agora
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                  {activeRooms.map(room => (
                    <div 
                      key={room.code}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '14px',
                        padding: '20px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '18px', fontWeight: 900, color: '#46178f', letterSpacing: '0.05em' }}>
                          PIN: {room.code}
                        </span>
                        <span style={{ padding: '2px 8px', borderRadius: '6px', backgroundColor: '#dcfce7', color: '#16a34a', fontSize: '11px', fontWeight: 800 }}>
                          Ativa
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Modo: <b>{room.game_mode}</b> · Rodada {room.current_round} de {room.rounds}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button
                          type="button"
                          onClick={() => onRecoverRoom(room.code)}
                          style={{
                            flex: 1,
                            height: '36px',
                            borderRadius: '6px',
                            backgroundColor: '#1368ce',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '12px',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Entrar na Sala
                        </button>
                        <button
                          type="button"
                          onClick={() => onCloseRoom(room.code)}
                          style={{
                            padding: '0 12px',
                            height: '36px',
                            borderRadius: '6px',
                            backgroundColor: '#fee2e2',
                            color: '#ef4444',
                            fontWeight: 700,
                            fontSize: '12px',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Encerrar
                        </button>
                      </div>
                    </div>
                  ))}
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
