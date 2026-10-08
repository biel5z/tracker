import type { CatalogSort, DiscoverFilters } from '@tracker/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { MovieGrid, MovieGridSkeleton } from '../components/MovieGrid.tsx';
import { Pagination } from '../components/Pagination.tsx';
import { EmptyState, ErrorState, PageHeader } from '../components/States.tsx';
import { SearchIcon, XIcon } from '../components/icons.tsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.ts';
import { useDelayedFlag } from '../hooks/useDelayedFlag.ts';
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';
import { cn } from '../lib/cn.ts';
import { queries } from '../lib/queries.ts';

const SORTS: Array<{ value: CatalogSort; label: string }> = [
  { value: 'popularidade', label: 'Mais populares' },
  { value: 'nota', label: 'Melhor avaliados' },
  { value: 'lancamento', label: 'Lançamento mais recente' },
  { value: 'titulo', label: 'Título (A–Z)' },
];

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR + 2 - 1950 }, (_, i) => THIS_YEAR + 1 - i);

/** Lê os filtros da URL. A URL é a "fonte da verdade": dá para compartilhar o link e o Voltar funciona. */
function readFilters(params: URLSearchParams): DiscoverFilters {
  const num = (key: string) => {
    const value = Number(params.get(key));
    return Number.isFinite(value) && value > 0 ? value : undefined;
  };
  const sort = params.get('ordem') as CatalogSort | null;
  return {
    query: params.get('q') ?? undefined,
    genre: num('genero'),
    year: num('ano'),
    minRating: num('nota'),
    sort: sort && SORTS.some((s) => s.value === sort) ? sort : undefined,
    page: num('pagina') ?? 1,
  };
}

/**
 * Catálogo com PAGINAÇÃO NUMERADA e FILTROS DINÂMICOS.
 *
 * Fluxo: muda um filtro → muda a URL → os filtros entram na queryKey → o TanStack Query busca sozinho.
 */
export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const q = filters.query ?? '';
  useDocumentTitle(q ? `Busca: ${q}` : 'Catálogo');

  // --- Busca por texto com debounce ---
  const [text, setText] = useState(q);
  const debounced = useDebouncedValue(text, 350);
  const debouncedRef = useRef(debounced);
  debouncedRef.current = debounced;

  // Texto digitado (já "assentado") → URL. replace: true para não lotar o histórico a cada tecla.
  useEffect(() => {
    const value = debounced.trim();
    if (value === (params.get('q') ?? '')) return;
    const next = new URLSearchParams(params);
    if (value) next.set('q', value);
    else next.delete('q');
    next.delete('pagina'); // filtro novo → volta para a página 1
    setParams(next, { replace: true });
  }, [debounced]);

  // URL mudou por fora (busca do cabeçalho, botão Voltar) → atualiza o campo.
  useEffect(() => {
    if (q !== debouncedRef.current.trim()) setText(q);
  }, [q]);

  const { data, isPending, isError, error, refetch, isPlaceholderData, isFetching } = useQuery(queries.discover(filters));
  const showSkeleton = useDelayedFlag(isPending, 150);
  const searching = Boolean(q);

  const update = (changes: Record<string, string | undefined>, options: { keepPage?: boolean; push?: boolean } = {}) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === '') next.delete(key);
      else next.set(key, value);
    }
    if (!options.keepPage) next.delete('pagina');
    setParams(next, { replace: !options.push });
  };

  const goToPage = (page: number) => {
    update({ pagina: page > 1 ? String(page) : undefined }, { keepPage: true, push: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasFilters = Boolean(q || filters.genre || filters.year || filters.minRating || filters.sort);
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pt-10">
      <PageHeader title={searching ? `Resultados para “${q}”` : 'Catálogo'}>
        {data && !isPending && <>{data.totalResults.toLocaleString('pt-BR')} filmes encontrados.</>}
      </PageHeader>

      <div className="space-y-3 rounded-2xl border border-line bg-surface/60 p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
          <label className="relative">
            <span className="sr-only">Buscar por título</span>
            <SearchIcon size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Buscar por título…"
              className="field w-full pl-9"
            />
          </label>

          <FilterSelect label="Gênero" disabled={searching} value={filters.genre ? String(filters.genre) : ''} onChange={(v) => update({ genero: v })}>
            <option value="">Todos os gêneros</option>
            <GenreOptions />
          </FilterSelect>

          <FilterSelect label="Ano" value={filters.year ? String(filters.year) : ''} onChange={(v) => update({ ano: v })}>
            <option value="">Qualquer ano</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect label="Nota mínima" disabled={searching} value={filters.minRating ? String(filters.minRating) : ''} onChange={(v) => update({ nota: v })}>
            <option value="">Qualquer nota</option>
            <option value="6">6+</option>
            <option value="7">7+</option>
            <option value="8">8+</option>
          </FilterSelect>

          <FilterSelect label="Ordenar" disabled={searching} value={filters.sort ?? 'popularidade'} onChange={(v) => update({ ordem: v === 'popularidade' ? undefined : v })}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </FilterSelect>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <p>
            {searching
              ? 'Com texto digitado, o TMDB só permite filtrar por ano. Apague a busca para usar gênero, nota e ordenação.'
              : 'Filtros ficam salvos no link — copie a URL para compartilhar esta busca.'}
          </p>
          {hasFilters && (
            <button
              type="button"
              className="inline-flex items-center gap-1 font-semibold text-accent hover:text-accent-strong"
              onClick={() => {
                setText('');
                setParams(new URLSearchParams(), { replace: true });
              }}
            >
              <XIcon size={14} /> Limpar filtros
            </button>
          )}
        </div>
      </div>

      {isPending ? (
        showSkeleton ? <MovieGridSkeleton count={18} /> : null
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.results.length === 0 ? (
        <EmptyState title="Nenhum filme encontrado">Tente outro termo ou remova alguns filtros.</EmptyState>
      ) : (
        <div className="relative space-y-10">
          {/* Durante a troca de filtro/página a lista anterior fica visível, só que apagada. */}
          <div className={cn('transition-opacity', isPlaceholderData && isFetching && 'pointer-events-none opacity-40')} aria-busy={isPlaceholderData && isFetching}>
            <MovieGrid movies={data.results} />
          </div>
          <Pagination page={Math.min(filters.page ?? 1, totalPages)} totalPages={totalPages} onChange={goToPage} />
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="grid">
      <span className="sr-only">{label}</span>
      <select className="field w-full" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value || undefined)} aria-label={label}>
        {children}
      </select>
    </label>
  );
}

function GenreOptions() {
  const genres = useQuery(queries.genres());
  return (
    <>
      {genres.data?.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
    </>
  );
}
