import { useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useNavigate } from 'react-router';
import { cn } from '../lib/cn.ts';
import { todayIso } from '../lib/format.ts';
import { useLibrary, WATCHLIST_ID } from '../lib/library.ts';
import { SearchIcon } from './icons.tsx';

const NAV = [
  { to: '/', label: 'Início', end: true },
  { to: '/estreias', label: 'Estreias' },
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/listas', label: 'Minhas listas' },
  { to: '/agenda', label: 'Agenda' },
];

function HeaderSearch() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const q = text.trim();
    navigate(q ? `/catalogo?q=${encodeURIComponent(q)}` : '/catalogo');
    setText('');
  };
  return (
    <form role="search" onSubmit={submit} className="relative w-full sm:w-64">
      <SearchIcon size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Buscar filme…"
        aria-label="Buscar filme"
        className="field w-full rounded-full pl-9"
      />
    </form>
  );
}

export function Layout() {
  const lib = useLibrary();
  const watchCount = lib.lists.find((l) => l.id === WATCHLIST_ID)?.movies.length ?? 0;
  const upcomingSessions = lib.agenda.filter((e) => e.date >= todayIso()).length;

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-ink">
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-30 border-b border-line/60 bg-ink/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
            <img src="/favicon.svg" alt="" className="h-8 w-8" />
            <span>
              Tracker<span className="text-accent">.</span>
            </span>
          </Link>
          <nav aria-label="Principal" className="order-3 -mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto px-4 sm:order-none sm:mx-0 sm:w-auto sm:px-0">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'relative shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition',
                    isActive ? 'bg-raised text-white' : 'text-muted hover:text-white',
                  )
                }
              >
                {item.label}
                {item.to === '/listas' && watchCount > 0 && <span className="ml-1.5 text-xs text-accent">{watchCount}</span>}
                {item.to === '/agenda' && upcomingSessions > 0 && <span className="ml-1.5 text-xs text-accent">{upcomingSessions}</span>}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto w-full sm:w-auto">
            <HeaderSearch />
          </div>
        </div>
      </header>

      <main id="conteudo" className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-16 border-t border-line/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" aria-label="The Movie Database (TMDB)">
              <img src="/tmdb-logo.svg" alt="TMDB" className="h-4 w-auto" />
            </a>
            <p>Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.</p>
          </div>
          <Link to="/sobre" className="hover:text-white">
            Sobre e créditos
          </Link>
        </div>
      </footer>

      {/* Restaura a posição de rolagem ao voltar (ex.: do detalhe para a lista). */}
      <ScrollRestoration />
    </div>
  );
}
