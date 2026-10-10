import { type LitPlayerYoutube, LitPlayerYoutubeReact } from 'lit-player-youtube';
import { useEffect, useRef } from 'react';

/**
 * Player do YouTube com controles próprios (lib lit-player-youtube: um Web Component em Lit,
 * usado no React pelo wrapper oficial). Ocupa 100% do container pai.
 *
 * Contorno de um detalhe da lib: ela só cria o player quando recebe o aviso de "API do YouTube
 * pronta", e esse aviso acontece UMA vez por página. Como o modal desmonta o player ao fechar, na
 * segunda vez que alguém abre um trailer o aviso não vem de novo e o player ficaria em branco.
 * Então o TrailerModal deixa a API pronta antes (lib/youtubeApi.ts) e, assim que o player termina
 * de desenhar, nós mesmos pedimos para ele iniciar.
 *
 * Exportado como default para ser carregado com React.lazy (ver TrailerModal).
 */
export default function YoutubePlayer({ videoKey }: { videoKey: string }) {
  const ref = useRef<LitPlayerYoutube>(null);

  useEffect(() => {
    const player = ref.current;
    if (!player) return;
    let cancelled = false; // o StrictMode roda o efeito duas vezes; sem isso o player iniciaria em dobro
    void player.updateComplete.then(() => {
      if (cancelled || !window.YT?.loaded) return;
      (player as unknown as { onYouTubeIframeAPIReady(): void }).onYouTubeIframeAPIReady();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return <LitPlayerYoutubeReact ref={ref} video={`https://www.youtube.com/watch?v=${videoKey}`} />;
}
