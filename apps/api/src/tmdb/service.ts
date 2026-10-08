import type {
  CatalogSort,
  DiscoverFilters,
  Genre,
  MovieDetail,
  MovieSummary,
  Paged,
  PersonDetail,
  UpcomingFilters,
} from '@tracker/shared';
import { HOUR, MINUTE, TtlCache } from '../cache.ts';
import type { QueryParams, TmdbClient } from './client.ts';
import { TMDB_MAX_PAGE, toMovieDetail, toPaged, toPersonDetail } from './mappers.ts';
import { genreListSchema, movieDetailSchema, moviePageSchema, personSchema, releaseDatesSchema } from './schemas.ts';

export interface MovieServiceOptions {
  region: string;
  /** Injetável nos testes para fixar "hoje". */
  today?: () => Date;
}

/** Data local no formato YYYY-MM-DD (sem converter para UTC, que pode virar o dia seguinte). */
export function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** "2026-10-08" → Date local (sem passar por UTC). */
export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

const clampPage = (page = 1) => Math.min(Math.max(1, Math.trunc(page)), TMDB_MAX_PAGE);

const SORT_MAP: Record<CatalogSort, string> = {
  popularidade: 'popularity.desc',
  nota: 'vote_average.desc',
  lancamento: 'primary_release_date.desc',
  titulo: 'title.asc',
};

/**
 * Regras de negócio sobre o TMDB: quais endpoints chamar, com quais filtros,
 * e por quanto tempo guardar cada resposta no cache.
 */
