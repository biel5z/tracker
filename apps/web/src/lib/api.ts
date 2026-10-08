import type {
  ApiError,
  DiscoverFilters,
  Genre,
  MovieDetail,
  MovieSummary,
  Paged,
  PersonDetail,
  UpcomingFilters,
} from '@tracker/shared';

/** Erro de uma chamada ao BFF, com o status HTTP para decidir se vale tentar de novo. */
export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

type Params = Record<string, string | number | undefined>;

function toQueryString(params: Params): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Faz GET no BFF e devolve o JSON já tipado.
 * O `signal` vem do TanStack Query: se o usuário sair da tela ou mudar o filtro,
 * a requisição antiga é cancelada (evita condição de corrida).
 */
export async function getJson<T>(path: string, params: Params = {}, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}${toQueryString(params)}`, { signal, headers: { Accept: 'application/json' } });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ApiRequestError(0, 'Sem conexão com o servidor. Verifique se o BFF está rodando.');
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    throw new ApiRequestError(response.status, body?.message ?? `Erro ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  genres: (signal?: AbortSignal) => getJson<Genre[]>('/genres', {}, signal),

  upcoming: (filters: UpcomingFilters, signal?: AbortSignal) =>
    getJson<Paged<MovieSummary>>('/movies/upcoming', { ...filters }, signal),

  nowPlaying: (page = 1, signal?: AbortSignal) => getJson<Paged<MovieSummary>>('/movies/now-playing', { page }, signal),

  trending: (signal?: AbortSignal) => getJson<Paged<MovieSummary>>('/movies/trending', {}, signal),

  popular: (page = 1, signal?: AbortSignal) => getJson<Paged<MovieSummary>>('/movies/popular', { page }, signal),

  discover: (filters: DiscoverFilters, signal?: AbortSignal) =>
    getJson<Paged<MovieSummary>>('/movies/discover', { ...filters }, signal),

  movie: (id: number, signal?: AbortSignal) => getJson<MovieDetail>(`/movies/${id}`, {}, signal),

  person: (id: number, signal?: AbortSignal) => getJson<PersonDetail>(`/people/${id}`, {}, signal),
};
