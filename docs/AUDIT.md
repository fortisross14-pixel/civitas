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

### 2.6 Cards today

There are 54 cards (13 common, 17 uncommon, 19 rare, 5 epic) across 7 domains (including a wildcard domain), with 10 three-card synergies.
But the player only sees them as **20 single picks from 3 random offers, one every 35 years**:
- **Synergies almost never complete.** Collecting 3 specific cards out of 54 with 20 random draws is rare. The bot's 2030 city ended with *"Your first synergy is still waiting to emerge."*
- **There's nothing to buy.** The treasury reached 26k while cards can't be bought, held or saved for the right moment.
- **No hand, no timing.** A card applies the moment you pick it, so you never choose *when*.
- **Rarity has no texture.** Rarities are a colour label. There's no pack, no shop and no "I finally pulled the epic" moment.

The card content is the most valuable thing in the codebase after the renderer. It's just
delivered in the least game-like way possible. Section 3.1 redesigns this.

### 2.7 Scorecard against the installed skills

Each installed skill (see §5) was applied to the build as it stands.

| Skill | Verdict | Key finding |
|---|---|---|
| `game-design` (30-second loop test) | **Fail** | Action → feedback → reward is missing. Most actions give no feedback within 30 s, and the "reward" is a number. Early wins exist (fast medieval growth), but there's no "meaningful choices" pacing. |
| `game-design-review` (six tests) | **Fail** | Only walls and bridges pass. See §2.2. |
| `balance-check` | **CRITICAL ISSUES** | Degenerate strategy: *doing nothing* reaches 177k pop. The economy has no meaningful sink (treasury 400 → 26,613). Synergies are effectively unreachable. |
| `card-game` | **Fail** | No zones (hand, shop, slots), no reward loop, no rarity-weighted offers by era, no removal or merging, no power budget. Cards are priced in nothing. |
| `roguelike` (run/meta structure) | Weak | Meta-progression adds stats (+capacity) rather than options. Runs don't diverge. |
| `mobile-games` / `mobile-game-ux` | **Fail** | **18 of 22** buttons on the phone game screen are under 44 px (most are 29–34 px tall). Taxes is unreachable on a phone. There's no pinch-zoom. |
| `game-ui-ux` | Fail | **169 CSS rules set text ≤ 11 px** (7 of them at 8 px). The HUD rebuilds from React state every tick instead of updating on events. There's no screen stack (modal flags in `App`). |
| `accessibility-review` (WCAG 2.1 AA) | Partial | Secondary text `#756d5e` on paper is **4.39:1** (4.5:1 needed) and **3.83:1** on deep-paper panels. Map state is conveyed by colour alone (zones, roofs). Modals use `role="dialog"` and `aria-modal`, which is good. |
| `performance-optimization` / `web-games` | Fail | ~63 ms average long tasks on a throttled phone (budget 33 ms at 30 fps). There's no Web Worker and no layer caching. The bundle (161 kB gzip) is fine. There's no PWA manifest, so it can't be installed on a phone home screen. |
| `game-feel` | **Fail** | No audio at all, no placement "pop", no milestone fanfare beyond a toast. Founding a town or finishing a cathedral doesn't *feel* like anything. |
| `game-art` / `cartographic-art` / `2d-games` | Mixed | Strong style guide and consistency at city scale. Silhouette readability fails at gameplay zoom ("ignore silhouette readability" is the skill's top anti-pattern). |
| `design-critique` | Mixed | First impression of the home screen: the eye goes to "Urban Atlas" marketing, not to "Found a city". The in-game reading order competes across 7 surfaces. |
| `ux-copy` | Weak | Jargon and numbers where verbs should be: "Immediate momentum: Population attraction +21 · Economy +15", "GDP / person". CTAs are mostly good ("Found the town", "Reroll all three"). |

---

## 3. Recommendations

The model to copy is **Mini Metro / Mini Motorways**: a clean map, one or two
drawing verbs, a weekly "pick one upgrade" choice, and pressure from icons that
fill up on the map. Here it's adapted to "a city growing on an old map".

### 3.1 The new core loop: a hand of history cards (the most important change)

> **The city earns money. Money buys cards. You hold a small hand and play
> cards onto the map at the moment that matters. Quarters ask for things;
> ignore them and they decline.**

This takes what works in card-driven games (Balatro's shop and rarities,
Slay the Spire's visible threats, Mini Metro's weekly upgrade, merge games'
stacking) and puts it on the old map. It reuses the 54 existing cards and their
rarities.

#### The loop

1. **Earn.** The treasury is the only currency. Taxes and growth fill it, and active cards drain it through upkeep. This gives money a real sink: the 26k idle treasury becomes the thing you spend.
2. **Shop (every decade).** The **Market Hall** restocks: 3 face-up cards plus 1 sealed pack, with rarities weighted by era and by the city's character. Buy, reroll for a fee, or save. The clock keeps running at low speed, with no hard pause.
3. **Hold.** A **hand of 5 cards** (6 at Town Center level 3, 7 at level 5). Holding is a decision: keep the Fire Brigade for the fire you can see coming, or sell it back for half.
4. **Play.** Drag a card from the hand onto the map:
   - **Building cards** go on a parcel (Market Square, Cathedral, University, Harbour, Station).
   - **Event cards** go on a district or the whole city, for a set number of years (Baby Boom, Golden Age, Trade Fair, Pilgrimage).
   - **Edict cards** go into one of **3 Charter slots** (5 by the Industrial era) and stay until replaced (Free Port, Fire Code, Public Schools; today's policies become these).
   - **Figure cards** go on a building to boost it (Erasmus on the University, Rembrandt on the Artists' Workshop).
5. **Stack and merge.**
   - *Stack*: the same card on the same district levels it up. Market ×2 = Market Town (bigger radius, a new roof style). Golden Age on a district already under a Trade Fair extends both.
   - *Merge*: 3 copies of a common → 1 uncommon of the same domain; 3 uncommons → 1 rare. This is how commons stay useful, and how players chase rarities.
   - *Sets*: today's 10 synergies become visible **collections** printed on each card ("Renaissance 1/3"). Completing one gives a unique epic, such as a Renaissance landmark. Since cards are now bought rather than randomly offered, sets become reachable goals instead of luck.
6. **Answer history.** Calamities and events are **telegraphed 5–10 years ahead** on the map, the way Slay the Spire shows enemy intent ("Plague approaching from the harbour, 1347"). The answer is a card you have or can buy in time (Pest House, Quarantine, Dykes). Playing nothing is allowed, but costs more.
7. **Needs that appear on the map.** Districts sprout a small icon (church, market, well, school, station) when they outgrow what serves them. A ring fills around it over ~20–40 game years. When it fills, the district **declines**: roofs grey out, people leave, the Chronicle records it. Building cards are the answer, so needs drive what you buy.
8. **Era drafts (5 per run, not 20 Turning Points).** At each era change you get a free pick of 1 of 3 cards, rare or better. You also get new card types in the shop, and the map is redrawn in the new era's style.
9. **Score = Prosperity-years.** Sum population × wellbeing across the run, shown in the cartouche and compared in the Atlas. Declines and unanswered calamities cost score.

#### Rarity and economy

| Rarity | Shop weight (medieval → modern) | Price (× a decade's average net income) | Typical effect |
|---|---|---|---|
| Common | 60% → 40% | 0.2–0.4 | small building, short event, +1 stack |
| Uncommon | 28% → 32% | 0.5–0.8 | district-level building or event |
| Rare | 10% → 20% | 1.0–1.5 | landmark, edict, figure |
| Epic | 2% → 7% | 2–3 (or set reward) | wonder, era-defining edict |
| Legendary | set rewards and era drafts only | — | one per city (Cathedral of …, Great Exhibition) |

- **Power budget** (from the `card-game` skill): fix one reference card, e.g. *Market Square (common) = serves 6 parcels, +1 prosperity, costs 0.3 decades*, and price every card against it. Run `balance-check` on the table.
- **Upkeep** on Edicts and active Events keeps money tight in the late game, so the treasury can't snowball.
- **Visible odds** on packs, and a shown "rare guaranteed within 3 packs" counter. No hidden pity rules.
- **Selling** a card returns 50%. That's the removal/thinning tool the `card-game` skill says every card economy needs.

#### Example cards (from the existing pool, reshaped)

| Card | Rarity | Type | Play on | Effect | Stacks / merges |
|---|---|---|---|---|---|
| New Settlers | Common | Event | a district | +10% residents there now | 3 → *Land of Opportunity* |
| Market Square | Common | Building | parcel | serves 6 parcels; shops nearby +15% | ×2 = Market Town, ×3 = Exchange |
| Fertile Families | Uncommon | Event | city | natural growth +20% for 30 years | stacks duration |
| Fire Brigade | Uncommon | Building | parcel | halves fire spread within 8 parcels | answers *Great Fire* |
| Golden Age | Rare | Event | city | GDP +20%, prosperity +6 for 20 years | extends any active Event |
| Free Port | Rare | Edict | slot | harbour districts +30% trade; upkeep 40/yr | — |
| Erasmus | Rare | Figure | a University/School | education +35% in radius | one figure per building |
| Great Cathedral | Epic | Building | 3×3 parcels | faith +40%, pilgrims; takes 60 years to build, visible on the map | Holy City set piece |
| The Renaissance | Legendary | Set reward | city | art and craft cards cost −30% for the rest of the run | — |

#### Why this works

- **Decisions per run go from ~36 to ~150**: what to buy, what to hold, where and when to play, what to merge. Each one is small and quick, the Balatro/Mini Metro rhythm.
- **Every decision is spatial or timed**, so it passes the `game-design-review` tests.
- **Money matters**, which fixes the `balance-check` critical issue.
- **Rarity has texture**: packs, a merge ladder, collections, legendaries.
- **It's semi-casual.** Three verbs (buy, play, merge) and one hand. The complexity comes from how they combine, not from more panels.

#### Guardrails so it doesn't become a complex city builder

- Hand ≤ 7, Charter slots ≤ 5, shop ≤ 4 cards. No deck to manage, no draw pile.
- A card does one thing. If its text needs two sentences, split or cut it.
- Cards must change the map visibly within seconds (new building, coloured district aura, crowd icons).
- The do-nothing bot must lose clearly. Re-run `headless-playtest` with a "buy cheapest, play randomly" bot and a "sensible" bot. The gap is the measure of depth.

### 3.2 What to cut or merge

| Cut / merge | Into |
|---|---|
| GDP, GDP/person in HUD | Year · Population · Treasury · Score |
| 4 demand bars | Need icons on the map |
| Taxes (12 states) | One "tax rate" dial (Low / Fair / High), or an Edict card |
| 8 policies | Edict cards in Charter slots |
| Basic buildings menu (3 per era) | Building cards in the shop |
| 11 map layers | 3 lenses: *Plan* (default), *Needs*, *Age* |
| 20 Turning Points (1 of 3, every 35 years) | 5 era drafts plus the decade shop |
| Events as instant stat modifiers | Telegraphed events answered with cards, tied to a place (the plague starts at the harbour; fire spreads through timber quarters) |
| Hidden synergies | Visible card collections ("Renaissance 1/3") |
| Legacy bonuses that make runs easier | Legacy *unlocks* that make runs **different**: unlock new cards into the shop pool, new geographies, a starting card, challenge rules |

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
│  [ Market Hall restocked ▸ ]   │   ← contextual pill, not a modal
├──────────────────────────────┤
│ [card][card][card][card][card] │   ← the hand: drag a card onto the map
│  ✋ Explore  🛒 Shop  ◐ Lens  📜 Chronicle │ ← one dock, 4 items
└──────────────────────────────┘
```

- The hand is the main control surface, as in Balatro on mobile. Cards are ≥ 64 px wide, tap to read, drag to play, with a ghost preview of the effect area on the map before release.

- Remove the CIVITAS/version header inside the game.
- One bottom dock, at most 5 items. Everything else goes in bottom sheets.
- The shop and era drafts open as a bottom sheet with large cards. The clock **slows** while it's open instead of hard-pausing, and resumes automatically.
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
| **B. Card economy** (3 wk) | Card zones (shop, hand, slots, in play), decade shop with rarity weights and packs, drag-to-play on the map, upkeep, selling, stack and merge rules, visible collections; convert the 54 existing cards and 8 policies; era drafts replace Turning Points | Card invariants tested (`card-game` skill: each card id in exactly one zone); treasury no longer climbs monotonically |
| **C. Needs, telegraphed history, score** (2–3 wk) | Need icons with timers, decline, events announced ahead and answered with cards, Prosperity-years score; cut taxes UI, extra layers, demand bars | Do-nothing bot scores < 50% of a scripted sensible player; ≥ 80% of decisions act on a place or a moment |
| **D. Art pass** (2–3 wk) | Roofs, landmark silhouettes, evolving fields, era palettes, decline visuals | Before/after screenshots at zoom 3 in 1400/1700/1900/2030 |
| **E. Modes and meta** (2 wk) | Era challenges, daily map, end-of-run timelapse share, legacy unlocks | A 10-minute challenge is playable start to finish on a phone |

Do A first. It's cheap and every later phase gets tested on mobile.
B and C are the changes that make CIVITAS a game. The rest builds on them.
Add **game feel** throughout (from the `game-feel` skill): a small eased pop
when a card lands on the map, a short sound per rarity when a pack opens, a
bell when a landmark completes, and a reduce-motion toggle.

---

## 5. Skills installed in this repo

All of these live in `.claude/skills/` and load automatically for Claude Code in this repository.

### Written for CIVITAS
- **`game-design-review`**: the six-test checklist (decision, spatial, visible, compounds, pressure, readable), decision budget and content rules.
- **`mobile-game-ux`**: layout, touch, readability and performance budgets for phone-first play.
- **`cartographic-art`**: art direction for `render.js`: building recipes, landmark silhouettes, era palettes, evolving countryside.
- **`headless-playtest`**: `playtest.cjs` plays a campaign headlessly, screenshots each century, counts decisions and measures long tasks.

### Community and official skills (vendored, licenses in `.claude/skills/_licenses/`)

| Skill | Source | License | Used for |
|---|---|---|---|
| `card-game`, `roguelike`, `game-ui-ux`, `game-feel`, `performance-optimization`, `procedural-gen` | [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) @ `c6ca6c4` | Apache-2.0 | card economy, run/meta structure, HUD and menus, juice, frame budgets, field/terrain generation |
| `game-design`, `mobile-games`, `web-games`, `game-art`, `2d-games` | [sickn33/antigravity-awesome-skills](https://github.com/sickn33/antigravity-awesome-skills) @ `560b762c` | MIT / CC-BY-4.0 | core loop, mobile constraints, browser games, art style, 2D patterns |
| `design-critique`, `accessibility-review`, `ux-copy` | [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) (design) @ `02717ef` | Apache-2.0 | screen critiques, WCAG audit, microcopy |
| `balance-check` (adapted) | [Donchitos/Claude-Code-Game-Studios](https://github.com/Donchitos/Claude-Code-Game-Studios) @ `abc0de7` | MIT | balance verdicts. Retargeted to CIVITAS files, and the studio framework's auto-run shell hook removed |

Not installed: the engine-specific skills (Godot, Unity, Unreal, Roblox), and the
rest of Claude-Code-Game-Studios. Its skills run `bash` hooks when they load
and depend on that project's own design documents and agents, so they'd break or
behave oddly here.
