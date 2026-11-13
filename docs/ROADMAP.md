# CIVITAS roadmap

*November 2026 · follows [`AUDIT.md`](AUDIT.md). Every issue the audit raised is
assigned to a milestone below. Status as of the v1.5 branch.*

Guiding rule (from the `game-design-review` skill): **few verbs, each one
spatial, scarce and visible.** Each milestone must leave the game shippable, and
its exit test is measured, not judged by eye.

| Milestone | Theme | Status |
|---|---|---|
| **A** | Phone shell, accessibility, performance, PWA | ✅ Done in v1.5 (see notes) |
| **B** | Card economy: Market Hall, hand, stack, merge | ✅ Core done in v1.5; tuning and drag-to-play remain |
| **C** | Pressure: needs on the map, telegraphed history, score | ✅ Shipped in v1.6; closed in v1.7 by era drafts |
| **D** | Art pass: roofs, landmarks, living countryside, era styles | ✅ Core shipped in v1.7; transitions and card art remain |
| **R** | **Doctrines and runs: roguelite deckbuilding** (design: [`CARD_DESIGN.md`](CARD_DESIGN.md)) | **In progress**: R1 (v1.8) ✅; R2 (v1.9.1) ✅, exit tests 1–2 pass on 8 seeds; R3 next |
| **E** | Modes: era challenges | Planned; meta items moved into R; daily map dropped (offline game) |
| **F** | Polish: game feel, audio, onboarding, copy | Planned (runs alongside C–E) |

---

## Milestone A: phone shell, accessibility, performance, PWA ✅

| Audit issue | What shipped in v1.5 | Evidence |
|---|---|---|
| Header + top bar used ~340 px on a phone | App header hidden in game; one 56 px HUD row (back, city, 1×/4×/MAX, undo, stats) | Map now starts at y=69 instead of y=153 (Pixel 7). Map height 577 → 539 px, because the new ~100 px card hand sits under it; the dock and sheet still need a slimmer hand when the clock runs (F) |
| "Found a new city" below the fold | Home reorders on phones: title, then the found/continue panels | Begin button at y=560 of 839 |
| Taxes unreachable on phones | Tool rail is a bottom dock (Explore · Zoning · Build · Taxes · Layers); sections open as a sheet; picking a tool closes the sheet so the map is free | Browser test opens Taxes sheet |
| Horizontally scrolling, clipped tool strip | Replaced by the dock + sheet | — |
| 18 of 22 phone buttons under 44 px | All game-screen controls ≥ 44 px | 0 of 16 visible buttons under 44 px |
| 169 rules with text ≤ 11 px (7 at 8 px) | No text below 11 px anywhere | CSS scan: 0 rules under 11 px |
| Secondary text 4.39:1 (and ~40 greys below 4.5:1) | Every text colour darkened just enough to reach ≥ 4.5:1 on paper and deep paper | Contrast scan: 0 failing colours |
| No pinch-zoom | Two-finger pinch zooms and pans in any tool, cancelling a drag in progress | Synthetic pinch test |
| Clock stops after every Turning Point | Resumes at the same speed after a Turning Point, as it already did after events | — |
| Full map redraw every frame | Static layers (paper, fields, zoning, streets, buildings) cached per canvas; animated parts live; while the clock runs the cache may lag up to max(350 ms, 4× its rebuild cost) | Late-game draw on 4×-throttled phone, 1900 city: avg **167 → 66 ms** per frame; pixel-identical output |
| Not installable on a phone | **PWA**: manifest, icons (any + maskable), service worker with offline shell, "Install app" button, iOS meta, safe-area insets | Chromium reports 0 installability errors at `/` and `/civitas/`; game starts a city offline |

**Known gaps carried forward (moved to F):**
- Early-game main-thread time didn't improve. A growing small town changes every frame, so the cache helps little there, and React re-renders the whole `App` every sim tick (~16% of time in a dev profile). *Fix*: split `App` into memoised panels and move `advanceMonths` into a Web Worker posting snapshots ~10×/s.
- **First-draw hitch.** Generating the fields bitmap took ~14 s on a 4×-throttled phone in both old and new builds. *Fix*: generate it in a worker or progressively in idle callbacks, and show the paper and roads first.
- Rebuild frames are now the p95 (≈ 330 ms throttled at 1900). *Fix*: cache buildings per map chunk so a new house repaints one tile, not the city.

