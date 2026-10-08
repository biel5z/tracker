import type { Genre, MovieSummary, Paged } from '@tracker/shared';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const makeMovie = (id: number, overrides: Partial<MovieSummary> = {}): MovieSummary => ({
  id,
  title: `Filme ${id}`,
  originalTitle: `Filme ${id}`,
  overview: '',
  posterPath: null,
  backdropPath: null,
  releaseDate: '2026-10-15',
  voteAverage: 7.5,
  voteCount: 100,
  genreIds: [28],
  ...overrides,
});

export const page = (results: MovieSummary[], p = 1, totalPages = 1): Paged<MovieSummary> => ({
  page: p,
  totalPages,
  totalResults: results.length * totalPages,
  results,
});

export const genres: Genre[] = [
  { id: 28, name: 'Ação' },
  { id: 27, name: 'Terror' },
];

export const server = setupServer(http.get('/api/genres', () => HttpResponse.json(genres)));
