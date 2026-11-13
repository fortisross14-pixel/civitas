# CIVITAS changelog

## v1.9.1 — Doctrines balanced (Milestone R2 exit tests pass)

**Both R2 exit tests now pass on 8 seeds** (`npm run balance:doctrines -- --seeds 7,11,3,19,23,29,31,37`, four of the seeds never used for tuning):

| Focused player | Median score | vs spread | vs doctrine mean |
|---|---|---|---|
| Learning | 77,752 | 1.86× | +18% |
| Faith | 68,874 | 1.65× | +5% |
| Arts | 67,479 | 1.61× | +3% |
| People | 63,351 | 1.52× | −4% |
| Trade | 60,331 | 1.44× | −8% |
| Industry | 56,314 | 1.35× | −14% |
| *Spread (one of everything)* | 41,798 | 1.00× | — |

Targets: every focused doctrine ≥ 1.3× spread ✅, and all within ±20% of the mean ✅.

**What changed** (doctrine cities only)
- **Arts and Industry were starving, not weak.** Arts had 6 cards before 1500 and its buildings only from 1750, so its city stayed poor and bought one card in 730 years; Industry's cards mostly unlocked after 1750, but the score is cumulative. New early Commons from 1300: *Mystery Plays*, *Painters' Guild* (Arts), *Tanners' Row*, *Rope Walk* (Industry). Arts upkeep weakness ×1.25 (was ×1.5). The doctrine pool is now 94 cards.
- **Renown pays only for depth:** ×1.45 at tier 3 and ×2.0 at tier 4 for the deepest doctrine, nothing at tiers 1–2, so a spread city earns none.
- **Learning gets a real weakness** ("slow fame: 65% of the usual Renown"), and its four-card era drafts move to tier 3. Its new tier 2 ("Scholars advise the council: history that costs money costs half") replaces them. Schools and universities hold technology up half as much in doctrine cities, and an institution floor and the doctrine floor no longer add up. Learning's tier-8 discount is 15%.
- Per-doctrine strength settings retuned (see `src/doctrines.js`: `DOCTRINE_POWER`, `DEV_WEIGHT`, `CARD_SCALE`, `RENOWN_WEIGHT`).

**Tests**: 213 passing.

## v1.9 — Doctrine cards (Milestone R, step 2: content and balance, first pass)

**90 cards in doctrine cities** (new `src/doctrineCards.js`; classic games keep their 54)
- **14 building cards:** Parish Chapel, Market Square, Stone Granary, Guild Hall, Public School, Public Gardens, Power Works, City Museum, Town Hall, Clinic, Waterworks, Rail Station, Hospital, Library. Playing one awards a free project to place; it answers needs and counts for its doctrine.
- **15 new doctrine cards:** Pilgrim Road, Tithe Barn, Relic of the Saint, Confraternity, Water Mills, Coal Wharf, Toll Bridges, Letters of Credit, Theatre District, Printing Press, The Almanac, Learned Society, The Observatory, and two new Patrons, **The Bourse** (Trade) and **Vertical Metropolis** (People).
- **7 hybrids** that count for two doctrines: Workshop Renaissance, Pilgrim Fairs, Model Village, Plan of Modernization, Cathedral School, Opera House, Patent Office.
- **Six Patrons**, one per doctrine, grow their doctrine's main output by 4% per card of that doctrine in play.

**Evolutions: six Wonders.** A card at Lv3 plus its doctrine's Patron awards a unique landmark to place:

| Card at Lv3 | + Patron | → Wonder |
|---|---|---|
| Parish Chapel | Sacred City | The Cathedral |
| Power Works | Industrial Revolution | The Great Foundry |
| Market Square | The Bourse | The Grand Exchange |
| Hire Artists | Cultural Renaissance | Palace of the Muses |
| Free University | Knowledge Economy | The Great University |
| Stone Granary | Vertical Metropolis | The Metropolis Charter |

Each Wonder has its own map silhouette, wider influence and a strong effect (the Grand Exchange adds 2 Market Hall offers; the Great University announces history 14 years ahead).