---

## Milestone B: card economy ✅ core shipped

What shipped in v1.5 (`src/cards.js`, `src/Cards.jsx`, `tests/cards.test.js`):
- **Market Hall** restocks every decade: 3 cards plus a sealed pack (2 cards, the first uncommon or better), and a reroll whose fee rises each use. Rarity odds shift from 60/28/10/2 (1300) to 40/32/20/8 (2030) and are shown in the shop.
- **Prices** scale with the city: one unit = max(40 × era cost, 5 × yearly revenue). Common 2, uncommon 4, rare 8, epic 16 units.
- **Hand** of 5 cards (6 at Town Center level 3, 7 at level 5), shown as a tray under the map. Tap a card to play, sell (50% refund) or merge.
- **Play** records the card as a choice tagged `via:'hand'`, so the existing modifier, synergy and landmark code applies it. Building cards award a project and switch to placement. Timed cards last 20 years per Turning Point interval.
- **Stack**: the same card up to 3 times, at 100% / 50% / 25%.
- **Merge**: 3 cards of one rarity → 1 card of the next, from the majority domain.
- **Collections**: each card shows its sets ("Renaissance 1/3"). Because cards can now be bought, the 10 synergies are reachable goals.
- **Upkeep** per card in play (0.4–2% of yearly revenue), which gives the treasury a real sink.
- **Balance guard**: for each effect, the strongest hand card counts fully and the rest at 35%.

Balance check (headless, 2 seeds, full 1300–2030 campaigns):

| Strategy | Final population | Note |
|---|---|---|
| Passive (no cards) | 93k–128k | unchanged from v1.4 |
| Modest (cheapest card when it costs ≤ half the treasury) | 298k–391k | 2.3–4.2× passive |
| Greedy (buy everything affordable) | 259k–378k | **no better than modest**: blind buying isn't optimal |

Before the balance guards, both card strategies reached about 1–1.5M. The table above is after them.

**Remaining in B:**
- [ ] **Tune toward ~2× passive for a good player.** Run `balance-check` on the card table. Population cards (migration, housing, births) compound hardest; consider lower stack factors for them.
- [ ] **Drag a card onto the map** with a ghost preview of its area, instead of tap-to-play. Needs per-district targeting in the sim for event cards (Golden Age on *a district*).
- [ ] **Edict cards in Charter slots**: convert the 8 policies into cards; 3 slots, 5 from the Industrial era.
- [x] **Era drafts** (v1.7): five Rare-or-better picks in 1500, 1750, 1850, 1950 and 2000 for cities founded in the game. This closed C's 80% criterion (86% measured).
- [ ] Building cards for the basic buildings (Market Square, Chapel, Granary…), replacing the Build menu.
- [ ] Legendary tier as set-completion rewards (one per city).

---

## Milestone C: pressure, history and score ✅ shipped in v1.6

**Results (measured, full campaigns, 2 seeds):**

| Exit criterion | Target | Result |
|---|---|---|
| Do-nothing bot vs scripted sensible player | passive < 50% of sensible | ✅ **7–14%** (passive 3.0k–5.3k vs sensible 36.7k–43.1k prosperity-years) |
| Decisions that act on a place or a moment | ≥ 80% | ✅ **86%** with era drafts (v1.7); was ❌ **66–68%** in v1.6. The sensible bot makes 36–43 such decisions (12–13 buildings for needs, 19–20 history answers, 5–12 cards), against 20 Turning Point picks. Replacing the Turning Points with 5 era drafts (Milestone B) would bring it to about 90%. |
| Workshop zones that never develop | fixed | ✅ zoned workshop land develops by 1345 (it used to take about a century) |

What shipped is listed in `CHANGELOG.md` (v1.6). The original plan follows.


Addresses: *no pressure from the map*, *no goal inside a run*, *demand warnings with no consequence*, and the *do-nothing bot wins* critical issue.

