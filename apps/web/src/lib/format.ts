/**
 * Formatação de datas e números em pt-BR.
 *
 * Cuidado clássico: `new Date('2026-10-20')` é interpretado como meia-noite UTC,
 * que no Brasil (UTC-3) vira 19/10 às 21h. Por isso `parseLocalDate` monta a data
 * no fuso local a partir dos números.
 */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const longDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
const weekdayDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const monthYear = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

export const formatDate = (iso: string | null | undefined) => (iso ? longDate.format(parseLocalDate(iso)) : 'Data a confirmar');
export const formatShortDate = (iso: string | null | undefined) =>
  iso ? shortDate.format(parseLocalDate(iso)).replace('.', '') : 'A confirmar';
export const formatWeekday = (iso: string) => {
  const text = weekdayDate.format(parseLocalDate(iso));
  return text.charAt(0).toUpperCase() + text.slice(1);
};
export const formatMonthYear = (iso: string) => {
  const text = monthYear.format(parseLocalDate(iso));
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const yearOf = (iso: string | null | undefined) => (iso ? iso.slice(0, 4) : '—');

/** Diferença em dias inteiros entre hoje e a data (negativo = já passou). */
export function daysUntil(iso: string, now = new Date()): number {
  const target = parseLocalDate(iso).getTime();
  const today = parseLocalDate(todayIso(now)).getTime();
  return Math.round((target - today) / 86_400_000);
}

/** "Estreia hoje", "Estreia amanhã", "Em 12 dias", "Em cartaz". */
export function releaseLabel(iso: string | null | undefined, now = new Date()): string | null {
  if (!iso) return null;
  const days = daysUntil(iso, now);
  if (days < 0) return null;
  if (days === 0) return 'Estreia hoje';
  if (days === 1) return 'Estreia amanhã';
  return `Em ${days} dias`;
}

export function formatRuntime(minutes: number | null): string | null {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${String(m).padStart(2, '0')}min` : `${m}min`;
}

export const formatRating = (value: number) => value.toFixed(1).replace('.', ',');

/** Agrupa itens por uma chave mantendo a ordem de chegada (usado no feed de estreias). */
export function groupBy<T>(items: T[], keyOf: (item: T) => string): Array<{ key: string; items: T[] }> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.entries()].map(([key, list]) => ({ key, items: list }));
}

/**
 * Semana de cinema no Brasil: as estreias acontecem às quintas-feiras,
 * então a "semana" vai de quinta a quarta. Devolve a quinta-feira que abre a semana da data.
 */
export function cinemaWeekStart(iso: string): string {
  const date = parseLocalDate(iso);
  const sinceThursday = (date.getDay() - 4 + 7) % 7; // getDay(): 0 = domingo, 4 = quinta
  date.setDate(date.getDate() - sinceThursday);
  return todayIso(date);
}

const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });

/** "8 a 14 de outubro" ou "29 de outubro a 4 de novembro". */
export function formatWeekRange(startIso: string): string {
  const start = parseLocalDate(startIso);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  if (start.getMonth() === end.getMonth()) return `${start.getDate()} a ${dayMonth.format(end)}`;
  return `${dayMonth.format(start)} a ${dayMonth.format(end)}`;
}

/** "Esta semana", "Próxima semana" ou null. */
export function weekLabel(startIso: string, now = new Date()): string | null {
  const current = cinemaWeekStart(todayIso(now));
  if (startIso === current) return 'Esta semana';
  if (daysUntil(startIso, now) > 0 && daysUntil(startIso, now) <= 7) return 'Próxima semana';
  return null;
}
