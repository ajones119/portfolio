import Game from './classes/Game';
import { getGameServerEndpoint } from '../shared/classes/gameServer';

const canvas = document.querySelector<HTMLCanvasElement>('.hangout-canvas');

if (canvas) {
  const game = new Game(canvas, getGameServerEndpoint());
  const destroy = () => void game.destroy();
  window.addEventListener('pagehide', destroy, { once: true });
  document.addEventListener('astro:before-swap', destroy, { once: true });
}
