/**
 * Cache em memória com tempo de expiração (TTL) e limite de itens.
 *
 * Três ideias para estudar aqui:
 * 1. TTL — cada item guarda quando expira; item vencido é tratado como ausente.
 * 2. LRU simples — o Map mantém a ordem de inserção; ao ler um item ele é
 *    reinserido no fim, então o primeiro do Map é sempre o menos usado.
 * 3. Deduplicação de requisições em andamento — se duas pessoas pedem o mesmo
 *    filme ao mesmo tempo, só uma chamada vai ao TMDB e as duas recebem a mesma Promise.
 */
export class TtlCache<T = unknown> {
  private readonly store = new Map<string, { value: T; expiresAt: number }>();
  private readonly inflight = new Map<string, Promise<T>>();

  constructor(
    private readonly maxEntries = 500,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.store.delete(key);
      return undefined;
    }
    // Move para o fim: passa a ser o "mais recentemente usado".
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    this.store.delete(key);
    this.store.set(key, { value, expiresAt: this.now() + ttlMs });
    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest === undefined) break;
      this.store.delete(oldest);
    }
  }

  /** Devolve do cache ou executa `loader` uma única vez, mesmo com chamadas simultâneas. */
  async getOrLoad(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
    const hit = this.get(key);
    if (hit !== undefined) return hit;

    const pending = this.inflight.get(key);
    if (pending) return pending;

    const promise = loader()
      .then((value) => {
        this.set(key, value, ttlMs);
        return value;
      })
      .finally(() => this.inflight.delete(key));

    this.inflight.set(key, promise);
    return promise;
  }

  get size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
    this.inflight.clear();
  }
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
