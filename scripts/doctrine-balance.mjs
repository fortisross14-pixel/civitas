// Doctrine balance harness (Milestone R2 exit tests 1–2, docs/CARD_DESIGN.md §9).
// Plays every focused-doctrine player and a spread player on several seeds in
// parallel child processes, then reports medians against the two targets:
//   1. each focused doctrine scores ≥ 1.3× the spread player (median),
//   2. the six focused doctrines are within ±20% of their mean.
// Usage: npm run balance:doctrines [-- --seeds 7,11,3,19]
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const STRATEGIES=(process.env.STRATS||'spread,focused:faith,focused:industry,focused:trade,focused:arts,focused:learning,focused:people').split(',');
const arg=process.argv.indexOf('--seeds'),seeds=arg>0?process.argv[arg+1]:'7,11,3,19';
const self=fileURLToPath(import.meta.url);

if(process.argv[2]==='--one'){
  const {runStrategy}=await import('../tests/helpers/strategies.js');
  const strategy=process.argv[3];
  for(const seed of process.argv[4].split(',').map(Number)){
    const r=runStrategy(strategy,seed,2030);
    console.log(JSON.stringify({strategy,seed,score:r.score,population:r.population,top:Math.max(...Object.values(r.doctrines))}));
  }
  process.exit(0);
}

const run=s=>new Promise(resolve=>{let out='';const p=spawn(process.execPath,[self,'--one',s,seeds]);p.stdout.on('data',d=>out+=d);p.on('close',()=>resolve(out.trim().split('\n').filter(l=>l.startsWith('{')).map(l=>JSON.parse(l))));});
const results=(await Promise.all(STRATEGIES.map(run))).flat();
const median=a=>{const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const med=Object.fromEntries(STRATEGIES.map(s=>[s,median(results.filter(r=>r.strategy===s).map(r=>r.score))]));
const focused=STRATEGIES.filter(s=>s.startsWith('focused:')),mean=focused.reduce((n,s)=>n+med[s],0)/focused.length;
for(const s of [...STRATEGIES].sort((a,b)=>med[b]-med[a])){
  const rows=results.filter(r=>r.strategy===s);
  console.log(`${s.padEnd(18)} median ${String(Math.round(med[s])).padStart(7)}  ×spread ${(med[s]/med.spread).toFixed(2)}  vs mean ${s==='spread'?'   —':((med[s]/mean-1)*100).toFixed(0).padStart(3)+'%'}  top counts ${rows.map(r=>r.top).join(',')}`);
}
const exit1=focused.every(s=>med[s]>=1.3*med.spread),exit2=focused.every(s=>Math.abs(med[s]/mean-1)<=.2);
console.log(`\nExit 1 (each focused ≥ 1.3× spread): ${exit1?'PASS':'FAIL'}`);
console.log(`Exit 2 (doctrines within ±20% of mean): ${exit2?'PASS':'FAIL'}`);
process.exitCode=exit1&&exit2?0:1;
