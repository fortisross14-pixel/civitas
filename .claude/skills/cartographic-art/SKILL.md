---
name: cartographic-art
description: Art direction for the CIVITAS map renderer (src/render.js) — top-down "old surveyed map" style, building silhouettes, roofs, era palettes, countryside, water, lettering. Use when touching render.js, CityMap.jsx, Timelapse.jsx, map colours, building shapes or any visual polish task.
---

# Cartographic art direction

Target look: a hand-coloured historical city plan seen straight down (think
Braun & Hogenberg plans flattened to plan view, Nolli's map of Rome, 19th-century
Ordnance Survey town plans, Dutch polder maps), rendered with modern clarity.
Clean like Mini Metro, warm like an atlas.

## Principles

1. **Silhouette over rectangle.** No building should read as a plain filled square. Every footprint gets at least one of: a ridge line, a two-tone roof (lit and shaded slopes), an L/U/courtyard shape, a notch or annex, a tower.
2. **Figure–ground.** Buildings are the darkest, most saturated element; streets are the lightest; fields are mid-tone and low contrast. Keep this hierarchy in every era and layer.
3. **Hierarchy of scale.** Landmarks (cathedral, town hall, station, university) must be recognisable shapes 2–6× a house, with their own silhouettes (cross plan, dome, train shed, quad). The player should find them without labels.
4. **The map ages.** Each era changes the whole map, not only new buildings: palette, line weight, field pattern, labelling style. Medieval = sepia ink and strip fields; early modern = engraving hatching and polders; industrial = lithograph colours, railways, smoke; modern = cleaner survey colours, ring roads, parks.
5. **The countryside evolves.** Fields consolidate over time (strips → enclosed fields → large modern parcels), woods shrink, hedges appear and disappear, suburbs eat farmland. A static countryside makes 700 years feel like 7.
6. **Light from the top-left**, consistent across all shadows and roof shading.
7. **Restraint.** ≤ 8 roof colours per era, one accent red. Noise and jitter are seeded per building so redraws are stable.

## Building recipe (plan view, canvas 2D)

- Gable roof: rectangle split along the ridge into a lit half (+12% lightness) and shaded half (−12%), 1 px ridge line in a darker tone.
- Hip roof: four triangles/trapezoids meeting at a short ridge, lit/shaded by orientation.
- Courtyard block: outer polygon minus inner rectangle, roof shading toward the courtyard.
- Row houses: one strip divided by thin party-wall lines with slight height/colour variation per plot.
- Workshops/factories: sawtooth roof = repeated narrow strips alternating light/dark; chimneys as small dark circles with a smoke wisp layer.
- Churches: cross-shaped nave + transept, a square tower at the west end, apse at the east.
- Soft drop shadow offset (+1.5, +1.5) px at zoom 1, scaled with zoom, 20–30% alpha.

## Process

- Prototype new shapes in a standalone HTML canvas page first, then port to `render.js`.
- Keep `drawCity` pure and deterministic: same city + options → same pixels.
- Before/after screenshots at zoom 1 and zoom 3, in 1400, 1700, 1900 and 2030, on desktop and phone. Compare side by side before finishing.
- Watch render cost: precompute footprint geometry when a building is created or changes, not every frame.
