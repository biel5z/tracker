import { describe, expect, it } from 'vitest';
import { findRegionalRelease, pickTrailer, toPaged } from '../src/tmdb/mappers.ts';

describe('pickTrailer', () => {
  const base = { name: '', site: 'YouTube', official: true };
  it('prefere trailer em português', () => {
    const t = pickTrailer([
      { ...base, key: 'en', type: 'Trailer', language: 'en' },
      { ...base, key: 'pt', type: 'Trailer', language: 'pt' },
      { ...base, key: 'teaser', type: 'Teaser', language: 'pt' },
    ]);
    expect(t?.key).toBe('pt');
  });
  it('ignora vídeos que não são trailer nem teaser', () => {
    expect(pickTrailer([{ ...base, key: 'x', type: 'Featurette', language: 'pt' }])).toBeNull();
  });
});

describe('findRegionalRelease', () => {
  it('pega a primeira data de cinema no Brasil e a classificação', () => {
    const r = findRegionalRelease(
      [
        { iso_3166_1: 'US', release_dates: [{ certification: 'PG', release_date: '2026-01-01T00:00:00Z', type: 3 }] },
        {
          iso_3166_1: 'BR',
          release_dates: [
            { certification: '', release_date: '2026-03-10T00:00:00Z', type: 4 },
            { certification: '14', release_date: '2026-02-05T00:00:00Z', type: 3 },
          ],
        },
      ],
      'BR',
    );
    expect(r).toEqual({ date: '2026-02-05', certification: '14' });
  });
});

describe('toPaged', () => {
  it('remove filmes repetidos e limita a 500 páginas', () => {
    const movie = { id: 1, title: 'A', original_title: 'A', overview: '', poster_path: null, backdrop_path: null, release_date: '', vote_average: 7.25, vote_count: 1, genre_ids: [] };
    const page = toPaged({ page: 1, total_pages: 9000, total_results: 2, results: [movie, movie] });
    expect(page.results).toHaveLength(1);
    expect(page.totalPages).toBe(500);
    expect(page.results[0]?.releaseDate).toBeNull();
  });
});
