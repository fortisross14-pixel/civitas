// CIVITAS v1.8 — pacing (v4.0: each Age has its own pace, see AGE_PACE). The clock ticks once per in-game month. Normal speed
// is one year every 1.5 s, so 1300–2030 takes about 18 minutes. Quiet decades
// (nothing waiting for you) pass 1.2× faster; while you are deciding (Market
// Hall open, history waiting in the Needs panel) time slows to a quarter
// instead of stopping.
import {omensOf} from './events.js';
import {needsOf} from './needs.js';
import {AGES,ageAt} from './ages.js';
// v4.0 (M4): a run is 30–45 minutes with your decisions: about 25 on the clock at 1×.
// Each Age has its own pace: the early centuries pass briskly, the last two Ages
// (cars, zoning, the old town's fate) leave more time per year.
export const AGE_PACE={medieval:.95,renaissance:.95,enlightenment:.75,modern:.55,contemporary:.45};
export const agePace=year=>AGE_PACE[ageAt(year).id]??1;

// [months per second, label]
export const SPEEDS=[[4,'½×'],[8,'1×'],[16,'2×'],[36,'MAX']];
// v2.0: quiet years are most years (~88% for a steady player), so 1.5× made
// runs ~13 minutes; at 1.2× a run takes ~16 minutes plus time spent deciding.
export const NORMAL_SPEED=8,MAX_SPEED=36,QUIET_FACTOR=1.2,DECIDING_FACTOR=.25;

export function isQuiet(city){
  return !omensOf(city).some(o=>!Number.isInteger(o.choice))&&!needsOf(city).some(n=>!n.served&&n.progress>=.5);
}
// Multiplier on the chosen speed. MAX is never altered.
export function paceFactor(city,rate,deciding=false){
  if(rate>=MAX_SPEED)return 1;
  const a=agePace(city.year);
  if(deciding)return DECIDING_FACTOR*a;
  return (isQuiet(city)?QUIET_FACTOR:1)*a;
}
// Real minutes for a whole run at `rate`, if `quietShare` of the years are quiet.
export function runMinutes(rate,quietShare=0,years=730){
  let sec=0;for(let y=1300;y<1300+years;y++){const r=rate>=MAX_SPEED?rate:rate*agePace(y);sec+=12*(1-quietShare)/r+12*quietShare/(r*QUIET_FACTOR);}return sec/60;
}
export function paceLabel(city,rate,deciding){
  const f=paceFactor(city,rate,deciding);
  return f<1?'Time slowed while you decide':f>1?'Quiet years pass faster':'';
}
