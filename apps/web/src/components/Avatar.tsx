import { useState } from 'react';
import { cn } from '../lib/cn.ts';
import { tmdbImage } from '../lib/tmdbImage.ts';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

/** Foto de pessoa (ator/diretor). Sem foto no TMDB (profilePath null) → iniciais. */
export function Avatar({ path, name, className }: { path: string | null; name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : tmdbImage(path, 'w185');
  return (
    <div className={cn('aspect-[2/3] overflow-hidden rounded-xl bg-raised', className)}>
      {src ? (
        <img src={src} alt={name} loading="lazy" decoding="async" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-raised to-surface font-display text-2xl font-semibold text-muted">
          {initials(name)}
        </div>
      )}
    </div>
  );
}
