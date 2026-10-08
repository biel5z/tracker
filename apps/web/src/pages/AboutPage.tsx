import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../components/States.tsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';
import { getJson } from '../lib/api.ts';

export function AboutPage() {
  useDocumentTitle('Sobre');
  const health = useQuery({ queryKey: ['health'], queryFn: ({ signal }) => getJson<{ ok: boolean; mode: string }>('/health', {}, signal) });

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 pt-10">
      <PageHeader title="Sobre e créditos" />

      <section className="space-y-3">
        <img src="/tmdb-logo.svg" alt="The Movie Database (TMDB)" className="h-6 w-auto" />
        <p className="text-soft">
          Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB. Títulos, sinopses, elenco, fotos e trailers vêm do{' '}
          <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" className="text-accent underline">
            The Movie Database
          </a>
          .
        </p>
        <p className="text-soft">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Onde assistir</h2>
        <p className="text-soft">
          As informações de streaming, aluguel e compra são fornecidas pela{' '}
          <a href="https://www.justwatch.com/br" target="_blank" rel="noreferrer" className="text-accent underline">
            JustWatch
          </a>
          , por meio do TMDB.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Sobre o projeto</h2>
        <p className="text-soft">
          Projeto de estudo: React, TypeScript, TanStack Query e um BFF em Node.js (Fastify). Suas listas e sua agenda ficam salvas apenas neste navegador.
        </p>
        <p className="text-sm text-muted">
          Fonte de dados atual:{' '}
          <strong className="text-white">
            {health.isPending ? '…' : health.data?.mode === 'mock' ? 'dados de exemplo (modo mock)' : health.data ? 'TMDB' : 'servidor indisponível'}
          </strong>
        </p>
      </section>
    </div>
  );
}
