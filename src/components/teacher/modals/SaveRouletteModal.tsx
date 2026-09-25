// SaveRouletteModal.tsx — Modal para salvar quiz personalizado com Roleta
import React from 'react';
import { RotateCw, X } from 'lucide-react';

interface SaveRouletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedQuizIdsCount: number;
  quizName: string;
  onQuizNameChange: (name: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const SaveRouletteModal: React.FC<SaveRouletteModalProps> = ({
  isOpen,
  onClose,
  selectedQuizIdsCount,
  quizName,
  onQuizNameChange,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RotateCw style={{ width: '20px', height: '20px', color: '#46178f' }} />
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#1e1b4b', margin: 0 }}>
              Salvar Quiz com Roleta
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: '0 0 16px 0' }}>
          Você selecionou <b>{selectedQuizIdsCount} quizzes/categorias</b> para girar na Roleta. Dê um nome para salvar esse quiz personalizado na sua biblioteca.
        </p>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Nome do Quiz
            </label>
            <input
              type="text"
              autoFocus
              value={quizName}
              onChange={(e) => onQuizNameChange(e.target.value)}
              placeholder="Ex: Torneio Interclasses de Tecnologia..."
              style={{
                width: '100%',
                height: '42px',
                padding: '0 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                color: '#1e293b',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!quizName.trim()}
              style={{
                flex: 1,
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#1368ce',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                opacity: !quizName.trim() ? 0.6 : 1,
              }}
            >
              Salvar Quiz
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
