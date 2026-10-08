import type { MovieSummary } from '@tracker/shared';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn.ts';
import { MovieCard, MovieCardSkeleton } from './MovieCard.tsx';

export const gridClass = 'grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';

export function MovieGrid({
  movies,
  showRelease,
  subtitleOf,
  className,
}: {
  movies: MovieSummary[];
  showRelease?: boolean;
  subtitleOf?: (movie: MovieSummary) => string | undefined;
  className?: string;
}) {
  return (
    <div className={cn(gridClass, className)}>
      {movies.map((movie, index) => (
        <MovieCard key={movie.id} movie={movie} showRelease={showRelease} subtitle={subtitleOf?.(movie)} priority={index < 6} />
      ))}
    </div>
  );
}

export function MovieGridSkeleton({ count = 12, children }: { count?: number; children?: ReactNode }) {
  return (
    <div className={gridClass} aria-busy="true" aria-label="Carregando filmes">
      {Array.from({ length: count }, (_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
      {children}
    </div>
  );
}
