import { describe, expect, it } from 'vitest';
import { buildIcs } from './ics.ts';

describe('buildIcs', () => {
  const now = new Date(Date.UTC(2026, 9, 7, 12, 0, 0));

  it('gera evento com horário e duração', () => {
    const ics = buildIcs([{ uid: '1', title: 'Cinema: Duna, Parte 3', date: '2026-12-18', time: '19:30', durationMinutes: 170 }], now);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART:20261218T193000');
    expect(ics).toContain('DTEND:20261218T222000');
    expect(ics).toContain('SUMMARY:Cinema: Duna\\, Parte 3'); // vírgula escapada
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('sem horário vira evento de dia inteiro', () => {
    const ics = buildIcs([{ uid: '2', title: 'Estreia', date: '2026-12-31' }], now);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261231');
    expect(ics).toContain('DTEND;VALUE=DATE:20270101');
  });
});
