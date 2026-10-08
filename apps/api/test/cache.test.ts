import { describe, expect, it, vi } from 'vitest';
import { TtlCache } from '../src/cache.ts';

describe('TtlCache', () => {
  it('expira itens depois do TTL', () => {
    let now = 0;
    const cache = new TtlCache<string>(10, () => now);
    cache.set('a', 'valor', 1000);
    expect(cache.get('a')).toBe('valor');
    now = 1000;
    expect(cache.get('a')).toBeUndefined();
  });

  it('descarta o item menos usado quando passa do limite', () => {
    const cache = new TtlCache<number>(2);
    cache.set('a', 1, 10_000);
    cache.set('b', 2, 10_000);
    cache.get('a'); // "a" passa a ser o mais recente
    cache.set('c', 3, 10_000);
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
  });

  it('chama o loader uma única vez para requisições simultâneas', async () => {
    const cache = new TtlCache<number>();
    const loader = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return 42;
    });
    const results = await Promise.all([
      cache.getOrLoad('k', 1000, loader),
      cache.getOrLoad('k', 1000, loader),
      cache.getOrLoad('k', 1000, loader),
    ]);
    expect(results).toEqual([42, 42, 42]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('não guarda no cache quando o loader falha', async () => {
    const cache = new TtlCache<number>();
    await expect(cache.getOrLoad('k', 1000, async () => Promise.reject(new Error('x')))).rejects.toThrow('x');
    expect(cache.get('k')).toBeUndefined();
    expect(await cache.getOrLoad('k', 1000, async () => 7)).toBe(7);
  });
});
