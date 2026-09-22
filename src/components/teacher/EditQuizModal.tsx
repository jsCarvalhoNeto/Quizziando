import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  HelpCircle, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Check, 
  Clock, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import type { Question, Category } from '../../App';
import type { SavedQuiz } from '../../lib/savedQuizzes';

export interface QuestionAlternative {
  text: string;
  isCorrect: boolean;
}

export interface EditQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Categoria sendo editada (se for o quiz principal da biblioteca)
  category: Category | null;
  // Ou SavedQuiz se for um quiz salvo customizado
  savedQuiz?: SavedQuiz | null;
  folders: Array<{ id: string; name: string; color?: string }>;
  allCategories: Category[];
  allQuestions: Question[];
  onSave: (payload: {
    targetId: string;
    isCategory: boolean;
    name: string;
    folderId: string | null;
    color?: string;
    // Lista final de IDs de perguntas que pertencem ao quiz
    finalQuestionIds: string[];
    // Perguntas que foram editadas durante o modal
    editedQuestions: Question[];
    // Perguntas novinhas que foram criadas diretamente neste modal
    newQuestions: Array<Omit<Question, 'id'>>;
    // IDs de perguntas que foram removidas do quiz
    removedQuestionIds: string[];
  }) => Promise<void>;
}

const THEME_COLORS = [
  '#46178F', // Roxo Kahoot
  '#1368CE', // Azul Royal
  '#059669', // Verde Esmeralda
  '#D97706', // Âmbar / Laranja
  '#DC2626', // Vermelho
  '#DB2777', // Rosa
  '#7C3AED', // Violeta
  '#0D9488', // Turquesa
];

