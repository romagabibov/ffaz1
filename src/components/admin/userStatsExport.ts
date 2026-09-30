import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { User } from '../../types';

export interface UserActivityDataPoint {
 label: string; // e.g. "00:00", "01:00", "Mon", "24 Aug"
 hour?: number;
 day?: string;
 date?: string;
 activeUsers: number;
 newUsers: number;
 totalInteractions: number;
}

export interface ActivitySummary {
 peakHour: string;
 peakHourCount: number;
 peakDay: string;
 peakDayCount: number;
 dau: number;
 wau: number;
 mau: number;
}

// Generate complete TXT Report
export function exportUserStatsToTxt(
 users: User[],
 hourlyData: UserActivityDataPoint[],
 weeklyData: UserActivityDataPoint[],
 monthlyData: UserActivityDataPoint[],
 summary: ActivitySummary
) {
 const timestamp = new Date().toLocaleString('ru-RU', { 
 year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' 
 });
 
 const totalUsers = users.length;
 const verifiedNeedle = users.filter(u => u.hasGoldenNeedle).length;
 const paidSubs = users.filter(u => u.subscriptionTier && u.subscriptionTier !== 'free').length;
 const designersCount = users.filter(u => u.isDesigner || u.designerId || u.brandName).length;

 const roleCounts = users.reduce((acc, u) => {
 acc[u.role || 'user'] = (acc[u.role || 'user'] || 0) + 1;
 return acc;
 }, {} as Record<string, number>);

 const subCounts = users.reduce((acc, u) => {
 const tier = u.subscriptionTier || 'free';
 acc[tier] = (acc[tier] || 0) + 1;
 return acc;
 }, {} as Record<string, number>);

 const industryCounts = users.reduce((acc, u) => {
 const val = u.industry || 'Не указано';
 acc[val] = (acc[val] || 0) + 1;
 return acc;
 }, {} as Record<string, number>);

 const lines: string[] = [];
 lines.push('================================================================================');
 lines.push(' AZERBAIJAN FASHION WEEK (AFW) • ОТЧЕТ ПО СТАТИСТИКЕ ПОЛЬЗОВАТЕЛЕЙ ');
 lines.push('================================================================================');
 lines.push(`Дата и время формирования: ${timestamp}`);
 lines.push(`Всего пользователей в системе: ${totalUsers}`);
 lines.push(`Верифицированных дизайнеров (Qızıl İynə / Golden Needle): ${verifiedNeedle}`);
 lines.push(`Активных платных подписок: ${paidSubs}`);
 lines.push(`Привязанных брендов / дизайнеров: ${designersCount}`);
 lines.push('--------------------------------------------------------------------------------\n');

 lines.push('1. ОСНОВНЫЕ МЕТРИКИ АКТИВНОСТИ (ENGAGEMENT & ACTIVITY)');
 lines.push('--------------------------------------------------------------------------------');
 lines.push(`Пиковый час активности: ${summary.peakHour} (активно: ${summary.peakHourCount} польз.)`);
 lines.push(`Самый активный день: ${summary.peakDay} (активно: ${summary.peakDayCount} польз.)`);
 lines.push(`DAU (Daily Active Users): ${summary.dau} польз.`);
 lines.push(`WAU (Weekly Active Users): ${summary.wau} польз.`);
 lines.push(`MAU (Monthly Active Users): ${summary.mau} польз.`);
 lines.push('\n');

 lines.push('2. РАСПРЕДЕЛЕНИЕ ПО РОЛЯМ');
 lines.push('--------------------------------------------------------------------------------');
 Object.entries(roleCounts).forEach(([role, count]) => {
 const pct = ((count / (totalUsers || 1)) * 100).toFixed(1);
 lines.push(` - ${role.padEnd(20, ' ')} : ${String(count).padStart(5, ' ')} (${pct}%)`);
 });
 lines.push('\n');

 lines.push('3. РАСПРЕДЕЛЕНИЕ ПО ПОДПИСКАМ');
 lines.push('--------------------------------------------------------------------------------');
 Object.entries(subCounts).forEach(([tier, count]) => {
 const pct = ((count / (totalUsers || 1)) * 100).toFixed(1);
 lines.push(` - ${tier.toUpperCase().padEnd(20, ' ')} : ${String(count).padStart(5, ' ')} (${pct}%)`);
 });
 lines.push('\n');

 lines.push('4. РАСПРЕДЕЛЕНИЕ ПО СФЕРАМ ДЕЯТЕЛЬНОСТИ (INDUSTRY)');
 lines.push('--------------------------------------------------------------------------------');
 Object.entries(industryCounts).sort((a, b) => b[1] - a[1]).forEach(([ind, count]) => {
 const pct = ((count / (totalUsers || 1)) * 100).toFixed(1);
 lines.push(` - ${ind.padEnd(30, ' ')} : ${String(count).padStart(5, ' ')} (${pct}%)`);
 });
 lines.push('\n');

 lines.push('5. СУТОЧНАЯ АКТИВНОСТЬ ПО ЧАСАМ (24 ЧАСА)');
 lines.push('--------------------------------------------------------------------------------');
 lines.push(' Час (Время) | Активных пользователей | Новых регистраций');
 lines.push('--------------+------------------------+------------------');
 hourlyData.forEach(h => {
 lines.push(` ${h.label.padEnd(12, ' ')} | ${String(h.activeUsers).padStart(22, ' ')} | ${String(h.newUsers).padStart(16, ' ')}`);
 });
 lines.push('\n');

 lines.push('6. НЕДЕЛЬНАЯ АКТИВНОСТЬ (7 ДНЕЙ)');
 lines.push('--------------------------------------------------------------------------------');
 lines.push(' День недели | Активных пользователей | Новых регистраций');
 lines.push('--------------+------------------------+------------------');
 weeklyData.forEach(w => {
 lines.push(` ${w.label.padEnd(12, ' ')} | ${String(w.activeUsers).padStart(22, ' ')} | ${String(w.newUsers).padStart(16, ' ')}`);
 });
 lines.push('\n');

 lines.push('7. СПИСОК ВСЕХ ПОЛЬЗОВАТЕЛЕЙ (ROSTER)');
 lines.push('================================================================================');
 lines.push('ИМЯ / NICK | EMAIL | РОЛЬ | ИГЛА | ПОДПИСКА | РЕГИСТРАЦИЯ');
 lines.push('-------------------------+-----------------------------+------------+------+----------+------------');
 users.forEach(u => {
 const name = (u.name || u.handle || 'Без имени').slice(0, 23).padEnd(23, ' ');
 const email = (u.email || '-').slice(0, 27).padEnd(27, ' ');
 const role = (u.role || 'user').slice(0, 10).padEnd(10, ' ');
 const needle = (u.hasGoldenNeedle ? 'ДА ' : 'НЕТ').padEnd(4, ' ');
 const sub = (u.subscriptionTier || 'free').toUpperCase().slice(0, 8).padEnd(8, ' ');
 const regDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString('ru-RU') : '-';
 lines.push(`${name} | ${email} | ${role} | ${needle} | ${sub} | ${regDate}`);
 });
 lines.push('================================================================================');
 lines.push('КОНЕЦ ОТЧЕТА • AZERBAIJAN FASHION WEEK');

 const content = lines.join('\n');
 const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `AFW_User_Statistics_${new Date().toISOString().slice(0, 10)}.txt`;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);
}

