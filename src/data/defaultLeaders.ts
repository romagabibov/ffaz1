export interface LeaderMember {
  id: string;
  name: string;
  roleAz: string;
  roleRu: string;
  roleEn: string;
  photoUrl: string;
  bioAz: string;
  bioRu: string;
  bioEn: string;
  email?: string;
}

export const DEFAULT_LEADERS: LeaderMember[] = [
  {
    id: 'leader-1',
    name: 'Nigar Rzayeva',
    roleAz: 'Mərkəzin Rəhbəri & Baş Direktor',
    roleRu: 'Руководитель Центра & Генеральный Директор',
    roleEn: 'Managing Director & Head of the Center',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
    bioAz: 'Azərbaycan dəb sənayesinin beynəlxalq səviyyədə təmsil olunması, dövlət və özəl tərəfdaşlıq layihələri, milli brendlərin qlobal bazarlara çıxarılması üzrə 12 illik təcrübəyə malik ekspert.',
    bioRu: 'Эксперт с 12-летним опытом развития модной индустрии Азербайджана, координации международных недель моды, стратегических партнерств и интеграции азербайджанских дизайнеров на мировые подиумы.',
    bioEn: 'Expert with 12+ years of experience spearheading Azerbaijani fashion initiatives, international fashion weeks coordination, and global export strategy for local designers.',
    email: 'direction@fashiondevelopment.az'
  },
  {
    id: 'leader-2',
    name: 'Fərid Məmmədov',
    roleAz: 'Yaradıcılıq & Beynəlxalq Əlaqələr Direktoru',
    roleRu: 'Креативный директор & Глава международных связей',
    roleEn: 'Creative Director & Head of Global Partnerships',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    bioAz: 'Milan, Paris və London moda həftələri ilə əlaqələr, rəsmi kuratorluq, avanqard layihələrin və xüsusi milli kolleksiyaların hazırlanması üzrə rəhbər.',
    bioRu: 'Куратор выставочных и подиумных проектов в Милане, Париже и Лондоне. Отвечает за международные коллаборации, брендинг и связи с мировыми агентствами.',
    bioEn: 'Curator of runway programs in Milan, Paris, and London. Oversees international alliances, cultural resonance, and global agency scouting.',
    email: 'creative@fashiondevelopment.az'
  },
  {
    id: 'leader-3',
    name: 'Leyla Əliyeva',
    roleAz: 'Təhsil Proqramları & İstedadların İnkişafı Rəhbəri',
    roleRu: 'Руководитель образовательных программ & Инкубации талантов',
    roleEn: 'Head of Fashion Education & Talent Incubation',
    photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=800&q=80',
    bioAz: 'ADRA və beynəlxalq dizayn institutları ilə birgə ustad dərslərinin, gənc modelyerlər üçün qrant layihələrinin və yaradıcılıq laboratoriyalarının rəhbəri.',
    bioRu: 'Координирует академические инициативы с академиями ADRA, ADMİU и зарубежными школами. Курирует гранты, менторские сессии и стажировки для молодых кутюрье.',
    bioEn: 'Leads educational tracks in synergy with ADRA, ADMİU, and European schools. Manages mentorship grants and graduate talent showcases.',
    email: 'education@fashiondevelopment.az'
  }
];
