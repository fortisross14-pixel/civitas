// Run-progression harness (Milestone R exit test 7, docs/ROADMAP.md).
// A steady player plays five runs on one fresh profile per seed, spending
// Legacy Points between runs (tests/helpers/meta.js). It founds every city
// with the Abbess, one of the three founders open from the first run. Target:
// the fifth run scores 1.2–1.6× the first (geometric mean over seeds: single
// runs swing widely, as a roguelite's should, and the swings are multiplicative).
// Usage: npm run balance:runs [-- --seeds 7,11,3,19,23]
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const arg=process.argv.indexOf('--seeds'),seeds=(arg>0?process.argv[arg+1]:'7,11,3,19,23,29,31,37,41,43,47,53,59,61,67').split(',');
const RUNS=5,self=fileURLToPath(import.meta.url);

if(process.argv[2]==='--one'){
  const {playRun,spendLegacy,steadySetup}=await import('../tests/helpers/meta.js');
  const {emptyLegacy}=await import('../src/legacy.js');
  const seed=Number(process.argv[3]);let l=emptyLegacy();const scores=[];
  for(let i=0;i<RUNS;i++){const out=playRun(l,{seed,setup:steadySetup(l,'abbess')});scores.push(out.run.score);l=spendLegacy(out.legacy);}
  console.log(JSON.stringify({seed,scores}));process.exit(0);
}
const run=seed=>new Promise(resolve=>{let out='';const p=spawn(process.execPath,[self,'--one',seed]);p.stdout.on('data',d=>out+=d);p.on('close',()=>resolve(JSON.parse(out.trim().split('\n').filter(l=>l.startsWith('{')).at(-1))));});
const rows=await Promise.all(seeds.map(run));
const median=a=>{const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};
for(const r of rows)console.log(`seed ${String(r.seed).padEnd(4)} ${r.scores.map(s=>String(Math.round(s/1000)+'k').padStart(6)).join('')}`);
const meds=Array.from({length:RUNS},(_,i)=>median(rows.map(r=>r.scores[i])));
const geo=Array.from({length:RUNS},(_,i)=>Math.exp(rows.reduce((n,r)=>n+Math.log(Math.max(1,r.scores[i])),0)/rows.length));
const fmt=a=>a.map(s=>String(Math.round(s/1000)+'k').padStart(6)).join('');
console.log(`median ${fmt(meds)}\ngeomean${fmt(geo)}`);
const ratio=geo[RUNS-1]/geo[0];
console.log(`\nExit 7 (5th run 1.2–1.6× the 1st, geometric mean of ${rows.length} seeds): ${ratio.toFixed(2)}× ${ratio>=1.2&&ratio<=1.6?'PASS':'FAIL'} (medians: ${(meds[RUNS-1]/meds[0]).toFixed(2)}×)`);
process.exitCode=ratio>=1.2&&ratio<=1.6?0:1;
