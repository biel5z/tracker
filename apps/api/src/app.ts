import { existsSync } from 'node:fs';
import { join } from 'node:path';
import fastifyStatic from '@fastify/static';
import type { ApiError } from '@tracker/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { movieRoutes } from './routes/movies.ts';
import { TmdbHttpError, TmdbSchemaError } from './tmdb/client.ts';
import type { MovieService } from './tmdb/service.ts';

export interface BuildAppOptions {
  service: MovieService;
  mode: 'tmdb' | 'mock';
  /** Pasta do build do front (apps/web/dist). Se existir, o BFF também serve o site. */
  webDist?: string;
  logger?: boolean;
}

/**
 * Monta o app Fastify sem iniciar o servidor — assim os testes usam `app.inject()`
 * para simular requisições sem abrir porta nenhuma.
 */
export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    // "warn": mostra só avisos e erros (cada requisição em "info" polui o terminal).
    logger: options.logger ? { level: 'warn' } : false,
  });

  // Traduz qualquer erro para um JSON padronizado { statusCode, error, message }.
  app.setErrorHandler((error, request, reply) => {
    let body: ApiError;
    if (error instanceof ZodError) {
      body = { statusCode: 400, error: 'Bad Request', message: 'Parâmetros inválidos: ' + error.issues.map((i) => `${i.path.join('.')} (${i.message})`).join(', ') };
    } else if (error instanceof TmdbHttpError) {
      const status = error.status === 404 ? 404 : error.status === 401 ? 502 : error.status === 429 ? 503 : 502;
      body = {
        statusCode: status,
        error: status === 404 ? 'Not Found' : 'Bad Gateway',
        message:
          error.status === 404
            ? 'Não encontrado.'
            : error.status === 401
              ? 'Token do TMDB inválido. Confira o TMDB_TOKEN em apps/api/.env.'
              : `Falha ao consultar o TMDB (${error.status}). Tente de novo em instantes.`,
      };
    } else if (error instanceof TmdbSchemaError) {
      request.log.error({ issues: error.issues }, error.message);
      body = { statusCode: 502, error: 'Bad Gateway', message: 'O TMDB respondeu num formato inesperado.' };
    } else {
      request.log.error(error);
      body = { statusCode: 500, error: 'Internal Server Error', message: 'Erro inesperado no servidor.' };
    }
    reply.status(body.statusCode).send(body);
  });

  app.get('/api/health', async () => ({ ok: true, mode: options.mode }));

  await app.register(movieRoutes, { service: options.service });

  // Produção: serve o build do React e devolve index.html para as rotas do front (SPA).
  if (options.webDist && existsSync(join(options.webDist, 'index.html'))) {
    await app.register(fastifyStatic, { root: options.webDist });
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) {
        reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Rota não encontrada.' });
        return;
      }
      reply.sendFile('index.html');
    });
  } else {
    app.setNotFoundHandler((_request, reply) => {
      reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Rota não encontrada.' });
    });
  }

  return app;
}
