import { cn } from '../lib/cn.ts';
import { ChevronLeftIcon, ChevronRightIcon } from './icons.tsx';

/** Monta a lista de páginas com reticências: 1 … 4 5 [6] 7 8 … 500 */
export function pageList(page: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= total - 2) [total - 3, total - 2, total - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: Array<number | '…'> = [];
  sorted.forEach((p, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined && p - prev > 1) result.push('…');
    result.push(p);
  });
  return result;
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  const base = 'inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-semibold transition';
  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-center gap-1.5">
      <button type="button" className={cn(base, 'btn-ghost')} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Página anterior">
        <ChevronLeftIcon size={16} />
      </button>
      {pageList(page, totalPages).map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-1 text-muted">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(base, p === page ? 'bg-accent text-ink' : 'text-soft hover:bg-raised hover:text-white')}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" className={cn(base, 'btn-ghost')} disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Próxima página">
        <ChevronRightIcon size={16} />
      </button>
    </nav>
  );
}