export function createMovieService(client: TmdbClient, options: MovieServiceOptions) {
  const { region } = options;
  const today = options.today ?? (() => new Date());
  const cache = new TtlCache<unknown>(1000);

  /** Chave de cache = caminho + parâmetros em ordem alfabética. */
  const keyOf = (path: string, params: QueryParams) =>
    path +
    '?' +
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');

  async function moviePage(path: string, params: QueryParams, ttl: number): Promise<Paged<MovieSummary>> {
    return cache.getOrLoad(keyOf(path, params), ttl, async () =>
      toPaged(await client.get(path, params, moviePageSchema)),
    ) as Promise<Paged<MovieSummary>>;
  }

  /** Todas as datas de cinema (tipos 2 e 3) do filme no país configurado, em ordem (cache de 24 h). */
  async function regionalTheatricalDates(movieId: number): Promise<string[]> {
    return cache.getOrLoad(`release:${movieId}`, 24 * HOUR, async () => {
      const data = await client.get(`/movie/${movieId}/release_dates`, {}, releaseDatesSchema);
      const entry = data.results.find((r) => r.iso_3166_1 === region);
      return (entry?.release_dates ?? [])
        .filter((d) => d.type === 2 || d.type === 3)
        .map((d) => d.release_date.slice(0, 10))
        .sort();
    }) as Promise<string[]>;
  }

  /**
   * O discover filtra pela data de estreia NO BRASIL, mas o campo release_date de cada
   * resultado é a data de lançamento MUNDIAL. Um filme que saiu nos EUA em agosto e chega
   * aqui em outubro viria com "agosto". Para esses casos, buscamos a data brasileira.
   */
  async function withRegionalDates(page: Paged<MovieSummary>, from: string, to: string): Promise<Paged<MovieSummary>> {
    // Rede de segurança contra RELANÇAMENTOS: mesmo com o filtro na consulta, descarta qualquer
    // filme cujo lançamento original (mundial) foi há mais de 1 ano — ex.: Shrek (2001) em sessão especial.
    const cutoff = isoDate(addDays(parseIso(from), -365));
    const recent = page.results.filter((movie) => !movie.releaseDate || movie.releaseDate >= cutoff);
    const results = await Promise.all(
      recent.map(async (movie) => {
        if (movie.releaseDate && movie.releaseDate >= from && movie.releaseDate <= to) return movie;
        const dates = await regionalTheatricalDates(movie.id).catch(() => []);
        // A data que cai DENTRO do período pedido (um filme pode ter mais de uma, ex.: pré-estreia).
        const date = dates.find((d) => d >= from && d <= to);
        return date ? { ...movie, releaseDate: date } : movie;
      }),
    );
    return { ...page, results };
  }

  return {
    cache,

    async genres(): Promise<Genre[]> {
      return cache.getOrLoad('genres', 24 * HOUR, async () => {
        const data = await client.get('/genre/movie/list', {}, genreListSchema);
        return data.genres;
      }) as Promise<Genre[]>;
    },

    /** Estreias nos cinemas do país configurado (padrão: Brasil) nos próximos N dias. */
    async upcoming(filters: UpcomingFilters = {}): Promise<Paged<MovieSummary>> {
      const start = today();
      const days = Math.min(Math.max(filters.days ?? 90, 7), 365);
      const from = isoDate(start);
      const to = isoDate(addDays(start, days));
      const params: QueryParams = {
        region,
        with_release_type: '2|3', // 2 = cinema (limitado), 3 = cinema
        'release_date.gte': from,
        'release_date.lte': to,
        // Exclui RELANÇAMENTOS: filme lançado originalmente há mais de 1 ano que volta aos cinemas
        // (ex.: Shrek em sessão especial) também conta como "estreia" para o TMDB.
        'primary_release_date.gte': isoDate(addDays(start, -365)),
        with_genres: filters.genre,
        sort_by: filters.sort === 'popularidade' ? 'popularity.desc' : 'primary_release_date.asc',
        include_adult: false,
        include_video: false,
        page: clampPage(filters.page),
      };
      return cache.getOrLoad(keyOf('upcoming', params), HOUR, async () => {
        const page = await withRegionalDates(toPaged(await client.get('/discover/movie', params, moviePageSchema)), from, to);
        if (filters.sort !== 'popularidade') {
          // Reordena pela data brasileira (dentro da página).
          page.results.sort((a, b) => (a.releaseDate ?? '9999').localeCompare(b.releaseDate ?? '9999'));
        }
        return page;
      }) as Promise<Paged<MovieSummary>>;
    },

    async nowPlaying(page = 1): Promise<Paged<MovieSummary>> {
      const data = await moviePage('/movie/now_playing', { region, page: clampPage(page) }, HOUR);
      // "Em cartaz" também traz relançamentos (sessões especiais de filmes antigos): ficam de fora.
      const cutoff = isoDate(addDays(today(), -365));
      return { ...data, results: data.results.filter((m) => !m.releaseDate || m.releaseDate >= cutoff) };
    },

    trending() {
      return moviePage('/trending/movie/week', {}, HOUR);
    },

    popular(page = 1) {
      return moviePage('/movie/popular', { region, page: clampPage(page) }, HOUR);
    },

    /**
     * Catálogo geral. Com texto usa /search/movie (que NÃO aceita filtro de gênero ou nota);
     * sem texto usa /discover/movie com todos os filtros.
     */
    discover(filters: DiscoverFilters = {}) {
      const page = clampPage(filters.page);
      const query = filters.query?.trim();

      if (query) {
        return moviePage(
          '/search/movie',
          { query, year: filters.year, include_adult: false, page },
          30 * MINUTE,
        );
      }

      const sort = filters.sort ?? 'popularidade';
      return moviePage(
        '/discover/movie',
        {
          with_genres: filters.genre,
          primary_release_year: filters.year,
          'vote_average.gte': filters.minRating,
          // Sem um mínimo de votos, "melhor nota" vira uma lista de filmes com 1 voto 10/10.
          'vote_count.gte': sort === 'nota' || filters.minRating ? 200 : undefined,
          // Ordenar por lançamento sem limite traz filmes anunciados para daqui a anos.
          'primary_release_date.lte': sort === 'lancamento' ? isoDate(today()) : undefined,
          sort_by: SORT_MAP[sort],
          include_adult: false,
          include_video: false,
          page,
        },
        30 * MINUTE,
      );
    },

    async movie(id: number): Promise<MovieDetail> {
      return cache.getOrLoad(`movie:${id}`, 24 * HOUR, async () => {
        const raw = await client.get(
          `/movie/${id}`,
          {
            append_to_response: 'credits,videos,release_dates,watch/providers,similar',
            // Traz vídeos em português, inglês e sem idioma numa chamada só.
            include_video_language: 'pt,en,null',
          },
          movieDetailSchema,
        );
        return toMovieDetail(raw, region);
      }) as Promise<MovieDetail>;
    },

    async person(id: number): Promise<PersonDetail> {
      return cache.getOrLoad(`person:${id}`, 24 * HOUR, async () => {
        const raw = await client.get(`/person/${id}`, { append_to_response: 'movie_credits,images' }, personSchema);
        // Biografia em pt-BR costuma vir vazia; nesse caso busca em inglês.
        if (!raw.biography) {
          const en = await client.get(`/person/${id}`, { language: 'en-US' }, personSchema).catch(() => null);
          if (en?.biography) raw.biography = en.biography;
        }
        return toPersonDetail(raw);
      }) as Promise<PersonDetail>;
    },
  };
}

export type MovieService = ReturnType<typeof createMovieService>;
