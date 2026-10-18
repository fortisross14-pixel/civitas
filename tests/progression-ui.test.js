import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {emptyLegacy,FIGURES} from '../src/legacy.js';
import {makeCity,seedTown} from '../src/sim.js';

let server,Market,UrbanAtlas,ComparisonChart;
before(async()=>{
 server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 ({Market}=await server.ssrLoadModule('/src/Market.jsx'));
 ({UrbanAtlas,ComparisonChart}=await server.ssrLoadModule('/src/chronicleUI.jsx'));
});
after(async()=>{await server?.close();});
const render=(Component,props)=>renderToStaticMarkup(React.createElement(Component,props));
const market=extra=>({legacy:emptyLegacy(),cities:[],onBack:()=>{},onPurchase:()=>{},onOpenPack:()=>{},setTab:()=>{},backLabel:'Return to Ravenna',ready:true,...extra});

test('figure store renders earned-LP packs, odds, guarantees and correct return destination',()=>{
 const html=render(Market,market({tab:'people'}));
 for(const text of ['Return to Ravenna','Discovery folio','Patron folio','Grand folio','70%','25%','5%','No duplicates','100 LP','need 100 more'])assert.ok(html.includes(text),text);
 assert.ok(html.includes('disabled=""'));
 const complete=render(Market,market({tab:'people',legacy:{...emptyLegacy(),points:9999,unlockedFigures:FIGURES.filter(f=>!f.generic).map(f=>f.id)}}));
 assert.ok(complete.includes('Collection complete'));
});
test('upgrade and card screens explain purchase timing, next rank, era and prerequisites',()=>{
 const upgrades=render(Market,market({tab:'upgrades',legacy:{...emptyLegacy(),points:1000,upgrades:{merchant:1}}}));
 for(const text of ['existing cities keep their founding bonuses','Owned','Next rank','+10%','+20%','Rank 2','2000–2030','144,000'])assert.ok(upgrades.includes(text),text);
 const cards=render(Market,market({tab:'cards'}));
 for(const text of ['Era','Duration','Needs one of','1800–2030','Geography','Cultural Rebirth','earn during play'])assert.ok(cards.includes(text),text);
});
test('achievement ledger exposes population, income and construction goals before completion',()=>{
 const html=render(Market,market({tab:'achievements'}));
 for(const text of ['5,000 residents','10,000 residents','20,000 residents','50,000 residents','Normal income','Good income','Very high income','Rich income','First commission','3 civic commissions','5 civic commissions','first is rewarded once'])assert.ok(html.includes(text),text);
});
test('comparison renders a multi-city chart and map controls, with game return context',()=>{
 const a=seedTown(makeCity('Ravenna','plain',345)),b=seedTown(makeCity('Valdoro','river',346));
 a.year=1500;a.history.push({year:1500,population:10000});
 const html=render(UrbanAtlas,{cities:[a,b],onBack:()=>{},onOpen:()=>{},backLabel:'Return to Ravenna',activeCityId:a.id});
 for(const text of ['Return to Ravenna','Compare cities','Period start year','Period end year','Map survey timeline','Cities to compare','Ravenna','Valdoro','polyline'])assert.ok(html.includes(text),text);
 for(const text of ['Personal records','Historical data sources','Completed cities only'])assert.ok(!html.includes(text),text);
 assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Infinity'));
});
test('empty and single-year comparisons have usable states without invalid chart coordinates',()=>{
 const empty=render(UrbanAtlas,{cities:[],onBack:()=>{},onOpen:()=>{}});assert.ok(empty.includes('Your atlas is waiting'));
 const single=render(ComparisonChart,{series:[{id:'a',name:'A',points:[{year:1300,value:50}]}],metric:'population',from:1300,to:1300,year:1300,colors:new Map([['a','#42674f']])});
 assert.ok(single.includes('<circle'));assert.ok(!single.includes('NaN'));assert.ok(!single.includes('Infinity'));
 const noData=render(ComparisonChart,{series:[{id:'a',name:'A',points:[]}],metric:'population',from:1300,to:1400,year:1400,colors:new Map()});assert.ok(noData.includes('No recorded population'));
});
