import { beforeEach, describe, expect, it } from 'vitest';
import { library, WATCHED_ID, WATCHLIST_ID } from './library.ts';

const movie = { id: 10, title: 'Teste', posterPath: null, releaseDate: '2026-11-01' };

describe('library', () => {
  beforeEach(() => library.reset());

  it('adiciona e remove de "Quero ver"', () => {
    library.toggle(WATCHLIST_ID, movie);
    expect(library.isInList(WATCHLIST_ID, 10)).toBe(true);
    library.toggle(WATCHLIST_ID, movie);
    expect(library.isInList(WATCHLIST_ID, 10)).toBe(false);
  });

  it('marcar "Já vi" tira de "Quero ver"', () => {
    library.toggle(WATCHLIST_ID, movie);
    library.toggle(WATCHED_ID, movie);
    expect(library.isInList(WATCHED_ID, 10)).toBe(true);
    expect(library.isInList(WATCHLIST_ID, 10)).toBe(false);
  });

  it('salva no localStorage', () => {
    library.toggle(WATCHLIST_ID, movie);
    expect(localStorage.getItem('tracker:library')).toContain('"id":10');
  });

  it('listas do sistema não podem ser apagadas', () => {
    const id = library.createList('Maratona');
    library.deleteList(WATCHLIST_ID);
    library.deleteList(id);
    expect(library.getState().lists.map((l) => l.id)).toEqual([WATCHLIST_ID, WATCHED_ID]);
  });

  it('agenda fica em ordem cronológica', () => {
    const base = { movieId: 1, title: 'X', posterPath: null, runtime: 100, cinema: '', notes: '' };
    library.addToAgenda({ ...base, date: '2026-12-01', time: '20:00' });
    library.addToAgenda({ ...base, date: '2026-11-01', time: '18:00' });
    expect(library.getState().agenda.map((e) => e.date)).toEqual(['2026-11-01', '2026-12-01']);
  });
});
