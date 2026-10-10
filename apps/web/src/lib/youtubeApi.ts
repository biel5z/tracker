/**
 * Carrega a API de iframes do YouTube (uma vez por página) e avisa quando ela fica pronta.
 *
 * Por que carregar ANTES de montar o player: a lib lit-player-youtube também carrega essa API,
 * mas se ela ficar pronta antes de o player terminar de desenhar (acontece com a API em cache),
 * a lib tenta criar o vídeo num elemento que ainda não existe e loga um erro. Com a API pronta
 * de antemão, quem inicia o player é o YoutubePlayer, no momento certo.
 */
const API_SRC = 'https://www.youtube.com/iframe_api'; // mesma URL que a lib procura: assim ela não carrega de novo

type YoutubeWindow = Window & { YT?: { loaded?: number }; onYouTubeIframeAPIReady?: () => void };

let ready: Promise<void> | null = null;

export function loadYoutubeApi(): Promise<void> {
  const win = window as YoutubeWindow;
  if (win.YT?.loaded) return Promise.resolve();
  ready ??= new Promise((resolve) => {
    const previous = win.onYouTubeIframeAPIReady;
    win.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement('script');
    script.src = API_SRC;
    script.onerror = () => resolve(); // bloqueada (rede, adblock): segue, para o modal não ficar carregando para sempre
    document.head.appendChild(script);
  });
  return ready;
}
