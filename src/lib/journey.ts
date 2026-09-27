// src/lib/journey.ts
// Tipos e dados das Jornadas do Quizziando

export interface JourneyStage {
  stageNumber: number;
  cityName: string;
  region: string;
  tagline: string;
  image: string;
  badge: string;
  accentColor: string;
  curiosity: string;
  iconName: string;
}

export interface JourneyDef {
  id: string;
  title: string;
  subtitle: string;
  origin: string;
  destination: string;
  mapOverviewImage: string;
  stages: JourneyStage[];
}

export const CEARA_JOURNEY: JourneyDef = {
  id: 'ceara-juazeiro-fortaleza',
  title: 'Expedição Ceará',
  subtitle: 'De Juazeiro do Norte à Capital da Luz',
  origin: 'Juazeiro do Norte',
  destination: 'Fortaleza',
  mapOverviewImage: '/jornada/mapa00.png',
  stages: [
    {
      stageNumber: 1,
      cityName: 'Juazeiro do Norte',
      region: 'Cariri Cearense',
      tagline: 'Ponto de Partida na Terra do Padre Cícero',
      image: '/jornada/mapa01.png',
      badge: '🙏 Fé & Cariri',
      accentColor: '#F59E0B',
      curiosity: 'Localizada no Vale do Cariri, é um dos maiores centros de peregrinação religiosa da América Latina e polo do artesanato em couro e xilogravura.',
      iconName: 'Compass'
    },
    {
      stageNumber: 2,
      cityName: 'Icó',
      region: 'Centro-Sul Cearense',
      tagline: 'O Casario Colonial e a História Viva',
      image: '/jornada/mapa02.png',
      badge: '🏛️ Patrimônio Histórico',
      accentColor: '#10B981',
      curiosity: 'Tombada pelo IPHAN, Icó abriga o famoso Theatro da Ribeira dos Icós, o mais antigo teatro do Ceará, fundado em 1860.',
      iconName: 'Landmark'
    },
    {
      stageNumber: 3,
      cityName: 'Jaguaribe',
      region: 'Médio Jaguaribe',
      tagline: 'Terra do Queijo Coalho e Força Sertaneja',
      image: '/jornada/mapa03.png',
      badge: '🧀 Tradição Sertaneja',
      accentColor: '#EF4444',
      curiosity: 'Famosa nacionalmente como a Capital do Queijo Coalho, situada às margens do maior rio temporário do mundo, o Rio Jaguaribe.',
      iconName: 'Flame'
    },
    {
      stageNumber: 4,
      cityName: 'Russas',
      region: 'Baixo Jaguaribe',
      tagline: 'A Terra da Telha e Encanto Jaguaribano',
      image: '/jornada/mapa04.png',
      badge: '🧱 Polo de Cerâmica',
      accentColor: '#8B5CF6',
      curiosity: 'Conhecida pela pujante indústria cerâmica e fruticultura irrigada, Russas é um elo vital no caminho para a faixa litorânea.',
      iconName: 'Layers'
    },
    {
      stageNumber: 5,
      cityName: 'Pacajus',
      region: 'Região Metropolitana',
      tagline: 'A Terra da Castanha de Caju',
      image: '/jornada/mapa05.png',
      badge: '🌰 Sabor Cearense',
      accentColor: '#EC4899',
      curiosity: 'Grande polo industrial da castanha e sucos tropicais, marcando a transição das terras sertanejas para os ares litorâneos.',
      iconName: 'Sparkles'
    },
    {
      stageNumber: 6,
      cityName: 'Fortaleza',
      region: 'Capital do Ceará',
      tagline: 'A Chegada Triunfal na Terra da Luz',
      image: '/jornada/mapa06.png',
      badge: '⭐ Destino Final Conquistado!',
      accentColor: '#3B82F6',
      curiosity: 'A terra das jangadas, do mar azul-turquesa, do Dragão do Mar e do acolhimento cearense! Você conquistou o Ceará de ponta a ponta!',
      iconName: 'Trophy'
    }
  ]
};

export const AVAILABLE_JOURNEYS: JourneyDef[] = [
  CEARA_JOURNEY
];

export function getJourneyById(id?: string | null): JourneyDef {
  return AVAILABLE_JOURNEYS.find(j => j.id === id) || CEARA_JOURNEY;
}

