// DeleteCategoryModal.tsx — Modal de confirmação de exclusão de quiz/categoria
import React from 'react';
import { AlertTriangle, AlertCircle, X, Trash2, Loader2 } from 'lucide-react';
import type { Category } from '../../../App';

interface DeleteCategoryModalProps {
  category: Category | null;
  questionCount: number;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export const DeleteCategoryModal: React.FC<DeleteCategoryModalProps> = ({
  category,
  questionCount,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  if (!category) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          padding: '26px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          border: '1px solid #fee2e2',
        }}
      >
        {/* Cabeçalho do Alerta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#fee2e2',
              border: '1.5px solid #fecaca',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626',
              flexShrink: 0,
            }}
          >
            <AlertTriangle style={{ width: '24px', height: '24px' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
              Excluir Quiz
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Aviso de desvinculação de perguntas
            </span>
          </div>
          {!isDeleting && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
              }}
            >
              <X style={{ width: '20px', height: '20px' }} />
            </button>
          )}
        </div>

        {/* Pergunta de Alerta e Detalhes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '14px', color: '#334155', margin: 0, lineHeight: 1.5 }}>
            Deseja realmente excluir o quiz <strong style={{ color: '#0f172a' }}>"{category.name}"</strong>?
          </p>

          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderLeft: '4px solid #3b82f6',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e40af', fontSize: '13px', fontWeight: 700 }}>
              <AlertCircle style={{ width: '16px', height: '16px' }} />
              <span>Suas questões serão preservadas!</span>
            </div>
            <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.4 }}>
              As <strong>{questionCount} perguntas</strong> vinculadas a este quiz serão desvinculadas e movidas automaticamente para a categoria <strong style={{ color: '#2563eb' }}>"Sem Categoria"</strong>.
            </p>
          </div>
        </div>

        {/* Ações do Modal */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            style={{
              height: '40px',
              padding: '0 18px',
              borderRadius: '10px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.6 : 1,
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!isDeleting) e.currentTarget.style.backgroundColor = '#e2e8f0';
            }}
            onMouseLeave={(e) => {
              if (!isDeleting) e.currentTarget.style.backgroundColor = '#f1f5f9';
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            style={{
              height: '40px',
              padding: '0 20px',
              borderRadius: '10px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!isDeleting) e.currentTarget.style.backgroundColor = '#b91c1c';
            }}
            onMouseLeave={(e) => {
              if (!isDeleting) e.currentTarget.style.backgroundColor = '#dc2626';
            }}
          >
            {isDeleting ? (
              <>
                <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                <span>Excluindo...</span>
              </>
            ) : (
              <>
                <Trash2 style={{ width: '16px', height: '16px' }} />
                <span>Sim, Excluir Quiz</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
