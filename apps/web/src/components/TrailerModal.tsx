import type { Video } from '@tracker/shared';
import { Dialog } from './Dialog.tsx';

/** Player do YouTube em modo "nocookie" (não grava cookies de rastreamento até dar play). */
export function TrailerModal({ video, open, onClose }: { video: Video | null; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open && Boolean(video)} onClose={onClose} title="Trailer" className="w-[min(94vw,64rem)] bg-black">
      {video && (
        <div className="aspect-video w-full">
          <iframe
            className="h-full w-full rounded-2xl"
            src={`https://www.youtube-nocookie.com/embed/${video.key}?autoplay=1&rel=0`}
            title={video.name || 'Trailer'}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      )}
    </Dialog>
  );
}
