import React, { useState, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Layers,
  FileText,
  Calendar,
  Sparkles,
  Upload,
  FileUp,
  X,
  Check,
  Trash2,
  Loader2,
  AlertCircle,
  Key,
  CheckCircle2
} from 'lucide-react';
import type { Question } from '../../App';
import { 
  generateQuestionsWithGemini, 
  type GeneratedQuestionItem 
} from '../../lib/geminiQuizGenerator';

export interface CreateQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Array<{ id: string; name: string; color?: string }>;
  categories: Array<{ id: string; name: string; color?: string }>;
  questions: Question[];
  geminiApiKey?: string;
  geminiModel?: string;
  onSaveQuiz: (quizData: {
    name: string;
    folderId: string | null;
    description?: string;
    timeLimit: number;
    questionIds: string[];
    categoryIds: string[];
    newQuestions?: Array<Omit<Question, 'id'>>;
  }) => void;
}

export const CreateQuizModal: React.FC<CreateQuizModalProps> = ({
  isOpen,
  onClose,
  folders,
  categories,
  questions,
  geminiApiKey: initialApiKey = '',
  geminiModel = 'gemini-1.5-flash',
  onSaveQuiz,
}) => {
  // Dados Básicos do Quiz
  const [name, setName] = useState('');
  const [folderId, setFolderId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState(20);

  // Modo de Adição de Questões: 'existing' (acervo) ou 'ai' (gerar com Gemini)
  const [activeTab, setActiveTab] = useState<'existing' | 'ai'>('existing');

  // Seleção de Perguntas do Acervo
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('');

  // ── Parâmetros de Geração Inteligente via IA (Gemini) ──
  const [aiApiKey, setAiApiKey] = useState(() => {
    return initialApiKey || (typeof window !== 'undefined' ? localStorage.getItem('geminiApiKey') || '' : '');
  });
  const [aiTheme, setAiTheme] = useState('');
  const [aiQuantity, setAiQuantity] = useState<number>(5);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard' | 'all'>('medium');
  const [aiPastedText, setAiPastedText] = useState('');
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKeyInput, setTempKeyInput] = useState('');

  // Questões geradas pela IA na sessão atual
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestionItem[]>([]);
  const [selectedGeneratedIndexes, setSelectedGeneratedIndexes] = useState<number[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Filtragem das perguntas do acervo
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
    setSelectedQuestionIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
  };

  const handleDeselectAllFiltered = () => {
    const idsToRemove = new Set(filteredQuestions.map(q => q.id));
    setSelectedQuestionIds(prev => prev.filter(id => !idsToRemove.has(id)));
  };

  // ── Ações de IA ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAiFile(file);
      setAiError('');
    }
  };

  const handleRemoveFile = () => {
    setAiFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveApiKeyInline = () => {
    if (tempKeyInput.trim()) {
      setAiApiKey(tempKeyInput.trim());
      localStorage.setItem('geminiApiKey', tempKeyInput.trim());
      setShowKeyInput(false);
      setAiError('');
    }
  };

  const handleGenerateWithAI = async () => {
    const keyToUse = aiApiKey.trim() || localStorage.getItem('geminiApiKey') || '';
    if (!keyToUse) {
      setShowKeyInput(true);
      setAiError('Informe sua Chave de API do Gemini para começar a gerar.');
      return;
    }

    if (!aiTheme.trim() && !aiPastedText.trim() && !aiFile) {
      setAiError('Informe um Tema, anexe um Arquivo (PDF/TXT) ou cole um Texto Base.');
      return;
    }

    setAiLoading(true);
    setAiError('');

    try {
      const activeCatName = selectedCatFilter 
        ? categories.find(c => c.id === selectedCatFilter)?.name 
        : (name.trim() || 'Quiz Escolar');

      const items = await generateQuestionsWithGemini({
        apiKey: keyToUse,
        model: geminiModel,
        themeOrPrompt: aiTheme,
        categoryName: activeCatName,
        quantity: aiQuantity,
        difficulty: aiDifficulty,
        pastedText: aiPastedText,
        file: aiFile,
        timeLimit: timeLimit,
      });

      // Se o nome do quiz estiver vazio, sugere o tema automaticamente
      if (!name.trim() && aiTheme.trim()) {
        setName(aiTheme.trim());
      }

      // Adiciona as novas perguntas geradas
      setGeneratedQuestions(prev => {
        const nextList = [...prev, ...items];
        // Seleciona todas por padrão
        setSelectedGeneratedIndexes(nextList.map((_, idx) => idx));
        return nextList;
      });

    } catch (err: any) {
      setAiError(err?.message || 'Falha ao comunicar com o Google Gemini.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleToggleGeneratedIndex = (index: number) => {
    setSelectedGeneratedIndexes(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleRemoveGenerated = (index: number) => {
    setGeneratedQuestions(prev => prev.filter((_, i) => i !== index));
    setSelectedGeneratedIndexes(prev => 
      prev.filter(i => i !== index).map(i => (i > index ? i - 1 : i))
    );
  };

  // ── Submissão do Quiz ──
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      alert('Por favor, informe um nome para o quiz.');
      return;
    }

    // Identificar categorias correspondentes às perguntas selecionadas do acervo
    const involvedCategoryIds = Array.from(
      new Set(
        questions
          .filter(q => selectedQuestionIds.includes(q.id))
          .map(q => q.category_id)
      )
    );

    // Perguntas geradas por IA selecionadas
    const newQuestionsToCreate: Array<Omit<Question, 'id'>> = selectedGeneratedIndexes
      .map(idx => generatedQuestions[idx])
      .filter(Boolean)
      .map(gq => ({
        category_id: '', // preenchida pelo backend/App.tsx
        question_text: gq.question_text,
        time_limit: gq.time_limit || timeLimit,
        explanation: gq.explanation || null,
        reference_url: null,
        difficulty: gq.difficulty || 'medium',
        tags: ['IA', 'Gemini'],
        alternatives: gq.alternatives
      }));

    onSaveQuiz({
      name: trimmedName,
      folderId: folderId ? folderId : null,
      description: description.trim() || undefined,
      timeLimit: Math.max(5, Math.min(120, timeLimit || 20)),
      questionIds: selectedQuestionIds,
      categoryIds: involvedCategoryIds,
      newQuestions: newQuestionsToCreate.length > 0 ? newQuestionsToCreate : undefined
    });

    // Resetar campos
    setName('');
    setFolderId('');
    setDescription('');
    setTimeLimit(20);
    setSelectedQuestionIds([]);
    setGeneratedQuestions([]);
    setSelectedGeneratedIndexes([]);
    setAiTheme('');
    setAiPastedText('');
    setAiFile(null);
    onClose();
  };

  const totalSelectedCount = selectedQuestionIds.length + selectedGeneratedIndexes.length;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeInModal 0.25s ease'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          width: 'min(1080px, 98vw)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          animation: 'slideUpModal 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Cabeçalho */}
        <header style={{ 
          padding: '20px 28px', 
          borderBottom: '1px solid #f1f5f9', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          backgroundColor: '#ffffff' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ 
              width: '44px', 
              height: '44px', 
              borderRadius: '14px', 
              background: 'linear-gradient(135deg, #1368CE 0%, #7C3AED 100%)', 
              color: '#ffffff', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)' 
            }}>
              <Layers style={{ width: '22px', height: '22px', strokeWidth: 2.5 }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7C3AED' }}>
                  Painel do Educador
                </span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(19,104,206,0.12) 100%)',
                  color: '#7C3AED',
                  fontSize: '10px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <Sparkles style={{ width: 11, height: 11 }} />
                  IA Integrada
                </span>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: '2px 0 0 0', letterSpacing: '-0.02em' }}>
                Criar Novo Quiz
              </h3>
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
        </header>

        {/* Corpo com Scroll */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'minmax(320px, 1fr) minmax(420px, 1.4fr)', 
            gap: '24px', 
            padding: '24px 28px', 
            backgroundColor: '#f8fafc',
            flex: 1
          }}>
            
            {/* COLUNA 1: DADOS BÁSICOS DO QUIZ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ 
                backgroundColor: '#ffffff', 
                padding: '20px', 
                borderRadius: '18px', 
                border: '1px solid #e2e8f0', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px' 
              }}>
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
                    placeholder="Ex: Aula 12 - Citologia e Membrana Plasmática"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="qm-input"
                    style={{ fontWeight: 600 }}
                  />
                </div>

                {/* Data de Criação */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 12px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '10px',
                  border: '1px solid #bbf7d0',
                  fontSize: '12px',
                  color: '#166534'
                }}>
                  <Calendar style={{ width: '15px', height: '15px', color: '#16a34a', flexShrink: 0 }} />
                  <span>
                    Data de Criação: <strong style={{ color: '#14532d' }}>{new Date().toLocaleDateString('pt-BR')}</strong> (Automática)
                  </span>
                </div>

                {/* Pasta de Destino */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: '6px' }}>
                    Organizar na Pasta (Opcional)
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
                </div>

                {/* Tempo Limite por Pergunta */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: '6px' }}>
                    Tempo Padrão por Pergunta (Segundos)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(parseInt(e.target.value) || 20)}
                      className="qm-input"
                      style={{ fontWeight: 800, textAlign: 'center', width: '90px' }}
                    />
                    <span style={{ fontSize: '12px', color: '#64748b' }}>segundos por rodada</span>
                  </div>
                </div>

                {/* Descrição Opcional */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: '6px' }}>
                    Descrição ou Metas da Aula (Opcional)
                  </label>
                  <textarea
                    placeholder="Ex: Conteúdo para avaliação formativa e fixação bimestral..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="qm-textarea"
                    style={{ minHeight: '75px', height: '75px' }}
                  />
                </div>
              </div>
            </div>

            {/* COLUNA 2: SELEÇÃO MANUAL OU GERADOR COM IA */}
            <div style={{ 
              backgroundColor: '#ffffff', 
              padding: '20px', 
              borderRadius: '18px', 
              border: '1px solid #e2e8f0', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '14px',
              minHeight: '440px' 
            }}>
              {/* Barra de Abas Superiores */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                borderBottom: '1px solid #f1f5f9', 
                paddingBottom: '12px' 
              }}>
                <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('existing')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: activeTab === 'existing' ? '#ffffff' : 'transparent',
                      color: activeTab === 'existing' ? '#0f172a' : '#64748b',
                      boxShadow: activeTab === 'existing' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Search style={{ width: 14, height: 14 }} />
                    <span>Acervo de Questões ({questions.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('ai')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: activeTab === 'ai' ? '#7C3AED' : 'transparent',
                      color: activeTab === 'ai' ? '#ffffff' : '#64748b',
                      boxShadow: activeTab === 'ai' ? '0 2px 8px rgba(124, 58, 237, 0.35)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Sparkles style={{ width: 14, height: 14 }} />
                    <span>Gerar com IA (Gemini)</span>
                  </button>
                </div>

                {/* Badge Total Selecionado */}
                <div style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  backgroundColor: totalSelectedCount > 0 ? '#ede9fe' : '#f1f5f9',
                  color: totalSelectedCount > 0 ? '#7c3aed' : '#64748b',
                  fontSize: '12px',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <span>{totalSelectedCount}</span>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase' }}>questões no quiz</span>
                </div>
              </div>

              {/* ── ABA 1: ACERVO EXISTENTE ── */}
              {activeTab === 'existing' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  {/* Filtros e Busca */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <Search style={{ width: '16px', height: '16px', color: '#94a3b8', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        placeholder="Buscar pergunta existente..."
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
                          Selecionar todas visíveis
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

                  {/* Lista Scrollável do Acervo */}
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    maxHeight: '300px',
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
                            onChange={() => {}}
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
                      <div style={{ padding: '36px 15px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', border: '1px dashed #e2e8f0', borderRadius: '14px' }}>
                        Nenhuma questão encontrada no acervo. Experimente a aba <strong>✨ Gerar com IA</strong>!
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── ABA 2: GERADOR INTELIGENTE COM IA (GEMINI) ── */}
              {activeTab === 'ai' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                  
                  {/* Alerta / Chave de API inline se não configurada */}
                  {(!aiApiKey || showKeyInput) && (
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: '#fffbeb',
                      border: '1px solid #fcd34d',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontSize: '12px', fontWeight: 700 }}>
                        <Key style={{ width: 15, height: 15 }} />
                        <span>Chave de API do Google Gemini</span>
                      </div>
                      <p style={{ fontSize: '11px', color: '#78350f', margin: 0 }}>
                        Insira sua chave para gerar questões instantaneamente com IA:
                      </p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="password"
                          placeholder="Cole sua API Key aqui..."
                          value={tempKeyInput}
                          onChange={(e) => setTempKeyInput(e.target.value)}
                          className="qm-input"
                          style={{ fontSize: '12px', padding: '6px 10px', height: '32px' }}
                        />
                        <button
                          type="button"
                          onClick={handleSaveApiKeyInline}
                          style={{
                            padding: '6px 12px',
                            background: '#7c3aed',
                            color: 'white',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 800,
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Painel de Configuração da Geração */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    padding: '14px',
                    background: '#f8fafc',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0'
                  }}>
                    {/* Linha 1: Tema ou Prompt */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', marginBottom: '6px' }}>
                        Tema / Assunto do Quiz
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Revolução Francesa, Fotossíntese, Funções em JavaScript..."
                        value={aiTheme}
                        onChange={(e) => setAiTheme(e.target.value)}
                        className="qm-input"
                        style={{ height: '38px', fontSize: '13px', fontWeight: 600 }}
                      />
                    </div>

                    {/* Linha 2: Quantidade & Nível de Dificuldade */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#475569', marginBottom: '4px' }}>
                          Qtd de Questões
                        </label>
                        <select
                          value={aiQuantity}
                          onChange={(e) => setAiQuantity(Number(e.target.value))}
                          className="qm-select"
                          style={{ height: '34px', fontSize: '12px' }}
                        >
                          <option value={3}>3 questões</option>
                          <option value={5}>5 questões</option>
                          <option value={8}>8 questões</option>
                          <option value={10}>10 questões</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#475569', marginBottom: '4px' }}>
                          Dificuldade
                        </label>
                        <select
                          value={aiDifficulty}
                          onChange={(e) => setAiDifficulty(e.target.value as any)}
                          className="qm-select"
                          style={{ height: '34px', fontSize: '12px' }}
                        >
                          <option value="easy">Fácil</option>
                          <option value="medium">Médio (Recomendado)</option>
                          <option value="hard">Difícil</option>
                          <option value="all">Misto (Equilibrado)</option>
                        </select>
                      </div>
                    </div>

                    {/* Linha 3: Upload de Arquivo (PDF ou TXT) ou Colar Texto */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', margin: 0 }}>
                          Material de Apoio (Opcional)
                        </label>
                        <span style={{ fontSize: '10px', color: '#64748b' }}>PDF, TXT ou texto colado</span>
                      </div>

                      {/* Dropzone / Upload button */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf,.txt,.md"
                        style={{ display: 'none' }}
                      />

                      {aiFile ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <FileUp style={{ width: 16, height: 16, color: '#7c3aed', flexShrink: 0 }} />
                            <span style={{ fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {aiFile.name} ({(aiFile.size / 1024).toFixed(0)} KB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}
                            title="Remover arquivo"
                          >
                            <X style={{ width: 14, height: 14 }} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              borderRadius: '10px',
                              border: '1.5px dashed #cbd5e1',
                              background: '#ffffff',
                              color: '#475569',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <Upload style={{ width: 14, height: 14, color: '#7c3aed' }} />
                            <span>Anexar Apostila / Arquivo (PDF ou TXT)</span>
                          </button>
                        </div>
                      )}

                      {/* Textarea de Texto Colado */}
                      <textarea
                        placeholder="Ou cole aqui o resumo, tópicos ou trecho de matéria para basear o quiz..."
                        value={aiPastedText}
                        onChange={(e) => setAiPastedText(e.target.value)}
                        className="qm-textarea"
                        style={{ minHeight: '50px', height: '50px', fontSize: '11px', resize: 'vertical' }}
                      />
                    </div>

                    {/* Mensagem de Erro da IA se houver */}
                    {aiError && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '10px',
                        color: '#b91c1c',
                        fontSize: '11px',
                        lineHeight: 1.4
                      }}>
                        <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} />
                        <span>{aiError}</span>
                      </div>
                    )}

                    {/* Botão de Ação: Gerar */}
                    <button
                      type="button"
                      onClick={handleGenerateWithAI}
                      disabled={aiLoading}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '12px',
                        border: 'none',
                        background: aiLoading 
                          ? '#94a3b8' 
                          : 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
                        color: 'white',
                        fontSize: '13px',
                        fontWeight: 900,
                        cursor: aiLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(124, 58, 237, 0.35)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {aiLoading ? (
                        <>
                          <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                          <span>Analisando e Criando Questões...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles style={{ width: 16, height: 16 }} />
                          <span>Gerar {aiQuantity} Questões com Gemini IA</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* ── Lista de Questões Geradas com Pré-visualização ── */}
                  {generatedQuestions.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                        <span style={{ fontWeight: 800, color: '#1e293b' }}>
                          Questões Geradas ({selectedGeneratedIndexes.length} de {generatedQuestions.length} aprovadas):
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedGeneratedIndexes(generatedQuestions.map((_, i) => i))}
                            style={{ color: '#7c3aed', fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            Marcar Todas
                          </button>
                          <span>·</span>
                          <button
                            type="button"
                            onClick={() => setSelectedGeneratedIndexes([])}
                            style={{ color: '#64748b', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            Desmarcar
                          </button>
                        </div>
                      </div>

                      <div style={{
                        maxHeight: '220px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        paddingRight: '4px'
                      }}>
                        {generatedQuestions.map((gq, idx) => {
                          const isChecked = selectedGeneratedIndexes.includes(idx);
                          return (
                            <div
                              key={idx}
                              style={{
                                padding: '12px 14px',
                                borderRadius: '12px',
                                border: isChecked ? '1.5px solid #7c3aed' : '1px solid #e2e8f0',
                                background: isChecked ? '#faf5ff' : '#ffffff',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleGeneratedIndex(idx)}
                                    style={{ width: '16px', height: '16px', accentColor: '#7c3aed', cursor: 'pointer' }}
                                  />
                                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                                    {idx + 1}. {gq.question_text}
                                  </span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveGenerated(idx)}
                                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                                  title="Remover questão"
                                >
                                  <Trash2 style={{ width: 14, height: 14 }} />
                                </button>
                              </div>

                              {/* Alternativas compactas */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', paddingLeft: '26px' }}>
                                {gq.alternatives.map((alt, aIdx) => (
                                  <div
                                    key={aIdx}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      background: alt.isCorrect ? '#dcfce7' : '#f1f5f9',
                                      color: alt.isCorrect ? '#15803d' : '#475569',
                                      fontWeight: alt.isCorrect ? 800 : 500,
                                      border: alt.isCorrect ? '1px solid #86efac' : '1px solid transparent'
                                    }}
                                  >
                                    {alt.isCorrect && <Check style={{ width: 12, height: 12, flexShrink: 0 }} />}
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {alt.text}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {gq.explanation && (
                                <p style={{ margin: 0, paddingLeft: '26px', fontSize: '10px', color: '#6b7280', fontStyle: 'italic' }}>
                                  💡 <strong>Justificativa:</strong> {gq.explanation}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>

          </div>

          {/* Rodapé / Barra de Ação */}
          <footer style={{
            padding: '16px 28px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
              <CheckCircle2 style={{ width: 16, height: 16, color: totalSelectedCount > 0 ? '#10B981' : '#94A3B8' }} />
              <span>
                {totalSelectedCount === 0 
                  ? 'Você pode salvar o quiz sem perguntas ou adicionar agora.' 
                  : `${totalSelectedCount} questão(ões) vinculada(s) ao novo quiz.`}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
              >
                Cancelar
              </button>

              <button
                type="submit"
                style={{
                  padding: '10px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #1368CE 0%, #7C3AED 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Plus style={{ width: '16px', height: '16px', strokeWidth: 3 }} />
                <span>Salvar Quiz</span>
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default CreateQuizModal;
