# CIVITAS — Game audit and recommendations

*November 2026 · based on v1.4 (`main` at `4e9ce5b`)*

How I tested: read the source, then played full 1300–2030 campaigns in a
headless browser on desktop (1440×900) and on a phone (Pixel 7), with a bot that
places the Town Center, zones three areas, runs at MAX and always picks option 1.
I also measured main-thread load on a throttled phone. Screenshots are in
[`docs/audit/`](audit/).

---

## 1. Verdict

CIVITAS already has the hardest thing to build: **a map that looks like history**.
The cartographic renderer, the named districts, the captions and the timelapse
are a real identity. The problem is that the game is mostly **a simulation you
watch, not a game you play**:

- **The bot wins without playing.** Picking option 1 every time and never touching the map after 1300 gave **177,240 residents and 26,613 unspent treasury by 2030**. No failure, no setback, and the treasury only ever climbs.
- **Most decisions are hidden multipliers.** All 20 Turning Points and 17 events are "+35% X / −3 Y" choices in a modal. You can't see them on the map, so you don't feel them.
- **The player's verbs are weak and optional.** The town "grows by itself along its streets". Zoning nudges it, buildings cost pocket money, and taxes, policies and 11 map layers add numbers to read, not decisions to make.
- **It has too many systems at once and too few decisions.** It has GDP, GDP/person, 4 demand bars, 3×4 tax levels, 8 policies, 11 layers, character axes, synergies, legacy points, figures and a market. Mini Metro has about four things: lines, carriages, tunnels and stations.

The way forward is to **subtract and sharpen**, not add: fewer verbs, each one
spatial, scarce and visible, plus pressure that comes from the map itself.

---

## 2. Audit

### 2.1 Functionality

| Area | State | Notes |
|---|---|---|
| Core sim | Solid | Monthly ticks, schema-migrated saves, 130+ tests. |
| Saves / backup | Good | Autosave, JSON export/import. |
| Timelapse + .webm export | Excellent | This is the shareable moment, and it's under-used. |
| Demand signals | Confusing | In one run Industrial showed **URGENT – "No workshop district has developed yet"** from 1300 to 2030, with nothing happening as a result (zoned workshop land never developed a `craft` building; check whether that zone drag missed or growth never picks workshops). A warning with no consequence teaches players to ignore warnings. |
| Pausing | Friction | Every Turning Point and event stops the clock, and the player has to press a speed again. In one campaign that happened **36 times**. |
| Mobile feature parity | Broken | **Taxes is missing on phone** (the rail shows Explore / Zoning / Build / Layers only). Stats, Chronicle, Building and Identity sit behind one small chart toggle. |
| Performance | Poor on phones | With 4× CPU throttling (≈ a mid-range Android), a small town (~1400) spent **~37% of main-thread time in long tasks** (avg 63 ms, max 139 ms), which means visible jank. `drawCity` redraws the whole map, including the static countryside, on every frame and tick. The JS bundle is 497 kB (161 kB gzip). |

### 2.2 Mechanics

The bot test, applied to each system:

| System | Decision? | Spatial? | Visible? | Compounds? | Pressure? |
|---|---|---|---|---|---|
| Organic growth | – | yes | yes | yes | – |
| Zoning (5 types) | weak (free, unlimited) | yes | slow | some | no |
| Basic buildings (3 per era) | weak (cheap) | yes | small | some | no |
| Town Center upgrades | weak (gated by pop) | no | small | no | no |
| Walls / bridges | **yes** | **yes** | **yes** | **yes** | some |
| Taxes (3 sectors × 4) | weak | no | no | no | no |
| Policies (8) | weak | no | no | no | no |
| Turning Points (20 cards) | yes | rarely | no | via synergies | no |
| Events (17) | yes | no | caption only | timed modifiers | no |
| Legacy market | meta | no | no | between runs | no |

**Walls and bridges are the only verbs that work the way this genre needs.**
They are spatial, costly, visible, and they change where the next quarter
grows. Everything else is a stat modifier.

