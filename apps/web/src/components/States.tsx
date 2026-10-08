import type { ReactNode } from 'react';
import { ApiRequestError } from '../lib/api.ts';
import { cn } from '../lib/cn.ts';
import { FilmIcon } from './icons.tsx';

export function ErrorState({ error, onRetry, compact }: { error: Error; onRetry?: () => void; compact?: boolean }) {
  const message =
    error instanceof ApiRequestError ? error.message : 'Algo deu errado ao carregar. Verifique sua conexão.';
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-3 rounded-2xl border border-danger/30 bg-danger/5 text-center',
        compact ? 'p-5' : 'p-10',
      )}
    >
      <p className="font-semibold text-white">Não deu para carregar.</p>
      <p className="max-w-md text-sm text-muted">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-ghost">
          Tentar de novo
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line p-10 text-center">
      <FilmIcon size={32} className="text-muted" />
      <p className="font-display text-lg font-semibold text-white">{title}</p>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
      {action}
    </div>
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="space-y-2">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      {children && <div className="text-muted">{children}</div>}
    </header>
  );
}
