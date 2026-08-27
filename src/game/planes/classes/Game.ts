import { Scene } from 'three';
import { Sizes, Time } from '../../../components/ThreeJS/shared/runtime';
import Camera from './Camera';
import Controls from './Controls';
import GameClient, { type ConnectionStatus, type GuestIdentity, type PlayerSnapshot } from './GameClient';
import Renderer from './Renderer';
import World from './World';
import CombatObjects from './CombatObjects';
import AudioDirector from './AudioDirector';
import ComicEffects from './ComicEffects';
import { getGuestIdentity, normalizeDisplayName, saveGuestIdentity } from '../../shared/classes/guestIdentity';

export default class Game {
  readonly scene = new Scene();
  readonly sizes = new Sizes();
  readonly time = new Time();
  readonly camera: Camera;
  readonly renderer: Renderer;
  readonly world: World;
  readonly combatObjects: CombatObjects;
  readonly controls: Controls;
  readonly audio: AudioDirector;
  readonly effects: ComicEffects;
  private readonly gameClient: GameClient;
  private readonly identity: GuestIdentity;
  private readonly nameInput: HTMLInputElement | null;
  private destroyed = false;
  private serverTime = 0;

  constructor(readonly canvas: HTMLCanvasElement, endpoint: string) {
    this.camera = new Camera(this.sizes);
    this.world = new World(this.scene);
    this.combatObjects = new CombatObjects(this.scene);
    this.renderer = new Renderer(this);
    this.audio = new AudioDirector();
    this.effects = new ComicEffects(this.scene, this.camera.instance);
    this.gameClient = new GameClient(endpoint);
    this.identity = getGuestIdentity();
    this.nameInput = document.querySelector<HTMLInputElement>('[data-username-input]');
    if (this.nameInput) {
      this.nameInput.value = this.identity.displayName;
      this.nameInput.addEventListener('keydown', this.onNameKeyDown);
      this.nameInput.addEventListener('blur', this.commitDisplayName);
    }
    this.camera.setObstacles(this.world.cameraObstacles);
    this.controls = new Controls(this.canvas, this.camera, (command) => this.gameClient.setInput(command), (open) => {
      document.querySelector<HTMLElement>('[data-settings-panel]')?.toggleAttribute('hidden', !open);
    });
    this.gameClient.setListeners({
      playerAdded: (player) => {
        this.world.networkPlayers.add(player);
      },
      playerChanged: (player) => this.world.networkPlayers.update(player),
      playerRemoved: (id) => {
        this.world.networkPlayers.remove(id);
      },
      playersChanged: this.renderRoster,
      combatChanged: (pellets, targets, serverTime) => { this.serverTime=serverTime; this.combatObjects.sync(pellets, targets); this.renderCombatHud(serverTime); },
      combatEvent: (event) => {
        const type=event.type==='plane-hit'?(event.kind==='collision'?'collision':'hit'):event.type;
        if(type==='hit'||type==='collision'||type==='knockout'||type==='crash'||type==='respawn')this.world.networkPlayers.react(event.playerId,type);
        const position=this.world.networkPlayers.getPosition(event.playerId);
        this.effects.event(event,position,this.controls.settings.reducedMotion);
        this.audio.event(event,this.controls.settings);
        if(event.playerId===this.world.networkPlayers.getLocalSnapshot()?.id&&['plane-hit','crash','respawn'].includes(event.type))this.camera.shake(event.type==='crash'?.9:.35);
      },
      status: this.setStatus,
    });
    this.sizes.on('resize', this.resize);
    this.time.on('tick', this.update);
    void this.gameClient.connect(this.identity);
  }

