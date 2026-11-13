---
name: headless-playtest
description: Play CIVITAS automatically in a headless browser to check balance, pacing, decision density, mobile layout and performance. Use after any mechanic, balance, UI or rendering change, or when asked whether a change made the game better.
---

# Headless playtest

`playtest.cjs` (next to this file) starts a city, places the Town Center, zones
three areas, runs at MAX speed, auto-answers every Turning Point and event with
option 1, and screenshots the map at fixed years. Its output is the baseline a
real strategy must beat.

## Run

```bash
npx vite --host 127.0.0.1 --port 5173 &   # from the repo root
node .claude/skills/headless-playtest/playtest.cjs desk 2030 <outdir>
node .claude/skills/headless-playtest/playtest.cjs phone 1720 <outdir>
```

Arguments: `desk|phone`, stop year, output directory for screenshots
(use the session scratchpad). Add `--throttle` to emulate a mid-range phone
(4× CPU) and report main-thread long tasks.

## What to read in the output

- **Population / treasury by century.** If treasury only ever climbs, money is not a constraint.
- **Decisions count and spacing.** Turning Points + events per real minute.
- **Long tasks** (with `--throttle`): count, average and max duration. Target: none above 50 ms.
- **Screenshots**: open them and look. Check the map changes visibly between centuries and nothing in the UI is cut off.

## The "bot test" for depth

The baseline bot does nothing clever. After a design change, compare:
1. Baseline bot (always option 1, no further input).
2. A scripted "sensible" strategy for the change (e.g. upgrades the Town Center, builds bridges).
If (2) does not clearly beat (1) on the final score, the new mechanic does not
matter yet. Record both results in the PR description.
