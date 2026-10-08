import { useSyncExternalStore } from 'react';

/**
 * "Minha biblioteca": listas de filmes e agenda de cinema, salvas no localStorage.
 *
 * Padrão usado: um store externo simples + `useSyncExternalStore` do React.
 * Qualquer componente que use `useLibrary()` re-renderiza quando o store muda —
 * inclusive em outras abas (evento "storage").
 *
 * Decisão de projeto: sem banco de dados. As listas são pessoais e ficam neste navegador.
 */

export interface MovieSnapshot {
  id: number;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  addedAt: string;
}

export interface MovieList {
  id: string;
  name: string;
  /** Listas fixas do sistema não podem ser apagadas nem renomeadas. */
  system?: 'watchlist' | 'watched';
  movies: MovieSnapshot[];
}

export interface AgendaEntry {
  id: string;
  movieId: number;
  title: string;
  posterPath: string | null;
  runtime: number | null;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm */
  time: string;
  cinema: string;
  notes: string;
}

export interface LibraryState {
  version: 1;
  lists: MovieList[];
  agenda: AgendaEntry[];
}

const STORAGE_KEY = 'tracker:library';

export const WATCHLIST_ID = 'quero-ver';
export const WATCHED_ID = 'ja-vi';

export function emptyLibrary(): LibraryState {
  return {
    version: 1,
    lists: [
      { id: WATCHLIST_ID, name: 'Quero ver', system: 'watchlist', movies: [] },
      { id: WATCHED_ID, name: 'Já vi', system: 'watched', movies: [] },
    ],
    agenda: [],
  };
}

function safeRead(): LibraryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyLibrary();
    const parsed = JSON.parse(raw) as LibraryState;
    if (parsed?.version !== 1 || !Array.isArray(parsed.lists)) return emptyLibrary();
    // Garante que as listas do sistema existem, mesmo em dados antigos.
    const base = emptyLibrary();
    for (const sys of base.lists) {
      if (!parsed.lists.some((l) => l.id === sys.id)) parsed.lists.unshift(sys);
    }
    return { ...parsed, agenda: parsed.agenda ?? [] };
  } catch {
    return emptyLibrary();
  }
}

let state: LibraryState = typeof window === 'undefined' ? emptyLibrary() : safeRead();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function commit(next: LibraryState) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Modo anônimo/armazenamento cheio: segue funcionando só em memória.
  }
  emit();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      state = safeRead();
      emit();
    }
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLibrary(): LibraryState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now() + Math.random());

type MovieLike = Pick<MovieSnapshot, 'id' | 'title' | 'posterPath' | 'releaseDate'>;

const snapshot = (m: MovieLike): MovieSnapshot => ({
  id: m.id,
  title: m.title,
  posterPath: m.posterPath,
  releaseDate: m.releaseDate,
  addedAt: new Date().toISOString(),
});

/** Ações que alteram a biblioteca. Cada uma cria um novo objeto (imutabilidade) e salva. */
export const library = {
  getState: () => state,

  isInList: (listId: string, movieId: number) =>
    state.lists.find((l) => l.id === listId)?.movies.some((m) => m.id === movieId) ?? false,

  toggle(listId: string, movie: MovieLike) {
    commit({
      ...state,
      lists: state.lists.map((list) => {
        if (list.id !== listId) {
          // Marcar "Já vi" tira o filme de "Quero ver".
          if (listId === WATCHED_ID && list.id === WATCHLIST_ID && !library.isInList(WATCHED_ID, movie.id)) {
            return { ...list, movies: list.movies.filter((m) => m.id !== movie.id) };
          }
          return list;
        }
        const has = list.movies.some((m) => m.id === movie.id);
        return {
          ...list,
          movies: has ? list.movies.filter((m) => m.id !== movie.id) : [snapshot(movie), ...list.movies],
        };
      }),
    });
  },

  removeFromList(listId: string, movieId: number) {
    commit({
      ...state,
      lists: state.lists.map((l) => (l.id === listId ? { ...l, movies: l.movies.filter((m) => m.id !== movieId) } : l)),
    });
  },

  createList(name: string): string {
    const id = newId();
    commit({ ...state, lists: [...state.lists, { id, name: name.trim() || 'Nova lista', movies: [] }] });
    return id;
  },

  renameList(listId: string, name: string) {
    commit({
      ...state,
      lists: state.lists.map((l) => (l.id === listId && !l.system ? { ...l, name: name.trim() || l.name } : l)),
    });
  },

  deleteList(listId: string) {
    commit({ ...state, lists: state.lists.filter((l) => l.id !== listId || l.system) });
  },

  addToAgenda(entry: Omit<AgendaEntry, 'id'>): string {
    const id = newId();
    const agenda = [...state.agenda, { ...entry, id }].sort((a, b) =>
      `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`),
    );
    commit({ ...state, agenda });
    return id;
  },

  removeFromAgenda(entryId: string) {
    commit({ ...state, agenda: state.agenda.filter((e) => e.id !== entryId) });
  },

  /** Usado nos testes. */
  reset(next: LibraryState = emptyLibrary()) {
    commit(next);
  },
};
