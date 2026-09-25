// src/lib/bossRaid.ts
// Tipos, dados e mecânicas da "Batalha contra o Chefe" (Boss Raid Coletivo)

export interface BossDef {
  id: string;
  name: string;
  title: string;
  image: string;
  element: 'fire' | 'tech' | 'cosmic';
  accentColor: string;
  gradient: string;
  description: string;
  attackQuotes: string[];
  victoryQuotes: string[];
}

export const RAID_BOSSES: BossDef[] = [
  {
    id: 'boss_dragon',
    name: 'Ignis, o Soberano das Cinzas',
    title: 'Guardião Dracônico do Conhecimento Antigo',
    image: '/bosses/dragon.jpg',
    element: 'fire',
    accentColor: '#EF4444',
    gradient: 'linear-gradient(135deg, #B91C1C 0%, #EA580C 50%, #F59E0B 100%)',
    description: 'Um dragão ancestral forjado em magma e estrelas. Para derrotá-lo, a turma inteira precisa acertar as questões e apagar suas chamas!',
    attackQuotes: [
      'Suas respostas são fracas como brasa fria!',
      'Queimem diante da minha sabedoria antiga!',
      'Vocês não passarão pelo meu sopro de fogo!'
    ],
    victoryQuotes: [
      'Impossível... o intelecto de vocês extinguiu meu poder!',
      'A turma demonstrou conhecimento digno dos mestres!'
    ]
  },
  {
    id: 'boss_mecha',
    name: 'Nexus-01, o Titã de Matriz',
    title: 'Autômato Cibernético de Lógica Pura',
    image: '/bosses/mecha.jpg',
    element: 'tech',
    accentColor: '#06B6D4',
    gradient: 'linear-gradient(135deg, #0284C7 0%, #06B6D4 50%, #3B82F6 100%)',
    description: 'Uma entidade mecânica hiper-evoluída que desafia a lógica dos estudantes. Seus escudos de energia exigem precisão cirúrgica.',
    attackQuotes: [
      'Erro 404: Conhecimento não encontrado na sua turma!',
      'Sobrecarga de dados ativada!',
      'Seus algoritmos mentais são inferiores!'
    ],
    victoryQuotes: [
      'Falha crítica no sistema... A inteligência coletiva venceu!',
      'Reiniciando em modo de rendição... Parabéns, estudantes!'
    ]
  },
  {
    id: 'boss_wizard',
    name: 'Chronos, o Arquimago Cósmico',
    title: 'Senhor Arcano do Espaço e do Tempo',
    image: '/bosses/wizard.jpg',
    element: 'cosmic',
    accentColor: '#A855F7',
    gradient: 'linear-gradient(135deg, #6B21A8 0%, #9333EA 50%, #EC4899 100%)',
    description: 'Um feiticeiro cósmico que manipula o tempo da sala de aula. Cada resposta certa desestabiliza suas runas mágicas.',
    attackQuotes: [
      'O tempo da sala corre contra vocês!',
      'Suas mentes ainda estão no início da jornada cósmica!',
      'Sintam a pressão das nebulosas do esquecimento!'
    ],
    victoryQuotes: [
      'As estrelas se alinharam para vocês... Vitória extraordinária!',
      'A magia da sabedoria quebrou meu feitiço temporal!'
    ]
  }
];

export interface BossBattleState {
  bossId: string;
  maxHp: number;
  currentHp: number;
  teamShieldHp: number;
  maxTeamShield: number;
  phase: 'normal' | 'enraged' | 'defeated';
  lastDamageTaken: number | null;
  lastDamageDealer: string | null;
  isCritical: boolean;
  totalTeamHits: number;
  totalTeamMisses: number;
}

/**
 * Calcula o HP total calibrado do chefe com base na quantidade de perguntas e jogadores
 */
export function calculateBossInitialHp(roundsCount: number, playersCount: number = 1): number {
  const effectivePlayers = Math.max(1, playersCount);
  // Cerca de 800 pontos de dano por pergunta acertada
  return Math.max(2000, roundsCount * effectivePlayers * 800);
}
