# CIVITAS changelog

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
