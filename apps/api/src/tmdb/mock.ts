import type { QueryParams, TmdbClient } from './client.ts';
import { TmdbHttpError, TmdbSchemaError } from './client.ts';
import { addDays, isoDate } from './service.ts';

/**
 * Cliente FALSO do TMDB, usado com `npm run dev:mock` e nos testes.
 *
 * Devolve dados inventados no MESMO formato do TMDB, então schemas, mappers,
 * cache e rotas são exercitados de verdade — só a rede é simulada.
 * Também simula latência, para você ver os skeletons funcionando.
 */

const GENRES = [
  { id: 28, name: 'Ação' },
  { id: 12, name: 'Aventura' },
  { id: 16, name: 'Animação' },
  { id: 35, name: 'Comédia' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentário' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Família' },
  { id: 14, name: 'Fantasia' },
  { id: 27, name: 'Terror' },
  { id: 9648, name: 'Mistério' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Ficção científica' },
  { id: 53, name: 'Thriller' },
];

const TITLE_A = ['O Segredo de', 'A Última Noite em', 'Sombras sobre', 'O Retorno a', 'Fuga de', 'Os Guardiões de', 'Memórias de', 'A Lenda de', 'Silêncio em', 'O Mapa de', 'Coração de', 'Tempestade em'];
const TITLE_B = ['Aurora', 'Vale Escuro', 'Porto Velho', 'Marte', 'Cidade Alta', 'Ilha Azul', 'Serra Negra', 'Atlântida', 'Nova Lua', 'São Jorge', 'Horizonte', 'Pedra Branca', 'Rio Fundo'];
const FIRST = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe', 'Gabriela', 'Heitor', 'Isabela', 'João', 'Larissa', 'Marcos', 'Natália', 'Otávio', 'Paula', 'Rafael', 'Sofia', 'Tiago', 'Vitória', 'Yuri'];
const LAST = ['Almeida', 'Barros', 'Cardoso', 'Duarte', 'Esteves', 'Ferraz', 'Gomes', 'Lima', 'Moreira', 'Nogueira'];
const CHARACTERS = ['Detetive Rocha', 'Capitã Luna', 'Dr. Vasconcelos', 'Mãe', 'O Estranho', 'Narrador', 'Agente Prado', 'Lia', 'Rei Tomás', 'Professora Helena', 'Piloto', 'Ele mesmo'];

/** Gerador pseudoaleatório com semente: os mesmos dados toda vez. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface MockMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: null;
  backdrop_path: null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  popularity: number;
  runtime: number;
  cast: number[];
  director: number;
  certification: string;
}

interface MockPerson {
  id: number;
  name: string;
}

function buildDataset(today: Date) {
  const rand = mulberry32(42);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)] as T;

  const people: MockPerson[] = Array.from({ length: 48 }, (_, i) => ({
    id: 5000 + i,
    name: `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / 2) % LAST.length]}`,
  }));

  const movies: MockMovie[] = Array.from({ length: 180 }, (_, i) => {
    // Espalha as datas de 400 dias atrás até 160 dias no futuro.
    const offset = Math.round(-400 + (i / 179) * 560 + (rand() - 0.5) * 20);
    const released = offset <= 0;
    const genreCount = 1 + Math.floor(rand() * 3);
    const genre_ids = [...new Set(Array.from({ length: genreCount }, () => pick(GENRES).id))];
    const title = `${pick(TITLE_A)} ${pick(TITLE_B)}${rand() > 0.8 ? ' ' + (2 + Math.floor(rand() * 3)) : ''}`;
    const castIds = [...new Set(Array.from({ length: 8 }, () => pick(people).id))];
    return {
      id: 1000 + i,
      title,
      original_title: title,
      overview: `Uma história de ${GENRES.find((g) => g.id === genre_ids[0])?.name.toLowerCase()} sobre segredos, escolhas e um lugar chamado ${pick(TITLE_B)}. (Dados de exemplo — modo mock.)`,
      poster_path: null,
      backdrop_path: null,
      release_date: isoDate(addDays(today, offset)),
      vote_average: released ? Math.round((4 + rand() * 5) * 10) / 10 : 0,
      vote_count: released ? Math.floor(rand() * 5000) : 0,
      genre_ids,
      popularity: Math.round(rand() * 1000) + (offset > -60 && offset < 60 ? 600 : 0),
      runtime: 85 + Math.floor(rand() * 70),
      cast: castIds,
      director: pick(people).id,
      certification: pick(['L', '10', '12', '14', '16', '18']),
    };
  });

  return { movies, people };
}

const PAGE_SIZE = 20;

function paginate(list: MockMovie[], page: number) {
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  return {
    page,
    total_pages: totalPages,
    total_results: list.length,
    results: list.slice(start, start + PAGE_SIZE),
  };
}

function sortBy(list: MockMovie[], sort: string | undefined): MockMovie[] {
  const copy = [...list];
  switch (sort) {
    case 'vote_average.desc':
      return copy.sort((a, b) => b.vote_average - a.vote_average);
    case 'primary_release_date.desc':
      return copy.sort((a, b) => b.release_date.localeCompare(a.release_date));
    case 'primary_release_date.asc':
      return copy.sort((a, b) => a.release_date.localeCompare(b.release_date));
    case 'title.asc':
      return copy.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
    default:
      return copy.sort((a, b) => b.popularity - a.popularity);
  }
}

export interface MockClientOptions {
  today?: () => Date;
  /** Latência simulada (ms). Use 0 nos testes. */
  latency?: [min: number, max: number];
}

