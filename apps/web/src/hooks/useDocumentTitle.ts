import { useEffect } from 'react';

export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · Tracker de Estreias` : 'Tracker de Estreias';
  }, [title]);
}
