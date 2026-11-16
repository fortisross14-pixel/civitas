// v3.3: urban forms by Age — each Age offers its own zone tools; forms set people and jobs per building.
import test from 'node:test';
import assert from 'node:assert/strict';
import {FORMS,formsAt,resolveZone,formOf,defaultForm} from '../src/zoning.js';
import {zoneLand,normalizeCity,ZONES,stats,advance} from '../src/sim.js';
import {newCity} from './helpers/strategies.js';

test('every form names a game use and a span of years',()=>{for(const [id,f] of Object.entries(FORMS)){assert.ok(ZONES[f.type],id);assert.ok(f.from<=f.to,id);assert.ok(f.label&&f.short&&f.note,id);}});
test('each Age has its own tools, a handful at a time',()=>{
  const med=formsAt(1350),mod=formsAt(1880),now=formsAt(1990);
  for(const id of ['houses','fine','guild','market','farm'])assert.ok(med.includes(id),id);
  for(const id of ['grid','linear','garden','heavy','mine'])assert.ok(mod.includes(id),id);
  for(const id of ['dense','suburb','offices','retail'])assert.ok(now.includes(id),id);
  assert.ok(!med.includes('dense')&&!now.includes('guild'));
  for(const y of [1350,1600,1750,1880,1990])assert.ok(formsAt(y).length<=18,`${y}: ${formsAt(y).length}`);
});
test('old uses still work as tools and old zones get the Age default',()=>{
  assert.deepEqual(resolveZone('res',1350),{type:'res',form:'houses'});assert.deepEqual(resolveZone('garden',1900),{type:'res',form:'garden'});
  assert.equal(formOf({type:'craft',year:1900}),'workshops');assert.equal(defaultForm('res',1960),'midrise');
});
test('zoning stores the form and refuses a form out of its Age',()=>{
  const c={...newCity(5),funds:1e6};const r=zoneLand(c,10,10,6,5,'fine');assert.equal(r.error,null);assert.equal(r.city.zones.at(-1).form,'fine');assert.equal(r.city.zones.at(-1).type,'res');
  assert.ok(zoneLand(c,10,10,6,5,'dense').error);
  assert.equal(normalizeCity(JSON.parse(JSON.stringify(r.city))).zones.at(-1).form,'fine');
});
test('dense housing holds more people per building than suburbs',()=>{
  assert.ok(FORMS.dense.cap>FORMS.suburb.cap*3);assert.ok(FORMS.heavy.jobs>FORMS.guild.jobs);assert.ok(FORMS.heavy.pollution>0);
});

test('modern tools come in groups: homes, commercial, industry, land',async()=>{
  const {GROUPS}=await import('../src/zoning.js');const now=formsAt(1990),g=now.map(id=>FORMS[id].group);
  for(const k of ['homes','shops','work','land'])assert.ok(g.includes(k),k);
  for(let i=1;i<g.length;i++)assert.ok(GROUPS.findIndex(x=>x[0]===g[i])>=GROUPS.findIndex(x=>x[0]===g[i-1]),'grouped in order');
  for(const id of ['mall','retail','techpark','heavy','workshops','plantation','mine','farm','mixed','officeblocks','offices'])assert.ok(now.includes(id),id);
});
