import { useEffect, useState } from 'react';

/**
 * Observa se um elemento está visível na tela (IntersectionObserver).
 * É a peça do infinite scroll: um "sentinela" no fim da lista avisa quando aparece.
 *
 * Detalhe importante: usamos um *callback ref* (useState + setElement) em vez de useRef.
 * O sentinela só é renderizado depois que a primeira página chega; com useRef o efeito
 * rodaria antes, encontraria `null` e nunca mais observaria nada.
 *
 * `rootMargin: '600px'` dispara um pouco ANTES do fim, para a próxima página
 * já estar chegando quando o usuário alcançar o final.
 */
export function useInView<T extends Element>(options: IntersectionObserverInit = { rootMargin: '600px' }) {
  const [element, setElement] = useState<T | null>(null);
  const [inView, setInView] = useState(false);
  const { root, rootMargin, threshold } = options;

  useEffect(() => {
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setInView(Boolean(entry?.isIntersecting)), {
      root,
      rootMargin,
      threshold,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, root, rootMargin, threshold]);

  return { ref: setElement, inView };
}
