import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  MoreVertical, 
  Star, 
  Copy, 
  Trash, 
  Edit3, 
  HelpCircle,
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

// Gradientes coloridos e vivos para as capas (estilo Kahoot)
const CARD_GRADIENTS = [
  'linear-gradient(135deg, #46178f 0%, #1368ce 100%)',
  'linear-gradient(135deg, #059669 0%, #0284c7 100%)',
  'linear-gradient(135deg, #d97706 0%, #dc2626 100%)',
  'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
  'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
  'linear-gradient(135deg, #0d9488 0%, #1e40af 100%)',
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

  // ─── Visualização em Lista ───────────────────────────────────────────────
  if (isCompactList) {
    return (
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          borderRadius: '12px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0, flex: 1 }}>
          {/* Mini Thumbnail */}
          <div 
            style={{
              width: '52px',
              height: '40px',
              borderRadius: '8px',
              background: gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {quiz.thumbnailUrl ? (
              <img src={quiz.thumbnailUrl} alt={quiz.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Sparkles style={{ width: '18px', height: '18px', color: '#ffffff', opacity: 0.8 }} />
            )}
            <span 
              style={{
                position: 'absolute',
                bottom: '2px',
                right: '4px',
                fontSize: '9px',
                fontWeight: 900,
                color: '#ffffff',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              }}
            >
              {totalQuestions}Q
            </span>
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h4 
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#1e293b',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={quiz.name}
              >
                {quiz.name}
              </h4>
              {quiz.isFavorite && (
                <Star style={{ width: '14px', height: '14px', fill: '#eab308', color: '#eab308', flexShrink: 0 }} />
              )}
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
              {quiz.authorName || 'Professor'} · Modificado em {formattedDate}
            </p>
          </div>
        </div>

        {/* Ações da Lista */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => onPlay(quiz)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: '#1368ce',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(19, 104, 206, 0.2)',
            }}
          >
            <Play style={{ width: '13px', height: '13px', fill: 'currentColor' }} />
            <span>Jogar</span>
          </button>

          {/* Menu Dropdown */}
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              style={{
                padding: '6px',
                borderRadius: '6px',
                color: '#64748b',
                cursor: 'pointer',
                border: 'none',
                background: 'transparent',
              }}
              aria-label="Mais opções"
            >
              <MoreVertical style={{ width: '16px', height: '16px' }} />
            </button>

            {showMenu && (
              <div 
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '6px',
                  width: '180px',
                  borderRadius: '10px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  padding: '6px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  zIndex: 50,
                }}
              >
                <button
                  type="button"
                  onClick={() => { setShowMenu(false); onToggleFavorite(quiz.id); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#334155',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Star style={{ width: '14px', height: '14px', color: quiz.isFavorite ? '#eab308' : '#94a3b8' }} />
                  <span>{quiz.isFavorite ? 'Remover Favorito' : 'Favoritar'}</span>
                </button>
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => { setShowMenu(false); onEdit(quiz); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#334155',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Edit3 style={{ width: '14px', height: '14px', color: '#0284c7' }} />
                    <span>Editar Perguntas</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setShowMenu(false); onDuplicate(quiz.id); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#334155',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Copy style={{ width: '14px', height: '14px', color: '#8b5cf6' }} />
                  <span>Duplicar</span>
                </button>
                <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '4px 0' }} />
                <button
                  type="button"
                  onClick={() => { setShowMenu(false); onDelete(quiz.id); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#ef4444',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Trash style={{ width: '14px', height: '14px' }} />
                  <span>Excluir</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Visualização em Grade Estilo Kahoot! ──────────────────────────────────
  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '14px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(0, 0, 0, 0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
      }}
    >
      {/* Capa com Thumbnail ou Gradiente */}
      <div 
        style={{
          position: 'relative',
          width: '100%',
          height: '140px',
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {quiz.thumbnailUrl ? (
          <img
            src={quiz.thumbnailUrl}
            alt={quiz.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', opacity: 0.85 }}>
            <Sparkles style={{ width: '32px', height: '32px', color: '#ffffff' }} />
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#ffffff', textTransform: 'uppercase' }}>
              Quizziando
            </span>
          </div>
        )}

        {/* Badge de Quantidade de Perguntas estilo Kahoot */}
        <div 
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            padding: '3px 8px',
            borderRadius: '6px',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          <HelpCircle style={{ width: '12px', height: '12px' }} />
          <span>{totalQuestions} {totalQuestions === 1 ? 'questão' : 'questões'}</span>
        </div>

        {/* Botão de Favorito Rápido */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(quiz.id); }}
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            padding: '6px',
            borderRadius: '6px',
            backgroundColor: quiz.isFavorite ? 'rgba(234, 179, 8, 0.9)' : 'rgba(0, 0, 0, 0.4)',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={quiz.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <Star style={{ width: '14px', height: '14px', fill: quiz.isFavorite ? '#ffffff' : 'none' }} />
        </button>
      </div>

      {/* Corpo do Card */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
            <h3 
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: '#1e293b',
                lineHeight: 1.3,
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
              title={quiz.name}
            >
              {quiz.name}
            </h3>

            {/* Menu 3 Pontos */}
            <div style={{ position: 'relative' }} ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                style={{
                  padding: '4px',
                  borderRadius: '6px',
                  color: '#94a3b8',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
                aria-label="Opções do quiz"
              >
                <MoreVertical style={{ width: '16px', height: '16px' }} />
              </button>

              {showMenu && (
                <div 
                  style={{
                    position: 'absolute',
                    right: 0,
                    bottom: '100%',
                    marginBottom: '6px',
                    width: '180px',
                    borderRadius: '10px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    padding: '6px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12)',
                    zIndex: 50,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => { setShowMenu(false); onPlay(quiz); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#1368ce',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#eff6ff')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Play style={{ width: '14px', height: '14px', fill: 'currentColor' }} />
                    <span>Jogar Agora</span>
                  </button>
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => { setShowMenu(false); onEdit(quiz); }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#334155',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Edit3 style={{ width: '14px', height: '14px', color: '#0284c7' }} />
                      <span>Editar Perguntas</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setShowMenu(false); onDuplicate(quiz.id); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#334155',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Copy style={{ width: '14px', height: '14px', color: '#8b5cf6' }} />
                    <span>Duplicar</span>
                  </button>
                  <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '4px 0' }} />
                  <button
                    type="button"
                    onClick={() => { setShowMenu(false); onDelete(quiz.id); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#ef4444',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Trash style={{ width: '14px', height: '14px' }} />
                    <span>Excluir</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
            <span>{quiz.authorName || 'Educador'}</span>
            <span>•</span>
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Botão de Ação Estilo Kahoot! */}
        <div style={{ paddingTop: '8px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            {quiz.tagFilter || 'Geral'}
          </span>

          <button
            type="button"
            onClick={() => onPlay(quiz)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              borderRadius: '6px',
              backgroundColor: '#1368ce',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(19, 104, 206, 0.25)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0f59b3')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1368ce')}
          >
            <Play style={{ width: '13px', height: '13px', fill: 'currentColor' }} />
            <span>Jogar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizCard;
