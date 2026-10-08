import type { PersonDetail } from '@tracker/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Avatar } from '../components/Avatar.tsx';
import { MapPinIcon } from '../components/icons.tsx';
import { MovieGrid } from '../components/MovieGrid.tsx';
import { EmptyState, ErrorState } from '../components/States.tsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';
import { ApiRequestError } from '../lib/api.ts';
import { formatDate, parseLocalDate, todayIso } from '../lib/format.ts';
import { queries } from '../lib/queries.ts';
import { tmdbImage } from '../lib/tmdbImage.ts';

const DEPARTMENTS: Record<string, string> = {
  Acting: 'Atuação',
  Directing: 'Direção',
  Writing: 'Roteiro',
  Production: 'Produção',
  Sound: 'Som',
  Camera: 'Fotografia',
  Editing: 'Edição',
};

function ageOf(birthday: string, deathday: string | null): number {
  const end = deathday ? parseLocalDate(deathday) : new Date();
  const birth = parseLocalDate(birthday);
  let age = end.getFullYear() - birth.getFullYear();
  const beforeBirthday = end.getMonth() < birth.getMonth() || (end.getMonth() === birth.getMonth() && end.getDate() < birth.getDate());
  if (beforeBirthday) age--;
  return age;
}

export function PersonPage() {
  const id = Number(useParams().id);
  const { data: person, isPending, isError, error, refetch } = useQuery({ ...queries.person(id), enabled: id > 0 });
  useDocumentTitle(person?.name);

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-16">
        {error instanceof ApiRequestError && error.status === 404 ? (
          <EmptyState title="Pessoa não encontrada" action={<Link to="/" className="btn-primary">Voltar ao início</Link>} />
        ) : (
          <ErrorState error={error} onRetry={() => void refetch()} />
        )}
      </div>
    );
  }
  if (isPending || !person) return <PersonSkeleton />;
  return <PersonView person={person} />;
}

function PersonView({ person }: { person: PersonDetail }) {
  const [expanded, setExpanded] = useState(false);
  const longBio = person.biography.length > 700;
  const today = todayIso();

  // Separa o que ainda vai estrear do que já saiu.
  const { upcoming, past } = useMemo(() => {
    const upcomingList = person.credits.filter((c) => !c.releaseDate || c.releaseDate >= today);
    const pastList = person.credits.filter((c) => c.releaseDate && c.releaseDate < today);
    return { upcoming: upcomingList, past: pastList };
  }, [person.credits, today]);

  const characterOf = (movieId: number) => person.credits.find((c) => c.id === movieId)?.character || undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-14 px-4 pt-10">
      <div className="grid gap-8 md:grid-cols-[16rem_1fr]">
        <Avatar path={person.profilePath} name={person.name} className="mx-auto w-48 shadow-2xl ring-1 ring-white/10 md:w-64" />
        <div className="space-y-4">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">{person.name}</h1>
          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {person.knownForDepartment && (
              <div>
                <dt className="text-muted">Conhecido(a) por</dt>
                <dd className="font-semibold text-white">{DEPARTMENTS[person.knownForDepartment] ?? person.knownForDepartment}</dd>
              </div>
            )}
            {person.birthday && (
              <div>
                <dt className="text-muted">Nascimento</dt>
                <dd className="font-semibold text-white">
                  {formatDate(person.birthday)} {!person.deathday && `(${ageOf(person.birthday, null)} anos)`}
                </dd>
              </div>
            )}
            {person.deathday && person.birthday && (
              <div>
                <dt className="text-muted">Falecimento</dt>
                <dd className="font-semibold text-white">
                  {formatDate(person.deathday)} ({ageOf(person.birthday, person.deathday)} anos)
                </dd>
              </div>
            )}
            {person.placeOfBirth && (
              <div>
                <dt className="text-muted">Local</dt>
                <dd className="inline-flex items-center gap-1 font-semibold text-white">
                  <MapPinIcon size={14} /> {person.placeOfBirth}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-muted">Filmes</dt>
              <dd className="font-semibold text-white">{person.credits.length}</dd>
            </div>
          </dl>

          <div className="max-w-3xl space-y-2">
            <h2 className="font-sans text-sm font-semibold text-muted uppercase">Biografia</h2>
            {person.biography ? (
              <>
                <p className={`leading-relaxed whitespace-pre-line text-soft ${longBio && !expanded ? 'line-clamp-6' : ''}`}>{person.biography}</p>
                {longBio && (
                  <button type="button" className="text-sm font-semibold text-accent hover:text-accent-strong" onClick={() => setExpanded((v) => !v)}>
                    {expanded ? 'Mostrar menos' : 'Ler biografia completa'}
                  </button>
                )}
              </>
            ) : (
              <p className="text-soft">Ainda não há biografia cadastrada.</p>
            )}
          </div>
        </div>
      </div>

      {person.images.length > 1 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold sm:text-2xl">Fotos</h2>
          <div className="scroll-row -mx-4 px-4">
            {person.images.slice(0, 12).map((path) => (
              <img key={path} src={tmdbImage(path, 'w185') ?? ''} alt={person.name} loading="lazy" className="aspect-[2/3] w-32 shrink-0 rounded-xl object-cover" />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold sm:text-2xl">Em breve</h2>
          <MovieGrid movies={upcoming} showRelease subtitleOf={(m) => characterOf(m.id)} />
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-bold sm:text-2xl">Filmografia</h2>
        {past.length ? (
          <MovieGrid movies={past} subtitleOf={(m) => characterOf(m.id)} />
        ) : (
          <p className="text-muted">Nenhum filme lançado como ator.</p>
        )}
      </section>
    </div>
  );
}

function PersonSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10" aria-busy="true" aria-label="Carregando pessoa">
      <div className="grid gap-8 md:grid-cols-[16rem_1fr]">
        <div className="skeleton mx-auto aspect-[2/3] w-48 rounded-xl md:w-64" />
        <div className="space-y-4">
          <div className="skeleton h-12 w-2/3" />
          <div className="skeleton h-10 w-96 max-w-full" />
          <div className="skeleton h-4 w-full max-w-3xl" />
          <div className="skeleton h-4 w-full max-w-3xl" />
          <div className="skeleton h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}
