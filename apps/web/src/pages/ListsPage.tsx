import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { PlusIcon, TrashIcon, XIcon } from '../components/icons.tsx';
import { gridClass } from '../components/MovieGrid.tsx';
import { Poster } from '../components/Poster.tsx';
import { EmptyState, PageHeader } from '../components/States.tsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';
import { cn } from '../lib/cn.ts';
import { formatShortDate, releaseLabel, yearOf } from '../lib/format.ts';
import { library, useLibrary, WATCHLIST_ID } from '../lib/library.ts';

export function ListsPage() {
  useDocumentTitle('Minhas listas');
  const lib = useLibrary();
  const [params, setParams] = useSearchParams();
  const [newName, setNewName] = useState('');
  const activeId = params.get('lista') ?? WATCHLIST_ID;
  const active = lib.lists.find((l) => l.id === activeId) ?? lib.lists[0];

  const create = (event: FormEvent) => {
    event.preventDefault();
    if (!newName.trim()) return;
    const id = library.createList(newName);
    setNewName('');
    setParams({ lista: id });
  };

  const remove = () => {
    if (!active || active.system) return;
    if (window.confirm(`Apagar a lista "${active.name}"? Os filmes dela não serão afetados em outras listas.`)) {
      library.deleteList(active.id);
      setParams({});
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pt-10">
      <PageHeader title="Minhas listas">Salvas neste navegador. Use o marcador nos cards ou os botões da página do filme.</PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        {lib.lists.map((list) => (
          <button
            key={list.id}
            type="button"
            onClick={() => setParams(list.id === WATCHLIST_ID ? {} : { lista: list.id })}
            aria-pressed={active?.id === list.id}
            className={cn('chip', active?.id === list.id && 'chip-active')}
          >
            {list.name} <span className="ml-1 text-xs opacity-70">{list.movies.length}</span>
          </button>
        ))}
        <form onSubmit={create} className="flex items-center gap-2">
          <input className="field w-40 rounded-full py-1" placeholder="Nova lista" value={newName} onChange={(e) => setNewName(e.target.value)} aria-label="Nome da nova lista" />
          <button type="submit" className="btn-ghost px-2.5 py-1.5" aria-label="Criar lista">
            <PlusIcon size={16} />
          </button>
        </form>
      </div>

      {active && (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">{active.name}</h2>
            {!active.system && (
              <button type="button" onClick={remove} className="btn-ghost text-danger hover:border-danger hover:text-danger">
                <TrashIcon size={16} /> Apagar lista
              </button>
            )}
          </div>

          {active.movies.length === 0 ? (
            <EmptyState title="Lista vazia" action={<Link to="/estreias" className="btn-primary">Ver estreias</Link>}>
              Abra um filme e use os botões “Quero ver”, “Já vi” ou “Listas”.
            </EmptyState>
          ) : (
            <ul className={gridClass}>
              {active.movies.map((movie) => {
                const countdown = releaseLabel(movie.releaseDate);
                return (
                  <li key={movie.id} className="group relative">
                    <Link to={`/filme/${movie.id}`} className="block">
                      <Poster path={movie.posterPath} title={movie.title} className="ring-1 ring-white/5 transition group-hover:ring-accent/60" />
                      <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-white">{movie.title}</h3>
                      <p className="text-xs text-muted">{countdown ? `${formatShortDate(movie.releaseDate)} · ${countdown}` : yearOf(movie.releaseDate)}</p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => library.removeFromList(active.id, movie.id)}
                      aria-label={`Remover ${movie.title} de ${active.name}`}
                      className="absolute top-2 right-2 rounded-full bg-ink/80 p-1.5 text-white backdrop-blur hover:bg-danger"
                    >
                      <XIcon size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
