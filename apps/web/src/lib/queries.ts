import type { DiscoverFilters, UpcomingFilters } from '@tracker/shared';
import { infiniteQueryOptions, keepPreviousData, queryOptions } from '@tanstack/react-query';
import { api } from './api.ts';

/**
 * "Fábricas" de queries do TanStack Query.
 *
 * A queryKey identifica os dados no cache. Regra prática: tudo que muda o
 * resultado (id, página, filtros) entra na key. Mudou a key → nova busca.
 * Repetiu a key → resposta do cache, sem rede.
 */
export const queries = {
  genres: () =>
    queryOptions({
      queryKey: ['genres'],
      queryFn: ({ signal }) => api.genres(signal),
      staleTime: Infinity, // gêneros praticamente nunca mudam
    }),

  upcoming: (filters: Omit<UpcomingFilters, 'page'>) =>
    infiniteQueryOptions({
      queryKey: ['movies', 'upcoming', filters],
      queryFn: ({ pageParam, signal }) => api.upcoming({ ...filters, page: pageParam }, signal),
      initialPageParam: 1,
      // undefined = não há próxima página (hasNextPage vira false).
      getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    }),

  nowPlaying: () =>
    queryOptions({
      queryKey: ['movies', 'now-playing'],
      queryFn: ({ signal }) => api.nowPlaying(1, signal),
    }),

  trending: () =>
    queryOptions({
      queryKey: ['movies', 'trending'],
      queryFn: ({ signal }) => api.trending(signal),
    }),

  discover: (filters: DiscoverFilters) =>
    queryOptions({
      queryKey: ['movies', 'discover', filters],
      queryFn: ({ signal }) => api.discover(filters, signal),
      // Ao trocar filtro/página, mantém a lista anterior na tela até a nova chegar.
      placeholderData: keepPreviousData,
    }),

  movie: (id: number) =>
    queryOptions({
      queryKey: ['movie', id],
      queryFn: ({ signal }) => api.movie(id, signal),
      staleTime: 30 * 60_000,
    }),

  person: (id: number) =>
    queryOptions({
      queryKey: ['person', id],
      queryFn: ({ signal }) => api.person(id, signal),
      staleTime: 30 * 60_000,
    }),
};
