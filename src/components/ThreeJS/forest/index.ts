import Experience from './classes/Experience';

const canvas = document.querySelector<HTMLCanvasElement>('.forest-canvas');

if (canvas) {
  const experience = new Experience(canvas);
  const destroy = () => experience.destroy();

  window.addEventListener('pagehide', destroy, { once: true });
  document.addEventListener('astro:before-swap', destroy, { once: true });
}
