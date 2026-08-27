import { Vector3, type PerspectiveCamera, type Scene } from 'three';
import Player from './Player';
import type { PlayerSnapshot } from './GameClient';

export default class NetworkPlayers {
  private readonly players = new Map<string, Player>();
  private localSnapshot?: PlayerSnapshot;

  constructor(private readonly scene: Scene) {}

  add(snapshot: PlayerSnapshot): void {
    this.remove(snapshot.id);
    if (snapshot.isLocal) this.localSnapshot = snapshot;
    const player = new Player(snapshot);
    this.players.set(snapshot.id, player);
    this.scene.add(player.group);
  }

  update(snapshot: PlayerSnapshot): void {
    if (snapshot.isLocal) this.localSnapshot = snapshot;
    this.players.get(snapshot.id)?.applySnapshot(snapshot);
  }

  updatePlayers(deltaSeconds: number, reducedMotion = false): void {
    this.players.forEach((player) => player.update(deltaSeconds, reducedMotion));
  }

  react(playerId: string | undefined, type: 'hit'|'collision'|'knockout'|'crash'|'respawn'): void {
    if (playerId) this.players.get(playerId)?.react(type);
  }

  updateRemoteHealthBars(camera: PerspectiveCamera, serverTime: number): void {
    const direction = new Vector3(); camera.getWorldDirection(direction);
    const toPlayer = new Vector3();
    this.players.forEach((player) => {
      toPlayer.copy(player.group.position).sub(camera.position);
      const distance = toPlayer.length();
      const targeted = distance > 0 && distance < 70 && toPlayer.multiplyScalar(1 / distance).dot(direction) > .985;
      player.setHealthContext(targeted, serverTime);
    });
  }

  getLocal(): Player | undefined {
    return [...this.players.values()].find((player) => player.isLocal);
  }
  getLocalSnapshot(): PlayerSnapshot | undefined { return this.localSnapshot; }
  getPosition(id: string | undefined): Vector3 | undefined { return id ? this.players.get(id)?.group.position.clone() : undefined; }

  remove(id: string): void {
    const player = this.players.get(id);
    if (!player) return;
    player.destroy();
    this.players.delete(id);
    if (this.localSnapshot?.id === id) this.localSnapshot = undefined;
  }

  destroy(): void {
    this.players.forEach((player) => player.destroy());
    this.players.clear();
  }
}