1. **Needs on the map.** A district shows an icon for what it lacks (church, market, well, school, station, park), using the existing service, prestige and smoke fields. A ring fills over 20–40 years; when it's full the district **declines** (roofs grey, people leave, Chronicle entry). The answer is a building card, so needs drive what you buy.
2. **Telegraphed history.** Events and calamities are announced 5–10 years ahead with a marker on the map ("Plague approaching from the harbour, 1347"), and you answer with a card in hand (Pest House, Quarantine, Dykes, Fire Brigade). Remove the hard pause; the choice appears as a sheet while time slows.
3. **Score = Prosperity-years** (population × wellbeing, summed), shown in the cartouche and ranked in the Atlas. Declines and unanswered calamities cost score.
4. **Cut what the map now shows**: the 4 demand bars become need icons; 11 layers become 3 lenses (Plan · Needs · Age); GDP and GDP/person leave the HUD.
5. **Fix**: workshop zones that never develop while "Industrial: URGENT" shows for 700 years (audit §2.1).

**Exit test:** the do-nothing bot scores < 50% of a scripted sensible player, and ≥ 80% of decisions act on a place or a moment.

---

## Milestone D: art pass ✅ core shipped in v1.7

Before/after sheets: [`audit/art-before-after-zoom1.jpg`](audit/art-before-after-zoom1.jpg) and [`audit/art-before-after-zoom3.jpg`](audit/art-before-after-zoom3.jpg) (the same city in 1400, 1700, 1900 and 2030).

| Item | Status |
|---|---|
| 1. Two-tone roofs lit from the top-left, inked ridges, hipped stone/classical/brick roofs | ✅ |
| 2. Landmark silhouettes: church apse and darker tower, heavier ink on all special buildings | ✅ partly. Cathedral and station silhouettes, and scale differences, remain |
| 3. Countryside evolves: strips → enclosures (1600+) → consolidated parcels (1900+) | ✅ |
| 4. Era palettes and a "the map is redrawn" transition | ◐ the ground tone changes by epoch; roof palettes and the transition remain |
| 5. Need and decline states as art | ◐ declining quarters read greyer; thriving quarters are not yet marked |
| 6. Card art vignettes | ❌ not started |

**Watch:** each countryside epoch is generated once, the first time it's shown, so an era change can now cause the same one-off hitch as the first draw (see Milestone A carry-overs). Generating fields in idle time fixes both.

The original plan follows.


Addresses: *houses are flat rectangles*, *landmarks don't stand out*, *countryside never changes*, *eras don't change the look*. Follow the `cartographic-art` skill.

1. Two-tone gable and hip roofs with ridge lines; courtyard blocks; sawtooth factories. Precompute per building, which also pays for the chunk cache in A.
2. Landmark silhouettes: cross-plan church with tower and apse, cathedral, town hall courtyard, market square, station shed, university quad, domed museum.
3. Countryside evolves: strip fields → enclosures (1600+) → consolidated parcels (1900+); woods shrink; allotments and parks appear.
4. Era palettes and a short "the map is redrawn" transition at each era change.
5. Need and decline states as art: grey gaps in declining quarters, red tiles and courtyard trees in thriving ones.
6. Card art: replace the placeholder diamonds with small engraved vignettes per domain.

**Exit test:** before/after screenshots at zoom 1 and 3 in 1400, 1700, 1900 and 2030; landmarks findable without labels.

---

## Milestone R: doctrines and runs (next)

CIVITAS is a roguelite with cards: each run is one city, and you win by
committing to a build (a Holy City, a Forge City…), not by owning one of
everything. The full design is in [`CARD_DESIGN.md`](CARD_DESIGN.md).

**Status (v1.9.1): R2 done.** Both exit tests pass on 8 seeds: every focused doctrine scores 1.35–1.86× the spread player, and all six are within +18% / −14% of their mean. Era Trials move to R3.

**R3 next:** Era Trials; Founders; Starter Pool and doctrine mastery unlocks; Legacy Market artifacts and boosters; Ruin; end-of-run summary with past-run and historical-city comparison; optional Hardships.

**Status (v1.9), R2 first pass (superseded):**
- ✅ 90 cards (14 building cards, 15 new, 7 hybrids), 6 Patrons, 6 Wonders, power budget, Renown, focus perk, `npm run balance:doctrines`.
- ❌ Exit targets not met yet (median of 4 seeds): Learning 68.5k, Trade 57.5k, People 57.4k, Faith 57.2k, spread 53.8k, Arts 31.9k, Industry 29.4k.

