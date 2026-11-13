# CIVITAS — Doctrines: a roguelite card design

*November 2026 · design for the next milestone (R). Builds on the v1.7 card
economy (Market Hall, hand, era drafts) and the needs/history/score systems.*

## 1. The idea in one paragraph

CIVITAS is played offline, on your own. Each run is one city, 1300–2030 (≈ 20 minutes at normal speed, §7). You found it with a
**Founder**, buy and draft cards, and **commit to a doctrine**: a Holy City, a
Forge City, a Merchant Republic, a City of the Arts, a Seat of Learning or a
Teeming Metropolis. Cards of one doctrine **reinforce each other** through
doctrine tiers, card levels and evolutions, so a focused city beats a city
with "one temple, one factory, one museum". Every doctrine bends a *different*
game system (needs, history, the shop, drafts, growth), so a Holy City run
*plays* differently from a Forge City run, not just with different numbers.
Your first run is broad. What you discover unlocks deeper cards, Founders and
hardships, so later runs are planned builds.

References: Vampire Survivors (weapon levels, evolutions, banish), Balatro
(shop economy, interest, multiplier "jokers"), Teamfight Tactics (trait
thresholds), Hades and Slay the Spire (Heat/Ascension, options-first meta).
We copy structures, never cards.

## 2. What changes from v1.7

| Today | New |
|---|---|
| 7 domains, 10 fixed three-card synergies | **6 doctrines + Civic (neutral)**; synergy comes from *counting* cards of a doctrine (tiers at 2/4/6/8), so any Faith cards work together |
| Repeat copies count 100 / 50 / 25% | Repeat copies **level the card up**: Lv2 ×1.5, Lv3 ×2 and unlocks its evolution |
| "Strongest card per effect counts, the rest at 35%" | Removed. The constraint is **slots**: 8 Decree slots (9 at Town Center L3, 10 at L5) |
| Merge 3 of a rarity → random card of the majority domain | Merge 3 cards **of one doctrine** → next rarity of that doctrine |
| Legacy Market sells flat bonuses (+capacity, +trade) | The Legacy Market (outside the run) sells **starting artifacts, boosters and permanent upgrades**, plus unlocks. Every playthrough starts a little stronger (§8) |
| Run always lasts to 2030 | A city can fall into **Ruin** (rare at Hardship 0) |
| Era drafts are 3 Rare+ cards | Each era ends with an **Era Trial** (a big telegraphed crisis). Doing well upgrades the draft |

## 3. Anatomy of a card

```
┌───────────────────────────────┐
│ ✣ FAITH          RARE · LV 2  │  doctrine glyph + colour, rarity, level pips
│ Confraternity                 │
│ [ DECREE ]                    │  type: Building · Decree · Event · Patron
│ Churches serve homes 3 parcels│  one line, one effect
│ farther.  Lv3: 6 parcels.     │  level steps
│ ⟳ Evolves with Sacred City    │  evolution hint (Lv3 only)
│ ⚒ 2,400 · upkeep 0.7%/yr      │
└───────────────────────────────┘
```

**Types**
- **Building**: placed on the map. Counts toward its doctrine while it stands. Answers needs. Doesn't use a slot.
- **Decree**: a permanent rule that takes a slot. This is the core of a build.
- **Event**: instant or timed (20–40 years). No slot. Counts toward its doctrine while active.
- **Patron**: an epic "engine" that scales with your doctrine count. Takes a slot. One per doctrine.

**Tags**: every card has one doctrine; about 10 hybrid cards have two and count for both (§6). Civic cards have none.

**Levels**: buying a card you already have in play levels it up (max Lv3), instead of adding a weaker copy. Lv3 Buildings and Decrees can **evolve** when their partner Patron is in play (§5).

## 4. Doctrines

Each doctrine has a **fantasy**, a **rule-bender** (its tier-4 bonus changes how another system works, which is what makes runs play differently), a **payoff**, and a **weakness**.

