---
name: balance-check
description: "Find balance outliers, broken progressions, degenerate strategies and economy imbalances in CIVITAS formulas and data (cards, events, policies, taxes, buildings, legacy bonuses). Use for 'check game balance', after tuning numbers, or when a strategy seems to dominate."
argument-hint: "[economy|progression|cards|events|legacy|path-to-file]"
---

<!--
Adapted from `balance-check` in Donchitos/Claude-Code-Game-Studios (MIT, commit abc0de7),
https://github.com/Donchitos/Claude-Code-Game-Studios — see ../_licenses/.
Changes: removed the studio framework's config hook, GDD/registry lookups and
automation-mode references; pointed data sources at this repository; added the
headless-playtest bot as a source of runtime evidence.
-->

# Balance Check

## Insufficient input — check this before producing any report

**If the inputs this skill needs do not exist, the answer is "could not run",
not a filled-in report.** Check first, and stop if the check fails.

1. List the inputs this skill reads (data files, source code, test output, playtest output).
2. For each, record `FOUND` or `ABSENT`, not "assumed present".
3. If any input required for a section is ABSENT, that section is **`NOT ASSESSED — NO DATA`**. Do not estimate it or infer it from an adjacent artifact.
4. If **every** required input is ABSENT, stop and report **`NOT ASSESSED — NO DATA`** as the whole verdict, naming what was missing.

**A verdict of `NOT ASSESSED` is a success.** Absence of evidence is never
evidence of absence: say whether a scan found nothing or had nothing to scan.

---

## Phase 1: Identify balance domain

From the argument:

- **Economy** → treasury faucets and sinks: `src/economy.js` (taxes, revenue, upkeep), building costs in `src/construction.js`, public works in `src/sim.js`.
- **Progression** → population and development curves: `src/growth.js`, `src/development.js`, Town Center levels in `src/construction.js`, eras in `src/sim.js`.
- **Cards** → Turning Point cards, rarities and synergies: `src/turningPoints.js`.
- **Events** → historical events and their timed effects: `src/events.js`.
- **Policies** → `src/policies.js`.
- **Legacy** → meta-progression bonuses and milestones: `src/legacy.js`, `src/achievements.js`.
- **File path given** → load that file and infer the domain.

If no argument, ask which domain to check.

## Phase 2: Read data and targets

- Read the source files above. Note every file read; they go in Data Sources.
- Intended targets come from, in order: `tests/balance.test.js` and `tests/helpers/balance-fixture.js` (asserted ranges), `CHANGELOG.md` (stated intent, e.g. "full campaigns stay within ±2%"), and `docs/AUDIT.md` (design goals such as "an unspent treasury that keeps climbing is a bug").
- Values with no target anywhere are listed as `no stated range — not judged`.

## Phase 3: Gather runtime evidence

Run the baseline bot from the `headless-playtest` skill (always option 1, no map
actions after setup) and, if the domain allows, `npm run balance`. Record
population, treasury and decision counts per century. If the dev server or
Playwright can't run, mark runtime sections `NOT ASSESSED — NO DATA`.

## Phase 4: Analysis

**Every domain:** compare each named value with its target. Out of range = an outlier row.

**Economy**
- Map all treasury faucets and sinks with flow rates; project accumulation over a campaign.
- Check whether the treasury ever constrains the player (does spending ever fail for lack of money after the first century?).
- Check for options never worth buying, and for options always worth buying.

**Progression**
- Population and development curve per century; dead zones (no visible change for > 2 real minutes at normal speed) and spikes.
- Do gates (Town Center levels, era unlocks) line up with when the player can reach them?
- Does the passive bot reach the same outcome as an active player? If yes, that's a **degenerate strategy: doing nothing**.

**Cards / events / policies**
- For each choice, is one option strictly better than the others? (dominance)
- Do permanent stat bumps stack into runaway growth?
- Does any option have a cost the player can actually feel?

**Legacy**
- Do bonuses make later runs easier without making them different? Is there a point where runs become trivial?

## Phase 5: Output

```
## Balance Check: [Domain]

### Data Sources Analyzed
- [files, commands run]

### Health Summary: [CRITICAL ISSUES / CONCERNS / NOT ASSESSED / HEALTHY]

### Outliers Detected
| Item/Value | Expected Range | Actual | Issue |
|-----------|---------------|--------|-------|

### Degenerate Strategies Found
- [Strategy and why it's a problem]

### Progression Analysis
[Table of the curve per century]

### Recommendations
| Priority | Issue | Suggested Fix | Impact |
|----------|-------|--------------|--------|

### Values That Need Attention
[Specific values with suggested adjustments and rationale]
```

Health Summary, worst finding first:
- **CRITICAL ISSUES**: a degenerate strategy (one choice dominates every alternative, including "do nothing"), a progression that stalls, or an economy with no meaningful sink.
- **CONCERNS**: outliers or curve problems a tuning pass can fix.
- **NOT ASSESSED**: missing data or targets; name which.
- **HEALTHY**: every value judged against a stated target, no outliers, no degenerate strategies.

## Phase 6: Fix and verify

Offer: fix the highest-priority issue now, save the report to `docs/balance/balance-check-[domain]-[YYYY-MM-DD].md`, or stop. After any numeric fix, re-run `npm run balance` and the playtest bot and compare.
