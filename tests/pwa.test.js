// v1.5: the game installs as a Progressive Web App and works offline.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const read=f=>readFileSync(new URL(`../${f}`,import.meta.url),'utf8');
const manifest=JSON.parse(read('public/manifest.webmanifest'));

test('manifest has what browsers need to offer installation',()=>{
  assert.ok(manifest.name&&manifest.short_name);
  assert.equal(manifest.display,'standalone');
  // Relative URLs so the same manifest works at "/" and at "/<repo>/" on GitHub Pages.
  for(const key of ['start_url','scope','id'])assert.ok(!manifest[key].startsWith('/'),`${key} must be relative`);
  const sizes=manifest.icons.map(i=>i.sizes);
  assert.ok(sizes.includes('192x192')&&sizes.includes('512x512'));
  assert.ok(manifest.icons.some(i=>i.purpose==='maskable'));
  for(const icon of manifest.icons){assert.ok(!icon.src.startsWith('/'));assert.ok(existsSync(new URL(`../public/${icon.src}`,import.meta.url)),`${icon.src} exists`);}
});

test('index.html links the manifest and icons through the base URL',()=>{
  const html=read('index.html');
  assert.match(html,/<link rel="manifest" href="%BASE_URL%manifest\.webmanifest"/);
  assert.match(html,/rel="apple-touch-icon" href="%BASE_URL%icons\/apple-touch-icon\.png"/);
  assert.match(html,/name="theme-color"/);
});

test('service worker precaches the shell with relative paths and is registered in production',()=>{
  const sw=read('public/sw.js');
  assert.match(sw,/addEventListener\('install'/);
  assert.match(sw,/addEventListener\('fetch'/);
  assert.match(sw,/'\.\/index\.html'/);
  // Saves live in localStorage; the worker must never touch them (comments excluded).
  assert.doesNotMatch(sw.replace(/\/\/.*$/gm,''),/localStorage/);
  for(const icon of manifest.icons)assert.ok(sw.includes(`./${icon.src}`),`${icon.src} precached`);
  const main=read('src/main.jsx');
  assert.match(main,/serviceWorker\.register\(`\$\{import\.meta\.env\.BASE_URL\}sw\.js`/);
  assert.match(main,/import\.meta\.env\.PROD/);
});