Tiers count Faith cards in play (Buildings standing + Decrees + active Events + Patron), with levels counting once.

### ✣ Faith: the Holy City
*Fantasy:* a pilgrim town of bells, cloisters and a cathedral on the hill.
- **2:** churches and chapels serve homes 30% farther.
- **4 (rule-bender, needs):** every church also counts as a **market** for nearby homes (pilgrim fairs). One building answers two needs.
- **6 "Holy City":** each religious building yields pilgrim income. Plague and war outcomes are halved (sanctuary).
- **8 "Sacred Capital":** score ×1.25 while prosperity ≥ 60.
- **Weakness:** tithes. Treasury income −10% from Faith 4, and industry output −10%.

### ▥ Industry: the Forge City
*Fantasy:* mills on the river, then chimneys, rail sidings and a smoky boom.
- **2:** zoned workshop land develops 50% faster.
- **4 (rule-bender, economy):** every workshop pays a levy, so treasury grows with jobs. Workshops count as a market for homes within 4 parcels (company stores).
- **6 "Industrial Giant":** industry output +40%, compounding with manufacturing jobs.
- **8 "Workshop of the World":** score also counts jobs: +0.5 point per 1,000 jobs per year.
- **Weakness:** smoke. Clean-air needs fill 50% faster; homes near works lose prosperity.

### ▣ Trade: the Merchant Republic
*Fantasy:* a harbour of exchanges, canals and counting houses.
- **2:** Market Hall prices −10%.
- **4 (rule-bender, shop):** +1 offer at every restock, and you may **lock** one offer into the next restock.
- **6 "Merchant Empire":** selling a card refunds 100%, and the treasury earns **interest**: +1% a year per 1,000 held, capped (Balatro-style).
- **8 "City of Bankers":** score also counts treasury: +1 point per 1,000 held per year.
- **Weakness:** volatility. Business-cycle swings are doubled, and history that costs money costs 50% more.

### ✦ Arts: the City of the Arts
*Fantasy:* ateliers, theatres, museums and a festival every summer.
- **2:** public gardens and landmarks clear the smoke around them (answer clean-air needs).
- **4 (rule-bender, land):** landmarks raise land value over twice the radius. Growth pulls the rich toward them, making fine quarters.
- **6 "The Renaissance":** tourism income equal to 3% of revenue per Arts card, and masterpieces every 20 years.
- **8 "Capital of Culture":** score ×(1 + prestige share), up to ×1.3.
- **Weakness:** patronage is dear. Arts cards have 1.5× upkeep.

### ◆ Learning: the Seat of Learning
*Fantasy:* a cathedral school that becomes a university town, then a science city.
- **2 (rule-bender, history):** foresight. History is announced **10 years** ahead instead of 6.
- **4 (rule-bender, drafts):** era drafts offer **4** cards instead of 3, and you may reroll one draft per run.
- **6 "Knowledge Capital":** innovation compounds productivity: +1% per decade per Learning card.
- **8 "City of Reason":** levelling a Learning card is free.
- **Weakness:** slow. Learning payoffs grow over decades, and its Buildings are the dearest of their era.

### ◉ People: the Teeming Metropolis
*Fantasy:* a city of arrivals, tenements, new districts and endless streets.
- **2:** declines empty 50% fewer homes.
- **4 (rule-bender, map):** districts form at 7 buildings instead of 10, so you get more districts, more building slots (one per district) and more needs.
- **6 "Vertical Metropolis":** needs fill 30% slower. Housing +20%, migration +25%.
- **8 "World City":** score ×1.2 from population above 100,000.
- **Weakness:** crowding. Prosperity −1 per People tier (−4 at tier 8), offset only by services.

### ⌂ Civic (neutral)
The everyday buildings every city needs (Town Hall, Clinic, Waterworks, Station, Library…) and a few wildcards. They answer needs but build no doctrine. **A spread city is a Civic city**: comfortable, never great.

