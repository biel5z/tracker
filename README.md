# Tracker de Estreias 🎬

Catálogo de filmes com foco nas **estreias nos cinemas do Brasil**: filmes em cartaz, catálogo completo com filtros, elenco com fotos, trailers, listas pessoais e agenda de cinema (exporta `.ics`).

Resumo em linguagem simples (sem termos técnicos): [`docs/Resumo do projeto.pdf`](docs/Resumo%20do%20projeto.pdf) e [`docs/Visual e referencias.pdf`](docs/Visual%20e%20referencias.pdf).

Dados: [TMDB](https://www.themoviedb.org/). Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.

---

## 1. O que instalar (uma vez só)

| O quê | Versão | Onde |
| --- | --- | --- |
| **Node.js** | 22 LTS ou mais novo (mínimo 22.12) | https://nodejs.org → botão "LTS" |
| **Token do TMDB** | gratuito | https://www.themoviedb.org/settings/api → copie o **API Read Access Token** (o token longo) |

Para conferir o Node: `node -v` no terminal.

## 2. Configurar o token

1. Na pasta `apps/api`, copie o arquivo `.env.example` e renomeie a cópia para `.env`.
2. Abra o `.env` e cole o token em `TMDB_TOKEN=`.

> Sem token o projeto também roda, com **dados de exemplo** (modo mock). Bom para testar a interface.

## 3. Rodar

No terminal, dentro da pasta do projeto (`C:\Dev\tracker`):

```bash
npm install        # baixa as dependências (só na primeira vez ou quando mudar o package.json)
npm run dev        # sobe o BFF (porta 3333) e o site (porta 5173)
```

Abra **http://localhost:5173**.

### Outros comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev:mock` | Igual ao `dev`, mas força os dados de exemplo (sem chamar o TMDB) |
| `npm test` | Roda todos os testes (BFF + front) |
| `npm run typecheck` | Confere os tipos TypeScript |
| `npm run build` | Gera o site otimizado em `apps/web/dist` |
| `npm start` | Sobe só o BFF, que também serve o site já buildado → http://localhost:3333 |

---

## Estrutura

```text
tracker/
├─ apps/
│  ├─ api/                     # BFF: Node + Fastify (esconde o token, faz cache)
│  │  ├─ src/
│  │  │  ├─ server.ts          # sobe o servidor
│  │  │  ├─ app.ts             # monta o Fastify + tratamento de erros
│  │  │  ├─ cache.ts           # cache em memória com TTL e deduplicação
│  │  │  ├─ routes/movies.ts   # rotas /api/* com validação Zod
│  │  │  └─ tmdb/
│  │  │     ├─ client.ts       # HTTP do TMDB com retry/backoff e timeout
│  │  │     ├─ schemas.ts      # formato esperado das respostas (Zod)
│  │  │     ├─ mappers.ts      # converte TMDB → tipos do projeto
│  │  │     ├─ service.ts      # regras: quais endpoints, filtros e TTL de cache
│  │  │     └─ mock.ts         # TMDB falso para testes e modo mock
│  │  └─ test/                 # testes do BFF (Vitest)
│  └─ web/                     # Front: React + Vite + TanStack Query + Tailwind
│     └─ src/
│        ├─ pages/             # Home, Estreias, Catálogo, Filme, Pessoa, Listas, Agenda, Sobre
│        ├─ components/        # MovieCard, skeletons, Pagination, TrailerModal, YoutubePlayer…
│        ├─ hooks/             # useDebouncedValue, useInView, useDelayedFlag, useDragScroll
│        └─ lib/               # api.ts, queries.ts, library.ts (localStorage), ics.ts, format.ts, youtubeApi.ts
└─ packages/
   └─ shared/                  # tipos usados pelos dois lados
```

### Rotas do BFF

| Rota | Usa no TMDB |
| --- | --- |
| `GET /api/movies/upcoming?genre&days&sort&page` | `/discover/movie` com `region=BR` e `with_release_type=2\|3` |
| `GET /api/movies/now-playing` | `/movie/now_playing` |
| `GET /api/movies/trending` | `/trending/movie/week` |
| `GET /api/movies/discover?query&genre&year&minRating&sort&page` | `/search/movie` (com texto) ou `/discover/movie` |
| `GET /api/movies/:id` | `/movie/{id}?append_to_response=credits,videos,release_dates,watch/providers,similar` |
| `GET /api/people/:id` | `/person/{id}?append_to_response=movie_credits,images` |
| `GET /api/genres` | `/genre/movie/list` |

---

## Onde está cada conceito do desafio

| Conceito | Arquivo |
| --- | --- |
| Consumo assíncrono + cancelamento (`AbortSignal`) | `apps/web/src/lib/api.ts`, `lib/queries.ts` |
| Query keys e cache no cliente | `apps/web/src/lib/queries.ts`, `main.tsx` |
| **Infinite scroll** (`useInfiniteQuery` + sentinela) | `apps/web/src/pages/UpcomingPage.tsx`, `hooks/useInView.ts` |
| **Paginação numerada** | `apps/web/src/pages/CatalogPage.tsx`, `components/Pagination.tsx` |
| **Loading skeletons** | `components/MovieCard.tsx` (`MovieCardSkeleton`), `hooks/useDelayedFlag.ts` |
| **Filtros dinâmicos na URL** + debounce | `pages/CatalogPage.tsx`, `hooks/useDebouncedValue.ts` |
| Prefetch ao passar o mouse | `components/MovieCard.tsx` |
| **Segurar e arrastar** os carrosséis com o mouse | `hooks/useDragScroll.ts`, classe `drag-scroll` em `index.css` |
| Carregamento sob demanda (`React.lazy`) do player de trailer | `components/TrailerModal.tsx`, `components/YoutubePlayer.tsx` |
| Retry com backoff (429/5xx) | `apps/api/src/tmdb/client.ts`, `apps/web/src/main.tsx` |
| Cache com TTL + deduplicação | `apps/api/src/cache.ts` |
| Validação de resposta externa | `apps/api/src/tmdb/schemas.ts` |
| Estado global simples (`useSyncExternalStore`) | `apps/web/src/lib/library.ts` |
| Testes com API simulada (MSW) | `apps/web/src/pages/*.test.tsx` |

## Decisão: sem banco de dados

As listas e a agenda ficam salvas no navegador de cada pessoa (`localStorage`). Um banco de dados exigiria login e um serviço de banco hospedado, o que não compensa para um site de estudo e de informação. A contrapartida é que as listas não acompanham a pessoa de um aparelho para outro.

## Carrosséis e trailers

- **Carrosséis** (filmes, elenco, fotos): no computador, dá para segurar com o mouse e arrastar para os lados, sem precisar da barra de rolagem. Um clique simples continua abrindo o filme. No celular, o dedo já rola normalmente.
- **Trailers**: tocam no player [`lit-player-youtube`](https://www.npmjs.com/package/lit-player-youtube), com controles próprios por cima do vídeo do YouTube. O player só é baixado quando alguém abre um trailer, e o vídeo **não começa sozinho** (é preciso clicar no play).
- A lib só inicia o player quando a API do YouTube avisa que está pronta, e esse aviso acontece uma vez por página. Por isso o projeto carrega a API antes (`lib/youtubeApi.ts`) e inicia o player por conta própria (`components/YoutubePlayer.tsx`). Sem isso, o trailer ficaria em branco a partir da segunda vez que fosse aberto.

## Publicar no Netlify

O site (React) é servido pelo Netlify, e o BFF roda como **Netlify Function** (`apps/web/netlify/functions/api.mts`), reaproveitando o mesmo código de `apps/api`. A configuração está em `apps/web/netlify.toml`.

1. Suba o projeto para um repositório no GitHub (o `.env` fica de fora automaticamente).
2. No Netlify: **Add new project → Import an existing project → GitHub** e escolha o repositório.
3. Em **Site/Project to deploy**, escolha **`@tracker/web`**. As configurações de build são lidas do `netlify.toml`.
4. Antes de publicar, em **Environment variables**, adicione `TMDB_TOKEN` com o seu token (escopo que inclua **Functions**).
5. Clique em **Deploy**. A cada `git push`, o Netlify publica de novo sozinho.

Sem o `TMDB_TOKEN`, o site publicado mostra os dados de exemplo.
