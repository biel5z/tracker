import { useEffect, useState } from 'react';

/**
 * Fica `true` só se `flag` continuar `true` por mais de `delay` ms.
 * Evita o "pisca-pisca" de skeleton quando a resposta vem rápido (do cache, por exemplo).
 */
export function useDelayedFlag(flag: boolean, delay = 200): boolean {
  const [delayed, setDelayed] = useState(false);
  useEffect(() => {
    if (!flag) {
      setDelayed(false);
      return;
    }
    const timer = setTimeout(() => setDelayed(true), delay);
    return () => clearTimeout(timer);
  }, [flag, delay]);
  return delayed;
}
