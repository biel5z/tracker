import type {
  MovieDetail,
  MovieSummary,
  Paged,
  PersonCredit,
  PersonDetail,
  Video,
  WatchProviders,
} from '@tracker/shared';
import type { RawMovieDetail, RawMovieListItem, RawMoviePage, RawPerson } from './schemas.ts';

/** O TMDB nunca devolve páginas acima de 500, mesmo que total_pages diga mais. */
export const TMDB_MAX_PAGE = 500;

const emptyToNull = (value: string | undefined | null): string | null =>
  value && value.trim() !== '' ? value : null;

export function toMovieSummary(raw: RawMovieListItem): MovieSummary {
  return {
    id: raw.id,
    title: raw.title || raw.original_title,
    originalTitle: raw.original_title,
    overview: raw.overview,
    posterPath: raw.poster_path,
    backdropPath: raw.backdrop_path,
    releaseDate: emptyToNull(raw.release_date),
    voteAverage: Math.round(raw.vote_average * 10) / 10,
    voteCount: raw.vote_count,
    genreIds: raw.genre_ids,
  };
}

/** Converte a página do TMDB e remove filmes repetidos (acontece quando a ordenação muda entre páginas). */
export function toPaged(raw: RawMoviePage): Paged<MovieSummary> {
  const seen = new Set<number>();
  const results: MovieSummary[] = [];
  for (const item of raw.results) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    results.push(toMovieSummary(item));
  }
  return {
    page: raw.page,
    totalPages: Math.min(raw.total_pages, TMDB_MAX_PAGE),
    totalResults: raw.total_results,
    results,
  };
}

/** Escolhe o melhor trailer: pt-BR oficial → pt → en → qualquer trailer → teaser. */
export function pickTrailer(videos: Video[]): Video | null {
  const youtube = videos.filter((v) => v.site === 'YouTube');
  const score = (v: Video): number => {
    let s = 0;
    if (v.type === 'Trailer') s += 100;
    else if (v.type === 'Teaser') s += 50;
    if (v.language === 'pt') s += 30;
    else if (v.language === 'en') s += 10;
    if (v.official) s += 5;
    return s;
  };
  const sorted = [...youtube].sort((a, b) => score(b) - score(a));
  const best = sorted[0];
  return best && score(best) >= 50 ? best : null;
}

/** Tipos de lançamento do TMDB: 1 Premiere, 2 Cinema limitado, 3 Cinema, 4 Digital, 5 Físico, 6 TV. */
export function findRegionalRelease(
  releaseDates: RawMovieDetail['release_dates']['results'],
  region: string,
): { date: string | null; certification: string | null } {
  const entry = releaseDates.find((r) => r.iso_3166_1 === region);
  if (!entry) return { date: null, certification: null };

  const theatrical = entry.release_dates
    .filter((d) => d.type === 2 || d.type === 3)
    .map((d) => d.release_date.slice(0, 10))
    .sort();
  const certification = entry.release_dates.map((d) => d.certification).find((c) => c.trim() !== '');

  return { date: theatrical[0] ?? null, certification: certification ?? null };
}

function toWatchProviders(raw: RawMovieDetail['watch/providers'], region: string): WatchProviders | null {
  const r = raw.results[region];
  if (!r) return null;
  const map = (list: typeof r.flatrate) =>
    list.map((p) => ({ id: p.provider_id, name: p.provider_name, logoPath: p.logo_path }));
  return { link: r.link, flatrate: map(r.flatrate), rent: map(r.rent), buy: map(r.buy) };
}

export function toMovieDetail(raw: RawMovieDetail, region: string): MovieDetail {
  const videos: Video[] = raw.videos.results.map((v) => ({
    key: v.key,
    name: v.name,
    site: v.site,
    type: v.type,
    language: v.iso_639_1,
    official: v.official,
  }));
  const regional = findRegionalRelease(raw.release_dates.results, region);

  return {
    ...toMovieSummary({ ...raw, genre_ids: raw.genres.map((g) => g.id) }),
    tagline: emptyToNull(raw.tagline),
    runtime: raw.runtime && raw.runtime > 0 ? raw.runtime : null,
    genres: raw.genres,
    status: raw.status,
    brReleaseDate: regional.date,
    brCertification: regional.certification,
    cast: [...raw.credits.cast]
      .sort((a, b) => a.order - b.order)
      .slice(0, 24)
      .map((c) => ({ id: c.id, name: c.name, character: c.character, profilePath: c.profile_path, order: c.order })),
    directors: raw.credits.crew
      .filter((c) => c.job === 'Director')
      .map((c) => ({ id: c.id, name: c.name, job: c.job, profilePath: c.profile_path })),
    trailer: pickTrailer(videos),
    videos,
    watchProviders: toWatchProviders(raw['watch/providers'], region),
    similar: raw.similar ? toPaged(raw.similar).results.slice(0, 12) : [],
    imdbId: raw.imdb_id,
  };
}

export function toPersonDetail(raw: RawPerson): PersonDetail {
  // Um ator pode aparecer duas vezes no mesmo filme (dois papéis): juntamos.
  const byId = new Map<number, PersonCredit>();
  for (const c of raw.movie_credits.cast) {
    const existing = byId.get(c.id);
    if (existing) {
      if (c.character && !existing.character.includes(c.character)) {
        existing.character = [existing.character, c.character].filter(Boolean).join(' / ');
      }
      continue;
    }
    byId.set(c.id, { ...toMovieSummary(c), character: c.character });
  }

  const credits = [...byId.values()].sort((a, b) => {
    if (a.releaseDate === b.releaseDate) return b.voteCount - a.voteCount;
    if (!a.releaseDate) return -1; // sem data = provavelmente ainda não lançado: vai para o topo
    if (!b.releaseDate) return 1;
    return b.releaseDate.localeCompare(a.releaseDate);
  });

  return {
    id: raw.id,
    name: raw.name,
    biography: raw.biography,
    birthday: raw.birthday,
    deathday: raw.deathday,
    placeOfBirth: raw.place_of_birth,
    profilePath: raw.profile_path,
    knownForDepartment: raw.known_for_department,
    images: raw.images.profiles.map((p) => p.file_path),
    credits,
  };
}
