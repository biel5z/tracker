import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { useDragScroll } from './useDragScroll.ts';

// jsdom não implementa captura de ponteiro.
beforeAll(() => {
  Element.prototype.setPointerCapture ??= () => {};
});

function Row({ onOpen }: { onOpen: () => void }) {
  const ref = useDragScroll<HTMLDivElement>();
  return (
    <div ref={ref} data-testid="row">
      <button type="button" onClick={onOpen}>
        Filme
      </button>
    </div>
  );
}

function setup() {
  const onOpen = vi.fn();
  render(<Row onOpen={onOpen} />);
  const row = screen.getByTestId('row');
  // jsdom não rola de verdade: uma propriedade própria guarda o valor.
  Object.defineProperty(row, 'scrollLeft', { value: 100, writable: true });
  return { onOpen, row, card: screen.getByRole('button', { name: 'Filme' }) };
}

const mouse = { pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1 };

describe('useDragScroll', () => {
  it('arrastar com o mouse rola a faixa e não abre o filme ao soltar', async () => {
    const { onOpen, row, card } = setup();

    fireEvent.pointerDown(card, { ...mouse, clientX: 200 });
    fireEvent.pointerMove(card, { ...mouse, clientX: 150 });
    expect(row.scrollLeft).toBe(150);
    expect(row).toHaveAttribute('data-dragging');

    fireEvent.pointerUp(card, { ...mouse, buttons: 0, clientX: 150 });
    fireEvent.click(card);
    expect(onOpen).not.toHaveBeenCalled();
    expect(row).not.toHaveAttribute('data-dragging');

    // Depois do arrasto, os próximos cliques voltam a funcionar.
    await new Promise((resolve) => setTimeout(resolve));
    fireEvent.click(card);
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('um clique com tremidinha do mouse ainda abre o filme', () => {
    const { onOpen, row, card } = setup();

    fireEvent.pointerDown(card, { ...mouse, clientX: 200 });
    fireEvent.pointerMove(card, { ...mouse, clientX: 197 });
    fireEvent.pointerUp(card, { ...mouse, buttons: 0, clientX: 197 });
    fireEvent.click(card);

    expect(row.scrollLeft).toBe(100);
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('ignora o toque (no celular a rolagem já é nativa)', () => {
    const { row, card } = setup();
    const touch = { ...mouse, pointerType: 'touch' };

    fireEvent.pointerDown(card, { ...touch, clientX: 200 });
    fireEvent.pointerMove(card, { ...touch, clientX: 100 });

    expect(row.scrollLeft).toBe(100);
  });
});
