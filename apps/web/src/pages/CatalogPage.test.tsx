import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { makeMovie, page, server } from '../test/server.ts';
import { renderRoute } from '../test/render.tsx';

describe('Catálogo', () => {
  it('busca por texto com debounce: uma requisição para a palavra inteira', async () => {
    const queries: Array<string | null> = [];
    server.use(
      http.get('/api/movies/discover', ({ request }) => {
        const q = new URL(request.url).searchParams.get('query');
        queries.push(q);
        return HttpResponse.json(page([makeMovie(q ? 2 : 1, { title: q ? `Resultado ${q}` : 'Popular' })]));
      }),
    );
    const { router } = renderRoute('/catalogo');
    await screen.findByRole('heading', { level: 3, name: 'Popular' });

    await userEvent.type(screen.getByPlaceholderText('Buscar por título…'), 'duna');
    expect(await screen.findByRole('heading', { level: 3, name: 'Resultado duna' }, { timeout: 2000 })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?q=duna');
    expect(queries.filter(Boolean)).toEqual(['duna']); // sem "d", "du", "dun"
  });

  it('lê os filtros direto da URL', async () => {
    let search = '';
    server.use(
      http.get('/api/movies/discover', ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json(page([makeMovie(1)], 2, 10));
      }),
    );
    renderRoute('/catalogo?genero=27&ano=2024&pagina=2');
    await screen.findByRole('heading', { level: 3, name: 'Filme 1' });
    expect(search).toContain('genre=27');
    expect(search).toContain('year=2024');
    expect(search).toContain('page=2');
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page');
  });

  it('mudar de página atualiza a URL', async () => {
    server.use(
      http.get('/api/movies/discover', ({ request }) => {
        const p = Number(new URL(request.url).searchParams.get('page'));
        return HttpResponse.json(page([makeMovie(p)], p, 5));
      }),
    );
    const { router } = renderRoute('/catalogo');
    await screen.findByRole('heading', { level: 3, name: 'Filme 1' });
    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    await waitFor(() => expect(router.state.location.search).toBe('?pagina=2'));
    expect(await screen.findByRole('heading', { level: 3, name: 'Filme 2' })).toBeInTheDocument();
  });
});
