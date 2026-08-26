# Three.js Experience Architecture Resources

## Knowledge

- [Three.js Journey — Introduction (Bruno Simon)](https://threejs-journey.com/lessons/introduction)
  The course this `EventEmitter` + `Experience` pattern comes from. Use for: overall architecture context.
- [MDN — EventTarget](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget)
  Browser-native event API (`addEventListener`, `dispatchEvent`). Use for: comparing DOM events vs app-level pub/sub.
- [MDN — CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent)
  How to fire custom events on DOM nodes. Use for: understanding the built-in alternative to a custom class.

## Wisdom (Communities)

- [Three.js Discourse](https://discourse.threejs.org/)
  Official forum. Use for: architecture questions, performance, real-world Three.js patterns.
- [r/threejs](https://reddit.com/r/threejs)
  Active community. Use for: quick feedback on project structure and debugging.

## Gaps

- No single authoritative doc on the custom `EventEmitter` class itself — it is tutorial boilerplate, not a published library. This workspace's lessons and reference fill that gap.
