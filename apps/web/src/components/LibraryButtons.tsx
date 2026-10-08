import type { MovieDetail } from '@tracker/shared';
import { useState, type FormEvent } from 'react';
import { cn } from '../lib/cn.ts';
import { todayIso } from '../lib/format.ts';
import { library, useLibrary, WATCHED_ID, WATCHLIST_ID } from '../lib/library.ts';
import { BookmarkIcon, CalendarIcon, CheckIcon, EyeIcon, ListIcon, PlusIcon } from './icons.tsx';
import { ScheduleDialog } from './ScheduleDialog.tsx';

/** Botões "Quero ver", "Já vi", "Listas" e "Agendar" da página do filme. */
export function LibraryButtons({ movie }: { movie: MovieDetail }) {
  const lib = useLibrary();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [newList, setNewList] = useState('');

  const has = (listId: string) => lib.lists.find((l) => l.id === listId)?.movies.some((m) => m.id === movie.id) ?? false;
  const customLists = lib.lists.filter((l) => !l.system);
  const inWatchlist = has(WATCHLIST_ID);
  const watched = has(WATCHED_ID);
  const scheduled = lib.agenda.some((e) => e.movieId === movie.id && e.date >= todayIso());

  const createList = (event: FormEvent) => {
    event.preventDefault();
    if (!newList.trim()) return;
    const id = library.createList(newList);
    library.toggle(id, movie);
    setNewList('');
  };

  return (
    <>
      <button type="button" aria-pressed={inWatchlist} onClick={() => library.toggle(WATCHLIST_ID, movie)} className={cn('btn-ghost', inWatchlist && 'btn-active')}>
        <BookmarkIcon size={16} filled={inWatchlist} />
        {inWatchlist ? 'Na lista Quero ver' : 'Quero ver'}
      </button>

      <button type="button" aria-pressed={watched} onClick={() => library.toggle(WATCHED_ID, movie)} className={cn('btn-ghost', watched && 'btn-active')}>
        {watched ? <CheckIcon size={16} /> : <EyeIcon size={16} />}
        {watched ? 'Já vi' : 'Marcar como visto'}
      </button>

      {/* <details> faz um menu suspenso sem JavaScript extra. */}
      <details className="group relative">
        <summary className="btn-ghost cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <ListIcon size={16} /> Listas
        </summary>
        <div className="absolute left-0 z-20 mt-2 w-72 space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-2xl">
          {customLists.length === 0 && <p className="text-sm text-muted">Você ainda não criou listas próprias.</p>}
          {customLists.map((list) => (
            <label key={list.id} className="flex cursor-pointer items-center gap-2 text-sm text-white">
              <input type="checkbox" className="accent-[var(--color-accent)]" checked={has(list.id)} onChange={() => library.toggle(list.id, movie)} />
              {list.name}
              <span className="ml-auto text-xs text-muted">{list.movies.length}</span>
            </label>
          ))}
          <form onSubmit={createList} className="flex gap-2 border-t border-line pt-3">
            <input className="field min-w-0 flex-1" placeholder="Nova lista" value={newList} onChange={(e) => setNewList(e.target.value)} aria-label="Nome da nova lista" />
            <button type="submit" className="btn-primary px-3" aria-label="Criar lista">
              <PlusIcon size={16} />
            </button>
          </form>
        </div>
      </details>

      <button type="button" onClick={() => setScheduleOpen(true)} className={cn('btn-ghost', scheduled && 'btn-active')}>
        <CalendarIcon size={16} />
        {scheduled ? 'Agendado' : 'Agendar cinema'}
      </button>

      <ScheduleDialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        movie={{ id: movie.id, title: movie.title, posterPath: movie.posterPath, runtime: movie.runtime, releaseDate: movie.brReleaseDate ?? movie.releaseDate }}
      />
    </>
  );
}