### Why focus wins (target numbers)
With 8 slots, compare:
- **Spread:** 1–2 cards in each of 5 doctrines. Base effects only, no tier above 2.
- **Focused:** 6–8 in one doctrine plus 2 Civic. Base effects plus tiers 2, 4 and 6, often 8, plus one Lv3 evolution.

**Target:** a focused city scores ≥ 1.3× a spread city on the median of 4 seeds, and every doctrine's focused city is within ±20% of the others (§9).

## 5. Evolutions (one wonder per doctrine)

A **Lv3** Building or Decree plus its doctrine's **Patron** in play evolves into a **Wonder** (Legendary). It's a unique map landmark with a big, visible effect and a moment in the Chronicle.

| Doctrine | Lv3 card | + Patron | → Wonder | Effect |
|---|---|---|---|---|
| Faith | Parish Chapel | Sacred City | **Cathedral of St. ‹district›** | 3×3 landmark; faith ×2; serves every home within 12; pilgrim income |
| Industry | Power Works | Industrial Revolution | **The Great Foundry** | industry ×2; its smoke radius halved |
| Trade | Market Square | Merchant Republic | **The Grand Exchange** | +2 Market Hall offers; one free reroll per decade |
| Arts | Artists' Workshop | Cultural Renaissance | **Palace of the Muses** | prestige across the whole city; tourism income ×2 |
| Learning | Free University | Knowledge Economy | **University of ‹city›** | era drafts guarantee an Epic; History announced 14 years ahead |
| People | Stone Granary | Vertical Metropolis | **The Metropolis Charter** | housing +30%; new districts found themselves along main roads |

## 6. The card list

