# User questioned custom EventEmitter vs built-in JS events

The user asked why a custom `EventEmitter` class is needed when JavaScript already has event systems. They understand that DOM `addEventListener` exists but did not yet see the distinction between browser events and app-level pub/sub between plain classes.

**Implications:** Future lessons should always contrast DOM events (window resize) with app events (`sizes.trigger('resize')`) when teaching architecture. Do not assume the pub/sub pattern is obvious.
