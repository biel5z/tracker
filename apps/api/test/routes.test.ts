import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.ts';
import type { TmdbClient } from '../src/tmdb/client.ts';
import { createMockTmdbClient } from '../src/tmdb/mock.ts';
import { createMovieService } from '../src/tmdb/service.ts';

const today = () => new Date(2026, 9, 7);
let app: FastifyInstance;

beforeAll(async () => {
  const service = createMovieService(createMockTmdbClient({ today, latency: [0, 0] }), { region: 'BR', today });
  app = await buildApp({ service, mode: 'mock' });
});
afterAll(() => app.close());

describe('rotas do BFF', () => {
  it('GET /api/health', async () => {
    const res = await app.inject('/api/health');
    expect(res.json()).toEqual({ ok: true, mode: 'mock' });
  });

  it('estreias só trazem filmes de hoje em diante, em ordem de data', async () => {
    const res = await app.inject('/api/movies/upcoming');
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.results.length).toBeGreaterThan(0);
    const dates: string[] = body.results.map((m: { releaseDate: string }) => m.releaseDate);
    expect(dates.every((d) => d >= '2026-10-07')).toBe(true);
    expect([...dates].sort()).toEqual(dates);
  });

  it('filtra o catálogo por gênero', async () => {
    const res = await app.inject('/api/movies/discover?genre=27');
    expect(res.json().results.every((m: { genreIds: number[] }) => m.genreIds.includes(27))).toBe(true);
  });

  it('busca por texto', async () => {
    const res = await app.inject('/api/movies/discover?query=segredo');
    expect(res.json().results.every((m: { title: string }) => m.title.toLowerCase().includes('segredo'))).toBe(true);
  });

  it('devolve 400 para parâmetro inválido', async () => {
    const res = await app.inject('/api/movies/discover?page=0');
    expect(res.statusCode).toBe(400);
  });

  it('detalhe do filme vem com elenco e data no Brasil', async () => {
    const res = await app.inject('/api/movies/1000');
    const movie = res.json();
    expect(movie.cast.length).toBeGreaterThan(0);
    expect(movie.brReleaseDate).toBe(movie.releaseDate);
  });

  it('filme inexistente vira 404', async () => {
    const res = await app.inject('/api/movies/999999');
    expect(res.statusCode).toBe(404);
  });

  it('página do ator traz a filmografia', async () => {
    const movie = (await app.inject('/api/movies/1000')).json();
    const res = await app.inject(`/api/people/${movie.cast[0].id}`);
    expect(res.json().credits.some((c: { id: number }) => c.id === 1000)).toBe(true);
  });
});

describe('data de estreia regional', () => {
  it('não traz relançamentos de filmes antigos', async () => {
    let sent: Record<string, unknown> = {};
    const spyClient: TmdbClient = {
      async get(_path, params, schema) {
        sent = params;
        return schema.parse({ page: 1, total_pages: 1, total_results: 0, results: [] });
      },
    };
    await createMovieService(spyClient, { region: 'BR', today }).upcoming();
    expect(sent['primary_release_date.gte']).toBe('2025-10-07');
  });

  it('troca a data mundial pela data de cinema no Brasil', async () => {
    const fakeClient: TmdbClient = {
      async get(path, _params, schema) {
        const raw =
          path === '/discover/movie'
            ? {
                page: 1,
                total_pages: 1,
                total_results: 2,
                results: [
                  { id: 1, title: 'Lançado nos EUA antes', release_date: '2026-08-01' },
                  { id: 2, title: 'Já no período', release_date: '2026-10-09' },
                ],
              }
            : {
                results: [
                  { iso_3166_1: 'US', release_dates: [{ release_date: '2026-08-01T00:00:00Z', type: 3 }] },
                  {
                    iso_3166_1: 'BR',
                    release_dates: [
                      { release_date: '2026-05-01T00:00:00Z', type: 2 }, // exibição antiga em festival: fora do período
                      { release_date: '2026-10-22T00:00:00Z', type: 3 },
                    ],
                  },
                ],
              };
        return schema.parse(raw);
      },
    };
    const service = createMovieService(fakeClient, { region: 'BR', today });
    const page = await service.upcoming();
    expect(page.results.map((m) => [m.id, m.releaseDate])).toEqual([
      [2, '2026-10-09'],
      [1, '2026-10-22'],
    ]);
  });
});
