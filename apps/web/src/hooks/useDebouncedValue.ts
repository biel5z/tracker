import { useEffect, useState } from 'react';

/**
 * Devolve `value` só depois que ele parar de mudar por `delay` ms.
 * Na busca por texto: digitar "batman" faz UMA requisição, não seis.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer); // cada tecla cancela o timer anterior
  }, [value, delay]);
  return debounced;
}
