import type { MovieSummary } from '@tracker/shared';
import { Link } from 'react-router';
import { ChevronRightIcon } from './icons.tsx';
import { MovieCard, MovieCardSkeleton } from './MovieCard.tsx';
import { ErrorState } from './States.tsx';

interface MovieRowProps {
  title: string;
  description?: string;
  link?: { to: string; label: string };
  movies: MovieSummary[] | undefined;
  isPending: boolean;
  error: Error | null;
  onRetry?: () => void;
  showRelease?: boolean;
}

/** Carrossel horizontal com skeleton próprio — cada seção da home carrega independente. */
export function MovieRow({ title, description, link, movies, isPending, error, onRetry, showRelease }: MovieRowProps) {
  return (
    <section className="space-y-4" aria-busy={isPending}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {link && (
          <Link to={link.to} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-accent hover:text-accent-strong">
            {link.label}
            <ChevronRightIcon size={16} />
          </Link>
        )}
      </div>

      {error ? (
        <ErrorState error={error} onRetry={onRetry} compact />
      ) : (
        <div className="scroll-row -mx-4 px-4">
          {isPending || !movies
            ? Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="w-36 shrink-0 sm:w-44">
                  <MovieCardSkeleton />
                </div>
              ))
            : movies.map((movie, i) => (
                <div key={movie.id} className="w-36 shrink-0 snap-start sm:w-44">
                  <MovieCard movie={movie} showRelease={showRelease} priority={i < 4} />
                </div>
              ))}
        </div>
      )}
    </section>
  );
}
