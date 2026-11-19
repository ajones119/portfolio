# Aramis Jones Portfolio

A personal portfolio site made of interactive widgets and small multiplayer experiences.

## Place

**Canvas**:
The single shared, persistent grid of Pixels that every visitor to Place colors together.
_Avoid_: Board, grid, wall. Say "canvas element" when you mean the HTML `<canvas>`.

**Pixel**:
One cell of the Canvas, holding exactly one color at a time, or empty if nobody has painted it.
_Avoid_: Square, tile, cell

**Palette**:
The preset colors offered for a Placement. A visitor may also pick any other color with the custom color picker.
_Avoid_: Colors, swatches

**Placement**:
One visitor coloring one Pixel at one moment; the last Placement on a Pixel wins.
_Avoid_: Paint, write, move, edit

**Cooldown**:
The wait a visitor must serve after a Placement before they may make another.
_Avoid_: Timer, rate limit, delay

**Placement History**:
The record of the most recent Placements, kept for undoing vandalism and replaying the Canvas.
_Avoid_: Log, write history, audit trail
