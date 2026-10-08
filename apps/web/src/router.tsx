import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout.tsx';
import { AboutPage } from './pages/AboutPage.tsx';
import { AgendaPage } from './pages/AgendaPage.tsx';
import { CatalogPage } from './pages/CatalogPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { ListsPage } from './pages/ListsPage.tsx';
import { MoviePage } from './pages/MoviePage.tsx';
import { NotFoundPage, RouteErrorPage } from './pages/NotFoundPage.tsx';
import { PersonPage } from './pages/PersonPage.tsx';
import { UpcomingPage } from './pages/UpcomingPage.tsx';

export const routes = [
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'estreias', element: <UpcomingPage /> },
      { path: 'catalogo', element: <CatalogPage /> },
      { path: 'filme/:id', element: <MoviePage /> },
      { path: 'pessoa/:id', element: <PersonPage /> },
      { path: 'listas', element: <ListsPage /> },
      { path: 'agenda', element: <AgendaPage /> },
      { path: 'sobre', element: <AboutPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
