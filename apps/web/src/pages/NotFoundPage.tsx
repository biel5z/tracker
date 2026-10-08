import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { EmptyState } from '../components/States.tsx';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-16">
      <EmptyState title="Página não encontrada" action={<Link to="/" className="btn-primary">Voltar ao início</Link>}>
        O endereço pode estar errado ou a página foi removida.
      </EmptyState>
    </div>
  );
}

/** Mostrado se algum componente quebrar durante a renderização (errorElement do roteador). */
export function RouteErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error) ? `${error.status} — ${error.statusText}` : error instanceof Error ? error.message : 'Erro desconhecido';
  return (
    <div className="mx-auto max-w-3xl px-4 pt-16">
      <EmptyState title="Algo quebrou nesta página" action={<a href="/" className="btn-primary">Recarregar o site</a>}>
        <code className="text-xs">{message}</code>
      </EmptyState>
    </div>
  );
}
