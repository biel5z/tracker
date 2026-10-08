/**
 * Tipos compartilhados entre o BFF (apps/api) e o front-end (apps/web).
 *
 * O BFF converte as respostas do TMDB para estes formatos, então o front
 * nunca depende dos nomes de campo do TMDB diretamente. Se o TMDB mudar algo,
 * só o mapper do BFF precisa ser ajustado.
 */

/** Resposta paginada genérica. O TMDB devolve 20 itens por página e no máximo 500 páginas. */
export interface Paged<T> {
  page: number;
  totalPages: number;
  totalResults: number;
  results: T[];
}

export interface Genre {
  id: number;
  name: string;
}

/** Filme em listas (cards). */
export interface MovieSummary {
  id: number;
  title: string;
  originalTitle: string;
  overview: string;
  /** Caminho do pôster no CDN do TMDB (ex.: "/abc.jpg"). Use `tmdbImage()` no front para montar a URL. */
  posterPath: string | null;
  backdropPath: string | null;
  /** Data de lançamento no formato YYYY-MM-DD (ou null quando o TMDB não informa). */
  releaseDate: string | null;
  voteAverage: number;
  voteCount: number;
  genreIds: number[];
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
  order: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  profilePath: string | null;
}

export interface Video {
  key: string;
  name: string;
  site: string;
  type: string;
  language: string;
  official: boolean;
}

export interface WatchProvider {
  id: number;
  name: string;
  logoPath: string | null;
}

export interface WatchProviders {
  /** Link da página "onde assistir" do TMDB (dados da JustWatch). */
  link: string | null;
  flatrate: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
}

/** Detalhe completo de um filme (uma chamada com append_to_response). */
export interface MovieDetail extends MovieSummary {
  tagline: string | null;
  runtime: number | null;
  genres: Genre[];
  status: string;
  /** Data de estreia nos cinemas do Brasil, quando o TMDB tiver. */
  brReleaseDate: string | null;
  /** Classificação indicativa no Brasil (ex.: "14", "L"). */
  brCertification: string | null;
  cast: CastMember[];
  directors: CrewMember[];
  /** Trailer principal (prioriza pt-BR, depois en). */
  trailer: Video | null;
  videos: Video[];
  watchProviders: WatchProviders | null;
  similar: MovieSummary[];
  imdbId: string | null;
}

export interface PersonCredit extends MovieSummary {
  character: string;
}

export interface PersonDetail {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  profilePath: string | null;
  knownForDepartment: string;
  images: string[];
  /** Filmografia como ator, ordenada do mais recente para o mais antigo. */
  credits: PersonCredit[];
}

/** Filtros aceitos por GET /api/movies/discover. */
export interface DiscoverFilters {
  page?: number;
  query?: string;
  genre?: number;
  year?: number;
  minRating?: number;
  sort?: CatalogSort;
}

export type CatalogSort = 'popularidade' | 'nota' | 'lancamento' | 'titulo';

/** Filtros aceitos por GET /api/movies/upcoming. */
export interface UpcomingFilters {
  page?: number;
  genre?: number;
  /** Janela em dias a partir de hoje (padrão 90). */
  days?: number;
  sort?: 'data' | 'popularidade';
}

/** Formato de erro devolvido pelo BFF. */
export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}
