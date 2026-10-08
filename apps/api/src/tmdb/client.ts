import type { z } from 'zod';

export type QueryParams = Record<string, string | number | boolean | undefined>;

/** Contrato mínimo de um cliente do TMDB. O cliente real e o mock implementam o mesmo. */
export interface TmdbClient {
  get<S extends z.ZodType>(path: string, params: QueryParams, schema: S): Promise<z.output<S>>;
}

/** Erro HTTP vindo do TMDB (404, 401, 429...). */
export class TmdbHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'TmdbHttpError';
  }
}

/** A resposta chegou, mas não tem o formato esperado. */
export class TmdbSchemaError extends Error {
  constructor(
    public readonly path: string,
    public readonly issues: unknown,
  ) {
    super(`Resposta inesperada do TMDB em ${path}`);
    this.name = 'TmdbSchemaError';
  }
}

export interface TmdbClientOptions {
  token: string;
  language: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function buildUrl(baseUrl: string, path: string, params: QueryParams): string {
  const url = new URL(baseUrl + path);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/**
 * Cliente HTTP do TMDB.
 *
 * - Autentica com o "API Read Access Token" no header Authorization: Bearer.
 * - Tenta de novo em erros temporários (429 e 5xx), esperando cada vez mais
 *   (backoff exponencial) ou o tempo que o header Retry-After pedir.
 * - Desiste depois de `timeoutMs` (AbortSignal.timeout).
 * - Valida o corpo com o schema Zod recebido.
 */
export function createTmdbClient(options: TmdbClientOptions): TmdbClient {
  const {
    token,
    language,
    baseUrl = 'https://api.themoviedb.org/3',
    fetchImpl = fetch,
    maxRetries = 2,
    timeoutMs = 10_000,
    sleep = defaultSleep,
  } = options;

  return {
    async get(path, params, schema) {
      const url = buildUrl(baseUrl, path, { language, ...params });

      for (let attempt = 0; ; attempt++) {
        let response: Response;
        try {
          response = await fetchImpl(url, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            signal: AbortSignal.timeout(timeoutMs),
          });
        } catch (error) {
          // Falha de rede ou timeout: tenta de novo, se ainda houver tentativas.
          if (attempt < maxRetries) {
            await sleep(500 * 2 ** attempt);
            continue;
          }
          throw new TmdbHttpError(504, `Não foi possível falar com o TMDB: ${(error as Error).message}`);
        }

        const retryable = response.status === 429 || response.status >= 500;
        if (retryable && attempt < maxRetries) {
          const retryAfter = Number(response.headers.get('retry-after'));
          await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** attempt);
          continue;
        }

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { status_message?: string };
          throw new TmdbHttpError(response.status, body.status_message ?? `TMDB respondeu ${response.status}`);
        }

        const json: unknown = await response.json();
        const parsed = schema.safeParse(json);
        if (!parsed.success) throw new TmdbSchemaError(path, parsed.error.issues);
        return parsed.data;
      }
    },
  };
}
