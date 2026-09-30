export interface DefaultAgency {
  name: string;
  location: string;
  description: string;
  focus: string[];
  image: string;
  website?: string;
  instagram?: string;
}

export const DEFAULT_AGENCIES: DefaultAgency[] = [
  {
    name: 'Big Model Agency',
    location: 'Баку, Азербайджан (Baku, Azerbaijan)',
    description: 'Известное международное и локальное модельное агентство в Баку. Осуществляет профессиональный скаутинг, подготовку и менеджмент моделей для недели моды, рекламных съемок и международных контрактов.',
    focus: ['Fashion Week', 'Scouting', 'Commercials', 'Editorial'],
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
    instagram: 'https://instagram.com/bigmodelagency',
    website: 'https://bigmodelagency.com'
  },
  {
    name: 'Venera Models',
    location: 'Баку, Азербайджан (Baku, Azerbaijan)',
    description: 'Ведущее модельное и кастинговое агентство Азербайджана, основанное в 1995 году. Осуществляет профессиональный подбор моделей для международных модных показов, глянцевых журналов и рекламных кампаний.',
    focus: ['Fashion Shows', 'International Scouting', 'Commercials', 'Casting'],
    image: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?auto=format&fit=crop&w=800&q=80',
    instagram: 'https://instagram.com/veneramodels'
  },
  {
    name: 'LN Models',
    location: 'Баку, Азербайджан (Baku, Azerbaijan)',
    description: 'Премиальное модельное агентство и академия, специализирующееся на подиумном, эдиториал и хай-фэшн направлении. Подготовка и продвижение моделей на международном и национальном уровнях.',
    focus: ['Runway', 'Editorial', 'Fashion Week Placement', 'Model Academy'],
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    instagram: 'https://instagram.com/lnmodels'
  }
];