The root causes:
1. **No scarcity.** Money piles up, zoning is free, and there is no cap on what you can do except treasury, which never runs out.
2. **No pressure from the map.** Nothing appears at a place on the map and gets worse if ignored.
3. **No goal inside a run.** You reach 2030 and get Legacy Points. There's no target, score or "you did well / badly" moment.

### 2.3 Goals and progression

- **Within a run:** only an implicit "grow". Milestone toasts ("An artistic town +50 LP") fire at random moments, and the player doesn't know they were working toward them.
- **Across runs:** Legacy Points buy permanent bonuses (+capacity, +know-how). This makes the next run *easier*, not *different*. That's the wrong kind of meta-progression for a game with no difficulty.
- **Comparison:** the Urban Atlas compares cities, but there's no single score to compare.

### 2.4 Navigation and menu structure

At present:

```
Home ─ Urban Atlas
     ─ Legacy Market (Market / Achievements / Figures)
     ─ Found a city (name, geography, figures) ─► Game
Game ─ Header (logo, version)
     ─ Top bar (city, 4 stats, LP chip, Timelapse, 4 speeds, Undo)
     ─ Left rail (Explore, Zoning, Build, Taxes, Layers) + left panel
     ─ Right tabs (Stats, Chronicle, Building, Build, Identity) + right panel
     ─ Map overlays (cartouche, key, zoom, captions, coordinate)
     ─ Modals (Turning Point, Event, Timelapse), toasts
```

That's **about 7 surfaces on screen at once on desktop**, and "Build" appears
twice (left rail and right tab) with different content. On the phone:

- The game header plus top bar use **~340 px of an 915 px screen** before the map starts ([phone-start](audit/phone-start.jpg)).
- The tool strip scrolls sideways and cuts items off ("Town Square 250 | N…", "…oning | Demolish").
- On the home screen, **"Found a new city" is below the fold**. The first screen is atlas and legacy marketing ([phone-home](audit/phone-home.jpg)).
- Turning Point cards are a sideways carousel with the second card cut off and no page indicator ([phone-turning-point](audit/phone-turning-point.jpg)).
- There's no pinch-to-zoom: zoom uses the + / − buttons and wheel, and pointer handling is single-pointer.

### 2.5 Art

Strengths: the palette, the paper tone, the italic district lettering, the
cartouche and compass, the curved streets, the river with boats. At city scale
the 2030 map really looks like an old plan ([desktop-2030](audit/desktop-2030.jpg)).

Weaknesses, seen at zoom ([desktop-zoomed-1722](audit/desktop-zoomed-1722.jpg), [phone-zoomed-1722](audit/phone-zoomed-1722.jpg)):
- **Houses are flat filled rectangles**, mostly the same dark maroon, with faint stripes. There's no ridge lines and no lit/shaded slopes. At zoom they read as bar-code blocks.
- **Landmarks don't stand out.** Civic and religious buildings are teal L-shapes and grey squares of house scale. The church is just a ✝ symbol on the street.
- **The countryside never changes.** The same striped field patchwork from 1300 to 2030 makes 700 years feel like seven.
- **Eras don't change the map's look.** The city in 2030 is drawn in the same medieval-ink language as in 1350. No railways or train sheds visibly cut through, no parks, no ring roads.
- **The UI chrome competes with the map.** Heavy framed panels and dense small type (labels as small as 8–9 px on mobile).

---

## 3. Recommendations

The model to copy is **Mini Metro / Mini Motorways**: a clean map, one or two
drawing verbs, a weekly "pick one upgrade" choice, and pressure from icons that
fill up on the map. Here it's adapted to "a city growing on an old map".

### 3.1 The new core loop (the most important change)

> **Every decade you receive a Charter. You spend it on the map. Quarters ask
> for things. Ignore them too long and they decline.**

