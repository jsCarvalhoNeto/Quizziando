import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Monitor,
  Wifi,
  Users,
  User,
  Disc,
  RotateCw,
  LayoutGrid,
  CheckCircle2,
  Zap,
  ArrowRight,
  Search,
  Folder as FolderIcon,
  Check,
  X,
  AlertTriangle,
  ChevronRight,
  Layers,
  Swords,
  Shield,
  Skull,
} from 'lucide-react';
import { sfx } from '../../App';
import { RAID_BOSSES } from '../../lib/bossRaid';

export interface LaunchGameHubProps {
  categories: Array<{ id: string; name: string; color?: string; folder_id?: string | null; icon?: string }>;
  questions: Array<{ id: string; category_id: string; question_text: string }>;
  folders: Array<{ id: string; name: string; color?: string }>;
  onStartRouletteGame: (categoryIds: string[], mode: 'online' | 'local' | 'hybrid', localPlayMode?: 'teams' | 'individual') => void;
  onStartClassicGame?: (categoryIds: string[], mode: 'online' | 'local' | 'hybrid', localPlayMode?: 'teams' | 'individual', format?: 'classic' | 'blocks' | 'boss_raid', totalBlocks?: number, selectedBossId?: string) => void;
  onLaunchNewRoom?: (mode: 'online' | 'hybrid' | 'local') => void;
  deliveryFilter?: 'all' | 'hybrid' | 'online' | 'local';
  onDeliveryFilterChange?: (delivery: 'all' | 'hybrid' | 'online' | 'local') => void;
}

type GameFormat = 'classic' | 'roulette' | 'blocks' | 'boss_raid';
type DeliveryMode = 'hybrid' | 'online' | 'local_teams' | 'local_individual';

interface GameModeCardDef {
  id: string;
  format: GameFormat;
  delivery: DeliveryMode;
  title: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  gradient: string;
  accentColor: string;
  iconBg: string;
  iconColor: string;
  description: string;
  tags: string[];
  minQuizzesText: string;
  buttonText: string;
  icon: React.ReactNode;
}

