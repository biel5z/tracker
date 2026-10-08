import { Link } from 'react-router';
import { CalendarIcon, ClockIcon, DownloadIcon, MapPinIcon, TrashIcon } from '../components/icons.tsx';
import { Poster } from '../components/Poster.tsx';
import { EmptyState, PageHeader } from '../components/States.tsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';
import { cn } from '../lib/cn.ts';
import { daysUntil, formatMonthYear, formatWeekday, groupBy, todayIso } from '../lib/format.ts';
import { buildIcs, downloadIcs, type IcsEvent } from '../lib/ics.ts';
import { library, useLibrary, type AgendaEntry } from '../lib/library.ts';

const toIcsEvent = (e: AgendaEntry): IcsEvent => ({
  uid: e.id,
  title: `Cinema: ${e.title}`,
  date: e.date,
  time: e.time,
  durationMinutes: (e.runtime ?? 120) + 20,
  location: e.cinema || undefined,
  description: e.notes || undefined,
  url: `${window.location.origin}/filme/${e.movieId}`,
});

function EntryCard({ entry, past }: { entry: AgendaEntry; past?: boolean }) {
  const days = daysUntil(entry.date);
  return (
    <li className={cn('flex gap-4 rounded-2xl border border-line bg-surface p-3', past && 'opacity-60')}>
      <Link to={`/filme/${entry.movieId}`} className="w-20 shrink-0">
        <Poster path={entry.posterPath} title={entry.title} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Link to={`/filme/${entry.movieId}`} className="font-display text-lg font-semibold text-white hover:text-accent">
          {entry.title}
        </Link>
        <p className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-soft">
          <span className="inline-flex items-center gap-1">
            <CalendarIcon size={14} /> {formatWeekday(entry.date)}
          </span>
          <span className="inline-flex items-center gap-1">
            <ClockIcon size={14} /> {entry.time}
          </span>
          {!past && <span className="font-semibold text-accent">{days === 0 ? 'Hoje' : days === 1 ? 'Amanhã' : `Em ${days} dias`}</span>}
        </p>
        {entry.cinema && (
          <p className="inline-flex items-center gap-1 text-sm text-muted">
            <MapPinIcon size={14} /> {entry.cinema}
          </p>
        )}
        {entry.notes && <p className="text-sm text-muted">{entry.notes}</p>}
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          {!past && (
            <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => downloadIcs(`cinema-${entry.movieId}-${entry.date}.ics`, buildIcs([toIcsEvent(entry)]))}>
              <DownloadIcon size={14} /> .ics
            </button>
          )}
          <button
            type="button"
            className="btn-ghost px-3 py-1.5 text-xs hover:border-danger hover:text-danger"
            onClick={() => library.removeFromAgenda(entry.id)}
            aria-label={`Remover ${entry.title} da agenda`}
          >
            <TrashIcon size={14} /> Remover
          </button>
        </div>
      </div>
    </li>
  );
}

export function AgendaPage() {
  useDocumentTitle('Agenda');
  const { agenda } = useLibrary();
  const today = todayIso();
  const upcoming = agenda.filter((e) => e.date >= today);
  const past = agenda.filter((e) => e.date < today).reverse();
  const months = groupBy(upcoming, (e) => e.date.slice(0, 7));

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader title="Agenda de cinema">Suas próximas sessões. Exporte para o Google Agenda, Outlook ou iPhone com o arquivo .ics.</PageHeader>
        {upcoming.length > 0 && (
          <button type="button" className="btn-primary" onClick={() => downloadIcs('agenda-cinema.ics', buildIcs(upcoming.map(toIcsEvent)))}>
            <DownloadIcon size={16} /> Exportar tudo (.ics)
          </button>
        )}
      </div>

      {upcoming.length === 0 ? (
        <EmptyState title="Nenhuma sessão marcada" action={<Link to="/estreias" className="btn-primary">Ver estreias</Link>}>
          Abra um filme e clique em “Agendar cinema”.
        </EmptyState>
      ) : (
        months.map((month) => (
          <section key={month.key} className="space-y-4">
            <h2 className="text-xl font-bold">{formatMonthYear(`${month.key}-01`)}</h2>
            <ul className="grid gap-4 md:grid-cols-2">
              {month.items.map((entry) => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </ul>
          </section>
        ))
      )}

      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-muted">Sessões passadas</h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {past.map((entry) => (
              <EntryCard key={entry.id} entry={entry} past />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
