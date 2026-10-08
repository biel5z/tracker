import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { MovieService } from '../tmdb/service.ts';

/**
 * Validação dos parâmetros de URL. `z.coerce` converte "2" (texto da query string) em 2 (número).
 * Parâmetro inválido → 400 (tratado no errorHandler do app.ts).
 */
const pageQuery = z.object({ page: z.coerce.number().int().min(1).max(500).default(1) });

const upcomingQuery = pageQuery.extend({
  genre: z.coerce.number().int().positive().optional(),
  days: z.coerce.number().int().min(7).max(365).optional(),
  sort: z.enum(['data', 'popularidade']).optional(),
});

const discoverQuery = pageQuery.extend({
  query: z.string().trim().max(100).optional(),
  genre: z.coerce.number().int().positive().optional(),
  year: z.coerce.number().int().min(1888).max(2100).optional(),
  minRating: z.coerce.number().min(0).max(10).optional(),
  sort: z.enum(['popularidade', 'nota', 'lancamento', 'titulo']).optional(),
});

const idParams = z.object({ id: z.coerce.number().int().positive() });

/** Diz ao navegador por quanto tempo ele pode reaproveitar a resposta. */
const cacheFor = (seconds: number) => `public, max-age=${seconds}`;

export async function movieRoutes(app: FastifyInstance, opts: { service: MovieService }) {
  const { service } = opts;

  app.get('/api/genres', async (_req, reply) => {
    reply.header('Cache-Control', cacheFor(3600));
    return service.genres();
  });

  app.get('/api/movies/upcoming', async (req, reply) => {
    const q = upcomingQuery.parse(req.query);
    reply.header('Cache-Control', cacheFor(300));
    return service.upcoming(q);
  });

  app.get('/api/movies/now-playing', async (req, reply) => {
    const { page } = pageQuery.parse(req.query);
    reply.header('Cache-Control', cacheFor(300));
    return service.nowPlaying(page);
  });

  app.get('/api/movies/trending', async (_req, reply) => {
    reply.header('Cache-Control', cacheFor(300));
    return service.trending();
  });

  app.get('/api/movies/popular', async (req, reply) => {
    const { page } = pageQuery.parse(req.query);
    reply.header('Cache-Control', cacheFor(300));
    return service.popular(page);
  });

  app.get('/api/movies/discover', async (req, reply) => {
    const q = discoverQuery.parse(req.query);
    reply.header('Cache-Control', cacheFor(300));
    return service.discover(q);
  });

  app.get('/api/movies/:id', async (req, reply) => {
    const { id } = idParams.parse(req.params);
    reply.header('Cache-Control', cacheFor(3600));
    return service.movie(id);
  });

  app.get('/api/people/:id', async (req, reply) => {
    const { id } = idParams.parse(req.params);
    reply.header('Cache-Control', cacheFor(3600));
    return service.person(id);
  });
}
