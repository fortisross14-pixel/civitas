import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');

test('GitHub Pages workflow runs quick checks, builds, and deploys from main',()=>{
  const yaml=read('.github/workflows/build.yml');
  assert.match(yaml,/push:\s*\n\s*branches:\s*\[main\]/);
  assert.match(yaml,/npm test/);
  assert.match(yaml,/npm run build/);
  assert.match(yaml,/GITHUB_PAGES:\s*'true'/);
  assert.match(yaml,/actions\/upload-pages-artifact@v3/);
  assert.match(yaml,/actions\/deploy-pages@v4/);
  assert.match(yaml,/pages:\s*write/);
  assert.match(yaml,/id-token:\s*write/);
  assert.match(yaml,/cache:\s*npm/);
  assert.match(yaml,/npm ci --no-audit --no-fund/);
});

test('GitHub Pages handles repository and account-root URLs',()=>{
  const conf=read('vite.config.js');
  assert.match(conf,/GITHUB_REPOSITORY/);
  assert.match(conf,/GITHUB_PAGES/);
  assert.match(conf,/github\.io/);
  assert.match(conf,/base/);
});

test('project includes usable run, test, build and preview commands',()=>{
  const pkg=JSON.parse(read('package.json'));
  for(const command of ['dev','test','build','preview'])assert.ok(pkg.scripts[command]);
  assert.ok(pkg.dependencies.react);
  assert.ok(pkg.dependencies.vite);
});
