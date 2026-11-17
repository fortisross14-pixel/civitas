# CIVITAS

A city builder on an old surveyed map. Found a town in 1300 and guide it to 2030: zone land, play cards from the Market, govern, and decide what the old city becomes as the Ages change. Deep but casual: a run takes 30–45 minutes, and a city that falls on hard times carries on.

Play: https://fortisross14-pixel.github.io/civitas/ (installable, works offline; saves stay on your device).

## How a run goes

- **Zone** land for homes, commerce, industry or land; streets and houses grow there by themselves. Each Age has its own uses, from medieval lanes to towers and retail parks.
- **Build** with cards bought in the Market: landmarks where you tap, or changes to the whole city.
- **Govern**: answer districts' needs, set taxes, pass laws, decide history and the fate of old sites (the canal, the bridge, the old town and the car).
- **Choose a direction** each Age: its buffs, its cards and a goal with a reward.
- At a new Age, each quarter can be **protected**, **renewed** or **revamped**.

## Develop

```
npm install
npm run dev        # Vite dev server
npm test           # quick checks (about 1 minute)
npm run test:full  # every simulation and balance test (about 13 minutes)
npm run build      # production build in dist/
```

Pushing to `main` builds and publishes to GitHub Pages (`.github/workflows/build.yml`).

Code map: `src/sim.js` (the simulation), `src/zoning.js` (uses per Age and quarter laws), `src/organic/` (the drawn map), `src/cards.js` and `src/charters.js` (cards and directions), `src/heritage.js` (old-city decisions), `src/game/` (the game and home screens). See `CHANGELOG.md` for what changed.
