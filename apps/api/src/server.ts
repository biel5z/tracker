import { buildApp } from './app.ts';
import { env, tokenLooksValid } from './env.ts';
import { createTmdbClient } from './tmdb/client.ts';
import { createMockTmdbClient } from './tmdb/mock.ts';
import { createMovieService } from './tmdb/service.ts';

let useMock = env.mock;

if (!useMock && !tokenLooksValid(env.tmdbToken)) {
  console.warn(
    '\n⚠  TMDB_TOKEN não configurado em apps/api/.env — usando dados de exemplo (modo mock).\n' +
      '   Pegue o token em https://www.themoviedb.org/settings/api ("API Read Access Token").\n',
  );
  useMock = true;
}

const client = useMock
  ? createMockTmdbClient()
  : createTmdbClient({ token: env.tmdbToken, language: env.language });

const service = createMovieService(client, { region: env.region });

const app = await buildApp({
  service,
  mode: useMock ? 'mock' : 'tmdb',
  webDist: env.webDist,
  logger: true,
});

try {
  await app.listen({ port: env.port, host: env.host });
  console.log(`\n🎬 BFF rodando em http://localhost:${env.port}  (${useMock ? 'dados de exemplo' : 'TMDB real'})\n`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

// Encerra com elegância ao apertar Ctrl+C.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}
