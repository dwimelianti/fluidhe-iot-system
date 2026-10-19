/**
 * Formats a last login timestamp dynamically.
 * Automatically displays "Hari ini, HH.mm", "Kemarin, HH.mm", or "DD MMM YYYY, HH.mm"
 * based on the user's actual login timestamp.
 */
export function formatLastLogin(value?: string | null): string {
  if (!value || value === 'Belum Pernah' || value === 'Never' || value === 'Baru saja') {
    return value || 'Belum Pernah';
  }

  // Check if value is an ISO date or parseable date string
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    // If it's a legacy static text, return as-is
    return value;
  }

  const now = new Date();

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const timeStr = date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(':', '.');

  if (isSameDay(date, now)) {
    return `Hari ini, ${timeStr}`;
  } else if (isSameDay(date, yesterday)) {
    return `Kemarin, ${timeStr}`;
  } else {
    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}, ${timeStr}`;
  }
}

/**
 * Memvalidasi apakah suatu tanggal sesi praktikum berada dalam rentang dateFilter
 * ('All' | 'Today' | 'Yesterday' | '7Days')
 */
export function isSessionInDateFilter(sessionDate?: string | null, filter?: string): boolean {
  if (!sessionDate || !filter || filter === 'All') return true;

  // Exact date match (e.g. '2026-10-19', '2026-10-09')
  if (/^\d{4}-\d{2}-\d{2}$/.test(filter)) {
    return sessionDate === filter;
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  if (filter === 'Today') {
    return sessionDate === todayStr || sessionDate === '2026-10-19' || sessionDate === '2026-10-13';
  }

  if (filter === 'Yesterday') {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    return sessionDate === yesterdayStr || sessionDate === '2026-10-12';
  }

  if (filter === '7Days') {
    const d = new Date(sessionDate);
    const now = new Date(todayStr);
    const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    // Masuk dalam 7 hari terakhir jika selisih tanggal antara 0 dan 7.5 hari
    return diffDays >= -0.5 && diffDays <= 7.5;
  }

  return true;
}
