import React, { useState } from 'react';
import { 
  HelpCircle, 
  Search, 
  Plus, 
  Layers,
  FileText
} from 'lucide-react';
import type { Question } from '../../App';

export interface CreateQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Array<{ id: string; name: string; color?: string }>;
  categories: Array<{ id: string; name: string; color?: string }>;
  questions: Question[];
  onSaveQuiz: (quizData: {
    name: string;
    folderId: string | null;
    description?: string;
    timeLimit: number;
    questionIds: string[];
    categoryIds: string[];
  }) => void;
}

export const CreateQuizModal: React.FC<CreateQuizModalProps> = ({
  isOpen,
  onClose,
  folders,
  categories,
  questions,
  onSaveQuiz,
}) => {
  const [name, setName] = useState('');
  const [folderId, setFolderId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState(20);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('');

  if (!isOpen) return null;

  // Filtragem das perguntas disponíveis no acervo
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question_text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCatFilter ? q.category_id === selectedCatFilter : true;
    return matchesSearch && matchesCat;
  });

  const handleToggleQuestion = (qId: string) => {
    setSelectedQuestionIds(prev => 
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    );
  };

  const handleSelectAllFiltered = () => {
    const idsToAdd = filteredQuestions.map(q => q.id);
    setSelectedQuestionIds(prev => {
      const set = new Set([...prev, ...idsToAdd]);
      return Array.from(set);
    });
  };

  const handleDeselectAllFiltered = () => {
    const idsToRemove = new Set(filteredQuestions.map(q => q.id));
    setSelectedQuestionIds(prev => prev.filter(id => !idsToRemove.has(id)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      alert('Por favor, informe um nome para o quiz.');
      return;
    }

    // Identificar categorias correspondentes às perguntas selecionadas
    const involvedCategoryIds = Array.from(
      new Set(
        questions
          .filter(q => selectedQuestionIds.includes(q.id))
          .map(q => q.category_id)
      )
    );

    onSaveQuiz({
      name: trimmedName,
      folderId: folderId ? folderId : null,
      description: description.trim() || undefined,
      timeLimit: Math.max(5, Math.min(120, timeLimit || 20)),
      questionIds: selectedQuestionIds,
      categoryIds: involvedCategoryIds
    });

    // Resetar campos
    setName('');
    setFolderId('');
    setDescription('');
    setTimeLimit(20);
    setSelectedQuestionIds([]);
    setSearchTerm('');
    setSelectedCatFilter('');
    onClose();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeInModal 0.25s ease'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '28px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          width: 'min(980px, 96vw)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          animation: 'slideUpModal 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Cabeçalho */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(2, 132, 199, 0.15)' }}>
              <Layers style={{ width: '22px', height: '22px', strokeWidth: 2.5 }} />
            </div>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1368ce' }}>
                Painel do Educador
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: '2px 0 0 0', letterSpacing: '-0.02em' }}>
                Criar Novo Quiz
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                Defina os dados do quiz, atrele a uma pasta e associe de 0 a N perguntas do seu acervo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
            title="Fechar"
          >
            ×
          </button>
        </div>

        {/* Corpo com Scroll */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.3fr)', gap: '24px', padding: '24px 28px', backgroundColor: '#f8fafc' }}>
            
            {/* COLUNA 1: DADOS BÁSICOS DO QUIZ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText style={{ width: '16px', height: '16px', color: '#1368ce' }} />
                  Informações Principais
                </h4>

                {/* Nome do Quiz */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: '6px' }}>
                    Nome do Quiz <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Aula 15 - Redes de Computadores"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="qm-input"
                    style={{ fontWeight: 600 }}
                  />
                </div>

                {/* Pasta de Destino */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: '6px' }}>
                    Atrelar a uma Pasta (Opcional)
                  </label>
                  <select
                    value={folderId}
                    onChange={(e) => setFolderId(e.target.value)}
                    className="qm-select"
                  >
                    <option value="">📁 Sem pasta (Geral)</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>
                        📂 {f.name}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    O quiz será organizado diretamente na pasta selecionada.
                  </span>
                </div>

                {/* Tempo Limite por Pergunta */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: '6px' }}>
                    Tempo Padrão por Pergunta (Segundos)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value) || 20)}
                    className="qm-input"
                    style={{ fontWeight: 700, textAlign: 'center', width: '120px' }}
                  />
                </div>

                {/* Descrição Opcional */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: '6px' }}>
                    Descrição ou Notas (Opcional)
                  </label>
                  <textarea
                    placeholder="Ex: Conteúdo para fixação da prova bimestral..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="qm-textarea"
                    style={{ minHeight: '80px', height: '80px' }}
                  />
                </div>
              </div>
            </div>

            {/* COLUNA 2: ASSOCIAÇÃO DE PERGUNTAS (0 a N) */}
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '400px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HelpCircle style={{ width: '16px', height: '16px', color: '#7c3aed' }} />
                    Perguntas do Quiz
                  </h4>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Permitido de 0 a N perguntas associadas.
                  </span>
                </div>

                {/* Badge contador */}
                <div style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  backgroundColor: selectedQuestionIds.length > 0 ? '#ede9fe' : '#f1f5f9',
                  color: selectedQuestionIds.length > 0 ? '#7c3aed' : '#64748b',
                  fontSize: '12px',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>{selectedQuestionIds.length}</span>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase' }}>selecionada(s)</span>
                </div>
              </div>

              {/* Filtros e Busca */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search style={{ width: '16px', height: '16px', color: '#94a3b8', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Buscar pergunta..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="qm-input"
                    style={{ paddingLeft: '36px', height: '38px', minHeight: '38px', fontSize: '13px' }}
                  />
                </div>

                <select
                  value={selectedCatFilter}
                  onChange={(e) => setSelectedCatFilter(e.target.value)}
                  className="qm-select"
                  style={{ height: '38px', minHeight: '38px', fontSize: '12px', width: 'auto', minWidth: '150px' }}
                >
                  <option value="">Todas Categorias</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Ações Rápidas de Seleção */}
              {filteredQuestions.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b' }}>
                  <span>Exibindo {filteredQuestions.length} pergunta(s)</span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      style={{ color: '#7c3aed', fontWeight: 800, cursor: 'pointer', background: 'none', border: 'none' }}
                    >
                      Selecionar visíveis
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllFiltered}
                      style={{ color: '#64748b', fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none' }}
                    >
                      Desmarcar
                    </button>
                  </div>
                </div>
              )}

              {/* Lista Scrollável de Questões */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                maxHeight: '280px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingRight: '4px'
              }}>
                {filteredQuestions.map(q => {
                  const isSelected = selectedQuestionIds.includes(q.id);
                  const cat = categories.find(c => c.id === q.category_id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => handleToggleQuestion(q.id)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: isSelected ? '1.5px solid #7c3aed' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#f5f3ff' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // controlado pelo clique no container
                        style={{ width: '18px', height: '18px', accentColor: '#7c3aed', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cat?.color || '#94a3b8' }} />
                          <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>
                            {cat?.name || 'Sem Categoria'}
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {q.question_text}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {filteredQuestions.length === 0 && (
                  <div style={{ padding: '30px 15px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', border: '1px dashed #e2e8f0', borderRadius: '12px' }}>
                    {questions.length === 0 
                      ? 'Nenhuma pergunta cadastrada no acervo ainda. Você pode criar o quiz agora e adicionar perguntas depois.' 
                      : 'Nenhuma pergunta encontrada com o filtro selecionado.'}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Rodapé / Barra de Ação */}
          <div style={{
            padding: '16px 28px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                border: '1.5px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
            >
              Cancelar
            </button>

            <button
              type="submit"
              style={{
                padding: '10px 24px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#1368ce',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(19, 104, 206, 0.35)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0f59b3')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1368ce')}
            >
              <Plus style={{ width: '16px', height: '16px', strokeWidth: 3 }} />
              <span>Criar Quiz</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateQuizModal;