R2 open items, in order:
1. **Diagnose Arts and Industry.** Their scores barely move with their parameters, so something blocks them. Suspects: Industry's smoke (air needs and declines) and Arts' 1.5× upkeep starving the treasury. Inspect one run of each, as was done for Faith (prosperity was capping at 98).
2. **Spread is too strong** now that building cards work: it collects Faith and People buildings too. Give Renown and tier power more weight at tiers 3–4 relative to tiers 1–2.
3. **Learning leads (+36%)** through its schools and universities, which hold the technology axis up as institutions. In doctrine cities, count institution floors toward the doctrine floor instead of on top of it.
4. Run the harness on 8 seeds (4 seeds are noisy: Arts ranges 16k–108k).
5. **Era Trials** (from the design) are not built yet; they move to R3.

**Status (v1.8):** ~20-minute pacing ✅ · R1 engine ✅ · R2 next. R1's measured baseline: focus does **not** yet reliably beat spread (spread 17k–55k vs focused 13k–65k). The causes are content, which R2 owns:
- Learning and People cards compound over 700 years and swamp tier bonuses: re-budget them to the §6 power budget.
- Doctrines are too thin to reach tiers 6–8 (Learning: 3 Decrees open in 1300): fill to 12 cards each, with Commons available from 1300.
- Faith, Industry and Arts focused players score lowest: their tier effects need to be worth about 2 and 4 extra cards (tiers 4 and 6).

- **R1 Engine:** 6 doctrines plus Civic; tiers at 2/4/6/8, each doctrine's tier 4 bending a different system (needs, history, shop, drafts, districts); 8 Decree slots; card levels Lv1–3 replace diminishing stacks and the 35% guard; doctrine merging; shop lock and banish.
- **R2 Content:** 90 cards plus 6 Wonders (evolutions); 10 hybrids; doctrine-coloured card frames (absorbs D's card-art item); doctrine tracker; Era Trials.
- **R3 Runs and meta:** ~20-minute runs (Normal = 1 year per 1.5 s, quiet decades faster, decisions slow time instead of pausing it); Founders; Starter Pool and doctrine mastery unlocks; Legacy Market sells starting artifacts, boosters and permanent upgrades (existing ranks kept), so every playthrough starts stronger; Ruin; end-of-run summary comparing with past runs and historical cities; optional Hardships 1–10.

**Exit tests:**
- focused ≥ 1.3× spread on the median of 4 seeds,
- the six doctrines within ±20% of their mean,
- runs with different Founders share ≤ 40% of their cards,
- the first run can't reach Patrons or Wonders,
- a meaningful choice every ≤ 90 s at 1×,
- no Ruin for the passive bot at Hardship 0,
- the 5th run on one profile scores 1.2–1.6× the 1st,
- a run at Normal speed lasts 15–22 minutes.

## Milestone E: modes and meta

Addresses: *legacy makes runs easier, not different*, *no single score to compare*, *timelapse is under-used*.

1. **Era challenges** (10 minutes, clear win/lose), e.g. *"Industrialise without losing the Old Town"*.
2. ~~**Daily map**~~: dropped. CIVITAS is offline and solo; comparison is with your past runs and historical cities (see Milestone R).
3. **End-of-run timelapse** plays automatically with the score and the top 5 moments; export as video or GIF to share.
4. **Legacy unlocks cards into the shop pool** (and geographies, starting cards, challenge rules) instead of +capacity bonuses.

---

## Milestone F: polish (alongside C–E)

- **Game feel** (`game-feel` skill): an eased pop when a card lands, a short sound per rarity when a pack opens, a bell when a landmark completes, a reduce-motion toggle (CSS already honours `prefers-reduced-motion` for cards).
- **Audio**: there is none today. Add a quiet ambient bed per era and a few UI sounds, with a mute control.
- **Performance carry-overs from A**: memoised panels, a sim Web Worker, chunked building cache, idle-time fields generation.
- **Onboarding**: the first 3 minutes as a guided sequence (found, zone, buy and play a card, watch a need appear).
- **Copy** (`ux-copy` skill): replace "Immediate momentum: Population attraction +21" with plain verbs and outcomes.
- **Accessibility**: keyboard play of the hand and shop, screen-reader labels for map state, and colour-blind-safe zone patterns (`accessibility-review` skill).
