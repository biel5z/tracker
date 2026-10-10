import { useCallback } from 'react';

/** Quantos pixels o mouse precisa andar para virar "arrasto" (abaixo disso é só um clique). */
const DRAG_THRESHOLD = 6;

/**
 * "Segurar e arrastar" para rolar uma faixa horizontal com o mouse (desktop).
 * No celular o dedo já rola a faixa nativamente, então só reagimos a `pointerType === 'mouse'`.
 *
 * Como funciona:
 * - Apertou o botão: guarda a posição inicial. Ainda não é arrasto (pode ser um clique no filme).
 * - Andou mais que alguns pixels: virou arrasto. Capturamos o ponteiro (o arrasto continua mesmo
 *   se o mouse sair da faixa) e desligamos o scroll-snap, que "brigaria" com a rolagem manual.
 * - Soltou: religa o snap e engole o clique que o navegador dispara logo em seguida;
 *   senão, soltar o mouse em cima de um card abriria o filme.
 *
 * Retorna um callback ref estável (no React 19 o ref pode devolver uma função de limpeza).
 * O visual (cursor de "mãozinha") fica na classe `drag-scroll` do index.css.
 */
export function useDragScroll<T extends HTMLElement>() {
  return useCallback((el: T | null) => {
    if (!el) return;

    let pointerId: number | null = null;
    let startX = 0;
    let startScroll = 0;
    let dragging = false;
    let suppressClick = false;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startScroll = el.scrollLeft;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      if ((event.buttons & 1) === 0) {
        pointerId = null; // soltou fora da faixa antes de virar arrasto
        return;
      }
      const dx = event.clientX - startX;
      if (!dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD) return;
        dragging = true;
        el.setPointerCapture(event.pointerId);
        el.style.scrollSnapType = 'none';
        el.dataset.dragging = '';
      }
      el.scrollLeft = startScroll - dx;
    };

    const onPointerEnd = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      if (!dragging) return;
      dragging = false;
      el.style.scrollSnapType = '';
      delete el.dataset.dragging;
      // O clique chega na mesma "rodada" do pointerup; o setTimeout libera os próximos.
      suppressClick = true;
      setTimeout(() => (suppressClick = false));
    };

    const onClick = (event: MouseEvent) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
    };

    // Sem isso, arrastar em cima de um link/imagem inicia o "arrastar e soltar" nativo do navegador.
    const onDragStart = (event: DragEvent) => event.preventDefault();

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerEnd);
    el.addEventListener('pointercancel', onPointerEnd);
    el.addEventListener('click', onClick, true); // fase de captura: antes do <Link> receber o clique
    el.addEventListener('dragstart', onDragStart);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerEnd);
      el.removeEventListener('pointercancel', onPointerEnd);
      el.removeEventListener('click', onClick, true);
      el.removeEventListener('dragstart', onDragStart);
    };
  }, []);
}
