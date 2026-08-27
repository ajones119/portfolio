import { ACESFilmicToneMapping, PCFShadowMap, SRGBColorSpace, WebGLRenderer } from 'three';
import type Game from './Game';

export default class Renderer {
  readonly instance: WebGLRenderer;
  private frames=0; private sampledAt=performance.now(); private adaptiveRatio=1;

  constructor(private readonly game: Game) {
    this.instance = new WebGLRenderer({ canvas: game.canvas, antialias: true });
    this.instance.outputColorSpace = SRGBColorSpace;
    this.instance.toneMapping = ACESFilmicToneMapping;
    this.instance.shadowMap.enabled = true;
    this.instance.shadowMap.type = PCFShadowMap;
    this.adaptiveRatio=Math.min(game.sizes.pixelRatio,2);
    this.resize();
  }

  resize(): void {
    this.instance.setSize(this.game.sizes.width, this.game.sizes.height);
    this.instance.setPixelRatio(this.adaptiveRatio);
  }

  render(): void {
    this.instance.render(this.game.scene, this.game.camera.instance);
    this.frames+=1;const now=performance.now();if(now-this.sampledAt>3000){const fps=this.frames*1000/(now-this.sampledAt);if(fps<48&&this.adaptiveRatio>1)this.adaptiveRatio=Math.max(1,this.adaptiveRatio-.25);else if(fps>58&&this.adaptiveRatio<Math.min(this.game.sizes.pixelRatio,2))this.adaptiveRatio=Math.min(this.game.sizes.pixelRatio,2,this.adaptiveRatio+.25);this.instance.setPixelRatio(this.adaptiveRatio);const stats=document.querySelector<HTMLElement>('[data-performance]');if(stats)stats.textContent=`${Math.round(fps)} FPS · ${this.instance.info.render.calls} draws · ${this.instance.info.memory.geometries} geo`;this.frames=0;this.sampledAt=now;}
  }

  destroy(): void {
    this.instance.dispose();
  }
}
