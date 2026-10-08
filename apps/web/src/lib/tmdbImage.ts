/**
 * Monta a URL de uma imagem do TMDB: base + tamanho + caminho.
 * Ex.: https://image.tmdb.org/t/p/w342/abc.jpg
 *
 * Use o menor tamanho que fica bom na tela — economiza banda e carrega mais rápido.
 */
const BASE = 'https://image.tmdb.org/t/p';

export type PosterSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original';
export type ProfileSize = 'w45' | 'w185' | 'h632' | 'original';
export type BackdropSize = 'w300' | 'w780' | 'w1280' | 'original';
export type LogoSize = 'w45' | 'w92' | 'w154' | 'w185' | 'w300' | 'w500' | 'original';

export function tmdbImage(
  path: string | null | undefined,
  size: PosterSize | ProfileSize | BackdropSize | LogoSize,
): string | null {
  return path ? `${BASE}/${size}${path}` : null;
}

/** srcSet para o navegador escolher o tamanho certo conforme a tela. */
export function posterSrcSet(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return `${BASE}/w185${path} 185w, ${BASE}/w342${path} 342w, ${BASE}/w500${path} 500w`;
}
