export type Action = 'pitchDown'|'pitchUp'|'yawLeft'|'yawRight'|'rollLeft'|'rollRight'|'boost'|'evade'|'brake'|'recenter'|'settings'|'fire'|'guided';
export interface GameSettings {
  version: 2;
  bindings: Record<Action, string>;
  mouseSensitivity: number;
  invertY: boolean;
  reticle: 'fixed'|'dynamic';
  masterVolume: number;
  effectsVolume: number;
  engineVolume: number;
  reducedMotion: boolean;
  cameraShake: number;
}
export const DEFAULT_SETTINGS: GameSettings = {
  version: 2,
  bindings: { pitchDown:'KeyW',pitchUp:'KeyS',yawLeft:'KeyA',yawRight:'KeyD',rollLeft:'KeyQ',rollRight:'KeyE',boost:'ShiftLeft',evade:'Space',brake:'ControlLeft',recenter:'KeyR',settings:'Escape',fire:'Mouse0',guided:'Mouse2' },
  mouseSensitivity: 1,
  invertY: false,
  reticle: 'dynamic',
  masterVolume: .8,
  effectsVolume: .8,
  engineVolume: .7,
  reducedMotion: false,
  cameraShake: .55,
};
const KEY = 'jelly-dogfight-settings';
export function loadSettings(): GameSettings { try { const value=JSON.parse(localStorage.getItem(KEY)??'null'); return value&&typeof value==='object'?validate(value):structuredClone(DEFAULT_SETTINGS); } catch { return structuredClone(DEFAULT_SETTINGS); } }
export function saveSettings(settings: GameSettings): void { localStorage.setItem(KEY, JSON.stringify(validate(settings))); }
export function resetSettings(): GameSettings { const settings=structuredClone(DEFAULT_SETTINGS); saveSettings(settings); return settings; }
export function rebind(settings: GameSettings, action: Action, code: string, swap=false): {settings:GameSettings;conflict?:Action} { const conflict=(Object.keys(settings.bindings)as Action[]).find(item=>item!==action&&settings.bindings[item]===code); if(conflict&&!swap)return{settings,conflict}; const next=structuredClone(settings); if(conflict)next.bindings[conflict]=next.bindings[action]; next.bindings[action]=code; saveSettings(next); return{settings:next}; }
function validate(value: any): GameSettings {
  const defaults=structuredClone(DEFAULT_SETTINGS),used=new Set<string>();
  if(value.bindings&&typeof value.bindings==='object')for(const action of Object.keys(defaults.bindings)as Action[]){const code=value.bindings[action];if(validBinding(code)&&!used.has(code)){defaults.bindings[action]=code;used.add(code)}else used.add(defaults.bindings[action]);}
  if(Number.isFinite(value.mouseSensitivity))defaults.mouseSensitivity=Math.max(.25,Math.min(2,value.mouseSensitivity));
  if(typeof value.invertY==='boolean')defaults.invertY=value.invertY;
  if(value.reticle==='fixed'||value.reticle==='dynamic')defaults.reticle=value.reticle;
  for(const key of ['masterVolume','effectsVolume','engineVolume','cameraShake']as const)if(Number.isFinite(value[key]))defaults[key]=Math.max(0,Math.min(1,value[key]));
  if(typeof value.reducedMotion==='boolean')defaults.reducedMotion=value.reducedMotion;
  return defaults;
}
function validBinding(value: unknown): value is string { return typeof value==='string'&&/^(Key[A-Z]|Digit\d|Arrow(Up|Down|Left|Right)|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Space|Escape|Enter|Tab|Backspace|Mouse[0-4])$/.test(value); }