**Power budget** (doctrine cities)
- Compounding effects count less (migration ×0.45, housing ×0.55, births ×0.45, innovation ×0.25, education ×0.4, GDP ×0.6). This applies to cards, doctrine effects and the development pulse when a card is played.
- Each doctrine's cards have a strength scale so none dominates on its own.
- **Tier power**: deep tiers add prosperity, migration, housing, GDP, and an economy and technology development floor (like institutions do), weighted per doctrine.
- **Renown**: yearly score × 1.1 / 1.3 / 1.6 for the single deepest doctrine at tier 2 / 3 / 4. One deep doctrine beats many shallow ones.
- **Focus perk**: once a doctrine has 2 cards in play, its cards cost 20% less.
- Learning's tier-8 discount is now 25% (was 50%), Learning's tier-6 innovation +1.5% per card (was 5%), and Faith's tithe −5% (was −10%).

**Fixed:** building cards awarded no project (the project queue accepted only special buildings). Basic buildings can now be awarded as free projects.

**Balance tooling:** `npm run balance:doctrines` plays every focused-doctrine player and a spread player on 4 seeds in parallel and checks the two R2 exit targets. The scripted players now place the projects they are awarded and reroll the shop once a decade when nothing matches their build.

**Measured** (median of 4 seeds, final score):

| Player | Median | vs spread | vs doctrine mean |
|---|---|---|---|
| Learning | 68,507 | 1.27× | +36% |
| Trade | 57,529 | 1.07× | +14% |
| People | 57,386 | 1.07× | +14% |
| Faith | 57,206 | 1.06× | +14% |
| Spread | 53,798 | 1.00× | — |
| Arts | 31,871 | 0.59× | −37% |
| Industry | 29,423 | 0.55× | −42% |

Neither exit target passes yet: focus ≥ 1.3× spread, and all doctrines within ±20% of the mean. Four doctrines cluster within +14%; Learning leads, and Arts and Industry lag regardless of their parameters (see ROADMAP, R2 open items).

**Tests**: `tests/doctrines.test.js` grows to 13 (pool size and classic isolation, a full Cathedral evolution, the focus perk). Full suite: 213 passing.

## v1.8 — Doctrines (Milestone R, step 1: the engine) and ~20-minute runs

Design: `docs/CARD_DESIGN.md`. Everything below applies to cities founded in the game (era mode); older saves and engine/balance runs are unchanged.

**Pacing** (new `src/pacing.js`)
- The clock still ticks once per month, but **Normal (1×) is now one year every 1.5 s**, so a run takes ≈ 18 minutes (it was ≈ 49). Speeds: ½× (a year every 3 s), 1×, 2×, MAX.
- Quiet decades (no history waiting, no need past half) pass 1.5× faster. While the Market Hall or the Needs panel is open, time runs at ¼ speed instead of pausing. The status line says which.

**Doctrines** (new `src/doctrines.js`)
- Every card now belongs to a doctrine (Faith, Industry, Trade, Arts, Learning, People) or is Civic. Holy Scholars, Trading Empire and Tourist Paradise count for two doctrines. Basic buildings count toward their doctrine while they stand (Chapel → Faith, Market Square → Trade…).
- Holding **2, 4, 6 and 8** cards of a doctrine unlocks its tiers (24 effects). Each doctrine's tier 4 bends a different system: churches count as markets (Faith), workshops pay a levy and count as markets (Industry), an extra and lockable shop offer (Trade), landmark prestige reaches twice as far (Arts), four-card era drafts plus 10-year foresight from tier 2 (Learning), and districts forming at 7 buildings (People). Each doctrine has a weakness, from tithes to smoke to crowding.
- **Levels replace diminishing copies:** playing a card again levels it up (Lv2 ×1.5, Lv3 ×2). The "strongest card counts, the rest at 35%" rule is gone in these cities, and so are the fixed three-card synergies; doctrine tiers replace them.
- **Decree slots:** Decrees and Patrons take one of 8 slots (9 at Town Center level 3, 10 at level 5). **Retire** a Decree to free its slot. Buildings and Events don't take slots; instant cards apply once and don't count.
- **Merging** three cards of one doctrine gives a rarer card of that doctrine.
- **Market Hall:** offers lean toward the doctrines you hold; **Banish** removes a card for the rest of the run (3 per run); Trade tier 4 can **Lock** an offer through the next restock; Trade 6 sells cards back at full price and earns interest on the treasury; Learning 8 halves Learning card prices.
- **UI:** a **Doctrine** section (tier progress, active effects, next tier, weakness, Decree slots with Retire), a lead-doctrine chip above the hand, and doctrine glyphs, types and levels on card faces.

