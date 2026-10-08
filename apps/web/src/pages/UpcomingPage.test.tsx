import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { makeMovie, page, server } from '../test/server.ts';
import { renderRoute } from '../test/render.tsx';

describe('Estreias', () => {
  it('mostra skeleton, depois os filmes agrupados por data', async () => {
    server.use(
      http.get('/api/movies/upcoming', async () => {
        await new Promise((r) => setTimeout(r, 250));
        return HttpResponse.json(page([makeMovie(1, { releaseDate: '2030-01-10' }), makeMovie(2, { releaseDate: '2030-01-17' })]));
      }),
    );
    renderRoute('/estreias');

    expect(await screen.findByLabelText('Carregando filmes')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 3, name: 'Filme 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Filme 2' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2, name: /^Semana de/ })).toHaveLength(2); // um título por semana
  });

  it('carrega a próxima página ao clicar em "Carregar mais"', async () => {
    server.use(
      http.get('/api/movies/upcoming', ({ request }) => {
        const p = Number(new URL(request.url).searchParams.get('page'));
        return HttpResponse.json(page([makeMovie(p * 100)], p, 2));
      }),
    );
    renderRoute('/estreias');
    await screen.findByRole('heading', { level: 3, name: 'Filme 100' });
    await userEvent.click(screen.getByRole('button', { name: 'Carregar mais estreias' }));
    expect(await screen.findByRole('heading', { level: 3, name: 'Filme 200' })).toBeInTheDocument();
    expect(await screen.findByText('Você viu todas as estreias desse período.')).toBeInTheDocument();
  });

  it('o filtro de gênero vai para a URL e para a requisição', async () => {
    const requested: string[] = [];
    server.use(
      http.get('/api/movies/upcoming', ({ request }) => {
        requested.push(new URL(request.url).search);
        return HttpResponse.json(page([makeMovie(1)]));
      }),
    );
    const { router } = renderRoute('/estreias');
    await screen.findByRole('heading', { level: 3, name: 'Filme 1' });
    await userEvent.click(await screen.findByRole('button', { name: 'Terror' }));
    await waitFor(() => expect(router.state.location.search).toBe('?genero=27'));
    await waitFor(() => expect(requested.some((s) => s.includes('genre=27'))).toBe(true));
  });

  it('mostra erro com botão de tentar de novo', async () => {
    server.use(http.get('/api/movies/upcoming', () => HttpResponse.json({ statusCode: 502, error: 'Bad Gateway', message: 'TMDB fora do ar' }, { status: 502 })));
    renderRoute('/estreias');
    expect(await screen.findByText('TMDB fora do ar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });

  it('infinite scroll: quando o sentinela aparece, busca a próxima página sozinho', async () => {
    // Observer falso que diz "está visível" assim que começa a observar.
    class VisibleObserver {
      constructor(private callback: IntersectionObserverCallback) {}
      observe(target: Element) {
        this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    vi.stubGlobal('IntersectionObserver', VisibleObserver);
    server.use(
      http.get('/api/movies/upcoming', ({ request }) => {
        const p = Number(new URL(request.url).searchParams.get('page'));
        return HttpResponse.json(page([makeMovie(p * 100)], p, 3));
      }),
    );
    renderRoute('/estreias');
    expect(await screen.findByRole('heading', { level: 3, name: 'Filme 100' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 3, name: 'Filme 300' }, { timeout: 3000 })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
