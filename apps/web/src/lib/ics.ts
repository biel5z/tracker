/**
 * Gera um arquivo .ics (formato de calendário aceito por Google Agenda, Outlook e Apple).
 * Especificação: RFC 5545. Linhas terminam com CRLF e textos precisam de escape.
 */
export interface IcsEvent {
  uid: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm (opcional; sem hora vira evento de dia inteiro) */
  time?: string;
  durationMinutes?: number;
  location?: string;
  description?: string;
  url?: string;
}

const escapeText = (text: string) =>
  text.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

const compactDate = (date: string) => date.replace(/-/g, '');

function addMinutes(date: string, time: string, minutes: number): string {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const dt = new Date(y ?? 1970, (mo ?? 1) - 1, d ?? 1, h ?? 0, (mi ?? 0) + minutes);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}

function nextDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}`;
}

/** Quebra linhas longas em 75 caracteres, como a especificação pede. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 74) parts.push((i === 0 ? '' : ' ') + line.slice(i, i + 74));
  return parts.join('\r\n');
}

export function buildIcs(events: IcsEvent[], now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tracker de Estreias//PT-BR', 'CALSCALE:GREGORIAN'];

  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${e.uid}@tracker-estreias`, `DTSTAMP:${stamp}`);
    if (e.time) {
      lines.push(`DTSTART:${addMinutes(e.date, e.time, 0)}`, `DTEND:${addMinutes(e.date, e.time, e.durationMinutes ?? 120)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compactDate(e.date)}`, `DTEND;VALUE=DATE:${nextDay(e.date)}`);
    }
    lines.push(`SUMMARY:${escapeText(e.title)}`);
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Dispara o download do arquivo no navegador. */
export function downloadIcs(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