export const EditQuizModal: React.FC<EditQuizModalProps> = ({
  isOpen,
  onClose,
  category,
  savedQuiz,
  folders,
  allCategories,
  allQuestions,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'questions' | 'new_question' | 'import'>('questions');
  
  // Dados Básicos
  const [name, setName] = useState('');
  const [folderId, setFolderId] = useState<string>('');
  const [color, setColor] = useState('#46178F');

  // Gestão de Perguntas do Quiz
  // Lista local de questões que pertencem a este quiz
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  // Rastreador de perguntas editadas
  const [editedQuestionsMap, setEditedQuestionsMap] = useState<Map<string, Question>>(new Map());
  // Perguntas recém-criadas na sessão
  const [createdQuestions, setCreatedQuestions] = useState<Array<Omit<Question, 'id'>>>([]);
  // IDs de perguntas removidas
  const [removedQuestionIds, setRemovedQuestionIds] = useState<string[]>([]);

  // Estado do formulário de Criar Nova Pergunta
  const [newQText, setNewQText] = useState('');
  const [newQTimeLimit, setNewQTimeLimit] = useState(20);
  const [newQDifficulty, setNewQDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [newQExplanation, setNewQExplanation] = useState('');
  const [newQAlts, setNewQAlts] = useState<QuestionAlternative[]>([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);

  // Estado da Edição Inline de Pergunta Existente
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [inlineQText, setInlineQText] = useState('');
  const [inlineQTimeLimit, setInlineQTimeLimit] = useState(20);
  const [inlineQDifficulty, setInlineQDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [inlineQExplanation, setInlineQExplanation] = useState('');
  const [inlineQAlts, setInlineQAlts] = useState<QuestionAlternative[]>([]);

  // Estado da Busca na aba Importar do Acervo
  const [importSearch, setImportSearch] = useState('');
  const [importCatFilter, setImportCatFilter] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Inicializar dados quando o modal abre ou o quiz selecionado muda
  useEffect(() => {
    if (!isOpen) return;

    if (category) {
      setName(category.name || '');
      setFolderId(category.folder_id || '');
      setColor(category.color || '#46178F');

      // Buscar perguntas que pertencem a esta categoria
      const currentQuestions = allQuestions.filter(q => q.category_id === category.id);
      setQuizQuestions(currentQuestions);
    } else if (savedQuiz) {
      setName(savedQuiz.name || '');
      setFolderId(savedQuiz.folderId || '');
      setColor('#1368CE');

      const savedIds = new Set(savedQuiz.questionIds || []);
      const currentQuestions = allQuestions.filter(q => savedIds.has(q.id));
      setQuizQuestions(currentQuestions);
    }

    setEditedQuestionsMap(new Map());
    setCreatedQuestions([]);
    setRemovedQuestionIds([]);
    setEditingQuestionId(null);
    setErrorMsg('');
    setActiveTab('questions');
  }, [isOpen, category, savedQuiz, allQuestions]);

  if (!isOpen) return null;

  const targetId = category ? category.id : (savedQuiz ? savedQuiz.id : '');
  const isCategory = !!category;

  // ─── Manipulação de Perguntas do Quiz ────────────────────────────────────

  const handleRemoveQuestion = (qId: string) => {
    setQuizQuestions(prev => prev.filter(q => q.id !== qId));
    setRemovedQuestionIds(prev => [...prev, qId]);
    if (editingQuestionId === qId) {
      setEditingQuestionId(null);
    }
  };

  const handleStartEditQuestion = (q: Question) => {
    setEditingQuestionId(q.id);
    setInlineQText(q.question_text);
    setInlineQTimeLimit(q.time_limit || 20);
    setInlineQDifficulty(q.difficulty || 'medium');
    setInlineQExplanation(q.explanation || '');
    setInlineQAlts(q.alternatives && q.alternatives.length > 0 ? q.alternatives : [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ]);
  };

  const handleSaveInlineQuestion = () => {
    if (!inlineQText.trim()) {
      alert('O enunciado da pergunta não pode estar vazio.');
      return;
    }

    const filledAlts = inlineQAlts.filter(a => a.text.trim().length > 0);
    if (filledAlts.length < 2) {
      alert('A pergunta deve conter pelo menos 2 alternativas preenchidas.');
      return;
    }

    const hasCorrect = filledAlts.some(a => a.isCorrect);
    if (!hasCorrect) {
      alert('Selecione pelo menos uma alternativa como correta.');
      return;
    }

    const updatedQ: Question = {
      id: editingQuestionId!,
      category_id: targetId,
      question_text: inlineQText.trim(),
      time_limit: inlineQTimeLimit,
      difficulty: inlineQDifficulty,
      explanation: inlineQExplanation.trim() || null,
      reference_url: null,
      alternatives: inlineQAlts.map(alt => ({
        text: alt.text.trim(),
        isCorrect: alt.isCorrect
      }))
    };

    setQuizQuestions(prev => prev.map(q => q.id === editingQuestionId ? updatedQ : q));
    setEditedQuestionsMap(prev => new Map(prev).set(editingQuestionId!, updatedQ));
    setEditingQuestionId(null);
  };

  // Criar Nova Pergunta diretamente
  const handleAddNewQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQText.trim()) {
      alert('O enunciado da pergunta é obrigatório.');
      return;
    }

    const filledAlts = newQAlts.filter(a => a.text.trim().length > 0);
    if (filledAlts.length < 2) {
      alert('Preencha pelo menos 2 alternativas.');
      return;
    }

    const hasCorrect = filledAlts.some(a => a.isCorrect);
    if (!hasCorrect) {
      alert('Marque a alternativa correta.');
      return;
    }

    const tempId = `new-q-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newQuestionObj: Question = {
      id: tempId,
      category_id: targetId,
      question_text: newQText.trim(),
      time_limit: newQTimeLimit,
      difficulty: newQDifficulty,
      explanation: newQExplanation.trim() || null,
      reference_url: null,
      alternatives: newQAlts.map(alt => ({
        text: alt.text.trim(),
        isCorrect: alt.isCorrect
      }))
    };

    // Adiciona na lista visual do quiz
    setQuizQuestions(prev => [...prev, newQuestionObj]);
    // Registra nas novas perguntas a persistir
    setCreatedQuestions(prev => [...prev, {
      category_id: targetId,
      question_text: newQuestionObj.question_text,
      time_limit: newQuestionObj.time_limit,
      difficulty: newQuestionObj.difficulty,
      explanation: newQuestionObj.explanation,
      reference_url: null,
      alternatives: newQuestionObj.alternatives
    }]);

    // Limpa formulário de criação
    setNewQText('');
    setNewQExplanation('');
    setNewQTimeLimit(20);
    setNewQDifficulty('medium');
    setNewQAlts([
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ]);

    setActiveTab('questions');
  };

  // Importar perguntas do banco geral
  const handleImportQuestion = (questionToImport: Question) => {
    if (quizQuestions.some(q => q.id === questionToImport.id)) {
      return; // Já está no quiz
    }

    setQuizQuestions(prev => [...prev, questionToImport]);
    // Se estava na lista de removidos, desfaz a remoção
    setRemovedQuestionIds(prev => prev.filter(id => id !== questionToImport.id));
  };

  // Perguntas disponíveis para importação (que não estão atualmente no quiz)
  const currentQuizQIds = new Set(quizQuestions.map(q => q.id));
  const availableToImport = allQuestions.filter(q => {
    if (currentQuizQIds.has(q.id)) return false;
    const matchesSearch = importSearch ? q.question_text.toLowerCase().includes(importSearch.toLowerCase()) : true;
    const matchesCat = importCatFilter ? q.category_id === importCatFilter : true;
    return matchesSearch && matchesCat;
  });

  // ─── Salvar Todas as Alterações ─────────────────────────────────────────

  const handleSaveAll = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Por favor, informe o nome do quiz.');
      setActiveTab('info');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      // Coleta todos os IDs finais (excluindo os temporários de criados)
      const persistentIds = quizQuestions
        .filter(q => !q.id.startsWith('new-q-'))
        .map(q => q.id);

      await onSave({
        targetId,
        isCategory,
        name: trimmedName,
        folderId: folderId ? folderId : null,
        color,
        finalQuestionIds: persistentIds,
        editedQuestions: Array.from(editedQuestionsMap.values()),
        newQuestions: createdQuestions,
        removedQuestionIds,
      });

      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar edições do quiz:', err);
      setErrorMsg('Ocorreu um erro ao salvar as alterações: ' + (err?.message || 'Tente novamente.'));
    } finally {
      setIsSaving(false);
    }
  };

  const totalCurrentQuestions = quizQuestions.length;

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
        padding: '16px',
        animation: 'fadeInModal 0.25s ease'
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}
    >
      <div 
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          width: 'min(960px, 96vw)',
          height: 'min(840px, 92vh)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          animation: 'slideUpModal 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Cabeçalho */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '12px', 
                backgroundColor: color ? `${color}18` : '#ede9fe', 
                color: color || '#7c3aed', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
              }}
            >
              <Edit3 style={{ width: '20px', height: '20px', strokeWidth: 2.5 }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Editar Quiz
                </h3>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 800, 
                  backgroundColor: '#f1f5f9', 
                  color: '#475569', 
                  padding: '2px 8px', 
                  borderRadius: '12px' 
                }}>
                  {totalCurrentQuestions} {totalCurrentQuestions === 1 ? 'questão' : 'questões'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                Altere o nome, pasta e gerencie as perguntas deste quiz diretamente.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
            title="Fechar"
          >
            ×
          </button>
        </div>

        {/* Abas de Navegação */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          padding: '8px 24px', 
          backgroundColor: '#f8fafc', 
          borderBottom: '1px solid #e2e8f0',
          overflowX: 'auto'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'questions' ? '#ffffff' : 'transparent',
              color: activeTab === 'questions' ? '#1368ce' : '#64748b',
              boxShadow: activeTab === 'questions' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <HelpCircle style={{ width: '14px', height: '14px' }} />
            <span>Questões do Quiz ({totalCurrentQuestions})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('new_question')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'new_question' ? '#ffffff' : 'transparent',
              color: activeTab === 'new_question' ? '#7c3aed' : '#64748b',
              boxShadow: activeTab === 'new_question' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus style={{ width: '14px', height: '14px' }} />
            <span>Criar Nova Pergunta</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'import' ? '#ffffff' : 'transparent',
              color: activeTab === 'import' ? '#059669' : '#64748b',
              boxShadow: activeTab === 'import' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Sparkles style={{ width: '14px', height: '14px' }} />
            <span>Importar do Acervo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('info')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'info' ? '#ffffff' : 'transparent',
              color: activeTab === 'info' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'info' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <FileText style={{ width: '14px', height: '14px' }} />
            <span>Nome e Pasta</span>
          </button>
        </div>

        {/* Mensagem de Erro se houver */}
        {errorMsg && (
          <div style={{
            margin: '12px 24px 0 24px',
            padding: '10px 14px',
            borderRadius: '10px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Conteúdo da Aba Ativa */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', backgroundColor: '#f8fafc' }}>
          
          {/* ─── ABA 1: QUESTÕES DO QUIZ ─── */}
          {activeTab === 'questions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                    Perguntas pertencentes a este quiz ({totalCurrentQuestions})
                  </h4>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                    Remova ou edite as perguntas do quiz. As alterações serão salvas ao clicar em "Salvar Alterações".
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('new_question')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#7c3aed',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)',
                    }}
                  >
                    <Plus style={{ width: '13px', height: '13px' }} />
                    <span>+ Nova Pergunta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('import')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff',
                      color: '#059669',
                      fontSize: '12px',
                      fontWeight: 800,
                      border: '1px solid #d1fae5',
                      cursor: 'pointer',
                    }}
                  >
                    <Sparkles style={{ width: '13px', height: '13px' }} />
                    <span>+ Importar do Acervo</span>
                  </button>
                </div>
              </div>

              {quizQuestions.length === 0 ? (
                <div style={{
                  padding: '48px 24px',
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1px dashed #cbd5e1',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '10px'
                }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    <HelpCircle style={{ width: '24px', height: '24px' }} />
                  </div>
                  <div>
                    <h5 style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                      Nenhuma pergunta neste quiz ainda
                    </h5>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                      Adicione perguntas criando uma do zero ou importando do acervo existente.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setActiveTab('new_question')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        backgroundColor: '#7c3aed',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 800,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Criar Pergunta
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('import')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        backgroundColor: '#f1f5f9',
                        color: '#334155',
                        fontSize: '12px',
                        fontWeight: 800,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Importar do Acervo
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {quizQuestions.map((q, idx) => {
                    const isEditing = editingQuestionId === q.id;

                    if (isEditing) {
                      return (
                        <div 
                          key={q.id}
                          style={{
                            padding: '16px',
                            borderRadius: '14px',
                            backgroundColor: '#ffffff',
                            border: '2px solid #7c3aed',
                            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', fontWeight: 900, color: '#7c3aed', textTransform: 'uppercase' }}>
                              Editando Questão #{idx + 1}
                            </span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => setEditingQuestionId(null)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: '#64748b',
                                  backgroundColor: '#f1f5f9',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveInlineQuestion}
                                style={{
                                  padding: '4px 12px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  color: '#ffffff',
                                  backgroundColor: '#7c3aed',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                Concluir Edição
                              </button>
                            </div>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                              Enunciado da Pergunta
                            </label>
                            <textarea
                              value={inlineQText}
                              onChange={(e) => setInlineQText(e.target.value)}
                              rows={2}
                              className="qm-textarea"
                              style={{ width: '100%', fontSize: '13px', fontWeight: 600 }}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                                Tempo Limite (Segundos)
                              </label>
                              <input
                                type="number"
                                min="5"
                                max="120"
                                value={inlineQTimeLimit}
                                onChange={(e) => setInlineQTimeLimit(parseInt(e.target.value) || 20)}
                                className="qm-input"
                                style={{ height: '34px', fontSize: '12px' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                                Dificuldade
                              </label>
                              <select
                                value={inlineQDifficulty}
                                onChange={(e) => setInlineQDifficulty(e.target.value as any)}
                                className="qm-select"
                                style={{ height: '34px', fontSize: '12px' }}
                              >
                                <option value="easy">Fácil</option>
                                <option value="medium">Médio</option>
                                <option value="hard">Difícil</option>
                              </select>
                            </div>
                          </div>

                          {/* Alternativas */}
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                              Alternativas (Marque a correta na bolinha)
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {inlineQAlts.map((alt, altIdx) => (
                                <div 
                                  key={altIdx} 
                                  style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    backgroundColor: alt.isCorrect ? '#f0fdf4' : '#f8fafc',
                                    border: alt.isCorrect ? '1px solid #86efac' : '1px solid #e2e8f0',
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name={`inline-correct-alt-${q.id}`}
                                    checked={alt.isCorrect}
                                    onChange={() => {
                                      setInlineQAlts(prev => prev.map((a, i) => ({
                                        ...a,
                                        isCorrect: i === altIdx
                                      })));
                                    }}
                                    style={{ cursor: 'pointer' }}
                                  />
                                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', width: '20px' }}>
                                    {String.fromCharCode(65 + altIdx)}:
                                  </span>
                                  <input
                                    type="text"
                                    value={alt.text}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setInlineQAlts(prev => prev.map((a, i) => i === altIdx ? { ...a, text: val } : a));
                                    }}
                                    placeholder={`Alternativa ${String.fromCharCode(65 + altIdx)}`}
                                    className="qm-input"
                                    style={{ height: '32px', fontSize: '12px', flex: 1 }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Card Normal de Questão
                    const correctAlt = q.alternatives?.find(a => a.isCorrect);

                    return (
                      <div
                        key={q.id}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '12px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '12px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: 0 }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#ede9fe',
                            color: '#7c3aed',
                            fontSize: '11px',
                            fontWeight: 900,
                            flexShrink: 0,
                            height: 'fit-content'
                          }}>
                            Q{idx + 1}
                          </span>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', margin: 0, lineHeight: 1.4 }}>
                              {q.question_text}
                            </p>

                            {/* Alternativa Correta em Destaque */}
                            {correctAlt && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 800, color: '#16a34a' }}>
                                  ✓ Resposta:
                                </span>
                                <span style={{ fontSize: '11px', color: '#334155', fontWeight: 600 }}>
                                  {correctAlt.text}
                                </span>
                              </div>
                            )}

                            {/* Metadados: tempo e alternativas */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                              <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Clock style={{ width: '12px', height: '12px' }} />
                                {q.time_limit || 20}s
                              </span>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>
                                {q.alternatives?.length || 4} alternativas
                              </span>
                              {q.difficulty && (
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: q.difficulty === 'easy' ? '#dcfce7' : q.difficulty === 'hard' ? '#fee2e2' : '#fef9c3',
                                  color: q.difficulty === 'easy' ? '#15803d' : q.difficulty === 'hard' ? '#b91c1c' : '#a16207',
                                }}>
                                  {q.difficulty === 'easy' ? 'Fácil' : q.difficulty === 'hard' ? 'Difícil' : 'Médio'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Ações da Pergunta */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => handleStartEditQuestion(q)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#f1f5f9',
                              border: 'none',
                              color: '#1368ce',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Editar esta pergunta"
                          >
                            <Edit3 style={{ width: '12px', height: '12px' }} />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(q.id)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#fee2e2',
                              border: 'none',
                              color: '#ef4444',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Remover pergunta deste quiz"
                          >
                            <Trash2 style={{ width: '12px', height: '12px' }} />
                            <span>Remover</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── ABA 2: CRIAR NOVA PERGUNTA ─── */}
          {activeTab === 'new_question' && (
            <form onSubmit={handleAddNewQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus style={{ width: '16px', height: '16px', color: '#7c3aed' }} />
                  Cadastrar Nova Pergunta Direto no Quiz
                </h4>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: '6px' }}>
                    Enunciado da Pergunta <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    required
                    placeholder="Ex: Qual é o principal órgão do sistema circulatório humano?"
                    value={newQText}
                    onChange={(e) => setNewQText(e.target.value)}
                    className="qm-textarea"
                    style={{ minHeight: '70px', fontSize: '13px', fontWeight: 600 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: '6px' }}>
                      Tempo Limite por Resposta (Segundos)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={newQTimeLimit}
                      onChange={(e) => setNewQTimeLimit(parseInt(e.target.value) || 20)}
                      className="qm-input"
                      style={{ fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: '6px' }}>
                      Nível de Dificuldade
                    </label>
                    <select
                      value={newQDifficulty}
                      onChange={(e) => setNewQDifficulty(e.target.value as any)}
                      className="qm-select"
                    >
                      <option value="easy">Fácil</option>
                      <option value="medium">Médio</option>
                      <option value="hard">Difícil</option>
                    </select>
                  </div>
                </div>

                {/* Alternativas */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: '6px' }}>
                    Alternativas de Resposta (Selecione a correta) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {newQAlts.map((alt, idx) => (
                      <div 
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          backgroundColor: alt.isCorrect ? '#f0fdf4' : '#f8fafc',
                          border: alt.isCorrect ? '1.5px solid #22c55e' : '1px solid #e2e8f0',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input
                          type="radio"
                          name="new-q-correct-alt"
                          checked={alt.isCorrect}
                          onChange={() => {
                            setNewQAlts(prev => prev.map((a, i) => ({ ...a, isCorrect: i === idx })));
                          }}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          title="Marcar como correta"
                        />
                        <span style={{ fontSize: '12px', fontWeight: 800, color: alt.isCorrect ? '#16a34a' : '#64748b', width: '22px' }}>
                          {String.fromCharCode(65 + idx)}:
                        </span>
                        <input
                          type="text"
                          required={idx < 2}
                          value={alt.text}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewQAlts(prev => prev.map((a, i) => i === idx ? { ...a, text: val } : a));
                          }}
                          placeholder={`Alternativa ${String.fromCharCode(65 + idx)} ${idx < 2 ? '(Obrigatória)' : '(Opcional)'}`}
                          className="qm-input"
                          style={{ flex: 1, height: '36px', fontSize: '13px' }}
                        />
                        {alt.isCorrect && (
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#16a34a', paddingRight: '4px' }}>
                            Correta ✓
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explicação Opcional */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: '6px' }}>
                    Explicação Pedagógica (Opcional - exibida após a resposta)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: O coração bombeia sangue rico em oxigênio para todo o organismo."
                    value={newQExplanation}
                    onChange={(e) => setNewQExplanation(e.target.value)}
                    className="qm-input"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('questions')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      backgroundColor: '#f1f5f9',
                      border: 'none',
                      color: '#475569',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Voltar para Questões
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '8px 20px',
                      borderRadius: '8px',
                      backgroundColor: '#7c3aed',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)'
                    }}
                  >
                    <Plus style={{ width: '14px', height: '14px' }} />
                    <span>Adicionar ao Quiz</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ─── ABA 3: IMPORTAR DO ACERVO ─── */}
          {activeTab === 'import' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', margin: 0 }}>
                    Buscar Perguntas no Acervo Geral
                  </h4>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                    Localize perguntas existentes em outras categorias ou sem categoria e vincule a este quiz com um clique.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
                  <div style={{ position: 'relative' }}>
                    <Search style={{ width: '16px', height: '16px', color: '#94a3b8', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Pesquisar por texto da pergunta..."
                      value={importSearch}
                      onChange={(e) => setImportSearch(e.target.value)}
                      className="qm-input"
                      style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
                    />
                  </div>

                  <select
                    value={importCatFilter}
                    onChange={(e) => setImportCatFilter(e.target.value)}
                    className="qm-select"
                    style={{ height: '38px', minWidth: '180px', fontSize: '12px' }}
                  >
                    <option value="">Todas as Categorias</option>
                    {allCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lista de Perguntas Disponíveis */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748b' }}>
                  Disponíveis para importar ({availableToImport.length})
                </span>

                {availableToImport.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '13px' }}>
                    Nenhuma pergunta encontrada para os filtros selecionados.
                  </div>
                ) : (
                  availableToImport.map(q => {
                    const originCat = allCategories.find(c => c.id === q.category_id);
                    const correctAlt = q.alternatives?.find(a => a.isCorrect);

                    return (
                      <div
                        key={q.id}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '12px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', margin: 0, lineHeight: 1.4 }}>
                            {q.question_text}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                              📁 {originCat ? originCat.name : 'Geral (Sem Pasta)'}
                            </span>
                            {correctAlt && (
                              <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                                • ✓ {correctAlt.text}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleImportQuestion(q)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            backgroundColor: '#059669',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 800,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)',
                            flexShrink: 0
                          }}
                        >
                          <Plus style={{ width: '12px', height: '12px' }} />
                          <span>Adicionar</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ─── ABA 4: INFORMAÇÕES GERAIS (NOME E PASTA) ─── */}
          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText style={{ width: '16px', height: '16px', color: '#1368ce' }} />
                  Identificação do Quiz
                </h4>

                {/* Nome do Quiz */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: '6px' }}>
                    Nome do Quiz <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Aula 12 - Processador"
                    className="qm-input"
                    style={{ fontSize: '14px', fontWeight: 700 }}
                  />
                </div>

                {/* Pasta de Destino */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: '6px' }}>
                    Pasta Organizadora
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
                    Mova este quiz para uma pasta temática ou mantenha na raiz geral.
                  </span>
                </div>

                {/* Paleta de Cores */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: '8px' }}>
                    Cor do Tema
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {THEME_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: c,
                          border: color === c ? '3px solid #0f172a' : '2px solid transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'transform 0.1s',
                          transform: color === c ? 'scale(1.1)' : 'scale(1)',
                        }}
                      >
                        {color === c && <Check style={{ width: '16px', height: '16px', color: '#ffffff' }} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé Fixo de Ações */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #f1f5f9',
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>
              Total: {totalCurrentQuestions} {totalCurrentQuestions === 1 ? 'questão' : 'questões'}
            </span>
            {createdQuestions.length > 0 && (
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', backgroundColor: '#f3e8ff', padding: '2px 8px', borderRadius: '10px' }}>
                +{createdQuestions.length} nova(s)
              </span>
            )}
            {removedQuestionIds.length > 0 && (
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: '10px' }}>
                -{removedQuestionIds.length} removida(s)
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: isSaving ? 'not-allowed' : 'pointer'
              }}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                backgroundColor: '#1368ce',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 800,
                border: 'none',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(19, 104, 206, 0.3)',
                transition: 'all 0.15s ease',
                opacity: isSaving ? 0.7 : 1
              }}
            >
              {isSaving ? (
                <>
                  <div style={{ width: '14px', height: '14px', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  <span>Salvando Alterações...</span>
                </>
              ) : (
                <>
                  <Check style={{ width: '16px', height: '16px', strokeWidth: 2.5 }} />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditQuizModal;
