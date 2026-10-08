import { useQuery } from '@tanstack/react-query';
import { cn } from '../lib/cn.ts';
import { queries } from '../lib/queries.ts';

/** Chips de gênero. `value` undefined = "Todos". */
export function GenreChips({ value, onChange }: { value: number | undefined; onChange: (genre: number | undefined) => void }) {
  const genres = useQuery(queries.genres());

  if (genres.isPending) {
    return (
      <div className="scroll-row" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="skeleton h-8 w-24 shrink-0 rounded-full" />
        ))}
      </div>
    );
  }
  if (genres.isError) return null;

  return (
    <div className="scroll-row -mx-4 px-4" role="group" aria-label="Filtrar por gênero">
      <button type="button" className={cn('chip shrink-0', value === undefined && 'chip-active')} aria-pressed={value === undefined} onClick={() => onChange(undefined)}>
        Todos
      </button>
      {genres.data.map((g) => (
        <button
          key={g.id}
          type="button"
          aria-pressed={value === g.id}
          className={cn('chip shrink-0', value === g.id && 'chip-active')}
          onClick={() => onChange(value === g.id ? undefined : g.id)}
        >
          {g.name}
        </button>
      ))}
    </div>
  );
}