**Measured baseline** (scripted players, 2 seeds; focus vs spread is R2's exit test)
- Focused players: Learning 37k–65k, People 24k–42k, Trade 21k–26k, Arts 15k–20k, Faith 14k–18k, Industry 13k–18k. Spread: 17k–55k.
- Focus does **not** yet reliably beat spread. Learning and People cards compound over 700 years and swamp tier bonuses, and doctrines are too thin to reach tiers 6–8 (Learning has only 3 Decrees open in 1300). That's what R2's 12-card doctrines and power budget are for.

**Tests**: new `tests/doctrines.test.js` (10: tags, era gating, tier counting, levels, slots and retire, doctrine merge, banish and lock, rule-benders, tier-8 score, pacing). Full suite: 210 passing.

## v1.7 — Era drafts and a living map (Milestone C closed, Milestone D art pass)

**Era drafts**
- Cities founded in the game make five drafts, one as each era begins (1500, 1750, 1850, 1950, 2000), offering Rare cards or better. They replace the 20 Turning Points; the decade Market Hall supplies the rest. Older saves and engine/balance runs keep 20 Turning Points.
- This closes Milestone C's last exit criterion: the scripted sensible player now makes **86%** of its decisions on a place or a moment (was 66–68%). Neglect still loses: passive 2.2k–2.7k vs sensible 14.3k–20.0k prosperity-years. Cities are smaller than with 20 Turning Points, since 15 permanent card bonuses are gone.

**A living map** (art pass, `src/render.js`; before/after sheets in `docs/audit/art-before-after-zoom1.jpg` and `…zoom3.jpg`)
- **The countryside changes with the centuries**: medieval open fields in long narrow strips (before 1600), hedged enclosures with hedgerow trees (1600–1899), and large consolidated parcels (1900+). The ground tone shifts with each epoch, and archive maps and the timelapse show the right epoch.
- **Roofs read as roofs**: every pitched roof is lit from the top-left, like the rest of the map (the slope facing north-west is lighter, the other darker), with an inked ridge. Squarish stone, classical and brick roofs are hipped; narrow row houses keep their gables.
- **Landmarks stand out**: churches gain a round apse and a darker west tower, and every special building has a heavier ink outline.
- **Decline shows**: a quarter in decline reads greyer for as long as the decline lasts, alongside the dashed outlines of its empty homes.

**Tests**: new `tests/eras.test.js` (4, including the 80% place-or-moment exit test).

## v1.6 — Needs & History (Milestone C: pressure, telegraphed history, score)

**Needs on the map** (new `src/needs.js`, `src/Needs.jsx`)
- Once a year each district checks whether most of its homes are within reach of **public services** (church, school, clinic… by era), of **a market** (or a main street), and, from 1750, out of **workshop smoke**.
- A district that lacks one shows a ring on the map. The ring fills over about 30 years; building the right answer nearby drains it twice as fast. A full ring means the district **declines**: 15% of its homes empty, and prosperity −2 and migration −4% for 20 years. The Chronicle records it and the score pays for it.
- The new **Needs** section (tool rail) lists each need with "declines in about N years" and one-tap buttons for the buildings that answer it. Tap a ring on the map to open it.
- Needs run in cities founded in the game (`needsOn`). Headless engine runs and older saves are unaffected.

**History is announced, not paused for**
- Historical events are announced 6 years ahead with a marker on the map ("1354 · 6 yrs") and a "Decide" pill above the hand. Disasters ask for a response within 2 years. Choose any time while the clock runs, and change your mind until the deadline.
- If the council never decides, a calamity takes its harshest course, nothing else happens, prosperity falls by 2 for 15 years, and the score loses 4 years of points.
- An open, pausing event in a v1.5 save becomes a decision with a two-year deadline.

**Score: prosperity-years** (new `src/score.js`)
- Each year a city earns (population ÷ 1,000) × (prosperity ÷ 56). A decline costs 3 years of points (scaled by the district's size); an undecided event costs 4.
- Shown in the HUD, in the map cartouche and in the Needs panel. The Urban Atlas opens on a score ranking and charts the score over time.

**Fewer, clearer surfaces**
- Demand bars are gone (needs show on the map). The 11 map layers are now 3 lenses: **Plan**, **Needs** (who is served; where the smoke lies) and **Age**. Zoning colours appear while a zoning tool is held. GDP and GDP per person left the HUD.

**Rule changes** (intentional; tests updated)
- Market Square and Public Gardens stay on sale in every later era.
- Each basic building is limited to one per district (at least two per city). Only the first two of a kind add their city-wide effect; extra copies serve their neighbourhood.
- Homes near the Town Center's Market Cross count as having a market. Public gardens clear the smoke around them.
- **Fixed:** in cities founded in the game, zoned workshop or shop land now develops in the first decades even when the city has enough jobs. It used to wait about a century while the demand bar said "URGENT".

**Balance** (two seeds, full campaigns, `tests/helpers/strategies.js`)
- Passive player (founds the town, then nothing): score 3.0k–5.3k, 77–78 declines, 9k–42k residents.
- Sensible player (builds what needs ask for, answers history, plays cheap cards): score 36.7k–43.1k, 3–7 declines, 168k–200k residents.
- Engine and balance runs (no player) are unchanged: needs, the workshop-zone fix and the Market Cross market rule apply only to cities founded in the game.

**Tests**: new `tests/milestoneC.test.js` (8, including the exit test: passive < 50% of sensible). `phase4` and `construction` tests rewritten for announced history and the new building limits.

## v1.5 — The Market Hall (cards) and Milestone A (phone, accessibility, performance, PWA)

See `docs/AUDIT.md` for the review this release responds to and `docs/ROADMAP.md` for what comes next.

**History cards you buy, hold and play** (new `src/cards.js`, `src/Cards.jsx`)
- The Market Hall restocks every decade with 3 cards and a sealed pack (2 cards, the first Uncommon or better). A new selection costs a rising fee. Rarity odds shift from 60/28/10/2% (1300) to 40/32/20/8% (2030) and are shown in the shop.
- Prices scale with the city's income (one unit = max(40 × era cost, 5 × yearly revenue); Common 2, Uncommon 4, Rare 8, Epic 16 units), so the treasury finally has something worth saving for.
- Hold up to 5 cards (6 at Town Center level 3, 7 at level 5) in a tray under the map. Play a card when the moment is right, sell it for half, or merge three of one rarity into one of the next.
- The same card can be stacked up to 3 times (100% / 50% / 25%). For each effect, your strongest hand card counts fully and the rest at 35%.
- Cards show the collections (synergies) they belong to, such as "Renaissance 1/3". Buying makes sets reachable goals instead of luck.
- Cards in play cost a little upkeep each year (0.4–2% of revenue); the budget gains a "cards" line.
- Played cards are recorded as choices tagged `via:'hand'`; Turning Points still count to 20. Saves keep schema 10, and older saves start with an empty hand.

**Phone shell** (new `src/mobile.css`)
- In the game, the app header is gone and the HUD is one 56 px row. The tool rail is a bottom dock (Explore · Zoning · Build · Taxes · Layers) whose sections open as a sheet; picking a tool closes the sheet. **Taxes is now reachable on phones.**
- The home screen puts "Found a new city" first. Two-finger pinch zooms and pans the map in any tool.
- The clock resumes automatically after a Turning Point, as it already did after events.

**Accessibility**
- Every game-screen control on phones is at least 44 × 44 px. No text is smaller than 11 px (previously 8–10 px in 120+ rules).
- About 40 grey text colours were darkened just enough to reach 4.5:1 contrast on paper and deep-paper panels.

**Performance**
- The map's static layers are cached per canvas and composited each frame; windmills, boats, walls, labels and captions are drawn live. While the clock runs, the cache may lag by up to max(350 ms, 4× its rebuild cost). The output is pixel-identical to v1.4. Late-game draw on a 4×-throttled phone (1900 city): average 167 → 66 ms per frame.

**Installable app (PWA)**
- Web app manifest, icons (any and maskable), and a service worker that caches the app shell, fingerprinted assets and Google Fonts, so the game installs to the home screen and plays offline. An "Install app" button appears on the home screen when the browser offers it. Works at `/` (Vercel) and `/<repo>/` (GitHub Pages).

**Tools**: project skills in `.claude/skills/`, including a headless playtest bot (`headless-playtest`) and vendored community game-dev skills (see `docs/AUDIT.md` §5).

**Tests**: new `tests/cards.test.js` (19: shop, pricing, determinism, buy, pack, reroll, sell, merge, play, building cards, stacking, expiry, upkeep, collections, save round-trip, zone invariant over a campaign) and `tests/pwa.test.js` (3), both in the default `npm test`.

## v1.4 — Phase 4: The living map

**A map with a vibe** (new `src/render.js`, drawn in the spirit of an annotated historical map)
- Streets are traced as continuous lanes between junctions and smoothed into curves: medieval lanes wander, planned streets stay straight, modern roads are wider. Main roads are long curved routes with casings; bridges have decks.
- Houses are no longer squares. Each parcel holds buildings facing its street: narrow timber row houses with yards and outbuildings, stone and brick terraces, perimeter blocks with courtyards in dense quarters, sawtooth-roofed workshops, farmsteads, churches with naves and towers, and distinctive shapes for landmarks. Roofs are tinted by age and use, red roofs mixed in, with soft shadows.
- The countryside is a patchwork of striped fields, hedges and tree clumps; water has soft shores, deep channels and current lines; windmills turn on farms (before 1900) and bastions; boats sail the water (steam after 1850).
- A cartouche gives the year, city name, era and population, with a compass rose and a scale bar. District names are lettered in italics.
- City walls follow the outline of the built-up town and stop at the shore, as in Amsterdam, instead of a circle. Round towers before 1550, angular bastions after, gates where roads pass through; the preview, cost and length use the real outline. Canal and boulevard rings inherit the shape.

**History knocks**
- 17 historical events from the Great Mortality (1340s) to the Digital Gold Rush (1995+): the Weavers' revolt, a holy relic, the printing press, the Iconoclastic Fury, merchants in exile, speculative mania, draining the marsh (water cities), a learned society, revolution, the railway, cholera, the general strike, war, the motorway plan, squatters, the tech campus.
- Each pauses the clock with two responses that change residents or treasury now and apply modifiers for 10–60 years (e.g. tolerating the reformers: migration +12%, commerce +5%, faith −12% for 40 years). Roughly one per generation, each in its own era and once per city, never in a Turning Point year.
- Fires, floods and epidemics now ask how the city responds: rebuilding in brick and stone halves fire damage for 60 years, raising dykes, opening a pest house…
- After you answer, the clock resumes at the same speed. Answers are written into the Chronicle timeline.

**Captions on the map**
- Events, disasters, new landmarks, public works and new eras appear as italic notes pinned to their spot on the map ("August 1566: crowds of Protestants smash statues…") and fade after a few seconds.

**Timelapse**
- Replay any city as one map every 50 years plus the present, cross-faded, framed on the town as it finally grew, each map captioned with the most memorable event of its half-century. Play, pause, step, jump to a year, and save the replay as a video (.webm). Open it from the top bar or the Chronicle.

**Tests**: 131 passing. New `tests/phase4.test.js` (event pacing, eras and uniqueness; events opt-in for headless runs; pausing, answering, timed effects and saving mid-event; organic walls; smooth streets; timelapse frames and captions).

## v1.3 — Phase 3: Identity and place

**Location matters**
- Buildings radiate influence over nearby parcels: smoke from workshops and factories (strongest 1750–1950), prestige from monuments, museums, artists' workshops, universities and protected old buildings, public services from churches, schools, clinics, town halls and civic buildings, and trade access from markets, ports, stations and main roads.
- Effects: homes in smoke cost prosperity (up to −12), homes without services cost and well-served homes earn prosperity (−9 … +6), homes near prestige earn up to +5; shops with trade access are up to 20% more productive; before 1850 riverside workshops are up to 15% more productive; prestige lifts tourism.
- Growth now sorts itself into quarters: homes seek prestige and services and shun smoke; shops seek markets and main roads; workshops avoid fine quarters and like water before steam; parish churches spring up where homes lack services (before 1850).
- New map layers: Districts, Land value, Pollution, Public services. The building inspector shows a parcel's district, land value and service reach.

**Districts**
- Main roads, walls, canal/boulevard rings and water divide the land; any piece with 10+ buildings becomes a district, re-surveyed every five years.
- Each district is named once from its character and era (Old Town, St. Agnes, Mill Quarter, Merchants' Row, Cathedral Close, University Quarter, Riverside, Foundry District, Northgate, Garden Suburb…) and keeps that name for good, so names record history.
- District names are lettered on the map in italic survey style. The new Identity tab lists districts with their use, buildings, homes, jobs, empties and landmarks.

**City character**
- A compass of Trade, Industry, Culture, Faith and Learning, read from jobs, prestige, religious influence and education, titles the city (Merchant City, Mill Town / Industrial City, City of Arts, City of Spires, City of Learning, or A Balanced City).
- Character steers growth (more shops or workshops) and Turning Points: matching cards are offered more often (up to ×1.9). A strongly industrial city also grows small workshops on unzoned land.
- Stacked trade and industry bonuses now have diminishing returns (+100% → +74%, +200% → +118%) so a single-minded city stays strong without running away.

**Policies** (Identity tab; adopt or repeal at any time, undoable)
- Guild Charters (1300–1799), Religious Tolerance (1500+), Free Port (1550+, water), Stone & Brick Fire Code (1600+), Board of Health (1700+), Public Schooling (1800+), Heritage Law (1850+), Garden City Planning (1900+). Each has a clear trade-off (e.g. Tolerance: migration +15%, commerce +5%, faith −20%; Free Port: commerce +15%, treasury −10%; Heritage Law: 150-year-old buildings are never redeveloped).

**Fixes**
- Statistics computed mid-month after new buildings appear are now exact outside the growth step (the month-start influence fields are frozen only while the engine itself is growing the city).
- Reoccupied buildings and reverted ring conversions no longer leave empty fields behind, so saves round-trip exactly.

**Tests**: 125 passing. New `tests/phase3.test.js` (smoke and garden cities, parish coverage, homes avoiding smoke, district naming and persistence, character and card steering, policies). Updated intent: zoning steers *what* grows (workshops need a district), an industry-led run diverges economically from a default one, and a population build is now ≥1.2× an industrial build (was 1.4×, industrial cities draw workers too).

## v1.2 — Phase 2: Balance and economy

**Scale**
- Each map building now stands for a block: capacities, jobs and every population threshold are ×12. A well-run town has a few thousand people by 1500, tens of thousands by 1600 (Amsterdam had ~30,000 in 1570) and a few hundred thousand by 2030, so the Atlas's real-city comparisons now mean something. Per-person figures (GDP per capita, tax per resident) and Legacy Point rewards are unchanged.
- Thresholds rescaled: Growing Metropolis achievement 120,000; Great Metropolis 600,000; Metropolis Charter 144,000; Factory Town per 12,000 manufacturing jobs; Atlas identities.
- Saves migrate to schema 10 (residents, capacities, jobs and recorded populations ×12).

**Money that matters**
- Surveying new land costs treasury (0.35 per parcel in 1300, rising with the eras); rezoning already-zoned land is free; undo refunds. The map shows parcels and price while you drag. Zoning the whole map at the start is no longer possible.
- New annual spending: public services per resident (rising from 30% to 56% of the average per-resident tax across the eras), upkeep of civic buildings (1.2% of their price per year) and landmarks, plus the existing streets/buildings/walls maintenance.
- Per-resident taxes are ~47% higher to pay for it. At average taxes a normal city now runs a thin surplus; Low/None taxes run deficits.
- Empty treasury → budget crisis: the unpaid share of spending becomes a service shortfall (up to −15 prosperity and half the usual newcomers) that eases off slowly once the books balance. The top bar and budget panel warn about it.
- The budget panel itemises public services, institutions, and maintenance.

**Decline and failure**
- Prosperity now drives migration (poor towns attract up to 75% fewer newcomers, great ones 35% more), and prosperity below 38 makes people leave.
- Vacancy: when housing occupancy falls under 75%, or jobs far exceed workers, a quarter of the excess empties each year (informal and oldest buildings first). Empty buildings house and employ nobody, are drawn as faint outlines, are reoccupied first when demand returns, and are torn down after 12 years ("Abandoned").
- Crowding: Dense Living (−3), Housing Revolution (−3) and Vertical Metropolis (−2) now cost prosperity. Population-focused cities are bigger but less livable again.
- Business cycles: each city has its own 18–30 year boom-and-bust rhythm (±24% business growth, ±3.6% GDP), shown as Expansion / Steady / Recession.

**Cards**
- Each Turning Point card shows its measured impact on the city right now (residents, GDP, prosperity, culture, religion, education, tourism), how long temporary cards last, and any crowding cost.
- Decision history shows whether temporary cards are still active and for how many more Turning Points.
- Run Bonuses show crowding and prosperity as points, not percentages.

**Tests**: 119 passing, none pending. New `tests/phase2.test.js` (historical scale, survey costs and refunds, budget margins, tax-free crisis, vacancy and abandonment, crowding, business cycles, save migration). The balance fixture now zones like a player (6×6 blocks as the treasury allows). The livability test is restored; the sprawl test now asserts sprawl does not buy a bigger city.

## v1.1 — Phase 1: Living City

**Time**
- The simulation now runs month by month. Streets, buildings, population and the treasury change every month; development momentum settles every January. The archive still records a survey every 5 years and a map every 50.
- New calendar speeds: 1× = 3 months/s, 2× = 6, 4× = 12, MAX = 36 (about 3 years a second). The clock runs on a steady timer and catches up gracefully on slow devices.
- Everything works while time runs: zoning, erasing, demolition, construction, public works, taxes and protection. Edits land on the running city.
- Space pauses and resumes, Ctrl/Cmd+Z undoes (up to 40 edits), Escape returns to Explore.

**Organic growth**
- Each new town starts at a crossroads: two or three country roads meander from the founding point to the edge of the map (eight-directional routes over value noise, hugging riverbanks).
- Minor lanes sprout from the network every month in the style of the era: short wandering medieval lanes, then longer straight planned streets with wider blocks.
- Streets head for zoned land that no street reaches yet, newest zoning first; freshly zoned districts fill before older leftovers.
- Unzoned land near the town (or along a main road) grows informally: smaller homes, shops and fields drawn slightly faded. Zoning steers growth and builds denser; it no longer gates it.
- Streets are only laid when needed (when plots run short or new zoning is unserved), so the network grows with the town.

**Public works**
- City Wall (1300–1749): rings the dense core on the old town's bank; +2 prosperity, +3% migration, new homes cluster inside. Up to two standing walls (concentric rings).
- Canal Ring (1580+, water maps) and Boulevard Ring (1750+): replace the innermost wall with a ring of streets (and a canal), adding trade/transport/heritage or transport/prosperity.
- Bridge: click a bank or the water; straight crossings up to 12 cells. A new country road leads away from the far bridgehead and the near end links to the streets.

**Taxes (residents, commerce, industry)**
- Four levels per sector: None, Low, Average, High. Lower taxes raise that sector's growth demand (+35% / +15%); High raises revenue (+45%) and cuts demand (−28%). Residential taxes also move prosperity (+4 … −5) and migration.
- The budget panel shows annual income by sector, upkeep (streets, buildings, walls) and net; the top bar shows the treasury.
- Revenue keeps the v1.0 total at average rates but half of the per-resident part is now paid by employers per job, so business taxes matter from 1300.

**Other changes**
- Early centuries grow faster (medieval build pace ×3, stronger early migration) so a young town visibly grows.
- Migration magnets can now push a little past full occupancy (up to +12%).
- Grand Workshops commission a masterpiece every 30 years while a workshop stands (previously a dice roll).
- Out of land, cities densify at the v1.0 pace (about once per five years).
- Survey snapshots record walls, bridges and main roads, so historic maps show what stood then.
- Saves migrate to schema 9 (taxes, budget, walls, bridges, routes); older saves keep their roads and gain organic growth from them.

**Tests**: 110 passing, 1 marked todo. New `tests/phase1.test.js` covers monthly change, country roads, informal growth, streets reaching new zones, erase, taxes, demolition + undo, walls → canal ring, bridges and save/load. Intentional rule changes updated in existing tests: schema 9; planned vs unzoned city now ≥1.5× (was 2×) because unzoned towns grow; the housing-shortage scenario zones out all spare land. **Todo for Phase 2**: a population-focused build no longer loses livability versus an industrial build (monthly migration removed the five-year overshoot that caused overcrowding).

## v1.0.1 — Phase 0: bugs and broken UI

**Fixes**
- Top bar "GDP / person" showed total GDP; it now shows GDP per resident.
- Urban Demand panel, planned-building preview, city-evolution header and the map key's street / landmark / water swatches had no styles; all are now styled.
- The hidden backup-import file picker no longer appears on the home screen (`[hidden]` now wins over the global `input` rule).
- Game screen no longer overflows the window on desktop: the game body is pinned to the viewport and the side panels scroll on their own.
- Phone layout: the map now takes the screen (it was a ~200px strip), the tool strip is a single row, the map opens zoomed to the city, the map key starts collapsed behind a new **Key** button, and the Legacy chip is hidden from the top bar.
- Urban Demand explanations now always match the level shown (no more "stable — shops are scarce").
- Tourism zoning now opens when **Tourist Paradise is chosen** in the run. Buying it in the Legacy Market makes it eligible to be offered. *(Design change; to revert, make `tourismUnlocked()` in `src/sim.js` check `city.turning.cardPool` again.)*
- Autosave while the clock runs: every 4 seconds of real time and immediately when the tab is hidden or closed.
- Streets now form one connected network: each new parcel is linked back to the founding core along planned streets (medieval meanders are bridged at corners; building plots are never cut through). 83–96% of street tiles now join the main network, up from about 20%. Districts across the river stay separate until bridges arrive in Phase 1.
- Growth gravitates to each city's own founding point (stored as `city.origin`) instead of a hard-coded spot. Older saves keep their original reference point.
- The map key lists every zone type in play (Civic was missing; Tourism appears once it is available).
- Removed unused code (`placeLandmark`, `PopulationChart`).
- Performance: new buildings no longer recalculate full city statistics twice each, and the home screen only summarises saves while it is open.

**Balance**: full 1300–2030 campaigns stay within ±2% of v1.0.0 on population, treasury and Legacy Points.

**Tests**: 99 passing (5 new regression tests in `tests/phase0.test.js`; the two tourism tests were updated for the new unlock rule).