export function createMockTmdbClient(options: MockClientOptions = {}): TmdbClient {
  const today = options.today ?? (() => new Date());
  const [minDelay, maxDelay] = options.latency ?? [250, 700];
  const { movies, people } = buildDataset(today());
  const personById = new Map(people.map((p) => [p.id, p]));
  const todayIso = isoDate(today());

  const respond = (path: string, params: QueryParams): unknown => {
    const page = Number(params.page ?? 1);

    if (path === '/genre/movie/list') return { genres: GENRES };

    if (path === '/discover/movie') {
      const gte = (params['release_date.gte'] as string | undefined) ?? '0000';
      const lte =
        (params['release_date.lte'] as string | undefined) ??
        (params['primary_release_date.lte'] as string | undefined) ??
        '9999';
      const filtered = movies.filter(
        (m) =>
          m.release_date >= gte &&
          m.release_date >= String(params['primary_release_date.gte'] ?? '0000') &&
          m.release_date <= lte &&
          (!params.with_genres || m.genre_ids.includes(Number(params.with_genres))) &&
          (!params.primary_release_year || m.release_date.startsWith(String(params.primary_release_year))) &&
          (!params['vote_average.gte'] || m.vote_average >= Number(params['vote_average.gte'])) &&
          (!params['vote_count.gte'] || m.vote_count >= Number(params['vote_count.gte'])),
      );
      return paginate(sortBy(filtered, params.sort_by as string | undefined), page);
    }

    if (path === '/search/movie') {
      const q = String(params.query ?? '').toLocaleLowerCase('pt-BR');
      const filtered = movies.filter(
        (m) =>
          m.title.toLocaleLowerCase('pt-BR').includes(q) &&
          (!params.year || m.release_date.startsWith(String(params.year))),
      );
      return paginate(sortBy(filtered, 'popularity.desc'), page);
    }

    if (path === '/movie/now_playing') {
      const from = isoDate(addDays(today(), -35));
      return paginate(sortBy(movies.filter((m) => m.release_date >= from && m.release_date <= todayIso), undefined), page);
    }

    if (path === '/movie/popular') {
      return paginate(sortBy(movies.filter((m) => m.release_date <= todayIso), undefined), page);
    }

    if (path === '/trending/movie/week') {
      const from = isoDate(addDays(today(), -120));
      return paginate(sortBy(movies.filter((m) => m.release_date >= from && m.release_date <= todayIso), undefined), 1);
    }

    const releaseMatch = /^\/movie\/(\d+)\/release_dates$/.exec(path);
    if (releaseMatch) {
      const movie = movies.find((m) => m.id === Number(releaseMatch[1]));
      if (!movie) throw new TmdbHttpError(404, 'The resource you requested could not be found.');
      return {
        results: [{ iso_3166_1: 'BR', release_dates: [{ certification: movie.certification, release_date: `${movie.release_date}T00:00:00.000Z`, type: 3 }] }],
      };
    }

    const movieMatch = /^\/movie\/(\d+)$/.exec(path);
    if (movieMatch) {
      const movie = movies.find((m) => m.id === Number(movieMatch[1]));
      if (!movie) throw new TmdbHttpError(404, 'The resource you requested could not be found.');
      const released = movie.release_date <= todayIso;
      return {
        ...movie,
        tagline: 'Nada é o que parece.',
        status: released ? 'Released' : 'Post Production',
        imdb_id: null,
        genres: GENRES.filter((g) => movie.genre_ids.includes(g.id)),
        credits: {
          cast: movie.cast.map((id, order) => ({
            id,
            name: personById.get(id)?.name ?? 'Desconhecido',
            character: CHARACTERS[(id + order) % CHARACTERS.length],
            profile_path: null,
            order,
          })),
          crew: [{ id: movie.director, name: personById.get(movie.director)?.name ?? '', job: 'Director', profile_path: null }],
        },
        videos: { results: [] },
        release_dates: {
          results: [
            {
              iso_3166_1: 'BR',
              release_dates: [{ certification: movie.certification, release_date: `${movie.release_date}T00:00:00.000Z`, type: 3 }],
            },
          ],
        },
        'watch/providers': {
          results: released
            ? {
                BR: {
                  link: 'https://www.themoviedb.org/',
                  flatrate: [{ provider_id: 8, provider_name: 'Streaming de exemplo', logo_path: null }],
                  rent: [],
                  buy: [],
                },
              }
            : {},
        },
        similar: paginate(
          movies.filter((m) => m.id !== movie.id && m.genre_ids.some((g) => movie.genre_ids.includes(g))),
          1,
        ),
      };
    }

    const personMatch = /^\/person\/(\d+)$/.exec(path);
    if (personMatch) {
      const person = personById.get(Number(personMatch[1]));
      if (!person) throw new TmdbHttpError(404, 'The resource you requested could not be found.');
      return {
        id: person.id,
        name: person.name,
        biography: `${person.name} é um nome inventado para o modo mock. Com o token do TMDB configurado, esta área mostra a biografia real.`,
        birthday: '1985-03-12',
        deathday: null,
        place_of_birth: 'São Paulo, Brasil',
        profile_path: null,
        known_for_department: 'Acting',
        movie_credits: {
          cast: movies
            .filter((m) => m.cast.includes(person.id))
            .map((m) => ({ ...m, character: CHARACTERS[(person.id + m.id) % CHARACTERS.length] })),
        },
        images: { profiles: [] },
      };
    }

    throw new TmdbHttpError(404, `Mock sem resposta para ${path}`);
  };

  return {
    async get(path, params, schema) {
      if (maxDelay > 0) {
        await new Promise((r) => setTimeout(r, minDelay + Math.random() * (maxDelay - minDelay)));
      }
      const parsed = schema.safeParse(respond(path, params));
      if (!parsed.success) throw new TmdbSchemaError(path, parsed.error.issues);
      return parsed.data;
    },
  };
}
