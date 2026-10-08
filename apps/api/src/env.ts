import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Pasta apps/api (independe de onde o comando foi executado). */
const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = resolve(apiRoot, '.env');

// Node 22 lê arquivos .env nativamente — sem precisar do pacote dotenv.
if (existsSync(envFile)) process.loadEnvFile(envFile);

export const env = {
  port: Number(process.env.PORT ?? 3333),
  host: process.env.HOST ?? '127.0.0.1',
  tmdbToken: process.env.TMDB_TOKEN?.trim() ?? '',
  /** `--mock` na linha de comando ou TMDB_MOCK=true → dados falsos, sem rede. */
  mock: process.argv.includes('--mock') || process.env.TMDB_MOCK === 'true',
  language: process.env.TMDB_LANGUAGE ?? 'pt-BR',
  region: process.env.TMDB_REGION ?? 'BR',
  /** Build do front; se existir, o BFF também serve o site (npm run build && npm start). */
  webDist: resolve(apiRoot, '../web/dist'),
};

export function tokenLooksValid(token: string): boolean {
  return token.length > 40 && token !== 'cole_seu_token_aqui';
}
