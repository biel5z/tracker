import { useState } from 'react';
import { cn } from '../lib/cn.ts';
import { posterSrcSet, tmdbImage } from '../lib/tmdbImage.ts';
import { FilmIcon } from './icons.tsx';

/** Cor estável por título: o mesmo filme sempre ganha o mesmo degradê. */
function hueOf(text: string): number {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % 360;
}

export function PosterFallback({ title }: { title: string }) {
  const hue = hueOf(title);
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-3 p-3 text-center"
      style={{ background: `linear-gradient(160deg, hsl(${hue} 45% 22%), hsl(${(hue + 40) % 360} 35% 10%))` }}
    >
      <FilmIcon size={28} className="text-white/40" />
      <span className="line-clamp-4 font-display text-sm leading-tight font-semibold text-white/85">{title}</span>
    </div>
  );
}

interface PosterProps {
  path: string | null;
  title: string;
  className?: string;
  /** true para imagens acima da dobra (carrega já, sem lazy). */
  priority?: boolean;
  sizes?: string;
}

/**
 * Pôster com proporção fixa 2:3. O espaço fica reservado antes da imagem chegar,
 * então a página não "pula" (layout shift). Se não houver imagem ou ela falhar, mostra um degradê.
 */
export function Poster({ path, title, className, priority, sizes = '(min-width: 1024px) 190px, 45vw' }: PosterProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const src = failed ? null : tmdbImage(path, 'w342');

  return (
    <div className={cn('relative aspect-[2/3] overflow-hidden rounded-xl bg-raised', className)}>
      {src ? (
        <img
          src={src}
          srcSet={posterSrcSet(path)}
          sizes={sizes}
          alt={`Pôster de ${title}`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn('h-full w-full object-cover transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0')}
        />
      ) : (
        <PosterFallback title={title} />
      )}
      {src && !loaded && <div className="skeleton absolute inset-0 rounded-none" aria-hidden="true" />}
    </div>
  );
}
