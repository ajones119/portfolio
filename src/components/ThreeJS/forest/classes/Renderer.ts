import {
  ACESFilmicToneMapping,
  PCFShadowMap,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import type Experience from './Experience';

export default class Renderer {
  readonly instance: WebGLRenderer;

  constructor(private readonly experience: Experience) {
    this.instance = new WebGLRenderer({ canvas: experience.canvas, antialias: true });
    this.instance.outputColorSpace = SRGBColorSpace;
    this.instance.toneMapping = ACESFilmicToneMapping;
    this.instance.toneMappingExposure = 1.08;
    this.instance.shadowMap.enabled = true;
    this.instance.shadowMap.type = PCFShadowMap;
    this.resize();

    experience.debug.ui?.add(this.instance, 'toneMappingExposure', 0.4, 2, 0.01).name('exposure');
  }

  resize(): void {
    this.instance.setSize(this.experience.sizes.width, this.experience.sizes.height);
    this.instance.setPixelRatio(this.experience.sizes.pixelRatio);
  }

  render(): void {
    this.instance.render(this.experience.scene, this.experience.camera.instance);
  }

  destroy(): void {
    this.instance.dispose();
  }
}
