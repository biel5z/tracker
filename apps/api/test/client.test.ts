import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { buildUrl, createTmdbClient, TmdbHttpError, TmdbSchemaError } from '../src/tmdb/client.ts';

const schema = z.object({ ok: z.boolean() });
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

describe('buildUrl', () => {
  it('ignora parâmetros vazios', () => {
    expect(buildUrl('https://x.test/3', '/movie/1', { a: 1, b: undefined, c: '' })).toBe('https://x.test/3/movie/1?a=1');
  });
});

describe('createTmdbClient', () => {
  it('envia o token como Bearer e o idioma', async () => {
    const fetchImpl = vi.fn(async () => json({ ok: true }));
    const client = createTmdbClient({ token: 'abc', language: 'pt-BR', fetchImpl });
    await client.get('/x', { page: 2 }, schema);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('language=pt-BR');
    expect(url).toContain('page=2');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer abc');
  });

  it('tenta de novo depois de um 429, respeitando Retry-After', async () => {
    const sleep = vi.fn(async () => {});
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json({}, 429, { 'retry-after': '2' }))
      .mockResolvedValueOnce(json({ ok: true }));
    const client = createTmdbClient({ token: 't', language: 'pt-BR', fetchImpl, sleep });
    await expect(client.get('/x', {}, schema)).resolves.toEqual({ ok: true });
    expect(sleep).toHaveBeenCalledWith(2000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('não tenta de novo em 404', async () => {
    const fetchImpl = vi.fn(async () => json({ status_message: 'not found' }, 404));
    const client = createTmdbClient({ token: 't', language: 'pt-BR', fetchImpl, sleep: async () => {} });
    await expect(client.get('/x', {}, schema)).rejects.toBeInstanceOf(TmdbHttpError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rejeita respostas fora do formato esperado', async () => {
    const fetchImpl = vi.fn(async () => json({ ok: 'sim' }));
    const client = createTmdbClient({ token: 't', language: 'pt-BR', fetchImpl });
    await expect(client.get('/x', {}, schema)).rejects.toBeInstanceOf(TmdbSchemaError);
  });
});
