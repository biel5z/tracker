/**
 * O BFF rodando como Netlify Function.
 *
 * No computador, o BFF é um servidor que fica ligado o tempo todo (apps/api/src/server.ts).
 * No Netlify não existe servidor ligado: a cada requisição para /api/*, o Netlify "acorda"
 * esta função, ela responde e pode "dormir" de novo.
 *
 * Para não duplicar código, reaproveitamos o MESMO app Fastify (buildApp) e usamos
 * `app.inject()`, que simula uma requisição sem abrir porta nenhuma — o mesmo truque dos testes.
 *
 * O token vem da variável de ambiente TMDB_TOKEN, cadastrada no painel do Netlify.
 */
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../../api/src/app.ts';
import { createTmdbClient } from '../../../api/src/tmdb/client.ts';
import { createMockTmdbClient } from '../../../api/src/tmdb/mock.ts';
import { createMovieService } from '../../../api/src/tmdb/service.ts';

// Criado uma vez e reaproveitado enquanto a função estiver "acordada" (o cache em memória também).
let appPromise: Promise<FastifyInstance> | undefined;

function getApp(): Promise<FastifyInstance> {
  appPromise ??= (async () => {
    const token = process.env.TMDB_TOKEN?.trim() ?? '';
    const useMock = process.env.TMDB_MOCK === 'true' || token.length < 40;
    if (useMock) console.warn('TMDB_TOKEN não configurado no Netlify — usando dados de exemplo.');

    const client = useMock
      ? createMockTmdbClient({ latency: [0, 0] })
      : createTmdbClient({ token, language: process.env.TMDB_LANGUAGE ?? 'pt-BR' });
    const service = createMovieService(client, { region: process.env.TMDB_REGION ?? 'BR' });

    const app = await buildApp({ service, mode: useMock ? 'mock' : 'tmdb' });
    await app.ready();
    return app;
  })();
  return appPromise;
}

/** O Netlify pode entregar a URL original (/api/...) ou a reescrita (/.netlify/functions/api/...). */
export function toApiPath(url: URL): string {
  const path = url.pathname.replace(/^\/\.netlify\/functions\/api/, '/api');
  return path + url.search;
}

export default async (req: Request): Promise<Response> => {
  const app = await getApp();
  const res = await app.inject({
    method: req.method as 'GET',
    url: toApiPath(new URL(req.url)),
    headers: Object.fromEntries(req.headers),
  });

  const headers = new Headers();
  for (const [key, value] of Object.entries(res.headers)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) headers.append(key, String(v));
  }
  return new Response(res.rawPayload, { status: res.statusCode, headers });
};
