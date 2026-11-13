---
name: game-design-review
description: Review or design CIVITAS mechanics, goals, progression and pacing using a "few decisions, deep consequences" lens (Mini Metro / Mini Motorways / Islanders style). Use when adding or changing a mechanic, card, event, policy, unlock, scoring rule or win/lose condition, or when asked whether the game is fun, deep or too complex.
---

# Game design review — minimalist systems games

CIVITAS aims to be semi-casual: a clean map, a handful of verbs, and emergent
depth from how those verbs interact over 700 years. Judge every mechanic by the
standards of minimalist systems games (Mini Metro, Mini Motorways, Islanders,
Dorfromantik, Townscaper), not by full city builders (SimCity, Cities: Skylines).

## The six tests

Run every proposed or existing mechanic through these. A mechanic that fails
two or more should be cut, merged or redesigned.

1. **Is it a decision?** The player must give something up. "+35% output, permanent" with no cost is a reward, not a decision. Look for an opportunity cost: scarce token, space, time, or a closed door.
2. **Is it spatial?** The best decisions in this genre happen *on the map*: where to draw, what to connect, what to leave empty. A choice made in a modal that only changes a hidden multiplier is weak. Prefer "place the harbour" over "commerce +20%".
3. **Is the consequence visible?** Within ~10 seconds of the choice the map must look different (new street, quarter turning red-roofed, smoke drifting, a crowd icon). If the only feedback is a number in a side panel, the player will not feel it.
4. **Does it compound?** Good verbs interact: a bridge changes where the next quarter grows, which changes where the market should go. Ask "what does this make the player want to do next?" If the answer is "nothing", it is noise.
5. **Does it create pressure?** There must be a way to do badly. A headless bot that always picks option 1 must score clearly worse than a thoughtful player (see the `headless-playtest` skill). If the bot "wins", the mechanic is decoration.
6. **Can it be read at a glance?** One icon or one short line. If it needs a paragraph or a number table to explain, simplify it.

## Decision budget

- Target one meaningful decision every 20–40 seconds of real time at normal speed, never more than ~3 simultaneous open concerns.
- Scarcity drives depth: give the player a small, periodic allowance (e.g. a charter every decade) rather than an ever-growing treasury. An unspent treasury that keeps climbing is a design bug.
- Every new verb should replace or absorb an old one. Keep the total verb count ≤ 7.

## Pressure and failure

- Pressure should come from the map itself, the way overcrowded stations do in Mini Metro: a need appears at a location, a visible timer fills, and something bad happens if it is ignored.
- Failure must be soft but real: a quarter falls into ruin, an era ends early, score is lost. Avoid hard game-overs in a semi-casual game unless it is a short challenge mode.
- Always give a final score the player can compare across runs (the Urban Atlas is the natural place).

## Content checklist (cards, events, policies)

For each item answer: what does the player give up, where on the map does it act,
what changes visibly, what new decision does it open. Reject pure stat bumps
unless they are the small "flavour" tier of a choice that also has a spatial option.

## Output format for a review

1. One-paragraph verdict.
2. Table: mechanic → pass/fail on each of the six tests.
3. Top 3 changes, each with the expected effect on decision density, pressure and readability.
4. What to cut.
