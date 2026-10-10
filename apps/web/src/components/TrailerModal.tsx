import type { Video } from '@tracker/shared';
import { lazy, Suspense } from 'react';
import { loadYoutubeApi } from '../lib/youtubeApi.ts';
import { Dialog } from './Dialog.tsx';

// Carregado sob demanda: o player (Lit + API do YouTube) só é baixado quando alguém abre um trailer.
// A API do YouTube vem junto, em paralelo, e precisa estar pronta antes de o player montar.
const YoutubePlayer = lazy(async () => {
  const [module] = await Promise.all([import('./YoutubePlayer.tsx'), loadYoutubeApi()]);
  return module;
});

export function TrailerModal({ video, open, onClose }: { video: Video | null; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open && Boolean(video)} onClose={onClose} title="Trailer" className="w-[min(94vw,64rem)] bg-black">
      {video && (
        <div className="aspect-video w-full overflow-hidden rounded-2xl">
          <Suspense fallback={<div className="skeleton h-full w-full rounded-none" />}>
            {/* key: se o trailer mudar com o modal aberto, monta um player novo. */}
            <YoutubePlayer key={video.key} videoKey={video.key} />
          </Suspense>
        </div>
      )}
    </Dialog>
  );
}
