# Test commands

`npm test` runs the small default suite used for pushes, pull requests and
GitHub Pages builds. It checks deployment configuration, purchased city
bonuses, milestone rewards, figure packs and comparison data without running
centuries-long campaigns or starting a UI server.

`npm run test:ui` checks the rendered market and comparison screens on demand.

`npm run test:full` includes every regression test, historical phase check and
full simulation campaign. Use it for simulation, growth or economy changes.
It is intentionally excluded from routine deployment. On GitHub, select
**Actions → Extended simulation tests → Run workflow** to run it manually.

`npm run balance` runs only the long campaign-balance suite.
