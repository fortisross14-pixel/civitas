// CIVITAS v2.6 — starting a scenario. A fresh scenario founds a new town in its
// start year; the others load a city grown in advance (public/scenarios/) and
// hand it to you with the scenario's founder, your trinkets and a fresh hand.
import {makeCity,seedTown,stats,normalizeCity} from './sim.js';
import {foundRun} from './runs.js';
import {restockShop} from './cards.js';
import {SCENARIO_INDEX,scenarioState} from './scenarios.js';

// prebuilt: the parsed JSON of public/scenarios/<id>.json (null for a fresh start).
export function startScenario(id,legacy,setup={},prebuilt=null,random=Math.random){
  const def=SCENARIO_INDEX[id];if(!def)return {error:'Unknown scenario'};
  const seed=def.seed,base=seedTown(makeCity(def.name,def.type,seed));
  const founded=foundRun(base,legacy,{founder:def.founder,forceFounder:true,trinkets:setup.trinkets,hardship:0});
  let city=founded.city;
  if(def.start.from!=='fresh'){
    const p=normalizeCity(prebuilt);if(!p)return {error:'The scenario city could not be loaded'};
    city={...p,id:`${Date.now()}-${Math.floor(random()*1e9).toString(36)}`,name:def.name,founder:founded.city.founder,perks:founded.city.perks,trinkets:founded.city.trinkets,
      legacyBonuses:founded.city.legacyBonuses,hardship:0,ageWelcome:null,charter:null,charterOffer:null,event:null,funds:Math.max(Number(p.funds)||0,Math.round(600+stats(p).population/40)),artifacts:[],boostersUsed:[],finished:false,ruined:null,unrest:0,peakTiers:p.peakTiers||{},snapshots:[],eventsOn:true,needsOn:true,
      deck:{...p.deck,hand:founded.city.deck.hand,shop:null,nextUid:Math.max(p.deck?.nextUid||1,founded.city.deck.nextUid||1)+100},
      turning:{...p.turning,mode:'era',pending:null,cardPool:founded.city.turning.cardPool,figurePool:founded.city.turning.figurePool,featuredFigures:[]},
      events:[...(p.events||[]).slice(-12),{year:p.year,type:'scenario',text:`${def.name}: ${def.blurb}`}]};
    city.deck=restockShop(city,stats(city)).deck;
  }else city={...city,name:def.name};
  city.scenario=scenarioState(def,stats(city));
  return {city,legacy:founded.legacy};
}
export const scenarioUrl=id=>`${import.meta.env?.BASE_URL||'/'}scenarios/${id}.json`;