12 cards per doctrine (4 Common, 4 Uncommon, 3 Rare, 1 Epic Patron), 11 Civic, and 7 new hybrids: **90 cards plus 6 Wonders**. **54 already exist** (marked •, all of today's cards are placed below), 14 are today's basic buildings turned into cards (marked ▪), and 22 are new (marked +, including the 7 hybrids).

| Doctrine | Common | Uncommon | Rare | Epic (Patron) |
|---|---|---|---|---|
| ✣ Faith | ▪ Parish Chapel · • Spiritual Awakening · + Pilgrim Road · + Tithe Barn | • Monastic Tradition · • Sacred Architecture · + Relic of the Saint · + Confraternity | • Great Pilgrimage · • Religious Golden Age · • Holy Scholars (✣◆) | • Sacred City |
| ▥ Industry | • Master Craftsmen · • Industrial Expansion · + Water Mill · + Coal Wharf | • Abundant Resources · • Clean Foundries · ▪ Power Works · • Trading Empire (▥▣) | • Factory Town · • Ruthless Industrialization · • Economic Miracle | • Industrial Revolution |
| ▣ Trade | ▪ Market Square · • Commercial Revolution · • Transport Network · + Toll Bridge | • Canal Exchange · • Grand Boulevard · ▪ Guild Hall · + Letters of Credit | • Great Port · • Merchant Republic · • Golden Age | + The Bourse (interest engine) |
| ✦ Arts | • Hire Artists · • Patron of the Arts · • Festival Calendar · ▪ Public Gardens | • Cultural Boom · • World Heritage · ▪ City Museum · + Theatre District | • Grand Workshops · • City Monuments · • Tourist Paradise (✦▣) | • Cultural Renaissance |
| ◆ Learning | • Great Scholars · ▪ Public School · + Printing Press · + Almanac | • Scientific Revolution · • Administrative Excellence · • Public Works Academy · + Learned Society | • Free University · • Enlightenment · + Observatory | • Knowledge Economy |
| ◉ People | • New Settlers · • Fertile Families · • Urban Expansion · ▪ Stone Granary | • Land of Opportunity · • Dense Living · • Charter Districts · • Great Migration | • Housing Revolution · • Metropolitan Magnet · • City Reinvention | + Vertical Metropolis (today a synergy; becomes the Patron) |
| ⌂ Civic | ▪ Town Hall · ▪ Clinic · ▪ Waterworks · • Civic Reform | ▪ Rail Station · ▪ Hospital · ▪ Civic Library · • Urban Renewal | • Grand Patronage · • Monumental Ambition · • World Exposition | — |

**Hybrids** (count for both doctrines; they make two-doctrine builds work). Today's 10 synergies map onto the new system:

| Hybrid card | Doctrines | Replaces synergy |
|---|---|---|
| Holy Scholars | ✣ + ◆ | Sacred Scholarship |
| Trading Empire | ▥ + ▣ | — (it is already a trade card filed under industry) |
| + Industrial Renaissance | ▥ + ✦ | Industrial Renaissance |
| Tourist Paradise | ✦ + ▣ | Heritage Jewel |
| + Pilgrim Fairs | ✣ + ▣ | — |
| + Model Village | ▥ + ◉ | — |
| + Great Modernization | ◆ + ◉ | Great Modernization |
| + Cathedral School | ✣ + ◆ | — |
| + Opera House | ✦ + ◉ | — |
| + Patent Office | ◆ + ▥ | — |

The other six synergies become tier-6 names: Holy City, Industrial Giant, Merchant Empire, The Renaissance, Knowledge Capital and Vertical Metropolis.

**Writing rule** (from the `ux-copy` and `card-game` skills): one effect per card, stated as an outcome ("Churches serve homes 3 parcels farther"), with level steps on a second line. No "Immediate momentum: Population attraction +21".

**Power budget:** a Common Decree is worth about +15% to one output at Lv1. Each rarity step is ×1.6. A level step is ×1.5. Tier bonuses are roughly the value of 2 extra cards (tier 4) and 4 extra cards (tier 6). Patrons scale +4–6% per doctrine card. These are starting values; `balance-check` confirms them in step R2.

## 7. A run

| Phase | Years (≈ 20 min at normal speed) | What you do |
|---|---|---|
| **Founding** | 1300 | Pick a Founder, a geography and your artifacts. Open any boosters you bought. Place the Town Center. |
| **Act I, Medieval** | 1300–1500 | Market Hall every decade. Broad buys; find your doctrine. Era Trial ~1490 (a plague or a revolt). **Draft 1** (1500). |
| **Act II, Early modern** | 1500–1750 | Commit: tiers 2–4. Era Trial ~1740 (reformation or a speculative crash). **Draft 2**. |
| **Act III, Enlightenment** | 1750–1850 | Tier 6 and your first Lv3. Trial ~1840 (cholera or revolution). **Draft 3**. |
| **Act IV, Industrial** | 1850–1950 | The evolution, ideally. Trial ~1940 (war). **Draft 4**. |
| **Act V, Modern** | 1950–2030 | Tier 8, and score for the end. Trial ~1995 (motorway, tech rush). **Draft 5** (2000). Final judgement in 2030. |

- **Era Trials** are telegraphed crises like today's history, but bigger and scaled to your city. Each lists 2–3 answers, and **one answer is unlocked by your doctrine** (Faith: "The bishop opens the cloisters as hospitals"). Answering well upgrades the next draft (4 cards, one Epic). Answering badly declines a district.
- **Ruin (losing a run):** three districts in decline at the same time, or population below 40% of its peak after 1500, ends the chronicle early ("New Valdoria was abandoned in 1683"). The score and unlocks earned are kept. It's rare at Hardship 0 and a real threat from Hardship 3 up.
- **End of run:** a summary card ("Holy City · Faith 8 · Cathedral of St. Agnes · score 41,200"), the timelapse, Legacy Points earned, and how the city compares with your past runs and with historical cities (§8).

### Pacing: about 20 minutes a run

The clock ticks once per in-game **month**. Homes, streets and residents grow monthly. Needs, history, score and eras update yearly. The Market Hall restocks every decade. Nothing is skipped; v1.7's 1× speed is simply slow (3 months a second, a year every 4 s), so 730 years take about 49 minutes.

- **Normal speed becomes 1 year every 1.5 s** (8 months a second), so a run takes **≈ 18 minutes**. The shop restocks every 15 s, history and needs arrive in between, and an era lasts 2–5 minutes. Speeds: **Slow** (1 year / 3 s, ≈ 36 min, for reading), **Normal**, **Fast** (1 year / 0.75 s, ≈ 9 min), **MAX** (as now).
- **Quiet decades pass faster, busy moments slow down.** When nothing needs you (no open history, no need above half, nothing new in the shop), Normal runs at 1.5×. When the Market Hall, a history card or an Era Trial is open, the clock drops to ¼ speed instead of pausing, as in Mini Metro.
- **Saving:** a run autosaves every few seconds (as now), so a run can also be played in two or three sittings.
- Why not cut years? The 700-year arc and the timelapse are the game's identity. Pacing keeps the arc and removes the waiting.


## 8. Between runs: every playthrough a little stronger

CIVITAS is offline and solo: no accounts, no shared rankings. Progress is personal. Each run **earns Legacy Points** (from its score, its milestones and the Hardship it was played on), and you spend them **in the Legacy Market, outside the run**. Like Rogue Legacy, each new city starts stronger than the last; Hardships (below) are there if you want the challenge back.

**What the Legacy Market sells**
- **Starting artifacts** (relics). You take 1 into a run at first, and up to 3 as you unlock artifact slots. Each is a small, clear head start that shapes the run. Examples:
  - *Bishop's Crozier*: start at Faith 1; your first church is free.
  - *Guild Charter*: workshops develop 50% faster until 1500.
  - *Letters of Marque*: +1 Market Hall offer every restock.
  - *Founder's Purse*: +300 starting treasury.
  - *Old Survey Map*: needs show 5 years earlier.
  - *Seed Bank*: farms never decline.
- **Boosters**: sealed card packs bought between runs and opened at founding, straight into your starting hand.
  - Town Booster: 3 cards, one Uncommon.
  - Doctrine Booster: 3 cards of a doctrine you choose, one Rare.
  - Founders' Booster: 5 cards, one Epic.
- **Permanent upgrades**: today's ranks (Skilled Administrators, Urban Planning, Merchant Networks…) stay on sale and existing ranks are kept in full. They're joined by upgrades to the card systems: +1 hand size, +1 Decree slot, +1 free reroll a decade, a cheaper first card each restock, artifact slots 2 and 3.
- **Unlocks**:
  - Founders (the Mayor at the start; one per doctrine after reaching its tier 6 once),
  - the deeper cards of each doctrine (see mastery below),
  - geographies,
  - cosmetic map styles.
- **Historical figures**: the existing figure folios stay.

**The first run is broad, later runs are specific**
- The first run uses the **Starter Pool**: every doctrine's Commons and Uncommons plus Civic (about 45 cards), with no Patrons and no Wonders.
- **Doctrine mastery** (kept across runs):
  - reaching **tier 4** in a run unlocks that doctrine's **Rares** into the pool,
  - **tier 6** unlocks its **Patron**, its **Wonder** and its **Founder**,
  - **tier 8** unlocks a second Patron variant.

  Combined with a Doctrine Booster and a matching artifact, the second Faith run is a planned Holy City from 1300.

**Comparing your cities** (the Urban Atlas, offline)
- **Your past runs:** score, population and doctrine over time, ranked. This is already in the Atlas, plus a "best run per doctrine" shelf.
- **Historical cities:** reference curves of real cities' approximate populations over the centuries (e.g. Bruges, Venice, Amsterdam, London, Paris; clearly marked as approximate estimates). You see "your city in 1600 was as large as Amsterdam" and how its arc compares.

**Hardships** (optional, unlocked after the first completed run; stack 1–10): needs fill faster, plague years, a rival city that draws migrants, harsher Era Trials, dearer shops, less starting treasury, a stricter Ruin threshold. Each level adds +15% Legacy Points, so stronger profiles have a reason to play harder.

**Balance guard for meta power:** artifacts and upgrades make the early game easier but must not decide the late game. A fully upgraded profile should reach ≤ 1.6× the score of a fresh one at Hardship 0 (exit test 7); beyond that, Hardships are where the challenge lives.

## 9. Exit tests for milestone R

Measured with scripted players in `tests/helpers/strategies.js` (the `headless-playtest` method):

1. **Focus beats spread.** For each doctrine, a focused bot (buys and drafts only that doctrine plus Civic answers to needs) beats a spread bot (one of everything) by ≥ 1.3× median score over 4 seeds.
2. **Doctrines are balanced.** The six focused bots' median scores are within ±20% of their mean.
3. **Runs differ.** Two runs with different Founders share ≤ 40% of their in-play cards. Each doctrine's focused run bends its system measurably (Faith: fewer market buildings built; Learning: more history answered; Trade: more cards bought; and so on).
4. **First run is broad.** On a fresh profile no Patron or Wonder can appear, and a broad bot reaches tier 4 in at most one doctrine.
5. **Pace.** A meaningful choice at least every 90 s at 1× (shop restocks every 40 s at 1×; needs, history and trials in between).
6. **Fair loss.** The passive bot is never ruined at Hardship 0 and is usually ruined by Hardship 5.
7. **Each playthrough feels stronger.** The same sensible bot playing 5 runs in a row on one profile (spending its Legacy Points on artifacts, boosters and upgrades) scores higher on each of its first 5 runs. The 5th run reaches 1.2–1.6× the 1st at Hardship 0.
8. **Length.** A run at Normal speed with the sensible bot's decisions lasts 15–22 minutes of real time.

## 10. Build plan

| Step | Scope | Notes |
|---|---|---|
| **R1. Engine** (≈ 2 wk) | doctrine tags on all cards; tier counting and the 24 tier effects, including the 6 rule-benders, wired into needs, history, shop, drafts and districts; Decree slots; card levels (replacing diminishing stacks and the 35% guard); doctrine merging; shop lock and banish | Cities founded in the game only, like needs (`needsOn`). Engine and balance runs stay comparable. |
| **R2. Content** (≈ 2 wk) | 22 new cards (7 of them hybrids), 14 basic buildings as cards, 2 new Patrons (The Bourse, Vertical Metropolis), 6 Wonders (map landmarks, which feed Milestone D silhouettes); doctrine-coloured card frames and glyphs (the D "card art" item); doctrine tracker UI (TFT-style trait list); Era Trials | `balance-check` on the power budget; exit tests 1–3 |
| **R3. Runs and meta** (≈ 2 wk) | pacing (new speeds, quiet-decade speed-up, ¼-speed instead of pause); Founders; Starter Pool and mastery unlocks; artifacts, boosters and new upgrades in the Legacy Market; Ruin; end-of-run summary with past-run and historical-city comparison; Hardships 1–10 | exit tests 4–8; **replaces Milestone E's meta items** |

## 11. Decisions (resolved with the designer, November 2026)

1. **No online features.** CIVITAS is offline and solo. There is no daily ranking: comparison is with your own past runs and with historical cities (§8).
2. **Every playthrough should feel stronger.** Legacy Points buy starting artifacts, boosters and permanent upgrades in the Legacy Market. Existing upgrade ranks are kept in full. Hardships are optional and pay more Legacy Points.
3. **Runs of about 20 minutes**, by re-pacing the clock (Normal = 1 year per 1.5 s, quiet decades faster, decisions slow time instead of pausing it), not by cutting centuries.
