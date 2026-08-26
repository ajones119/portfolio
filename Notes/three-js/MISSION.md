# Mission: Three.js Experience Architecture

## Why
Build a contained Three.js scene for the portfolio using a clean class-based architecture (Experience, Sizes, Camera, Renderer, etc.) so modules stay decoupled and the scene is easy to extend without spaghetti imports.

## Success looks like
- Understand why classes extend `EventEmitter` and can wire up `on` / `trigger` confidently
- Resize, time, and resource loading propagate through the app without direct cross-imports
- Ship a working contained Three.js demo on the portfolio site

## Constraints
- Learning in the context of an Astro + TypeScript portfolio project
- Following the Three.js Journey / Bruno Simon class pattern already started in `containedProject/`

## Out of scope
- Replacing the pattern with a different state library (Redux, Zustand, etc.) for now
- Node.js `events` module internals
- Full Three.js rendering pipeline (materials, shaders) until architecture is solid
