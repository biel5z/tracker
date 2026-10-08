import type { MovieSummary } from '@tracker/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { cn } from '../lib/cn.ts';
import { formatRating, formatShortDate, releaseLabel, yearOf } from '../lib/format.ts';
import { library, useLibrary, WATCHLIST_ID } from '../lib/library.ts';
import { queries } from '../lib/queries.ts';
import { BookmarkIcon, StarIcon } from './icons.tsx';
import { Poster } from './Poster.tsx';

interface MovieCardProps {
  movie: MovieSummary;
  /** Mostra a data de estreia em vez do ano (feeds de estreias). */
  showRelease?: boolean;
  /** Texto extra abaixo do título (ex.: personagem na página do ator). */
  subtitle?: string;
  priority?: boolean;
}

export function MovieCard({ movie, showRelease, subtitle, priority }: MovieCardProps) {
  const queryClient = useQueryClient();
  const lib = useLibrary();
  const inWatchlist = lib.lists.find((l) => l.id === WATCHLIST_ID)?.movies.some((m) => m.id === movie.id) ?? false;
  const countdown = showRelease ? releaseLabel(movie.releaseDate) : null;

  // Prefetch: ao passar o mouse, já busca o detalhe. O clique abre instantâneo, vindo do cache.
  const prefetch = () => void queryClient.prefetchQuery(queries.movie(movie.id));

  return (
    <article className="group relative">
      <Link to={`/filme/${movie.id}`} onMouseEnter={prefetch} onFocus={prefetch} className="block rounded-xl">
        <div className="relative">
          <Poster
            path={movie.posterPath}
            title={movie.title}
            priority={priority}
            className="ring-1 ring-white/5 transition duration-300 group-hover:-translate-y-1 group-hover:ring-accent/60"
          />
          {countdown && (
            <span className="absolute bottom-2 left-2 rounded-full bg-ink/85 px-2 py-0.5 text-xs font-semibold text-accent backdrop-blur">
              {countdown}
            </span>
          )}
          {!countdown && movie.voteCount > 0 && (
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-ink/85 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur">
              <StarIcon size={12} className="text-accent" />
              {formatRating(movie.voteAverage)}
            </span>
          )}
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm leading-snug font-semibold text-white">{movie.title}</h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted">
          {showRelease ? formatShortDate(movie.releaseDate) : yearOf(movie.releaseDate)}
          {subtitle ? ` · ${subtitle}` : ''}
        </p>
      </Link>

      {/* Fica fora do <Link> porque botão dentro de link é HTML inválido. */}
      <button
        type="button"
        onClick={() => library.toggle(WATCHLIST_ID, movie)}
        aria-pressed={inWatchlist}
        aria-label={inWatchlist ? `Tirar ${movie.title} de Quero ver` : `Adicionar ${movie.title} a Quero ver`}
        title={inWatchlist ? 'Na lista Quero ver' : 'Quero ver'}
        className={cn(
          'absolute top-2 right-2 rounded-full p-1.5 backdrop-blur transition',
          inWatchlist
            ? 'bg-accent text-ink'
            : 'bg-ink/70 text-white opacity-100 hover:bg-ink sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100',
        )}
      >
        <BookmarkIcon size={16} filled={inWatchlist} />
      </button>
    </article>
  );
}

/** Silhueta do card: mesmas proporções do card real, para nada pular quando o conteúdo chega. */
export function MovieCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skeleton aspect-[2/3] rounded-xl" />
      <div className="skeleton mt-2 h-4 w-4/5" />
      <div className="skeleton mt-1.5 h-3 w-2/5" />
    </div>
  );
}
