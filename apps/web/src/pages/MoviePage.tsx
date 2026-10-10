import type { MovieDetail, WatchProvider } from '@tracker/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Avatar } from '../components/Avatar.tsx';
import { ClockIcon, PlayIcon, StarIcon } from '../components/icons.tsx';
import { LibraryButtons } from '../components/LibraryButtons.tsx';
import { MovieRow } from '../components/MovieRow.tsx';
import { Poster } from '../components/Poster.tsx';
import { EmptyState, ErrorState } from '../components/States.tsx';
import { TrailerModal } from '../components/TrailerModal.tsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';
import { useDragScroll } from '../hooks/useDragScroll.ts';
import { ApiRequestError } from '../lib/api.ts';
import { daysUntil, formatDate, formatRating, formatRuntime, releaseLabel, yearOf } from '../lib/format.ts';
import { queries } from '../lib/queries.ts';
import { tmdbImage } from '../lib/tmdbImage.ts';

export function MoviePage() {
  const id = Number(useParams().id);
  const { data: movie, isPending, isError, error, refetch } = useQuery({ ...queries.movie(id), enabled: Number.isInteger(id) && id > 0 });
  useDocumentTitle(movie?.title);

  if (isError) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return (
        <div className="mx-auto max-w-3xl px-4 pt-16">
          <EmptyState title="Filme não encontrado" action={<Link to="/catalogo" className="btn-primary">Ir para o catálogo</Link>}>
            Ele pode ter sido removido do TMDB ou o link está errado.
          </EmptyState>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-3xl px-4 pt-16">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  if (isPending || !movie) return <MovieSkeleton />;
  return <MovieView movie={movie} />;
}

function MovieView({ movie }: { movie: MovieDetail }) {
  const [trailerOpen, setTrailerOpen] = useState(false);
  const backdrop = tmdbImage(movie.backdropPath, 'w1280');
  const brDate = movie.brReleaseDate ?? movie.releaseDate;
  const upcoming = brDate ? daysUntil(brDate) >= 0 : false;
  const runtime = formatRuntime(movie.runtime);

  return (
    <article>
      {/* Faixa de fundo com a imagem de cena do filme */}
      <div className="relative isolate h-64 overflow-hidden sm:h-96">
        {backdrop ? (
          <img src={backdrop} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60" />
        ) : (
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgb(245_184_61_/_0.18),_transparent_65%)]" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/50 to-transparent" />
      </div>

      <div className="relative mx-auto -mt-40 max-w-7xl px-4 sm:-mt-56">
        <div className="grid gap-8 md:grid-cols-[16rem_1fr]">
          <Poster path={movie.posterPath} title={movie.title} priority className="mx-auto w-48 shadow-2xl ring-1 ring-white/10 md:w-64" sizes="256px" />

          <div className="space-y-5 md:pt-24">
            <div className="space-y-2">
              <h1 className="text-3xl leading-tight font-extrabold tracking-tight sm:text-5xl">
                {movie.title} <span className="font-sans text-2xl font-normal text-muted sm:text-3xl">({yearOf(movie.releaseDate)})</span>
              </h1>
              {movie.originalTitle && movie.originalTitle !== movie.title && <p className="text-sm text-muted">Título original: {movie.originalTitle}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {movie.brCertification && (
                <span className="rounded border border-soft/40 px-1.5 py-0.5 text-xs font-bold text-white" title="Classificação indicativa">
                  {movie.brCertification}
                </span>
              )}
              {movie.voteCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <StarIcon size={16} className="text-accent" />
                  <strong className="text-white">{formatRating(movie.voteAverage)}</strong>
                  <span className="text-muted">({movie.voteCount.toLocaleString('pt-BR')} votos)</span>
                </span>
              )}
              {runtime && (
                <span className="inline-flex items-center gap-1 text-soft">
                  <ClockIcon size={15} /> {runtime}
                </span>
              )}
              <span className="flex flex-wrap gap-1.5">
                {movie.genres.map((g) => (
                  <Link key={g.id} to={`/catalogo?genero=${g.id}`} className="chip py-0.5 text-xs">
                    {g.name}
                  </Link>
                ))}
              </span>
            </div>

            <div className={upcoming ? 'inline-block rounded-xl border border-accent/40 bg-accent/10 px-4 py-2.5' : ''}>
              <p className={upcoming ? 'font-semibold text-accent' : 'text-sm text-soft'}>
                {upcoming ? `Estreia nos cinemas em ${formatDate(brDate)}` : brDate ? `Lançado no Brasil em ${formatDate(brDate)}` : 'Data de lançamento a confirmar'}
                {upcoming && brDate && <span className="ml-2 text-sm font-normal text-soft">· {releaseLabel(brDate)}</span>}
              </p>
            </div>

            {movie.tagline && <p className="text-lg text-soft italic">“{movie.tagline}”</p>}
            <p className="max-w-3xl leading-relaxed text-soft">{movie.overview || 'Sinopse ainda não disponível em português.'}</p>

            {movie.directors.length > 0 && (
              <p className="text-sm text-muted">
                Direção:{' '}
                {movie.directors.map((d, i) => (
                  <span key={d.id}>
                    {i > 0 && ', '}
                    <Link to={`/pessoa/${d.id}`} className="font-semibold text-white hover:text-accent">
                      {d.name}
                    </Link>
                  </span>
                ))}
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {movie.trailer ? (
                <button type="button" className="btn-primary" onClick={() => setTrailerOpen(true)}>
                  <PlayIcon size={16} /> Ver trailer
                </button>
              ) : (
                <span className="btn-ghost cursor-default opacity-60">Trailer indisponível</span>
              )}
              <LibraryButtons movie={movie} />
            </div>
          </div>
        </div>

        <div className="mt-14 space-y-14">
          <CastSection movie={movie} />
          <ProvidersSection movie={movie} />
          {movie.similar.length > 0 && (
            <MovieRow title="Filmes parecidos" movies={movie.similar} isPending={false} error={null} />
          )}
        </div>
      </div>

      <TrailerModal video={movie.trailer} open={trailerOpen} onClose={() => setTrailerOpen(false)} />
    </article>
  );
}

function CastSection({ movie }: { movie: MovieDetail }) {
  const dragRef = useDragScroll<HTMLUListElement>();
  if (movie.cast.length === 0) return null;
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold sm:text-2xl">Elenco</h2>
      <ul ref={dragRef} className="scroll-row drag-scroll -mx-4 px-4">
        {movie.cast.map((person) => (
          <li key={`${person.id}-${person.order}`} className="w-28 shrink-0 snap-start sm:w-32">
            <Link to={`/pessoa/${person.id}`} className="group block">
              <Avatar path={person.profilePath} name={person.name} className="ring-1 ring-white/5 transition group-hover:ring-accent/60" />
              <p className="mt-2 line-clamp-2 text-sm leading-snug font-semibold text-white group-hover:text-accent">{person.name}</p>
              {person.character && <p className="line-clamp-2 text-xs text-muted">{person.character}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProviderList({ title, providers }: { title: string; providers: WatchProvider[] }) {
  if (providers.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="font-sans text-sm font-semibold text-muted">{title}</h3>
      <ul className="flex flex-wrap gap-2">
        {providers.map((p) => {
          const logo = tmdbImage(p.logoPath, 'w92');
          return (
            <li key={p.id} className="flex items-center gap-2 rounded-xl border border-line bg-surface py-1.5 pr-3 pl-1.5 text-sm text-white">
              {logo ? <img src={logo} alt="" className="h-8 w-8 rounded-lg" loading="lazy" /> : <span className="h-8 w-8 rounded-lg bg-raised" />}
              {p.name}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ProvidersSection({ movie }: { movie: MovieDetail }) {
  const wp = movie.watchProviders;
  const hasAny = wp && (wp.flatrate.length || wp.rent.length || wp.buy.length);
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold sm:text-2xl">Onde assistir</h2>
      {hasAny ? (
        <div className="space-y-4">
          <ProviderList title="Streaming" providers={wp.flatrate} />
          <ProviderList title="Alugar" providers={wp.rent} />
          <ProviderList title="Comprar" providers={wp.buy} />
          <p className="text-xs text-muted">
            Dados de disponibilidade fornecidos pela{' '}
            <a href="https://www.justwatch.com/br" target="_blank" rel="noreferrer" className="underline hover:text-white">
              JustWatch
            </a>
            {wp.link && (
              <>
                {' · '}
                <a href={wp.link} target="_blank" rel="noreferrer" className="underline hover:text-white">
                  ver todas as opções
                </a>
              </>
            )}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted">Ainda não disponível em streaming, aluguel ou compra no Brasil.</p>
      )}
    </section>
  );
}

function MovieSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando filme">
      <div className="skeleton h-64 rounded-none sm:h-96" />
      <div className="relative mx-auto -mt-40 max-w-7xl px-4 sm:-mt-56">
        <div className="grid gap-8 md:grid-cols-[16rem_1fr]">
          <div className="skeleton mx-auto aspect-[2/3] w-48 rounded-xl md:w-64" />
          <div className="space-y-4 md:pt-24">
            <div className="skeleton h-12 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-10 w-72 rounded-xl" />
            <div className="space-y-2 pt-2">
              <div className="skeleton h-4 w-full max-w-3xl" />
              <div className="skeleton h-4 w-full max-w-3xl" />
              <div className="skeleton h-4 w-2/3 max-w-2xl" />
            </div>
            <div className="flex gap-2 pt-2">
              <div className="skeleton h-9 w-32 rounded-full" />
              <div className="skeleton h-9 w-32 rounded-full" />
              <div className="skeleton h-9 w-32 rounded-full" />
            </div>
          </div>
        </div>
        <div className="mt-14 space-y-4">
          <div className="skeleton h-7 w-32" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="w-28 shrink-0 sm:w-32">
                <div className="skeleton aspect-[2/3] rounded-xl" />
                <div className="skeleton mt-2 h-4 w-4/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
