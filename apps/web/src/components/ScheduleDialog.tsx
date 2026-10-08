import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { todayIso } from '../lib/format.ts';
import { buildIcs, downloadIcs } from '../lib/ics.ts';
import { library } from '../lib/library.ts';
import { Dialog } from './Dialog.tsx';
import { CheckIcon, DownloadIcon } from './icons.tsx';

interface ScheduleMovie {
  id: number;
  title: string;
  posterPath: string | null;
  runtime: number | null;
  /** Data de estreia (usada como sugestão de data). */
  releaseDate: string | null;
}

export function ScheduleDialog({ movie, open, onClose }: { movie: ScheduleMovie; open: boolean; onClose: () => void }) {
  const today = todayIso();
  const suggested = movie.releaseDate && movie.releaseDate > today ? movie.releaseDate : today;
  const [date, setDate] = useState(suggested);
  const [time, setTime] = useState('19:30');
  const [cinema, setCinema] = useState('');
  const [notes, setNotes] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);

  const close = () => {
    setSavedId(null);
    onClose();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const id = library.addToAgenda({
      movieId: movie.id,
      title: movie.title,
      posterPath: movie.posterPath,
      runtime: movie.runtime,
      date,
      time,
      cinema: cinema.trim(),
      notes: notes.trim(),
    });
    setSavedId(id);
  };

  const exportIcs = () => {
    const ics = buildIcs([
      {
        uid: savedId ?? String(movie.id),
        title: `Cinema: ${movie.title}`,
        date,
        time,
        durationMinutes: (movie.runtime ?? 120) + 20,
        location: cinema || undefined,
        description: notes || undefined,
        url: `${window.location.origin}/filme/${movie.id}`,
      },
    ]);
    downloadIcs(`cinema-${movie.id}-${date}.ics`, ics);
  };

  return (
    <Dialog open={open} onClose={close} title={`Agendar ${movie.title}`}>
      <div className="p-6">
        <h2 className="pr-8 text-xl font-bold">Agendar ida ao cinema</h2>
        <p className="mt-1 text-sm text-muted">{movie.title}</p>

        {savedId ? (
          <div className="mt-6 space-y-4">
            <p className="flex items-center gap-2 font-semibold text-success">
              <CheckIcon /> Adicionado à sua agenda.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-ghost" onClick={exportIcs}>
                <DownloadIcon size={16} /> Baixar para o calendário (.ics)
              </button>
              <Link to="/agenda" className="btn-primary" onClick={close}>
                Ver agenda
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              Data
              <input type="date" required className="field" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="grid gap-1.5 text-sm">
              Horário
              <input type="time" required className="field" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
            <label className="grid gap-1.5 text-sm sm:col-span-2">
              Cinema (opcional)
              <input className="field" placeholder="Ex.: Cinemark Shopping Eldorado" value={cinema} onChange={(e) => setCinema(e.target.value)} />
            </label>
            <label className="grid gap-1.5 text-sm sm:col-span-2">
              Observações (opcional)
              <textarea className="field min-h-20" placeholder="Com quem, sala IMAX, comprar ingresso antes…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="btn-ghost" onClick={close}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                Salvar na agenda
              </button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
}
