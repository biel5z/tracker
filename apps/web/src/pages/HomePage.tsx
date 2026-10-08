import type { MovieSummary } from '@tracker/shared';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { MovieRow } from '../components/MovieRow.tsx';
import { PlayIcon, StarIcon } from '../components/icons.tsx';
import { TrailerModal } from '../components/TrailerModal.tsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';
import { formatDate, formatRating, releaseLabel, yearOf } from '../lib/format.ts';
import { queries } from '../lib/queries.ts';
import { tmdbImage } from '../lib/tmdbImage.ts';

/** Mesmos filtros padrão da página de Estreias → as duas telas compartilham o cache. */
export const DEFAULT_UPCOMING = { days: 90, sort: 'data' as const };

function Hero({ movie }: { movie: MovieSummary }) {
  const [trailerOpen, setTrailerOpen] = useState(false);
  // O detalhe traz o trailer. Como o card também faz prefetch, muitas vezes já está no cache.
  const detail = useQuery(queries.movie(movie.id));
  const backdrop = tmdbImage(movie.backdropPath, 'w1280');
  const countdown = releaseLabel(movie.releaseDate);

  return (
    <section className="relative isolate overflow-hidden">
      {backdrop ? (
        <img src={backdrop} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-50" />
      ) : (
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_rgb(245_184_61_/_0.25),_transparent_60%)]" />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/70 to-ink/20" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/90 via-ink/40 to-transparent" />

      <div className="mx-auto flex min-h-[26rem] max-w-7xl flex-col justify-end gap-4 px-4 pt-24 pb-12 sm:min-h-[32rem]">
        <p className="text-sm font-semibold tracking-widest text-accent uppercase">{countdown ?? 'Em alta esta semana'}</p>
        <h1 className="max-w-3xl text-4xl leading-none font-extrabold tracking-tight sm:text-6xl">{movie.title}</h1>
        <p className="flex flex-wrap items-center gap-3 text-sm text-soft">
          {movie.voteCount > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold text-white">
              <StarIcon size={14} className="text-accent" /> {formatRating(movie.voteAverage)}
            </span>
          )}
          <span>{countdown ? formatDate(movie.releaseDate) : yearOf(movie.releaseDate)}</span>
        </p>
        {movie.overview && <p className="line-clamp-3 max-w-2xl text-soft">{movie.overview}</p>}
        <div className="flex flex-wrap gap-3 pt-2">
          {detail.data?.trailer && (
            <button type="button" className="btn-primary" onClick={() => setTrailerOpen(true)}>
              <PlayIcon size={16} /> Ver trailer
            </button>
          )}
          <Link to={`/filme/${movie.id}`} className="btn-ghost">
            Detalhes
          </Link>
        </div>
      </div>
      <TrailerModal video={detail.data?.trailer ?? null} open={trailerOpen} onClose={() => setTrailerOpen(false)} />
    </section>
  );
}

function HeroSkeleton() {
  return (
    <div className="mx-auto flex min-h-[26rem] max-w-7xl flex-col justify-end gap-4 px-4 pt-24 pb-12 sm:min-h-[32rem]" aria-hidden="true">
      <div className="skeleton h-4 w-40" />
      <div className="skeleton h-14 w-2/3 max-w-xl" />
      <div className="skeleton h-4 w-full max-w-2xl" />
      <div className="skeleton h-4 w-3/4 max-w-xl" />
    </div>
  );
}

export function HomePage() {
  useDocumentTitle(undefined);

  // Três consultas independentes e em paralelo: cada seção mostra o próprio skeleton.
  const upcoming = useInfiniteQuery(queries.upcoming(DEFAULT_UPCOMING));
  const nowPlaying = useQuery(queries.nowPlaying());
  const trending = useQuery(queries.trending());

  const upcomingMovies = upcoming.data?.pages[0]?.results;
  const featured = trending.data?.results.find((m) => m.backdropPath) ?? trending.data?.results[0];

  return (
    <div>
      {featured ? <Hero movie={featured} /> : <HeroSkeleton />}

      <div className="mx-auto max-w-7xl space-y-14 px-4">
        <MovieRow
          title="Estreias nos cinemas"
          description="O que chega às salas do Brasil nas próximas semanas"
          link={{ to: '/estreias', label: 'Ver todas' }}
          movies={upcomingMovies}
          isPending={upcoming.isPending}
          error={upcoming.error}
          onRetry={() => void upcoming.refetch()}
          showRelease
        />
        <MovieRow
          title="Em cartaz"
          description="Estrearam recentemente"
          movies={nowPlaying.data?.results}
          isPending={nowPlaying.isPending}
          error={nowPlaying.error}
          onRetry={() => void nowPlaying.refetch()}
        />
        <MovieRow
          title="Em alta na semana"
          link={{ to: '/catalogo', label: 'Explorar catálogo' }}
          movies={trending.data?.results}
          isPending={trending.isPending}
          error={trending.error}
          onRetry={() => void trending.refetch()}
        />
      </div>
    </div>
  );
}
