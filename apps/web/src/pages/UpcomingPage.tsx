import type { MovieSummary } from '@tracker/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { GenreChips } from '../components/GenreChips.tsx';
import { MovieGrid, MovieGridSkeleton } from '../components/MovieGrid.tsx';
import { EmptyState, ErrorState, PageHeader } from '../components/States.tsx';
import { useDelayedFlag } from '../hooks/useDelayedFlag.ts';
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';
import { useInView } from '../hooks/useInView.ts';
import { cn } from '../lib/cn.ts';
import { cinemaWeekStart, formatWeekRange, groupBy, weekLabel } from '../lib/format.ts';
import { queries } from '../lib/queries.ts';

const PERIODS = [
  { days: 30, label: '30 dias' },
  { days: 90, label: '3 meses' },
  { days: 180, label: '6 meses' },
];

/**
 * Feed de estreias com INFINITE SCROLL.
 *
 * - Os filtros moram na URL (?genero=27&periodo=30&ordem=popularidade).
 * - useInfiniteQuery guarda todas as páginas já carregadas em data.pages.
 * - Um elemento "sentinela" no fim da lista chama fetchNextPage() quando aparece.
 */
export function UpcomingPage() {
  useDocumentTitle('Estreias');
  const [params, setParams] = useSearchParams();

  const genre = Number(params.get('genero')) || undefined;
  const days = Number(params.get('periodo')) || 90;
  const sort = params.get('ordem') === 'popularidade' ? 'popularidade' : 'data';

  const query = useInfiniteQuery(queries.upcoming({ genre, days, sort }));
  const { data, isPending, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError } = query;

  const { ref: sentinelRef, inView } = useInView<HTMLDivElement>();
  const pagesLoaded = data?.pages.length ?? 0;
  useEffect(() => {
    // Sentinela visível + há mais páginas + não está buscando → próxima página.
    // `pagesLoaded` nas dependências: se a página chega rápido e o sentinela CONTINUA visível
    // (tela grande, poucos itens), o efeito roda de novo e busca a seguinte.
    if (inView && hasNextPage && !isFetchingNextPage && !isFetchNextPageError) void fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage, pagesLoaded]);

  // Junta as páginas e remove repetidos (a ordem pode mudar entre uma página e outra).
  const movies = useMemo(() => {
    const seen = new Set<number>();
    const list: MovieSummary[] = [];
    for (const page of data?.pages ?? []) {
      for (const movie of page.results) {
        if (!seen.has(movie.id)) {
          seen.add(movie.id);
          list.push(movie);
        }
      }
    }
    return list;
  }, [data]);

  // Ordenado por data, agrupa por semana de cinema (quinta a quarta).
  const groups = useMemo(
    () => (sort === 'data' ? groupBy(movies, (m) => (m.releaseDate ? cinemaWeekStart(m.releaseDate) : 'sem-data')) : []),
    [movies, sort],
  );
  const total = data?.pages[0]?.totalResults ?? 0;
  const showSkeleton = useDelayedFlag(isPending, 150);

  const update = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value === undefined) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pt-10">
      <PageHeader title="Estreias nos cinemas">
        {isPending ? (
          <span className="skeleton inline-block h-4 w-56 align-middle" />
        ) : (
          <>
            {total.toLocaleString('pt-BR')} {total === 1 ? 'filme estreia' : 'filmes estreiam'} no Brasil nos próximos {days} dias.
          </>
        )}
      </PageHeader>

      <div className="space-y-4">
        <GenreChips value={genre} onChange={(g) => update('genero', g ? String(g) : undefined)} />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Período:</span>
          {PERIODS.map((p) => (
            <button
              key={p.days}
              type="button"
              aria-pressed={days === p.days}
              className={cn('chip', days === p.days && 'chip-active')}
              onClick={() => update('periodo', p.days === 90 ? undefined : String(p.days))}
            >
              {p.label}
            </button>
          ))}
          <span className="ml-2 text-muted">Ordem:</span>
          <button type="button" aria-pressed={sort === 'data'} className={cn('chip', sort === 'data' && 'chip-active')} onClick={() => update('ordem', undefined)}>
            Por data
          </button>
          <button
            type="button"
            aria-pressed={sort === 'popularidade'}
            className={cn('chip', sort === 'popularidade' && 'chip-active')}
            onClick={() => update('ordem', 'popularidade')}
          >
            Mais aguardados
          </button>
        </div>
      </div>

      {isPending ? (
        showSkeleton ? (
          <div className="space-y-4">
            <div className="skeleton h-6 w-64" />
            <MovieGridSkeleton count={12} />
          </div>
        ) : null
      ) : isError && !data ? (
        // Erro na PRIMEIRA página: não há nada para mostrar.
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : movies.length === 0 ? (
        <EmptyState title="Nenhuma estreia encontrada">Tente outro gênero ou um período maior.</EmptyState>
      ) : sort === 'data' ? (
        <div className="space-y-12">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`semana-${group.key}`} className="space-y-4">
              <h2 id={`semana-${group.key}`} className="flex flex-wrap items-baseline gap-x-3 border-b border-line/60 pb-3 text-xl font-bold">
                {group.key === 'sem-data' ? 'Data a confirmar' : `Semana de ${formatWeekRange(group.key)}`}
                {group.key !== 'sem-data' && weekLabel(group.key) && <span className="text-sm font-semibold text-accent">{weekLabel(group.key)}</span>}
                <span className="text-sm font-normal text-muted">
                  {group.items.length} {group.items.length === 1 ? 'estreia' : 'estreias'}
                </span>
              </h2>
              <MovieGrid movies={group.items} showRelease />
            </section>
          ))}
        </div>
      ) : (
        <MovieGrid movies={movies} showRelease />
      )}

      {/* Rodapé do infinite scroll */}
      {data && movies.length > 0 && (
        <div className="space-y-6 pb-4">
          {isFetchingNextPage && <MovieGridSkeleton count={6} />}
          {/* Erro numa página seguinte: mantém o que já carregou e oferece tentar de novo. */}
          {isFetchNextPageError && error && <ErrorState error={error} onRetry={() => void fetchNextPage()} compact />}
          <div ref={sentinelRef} aria-hidden="true" />
          {hasNextPage && !isFetchingNextPage && !isFetchNextPageError && (
            // Alternativa acessível ao scroll automático (teclado, leitores de tela).
            <div className="flex justify-center">
              <button type="button" className="btn-ghost" onClick={() => void fetchNextPage()}>
                Carregar mais estreias
              </button>
            </div>
          )}
          {!hasNextPage && <p className="text-center text-sm text-muted">Você viu todas as estreias desse período.</p>}
        </div>
      )}
    </div>
  );
}