1. **Charters as the one scarce resource.** Every 10 years, choose **one of two** Charters, in the same rhythm as Mini Metro's weekly upgrade. Each is a *spatial* action:
   - *Street charter*: draw one road (up to N cells). Growth follows roads, so this is the main steering verb, and it replaces most of zoning.
   - *Market / Church / Guildhall / School…*: place a building that serves a radius.
   - *Bridge*, *Wall*, *Canal*, *Harbour*, *Railway*, *Park*: era-specific big works.
   Money disappears from the HUD, or shrinks to a quiet modifier. Taxes and policies are folded into Charters or cut.
2. **Needs that appear on the map.** Districts sprout a small icon (🔔 church, ⚖ market, 💧 well, 🎓 school, 🚂 station) when they outgrow what serves them. A ring fills around the icon over ~20–40 game years. When it fills, the district **declines**: roofs grey out, people leave, the name gets a "Old/Lower" prefix, and the Chronicle records it. That's the Mini Metro station timer, in a historical frame.
3. **Era shifts change the rules.** Each era (Medieval → Early modern → Industrial → Modern → Contemporary) adds one new Charter type and one new kind of need (e.g. Industrial: smoke spreads, so homes downwind ask for parks. Modern: traffic, so main roads ask for bypasses). The map visibly changes style at each shift.
4. **Score = Prosperity-years.** Sum population × wellbeing across the run. Show it in the cartouche. One number to beat, compared in the Atlas. A city that loses districts to decline scores lower. That gives the bot test a real answer.

Why this works: about 70 decisions per run (one per decade, plus where to put
it), every one on the map, every one visible within seconds, and they compound
because roads and services change where the next quarter grows.

### 3.2 What to cut or merge

| Cut / merge | Into |
|---|---|
| GDP, GDP/person, treasury in HUD | Year · Population · Score |
| 4 demand bars | Need icons on the map |
| Taxes (12 states), 8 policies | 3–4 "Charter of Law" cards per run (e.g. Free Port, Fire Code), each with a visible effect |
| 11 map layers | 3 lenses: *Plan* (default), *Needs*, *Age* |
| Turning Points as stat cards | Keep the 20 historical moments, but each one offers spatial options ("The railway is coming — choose where the station goes: A / B / C") |
| Events as stat modifiers | Same: tie each to a place (the plague hits the most crowded district; the fire spreads through timber quarters, so stone Charters matter) |
| Legacy bonuses that make runs easier | Legacy *unlocks* that make runs **different**: new geographies, starting conditions, figures, challenge rules |

### 3.3 Goals and modes

- **Campaign (1300–2030)**: the full run with score, ~45–60 min at normal speed.
- **Era challenges (10 min)**: start in 1780 with a medieval core and survive industrialisation without losing the Old Town. Clear win/lose, very mobile-friendly.
- **Daily map**: same seed and geography for everyone, one score. The cheapest retention feature there is.
- **Chronicle moments**: when a district is founded, declines or is renamed, add a line to the Chronicle and a caption on the map. Already half-built.
- **Ending screen**: the timelapse plays automatically at the end with the score and the 5 most important moments. Share as video/GIF. This is the game's trailer, made by the player.

### 3.4 Navigation and mobile

Target structure:

```
Home: [Continue city]  [New city]  [Daily map]      ← above the fold
      Atlas · Collection (Legacy) · Settings          ← secondary row

Game (phone portrait):
┌──────────────────────────────┐
│ 1650 · Valdoria · 42k · ★1.2M │ ⏸ ▶ ▶▶   ← one 56 px HUD row
│                                │
│             MAP                │   ← ≥ 80% of screen, pinch/zoom/pan
│     (need icons on map)        │
│                                │
│  [ Charter ready: choose ▸ ]   │   ← contextual pill, not a modal
├──────────────────────────────┤
│  ✋ Explore  ✏ Charter  ◐ Lens  📜 Chronicle │ ← one dock, 4 items
└──────────────────────────────┘
```

