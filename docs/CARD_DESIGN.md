# CIVITAS — Doctrines: a roguelite card design

*November 2026 · design for the next milestone (R). Builds on the v1.7 card
economy (Market Hall, hand, era drafts) and the needs/history/score systems.*

## 1. The idea in one paragraph

Each run is one city, 1300–2030 (≈ 50 minutes at 1×). You found it with a
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
| Legacy Market sells flat bonuses (+capacity, +trade) | Legacy unlocks **options**: cards into the pool, Founders, geographies, Hardships. Flat bonuses capped at their current total and retired from sale |
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

| Phase | Years (1× ≈ 50 min) | What you do |
|---|---|---|
| **Founding** | 1300 | Pick a Founder and a geography. Place the Town Center. Start with the Founder's 2 cards. |
| **Act I, Medieval** | 1300–1500 | Market Hall every decade. Broad buys; find your doctrine. Era Trial ~1490 (a plague or a revolt). **Draft 1** (1500). |
| **Act II, Early modern** | 1500–1750 | Commit: tiers 2–4. Era Trial ~1740 (reformation or a speculative crash). **Draft 2**. |
| **Act III, Enlightenment** | 1750–1850 | Tier 6 and your first Lv3. Trial ~1840 (cholera or revolution). **Draft 3**. |
| **Act IV, Industrial** | 1850–1950 | The evolution, ideally. Trial ~1940 (war). **Draft 4**. |
| **Act V, Modern** | 1950–2030 | Tier 8, and score for the end. Trial ~1995 (motorway, tech rush). **Draft 5** (2000). Final judgement in 2030. |

- **Era Trials** are telegraphed crises like today's history, but bigger and scaled to your city. Each lists 2–3 answers, and **one answer is unlocked by your doctrine** (Faith: "The bishop opens the cloisters as hospitals"). Answering well upgrades the next draft (4 cards, one Epic). Answering badly declines a district.
- **Ruin (losing a run):** three districts in decline at the same time, or population below 40% of its peak after 1500, ends the chronicle early ("New Valdoria was abandoned in 1683"). The score and unlocks earned are kept. It's rare at Hardship 0 and a real threat from Hardship 3 up.
- **End of run:** a summary card ("Holy City · Faith 8 · Cathedral of St. Agnes · score 41,200"), the timelapse, and unlocks earned.

## 8. Between runs: options, not stats

- **First run** uses the **Starter Pool**: every doctrine's Commons and Uncommons plus Civic (about 45 cards), with no Patrons and no Wonders. It's broad by design ("all around the place"): you see every doctrine and none goes deep.
- **Doctrine mastery** (per doctrine, kept across runs):
  - Reaching **tier 4** in a run unlocks that doctrine's **Rares** into the pool.
  - **Tier 6** unlocks its **Patron**, its **Wonder** and its **Founder**.
  - **Tier 8** unlocks a **mastery card** (a second Patron variant).

  So the second Faith run is a planned Holy City.
- **Founders** (one at the start, then one per doctrine):
  - **The Mayor**, balanced. Starts with Market Square and Civic Reform.
  - **The Abbess.** Starts with Parish Chapel and Spiritual Awakening, Faith counts +1, and the shop leans Faith.
  - **The Guildmaster**, **The Merchant Prince**, **The Patroness**, **The Rector** and **The Settler-Captain**, the same pattern for the other doctrines.

  Each Founder has a small quirk (the Abbess's first church is free; the Merchant Prince starts with interest).
- **Hardships** (after the first completed run; stack 1–10, like Ascension or Heat): needs fill faster, plague years, a rival city that draws migrants, harsher Era Trials, dearer shops, less starting treasury, a stricter Ruin threshold. Each level multiplies legacy rewards.
- **Daily city:** one seed per UTC day, a fixed Founder and geography, one attempt, a shared ranking. *(Needs a small backend; see the open question in §11.)*
- **Legacy Market changes:** it sells unlocks (Founders early, geographies, card-pool expansions, cosmetic map styles). The current flat upgrades stop being sold and existing ranks are kept but capped, so new players aren't simply behind.

## 9. Exit tests for milestone R

Measured with scripted players in `tests/helpers/strategies.js` (the `headless-playtest` method):

1. **Focus beats spread.** For each doctrine, a focused bot (buys and drafts only that doctrine plus Civic answers to needs) beats a spread bot (one of everything) by ≥ 1.3× median score over 4 seeds.
2. **Doctrines are balanced.** The six focused bots' median scores are within ±20% of their mean.
3. **Runs differ.** Two runs with different Founders share ≤ 40% of their in-play cards. Each doctrine's focused run bends its system measurably (Faith: fewer market buildings built; Learning: more history answered; Trade: more cards bought; and so on).
4. **First run is broad.** On a fresh profile no Patron or Wonder can appear, and a broad bot reaches tier 4 in at most one doctrine.
5. **Pace.** A meaningful choice at least every 90 s at 1× (shop restocks every 40 s at 1×; needs, history and trials in between).
6. **Fair loss.** The passive bot is never ruined at Hardship 0 and is usually ruined by Hardship 5.

## 10. Build plan

| Step | Scope | Notes |
|---|---|---|
| **R1. Engine** (≈ 2 wk) | doctrine tags on all cards; tier counting and the 24 tier effects, including the 6 rule-benders, wired into needs, history, shop, drafts and districts; Decree slots; card levels (replacing diminishing stacks and the 35% guard); doctrine merging; shop lock and banish | Cities founded in the game only, like needs (`needsOn`). Engine and balance runs stay comparable. |
| **R2. Content** (≈ 2 wk) | 22 new cards (7 of them hybrids), 14 basic buildings as cards, 2 new Patrons (The Bourse, Vertical Metropolis), 6 Wonders (map landmarks, which feed Milestone D silhouettes); doctrine-coloured card frames and glyphs (the D "card art" item); doctrine tracker UI (TFT-style trait list); Era Trials | `balance-check` on the power budget; exit tests 1–3 |
| **R3. Runs and meta** (≈ 2 wk) | Founders; Starter Pool and mastery unlocks; Ruin; end-of-run summary and share; Hardships 1–10; Legacy Market rework | exit tests 4–6; **replaces Milestone E's meta items** |

## 11. Open questions

1. **Daily city ranking** needs a server (today everything is local). Ship daily seeds without a shared ranking first?
2. **Retiring flat Legacy upgrades.** Existing ranks are kept but capped. Acceptable, or grandfather them fully?
3. **Run length.** 50 minutes at 1× is long for mobile. Offer a "Short chronicle" (1300–1850, 3 drafts) for phones?
