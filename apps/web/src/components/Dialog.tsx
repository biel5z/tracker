import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '../lib/cn.ts';
import { XIcon } from './icons.tsx';

/**
 * Modal usando o elemento nativo <dialog>: o navegador já cuida do foco,
 * da tecla Esc e de bloquear o resto da página. O conteúdo só é montado quando aberto
 * (assim o iframe do trailer para de tocar ao fechar).
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal?.();
    if (!open && dialog.open) dialog.close?.();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose(); // clique no fundo escuro fecha
      }}
      className={cn('m-auto w-[min(94vw,32rem)] rounded-2xl border border-line bg-surface p-0 text-soft shadow-2xl', className)}
    >
      {open && (
        <div className="relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-3 right-3 z-10 rounded-full bg-ink/70 p-1.5 text-white hover:bg-ink"
          >
            <XIcon size={18} />
          </button>
          {children}
        </div>
      )}
    </dialog>
  );
}
