# Soundscape audio loading handoff

## Goal

Turn `/soundscape` from a procedural synth demo into a layered D&D session soundscape with real environmental loops, chatter, dungeon-synth music, and a loading state while the active scene assets are prepared.

## Current implementation

- Route: `src/pages/soundscape.astro`
- React island: `src/components/Soundscape/Soundscape.tsx`
- Audio owner: `src/components/Soundscape/SoundscapeEngine.ts`
- State: `src/components/Soundscape/soundscapeState.ts`
- Visualizer: `src/components/Soundscape/SoundscapeVisualizer.ts`
- Styles: `src/components/Soundscape/soundscape.css`
- Audio drop folder: `public/soundscape/`
- Existing engine has procedural Tone.js core layers and Tone.Transport scheduling.
- Scene signals currently modify the procedural mix; they are not independent audio stems yet.
- A `Core layers` toggle now mutes/unmutes the procedural core without pausing the transport.
- `Pause` stops transport scheduling and fades all core audio to zero.

The original feature plan is available at `local://soundscape-plan.md`.

## Recommended audio model

Use a hybrid stem mixer:

- Real audio assets for environmental texture and chatter.
- Procedural Tone.js music for variation and reactive tension.
- Optional authored dungeon-synth loops for stronger musical identity.
- Independent gain nodes for each stem, grouped into environment, chatter, music, accents, and master buses.

Scene presets should define real stems rather than only changing shared oscillator parameters.

Example Dungeon preset:

- Low dungeon room tone
- Water drips
- Wind or underground rumble
- Distant chatter or muffled voices
- Dungeon-synth music
- Sparse chain, metal, or door accents

Example Campfire preset:

- Fire crackle
- Night insects
- Low party chatter
- Restrained music or drone
- Occasional branch snap

## Asset organization

Keep runtime-loaded audio under `public/soundscape/`:

```text
public/soundscape/
  dungeon/
    room-tone.ogg
    water-drips.ogg
    distant-chatter.ogg
    dungeon-synth-01.ogg
    chain-hit.ogg
  campfire/
    fire.ogg
    night-insects.ogg
    party-murmur.ogg
  wilderness/
  encounter/
```

Use compressed `.ogg` or `.mp3` files. Do not import every file into the JavaScript bundle. Keep source URL, creator, license, and download date in the manifest or a separate asset ledger.

## Manifest proposal

Add `public/soundscape/manifest.json`:

```json
{
  "version": 1,
  "scenes": {
    "dungeon": {
      "stems": [
        {
          "id": "room-tone",
          "kind": "environment",
          "url": "/soundscape/dungeon/room-tone.ogg",
          "loop": true,
          "gain": 0.45,
          "license": "CC0-1.0",
          "source": "SOURCE_URL",
          "creator": "CREATOR"
        }
      ]
    }
  }
}
```

Suggested `kind` values: `environment`, `chatter`, `music`, and `accent`.

## Loading screen behavior

Do not block the entire Astro page. Render the route and controls immediately, then show an audio loading state in the soundscape rail/stage while the selected preset is loading.

Recommended states:

- `idle`: no scene audio requested yet; show `Start soundscape`.
- `loading`: fetch manifest, decode active scene assets, and show progress text such as `Preparing dungeon layers · 2 of 5`.
- `ready`: enable transport and stem controls.
- `playing`: normal mixer state.
- `error`: keep controls usable and explain which asset failed; procedural fallback remains available.

Audio should begin only after the user presses `Start soundscape`, even if assets were preloaded. Loading can fetch/decode on scene selection, but Tone.js playback must still require the explicit user gesture.

## Loading implementation direction

1. Add typed manifest interfaces and a loader that validates the manifest shape.
2. Fetch the manifest once and cache it.
3. Resolve only the active scene’s stems.
4. Use `Tone.Player` or `Tone.Players` for loopable stems.
5. Decode assets after Start when browser autoplay/audio-context restrictions require it.
6. Report loaded/total progress to React.
7. Connect each stem through a typed bus and per-stem gain.
8. Crossfade scene changes over roughly 300–800 ms.
9. Keep procedural music as a fallback when an authored music asset is unavailable.
10. Dispose players and scheduled accent events during route cleanup.

## UI changes

Replace the ambiguous `core layers` status with explicit information:

- `3 music stems`
- `2 environment stems`
- `1 chatter stem`
- `Loading dungeon audio…`

Add independent stem controls only after the first three scene presets sound good. The high-level controls should remain:

- Intensity → energy and density
- Tension → scale, dissonance, filter brightness
- Activity → event/chatter/accent frequency
- Music ↔ Ambience → bus crossfade
- Volume → final master ceiling

## Asset sourcing guidance

Good starting points:

- OpenGameArt CC0 dungeon ambience and music
- Freesound with the CC0 filter for chatter, drips, rain, and one-shots
- Sonniss GDC bundles for larger royalty-free professional libraries

Verify every individual asset license. Do not assume that “free download” means commercial use is allowed.

## Acceptance criteria

- `/soundscape` renders before audio assets finish loading.
- Active scene loading reports useful progress and never starts audio automatically.
- Start waits for manifest/asset readiness, unlocks Tone, and starts only the selected stems.
- Pause stops scheduled events and fades every audible stem.
- Scene signals control independent audible stems, not only gain modifiers on one shared noise bed.
- Music and ambience buses crossfade without exceeding master volume.
- Failed optional assets do not break the page; the procedural fallback remains available.
- Route navigation destroys players, callbacks, and analyser resources.
- `npm run test:tic-tac-toe` continues to pass.
- `npm run build` should be rerun after implementation; current repository build is also blocked by the unrelated missing import `src/game/planes/main.ts -> ../shared/classes/gameServer`.