// Generate Excel Workbook (.xlsx)
export function exportUserStatsToExcel(
 users: User[],
 hourlyData: UserActivityDataPoint[],
 weeklyData: UserActivityDataPoint[],
 monthlyData: UserActivityDataPoint[],
 summary: ActivitySummary
) {
 const wb = XLSX.utils.book_new();

 // Sheet 1: KPIs & Summary
 const summaryRows = [
 { Параметр: 'Отчет', Значение: 'Azerbaijan Fashion Week — Статистика пользователей' },
 { Параметр: 'Дата выгрузки', Значение: new Date().toLocaleString('ru-RU') },
 { Параметр: 'Всего пользователей', Значение: users.length },
 { Параметр: 'Верифицированных (Golden Needle)', Значение: users.filter(u => u.hasGoldenNeedle).length },
 { Параметр: 'Платных подписок (VIP/Pro/Creator)', Значение: users.filter(u => u.subscriptionTier && u.subscriptionTier !== 'free').length },
 { Параметр: 'Дизайнеров / Брендов', Значение: users.filter(u => u.isDesigner || u.designerId || u.brandName).length },
 { Параметр: 'Пиковый час активности', Значение: summary.peakHour },
 { Параметр: 'Пользователей в пиковый час', Значение: summary.peakHourCount },
 { Параметр: 'Самый активный день недели', Значение: summary.peakDay },
 { Параметр: 'Пользователей в активный день', Значение: summary.peakDayCount },
 { Параметр: 'DAU (Daily Active Users)', Значение: summary.dau },
 { Параметр: 'WAU (Weekly Active Users)', Значение: summary.wau },
 { Параметр: 'MAU (Monthly Active Users)', Значение: summary.mau },
 ];
 const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
 XLSX.utils.book_append_sheet(wb, wsSummary, 'Общие показатели');

 // Sheet 2: All Users
 const userRows = users.map((u, idx) => ({
 '№': idx + 1,
 'ID пользователя': u.id,
 'Имя / Название': u.name || '',
 'Email': u.email || '',
 'Никнейм (@handle)': u.handle || u.username || '',
 'Роль': u.role || 'user',
 'Золотая Игла (Golden Needle)': u.hasGoldenNeedle ? 'Да' : 'Нет',
 'Привязанный бренд': u.brandName || '',
 'Уровень подписки': (u.subscriptionTier || 'free').toUpperCase(),
 'Срок подписки': u.subscriptionValidUntil ? new Date(u.subscriptionValidUntil).toLocaleDateString('ru-RU') : 'Бессрочно / Базовый',
 'Онбординг пройден': u.onboardingComplete ? 'Да' : 'Нет',
 'Сфера деятельности (Industry)': u.industry || 'Не указано',
 'Образование (Degree)': u.degree || 'Не указано',
 'Уровень интереса': u.interestLevel || 'Не указано',
 'Возрастная категория': u.ageGroup || 'Не указано',
 'Главная цель': u.primaryGoal || 'Не указано',
 'Дата регистрации': u.createdAt ? new Date(u.createdAt).toLocaleDateString('ru-RU') : '',
 'Последняя активность': u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleString('ru-RU') : (u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('ru-RU') : ''),
 }));
 const wsUsers = XLSX.utils.json_to_sheet(userRows);
 XLSX.utils.book_append_sheet(wb, wsUsers, 'Все пользователи');

 // Sheet 3: Hourly Activity (24 Hours)
 const hourlyRows = hourlyData.map(h => ({
 'Час (24h)': h.label,
 'Активных пользователей': h.activeUsers,
 'Новых регистраций': h.newUsers,
 'Всего взаимодействий': h.totalInteractions,
 'Доля от суток (%)': ((h.activeUsers / (Math.max(1, users.length))) * 100).toFixed(1) + '%'
 }));
 const wsHourly = XLSX.utils.json_to_sheet(hourlyRows);
 XLSX.utils.book_append_sheet(wb, wsHourly, 'Активность по 24 часам');

 // Sheet 4: Weekly & Monthly Breakdown
 const weeklyRows = weeklyData.map(w => ({
 'День недели': w.label,
 'Активных пользователей': w.activeUsers,
 'Новых регистраций': w.newUsers,
 'Всего взаимодействий': w.totalInteractions,
 }));
 const wsWeekly = XLSX.utils.json_to_sheet(weeklyRows);
 XLSX.utils.book_append_sheet(wb, wsWeekly, 'Активность по дням недели');

 const monthlyRows = monthlyData.map(m => ({
 'День месяца': m.label,
 'Активных пользователей': m.activeUsers,
 'Новых регистраций': m.newUsers,
 'Всего взаимодействий': m.totalInteractions,
 }));
 const wsMonthly = XLSX.utils.json_to_sheet(monthlyRows);
 XLSX.utils.book_append_sheet(wb, wsMonthly, 'Активность за 30 дней');

 XLSX.writeFile(wb, `AFW_User_Statistics_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// Generate PDF Report (.pdf)
export function exportUserStatsToPdf(
 users: User[],
 hourlyData: UserActivityDataPoint[],
 weeklyData: UserActivityDataPoint[],
 monthlyData: UserActivityDataPoint[],
 summary: ActivitySummary
) {
 const doc = new jsPDF({
 orientation: 'portrait',
 unit: 'pt',
 format: 'a4'
 });

 const totalUsers = users.length;
 const verifiedNeedle = users.filter(u => u.hasGoldenNeedle).length;
 const paidSubs = users.filter(u => u.subscriptionTier && u.subscriptionTier !== 'free').length;

 // Header Banner
 doc.setFillColor(18, 18, 18);
 doc.rect(0, 0, 595, 70, 'F');

 // Crimson accent strip
 doc.setFillColor(122, 0, 0); // #7A0000
 doc.rect(0, 70, 595, 4, 'F');

 doc.setTextColor(255, 255, 255);
 doc.setFontSize(16);
 doc.setFont('helvetica', 'bold');
 doc.text('AZERBAIJAN FASHION WEEK', 40, 32);

 doc.setFontSize(9);
 doc.setFont('helvetica', 'normal');
 doc.setTextColor(200, 200, 200);
 doc.text('AUDIENCE INTELLIGENCE & USER ANALYTICS REPORT', 40, 50);

 const dateStr = new Date().toLocaleDateString('ru-RU', { 
 year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
 });
 doc.text(`Generated: ${dateStr}`, 410, 50);

 let currentY = 95;

 // Key KPI Boxes
 doc.setTextColor(18, 18, 18);
 doc.setFontSize(12);
 doc.setFont('helvetica', 'bold');
 doc.text('EXECUTIVE AUDIENCE SUMMARY', 40, currentY);
 currentY += 12;

 const kpis = [
 { title: 'TOTAL USERS', val: String(totalUsers) },
 { title: 'GOLDEN NEEDLE', val: String(verifiedNeedle) },
 { title: 'PAID MEMBERS', val: String(paidSubs) },
 { title: 'PEAK HOUR', val: summary.peakHour },
 ];

 const boxWidth = 120;
 const boxHeight = 45;
 const gap = 12;

 kpis.forEach((kpi, idx) => {
 const x = 40 + idx * (boxWidth + gap);
 doc.setDrawColor(18, 18, 18);
 doc.setLineWidth(1.5);
 doc.setFillColor(248, 248, 248);
 doc.rect(x, currentY, boxWidth, boxHeight, 'FD');

 doc.setFontSize(7);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(100, 100, 100);
 doc.text(kpi.title, x + 8, currentY + 14);

 doc.setFontSize(14);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(122, 0, 0);
 doc.text(kpi.val, x + 8, currentY + 34);
 });

 currentY += boxHeight + 20;

 // Engagement Metrics Table (Complete 24-Hour Breakdown 00:00 - 23:00)
 doc.setFontSize(11);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(18, 18, 18);
 doc.text('HOURLY ACTIVITY & ENGAGEMENT (FULL 24 HOURS: 00:00 - 23:00)', 40, currentY);
 currentY += 8;

 // Include all 24 hours (00:00 to 23:00)
 const hourlyTableBody = hourlyData.map(h => [
 h.label,
 String(h.activeUsers),
 String(h.newUsers),
 String(h.totalInteractions),
 ((h.activeUsers / Math.max(1, totalUsers)) * 100).toFixed(1) + '%'
 ]);

 autoTable(doc, {
 startY: currentY,
 head: [['Hour (24h)', 'Active Users', 'New Signups', 'Interactions', 'Share of Total']],
 body: hourlyTableBody,
 theme: 'grid',
 headStyles: {
 fillColor: [18, 18, 18],
 textColor: [255, 255, 255],
 fontStyle: 'bold',
 fontSize: 7.5,
 cellPadding: 3,
 },
 bodyStyles: {
 fontSize: 7,
 textColor: [20, 20, 20],
 cellPadding: 2,
 },
 alternateRowStyles: {
 fillColor: [245, 245, 245]
 },
 margin: { left: 40, right: 40 }
 });

 // @ts-ignore
 currentY = (doc as any).lastAutoTable.finalY + 20;

 // Users Directory Table
 doc.setFontSize(11);
 doc.setFont('helvetica', 'bold');
 doc.setTextColor(18, 18, 18);
 doc.text('USER ROSTER & VERIFICATION DIRECTORY', 40, currentY);
 currentY += 8;

 const userTableBody = users.slice(0, 30).map(u => [
 (u.name || u.handle || 'Anonymous').slice(0, 20),
 (u.email || '-').slice(0, 24),
 (u.role || 'user').toUpperCase(),
 u.hasGoldenNeedle ? 'VERIFIED' : '-',
 (u.subscriptionTier || 'FREE').toUpperCase(),
 u.createdAt ? new Date(u.createdAt).toLocaleDateString('ru-RU') : '-'
 ]);

 autoTable(doc, {
 startY: currentY,
 head: [['Name / Handle', 'Email', 'Role', 'Golden Needle', 'Tier', 'Joined']],
 body: userTableBody,
 theme: 'grid',
 headStyles: {
 fillColor: [122, 0, 0], // Crimson header
 textColor: [255, 255, 255],
 fontStyle: 'bold',
 fontSize: 8,
 },
 bodyStyles: {
 fontSize: 8,
 textColor: [20, 20, 20],
 },
 alternateRowStyles: {
 fillColor: [250, 250, 250]
 },
 margin: { left: 40, right: 40 }
 });

 // Footer on all pages
 const pageCount = (doc as any).internal.getNumberOfPages();
 for (let i = 1; i <= pageCount; i++) {
 doc.setPage(i);
 doc.setFontSize(7);
 doc.setFont('helvetica', 'normal');
 doc.setTextColor(130, 130, 130);
 doc.text(
 `Azerbaijan Fashion Week • Confidential Administrative Report • Page ${i} of ${pageCount}`,
 40,
 820
 );
 }

 doc.save(`AFW_User_Statistics_${new Date().toISOString().slice(0, 10)}.pdf`);
}
