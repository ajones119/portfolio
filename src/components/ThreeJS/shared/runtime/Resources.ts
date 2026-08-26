import { CubeTexture, CubeTextureLoader, Texture, TextureLoader } from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import EventEmitter from "./EventEmitter";

export type Source =
  | { name: string; type: "texture"; path: string }
  | { name: string; type: "cubeTexture"; path: string[] }
  | { name: string; type: "gltfModel"; path: string };

export type ResourceItem = Texture | CubeTexture | GLTF;

export default class Resources extends EventEmitter {
  readonly items: Record<string, ResourceItem> = {};
  readonly toLoad: number;
  loaded = 0;

  private readonly textureLoader = new TextureLoader();
  private readonly cubeTextureLoader = new CubeTextureLoader();
  private readonly gltfLoader = new GLTFLoader();

  constructor(private readonly sources: Source[]) {
    super();
    this.toLoad = sources.length;

    if (this.toLoad === 0) {
      queueMicrotask(() => this.emit("loaded"));
      return;
    }

    this.startLoading();
  }

  get<T extends ResourceItem>(name: string): T {
    const item = this.items[name];
    if (!item) throw new Error(`Resource has not been loaded: ${name}`);
    return item as T;
  }

  private startLoading(): void {
    for (const source of this.sources) {
      const onError = (error: unknown) => this.sourceFailed(source, error);

      if (source.type === "texture") {
        this.textureLoader.load(
          source.path,
          (file) => this.sourceLoaded(source, file),
          undefined,
          onError,
        );
      } else if (source.type === "cubeTexture") {
        this.cubeTextureLoader.load(
          source.path,
          (file) => this.sourceLoaded(source, file),
          undefined,
          onError,
        );
      } else {
        this.gltfLoader.load(
          source.path,
          (file) => this.sourceLoaded(source, file),
          undefined,
          onError,
        );
      }
    }
  }

  private sourceLoaded(source: Source, file: ResourceItem): void {
    this.items[source.name] = file;
    this.markComplete();
  }

  private sourceFailed(source: Source, error: unknown): void {
    const loadError = error instanceof Error
      ? error
      : new Error(`Failed to load resource: ${source.name}`);
    this.emit("error", [source, loadError]);
    this.markComplete();
  }

  private markComplete(): void {
    this.loaded += 1;
    if (this.loaded === this.toLoad) this.emit("loaded");
  }
}