  async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;
    this.sizes.destroy();
    this.time.destroy();
    this.controls.destroy();
    this.nameInput?.removeEventListener('keydown', this.onNameKeyDown);
    this.nameInput?.removeEventListener('blur', this.commitDisplayName);
    await this.gameClient.destroy();
    this.world.destroy();
    this.combatObjects.destroy();
    this.effects.destroy();
    this.audio.destroy();
    document.querySelector('[data-combat-hud]')?.replaceChildren();
    this.renderer.destroy();
  }

  private resize = (): void => {
    this.camera.resize();
    this.renderer.resize();
  };

  private update = (): void => {
    const deltaSeconds = Math.min(this.time.delta / 1000, 0.05);
    this.controls.update(this.time.current);
    this.camera.setTarget(this.world.networkPlayers.getLocal()?.group ?? null);
    this.camera.update(deltaSeconds,this.controls.settings.cameraShake,this.controls.settings.reducedMotion);
    this.world.update(deltaSeconds,this.controls.settings.reducedMotion);
    this.combatObjects.update(deltaSeconds,this.controls.settings.reducedMotion);
    const local=this.world.networkPlayers.getLocalSnapshot();
    this.effects.update(local,this.controls.settings.reducedMotion);
    this.audio.update(local,this.controls.settings);
    this.world.networkPlayers.updateRemoteHealthBars(this.camera.instance, this.serverTime);
    this.renderer.render();
  };

  private setStatus = (status: ConnectionStatus, detail?: string): void => {
    const element = document.querySelector<HTMLElement>('[data-connection-status]');
    if (!element) return;
    const labels: Record<ConnectionStatus, string> = {
      connecting: 'Connecting…',
      connected: 'Connected',
      reconnecting: 'Reconnecting…',
      full: 'This room is full',
      failed: 'Could not connect',
    };
    element.dataset.status = status;
    element.textContent = detail && status === 'failed' ? `${labels[status]} — ${detail}` : labels[status];
  };

  private renderRoster = (players: PlayerSnapshot[]): void => {
    const sorted = [...players].sort((first, second) => {
      if (first.isLocal !== second.isLocal) return first.isLocal ? -1 : 1;
      return first.displayName.localeCompare(second.displayName);
    });
    const count = document.querySelector<HTMLElement>('[data-player-count]');
    if (count) count.textContent = `${sorted.length} / 8 online`;
    const roster = document.querySelector<HTMLElement>('[data-player-roster]');
    if (!roster) return;
    roster.replaceChildren(...sorted.map((player) => {
      const item = document.createElement('li');
      const dot = document.createElement('span');
      const name = document.createElement('span');
      dot.className = 'roster-dot';
      dot.style.backgroundColor = player.color;
      name.textContent = player.isLocal ? `${player.displayName} (you)` : player.displayName;
      item.append(dot, name);
      return item;
    }));
  };

  private renderCombatHud = (serverTime: number): void => {
    const local=this.world.networkPlayers.getLocalSnapshot();if(!local)return;
    const hangout=document.querySelector<HTMLElement>('.hangout');if(hangout){hangout.dataset.flightStatus=local.altitudeFrozen?'frozen':local.flightStatus;hangout.toggleAttribute('data-overheated',local.overheated)}
    const health=document.querySelector<HTMLElement>('[data-health-fill]'),heat=document.querySelector<HTMLElement>('[data-heat-fill]');
    if(health)health.style.width=`${local.health}%`;if(heat)heat.style.width=`${local.weaponHeat*100}%`;
    const healthValue=document.querySelector<HTMLElement>('[data-health-value]'),heatValue=document.querySelector<HTMLElement>('[data-heat-value]');
    if(healthValue)healthValue.textContent=String(Math.ceil(local.health));if(heatValue)heatValue.textContent=`${Math.round(local.weaponHeat*100)}%`;
    const status=document.querySelector<HTMLElement>('[data-flight-state]');if(status)status.textContent=local.overheated?'OVERHEATED':local.spawnProtectedUntil>serverTime?'SPAWN SHIELD':local.altitudeFrozen?'ENGINE FROZEN':local.flightStatus==='disabled'?'MAYDAY!':local.flightStatus==='pancaked'?'PANCAKED':local.overdriveEndsAt>serverTime?'RING OVERDRIVE':'CRUISE';
    const boost=document.querySelector<HTMLElement>('[data-boost-cooldown]'),evade=document.querySelector<HTMLElement>('[data-evade-cooldown]');if(boost)boost.textContent=local.boostReadyAt>serverTime?`${(local.boostReadyAt-serverTime).toFixed(1)}s`:'READY';if(evade)evade.textContent=local.evadeReadyAt>serverTime?`${(local.evadeReadyAt-serverTime).toFixed(1)}s`:'READY';
  };

  private onNameKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') this.nameInput?.blur();
  };

  private commitDisplayName = (): void => {
    if (!this.nameInput) return;
    const displayName = normalizeDisplayName(this.nameInput.value);
    const error = document.querySelector<HTMLElement>('[data-name-error]');
    if (!displayName) {
      this.nameInput.value = this.identity.displayName;
      if (error) error.textContent = 'Use 2–24 letters, numbers, spaces, _ or -.';
      return;
    }
    if (error) error.textContent = '';
    this.identity.displayName = displayName;
    this.nameInput.value = displayName;
    saveGuestIdentity(this.identity);
    this.gameClient.setDisplayName(displayName);
  };
}