export const LaunchGameHub: React.FC<LaunchGameHubProps> = ({
  categories = [],
  questions = [],
  folders = [],
  onStartRouletteGame,
  onStartClassicGame,
  deliveryFilter = 'all',
  onDeliveryFilterChange,
}) => {
  // Filtros de visualização
  const [filterFormat, setFilterFormat] = useState<'all' | 'classic' | 'roulette' | 'blocks' | 'boss_raid'>('all');
  const [filterDelivery, setFilterDelivery] = useState<'all' | 'hybrid' | 'online' | 'local'>(deliveryFilter || 'all');

  // Sincroniza filtro externo de ambiente (ex: vindo da barra lateral)
  React.useEffect(() => {
    if (deliveryFilter !== undefined) {
      setFilterDelivery(deliveryFilter);
    }
  }, [deliveryFilter]);

  // Estado da seleção para lançamento
  const [activeCard, setActiveCard] = useState<GameModeCardDef | null>(null);
  const [selectedQuizIds, setSelectedQuizIds] = useState<string[]>([]);
  const [searchQuizQuery, setSearchQuizQuery] = useState('');
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>('all');
  const [selectedBlocksCount, setSelectedBlocksCount] = useState<number>(12);
  const [selectedBossId, setSelectedBossId] = useState<string>(RAID_BOSSES[0].id);
  const [selectionWarning, setSelectionWarning] = useState<string>('');

  // Mapeamento de perguntas por categoria
  const questionCountByCat = useMemo(() => {
    const map = new Map<string, number>();
    questions.forEach(q => {
      map.set(q.category_id, (map.get(q.category_id) || 0) + 1);
    });
    return map;
  }, [questions]);

  // Lista dos 12 Modos de Jogo Completos
  const gameModes: GameModeCardDef[] = [
    // ── 1. MODO CLÁSSICO ────────────────────────────────────────────────
    {
      id: 'classic_hybrid',
      format: 'classic',
      delivery: 'hybrid',
      title: 'Clássico no Telão',
      badge: 'Presencial c/ Celular',
      badgeBg: '#dbeafe',
      badgeColor: '#1d4ed8',
      gradient: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)',
      accentColor: '#2563eb',
      iconBg: '#eff6ff',
      iconColor: '#1d4ed8',
      description: 'Perguntas e alternativas no grande telão da sala. Os estudantes respondem em tempo real no celular usando cores e símbolos!',
      tags: ['Telão Sala', 'Celulares dos Alunos', 'Placar Ao Vivo'],
      minQuizzesText: 'Pelo menos 1 quiz',
      buttonText: 'Lançar no Telão',
      icon: <Monitor style={{ width: '26px', height: '26px' }} />,
    },
    {
      id: 'classic_online',
      format: 'classic',
      delivery: 'online',
      title: 'Clássico Online Realtime',
      badge: 'Multiplayer Remoto',
      badgeBg: '#ede9fe',
      badgeColor: '#6d28d9',
      gradient: 'linear-gradient(135deg, #46178f 0%, #6d28d9 50%, #7c3aed 100%)',
      accentColor: '#7c3aed',
      iconBg: '#f5f3ff',
      iconColor: '#6d28d9',
      description: 'Partida multiplayer com PIN de acesso para turmas remotas ou híbridas. Cada aluno vê perguntas e alternativas no seu próprio aparelho.',
      tags: ['Sala Remota', 'Código PIN', 'Multi-dispositivos'],
      minQuizzesText: 'Pelo menos 1 quiz',
      buttonText: 'Criar Sala Online',
      icon: <Wifi style={{ width: '26px', height: '26px' }} />,
    },
    {
      id: 'classic_teams',
      format: 'classic',
      delivery: 'local_teams',
      title: 'Clássico Local (2 Times)',
      badge: '100% Offline',
      badgeBg: '#d1fae5',
      badgeColor: '#065f46',
      gradient: 'linear-gradient(135deg, #047857 0%, #059669 50%, #10b981 100%)',
      accentColor: '#059669',
      iconBg: '#ecfdf5',
      iconColor: '#047857',
      description: 'Batalha direta entre Time Azul vs Time Vermelho num único computador. Sem celulares e sem internet: a turma responde oralmente!',
      tags: ['Sem Internet', 'Azul vs Vermelho', 'Disputa Rápida'],
      minQuizzesText: 'Pelo menos 1 quiz',
      buttonText: 'Iniciar Duelo 2 Times',
      icon: <Users style={{ width: '26px', height: '26px' }} />,
    },
    {
      id: 'classic_individual',
      format: 'classic',
      delivery: 'local_individual',
      title: 'Clássico Individual',
      badge: 'Medição de Conhecimento',
      badgeBg: '#e0f2fe',
      badgeColor: '#0369a1',
      gradient: 'linear-gradient(135deg, #0369a1 0%, #0284c7 50%, #0ea5e9 100%)',
      accentColor: '#0284c7',
      iconBg: '#f0f9ff',
      iconColor: '#0284c7',
      description: 'Dinâmica individual de prática e fixação no computador da sala. Sem placar de equipes: veja o feedback e acertos imediatamente.',
      tags: ['Sem Placar', 'Feedback Direto', 'Fixação'],
      minQuizzesText: 'Pelo menos 1 quiz',
      buttonText: 'Iniciar Prática Individual',
      icon: <User style={{ width: '26px', height: '26px' }} />,
    },

    // ── 2. MODO ROLETA ──────────────────────────────────────────────────
    {
      id: 'roulette_hybrid',
      format: 'roulette',
      delivery: 'hybrid',
      title: 'Roleta no Telão',
      badge: 'Sorteio + Celulares',
      badgeBg: '#fce7f3',
      badgeColor: '#be185d',
      gradient: 'linear-gradient(135deg, #9d174d 0%, #db2777 50%, #f43f5e 100%)',
      accentColor: '#db2777',
      iconBg: '#fdf2f8',
      iconColor: '#be185d',
      description: 'A Roleta 3D gira no telão sorteando temas entre os quizzes selecionados, gerando empolgação máxima enquanto os alunos respondem no celular!',
      tags: ['Sorteio Dinâmico', '2 a 12 Quizzes', 'Telão Interativo'],
      minQuizzesText: '2 ou mais quizzes',
      buttonText: 'Girar Roleta no Telão',
      icon: <Disc style={{ width: '26px', height: '26px' }} />,
    },
    {
      id: 'roulette_online',
      format: 'roulette',
      delivery: 'online',
      title: 'Roleta Online Multiplayer',
      badge: 'Sorteio Síncrono',
      badgeBg: '#e0e7ff',
      badgeColor: '#4338ca',
      gradient: 'linear-gradient(135deg, #3730a3 0%, #4f46e5 50%, #6366f1 100%)',
      accentColor: '#4f46e5',
      iconBg: '#eef2ff',
      iconColor: '#4338ca',
      description: 'A roleta roda simultaneamente na tela de todos os participantes conectados online. Sorteio de múltiplos temas e disputa ao vivo com PIN.',
      tags: ['Múltiplos Temas', 'Sincronizado', 'Sala com PIN'],
      minQuizzesText: '2 ou mais quizzes',
      buttonText: 'Criar Roleta Online',
      icon: <RotateCw style={{ width: '26px', height: '26px' }} />,
    },
    {
      id: 'roulette_teams',
      format: 'roulette',
      delivery: 'local_teams',
      title: 'Roleta Batalha 2 Times',
      badge: 'Giro + 2 Equipes',
      badgeBg: '#fef3c7',
      badgeColor: '#b45309',
      gradient: 'linear-gradient(135deg, #b45309 0%, #d97706 50%, #f59e0b 100%)',
      accentColor: '#d97706',
      iconBg: '#fffbeb',
      iconColor: '#b45309',
      description: 'Gire a roleta no computador para sortear o tema da rodada e pontue o duelo acirrado entre as equipes Azul e Vermelha, 100% offline.',
      tags: ['Sorteio Offline', 'Batalha por Turno', 'Sem Aparelhos'],
      minQuizzesText: '2 ou mais quizzes',
      buttonText: 'Abrir Batalha da Roleta',
      icon: <Disc style={{ width: '26px', height: '26px' }} />,
    },
    {
      id: 'roulette_individual',
      format: 'roulette',
      delivery: 'local_individual',
      title: 'Roleta Individual (Treino)',
      badge: 'Medição c/ Sorteio',
      badgeBg: '#ffe4e6',
      badgeColor: '#e11d48',
      gradient: 'linear-gradient(135deg, #be123c 0%, #e11d48 50%, #fb7185 100%)',
      accentColor: '#e11d48',
      iconBg: '#fff1f2',
      iconColor: '#be123c',
      description: 'Sorteio aleatório de quizzes e matérias pela roleta para testar o conhecimento do aluno em diferentes assuntos sem pressão de placar.',
      tags: ['Mix de Assuntos', 'Sem Competição', 'Giro Surpresa'],
      minQuizzesText: '2 ou mais quizzes',
      buttonText: 'Praticar com Roleta',
      icon: <Sparkles style={{ width: '26px', height: '26px' }} />,
    },

    // ── 3. MODO EM BLOCOS ───────────────────────────────────────────────
    {
      id: 'blocks_hybrid',
      format: 'blocks',
      delivery: 'hybrid',
      title: 'Blocos no Telão (Kahoot)',
      badge: 'Tabuleiro + Celulares',
      badgeBg: '#ffedd5',
      badgeColor: '#c2410c',
      gradient: 'linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #f97316 100%)',
      accentColor: '#ea580c',
      iconBg: '#fff7ed',
      iconColor: '#c2410c',
      description: 'Tabuleiro moderno de blocos numerados e virados no telão. A turma escolhe os blocos para revelar perguntas misteriosas e responder pelo celular!',
      tags: ['Cartas Viradas', 'Estilo Kahoot Blocks', 'Celulares'],
      minQuizzesText: 'Pelo menos 1 quiz',
      buttonText: 'Montar Tabuleiro no Telão',
      icon: <LayoutGrid style={{ width: '26px', height: '26px' }} />,
    },
    {
      id: 'blocks_teams',
      format: 'blocks',
      delivery: 'local_teams',
      title: 'Blocos Batalha 2 Times',
      badge: 'Tabuleiro + / - Offline',
      badgeBg: '#ccfbf1',
      badgeColor: '#0f766e',
      gradient: 'linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%)',
      accentColor: '#0d9488',
      iconBg: '#f0fdfa',
      iconColor: '#0f766e',
      description: 'Times escolhem blocos no telão ou PC, respondem em voz alta e o apresentador computa acertos (+) e erros (-). Totalmente offline!',
      tags: ['Acertos e Erros', 'Sem Celular', 'Estratégia'],
      minQuizzesText: 'Pelo menos 1 quiz',
      buttonText: 'Duelo de Blocos 2 Times',
      icon: <Users style={{ width: '26px', height: '26px' }} />,
    },
    {
      id: 'blocks_online',
      format: 'blocks',
      delivery: 'online',
      title: 'Blocos Online Multiplayer',
      badge: 'Tabuleiro Remoto',
      badgeBg: '#fae8ff',
      badgeColor: '#86198f',
      gradient: 'linear-gradient(135deg, #701a75 0%, #a21caf 50%, #c026d3 100%)',
      accentColor: '#a21caf',
      iconBg: '#fdf4ff',
      iconColor: '#86198f',
      description: 'Tabuleiro de blocos interativo online com PIN da sala. Os estudantes conectados escolhem os blocos e respondem em tempo real no próprio dispositivo.',
      tags: ['Tabuleiro Online', 'PIN da Sala', 'Desafio Surpresa'],
      minQuizzesText: 'Pelo menos 1 quiz',
      buttonText: 'Criar Tabuleiro Online',
      icon: <Layers style={{ width: '26px', height: '26px' }} />,
    },
    {
      id: 'blocks_individual',
      format: 'blocks',
      delivery: 'local_individual',
      title: 'Blocos Individual (Treino)',
      badge: 'Medição em Tabuleiro',
      badgeBg: '#e0f2fe',
      badgeColor: '#0369a1',
      gradient: 'linear-gradient(135deg, #075985 0%, #0284c7 50%, #38bdf8 100%)',
      accentColor: '#0284c7',
      iconBg: '#f0f9ff',
      iconColor: '#075985',
      description: 'Escolha livre dos blocos numerados no tabuleiro para fixação individual, sem pressão de tempo ou pontuação de equipes.',
      tags: ['Prática Livre', 'Feedback Instantâneo', '100% Offline'],
      minQuizzesText: 'Pelo menos 1 quiz',
      buttonText: 'Praticar em Blocos',
      icon: <CheckCircle2 style={{ width: '26px', height: '26px' }} />,
    },

    // ── 4. BATALHA CONTRA O CHEFE (BOSS RAID COLETIVO) ───────────────────
    {
      id: 'boss_hybrid',
      format: 'boss_raid',
      delivery: 'hybrid',
      title: 'Chefe no Telão (Boss Raid)',
      badge: 'Batalha Coletiva Telão + Celular',
      badgeBg: '#fee2e2',
      badgeColor: '#b91c1c',
      gradient: 'linear-gradient(135deg, #991b1b 0%, #dc2626 50%, #ea580c 100%)',
      accentColor: '#dc2626',
      iconBg: '#fef2f2',
      iconColor: '#991b1b',
      description: 'A turma inteira se une em cooperação no telão contra um Grande Chefe! Acertos desferem Dano Crítico no HP do monstro.',
      tags: ['Raid Coletivo', 'Barra de Vida HP', 'Celulares dos Alunos'],
      minQuizzesText: 'Pelo menos 1 quiz',
      buttonText: 'Lançar Batalha no Telão',
      icon: <Swords style={{ width: '26px', height: '26px' }} />,
    },
    {
      id: 'boss_teams',
      format: 'boss_raid',
      delivery: 'local_teams',
      title: 'Chefe Batalha da Turma (Offline)',
      badge: '100% Offline / Sem Internet',
      badgeBg: '#fef3c7',
      badgeColor: '#92400e',
      gradient: 'linear-gradient(135deg, #78350f 0%, #b45309 50%, #d97706 100%)',
      accentColor: '#b45309',
      iconBg: '#fffbeb',
      iconColor: '#78350f',
      description: 'Batalha épica cooperativa num único computador ou projetor. A turma responde oralmente e ataca o Chefe antes que o Escudo caia!',
      tags: ['Sem Internet', 'Escudo da Turma', 'Cooperação Máxima'],
      minQuizzesText: 'Pelo menos 1 quiz',
      buttonText: 'Iniciar Duelo Coletivo',
      icon: <Shield style={{ width: '26px', height: '26px' }} />,
    },
    {
      id: 'boss_online',
      format: 'boss_raid',
      delivery: 'online',
      title: 'Chefe Online Multiplayer',
      badge: 'Raid Remoto c/ PIN',
      badgeBg: '#ede9fe',
      badgeColor: '#5b21b6',
      gradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #a855f7 100%)',
      accentColor: '#7c3aed',
      iconBg: '#f5f3ff',
      iconColor: '#5b21b6',
      description: 'Partida cooperativa com PIN de acesso para turmas remotas. Todos os alunos atacam o mesmo Chefe simultaneamente em tempo real!',
      tags: ['Raid Online', 'Multiplayer Co-op', 'PIN da Sala'],
      minQuizzesText: 'Pelo menos 1 quiz',
      buttonText: 'Criar Sala de Raid Online',
      icon: <Skull style={{ width: '26px', height: '26px' }} />,
    },
  ];

  // Filtro dos cards exibidos
  const filteredCards = useMemo(() => {
    return gameModes.filter(card => {
      const matchFormat = filterFormat === 'all' || card.format === filterFormat;
      let matchDelivery = true;
      if (filterDelivery === 'hybrid') matchDelivery = card.delivery === 'hybrid';
      else if (filterDelivery === 'online') matchDelivery = card.delivery === 'online';
      else if (filterDelivery === 'local') matchDelivery = card.delivery.startsWith('local_');
      return matchFormat && matchDelivery;
    });
  }, [filterFormat, filterDelivery]);

  // Quizzes disponíveis para seleção no modal
  const availableQuizzes = useMemo(() => {
    return categories.map(cat => {
      const qCount = questionCountByCat.get(cat.id) || 0;
      const folder = folders.find(f => f.id === cat.folder_id);
      return {
        ...cat,
        questionCount: qCount,
        folderName: folder ? folder.name : 'Geral / Sem Pasta',
        folderColor: folder?.color || '#64748b',
      };
    });
  }, [categories, questionCountByCat, folders]);

  // Quizzes filtrados pela busca e pasta no modal
  const filteredQuizzesInModal = useMemo(() => {
    return availableQuizzes.filter(quiz => {
      const matchesSearch =
        quiz.name.toLowerCase().includes(searchQuizQuery.toLowerCase()) ||
        quiz.folderName.toLowerCase().includes(searchQuizQuery.toLowerCase());
      const matchesFolder =
        selectedFolderFilter === 'all' ||
        (selectedFolderFilter === 'none' && !quiz.folder_id) ||
        quiz.folder_id === selectedFolderFilter;
      return matchesSearch && matchesFolder;
    });
  }, [availableQuizzes, searchQuizQuery, selectedFolderFilter]);

  // Total de perguntas somadas dos quizzes selecionados
  const totalQuestionsSelected = useMemo(() => {
    return selectedQuizIds.reduce((sum, id) => {
      return sum + (questionCountByCat.get(id) || 0);
    }, 0);
  }, [selectedQuizIds, questionCountByCat]);

  // Ao abrir o modal clicando em um card
  const handleOpenLaunchModal = (card: GameModeCardDef) => {
    sfx.playClick();
    setActiveCard(card);
    setSelectionWarning('');
    setSearchQuizQuery('');
    setSelectedFolderFilter('all');
    setSelectedBlocksCount(12);

    // Se já havia quizzes selecionados válidos, mantemos; senão limpamos para seleção fresca
    if (card.format === 'roulette' && selectedQuizIds.length < 2) {
      setSelectedQuizIds([]);
    } else if (card.format !== 'roulette' && selectedQuizIds.length < 1) {
      setSelectedQuizIds([]);
    }
  };

  // Alternar seleção de um quiz
  const toggleQuizSelection = (quizId: string, questionCount: number) => {
    sfx.playClick();
    setSelectionWarning('');
    if (questionCount === 0) {
      setSelectionWarning('Este quiz não possui perguntas cadastradas. Crie ou adicione perguntas antes de jogar.');
      return;
    }

    setSelectedQuizIds(prev => {
      if (prev.includes(quizId)) {
        return prev.filter(id => id !== quizId);
      } else {
        if (activeCard?.format === 'roulette' && prev.length >= 12) {
          setSelectionWarning('Para o modo Roleta, o limite máximo é de 12 quizzes.');
          return prev;
        }
        return [...prev, quizId];
      }
    });
  };

  // Selecionar todos os visíveis válidos
  const handleSelectAllInModal = () => {
    sfx.playClick();
    const validIds = filteredQuizzesInModal
      .filter(q => q.questionCount > 0)
      .map(q => q.id);

    if (activeCard?.format === 'roulette') {
      const limited = validIds.slice(0, 12);
      setSelectedQuizIds(limited);
      if (validIds.length > 12) {
        setSelectionWarning('Limite máximo de 12 quizzes aplicado para a Roleta.');
      }
    } else {
      setSelectedQuizIds(validIds);
    }
  };

  // Confirmar início do jogo a partir do modal
  const handleConfirmLaunch = () => {
    if (!activeCard) return;

    // Validação de Roleta: requer 2 ou mais quizzes
    if (activeCard.format === 'roulette') {
      if (selectedQuizIds.length < 2) {
        setSelectionWarning('O Modo Roleta necessita de no mínimo 2 quizzes para sortear os temas!');
        return;
      }
    } else {
      // Clássico ou Blocos: requer pelo menos 1 quiz
      if (selectedQuizIds.length < 1) {
        setSelectionWarning(`Selecione pelo menos 1 quiz para iniciar no ${activeCard.title}!`);
        return;
      }
    }

    if (totalQuestionsSelected === 0) {
      setSelectionWarning('Os quizzes selecionados não contêm perguntas. Adicione perguntas antes de iniciar.');
      return;
    }

    sfx.playClick();
    const { format, delivery } = activeCard;

    // Mapeamento dos parâmetros de lançamento
    if (format === 'roulette') {
      if (delivery === 'hybrid') {
        onStartRouletteGame(selectedQuizIds, 'hybrid');
      } else if (delivery === 'online') {
        onStartRouletteGame(selectedQuizIds, 'online');
      } else if (delivery === 'local_teams') {
        onStartRouletteGame(selectedQuizIds, 'local', 'teams');
      } else {
        onStartRouletteGame(selectedQuizIds, 'local', 'individual');
      }
    } else {
      // Clássico, Blocos ou Batalha contra o Chefe
      const formatParam = format === 'boss_raid' ? 'boss_raid' : format === 'blocks' ? 'blocks' : 'classic';
      const blocksParam = format === 'blocks' ? selectedBlocksCount : 12;

      if (delivery === 'hybrid') {
        onStartClassicGame?.(selectedQuizIds, 'hybrid', undefined, formatParam, blocksParam, selectedBossId);
      } else if (delivery === 'online') {
        onStartClassicGame?.(selectedQuizIds, 'online', undefined, formatParam, blocksParam, selectedBossId);
      } else if (delivery === 'local_teams') {
        onStartClassicGame?.(selectedQuizIds, 'local', 'teams', formatParam, blocksParam, selectedBossId);
      } else {
        onStartClassicGame?.(selectedQuizIds, 'local', 'individual', formatParam, blocksParam, selectedBossId);
      }
    }

    // Fecha o modal
    setActiveCard(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%', paddingBottom: '40px' }}>
      
      {/* ─── BANNER SUPERIOR HERO ────────────────────────────────────────── */}
      <div
        style={{
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #46178f 100%)',
          padding: '32px 36px',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 30px rgba(30, 27, 75, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Efeito luminoso de fundo */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-30px',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, rgba(168, 85, 247, 0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: '#f3e8ff',
              padding: '4px 12px',
              borderRadius: '999px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles style={{ width: '13px', height: '13px', color: '#fde047' }} />
            Central de Lançamento de Partidas
          </span>
        </div>

        <div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 900,
              color: '#ffffff',
              margin: '0 0 8px 0',
              letterSpacing: '-0.5px',
            }}
          >
            Escolha o Modo de Jogo & Inicie a Experiência
          </h1>
          <p
            style={{
              fontSize: '15px',
              color: '#cbd5e1',
              margin: 0,
              maxWidth: '720px',
              lineHeight: 1.6,
            }}
          >
            Selecione entre os formatos <b>Roleta</b>, <b>Blocos</b> ou <b>Clássico</b> no ambiente ideal:
            no <b>Telão com celulares</b>, <b>Online Multiplayer</b> ou <b>Local presencial</b> (em 2 equipes ou individual).
          </p>
        </div>

        {/* ─── FILTROS RÁPIDOS ─────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
            marginTop: '4px',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>
            Filtrar Formato:
          </span>

          {[
            { id: 'all', label: 'Todos os Formatos', icon: <Sparkles style={{ width: '13px', height: '13px' }} /> },
            { id: 'classic', label: '⚡ Modo Clássico', icon: null },
            { id: 'roulette', label: '🎡 Modo Roleta', icon: null },
            { id: 'blocks', label: '🧱 Modo em Blocos', icon: null },
            { id: 'boss_raid', label: '⚔️ Batalha contra o Chefe', icon: null },
          ].map(f => {
            const isActive = filterFormat === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  sfx.playClick();
                  setFilterFormat(f.id as any);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isActive ? '1px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.15)',
                  backgroundColor: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                  color: isActive ? '#46178f' : '#e2e8f0',
                  boxShadow: isActive ? '0 4px 12px rgba(255, 255, 255, 0.2)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {f.icon}
                {f.label}
              </button>
            );
          })}

          <div style={{ width: '1px', height: '22px', backgroundColor: 'rgba(255, 255, 255, 0.2)', margin: '0 4px' }} />

          <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>
            Ambiente:
          </span>

          {[
            { id: 'all', label: 'Todos' },
            { id: 'hybrid', label: '📱 Telão + Celular' },
            { id: 'online', label: '🌐 Online Remoto' },
            { id: 'local', label: '👥 Local Offline' },
          ].map(d => {
            const isActive = filterDelivery === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  sfx.playClick();
                  setFilterDelivery(d.id as any);
                  if (onDeliveryFilterChange) {
                    onDeliveryFilterChange(d.id as any);
                  }
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isActive ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.15)',
                  backgroundColor: isActive ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)',
                  color: isActive ? '#082f49' : '#e2e8f0',
                  transition: 'all 0.15s ease',
                }}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── GRID DE CARDS MODERNOS E COLORIDOS ─────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px',
        }}
      >
        {filteredCards.map(card => {
          return (
            <div
              key={card.id}
              onClick={() => handleOpenLaunchModal(card)}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                border: '1.5px solid #e2e8f0',
                boxShadow: '0 6px 18px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.borderColor = card.accentColor;
                e.currentTarget.style.boxShadow = `0 16px 32px ${card.accentColor}26, 0 4px 12px rgba(0,0,0,0.06)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(0, 0, 0, 0.04)';
              }}
            >
              {/* Faixa Superior Colorida */}
              <div
                style={{
                  height: '6px',
                  width: '100%',
                  background: card.gradient,
                }}
              />

              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                
                {/* Header do Card: Ícone e Badges */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '16px',
                      background: card.gradient,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 8px 16px ${card.accentColor}40`,
                      flexShrink: 0,
                    }}
                  >
                    {card.icon}
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      backgroundColor: card.badgeBg,
                      color: card.badgeColor,
                      padding: '4px 10px',
                      borderRadius: '999px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                    }}
                  >
                    {card.badge}
                  </span>
                </div>

                {/* Título e Descrição */}
                <div>
                  <h3
                    style={{
                      fontSize: '18px',
                      fontWeight: 800,
                      color: '#0f172a',
                      marginBottom: '8px',
                      letterSpacing: '-0.3px',
                    }}
                  >
                    {card.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#64748b',
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {card.description}
                  </p>
                </div>

                {/* Tags de Características */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '8px' }}>
                  {card.tags.map(t => (
                    <span
                      key={t}
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        color: '#475569',
                        backgroundColor: '#f1f5f9',
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Rodapé do Card com Regra de Quiz e Botão de Ação */}
              <div
                style={{
                  padding: '16px 24px',
                  backgroundColor: '#f8fafc',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: card.format === 'roulette' ? '#c026d3' : '#2563eb',
                      backgroundColor: card.format === 'roulette' ? '#fae8ff' : '#eff6ff',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {card.format === 'roulette' ? '🎡' : card.format === 'blocks' ? '🧱' : '⚡'}
                    {card.minQuizzesText}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: card.accentColor,
                    fontSize: '13px',
                    fontWeight: 800,
                  }}
                >
                  <span>{card.buttonText}</span>
                  <ChevronRight style={{ width: '16px', height: '16px' }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── MODAL INTELIGENTE DE SELEÇÃO DE QUIZZES ─────────────────────── */}
      {activeCard && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              sfx.playClick();
              setActiveCard(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              maxWidth: '820px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            {/* Header do Modal com Cor do Modo */}
            <div
              style={{
                padding: '24px 28px',
                background: activeCard.gradient,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {activeCard.icon}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 900, margin: 0, color: '#ffffff' }}>
                      {activeCard.title}
                    </h2>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        backgroundColor: 'rgba(255, 255, 255, 0.25)',
                        color: '#ffffff',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {activeCard.badge}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', margin: '4px 0 0 0', color: 'rgba(255, 255, 255, 0.9)' }}>
                    Selecione os quizzes da sua biblioteca para montar esta partida.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  sfx.playClick();
                  setActiveCard(null);
                }}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.35)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)')}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            {/* Conteúdo com Scroll */}
            <div style={{ padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* ── CARD INFORMATIVO DA REGRA DO MODO ─────────────────────── */}
              {activeCard.format === 'roulette' ? (
                <div
                  style={{
                    backgroundColor: selectedQuizIds.length >= 2 ? '#fdf4ff' : '#fff1f2',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    border: selectedQuizIds.length >= 2 ? '1.5px solid #d946ef' : '1.5px solid #fb7185',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        backgroundColor: selectedQuizIds.length >= 2 ? '#fae8ff' : '#ffe4e6',
                        color: selectedQuizIds.length >= 2 ? '#c026d3' : '#e11d48',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Disc style={{ width: '22px', height: '22px' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: selectedQuizIds.length >= 2 ? '#86198f' : '#9f1239' }}>
                        🎡 Regra da Roleta: Selecione de 2 a 12 quizzes
                      </div>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0', lineHeight: 1.4 }}>
                        A Roleta sorteia dinamicamente os temas entre os quizzes selecionados a cada rodada.
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '6px 14px',
                      borderRadius: '999px',
                      backgroundColor: selectedQuizIds.length >= 2 ? '#10b981' : '#f59e0b',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 800,
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                    }}
                  >
                    {selectedQuizIds.length < 2
                      ? `Selecione mais ${2 - selectedQuizIds.length} quiz(zes)`
                      : `✅ ${selectedQuizIds.length} quizzes selecionados`}
                  </div>
                </div>
              ) : activeCard.format === 'blocks' ? (
                <div
                  style={{
                    backgroundColor: '#fff7ed',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    border: '1.5px solid #fb923c',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          backgroundColor: '#ffedd5',
                          color: '#ea580c',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <LayoutGrid style={{ width: '22px', height: '22px' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#9a3412' }}>
                          🧱 Regra do Modo Blocos: Selecione pelo menos 1 quiz
                        </div>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0', lineHeight: 1.4 }}>
                          As perguntas dos quizzes selecionados preencherão as cartas numeradas do tabuleiro virado.
                        </p>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '6px 14px',
                        borderRadius: '999px',
                        backgroundColor: selectedQuizIds.length >= 1 ? '#10b981' : '#f59e0b',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {selectedQuizIds.length === 0
                        ? 'Selecione pelo menos 1 quiz'
                        : `✅ ${selectedQuizIds.length} quiz(zes) selecionado(s)`}
                    </div>
                  </div>

                  {/* Seletor de quantidade de blocos */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      paddingTop: '8px',
                      borderTop: '1px solid #fed7aa',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#7c2d12' }}>
                      Quantidade de Blocos no Tabuleiro:
                    </span>
                    {[6, 9, 12, 16].map(num => {
                      const isChosen = selectedBlocksCount === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            sfx.playClick();
                            setSelectedBlocksCount(num);
                          }}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            border: isChosen ? '2px solid #ea580c' : '1px solid #fdba74',
                            backgroundColor: isChosen ? '#ea580c' : '#ffffff',
                            color: isChosen ? '#ffffff' : '#7c2d12',
                            boxShadow: isChosen ? '0 2px 6px rgba(234, 88, 12, 0.3)' : 'none',
                          }}
                        >
                          {num} {num === 12 ? '(Padrão)' : 'blocos'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : activeCard.format === 'boss_raid' ? (
                <div
                  style={{
                    backgroundColor: '#fff1f2',
                    borderRadius: '18px',
                    padding: '16px 20px',
                    border: '1.5px solid #fda4af',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          backgroundColor: '#ffe4e6',
                          color: '#e11d48',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Swords style={{ width: '22px', height: '22px' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#9f1239' }}>
                          ⚔️ Batalha contra o Chefe: Cooperação Total da Turma
                        </div>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0', lineHeight: 1.4 }}>
                          Cada acerto da turma desfere Dano Crítico no HP do Chefe. Erros deixam o Chefe atacar o Escudo!
                        </p>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '6px 14px',
                        borderRadius: '999px',
                        backgroundColor: selectedQuizIds.length >= 1 ? '#10b981' : '#f59e0b',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {selectedQuizIds.length === 0
                        ? 'Selecione pelo menos 1 quiz'
                        : `✅ ${selectedQuizIds.length} quiz(zes) selecionado(s)`}
                    </div>
                  </div>

                  {/* Seletor de Chefe Lendário */}
                  <div style={{ borderTop: '1px solid #fecdd3', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#881337', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Escolha o Chefe Lendário para a Turma Enfrentar:
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                      {RAID_BOSSES.map((boss) => {
                        const isChosen = selectedBossId === boss.id;
                        return (
                          <div
                            key={boss.id}
                            onClick={() => {
                              sfx.playClick();
                              setSelectedBossId(boss.id);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 12px',
                              borderRadius: '12px',
                              border: isChosen ? `2px solid ${boss.accentColor}` : '1.5px solid #e2e8f0',
                              backgroundColor: isChosen ? '#ffffff' : '#f8fafc',
                              boxShadow: isChosen ? `0 4px 14px ${boss.accentColor}33` : 'none',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <img
                              src={boss.image}
                              alt={boss.name}
                              style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }}
                            />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {boss.name}
                              </p>
                              <span style={{ fontSize: '10px', color: boss.accentColor, fontWeight: 700 }}>
                                {boss.element === 'fire' ? '🔥 Fogo' : boss.element === 'tech' ? '⚡ Tecnologia' : '✨ Cósmico'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: '#eff6ff',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    border: '1.5px solid #60a5fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        backgroundColor: '#dbeafe',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Zap style={{ width: '22px', height: '22px' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e40af' }}>
                        ⚡ Regra do Modo Clássico: Selecione pelo menos 1 quiz
                      </div>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0', lineHeight: 1.4 }}>
                        As perguntas dos quizzes selecionados serão disparadas em sequência eletrizante com pontuação e cronômetro.
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '6px 14px',
                      borderRadius: '999px',
                      backgroundColor: selectedQuizIds.length >= 1 ? '#10b981' : '#f59e0b',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {selectedQuizIds.length === 0
                      ? 'Selecione pelo menos 1 quiz'
                      : `✅ ${selectedQuizIds.length} quiz(zes) selecionado(s)`}
                  </div>
                </div>
              )}

              {/* Aviso ou Mensagem de Erro */}
              {selectionWarning && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #f87171',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#991b1b',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  <AlertTriangle style={{ width: '18px', height: '18px', flexShrink: 0, color: '#dc2626' }} />
                  <span>{selectionWarning}</span>
                </div>
              )}

              {/* ── BARRA DE PESQUISA E FILTROS DE QUIZZES ───────────────── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div
                  style={{
                    flex: 1,
                    minWidth: '240px',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Search
                    style={{
                      position: 'absolute',
                      left: '12px',
                      width: '16px',
                      height: '16px',
                      color: '#94a3b8',
                    }}
                  />
                  <input
                    type="text"
                    value={searchQuizQuery}
                    onChange={(e) => setSearchQuizQuery(e.target.value)}
                    placeholder="Buscar quiz por nome ou pasta..."
                    style={{
                      width: '100%',
                      height: '42px',
                      paddingLeft: '38px',
                      paddingRight: '12px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      backgroundColor: '#f8fafc',
                    }}
                  />
                  {searchQuizQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuizQuery('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: '#94a3b8',
                      }}
                    >
                      <X style={{ width: '16px', height: '16px' }} />
                    </button>
                  )}
                </div>

                {/* Filtro por pasta */}
                <select
                  value={selectedFolderFilter}
                  onChange={(e) => setSelectedFolderFilter(e.target.value)}
                  style={{
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="all">Todas as Pastas</option>
                  <option value="none">Sem Pasta (Geral)</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>

                {/* Botões rápidos: Marcar Todos / Limpar */}
                <button
                  type="button"
                  onClick={handleSelectAllInModal}
                  style={{
                    height: '42px',
                    padding: '0 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Marcar Todos
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sfx.playClick();
                    setSelectedQuizIds([]);
                  }}
                  style={{
                    height: '42px',
                    padding: '0 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#dc2626',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Limpar
                </button>
              </div>

              {/* ── LISTA DOS QUIZZES / CATEGORIAS ───────────────────────── */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '340px',
                  overflowY: 'auto',
                  paddingRight: '4px',
                }}
              >
                {filteredQuizzesInModal.length === 0 ? (
                  <div
                    style={{
                      padding: '40px 20px',
                      textAlign: 'center',
                      backgroundColor: '#f8fafc',
                      borderRadius: '16px',
                      border: '1px dashed #cbd5e1',
                    }}
                  >
                    <FolderIcon style={{ width: '36px', height: '36px', color: '#94a3b8', margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#334155' }}>
                      Nenhum quiz encontrado
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Tente outro termo de pesquisa ou crie novos quizzes na biblioteca.
                    </div>
                  </div>
                ) : (
                  filteredQuizzesInModal.map(quiz => {
                    const isSelected = selectedQuizIds.includes(quiz.id);
                    const hasQuestions = quiz.questionCount > 0;

                    return (
                      <div
                        key={quiz.id}
                        onClick={() => toggleQuizSelection(quiz.id, quiz.questionCount)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 18px',
                          borderRadius: '12px',
                          border: isSelected ? `2px solid ${activeCard.accentColor}` : '1.5px solid #e2e8f0',
                          backgroundColor: isSelected ? `${activeCard.accentColor}0a` : hasQuestions ? '#ffffff' : '#f8fafc',
                          opacity: hasQuestions ? 1 : 0.65,
                          cursor: hasQuestions ? 'pointer' : 'not-allowed',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          {/* Checkbox customizado */}
                          <div
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '6px',
                              border: isSelected ? `2px solid ${activeCard.accentColor}` : '2px solid #cbd5e1',
                              backgroundColor: isSelected ? activeCard.accentColor : '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              flexShrink: 0,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {isSelected && <Check style={{ width: '14px', height: '14px', strokeWidth: 3 }} />}
                          </div>

                          {/* Ícone ou cor do Quiz */}
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: quiz.color || '#46178f',
                              flexShrink: 0,
                            }}
                          />

                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                              {quiz.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <FolderIcon style={{ width: '12px', height: '12px', color: quiz.folderColor }} />
                                {quiz.folderName}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Badge de perguntas */}
                        <div>
                          {hasQuestions ? (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                backgroundColor: isSelected ? `${activeCard.accentColor}20` : '#f1f5f9',
                                color: isSelected ? activeCard.accentColor : '#475569',
                                padding: '4px 10px',
                                borderRadius: '999px',
                              }}
                            >
                              📝 {quiz.questionCount} {quiz.questionCount === 1 ? 'pergunta' : 'perguntas'}
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: '#fee2e2',
                                color: '#b91c1c',
                                padding: '4px 8px',
                                borderRadius: '999px',
                              }}
                            >
                              ⚠️ Vazio
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── RODAPÉ DE AÇÃO DO MODAL ──────────────────────────────── */}
            <div
              style={{
                padding: '20px 28px',
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                  {selectedQuizIds.length} {selectedQuizIds.length === 1 ? 'quiz selecionado' : 'quizzes selecionados'}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Total de <b>{totalQuestionsSelected}</b> perguntas prontas para esta partida
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    sfx.playClick();
                    setActiveCard(null);
                  }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmLaunch}
                  disabled={
                    activeCard.format === 'roulette'
                      ? selectedQuizIds.length < 2
                      : selectedQuizIds.length < 1
                  }
                  style={{
                    padding: '10px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background:
                      (activeCard.format === 'roulette' && selectedQuizIds.length >= 2) ||
                      (activeCard.format !== 'roulette' && selectedQuizIds.length >= 1)
                        ? activeCard.gradient
                        : '#cbd5e1',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor:
                      (activeCard.format === 'roulette' && selectedQuizIds.length >= 2) ||
                      (activeCard.format !== 'roulette' && selectedQuizIds.length >= 1)
                        ? 'pointer'
                        : 'not-allowed',
                    boxShadow:
                      (activeCard.format === 'roulette' && selectedQuizIds.length >= 2) ||
                      (activeCard.format !== 'roulette' && selectedQuizIds.length >= 1)
                        ? `0 4px 14px ${activeCard.accentColor}40`
                        : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>Iniciar Partida Agora</span>
                  <ArrowRight style={{ width: '16px', height: '16px' }} />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