- Remove the CIVITAS/version header inside the game.
- One bottom dock, at most 5 items. Everything else goes in bottom sheets.
- Charter choice as a bottom sheet with 2 large cards, stacked vertically. The clock **slows** while it's open instead of hard-pausing, and resumes automatically.
- Pinch-to-zoom and two-finger pan. Tap-and-hold to see a building's history.
- Desktop uses the same structure with the sheet docked to the right, not a separate 3-column app.

Performance:
- Render the countryside, water and fields to an offscreen canvas once per era/terrain change. Render buildings to a second cache invalidated per changed chunk. Draw only boats, mills, smoke and captions every frame.
- Move `advanceMonths` into a Web Worker, and post snapshots to the UI at most ~10×/s.
- Cap DPR at 2. Re-measure with `headless-playtest --throttle`. Target: no long tasks over 50 ms.

### 3.5 Art

Priorities, in order of impact per effort:

1. **Roofs, not rectangles.** Two-tone gable roofs (lit/shaded half plus a ridge line), hip roofs for detached houses, courtyard blocks for dense quarters, sawtooth roofs for factories. Seeded per building, precomputed once. This alone changes the zoomed-in look completely.
2. **Landmark silhouettes.** Cross-plan church with west tower and apse, cathedral 4–6× a house, town hall with courtyard, market square as an open paved polygon, station with a long train shed, university quad, domed museum. They should be findable without labels.
3. **An evolving countryside.** Strip fields (medieval) → enclosed hedged fields (1600+) → large consolidated parcels (1900+). Woods shrink, and suburbs and allotments appear. Polder drainage lines on water maps.
4. **An era palette and ink.** Sepia/ink and hatching early on; hand-coloured lithograph in the 1800s, with railways as black-and-white dashed lines; cleaner survey colours with green parks and grey ring roads in the 1900s+. Change it at the era shift with a short "the map is redrawn" transition, which is a satisfying beat on its own.
5. **Need and decline states as art.** Declining quarters get desaturated roofs and gaps. Thriving ones get red-tiled roofs, trees in courtyards and a flag on the landmark. The state of the city becomes readable at a glance.
6. **Quieter UI chrome.** Thinner borders, fewer framed boxes, 14 px minimum body text on mobile, icons over labels in the dock.

---

## 4. Suggested roadmap

| Phase | Scope | Success test |
|---|---|---|
| **A. Mobile shell** (1–2 wk) | New HUD/dock/sheets, home above the fold, pinch-zoom, Taxes/Stats reachable, auto-resume after choices, render caching | All features reachable on 390×844; no long task > 50 ms at 4× throttle |
| **B. Charters + needs** (2–3 wk) | Decade Charter choice, road drawing, service radius, need icons with timers, decline, score | Bot (option 1, no map actions) scores < 50% of a scripted sensible player |
| **C. Spatial history** (2 wk) | Rewrite Turning Points/events to have spatial options; cut taxes, policies, extra layers | ≥ 80% of decisions act on a place on the map |
| **D. Art pass** (2–3 wk) | Roofs, landmark silhouettes, evolving fields, era palettes, decline visuals | Before/after screenshots at zoom 3 in 1400/1700/1900/2030 |
| **E. Modes and meta** (2 wk) | Era challenges, daily map, end-of-run timelapse share, legacy unlocks | A 10-minute challenge is playable start to finish on a phone |

Do A first. It's cheap and every later phase gets tested on mobile.
B is the change that makes CIVITAS a game. The rest builds on it.

---

## 5. Skills added for this work

Project skills in `.claude/skills/` that Claude Code loads in this repo:

- **`game-design-review`**: the six-test checklist (decision, spatial, visible, compounds, pressure, readable), decision budget and content rules used in this audit.
- **`mobile-game-ux`**: layout, touch, readability and performance budgets for phone-first play.
- **`cartographic-art`**: art direction for `render.js`: building recipes, landmark silhouettes, era palettes, evolving countryside.
- **`headless-playtest`**: `playtest.cjs` plays a full campaign headlessly, screenshots each century, counts decisions and measures long tasks. It's the "bot test" used above.
