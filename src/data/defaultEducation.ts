export interface EducationInstitution {
 id?: string;
 number?: number;
 name: string; // Name in AZ or official
 nameRu?: string; // Russian name
 category: 'higher_state' | 'higher_private' | 'private_school' | 'other';
 badge?: string;
 details?: string;
 faculties?: string[];
 note?: string;
 website?: string;
 image?: string;
 createdAt?: number;
}

export const DEFAULT_EDUCATION_INSTITUTIONS: Omit<EducationInstitution, 'id'>[] = [
 // I. Высшие учебные заведения — Государственные университеты
 {
 number: 1,
 name: 'Azərbaycan Dövlət Mədəniyyət və İncəsənət Universiteti (ADMİU)',
 nameRu: 'Азербайджанский государственный университет культуры и искусств',
 category: 'higher_state',
 badge: 'Государственный университет',
 faculties: [
 'Факультет дизайна и декоративно-прикладного искусства'
 ],
 image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80',
 website: 'https://admiu.edu.az'
 },
 {
 number: 2,
 name: 'Azərbaycan Dövlət Rəssamlıq Akademiyası (ADRA)',
 nameRu: 'Азербайджанская государственная академия художеств',
 category: 'higher_state',
 badge: 'Государственная академия',
 faculties: [
 'Факультет архитектуры и дизайна',
 'Отдельная кафедра Fashion Design (дизайн одежды)'
 ],
 image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80',
 website: 'https://adra.edu.az'
 },
 {
 number: 3,
 name: 'Azərbaycan Texniki Universiteti (AzTU)',
 nameRu: 'Азербайджанский технический университет',
 category: 'higher_state',
 badge: 'Государственный университет',
 faculties: [
 'Промышленный дизайн',
 'Технический дизайн',
 'Направление «Дизайн»'
 ],
 image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
 website: 'https://aztu.edu.az'
 },
 {
 number: 4,
 name: 'Azərbaycan Memarlıq və İnşaat Universiteti (AzMİU)',
 nameRu: 'Азербайджанский университет архитектуры и строительства',
 category: 'higher_state',
 badge: 'Престижное направление',
 faculties: [
 'Дизайн',
 'Дизайн интерьера'
 ],
 note: 'Одно из наиболее престижных направлений в сфере дизайна.',
 image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80',
 website: 'https://azmiu.edu.az'
 },
 {
 number: 5,
 name: 'Qarabağ Universiteti',
 nameRu: 'Карабахский университет',
 category: 'higher_state',
 badge: 'Основан в 2023 году',
 faculties: [
 'Факультет дизайна'
 ],
 note: 'Университет открыт в 2023 году, направление Fashion Design пока не набирается.',
 image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80',
 website: 'https://karabakh.edu.az'
 },

 // I. Высшие учебные заведения — Частные университеты
 {
 number: 6,
 name: 'Qərbi Kaspi Universiteti',
 nameRu: 'Университет Западного Каспия',
 category: 'higher_private',
 badge: 'Частный университет',
 faculties: [
 'Дизайн',
 'Графический дизайн'
 ],
 image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
 website: 'https://wcu.edu.az'
 },
 {
 number: 7,
 name: 'Azərbaycan Universiteti',
 nameRu: 'Азербайджанский университет',
 category: 'higher_private',
 badge: 'Частный университет',
 faculties: [
 'Дизайн'
 ],
 image: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=800&q=80',
 website: 'https://au.edu.az'
 },

 // II. Частные школы и академии моды
 {
 number: 1,
 name: 'Baku Fashion School',
 nameRu: 'Baku Fashion School (с 2016 года)',
 category: 'private_school',
 badge: 'С 2016 года',
 details: 'Основана в 2016 году. Курсы дизайна одежды, стилистики, конструирования и моделирования.',
 faculties: [
 'Дизайн одежды и конструирование',
 'Fashion-стилистика и иллюстрация'
 ],
 image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=800&q=80'
 },
 {
 number: 2,
 name: 'Baku Fashion Academy',
 nameRu: 'Baku Fashion Academy (Хаяла Асадова)',
 category: 'private_school',
 badge: 'Хаяла Асадова',
 details: 'Академия моды и дизайна под руководством Хаялы Асадовой.',
 faculties: [
 'Дизайн моды и создание коллекций',
 'Кутюр и вечерняя одежда'
 ],
 image: 'https://images.unsplash.com/photo-1537832816519-689ad163238b?auto=format&fit=crop&w=800&q=80'
 },
 {
 number: 3,
 name: 'Azerbaijan Fashion Lab AFS MMC',
 nameRu: 'Azerbaijan Fashion Lab AFS MMC (Ругия Алиева)',
 category: 'private_school',
 badge: 'Ругия Алиева',
 details: 'Лаборатория моды и творческий инкубатор под руководством Ругии Алиевой.',
 faculties: [
 'Экспериментальный дизайн одежды',
 'Текстильные инновации и модные исследования'
 ],
 image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80'
 },
 {
 number: 4,
 name: 'Azerbaijan Fashion School MMC',
 nameRu: 'Azerbaijan Fashion School MMC',
 category: 'private_school',
 badge: 'Частная школа',
 details: 'Профессиональные программы по моделированию, швейному искусству и современному дизайну.',
 faculties: [
 'Моделирование и закройное дело',
 'Модный бизнес и брендинг'
 ],
 image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80'
 },
 {
 number: 5,
 name: 'CLASSA Fashion School & Platform',
 nameRu: 'CLASSA Fashion School & Platform',
 category: 'private_school',
 badge: 'School & Platform',
 details: 'Образовательная платформа и авторская школа дизайна и стилистики.',
 faculties: [
 'Дизайн одежды и фэшн-стайлинг',
 'Платформа продвижения молодых дизайнеров'
 ],
 image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80'
 },
 {
 number: 6,
 name: 'CHENILLE Fashion School & Studio',
 nameRu: 'CHENILLE Fashion School & Studio',
 category: 'private_school',
 badge: 'School & Studio',
 details: 'Студия швейного мастерства и концептуальная школа моды.',
 faculties: [
 'Студийный дизайн и швейное мастерство',
 'Индивидуальный пошив и кутюрные техники'
 ],
 image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80'
 },
 {
 number: 7,
 name: 'Simoorg Design & Fashion Academy',
 nameRu: 'Simoorg Design & Fashion Academy',
 category: 'private_school',
 badge: 'Академия дизайна',
 details: 'Обучение фэшн-иллюстрации, графическому дизайну моды и созданию гардероба.',
 faculties: [
 'Фэшн-иллюстрация и эскизирование',
 'Дизайн костюма'
 ],
 image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=800&q=80'
 },
 {
 number: 8,
 name: 'Fashion District Academy',
 nameRu: 'Fashion District Academy',
 category: 'private_school',
 badge: 'Fashion Academy',
 details: 'Академия fashion-индустрии, подготовки стилистов, дизайнеров и бренд-менеджеров.',
 faculties: [
 'Fashion Management & Styling',
 'Создание собственного бренда одежды'
 ],
 image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80'
 },
 {
 number: 9,
 name: 'EDC Fashion Academy',
 nameRu: 'EDC Fashion Academy',
 category: 'private_school',
 badge: 'Fashion Academy',
 details: 'Курсы коммерческого и подиумного дизайна, конструирования одежды и текстиля.',
 faculties: [
 'Коммерческий дизайн одежды',
 'Техника кроя и моделирование'
 ],
 image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800&q=80'
 },
 {
 number: 10,
 name: 'Menzer Zekizade – The Fashion Academy',
 nameRu: 'Menzer Zekizade – The Fashion Academy',
 category: 'private_school',
 badge: 'The Fashion Academy',
 details: 'Авторская академия моды Мензер Закизаде — высокое шитье и концептуальный дизайн.',
 faculties: [
 'Концептуальный fashion-дизайн',
 'Высокое шитье и авторские коллекции'
 ],
 image: 'https://images.unsplash.com/photo-1479064555552-3ef4979f8908?auto=format&fit=crop&w=800&q=80'
 }
];
