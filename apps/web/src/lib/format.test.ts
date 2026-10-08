import { describe, expect, it } from 'vitest';
import { daysUntil, formatRuntime, groupBy, parseLocalDate, releaseLabel } from './format.ts';

describe('format', () => {
  it('parseLocalDate não "volta um dia" por causa do fuso', () => {
    const d = parseLocalDate('2026-10-20');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 20]);
  });

  it('daysUntil e releaseLabel', () => {
    const now = new Date(2026, 9, 7, 23, 30);
    expect(daysUntil('2026-10-08', now)).toBe(1);
    expect(releaseLabel('2026-10-07', now)).toBe('Estreia hoje');
    expect(releaseLabel('2026-10-08', now)).toBe('Estreia amanhã');
    expect(releaseLabel('2026-10-17', now)).toBe('Em 10 dias');
    expect(releaseLabel('2026-10-01', now)).toBeNull();
  });

  it('formatRuntime', () => {
    expect(formatRuntime(125)).toBe('2h 05min');
    expect(formatRuntime(45)).toBe('45min');
    expect(formatRuntime(null)).toBeNull();
  });

  it('groupBy mantém a ordem', () => {
    const groups = groupBy(['a1', 'b1', 'a2'], (s) => s[0] ?? '');
    expect(groups).toEqual([
      { key: 'a', items: ['a1', 'a2'] },
      { key: 'b', items: ['b1'] },
    ]);
  });
});

import { cinemaWeekStart, formatWeekRange, weekLabel } from './format.ts';

describe('semana de cinema', () => {
  it('começa na quinta-feira', () => {
    expect(cinemaWeekStart('2026-10-08')).toBe('2026-10-08'); // quinta
    expect(cinemaWeekStart('2026-10-14')).toBe('2026-10-08'); // quarta seguinte
    expect(cinemaWeekStart('2026-10-07')).toBe('2026-10-01'); // quarta anterior
  });
  it('formata o intervalo', () => {
    expect(formatWeekRange('2026-10-08')).toBe('8 a 14 de outubro');
    expect(formatWeekRange('2026-10-29')).toBe('29 de outubro a 4 de novembro');
  });
  it('rótulos relativos', () => {
    const now = new Date(2026, 9, 7);
    expect(weekLabel('2026-10-01', now)).toBe('Esta semana');
    expect(weekLabel('2026-10-08', now)).toBe('Próxima semana');
    expect(weekLabel('2026-10-15', now)).toBeNull();
  });
});
