---
name: mobile-game-ux
description: Mobile-first UI, navigation, touch input and performance rules for CIVITAS. Use when changing layout, menus, panels, modals, the HUD, map gestures, CSS media queries, or canvas rendering performance, and before shipping any UI change.
---

# Mobile game UX for CIVITAS

The reference bar is Mini Metro / Mini Motorways on a phone: the map fills the
screen, the HUD is a few icons, and everything is reachable with one thumb.

## Layout rules (portrait phone, 360–430 px wide)

- **Map ≥ 80% of the viewport.** Header + HUD together ≤ 72 px at the top; tool dock ≤ 72 px at the bottom. No marketing header (logo, version badge) inside the game screen.
- **One primary dock** at the bottom with ≤ 5 items. No horizontally scrolling tool strips: if items don't fit, group them into a sheet.
- **Secondary content in bottom sheets** (half-height, swipe to dismiss), never side drawers that cover the map edge-to-edge.
- **Every desktop feature must exist on mobile.** Check that each left-rail and right-tab section has a mobile route (e.g. Taxes, Stats, Chronicle, Identity).
- **Modals**: one decision per screen, cards stacked vertically or a carousel with clear page dots; never a card cut off at the screen edge without an affordance.
- **Home screen**: the primary action ("Found a city" / "Continue") must be above the fold at 390×844.

## Touch input

- Tap targets ≥ 44×44 px with ≥ 8 px spacing.
- Map gestures: one-finger drag = pan in explore mode, two-finger pinch = zoom, two-finger drag = pan in any mode. Tools that drag (zone, demolish) must not steal pan; consider a hold-to-draw or an explicit "draw" toggle.
- Track active pointers in a `Map<pointerId, point>` to support pinch; `touch-action: none` on the canvas.
- Confirm destructive actions with an undo toast rather than a dialog.
- Hover-only information (tooltips, coordinate readouts) needs a tap equivalent.

## Performance budget (mid-range Android, 4× CPU throttle in DevTools)

- Steady 30 fps at MAX speed with a 100k-pop city; no main-thread task > 50 ms.
- Cache static layers (terrain, fields, water, old buildings) in an offscreen canvas and redraw only when they change; draw animated things (boats, mills, captions) on a top layer.
- Run the simulation step off the render path (Web Worker, or at least decoupled from React state updates). Never trigger a React re-render per sim tick for the whole tree.
- Cap `devicePixelRatio` at 2 for the live map.
- Measure with the Long Tasks API in Playwright (see `headless-playtest`).

## Readability

- Body text ≥ 14 px on mobile, labels ≥ 12 px; nothing below 11 px.
- Show at most 3 numbers in the HUD (e.g. year, population, one resource). Everything else on demand.
- Use icons + colour on the map for state (needs, unrest) rather than panels of text.

## Verification

Screenshot every changed screen with Playwright at `devices['Pixel 7']` and
`devices['iPhone 13']`, plus 1440×900 desktop, and look at them before finishing.
